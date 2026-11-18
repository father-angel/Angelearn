import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  doc,
  collection,
  query,
  where,
  limit,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  UserProfile,
  AvatarConfig,
  VisitorGarden,
  TreeData,
  GardenDecoration,
  WorldChatMessage,
  DmThread,
  DmMessage,
  WorldGroup,
  GroupMember,
  GroupJoinRequest,
  GroupInvite,
  GroupChatMessage,
  GroupChallengeGameId,
  GroupGameChallenge,
  GroupChallengeScore,
  ChatTargetUser,
} from './types/game';
import { getDefaultAvatarConfig } from './components/CharacterAvatar';
import { loadTrees, loadDecorations, INITIAL_TREES } from './utils/storage';
import {
  getDeterministicWorldCoords,
  getDeterministicGroupCoords,
  clampWorldCoords,
} from './game/worldPlacement';
import {
  serializeTreesSnapshot,
  serializeDecorationsSnapshot,
  hydrateVisitorTrees,
  hydrateVisitorDecorations,
} from './game/gardenSnapshot';
import {
  getSortedParticipants,
  makeChronoDocId,
  makeDmThreadId,
  sanitizeChatText,
  isValidFirestoreId,
} from './game/chat';
import {
  GROUP_MAX_MEMBERS,
  applyGroupContribution,
  clampGroupLevel,
  makeGroupId,
  makeGroupInviteId,
  sanitizeGroupMotto,
  sanitizeGroupName,
} from './game/groups';
import {
  clampChallengeScore,
  isValidGroupChallengeGameId,
  makeGroupChallengeId,
  sanitizeChallengeTitle,
  shouldUpdateChallengeRecord,
  sortChallengeLeaderboard,
} from './game/groupChallenges';

export { getDeterministicWorldCoords };

const app = initializeApp(firebaseConfig);
let db: Firestore;
try {
  db = initializeFirestore(
    app,
    { experimentalForceLongPolling: true },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}
export { db };
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

const pendingSyncByUid = new Map<string, Promise<UserProfile>>();

/**
 * Sanitize and clamp outgoing payload to strictly match `firebase-blueprint.json`
 * and `firestore.rules` (`isValidUserAccount`).
 */
function buildValidatedCloudPayload(profile: UserProfile, authUser: User) {
  const gender = profile.gender === 'boy' ? 'boy' : 'girl';
  const defaults = getDefaultAvatarConfig(gender);
  const cfg: AvatarConfig = {
    ...defaults,
    ...profile.avatarConfig,
    faceExpression:
      profile.avatarConfig?.faceExpression || defaults.faceExpression || 'happy_smile',
    pants: profile.avatarConfig?.pants || defaults.pants || 'forest_trousers',
  };

  const clampStr = (val: string | undefined | null, fallback: string, max: number) => {
    const clean = (val ?? fallback).trim() || fallback;
    return clean.slice(0, max);
  };

  const displayName = clampStr(
    profile.name && profile.name !== 'همسفر نور'
      ? profile.name
      : authUser.displayName || profile.name,
    'همسفر نور',
    50
  );

  return {
    uid: authUser.uid.slice(0, 128),
    email: clampStr(authUser.email, 'player@gmail.com', 254),
    displayName,
    photoURL: (authUser.photoURL || profile.photoURL || '').slice(0, 500),
    gender,
    coins: Math.max(0, Math.min(10000000, Math.floor(Number(profile.coins) || 0))),
    streakDays: Math.max(
      0,
      Math.min(100000, Math.floor(Number(profile.streakDays) || 1))
    ),
    bio: (profile.bio || '').slice(0, 140),
    skinTone: clampStr(cfg.skinTone, defaults.skinTone, 40),
    hairStyle: clampStr(cfg.hairStyle, defaults.hairStyle, 40),
    hairColor: clampStr(cfg.hairColor, defaults.hairColor, 40),
    faceExpression: clampStr(
      cfg.faceExpression,
      defaults.faceExpression || 'happy_smile',
      40
    ),
    outfit: clampStr(cfg.outfit, defaults.outfit, 40),
    pants: clampStr(cfg.pants, defaults.pants || 'forest_trousers', 40),
    accessory: clampStr(cfg.accessory, defaults.accessory, 40),
    bgAura: clampStr(cfg.bgAura, defaults.bgAura, 40),
    groupId: (profile.groupId || '').trim().slice(0, 128),
    groupName: (profile.groupName || '').trim().slice(0, 40),
  };
}

/**
 * Sanitize and clamp outgoing payload for `/worldGardens/{uid}` (Zero PII, matches `isValidWorldGarden`).
 */
function buildValidatedPublicWorldGardenPayload(
  profile: UserProfile,
  authUser: User,
  unlockedTreeCountOverride?: number,
  treesOverride?: TreeData[],
  decorationsOverride?: GardenDecoration[]
) {
  const base = buildValidatedCloudPayload(profile, authUser);
  const { worldX, worldY } = getDeterministicWorldCoords(authUser.uid, profile.coords);
  const resolvedTrees = treesOverride ?? loadTrees();
  const resolvedDecorations = decorationsOverride ?? loadDecorations();
  const unlockedCount =
    unlockedTreeCountOverride ??
    Math.max(1, resolvedTrees.filter((t) => t.unlocked).length || 2);

  return {
    uid: base.uid,
    isPublic: true,
    displayName: base.displayName,
    gender: base.gender,
    bio: base.bio,
    streakDays: base.streakDays,
    unlockedTreeCount: Math.max(1, Math.min(36, Math.floor(unlockedCount))),
    worldX: Math.max(240, Math.min(2560, Math.floor(worldX))),
    worldY: Math.max(200, Math.min(1650, Math.floor(worldY))),
    skinTone: base.skinTone,
    hairStyle: base.hairStyle,
    hairColor: base.hairColor,
    faceExpression: base.faceExpression,
    outfit: base.outfit,
    pants: base.pants,
    accessory: base.accessory,
    bgAura: base.bgAura,
    treesSnapshot: serializeTreesSnapshot(resolvedTrees),
    decorationsSnapshot: serializeDecorationsSnapshot(resolvedDecorations),
  };
}

/**
 * Publishes or updates the player's public World Map garden node (`/worldGardens/{uid}`)
 * so other players see their garden and custom avatar live on the World Map.
 */
export async function syncPublicWorldGardenIfSignedIn(
  profile: UserProfile,
  unlockedTreeCountOverride?: number,
  treesOverride?: TreeData[],
  decorationsOverride?: GardenDecoration[]
): Promise<{ worldX: number; worldY: number } | null> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return null;

  const docPath = `worldGardens/${currentUser.uid}`;
  const gardenRef = doc(db, 'worldGardens', currentUser.uid);

  let snap;
  try {
    snap = await getDoc(gardenRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }

  // Preserve saved cloud worldX/worldY if local profile still has old/guest coords
  const hasValidLocalCoords =
    profile.coords &&
    profile.coords.x >= 240 &&
    profile.coords.x <= 2560 &&
    profile.coords.y >= 200 &&
    profile.coords.y <= 1650;

  let resolvedProfile = profile;
  if (!hasValidLocalCoords && snap && snap.exists()) {
    const cloudGarden = snap.data();
    if (
      typeof cloudGarden?.worldX === 'number' &&
      typeof cloudGarden?.worldY === 'number'
    ) {
      resolvedProfile = {
        ...profile,
        coords: { x: cloudGarden.worldX, y: cloudGarden.worldY },
      };
    }
  }

  const payload = buildValidatedPublicWorldGardenPayload(
    resolvedProfile,
    currentUser,
    unlockedTreeCountOverride,
    treesOverride,
    decorationsOverride
  );

  if (snap && snap.exists()) {
    try {
      await updateDoc(gardenRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  } else {
    try {
      await setDoc(gardenRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  }

  return { worldX: payload.worldX, worldY: payload.worldY };
}

/**
 * Syncs or merges the player's local profile with their Firestore cloud account (`/users/{uid}`)
 * and publishes their public garden to `/worldGardens/{uid}`.
 */
export async function syncOrLoadCloudUserAccount(
  localProfile: UserProfile,
  authUser: User
): Promise<UserProfile> {
  const existingPromise = pendingSyncByUid.get(authUser.uid);
  if (existingPromise) {
    return existingPromise;
  }

  const runSync = async (): Promise<UserProfile> => {
    const userDocPath = `users/${authUser.uid}`;
    const userRef = doc(db, 'users', authUser.uid);

    // If localProfile belonged to a DIFFERENT signed-in Firebase UID on the same device,
    // do not carry over that previous account's coins, name, or world coords.
    const isDifferentSignedInUser =
      Boolean(localProfile.id) &&
      !localProfile.id.startsWith('guest_') &&
      localProfile.id !== authUser.uid;

    const cleanLocalProfile: UserProfile = isDifferentSignedInUser
      ? {
          ...localProfile,
          id: authUser.uid,
          name: authUser.displayName || 'همسفر نور',
          coins: 45,
          streakDays: 1,
          bio: 'هر روز یک سانتیمتر بهتر شو...',
          coords: { x: 176, y: 171 },
          avatarConfig: getDefaultAvatarConfig(localProfile.gender),
        }
      : localProfile;

    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, userDocPath);
    }

    let finalProfile: UserProfile;

    if (snap && snap.exists()) {
      const cloud = snap.data();
      const mergedCoins = isDifferentSignedInUser
        ? Number(cloud.coins) || 45
        : Math.max(
            Number(cleanLocalProfile.coins) || 0,
            Number(cloud.coins) || 0
          );
      const mergedStreak = isDifferentSignedInUser
        ? Number(cloud.streakDays) || 1
        : Math.max(
            Number(cleanLocalProfile.streakDays) || 1,
            Number(cloud.streakDays) || 1
          );
      const mergedGender = cloud.gender === 'boy' ? 'boy' : 'girl';
      const defaults = getDefaultAvatarConfig(mergedGender);

      finalProfile = {
        ...cleanLocalProfile,
        id: authUser.uid,
        name: cloud.displayName || authUser.displayName || cleanLocalProfile.name,
        email: cloud.email || authUser.email || undefined,
        photoURL: cloud.photoURL || authUser.photoURL || undefined,
        gender: mergedGender,
        coins: mergedCoins,
        streakDays: mergedStreak,
        bio: cloud.bio ?? cleanLocalProfile.bio ?? '',
        isGuest: false,
        googleConnected: true,
        groupId: typeof cloud.groupId === 'string' && cloud.groupId ? cloud.groupId : cleanLocalProfile.groupId,
        groupName: typeof cloud.groupName === 'string' && cloud.groupName ? cloud.groupName : cleanLocalProfile.groupName,
        avatarConfig: {
          skinTone: cloud.skinTone || defaults.skinTone,
          hairStyle: cloud.hairStyle || defaults.hairStyle,
          hairColor: cloud.hairColor || defaults.hairColor,
          faceExpression:
            cloud.faceExpression || defaults.faceExpression || 'happy_smile',
          outfit: cloud.outfit || defaults.outfit,
          pants: cloud.pants || defaults.pants || 'forest_trousers',
          accessory: cloud.accessory || defaults.accessory,
          bgAura: cloud.bgAura || defaults.bgAura,
        },
      };

      const validated = buildValidatedCloudPayload(finalProfile, authUser);
      try {
        await updateDoc(userRef, {
          ...validated,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, userDocPath);
      }
    } else {
      const baseData = buildValidatedCloudPayload(cleanLocalProfile, authUser);
      try {
        await setDoc(userRef, {
          ...baseData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, userDocPath);
      }

      finalProfile = {
        ...cleanLocalProfile,
        id: authUser.uid,
        name: baseData.displayName,
        email: baseData.email,
        photoURL: baseData.photoURL || undefined,
        isGuest: false,
        googleConnected: true,
      };
    }

    // Publish/sync the player's public World Map garden node and capture resolved world coordinates
    try {
      const worldCoords = await syncPublicWorldGardenIfSignedIn(finalProfile);
      if (worldCoords) {
        finalProfile = {
          ...finalProfile,
          coords: { x: worldCoords.worldX, y: worldCoords.worldY },
        };
      }
    } catch (err) {
      console.error('Failed to sync public world garden:', err);
    }

    return finalProfile;
  };

  const promise = runSync().finally(() => {
    pendingSyncByUid.delete(authUser.uid);
  });
  pendingSyncByUid.set(authUser.uid, promise);
  return promise;
}

/**
 * Saves updates to the player's profile (avatar, coins, name, bio, coords) to Firestore when signed in with Google,
 * and updates their public `/worldGardens/{uid}` presence on the shared World Map.
 */
export async function saveProfileToCloudIfSignedIn(
  profile: UserProfile,
  unlockedTreeCountOverride?: number,
  treesOverride?: TreeData[],
  decorationsOverride?: GardenDecoration[]
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const userDocPath = `users/${currentUser.uid}`;
  const userRef = doc(db, 'users', currentUser.uid);
  const validated = buildValidatedCloudPayload(profile, currentUser);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userDocPath);
  }

  if (snap && snap.exists()) {
    try {
      await updateDoc(userRef, {
        ...validated,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userDocPath);
    }
  } else {
    try {
      await setDoc(userRef, {
        ...validated,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userDocPath);
    }
  }

  await syncPublicWorldGardenIfSignedIn(
    profile,
    unlockedTreeCountOverride,
    treesOverride,
    decorationsOverride
  );
}

export interface LiveCloudNeighborGarden {
  uid: string;
  worldX: number;
  worldY: number;
  unlockedTreeCount: number;
  avatarConfig: AvatarConfig;
  visitorGarden: VisitorGarden;
}

function mapWorldGardenDocToLiveNeighbor(
  data: Record<string, any>
): LiveCloudNeighborGarden {
  const gender = data.gender === 'boy' ? 'boy' : 'girl';
  const defaults = getDefaultAvatarConfig(gender);
  const avatarConfig: AvatarConfig = {
    skinTone: data.skinTone || defaults.skinTone,
    hairStyle: data.hairStyle || defaults.hairStyle,
    hairColor: data.hairColor || defaults.hairColor,
    faceExpression:
      data.faceExpression || defaults.faceExpression || 'happy_smile',
    outfit: data.outfit || defaults.outfit,
    pants: data.pants || defaults.pants || 'forest_trousers',
    accessory: data.accessory || defaults.accessory,
    bgAura: data.bgAura || defaults.bgAura,
  };

  const unlockedCount = Math.max(
    1,
    Math.min(7, Number(data.unlockedTreeCount) || 2)
  );
  const hydratedTrees = hydrateVisitorTrees(
    INITIAL_TREES,
    data.treesSnapshot,
    unlockedCount,
    Number(data.streakDays) || 1
  );
  const hydratedDecorations = hydrateVisitorDecorations(
    data.decorationsSnapshot
  );

  return {
    uid: String(data.uid),
    worldX: Number(data.worldX) || 1320,
    worldY: Number(data.worldY) || 860,
    unlockedTreeCount: Math.max(
      unlockedCount,
      hydratedTrees.filter((t) => t.unlocked).length
    ),
    avatarConfig,
    visitorGarden: {
      id: `cloud_garden_${data.uid}`,
      ownerUid: String(data.uid),
      ownerName: data.displayName || 'باغبان انجلرن',
      gender,
      avatarConfig,
      bio: data.bio || 'در مسیر شکوفایی و یادگیری مستمر 🌱',
      streakDays: Number(data.streakDays) || 1,
      level: 'باغبان شکوفا',
      coins: unlockedCount * 50,
      trees: hydratedTrees,
      decorations: hydratedDecorations,
    },
  };
}

/**
 * Fetches a single public player garden by UID (for direct `?visit=` links).
 */
export async function fetchPublicWorldGardenById(
  rawId: string
): Promise<VisitorGarden | null> {
  const cleanUid = rawId.replace(/^cloud_garden_/, '').trim();
  if (!cleanUid || !/^[a-zA-Z0-9_-]{1,128}$/.test(cleanUid)) return null;

  const docPath = `worldGardens/${cleanUid}`;
  try {
    const snap = await getDoc(doc(db, 'worldGardens', cleanUid));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!data || data.isPublic !== true) return null;
    return mapWorldGardenDocToLiveNeighbor(data).visitorGarden;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

/**
 * Real-time listener for all registered players' public gardens (`/worldGardens`)
 * so that whenever another player installs the game and signs in with Google,
 * their garden and custom avatar appear live on the World Map.
 */
export function subscribeToPublicWorldGardens(
  currentUid: string | undefined,
  onUpdate: (gardens: LiveCloudNeighborGarden[]) => void
): () => void {
  const q = query(
    collection(db, 'worldGardens'),
    where('isPublic', '==', true),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const results: LiveCloudNeighborGarden[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data || !data.uid) return;
        // Skip the current user's own garden since it's already rendered as `player_base`
        if (
          (currentUid && data.uid === currentUid) ||
          (auth.currentUser && data.uid === auth.currentUser.uid)
        ) {
          return;
        }
        results.push(mapWorldGardenDocToLiveNeighbor(data));
      });

      onUpdate(results);
    },
    (error) => {
      console.error('World gardens snapshot error:', error.message);
    }
  );
}

/**
 * Initiates Google / Gmail Sign-In popup and syncs the player's account with Firestore.
 */
export async function signInWithGoogleAccount(
  currentProfile: UserProfile
): Promise<UserProfile> {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;
  return await syncOrLoadCloudUserAccount(currentProfile, user);
}

/**
 * Signs out from Google account while keeping local guest progress intact.
 */
export async function signOutFromGoogleAccount(): Promise<void> {
  await signOut(auth);
}

export function getCurrentVerifiedUid(): string | null {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return null;
  return user.uid;
}

function resolveTimestampMs(value: unknown, fallbackMs = Date.now()): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toMillis?: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return fallbackMs;
}

/**
 * Real-time subscription to global World Chat messages (`/worldChatMessages`).
 * Uses reverse-chronological doc IDs + single `where('isPublic', '==', true)` so zero composite index is required.
 */
export function subscribeToWorldChatMessages(
  onUpdate: (messages: WorldChatMessage[]) => void,
  onError?: (message: string) => void
): () => void {
  const q = query(
    collection(db, 'worldChatMessages'),
    where('isPublic', '==', true),
    limit(80)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: WorldChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data || !data.senderUid || typeof data.text !== 'string') return;
        const gender = data.senderGender === 'boy' ? 'boy' : 'girl';
        const defaults = getDefaultAvatarConfig(gender);
        const createdAtMs = resolveTimestampMs(data.createdAt, Date.now());
        list.push({
          id: docSnap.id,
          isPublic: true,
          senderUid: String(data.senderUid),
          senderName: String(data.senderName || 'همسفر نور'),
          senderGender: gender,
          senderAvatar: {
            skinTone: data.skinTone || defaults.skinTone,
            hairStyle: data.hairStyle || defaults.hairStyle,
            hairColor: data.hairColor || defaults.hairColor,
            faceExpression:
              data.faceExpression || defaults.faceExpression || 'happy_smile',
            outfit: data.outfit || defaults.outfit,
            pants: data.pants || defaults.pants || 'forest_trousers',
            accessory: data.accessory || defaults.accessory,
            bgAura: data.bgAura || defaults.bgAura,
          },
          text: String(data.text),
          createdAtMs,
        });
      });

      list.sort((a, b) => {
        if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
        return b.id.localeCompare(a.id);
      });
      onUpdate(list);
    },
    (error) => {
      console.error('World chat snapshot error:', error.message);
      if (onError) onError(error.message);
    }
  );
}

/**
 * Sends a message to the global public World Chat (`/worldChatMessages/{messageId}`).
 * Requires verified Google/Gmail authentication.
 */
export async function sendWorldChatMessage(
  profile: UserProfile,
  rawText: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  const cleanText = sanitizeChatText(rawText);
  if (!cleanText) {
    throw new Error('EMPTY_MESSAGE');
  }

  const base = buildValidatedCloudPayload(profile, currentUser);
  const messageId = makeChronoDocId(currentUser.uid.slice(0, 8));
  const docPath = `worldChatMessages/${messageId}`;

  try {
    await setDoc(doc(db, 'worldChatMessages', messageId), {
      isPublic: true,
      senderUid: base.uid,
      senderName: base.displayName,
      senderGender: base.gender,
      skinTone: base.skinTone,
      hairStyle: base.hairStyle,
      hairColor: base.hairColor,
      faceExpression: base.faceExpression,
      outfit: base.outfit,
      pants: base.pants,
      accessory: base.accessory,
      bgAura: base.bgAura,
      text: cleanText,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

/**
 * Deletes the authenticated user's own public World Chat message.
 */
export async function deleteWorldChatMessage(messageId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified || !isValidFirestoreId(messageId)) {
    return;
  }
  const docPath = `worldChatMessages/${messageId}`;
  try {
    await deleteDoc(doc(db, 'worldChatMessages', messageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Real-time subscription to the current verified user's 1-on-1 DM threads (`/dmThreads`).
 */
export function subscribeToMyDmThreads(
  currentUid: string | undefined,
  onUpdate: (threads: DmThread[]) => void,
  onError?: (message: string) => void
): () => void {
  const currentUser = auth.currentUser;
  if (
    !currentUid ||
    !currentUser ||
    !currentUser.emailVerified ||
    currentUser.uid !== currentUid
  ) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'dmThreads'),
    where('participants', 'array-contains', currentUid),
    limit(30)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const threads: DmThread[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          !data ||
          !Array.isArray(data.participants) ||
          data.participants.length !== 2
        ) {
          return;
        }
        threads.push({
          id: docSnap.id,
          participants: [
            String(data.participants[0]),
            String(data.participants[1]),
          ],
          lastMessageText: String(data.lastMessageText || ''),
          lastMessageSenderUid: String(data.lastMessageSenderUid || ''),
          lastMessageAtMs: resolveTimestampMs(data.lastMessageAt, Date.now()),
          updatedAtMs: resolveTimestampMs(data.updatedAt, Date.now()),
        });
      });

      threads.sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs);
      onUpdate(threads);
    },
    (error) => {
      console.error('DM threads snapshot error:', error.message);
      if (onError) onError(error.message);
    }
  );
}

/**
 * Real-time subscription to messages inside a participant-isolated 1-on-1 DM thread.
 */
export function subscribeToDmMessages(
  threadId: string | undefined,
  currentUid: string | undefined,
  onUpdate: (messages: DmMessage[]) => void,
  onError?: (message: string) => void
): () => void {
  const currentUser = auth.currentUser;
  if (
    !threadId ||
    !currentUid ||
    !isValidFirestoreId(threadId) ||
    !currentUser ||
    !currentUser.emailVerified ||
    currentUser.uid !== currentUid
  ) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'dmThreads', threadId, 'messages'),
    where('participants', 'array-contains', currentUid),
    limit(80)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: DmMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          !data ||
          !Array.isArray(data.participants) ||
          data.participants.length !== 2 ||
          typeof data.text !== 'string'
        ) {
          return;
        }
        messages.push({
          id: docSnap.id,
          threadId: String(data.threadId || threadId),
          participants: [
            String(data.participants[0]),
            String(data.participants[1]),
          ],
          senderUid: String(data.senderUid || ''),
          senderName: String(data.senderName || 'همسفر نور'),
          text: String(data.text),
          createdAtMs: resolveTimestampMs(data.createdAt, Date.now()),
        });
      });

      messages.sort((a, b) => {
        if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
        return b.id.localeCompare(a.id);
      });
      onUpdate(messages);
    },
    (error) => {
      console.error('DM messages snapshot error:', error.message);
      if (onError) onError(error.message);
    }
  );
}

/**
 * Sends a 1-on-1 direct message to `peerUid`, ensuring the parent thread exists before writing the subcollection message.
 */
export async function sendDmMessage(
  senderProfile: UserProfile,
  peerUid: string,
  rawText: string
): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  const cleanText = sanitizeChatText(rawText);
  if (!cleanText) {
    throw new Error('EMPTY_MESSAGE');
  }

  const participants = getSortedParticipants(currentUser.uid, peerUid);
  const threadId = makeDmThreadId(currentUser.uid, peerUid);
  const base = buildValidatedCloudPayload(senderProfile, currentUser);

  const threadPath = `dmThreads/${threadId}`;
  const threadRef = doc(db, 'dmThreads', threadId);

  let threadSnap;
  try {
    threadSnap = await getDoc(threadRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, threadPath);
  }

  if (threadSnap && threadSnap.exists()) {
    try {
      await updateDoc(threadRef, {
        lastMessageText: cleanText,
        lastMessageSenderUid: base.uid,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, threadPath);
    }
  } else {
    try {
      await setDoc(threadRef, {
        id: threadId,
        participants,
        lastMessageText: cleanText,
        lastMessageSenderUid: base.uid,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, threadPath);
    }
  }

  const messageId = makeChronoDocId(currentUser.uid.slice(0, 8));
  const messagePath = `dmThreads/${threadId}/messages/${messageId}`;
  try {
    await setDoc(doc(db, 'dmThreads', threadId, 'messages', messageId), {
      threadId,
      participants,
      senderUid: base.uid,
      senderName: base.displayName,
      text: cleanText,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, messagePath);
  }

  return threadId;
}

// =========================================================================
// WORLD GROUPS: CREATION, UPGRADES, JOIN REQUESTS, LEADER INVITES & CHAT
// =========================================================================

function extractAvatarFromRecord(
  data: Record<string, any>,
  gender: 'boy' | 'girl'
): AvatarConfig {
  const defaults = getDefaultAvatarConfig(gender);
  return {
    skinTone: data.skinTone || defaults.skinTone,
    hairStyle: data.hairStyle || defaults.hairStyle,
    hairColor: data.hairColor || defaults.hairColor,
    faceExpression:
      data.faceExpression || defaults.faceExpression || 'happy_smile',
    outfit: data.outfit || defaults.outfit,
    pants: data.pants || defaults.pants || 'forest_trousers',
    accessory: data.accessory || defaults.accessory,
    bgAura: data.bgAura || defaults.bgAura,
  };
}

function mapWorldGroupDoc(id: string, data: Record<string, any>): WorldGroup {
  return {
    id,
    name: String(data.name || 'گروه همسفران'),
    motto: String(data.motto || ''),
    leaderUid: String(data.leaderUid || ''),
    leaderName: String(data.leaderName || 'رهبر گروه'),
    isPublic: true,
    buildingLevel: clampGroupLevel(Number(data.buildingLevel) || 1),
    treasuryCoins: Math.max(0, Math.floor(Number(data.treasuryCoins) || 0)),
    totalContributedCoins: Math.max(
      0,
      Math.floor(Number(data.totalContributedCoins) || 0)
    ),
    memberCount: Math.max(1, Math.floor(Number(data.memberCount) || 1)),
    worldX: Math.round(Number(data.worldX) || 1510),
    worldY: Math.round(Number(data.worldY) || 540),
    createdAtMs: resolveTimestampMs(data.createdAt, Date.now()),
    updatedAtMs: resolveTimestampMs(data.updatedAt, Date.now()),
  };
}

/**
 * Real-time subscription to all public World Groups rendered on the World Map.
 */
export function subscribeToPublicGroups(
  onUpdate: (groups: WorldGroup[]) => void
): () => void {
  const q = query(
    collection(db, 'groups'),
    where('isPublic', '==', true),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: WorldGroup[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data || !data.name || !data.leaderUid) return;
        list.push(mapWorldGroupDoc(docSnap.id, data));
      });
      list.sort(
        (a, b) =>
          b.buildingLevel - a.buildingLevel ||
          b.totalContributedCoins - a.totalContributedCoins
      );
      onUpdate(list);
    },
    (error) => {
      console.error('Public groups snapshot error:', error.message);
    }
  );
}

/**
 * Real-time subscription to a single group document (`/groups/{groupId}`).
 */
export function subscribeToGroup(
  groupId: string | undefined,
  onUpdate: (group: WorldGroup | null) => void
): () => void {
  if (!groupId || !isValidFirestoreId(groupId)) {
    onUpdate(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, 'groups', groupId),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate(mapWorldGroupDoc(snap.id, snap.data()));
    },
    (error) => {
      console.error('Group snapshot error:', error.message);
    }
  );
}

/**
 * Real-time subscription to a group's members (`/groups/{groupId}/members`).
 */
export function subscribeToGroupMembers(
  groupId: string | undefined,
  onUpdate: (members: GroupMember[]) => void
): () => void {
  const currentUser = auth.currentUser;
  if (
    !groupId ||
    !isValidFirestoreId(groupId) ||
    !currentUser ||
    !currentUser.emailVerified
  ) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'groups', groupId, 'members'),
    where('groupId', '==', groupId),
    limit(GROUP_MAX_MEMBERS)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const members: GroupMember[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data || !data.uid) return;
        const gender = data.gender === 'boy' ? 'boy' : 'girl';
        members.push({
          uid: String(data.uid),
          groupId: String(data.groupId || groupId),
          displayName: String(data.displayName || 'همسفر'),
          gender,
          avatarConfig: extractAvatarFromRecord(data, gender),
          role: data.role === 'leader' ? 'leader' : 'member',
          contributedCoins: Math.max(
            0,
            Math.floor(Number(data.contributedCoins) || 0)
          ),
          joinedAtMs: resolveTimestampMs(data.joinedAt, Date.now()),
          updatedAtMs: resolveTimestampMs(data.updatedAt, Date.now()),
        });
      });

      members.sort((a, b) => {
        if (a.role !== b.role) return a.role === 'leader' ? -1 : 1;
        return b.contributedCoins - a.contributedCoins;
      });
      onUpdate(members);
    },
    (error) => {
      console.error('Group members snapshot error:', error.message);
    }
  );
}

/**
 * Real-time subscription to pending join requests for a group (leader view).
 */
export function subscribeToGroupJoinRequests(
  groupId: string | undefined,
  leaderUid: string | undefined,
  onUpdate: (requests: GroupJoinRequest[]) => void
): () => void {
  const currentUser = auth.currentUser;
  if (
    !groupId ||
    !leaderUid ||
    !isValidFirestoreId(groupId) ||
    !currentUser ||
    !currentUser.emailVerified ||
    currentUser.uid !== leaderUid
  ) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'groups', groupId, 'joinRequests'),
    where('leaderUid', '==', leaderUid),
    limit(30)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: GroupJoinRequest[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data || !data.applicantUid) return;
        const gender = data.applicantGender === 'boy' ? 'boy' : 'girl';
        list.push({
          groupId: String(data.groupId || groupId),
          leaderUid: String(data.leaderUid || leaderUid),
          applicantUid: String(data.applicantUid),
          applicantName: String(data.applicantName || 'کاربر انجلرن'),
          applicantGender: gender,
          applicantAvatar: extractAvatarFromRecord(data, gender),
          note: String(data.note || ''),
          status: 'pending',
          createdAtMs: resolveTimestampMs(data.createdAt, Date.now()),
        });
      });
      list.sort((a, b) => a.createdAtMs - b.createdAtMs);
      onUpdate(list);
    },
    (error) => {
      console.error('Group join requests snapshot error:', error.message);
    }
  );
}

/**
 * Real-time subscription to pending Group Invites sent to the current verified user.
 */
export function subscribeToMyGroupInvites(
  currentUid: string | undefined,
  onUpdate: (invites: GroupInvite[]) => void
): () => void {
  const currentUser = auth.currentUser;
  if (
    !currentUid ||
    !currentUser ||
    !currentUser.emailVerified ||
    currentUser.uid !== currentUid
  ) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'groupInvites'),
    where('targetUid', '==', currentUid),
    limit(20)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const invites: GroupInvite[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data || data.status !== 'pending') return;
        invites.push({
          id: docSnap.id,
          groupId: String(data.groupId || ''),
          groupName: String(data.groupName || 'گروه همسفران'),
          inviterUid: String(data.inviterUid || ''),
          inviterName: String(data.inviterName || 'رهبر گروه'),
          targetUid: String(data.targetUid || currentUid),
          targetName: String(data.targetName || ''),
          status: 'pending',
          createdAtMs: resolveTimestampMs(data.createdAt, Date.now()),
          updatedAtMs: resolveTimestampMs(data.updatedAt, Date.now()),
        });
      });
      invites.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onUpdate(invites);
    },
    (error) => {
      console.error('Group invites snapshot error:', error.message);
    }
  );
}

/**
 * Creates a brand-new Level 1 Group ("چادر کهنه همسفران") on the World Map
 * and adds the creator as its leader.
 */
export async function createWorldGroup(
  profile: UserProfile,
  rawName: string,
  rawMotto: string
): Promise<WorldGroup> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  const cleanName = sanitizeGroupName(rawName);
  if (cleanName.length < 2) {
    throw new Error('INVALID_GROUP_NAME');
  }
  const cleanMotto = sanitizeGroupMotto(rawMotto);

  const groupId = makeGroupId(currentUser.uid);
  const { worldX, worldY } = getDeterministicGroupCoords(groupId);
  const base = buildValidatedCloudPayload(profile, currentUser);

  const groupPath = `groups/${groupId}`;
  try {
    await setDoc(doc(db, 'groups', groupId), {
      id: groupId,
      name: cleanName,
      motto: cleanMotto,
      leaderUid: base.uid,
      leaderName: base.displayName,
      isPublic: true,
      buildingLevel: 1,
      treasuryCoins: 0,
      totalContributedCoins: 0,
      memberCount: 1,
      worldX,
      worldY,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, groupPath);
  }

  const memberPath = `groups/${groupId}/members/${base.uid}`;
  try {
    await setDoc(doc(db, 'groups', groupId, 'members', base.uid), {
      uid: base.uid,
      groupId,
      displayName: base.displayName,
      gender: base.gender,
      skinTone: base.skinTone,
      hairStyle: base.hairStyle,
      hairColor: base.hairColor,
      faceExpression: base.faceExpression,
      outfit: base.outfit,
      pants: base.pants,
      accessory: base.accessory,
      bgAura: base.bgAura,
      role: 'leader',
      contributedCoins: 0,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, memberPath);
  }

  return {
    id: groupId,
    name: cleanName,
    motto: cleanMotto,
    leaderUid: base.uid,
    leaderName: base.displayName,
    isPublic: true,
    buildingLevel: 1,
    treasuryCoins: 0,
    totalContributedCoins: 0,
    memberCount: 1,
    worldX,
    worldY,
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
  };
}

/**
 * Contributes gold coins from a verified group member toward upgrading the shared Group Building.
 */
export async function contributeToGroupBuilding(
  profile: UserProfile,
  group: WorldGroup,
  amount: number
): Promise<{
  nextLevel: 1 | 2 | 3 | 4 | 5;
  nextTreasuryCoins: number;
  leveledUp: boolean;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  const cleanAmount = Math.max(1, Math.floor(Number(amount) || 0));
  if (group.buildingLevel >= 5) {
    throw new Error('MAX_LEVEL_REACHED');
  }

  const progression = applyGroupContribution(
    group.buildingLevel,
    group.treasuryCoins,
    cleanAmount
  );

  const groupPath = `groups/${group.id}`;
  try {
    await updateDoc(doc(db, 'groups', group.id), {
      buildingLevel: progression.nextLevel,
      treasuryCoins: progression.nextTreasuryCoins,
      totalContributedCoins: group.totalContributedCoins + cleanAmount,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, groupPath);
  }

  const memberRef = doc(db, 'groups', group.id, 'members', currentUser.uid);
  const memberPath = `groups/${group.id}/members/${currentUser.uid}`;
  const base = buildValidatedCloudPayload(profile, currentUser);
  let prevContributed = 0;
  try {
    const memberSnap = await getDoc(memberRef);
    if (memberSnap.exists()) {
      prevContributed = Math.max(
        0,
        Math.floor(Number(memberSnap.data()?.contributedCoins) || 0)
      );
    }
    await updateDoc(memberRef, {
      displayName: base.displayName,
      skinTone: base.skinTone,
      hairStyle: base.hairStyle,
      hairColor: base.hairColor,
      faceExpression: base.faceExpression,
      outfit: base.outfit,
      pants: base.pants,
      accessory: base.accessory,
      bgAura: base.bgAura,
      contributedCoins: prevContributed + cleanAmount,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, memberPath);
  }

  return {
    nextLevel: progression.nextLevel,
    nextTreasuryCoins: progression.nextTreasuryCoins,
    leveledUp: progression.leveledUp,
  };
}

/**
 * Player submits a join request to a World Group (`/groups/{groupId}/joinRequests/{uid}`).
 */
export async function requestToJoinGroup(
  profile: UserProfile,
  group: WorldGroup,
  note = ''
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  const base = buildValidatedCloudPayload(profile, currentUser);
  const reqPath = `groups/${group.id}/joinRequests/${base.uid}`;
  try {
    await setDoc(doc(db, 'groups', group.id, 'joinRequests', base.uid), {
      groupId: group.id,
      leaderUid: group.leaderUid,
      applicantUid: base.uid,
      applicantName: base.displayName,
      applicantGender: base.gender,
      skinTone: base.skinTone,
      hairStyle: base.hairStyle,
      hairColor: base.hairColor,
      faceExpression: base.faceExpression,
      outfit: base.outfit,
      pants: base.pants,
      accessory: base.accessory,
      bgAura: base.bgAura,
      note: sanitizeGroupMotto(note),
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, reqPath);
  }
}

/**
 * Group Leader approves a pending join request: creates `/members/{applicantUid}`,
 * increments `memberCount`, and deletes the pending request.
 */
export async function approveGroupJoinRequest(
  group: WorldGroup,
  req: GroupJoinRequest
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  if (group.leaderUid !== currentUser.uid) {
    throw new Error('LEADER_ONLY');
  }
  if (group.memberCount >= GROUP_MAX_MEMBERS) {
    throw new Error('GROUP_FULL');
  }

  const defaults = getDefaultAvatarConfig(req.applicantGender);
  const cfg = { ...defaults, ...req.applicantAvatar };
  const memberPath = `groups/${group.id}/members/${req.applicantUid}`;

  try {
    await setDoc(doc(db, 'groups', group.id, 'members', req.applicantUid), {
      uid: req.applicantUid,
      groupId: group.id,
      displayName: req.applicantName.slice(0, 50) || 'همسفر نور',
      gender: req.applicantGender,
      skinTone: cfg.skinTone,
      hairStyle: cfg.hairStyle,
      hairColor: cfg.hairColor,
      faceExpression: cfg.faceExpression || 'happy_smile',
      outfit: cfg.outfit,
      pants: cfg.pants || 'forest_trousers',
      accessory: cfg.accessory,
      bgAura: cfg.bgAura,
      role: 'member',
      contributedCoins: 0,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, memberPath);
  }

  try {
    await updateDoc(doc(db, 'groups', group.id), {
      memberCount: Math.min(GROUP_MAX_MEMBERS, group.memberCount + 1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `groups/${group.id}`);
  }

  try {
    await deleteDoc(
      doc(db, 'groups', group.id, 'joinRequests', req.applicantUid)
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `groups/${group.id}/joinRequests/${req.applicantUid}`
    );
  }
}

/**
 * Group Leader rejects (deletes) a pending join request.
 */
export async function rejectGroupJoinRequest(
  groupId: string,
  applicantUid: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  const reqPath = `groups/${groupId}/joinRequests/${applicantUid}`;
  try {
    await deleteDoc(doc(db, 'groups', groupId, 'joinRequests', applicantUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, reqPath);
  }
}

/**
 * Group Leader sends a direct Group Invite to a target player (`/groupInvites/{groupId}__{targetUid}`).
 */
export async function invitePlayerToGroup(
  leaderProfile: UserProfile,
  group: WorldGroup,
  target: ChatTargetUser
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  if (group.leaderUid !== currentUser.uid) {
    throw new Error('LEADER_ONLY');
  }
  if (target.uid === currentUser.uid) {
    throw new Error('CANNOT_INVITE_SELF');
  }

  const inviteId = makeGroupInviteId(group.id, target.uid);
  const invitePath = `groupInvites/${inviteId}`;
  const base = buildValidatedCloudPayload(leaderProfile, currentUser);

  try {
    await setDoc(doc(db, 'groupInvites', inviteId), {
      id: inviteId,
      groupId: group.id,
      groupName: group.name.slice(0, 40),
      inviterUid: base.uid,
      inviterName: base.displayName,
      targetUid: target.uid,
      targetName: (target.name || 'کاربر انجلرن').slice(0, 50),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, invitePath);
  }
}

/**
 * Invitee accepts a pending Group Invite: writes member doc, increments `memberCount`,
 * and marks the invite accepted.
 */
export async function acceptGroupInvite(
  profile: UserProfile,
  invite: GroupInvite
): Promise<WorldGroup | null> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  const base = buildValidatedCloudPayload(profile, currentUser);
  const groupSnap = await getDoc(doc(db, 'groups', invite.groupId));
  if (!groupSnap.exists()) {
    throw new Error('GROUP_NOT_FOUND');
  }
  const group = mapWorldGroupDoc(groupSnap.id, groupSnap.data());
  if (group.memberCount >= GROUP_MAX_MEMBERS) {
    throw new Error('GROUP_FULL');
  }

  const memberPath = `groups/${group.id}/members/${base.uid}`;
  try {
    await setDoc(doc(db, 'groups', group.id, 'members', base.uid), {
      uid: base.uid,
      groupId: group.id,
      displayName: base.displayName,
      gender: base.gender,
      skinTone: base.skinTone,
      hairStyle: base.hairStyle,
      hairColor: base.hairColor,
      faceExpression: base.faceExpression,
      outfit: base.outfit,
      pants: base.pants,
      accessory: base.accessory,
      bgAura: base.bgAura,
      role: 'member',
      contributedCoins: 0,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, memberPath);
  }

  try {
    await updateDoc(doc(db, 'groups', group.id), {
      memberCount: Math.min(GROUP_MAX_MEMBERS, group.memberCount + 1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `groups/${group.id}`);
  }

  try {
    await updateDoc(doc(db, 'groupInvites', invite.id), {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `groupInvites/${invite.id}`
    );
  }

  return {
    ...group,
    memberCount: Math.min(GROUP_MAX_MEMBERS, group.memberCount + 1),
  };
}

/**
 * Invitee declines a pending Group Invite.
 */
export async function declineGroupInvite(invite: GroupInvite): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  const invitePath = `groupInvites/${invite.id}`;
  try {
    await updateDoc(doc(db, 'groupInvites', invite.id), {
      status: 'declined',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, invitePath);
  }
}

/**
 * Allows a member (or solo leader) to leave a group cleanly.
 */
export async function leaveGroup(group: WorldGroup): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  const uid = currentUser.uid;

  if (group.leaderUid === uid && group.memberCount > 1) {
    throw new Error('LEADER_CANNOT_LEAVE_WITH_MEMBERS');
  }

  if (group.leaderUid === uid && group.memberCount <= 1) {
    try {
      await deleteDoc(doc(db, 'groups', group.id, 'members', uid));
      await deleteDoc(doc(db, 'groups', group.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${group.id}`);
    }
    return;
  }

  try {
    await updateDoc(doc(db, 'groups', group.id), {
      memberCount: Math.max(1, group.memberCount - 1),
      updatedAt: serverTimestamp(),
    });
    await deleteDoc(doc(db, 'groups', group.id, 'members', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `groups/${group.id}`);
  }
}

/**
 * Real-time subscription to member-only Group Chat (`/groups/{groupId}/messages`).
 */
export function subscribeToGroupChatMessages(
  groupId: string | undefined,
  onUpdate: (messages: GroupChatMessage[]) => void,
  onError?: (message: string) => void
): () => void {
  const currentUser = auth.currentUser;
  if (
    !groupId ||
    !isValidFirestoreId(groupId) ||
    !currentUser ||
    !currentUser.emailVerified
  ) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'groups', groupId, 'messages'),
    where('groupId', '==', groupId),
    limit(80)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: GroupChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data || !data.senderUid || typeof data.text !== 'string') return;
        const gender = data.senderGender === 'boy' ? 'boy' : 'girl';
        list.push({
          id: docSnap.id,
          groupId: String(data.groupId || groupId),
          senderUid: String(data.senderUid),
          senderName: String(data.senderName || 'همسفر گروه'),
          senderGender: gender,
          senderAvatar: extractAvatarFromRecord(data, gender),
          text: String(data.text),
          createdAtMs: resolveTimestampMs(data.createdAt, Date.now()),
        });
      });

      list.sort((a, b) => {
        if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
        return b.id.localeCompare(a.id);
      });
      onUpdate(list);
    },
    (error) => {
      console.error('Group chat snapshot error:', error.message);
      if (onError) onError(error.message);
    }
  );
}

/**
 * Sends a chat message inside `/groups/{groupId}/messages/{messageId}` (members only).
 */
export async function sendGroupChatMessage(
  profile: UserProfile,
  groupId: string,
  rawText: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  const cleanText = sanitizeChatText(rawText);
  if (!cleanText) {
    throw new Error('EMPTY_MESSAGE');
  }

  const base = buildValidatedCloudPayload(profile, currentUser);
  const messageId = makeChronoDocId(currentUser.uid.slice(0, 8));
  const msgPath = `groups/${groupId}/messages/${messageId}`;

  try {
    await setDoc(doc(db, 'groups', groupId, 'messages', messageId), {
      groupId,
      senderUid: base.uid,
      senderName: base.displayName,
      senderGender: base.gender,
      skinTone: base.skinTone,
      hairStyle: base.hairStyle,
      hairColor: base.hairColor,
      faceExpression: base.faceExpression,
      outfit: base.outfit,
      pants: base.pants,
      accessory: base.accessory,
      bgAura: base.bgAura,
      text: cleanText,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, msgPath);
  }
}

/**
 * Deletes the authenticated user's own group chat message.
 */
export async function deleteGroupChatMessage(
  groupId: string,
  messageId: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (
    !currentUser ||
    !currentUser.emailVerified ||
    !isValidFirestoreId(groupId) ||
    !isValidFirestoreId(messageId)
  ) {
    return;
  }
  try {
    await deleteDoc(doc(db, 'groups', groupId, 'messages', messageId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `groups/${groupId}/messages/${messageId}`
    );
  }
}

/**
 * Checks public groups to detect if a signed-in user has been approved into any group
 * (e.g., while offline or before opening GroupModal). Index-free single-field query.
 */
export async function findMyGroupMembership(
  currentUid: string | undefined
): Promise<{ groupId: string; groupName: string } | null> {
  const currentUser = auth.currentUser;
  if (
    !currentUid ||
    !currentUser ||
    !currentUser.emailVerified ||
    currentUser.uid !== currentUid
  ) {
    return null;
  }

  try {
    const q = query(
      collection(db, 'groups'),
      where('isPublic', '==', true),
      limit(50)
    );
    const snap = await getDocs(q);
    const checks = snap.docs.map(async (groupDoc) => {
      try {
        const memSnap = await getDoc(
          doc(db, 'groups', groupDoc.id, 'members', currentUid)
        );
        if (memSnap.exists()) {
          return {
            groupId: groupDoc.id,
            groupName: String(groupDoc.data()?.name || 'گروه همسفران'),
          };
        }
      } catch {
        // Not a member or unreadable
      }
      return null;
    });
    const results = await Promise.all(checks);
    return results.find((r) => r !== null) || null;
  } catch {
    return null;
  }
}

/**
 * Allows the Group Leader (`leaderUid === auth.currentUser.uid`) to relocate the Group HQ tent
 * anywhere across valid World Map coordinates (`280..2520`, `220..1620`).
 */
export async function relocateWorldGroup(
  group: WorldGroup,
  worldX: number,
  worldY: number
): Promise<{ worldX: number; worldY: number }> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  if (group.leaderUid !== currentUser.uid) {
    throw new Error('LEADER_ONLY');
  }
  const clamped = clampWorldCoords(worldX, worldY);
  const groupPath = `groups/${group.id}`;
  try {
    await updateDoc(doc(db, 'groups', group.id), {
      worldX: clamped.x,
      worldY: clamped.y,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, groupPath);
  }
  return { worldX: clamped.x, worldY: clamped.y };
}

/**
 * Real-time subscription to Group Game Challenges inside `/groups/{groupId}/challenges`.
 */
export function subscribeToGroupChallenges(
  groupId: string | undefined,
  onUpdate: (challenges: GroupGameChallenge[]) => void,
  onError?: (message: string) => void
): () => void {
  const currentUser = auth.currentUser;
  if (
    !groupId ||
    !isValidFirestoreId(groupId) ||
    !currentUser ||
    !currentUser.emailVerified
  ) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'groups', groupId, 'challenges'),
    where('groupId', '==', groupId),
    limit(40)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: GroupGameChallenge[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data || typeof data.gameId !== 'string') return;
        if (!isValidGroupChallengeGameId(data.gameId)) return;
        const gender = data.creatorGender === 'boy' ? 'boy' : 'girl';
        list.push({
          id: docSnap.id,
          groupId: String(data.groupId || groupId),
          gameId: data.gameId,
          title: sanitizeChallengeTitle(String(data.title || ''), data.gameId),
          creatorUid: String(data.creatorUid || ''),
          creatorName: String(data.creatorName || 'همسفر گروه'),
          creatorGender: gender,
          creatorAvatar: extractAvatarFromRecord(data, gender),
          createdAtMs: resolveTimestampMs(data.createdAt, Date.now()),
        });
      });

      list.sort((a, b) => a.createdAtMs - b.createdAtMs);
      onUpdate(list);
    },
    (error) => {
      console.error('Group challenges snapshot error:', error.message);
      if (onError) onError(error.message);
    }
  );
}

/**
 * Posts a tree-game competition inside `/groups/{groupId}/challenges/{challengeId}`.
 */
export async function createGroupChallenge(
  profile: UserProfile,
  groupId: string,
  gameId: GroupChallengeGameId,
  rawTitle?: string
): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  const base = buildValidatedCloudPayload(profile, currentUser);
  const challengeId = makeGroupChallengeId(currentUser.uid);
  const title = sanitizeChallengeTitle(rawTitle, gameId);
  const path = `groups/${groupId}/challenges/${challengeId}`;

  try {
    await setDoc(doc(db, 'groups', groupId, 'challenges', challengeId), {
      id: challengeId,
      groupId,
      gameId,
      title,
      creatorUid: base.uid,
      creatorName: base.displayName,
      creatorGender: base.gender,
      skinTone: base.skinTone,
      hairStyle: base.hairStyle,
      hairColor: base.hairColor,
      faceExpression: base.faceExpression,
      outfit: base.outfit,
      pants: base.pants,
      accessory: base.accessory,
      bgAura: base.bgAura,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
  return challengeId;
}

/**
 * Deletes a group game challenge (creator or group leader).
 */
export async function deleteGroupChallenge(
  groupId: string,
  challengeId: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (
    !currentUser ||
    !currentUser.emailVerified ||
    !isValidFirestoreId(groupId) ||
    !isValidFirestoreId(challengeId)
  ) {
    return;
  }
  try {
    await deleteDoc(doc(db, 'groups', groupId, 'challenges', challengeId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `groups/${groupId}/challenges/${challengeId}`
    );
  }
}

/**
 * Real-time subscription to ranked high scores under a specific group game challenge.
 */
export function subscribeToChallengeScores(
  groupId: string | undefined,
  challengeId: string | undefined,
  onUpdate: (scores: GroupChallengeScore[]) => void,
  onError?: (message: string) => void
): () => void {
  const currentUser = auth.currentUser;
  if (
    !groupId ||
    !challengeId ||
    !isValidFirestoreId(groupId) ||
    !isValidFirestoreId(challengeId) ||
    !currentUser ||
    !currentUser.emailVerified
  ) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'groups', groupId, 'challenges', challengeId, 'scores'),
    where('groupId', '==', groupId),
    where('challengeId', '==', challengeId),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: GroupChallengeScore[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data || !data.playerUid) return;
        const gender = data.playerGender === 'boy' ? 'boy' : 'girl';
        list.push({
          challengeId: String(data.challengeId || challengeId),
          groupId: String(data.groupId || groupId),
          playerUid: String(data.playerUid || docSnap.id),
          playerName: String(data.playerName || 'همسفر گروه'),
          playerGender: gender,
          playerAvatar: extractAvatarFromRecord(data, gender),
          bestScore: clampChallengeScore(Number(data.bestScore) || 0),
          bestDetail: String(data.bestDetail || '').slice(0, 80),
          attemptsCount: Math.max(1, Math.floor(Number(data.attemptsCount) || 1)),
          createdAtMs: resolveTimestampMs(data.createdAt, Date.now()),
          updatedAtMs: resolveTimestampMs(data.updatedAt, Date.now()),
        });
      });

      onUpdate(sortChallengeLeaderboard(list));
    },
    (error) => {
      console.error('Challenge scores snapshot error:', error.message);
      if (onError) onError(error.message);
    }
  );
}

/**
 * Submits a player's score to a group game challenge while strictly keeping ONLY their highest record.
 */
export async function submitGroupChallengeScore(
  profile: UserProfile,
  groupId: string,
  challengeId: string,
  rawScore: number,
  detailLabel: string
): Promise<{
  isNewRecord: boolean;
  bestScore: number;
  previousBest: number | null;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    throw new Error('AUTH_REQUIRED');
  }
  const cleanScore = clampChallengeScore(rawScore);
  const cleanDetail = (detailLabel || 'ثبت رکورد').trim().slice(0, 80) || 'ثبت رکورد';
  const base = buildValidatedCloudPayload(profile, currentUser);
  const scoreRef = doc(
    db,
    'groups',
    groupId,
    'challenges',
    challengeId,
    'scores',
    currentUser.uid
  );
  const scorePath = `groups/${groupId}/challenges/${challengeId}/scores/${currentUser.uid}`;

  let existingSnap;
  try {
    existingSnap = await getDoc(scoreRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, scorePath);
    throw error;
  }

  if (!existingSnap.exists()) {
    try {
      await setDoc(scoreRef, {
        challengeId,
        groupId,
        playerUid: base.uid,
        playerName: base.displayName,
        playerGender: base.gender,
        skinTone: base.skinTone,
        hairStyle: base.hairStyle,
        hairColor: base.hairColor,
        faceExpression: base.faceExpression,
        outfit: base.outfit,
        pants: base.pants,
        accessory: base.accessory,
        bgAura: base.bgAura,
        bestScore: cleanScore,
        bestDetail: cleanDetail,
        attemptsCount: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, scorePath);
    }
    return {
      isNewRecord: true,
      bestScore: cleanScore,
      previousBest: null,
    };
  }

  const existingData = existingSnap.data();
  const previousBest = clampChallengeScore(Number(existingData?.bestScore) || 0);
  const prevAttempts = Math.max(
    1,
    Math.floor(Number(existingData?.attemptsCount) || 1)
  );

  if (!shouldUpdateChallengeRecord(previousBest, cleanScore)) {
    return {
      isNewRecord: false,
      bestScore: previousBest,
      previousBest,
    };
  }

  try {
    await updateDoc(scoreRef, {
      playerName: base.displayName,
      playerGender: base.gender,
      skinTone: base.skinTone,
      hairStyle: base.hairStyle,
      hairColor: base.hairColor,
      faceExpression: base.faceExpression,
      outfit: base.outfit,
      pants: base.pants,
      accessory: base.accessory,
      bgAura: base.bgAura,
      bestScore: cleanScore,
      bestDetail: cleanDetail,
      attemptsCount: prevAttempts + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, scorePath);
  }

  return {
    isNewRecord: true,
    bestScore: cleanScore,
    previousBest,
  };
}

export { onAuthStateChanged };
export type { User };

