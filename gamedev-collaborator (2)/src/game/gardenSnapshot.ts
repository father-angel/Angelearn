import {
  AvatarConfig,
  AvatarGender,
  DecorationType,
  GardenDecoration,
  TreeData,
  TreeId,
  UserProfile,
  VisitorGarden,
} from '../types/game';

export interface CloudTreeSnapshotItem {
  id: string;
  unlocked: boolean;
  wateredDaysCount: number;
  x: number;
  y: number;
}

export interface CloudDecorationSnapshotItem {
  type: DecorationType;
  name: string;
  icon: string;
  x: number;
  y: number;
}

const VALID_DECORATION_TYPES: ReadonlySet<DecorationType> = new Set([
  'fence',
  'bench',
  'lantern',
  'pot',
  'path',
  'flower',
  'fountain',
]);

const clampGridCoord = (val: unknown, fallback: number): number => {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(5, Math.floor(num)));
};

export function serializeTreesSnapshot(
  trees: TreeData[]
): CloudTreeSnapshotItem[] {
  return trees.slice(0, 12).map((t) => ({
    id: String(t.id).slice(0, 40),
    unlocked: Boolean(t.unlocked),
    wateredDaysCount: Math.max(
      0,
      Math.min(100000, Math.floor(Number(t.wateredDaysCount) || 0))
    ),
    x: clampGridCoord(t.position?.x, 0),
    y: clampGridCoord(t.position?.y, 1),
  }));
}

export function serializeDecorationsSnapshot(
  decorations: GardenDecoration[]
): CloudDecorationSnapshotItem[] {
  return decorations
    .filter((d) => VALID_DECORATION_TYPES.has(d.type))
    .slice(0, 36)
    .map((d) => ({
      type: d.type,
      name: (String(d.name || d.type).trim() || d.type).slice(0, 60),
      icon: (String(d.icon || '🌿').trim() || '🌿').slice(0, 16),
      x: clampGridCoord(d.x, 0),
      y: clampGridCoord(d.y, 0),
    }));
}

/**
 * Reconstructs a visited player's exact tree list from cloud snapshot data,
 * falling back cleanly for older /worldGardens docs that only have unlockedTreeCount.
 */
export function hydrateVisitorTrees(
  baseTrees: TreeData[],
  treesSnapshot?: unknown,
  fallbackUnlockedCount: number = 2,
  fallbackStreakDays: number = 1
): TreeData[] {
  if (Array.isArray(treesSnapshot) && treesSnapshot.length > 0) {
    const byId = new Map<string, Record<string, unknown>>();
    for (const raw of treesSnapshot) {
      if (raw && typeof raw === 'object' && typeof (raw as { id?: unknown }).id === 'string') {
        byId.set((raw as { id: string }).id, raw as Record<string, unknown>);
      }
    }

    if (byId.size > 0) {
      return baseTrees.map((baseTree) => {
        const snap = byId.get(baseTree.id);
        if (!snap) {
          return {
            ...baseTree,
            unlocked: false,
            wateredDaysCount: 0,
            lastWateredDate: undefined,
            daysWithoutWater: 0,
            isWithered: false,
          };
        }
        return {
          ...baseTree,
          unlocked: Boolean(snap.unlocked),
          wateredDaysCount: Math.max(
            0,
            Math.min(100000, Math.floor(Number(snap.wateredDaysCount) || 0))
          ),
          lastWateredDate: undefined,
          daysWithoutWater: 0,
          isWithered: false,
          position: {
            x: clampGridCoord(snap.x, baseTree.position.x),
            y: clampGridCoord(snap.y, baseTree.position.y),
          },
        };
      });
    }
  }

  const safeCount = Math.max(1, Math.min(baseTrees.length, Math.floor(fallbackUnlockedCount) || 2));
  const safeDays = Math.max(1, Math.min(30, Math.floor(fallbackStreakDays) || 1));

  return baseTrees.map((baseTree, idx) => ({
    ...baseTree,
    unlocked: idx < safeCount,
    wateredDaysCount: idx < safeCount ? safeDays : 0,
    lastWateredDate: undefined,
    daysWithoutWater: 0,
    isWithered: false,
  }));
}

/**
 * Reconstructs placed garden decorations from a cloud snapshot.
 */
export function hydrateVisitorDecorations(
  decorationsSnapshot?: unknown
): GardenDecoration[] {
  if (!Array.isArray(decorationsSnapshot)) return [];

  const result: GardenDecoration[] = [];
  decorationsSnapshot.slice(0, 36).forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') return;
    const item = raw as Record<string, unknown>;
    const type = item.type as DecorationType;
    if (!VALID_DECORATION_TYPES.has(type)) return;

    result.push({
      id: `cloud_deco_${idx}`,
      type,
      name:
        typeof item.name === 'string' && item.name.trim()
          ? item.name.slice(0, 60)
          : 'تزئین باغ',
      icon:
        typeof item.icon === 'string' && item.icon.trim()
          ? item.icon.slice(0, 16)
          : '🌿',
      cost: 0,
      x: clampGridCoord(item.x, 0),
      y: clampGridCoord(item.y, 0),
    });
  });

  return result;
}

export function getFallbackAvatarConfigForGender(gender: AvatarGender): AvatarConfig {
  if (gender === 'boy') {
    return {
      skinTone: 'wheat_glow',
      hairStyle: 'classic_waves',
      hairColor: 'espresso',
      faceExpression: 'happy_smile',
      outfit: 'gardener_tunic',
      pants: 'classic_denim',
      accessory: 'leaf_sprout',
      bgAura: 'emerald_mist',
    };
  }
  return {
    skinTone: 'warm_ivory',
    hairStyle: 'silk_shawl',
    hairColor: 'espresso',
    faceExpression: 'happy_smile',
    outfit: 'gardener_tunic',
    pants: 'forest_trousers',
    accessory: 'leaf_sprout',
    bgAura: 'emerald_mist',
  };
}

/**
 * Builds a synthetic read-only UserProfile representing the visited garden's owner
 * so Garden2DView & CompanionGardenersLayer render their exact look and pavilion level.
 */
export function buildVisitorOwnerProfile(garden: VisitorGarden): UserProfile {
  const gender: AvatarGender = garden.gender === 'boy' ? 'boy' : 'girl';
  const fallbackAvatar = getFallbackAvatarConfigForGender(gender);
  const avatarConfig: AvatarConfig = garden.avatarConfig
    ? {
        ...fallbackAvatar,
        ...garden.avatarConfig,
        faceExpression:
          garden.avatarConfig.faceExpression || fallbackAvatar.faceExpression,
        pants: garden.avatarConfig.pants || fallbackAvatar.pants,
      }
    : fallbackAvatar;

  return {
    id: garden.id,
    name: garden.ownerName,
    gender,
    bio: garden.bio,
    coins: garden.coins,
    streakDays: garden.streakDays,
    avatarConfig,
    isGuest: false,
    googleConnected: true,
    createdAt: '2025-01-01',
    lastActiveDate: '2025-01-01',
    privacy: {
      showAge: false,
      showGratitude: false,
      showStats: true,
    },
  };
}

export function countUnlockedTreesInSnapshot(
  trees: TreeData[],
  fallbackId?: TreeId
): number {
  const count = trees.filter((t) => t.unlocked || t.id === fallbackId).length;
  return Math.max(1, count);
}
