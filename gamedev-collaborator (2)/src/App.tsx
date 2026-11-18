import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import {
  UserProfile,
  TreeData,
  GardenDecoration,
  VisitorGarden,
  TreeId,
  QuestItem,
  MailItem,
  ExerciseCompletionReport,
  ChatTargetUser,
  WorldGroup,
  GroupInvite,
  GroupJoinRequest,
} from './types/game';
import {
  loadProfile,
  saveProfile,
  loadTrees,
  saveTrees,
  loadDecorations,
  saveDecorations,
  loadQuests,
  saveQuests,
  loadMails,
  saveMails,
  saveExerciseLog,
  getTodayDateString,
  getYesterdayLocalDateString,
  hasCompletedOnboarding,
  SAMPLE_VISITOR_GARDENS,
} from './utils/storage';
import {
  waterTree,
  processPurchase,
  isValidCoinAmount,
  collectSpringWater,
  harvestTreeCoins,
} from './game/rules';
import {
  resolveGardenTreeActivityId,
  submitUnifiedActivityResult,
} from './activities';
import {
  areExternalCoinSourcesBlocked,
  isResearchModeActive,
} from './research';
import { sound } from './utils/audio';
import {
  auth,
  onAuthStateChanged,
  syncOrLoadCloudUserAccount,
  saveProfileToCloudIfSignedIn,
  fetchPublicWorldGardenById,
  getCurrentVerifiedUid,
  subscribeToGroup,
  subscribeToMyGroupInvites,
  subscribeToGroupJoinRequests,
  invitePlayerToGroup,
  findMyGroupMembership,
  relocateWorldGroup,
} from './firebase';

import { WarMasterHUD } from './components/WarMasterHUD';
import { Garden2DView } from './components/Garden2DView';

// Lazy-loaded heavy views, modals, and mini-games for fast startup & lighter memory footprint
const WorldMapView = lazy(() =>
  import('./components/WorldMapView').then((m) => ({ default: m.WorldMapView }))
);
const ShopModal = lazy(() =>
  import('./components/ShopModal').then((m) => ({ default: m.ShopModal }))
);
const ProfileModal = lazy(() =>
  import('./components/ProfileModal').then((m) => ({ default: m.ProfileModal }))
);
const RegistrationModal = lazy(() =>
  import('./components/RegistrationModal').then((m) => ({
    default: m.RegistrationModal,
  }))
);
const VisitorGardenModal = lazy(() =>
  import('./components/VisitorGardenModal').then((m) => ({
    default: m.VisitorGardenModal,
  }))
);
const QuestsModal = lazy(() =>
  import('./components/QuestsModal').then((m) => ({ default: m.QuestsModal }))
);
const MailboxModal = lazy(() =>
  import('./components/MailboxModal').then((m) => ({ default: m.MailboxModal }))
);
const ChatModal = lazy(() =>
  import('./components/ChatModal').then((m) => ({ default: m.ChatModal }))
);
const GroupModal = lazy(() =>
  import('./components/GroupModal').then((m) => ({ default: m.GroupModal }))
);

// Lazy-loaded Mini-games
const SpeedReadingGame = lazy(() =>
  import('./components/games/SpeedReadingGame').then((m) => ({
    default: m.SpeedReadingGame,
  }))
);
const GratitudeGame = lazy(() =>
  import('./components/games/GratitudeGame').then((m) => ({
    default: m.GratitudeGame,
  }))
);
const DeepBreathingGame = lazy(() =>
  import('./components/games/DeepBreathingGame').then((m) => ({
    default: m.DeepBreathingGame,
  }))
);
const BinaBallsGame = lazy(() =>
  import('./components/games/BinaBallsGame').then((m) => ({
    default: m.BinaBallsGame,
  }))
);
const MemoryCardsGame = lazy(() =>
  import('./components/games/MemoryCardsGame').then((m) => ({
    default: m.MemoryCardsGame,
  }))
);
const BrainMathGame = lazy(() =>
  import('./components/games/BrainMathGame').then((m) => ({
    default: m.BrainMathGame,
  }))
);
const PoetryGame = lazy(() =>
  import('./components/games/PoetryGame').then((m) => ({
    default: m.PoetryGame,
  }))
);

export default function App() {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean>(
    () => !isAutostart && !hasCompletedOnboarding()
  );
  const [profile, setProfile] = useState<UserProfile>(loadProfile);
  const [trees, setTrees] = useState<TreeData[]>(loadTrees);
  const [decorations, setDecorations] = useState<GardenDecoration[]>(loadDecorations);
  const [quests, setQuests] = useState<QuestItem[]>(loadQuests);
  const [mails, setMails] = useState<MailItem[]>(loadMails);

  const [currentTab, setCurrentTab] = useState<'garden' | 'map' | 'city'>('garden');
  const [initialCityWing, setInitialCityWing] = useState<'university' | 'school_workshop'>('university');
  const [activeTreeExercise, setActiveTreeExercise] = useState<TreeData | null>(null);

  // Modals state
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [shopInitialTab, setShopInitialTab] = useState<
    'trees' | 'decorations' | 'inventory' | 'groups'
  >('trees');
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);
  const [isMailboxOpen, setIsMailboxOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatInitialTab, setChatInitialTab] = useState<'world' | 'dm' | 'group'>('world');
  const [chatTargetUser, setChatTargetUser] = useState<ChatTargetUser | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState<boolean>(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [myGroup, setMyGroup] = useState<WorldGroup | null>(null);
  const [myInvites, setMyInvites] = useState<GroupInvite[]>([]);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [focusedGroup, setFocusedGroup] = useState<WorldGroup | null>(null);
  const [relocateGroupTrigger, setRelocateGroupTrigger] = useState<number>(0);
  const [visitorGarden, setVisitorGarden] = useState<VisitorGarden | null>(null);

  // Guard against rapid accidental double-tap purchases
  const lastPurchaseTimeRef = useRef<number>(0);

  // Brief branded entry splash (instant dismissal on tap)
  const [showEntrySplash, setShowEntrySplash] = useState<boolean>(() => !isAutostart);

  useEffect(() => {
    if (isAutostart) return;
    const timer = window.setTimeout(() => {
      setShowEntrySplash(false);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isAutostart]);

  const handleTabSwitch = useCallback((tab: 'garden' | 'map' | 'city') => {
    setCurrentTab((prev) => (prev === tab ? prev : tab));
  }, []);

  const handleEnterGardenTab = useCallback(() => {
    setCurrentTab('garden');
  }, []);

  const handleVisitGarden = useCallback((garden: VisitorGarden) => {
    setVisitorGarden(garden);
  }, []);

  // Handle URL query parameters for visitor view (sample or live cloud garden)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const visitParam = params.get('visit');
      if (visitParam) {
        const found = SAMPLE_VISITOR_GARDENS.find((g) => g.id === visitParam);
        if (found) {
          setVisitorGarden(found);
        } else {
          fetchPublicWorldGardenById(visitParam)
            .then((cloudGarden) => {
              if (cloudGarden) setVisitorGarden(cloudGarden);
            })
            .catch((err) => console.error('Cloud visit lookup error:', err));
        }
      }
    }
  }, []);

  // Update last active date & streak using consistent local calendar dates
  useEffect(() => {
    const today = getTodayDateString();
    if (profile.lastActiveDate !== today) {
      const yesterday = getYesterdayLocalDateString();
      const isConsecutive = profile.lastActiveDate === yesterday;
      const updatedStreak = isConsecutive ? profile.streakDays + 1 : 1;

      const updatedProfile: UserProfile = {
        ...profile,
        lastActiveDate: today,
        streakDays: updatedStreak,
      };
      setProfile(updatedProfile);
      saveProfile(updatedProfile);
    }
  }, []);

  const handleUpdateProfile = (updated: UserProfile) => {
    setProfile(updated);
    saveProfile(updated);
    saveProfileToCloudIfSignedIn(
      updated,
      trees.filter((t) => t.unlocked).length,
      trees,
      decorations
    ).catch((err) => console.error('Cloud profile save error:', err));
  };

  // Automatically restore & sync Google / Gmail session with Firestore on startup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser && authUser.emailVerified) {
        try {
          const currentLocal = loadProfile();
          let synced = await syncOrLoadCloudUserAccount(currentLocal, authUser);
          if (!synced.groupId) {
            const approved = await findMyGroupMembership(authUser.uid);
            if (approved) {
              synced = {
                ...synced,
                groupId: approved.groupId,
                groupName: approved.groupName,
              };
              saveProfileToCloudIfSignedIn(
                synced,
                loadTrees().filter((t) => t.unlocked).length
              ).catch(() => {});
            }
          }
          setProfile(synced);
          saveProfile(synced);
        } catch (err) {
          console.error('Auth state cloud sync error:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const verifiedUid = getCurrentVerifiedUid();

  // Real-time subscription to the player's current World Group
  useEffect(() => {
    if (!profile.groupId) {
      setMyGroup(null);
      return;
    }
    const unsub = subscribeToGroup(profile.groupId, setMyGroup);
    return () => unsub();
  }, [profile.groupId]);

  // Real-time subscription to incoming Group Invites for verified user
  useEffect(() => {
    if (!verifiedUid || profile.isGuest) {
      setMyInvites([]);
      return;
    }
    const unsub = subscribeToMyGroupInvites(verifiedUid, setMyInvites);
    return () => unsub();
  }, [verifiedUid, profile.isGuest]);

  // Real-time subscription to pending Join Requests if user is Leader
  const isLeaderOfMyGroup = Boolean(
    verifiedUid && myGroup && myGroup.leaderUid === verifiedUid
  );
  useEffect(() => {
    if (!myGroup || !isLeaderOfMyGroup) {
      setPendingJoinRequests([]);
      return;
    }
    const unsub = subscribeToGroupJoinRequests(
      myGroup.id,
      myGroup.leaderUid,
      setPendingJoinRequests
    );
    return () => unsub();
  }, [myGroup?.id, myGroup?.leaderUid, isLeaderOfMyGroup]);

  const myLeaderGroup = isLeaderOfMyGroup ? myGroup : null;

  const handleInvitePlayerToGroup = async (target: ChatTargetUser) => {
    if (!myLeaderGroup) return;
    await invitePlayerToGroup(profile, myLeaderGroup, target);
  };

  const handleResearchSessionChanged = () => {
    setProfile(loadProfile());
    setTrees(loadTrees());
    setDecorations(loadDecorations());
    setQuests(loadQuests());
    setMails(loadMails());
  };

  const handleSaveDecorations = (newDecos: GardenDecoration[]) => {
    setDecorations(newDecos);
    saveDecorations(newDecos);
    saveProfileToCloudIfSignedIn(
      profile,
      trees.filter((t) => t.unlocked).length,
      trees,
      newDecos
    ).catch((err) => console.error('Cloud decorations save error:', err));
  };

  const handleSelectTreeForExercise = (tree: TreeData) => {
    setActiveTreeExercise(tree);
  };

  const handleExerciseComplete = (
    success: boolean,
    report?: Partial<ExerciseCompletionReport>
  ) => {
    if (!activeTreeExercise) return;

    const today = getTodayDateString();

    // Always record separate completion vs accuracy report
    const fullReport: ExerciseCompletionReport = {
      treeId: activeTreeExercise.id,
      completedReadingOrPractice:
        report?.completedReadingOrPractice ?? Boolean(success),
      answeredCorrectly: report?.answeredCorrectly ?? Boolean(success),
      overallSuccess: Boolean(success),
      accuracyPercent: report?.accuracyPercent ?? (success ? 100 : 0),
      durationSeconds: report?.durationSeconds,
      startedAt: report?.startedAt,
      completedAt: report?.completedAt,
      wpm: report?.wpm,
      wordsRead: report?.wordsRead,
      timestamp: Date.now(),
      date: today,
    };
    saveExerciseLog(fullReport);

    // Stage 3 & Stage 4: Route registered activities through Unified Activity Registry & Progression Engine
    const unifiedActivityId = resolveGardenTreeActivityId(activeTreeExercise.id);
    const unifiedOutput = unifiedActivityId
      ? submitUnifiedActivityResult({
          playerId: profile.id,
          activityId: unifiedActivityId,
          startedAt: fullReport.startedAt,
          completedAt: fullReport.completedAt || new Date().toISOString(),
          status: success ? 'completed' : 'failed',
          durationSeconds: fullReport.durationSeconds ?? 10,
          scorePercent:
            activeTreeExercise.id === 'gratitude' ||
            activeTreeExercise.id === 'deep_breathing' ||
            activeTreeExercise.id === 'poetry'
              ? null
              : fullReport.accuracyPercent ?? (success ? 100 : 0),
          interactionCompleted: fullReport.completedReadingOrPractice,
          assessmentPassed: fullReport.answeredCorrectly,
          metadata: {
            treeId: activeTreeExercise.id,
          },
        })
      : null;

    if (success) {
      const currentTree =
        trees.find((t) => t.id === activeTreeExercise.id) || activeTreeExercise;
      const { updatedTree, coinsEarned } = waterTree(currentTree, today);

      const updatedTrees = trees.map((t) =>
        t.id === updatedTree.id ? updatedTree : t
      );
      setTrees(updatedTrees);
      saveTrees(updatedTrees);

      // In Research Mode, reward coins are strictly determined by the active A/B Policy via the shared progression engine
      const addedCoins =
        isResearchModeActive() && unifiedOutput
          ? Math.max(0, unifiedOutput.reward.coinsAwarded)
          : Math.max(0, coinsEarned);

      const updatedProfile: UserProfile =
        addedCoins > 0
          ? {
              ...profile,
              coins: profile.coins + addedCoins,
            }
          : profile;
      if (addedCoins > 0) {
        setProfile(updatedProfile);
        saveProfile(updatedProfile);
      }
      saveProfileToCloudIfSignedIn(
        updatedProfile,
        updatedTrees.filter((t) => t.unlocked).length,
        updatedTrees,
        decorations
      ).catch((err) => console.error('Cloud exercise sync error:', err));

      setQuests((prev) => {
        const nextQuests = prev.map((q) => {
          if (q.id === 'q_breath' && activeTreeExercise.id === 'deep_breathing') {
            return { ...q, current: 1, completed: true };
          }
          if (q.id === 'q_speed' && activeTreeExercise.id === 'speed_reading') {
            return { ...q, current: 1, completed: true };
          }
          if (q.id === 'q_gratitude' && activeTreeExercise.id === 'gratitude') {
            return { ...q, current: 1, completed: true };
          }
          return q;
        });
        saveQuests(nextQuests);
        return nextQuests;
      });
    }

    setActiveTreeExercise(null);
  };

  const handleUnlockTree = (
    treeId: TreeId,
    cost: number,
    targetPos?: { x: number; y: number }
  ) => {
    const targetTree = trees.find((t) => t.id === treeId);
    if (!targetTree || targetTree.unlocked) return;

    const effectiveCost = isValidCoinAmount(cost) ? cost : targetTree.cost;
    const purchaseResult = processPurchase(profile, effectiveCost, {
      alreadyOwned: targetTree.unlocked,
      itemId: treeId,
    });
    if (!purchaseResult.success) return;

    const updatedProfile = {
      ...profile,
      coins: purchaseResult.newCoins,
    };
    setProfile(updatedProfile);
    saveProfile(updatedProfile);

    const oldPos = targetTree.position;
    const treeAtTarget = targetPos
      ? trees.find(
          (t) =>
            t.id !== treeId &&
            t.position.x === targetPos.x &&
            t.position.y === targetPos.y
        )
      : undefined;

    const updatedTrees = trees.map((t) => {
      if (t.id === treeId) {
        return {
          ...t,
          unlocked: true,
          unlockedAt: getTodayDateString(),
          position: targetPos ? { x: targetPos.x, y: targetPos.y } : t.position,
        };
      }
      if (treeAtTarget && t.id === treeAtTarget.id) {
        return {
          ...t,
          position: { x: oldPos.x, y: oldPos.y },
        };
      }
      return t;
    });
    setTrees(updatedTrees);
    saveTrees(updatedTrees);
    saveProfileToCloudIfSignedIn(
      updatedProfile,
      updatedTrees.filter((t) => t.unlocked).length,
      updatedTrees,
      decorations
    ).catch((err) => console.error('Cloud tree unlock sync error:', err));
  };

  const handleBuyDecoration = (
    deco: Omit<GardenDecoration, 'id' | 'x' | 'y'>,
    targetPos?: { x: number; y: number }
  ) => {
    const now = Date.now();
    if (now - lastPurchaseTimeRef.current < 250) return;

    const purchaseResult = processPurchase(profile, deco.cost);
    if (!purchaseResult.success) return;

    lastPurchaseTimeRef.current = now;

    const updatedProfile = {
      ...profile,
      coins: purchaseResult.newCoins,
    };
    setProfile(updatedProfile);
    saveProfile(updatedProfile);

    let placedX = targetPos ? targetPos.x : 2;
    let placedY = targetPos ? targetPos.y : 4;

    if (!targetPos) {
      let foundSpot = false;
      for (let r = 0; r < 6 && !foundSpot; r++) {
        for (let c = 0; c < 6; c++) {
          const hasTree = trees.some(
            (t) => t.unlocked && t.position.x === c && t.position.y === r
          );
          const hasDeco = decorations.some((d) => d.x === c && d.y === r);
          if (!hasTree && !hasDeco) {
            placedX = c;
            placedY = r;
            foundSpot = true;
            break;
          }
        }
      }
    }

    const newDeco: GardenDecoration = {
      ...deco,
      id: `deco_${now}_${Math.random().toString(36).slice(2, 6)}`,
      x: placedX,
      y: placedY,
    };

    const updatedDecos = [...decorations, newDeco];
    setDecorations(updatedDecos);
    saveDecorations(updatedDecos);
    saveProfileToCloudIfSignedIn(
      updatedProfile,
      trees.filter((t) => t.unlocked).length,
      trees,
      updatedDecos
    ).catch((err) => console.error('Cloud decoration buy sync error:', err));
  };

  const handleHarvestSpring = useCallback(() => {
    // Requirement #9: Disable external coin sources in Research Mode
    if (areExternalCoinSourcesBlocked()) return;

    const today = getTodayDateString();
    const { updatedProfile, collected } = collectSpringWater(profile, today);
    if (!collected) return;

    setProfile(updatedProfile);
    saveProfile(updatedProfile);
    saveProfileToCloudIfSignedIn(
      updatedProfile,
      trees.filter((t) => t.unlocked).length,
      trees,
      decorations
    ).catch((err) => console.error('Cloud spring sync error:', err));
  }, [profile, trees, decorations]);

  const handleHarvestTreeCoins = useCallback(
    (treeId: TreeId) => {
      // Requirement #9: Disable external coin sources in Research Mode
      if (areExternalCoinSourcesBlocked()) return;

      const targetTree = trees.find((t) => t.id === treeId);
      if (!targetTree) return;

      const { updatedTree, coinsHarvested } = harvestTreeCoins(
        targetTree,
        Date.now()
      );
      if (coinsHarvested <= 0) return;

      const updatedTrees = trees.map((t) =>
        t.id === treeId ? updatedTree : t
      );
      const updatedProfile: UserProfile = {
        ...profile,
        coins: profile.coins + coinsHarvested,
      };

      setTrees(updatedTrees);
      saveTrees(updatedTrees);
      setProfile(updatedProfile);
      saveProfile(updatedProfile);
      saveProfileToCloudIfSignedIn(
        updatedProfile,
        updatedTrees.filter((t) => t.unlocked).length,
        updatedTrees,
        decorations
      ).catch((err) => console.error('Cloud tree harvest sync error:', err));
    },
    [profile, trees, decorations]
  );

  const handleHelpNeighbor = useCallback(() => {
    // Requirement #9: Disable external coin sources in Research Mode
    if (areExternalCoinSourcesBlocked()) return;

    setProfile((prev) => {
      const updatedProfile: UserProfile = {
        ...prev,
        coins: prev.coins + 5,
      };
      saveProfile(updatedProfile);
      return updatedProfile;
    });
  }, []);

  const handleClaimMail = (mailId: string) => {
    const target = mails.find((m) => m.id === mailId);
    if (!target || target.isClaimed) return;

    const blocked = areExternalCoinSourcesBlocked();
    const rewardCoins =
      !blocked && isValidCoinAmount(target.rewardCoins) ? target.rewardCoins : 0;

    if (rewardCoins > 0) {
      const updatedProfile: UserProfile = {
        ...profile,
        coins: profile.coins + rewardCoins,
      };
      setProfile(updatedProfile);
      saveProfile(updatedProfile);
    }

    const nextMails = mails.map((m) =>
      m.id === mailId ? { ...m, isRead: true, isClaimed: true } : m
    );
    setMails(nextMails);
    saveMails(nextMails);
  };

  const handleClaimQuest = (questId: string) => {
    const targetQuest = quests.find((q) => q.id === questId);
    if (!targetQuest || !targetQuest.completed || targetQuest.claimed) return;

    const blocked = areExternalCoinSourcesBlocked();
    const rewardCoins =
      !blocked && isValidCoinAmount(targetQuest.rewardCoins)
        ? targetQuest.rewardCoins
        : 0;

    if (rewardCoins > 0) {
      const updatedProfile: UserProfile = {
        ...profile,
        coins: profile.coins + rewardCoins,
      };
      setProfile(updatedProfile);
      saveProfile(updatedProfile);
    }

    const nextQuests = quests.map((q) =>
      q.id === questId ? { ...q, claimed: true } : q
    );
    setQuests(nextQuests);
    saveQuests(nextQuests);
  };

  const handleStartQuestAction = (quest: QuestItem) => {
    setIsQuestsOpen(false);
    if (quest.id === 'q_breath') {
      const breathTree = trees.find((t) => t.id === 'deep_breathing');
      if (breathTree) setActiveTreeExercise(breathTree);
    } else if (quest.id === 'q_speed') {
      const speedTree = trees.find((t) => t.id === 'speed_reading');
      if (speedTree) setActiveTreeExercise(speedTree);
    } else if (quest.id === 'q_gratitude') {
      const gratitudeTree = trees.find((t) => t.id === 'gratitude');
      if (gratitudeTree) setActiveTreeExercise(gratitudeTree);
    } else {
      handleTabSwitch('garden');
    }
  };

  const activeTopQuest = quests.find((q) => !q.claimed);
  const unclaimedQuestsCount = quests.filter((q) => q.completed && !q.claimed).length;
  const unclaimedMailsCount = mails.filter((m) => !m.isClaimed).length;
  const totalWateredDays = trees.reduce((sum, t) => sum + t.wateredDaysCount, 0);

  return (
    <div className="w-full min-h-screen bg-[#123826] text-slate-50 flex flex-col font-['Vazirmatn',sans-serif] relative overflow-hidden">
      {/* Branded Initial Entry Splash Screen with Official Game Logo */}
      {showEntrySplash && (
        <div
          onClick={() => {
            sound.startNatureAmbience();
            setShowEntrySplash(false);
          }}
          className="fixed inset-0 z-[12000] bg-gradient-to-b from-[#0b1f18] via-[#071511] to-[#030b08] flex flex-col items-center justify-center gap-4 select-none animate-fadeIn cursor-pointer"
        >
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full p-1 bg-gradient-to-b from-[#a3e635] via-[#34d399] to-[#0f5132] shadow-[0_0_45px_rgba(163,230,53,0.4)] flex items-center justify-center">
            <img
              src="/assets/aistudio/Neon-Lime_Winged_Book_Emblem_9f21e0f4.png"
              alt="لوگوی انجلرن | AngelLearn"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-amber-200 tracking-tight">
              انجلرن | AngelLearn
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-200">
              باغ مهارت‌های فردی و یادگیری تعاملی
            </p>
          </div>
        </div>
      )}

      {/* HUD Navigation (Hidden in Read-Only Visitor Garden View) */}
      {!visitorGarden && (
        <WarMasterHUD
          currentTab={currentTab}
          onTabChange={handleTabSwitch}
          profile={profile}
          totalWateredDays={totalWateredDays}
          activeQuest={activeTopQuest}
          unclaimedQuestsCount={unclaimedQuestsCount}
          unclaimedMailsCount={unclaimedMailsCount}
          groupNotificationCount={myInvites.length + pendingJoinRequests.length}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenShop={() => {
            setShopInitialTab('trees');
            setIsShopOpen(true);
          }}
          onOpenQuests={() => setIsQuestsOpen(true)}
          onOpenMailbox={() => setIsMailboxOpen(true)}
          onOpenChat={() => {
            setChatTargetUser(null);
            setChatInitialTab('world');
            setIsChatOpen(true);
          }}
          onOpenGroups={() => {
            setSelectedGroupId(profile.groupId || null);
            setIsGroupModalOpen(true);
          }}
          onOpenTutorial={() => setIsRegistrationOpen(true)}
        />
      )}

      {/* Full-Viewport Stage View */}
      <main className="w-full flex-1 flex flex-col items-center relative overflow-hidden">
        <Suspense
          fallback={
            <div className="w-full h-screen flex flex-col items-center justify-center gap-3 bg-[#0a1d17] text-slate-50">
              <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-b from-[#a3e635] to-[#0f5132] shadow-lg">
                <img
                  src="/assets/aistudio/Neon-Lime_Winged_Book_Emblem_9f21e0f4.png"
                  alt="AngelLearn"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="text-xs font-black text-amber-200">
                در حال آماده‌سازی صحنه...
              </span>
            </div>
          }
        >
          {!visitorGarden && currentTab === 'garden' && (
            <Garden2DView
              trees={trees}
              decorations={decorations}
              profile={profile}
              onSelectTree={handleSelectTreeForExercise}
              onUnlockTree={handleUnlockTree}
              onBuyDecoration={handleBuyDecoration}
              onOpenShop={() => {
                setShopInitialTab('trees');
                setIsShopOpen(true);
              }}
              onSaveDecorations={handleSaveDecorations}
              onSaveTrees={(updatedTrees) => {
                setTrees(updatedTrees);
                saveTrees(updatedTrees);
                saveProfileToCloudIfSignedIn(
                  profile,
                  updatedTrees.filter((t) => t.unlocked).length,
                  updatedTrees,
                  decorations
                ).catch((err) => console.error('Cloud tree move sync error:', err));
              }}
              onShareGarden={() => setIsProfileOpen(true)}
              onCollectSpringWater={handleHarvestSpring}
              onHarvestTreeCoins={handleHarvestTreeCoins}
            />
          )}

          {(currentTab === 'map' || currentTab === 'city') && (
            <WorldMapView
              profile={profile}
              trees={trees}
              initialFocus={
                currentTab === 'city'
                  ? initialCityWing === 'university'
                    ? 'university'
                    : 'school'
                  : 'overview'
              }
              onEnterGarden={handleEnterGardenTab}
              onEnterCity={(wing) => {
                if (wing) setInitialCityWing(wing);
                handleTabSwitch('city');
              }}
              onVisitGarden={handleVisitGarden}
              onHelpNeighbor={handleHelpNeighbor}
              onStartChatWithPlayer={(target) => {
                setChatTargetUser(target);
                setChatInitialTab('dm');
                setIsChatOpen(true);
              }}
              onOpenGroupModal={(groupId) => {
                setSelectedGroupId(groupId || profile.groupId || null);
                setIsGroupModalOpen(true);
              }}
              myLeaderGroup={myLeaderGroup}
              onInviteToGroup={handleInvitePlayerToGroup}
              focusedGroup={focusedGroup}
              relocateGroupTrigger={relocateGroupTrigger}
              onRelocateGroupCoords={async (grp, coords) => {
                const saved = await relocateWorldGroup(grp, coords.x, coords.y);
                setMyGroup((prev) =>
                  prev && prev.id === grp.id
                    ? { ...prev, worldX: saved.worldX, worldY: saved.worldY }
                    : prev
                );
                setFocusedGroup((prev) =>
                  prev && prev.id === grp.id
                    ? { ...prev, worldX: saved.worldX, worldY: saved.worldY }
                    : prev
                );
              }}
              onUpdateGardenCoords={(coords) => {
                setProfile((prev) => {
                  const updated: UserProfile = {
                    ...prev,
                    coords,
                  };
                  saveProfile(updated);
                  saveProfileToCloudIfSignedIn(
                    updated,
                    trees.filter((t) => t.unlocked).length
                  ).catch((err) => console.error('Cloud coords sync error:', err));
                  return updated;
                });
              }}
              onRewardCoins={(added) => {
                if (!isValidCoinAmount(added) || added <= 0) return;
                setProfile((prev) => {
                  const updated: UserProfile = {
                    ...prev,
                    coins: prev.coins + added,
                  };
                  saveProfile(updated);
                  return updated;
                });
              }}
            />
          )}
        </Suspense>
      </main>

      {/* Lazy-Loaded Mini-Games & Modals */}
      <Suspense fallback={null}>
      {activeTreeExercise?.id === 'speed_reading' && (
        <SpeedReadingGame
          dayNumber={
            activeTreeExercise.lastWateredDate
              ? Math.max(2, activeTreeExercise.wateredDaysCount)
              : 1
          }
          onComplete={handleExerciseComplete}
          onClose={() => setActiveTreeExercise(null)}
        />
      )}

      {activeTreeExercise?.id === 'gratitude' && (
        <GratitudeGame
          onComplete={handleExerciseComplete}
          onClose={() => setActiveTreeExercise(null)}
        />
      )}

      {activeTreeExercise?.id === 'deep_breathing' && (
        <DeepBreathingGame
          onComplete={handleExerciseComplete}
          onClose={() => setActiveTreeExercise(null)}
        />
      )}

      {activeTreeExercise?.id === 'bina_balls' && (
        <BinaBallsGame
          onComplete={handleExerciseComplete}
          onClose={() => setActiveTreeExercise(null)}
        />
      )}

      {activeTreeExercise?.id === 'memory_cards' && (
        <MemoryCardsGame
          onComplete={handleExerciseComplete}
          onClose={() => setActiveTreeExercise(null)}
        />
      )}

      {activeTreeExercise?.id === 'brain_math' && (
        <BrainMathGame
          onComplete={handleExerciseComplete}
          onClose={() => setActiveTreeExercise(null)}
        />
      )}

      {activeTreeExercise?.id === 'poetry' && (
        <PoetryGame
          onComplete={handleExerciseComplete}
          onClose={() => setActiveTreeExercise(null)}
        />
      )}

      {/* Modals */}
      {isShopOpen && (
        <ShopModal
          profile={profile}
          trees={trees}
          decorations={decorations}
          initialTab={shopInitialTab}
          onUnlockTree={handleUnlockTree}
          onBuyDecoration={handleBuyDecoration}
          onUpdateProfile={handleUpdateProfile}
          onGroupCreated={(createdGroup) => {
            setMyGroup(createdGroup);
            setFocusedGroup(createdGroup);
            setSelectedGroupId(createdGroup.id);
            setIsShopOpen(false);
            setCurrentTab('map');
            setIsGroupModalOpen(true);
          }}
          onOpenMyGroup={() => {
            setIsShopOpen(false);
            setSelectedGroupId(profile.groupId || null);
            setIsGroupModalOpen(true);
          }}
          onClose={() => setIsShopOpen(false)}
        />
      )}

      {isProfileOpen && (
        <ProfileModal
          profile={profile}
          trees={trees}
          onUpdateProfile={handleUpdateProfile}
          onResearchSessionChanged={handleResearchSessionChanged}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {isQuestsOpen && (
        <QuestsModal
          quests={quests}
          profile={profile}
          onClaimQuest={handleClaimQuest}
          onStartQuestAction={handleStartQuestAction}
          onClose={() => setIsQuestsOpen(false)}
        />
      )}

      {isMailboxOpen && (
        <MailboxModal
          mails={mails}
          onClaimMail={handleClaimMail}
          onClose={() => setIsMailboxOpen(false)}
        />
      )}

      {isChatOpen && (
        <ChatModal
          profile={profile}
          initialTab={chatTargetUser ? 'dm' : chatInitialTab}
          initialTargetUser={chatTargetUser}
          myGroup={myGroup}
          onInviteToGroup={myLeaderGroup ? handleInvitePlayerToGroup : undefined}
          onOpenGroupModal={() => {
            setSelectedGroupId(profile.groupId || null);
            setIsGroupModalOpen(true);
          }}
          onOpenShopGroups={() => {
            setShopInitialTab('groups');
            setIsShopOpen(true);
          }}
          onUpdateProfile={handleUpdateProfile}
          onVisitGarden={(garden) => setVisitorGarden(garden)}
          onClose={() => {
            setIsChatOpen(false);
            setChatTargetUser(null);
          }}
        />
      )}

      {isGroupModalOpen && (
        <GroupModal
          profile={profile}
          initialGroupId={selectedGroupId}
          onUpdateProfile={handleUpdateProfile}
          onOpenGroupChat={() => {
            setChatTargetUser(null);
            setChatInitialTab('group');
            setIsChatOpen(true);
          }}
          onOpenShopGroups={() => {
            setShopInitialTab('groups');
            setIsShopOpen(true);
          }}
          onLocateGroupOnMap={(grp) => {
            setFocusedGroup(grp);
            handleTabSwitch('map');
          }}
          onRelocateGroupOnMap={(grp) => {
            setFocusedGroup(grp);
            handleTabSwitch('map');
            setRelocateGroupTrigger((n) => n + 1);
          }}
          onClose={() => setIsGroupModalOpen(false)}
        />
      )}

      {visitorGarden && (
        <VisitorGardenModal
          garden={visitorGarden}
          canInviteToGroup={Boolean(
            myLeaderGroup &&
              visitorGarden.ownerUid &&
              visitorGarden.ownerUid !== myLeaderGroup.leaderUid
          )}
          inviteGroupName={myLeaderGroup?.name}
          onInviteOwnerToGroup={
            myLeaderGroup ? handleInvitePlayerToGroup : undefined
          }
          onClose={() => setVisitorGarden(null)}
        />
      )}

      {/* Interactive 3-Step Onboarding Tutorial with Google/Gmail Sign-In */}
      {isRegistrationOpen && !visitorGarden && (
        <RegistrationModal
          trees={trees}
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onStartFirstActivity={(firstTree) => {
            setIsRegistrationOpen(false);
            setCurrentTab('garden');
            handleSelectTreeForExercise(firstTree);
          }}
          onSkipTutorial={() => {
            setIsRegistrationOpen(false);
          }}
        />
      )}
      </Suspense>
    </div>
  );
}
