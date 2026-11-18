import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatTargetUser,
  DmMessage,
  DmThread,
  GroupChallengeGameId,
  GroupChatMessage,
  GroupGameChallenge,
  UserProfile,
  VisitorGarden,
  WorldChatMessage,
  WorldGroup,
} from '../types/game';
import {
  LiveCloudNeighborGarden,
  createGroupChallenge,
  deleteGroupChallenge,
  deleteGroupChatMessage,
  deleteWorldChatMessage,
  getCurrentVerifiedUid,
  sendDmMessage,
  sendGroupChatMessage,
  sendWorldChatMessage,
  signInWithGoogleAccount,
  submitGroupChallengeScore,
  subscribeToDmMessages,
  subscribeToGroupChallenges,
  subscribeToGroupChatMessages,
  subscribeToMyDmThreads,
  subscribeToPublicWorldGardens,
  subscribeToWorldChatMessages,
} from '../firebase';
import {
  MAX_CHAT_MESSAGE_LENGTH,
  canSendChatMessage,
  formatChatTimestamp,
  getPeerUidFromParticipants,
  makeDmThreadId,
} from '../game/chat';
import {
  GROUP_CHALLENGE_GAMES,
  getGroupChallengeGameMeta,
} from '../game/groupChallenges';
import { getGroupTierMeta } from '../game/groups';
import { sound } from '../utils/audio';
import { CharacterAvatar, getDefaultAvatarConfig } from './CharacterAvatar';
import { GroupChallengeCard } from './GroupChallengeCard';
import {
  ArrowRight,
  Check,
  ChevronUp,
  Eye,
  Gamepad2,
  Lock,
  MessageCircle,
  PlusCircle,
  Search,
  Send,
  Shield,
  Swords,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

const BrainMathGame = lazy(() =>
  import('./games/BrainMathGame').then((m) => ({ default: m.BrainMathGame }))
);
const BinaBallsGame = lazy(() =>
  import('./games/BinaBallsGame').then((m) => ({ default: m.BinaBallsGame }))
);
const MemoryCardsGame = lazy(() =>
  import('./games/MemoryCardsGame').then((m) => ({ default: m.MemoryCardsGame }))
);
const ColorTrapGame = lazy(() =>
  import('./games/ColorTrapGame').then((m) => ({ default: m.ColorTrapGame }))
);
const LogicMindGame = lazy(() =>
  import('./games/LogicMindGame').then((m) => ({ default: m.LogicMindGame }))
);
const SpatialMemoryGame = lazy(() =>
  import('./games/SpatialMemoryGame').then((m) => ({ default: m.SpatialMemoryGame }))
);
const CoordinationDuelGame = lazy(() =>
  import('./games/CoordinationDuelGame').then((m) => ({ default: m.CoordinationDuelGame }))
);

interface ChatModalProps {
  profile: UserProfile;
  initialTab?: 'world' | 'dm' | 'group';
  initialTargetUser?: ChatTargetUser | null;
  myGroup?: WorldGroup | null;
  onInviteToGroup?: (target: ChatTargetUser) => Promise<void> | void;
  onOpenGroupModal?: () => void;
  onOpenShopGroups?: () => void;
  onUpdateProfile: (updated: UserProfile) => void;
  onVisitGarden: (garden: VisitorGarden) => void;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  profile,
  initialTab = 'world',
  initialTargetUser = null,
  myGroup = null,
  onInviteToGroup,
  onOpenGroupModal,
  onOpenShopGroups,
  onUpdateProfile,
  onVisitGarden,
  onClose,
}) => {
  const verifiedUid = getCurrentVerifiedUid();
  const isAuthenticated = Boolean(verifiedUid && !profile.isGuest);
  const effectiveGroupId = myGroup?.id || profile.groupId;
  const isPureGroupLeader = Boolean(
    isAuthenticated &&
      myGroup &&
      verifiedUid &&
      myGroup.leaderUid === verifiedUid
  );
  const isGroupLeader = Boolean(isPureGroupLeader && onInviteToGroup);

  const [activeTab, setActiveTab] = useState<'world' | 'dm' | 'group'>(
    initialTargetUser ? 'dm' : initialTab
  );
  const [worldMessages, setWorldMessages] = useState<WorldChatMessage[]>([]);
  const [worldLoading, setWorldLoading] = useState<boolean>(true);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>([]);
  const [groupChallenges, setGroupChallenges] = useState<GroupGameChallenge[]>([]);
  const [groupLoading, setGroupLoading] = useState<boolean>(false);

  const [isChallengePickerOpen, setIsChallengePickerOpen] = useState<boolean>(false);
  const [selectedChallengeGameId, setSelectedChallengeGameId] =
    useState<GroupChallengeGameId>('brain_math');
  const [challengeTitleDraft, setChallengeTitleDraft] = useState<string>('');
  const [isPostingChallenge, setIsPostingChallenge] = useState<boolean>(false);
  const [activePlayChallenge, setActivePlayChallenge] = useState<{
    challenge: GroupGameChallenge;
    personalBestScore: number | null;
  } | null>(null);

  const [cloudNeighbors, setCloudNeighbors] = useState<LiveCloudNeighborGarden[]>([]);
  const [dmThreads, setDmThreads] = useState<DmThread[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<ChatTargetUser | null>(
    initialTargetUser
  );
  const [dmMessages, setDmMessages] = useState<DmMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [draftText, setDraftText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);
  const [invitedUids, setInvitedUids] = useState<Record<string, boolean>>({});

  const worldEndRef = useRef<HTMLDivElement | null>(null);
  const dmEndRef = useRef<HTMLDivElement | null>(null);
  const groupEndRef = useRef<HTMLDivElement | null>(null);

  // Sync target user prop if parent opens directly onto a player DM
  useEffect(() => {
    if (initialTargetUser) {
      setActiveTab('dm');
      setSelectedPeer(initialTargetUser);
    }
  }, [initialTargetUser]);

  // Real-time public world chat listener
  useEffect(() => {
    setWorldLoading(true);
    const unsub = subscribeToWorldChatMessages(
      (msgs) => {
        setWorldMessages(msgs);
        setWorldLoading(false);
      },
      (errMsg) => {
        setWorldLoading(false);
        setErrorBanner(errMsg || 'خطا در دریافت پیام‌های چت عمومی');
      }
    );
    return () => unsub();
  }, []);

  // Real-time directory of registered players (from /worldGardens)
  useEffect(() => {
    const unsub = subscribeToPublicWorldGardens(
      verifiedUid ?? profile.id,
      (neighbors) => {
        setCloudNeighbors(neighbors);
      }
    );
    return () => unsub();
  }, [verifiedUid, profile.id]);

  // Real-time DM threads listener for signed-in verified users
  useEffect(() => {
    if (!verifiedUid) {
      setDmThreads([]);
      return;
    }
    const unsub = subscribeToMyDmThreads(verifiedUid, setDmThreads, (errMsg) => {
      setErrorBanner(errMsg || 'خطا در دریافت لیست گفت‌وگوهای خصوصی');
    });
    return () => unsub();
  }, [verifiedUid]);

  const activeThreadId = useMemo(() => {
    if (!verifiedUid || !selectedPeer || selectedPeer.uid === verifiedUid) {
      return undefined;
    }
    try {
      return makeDmThreadId(verifiedUid, selectedPeer.uid);
    } catch {
      return undefined;
    }
  }, [verifiedUid, selectedPeer]);

  // Real-time DM messages listener for selected conversation
  useEffect(() => {
    if (!activeThreadId || !verifiedUid) {
      setDmMessages([]);
      return;
    }
    const unsub = subscribeToDmMessages(
      activeThreadId,
      verifiedUid,
      setDmMessages,
      (errMsg) => {
        setErrorBanner(errMsg || 'خطا در دریافت پیام‌های خصوصی');
      }
    );
    return () => unsub();
  }, [activeThreadId, verifiedUid]);

  // Real-time Group Chat messages & posted challenges listeners when user belongs to a group
  useEffect(() => {
    if (!effectiveGroupId || !isAuthenticated) {
      setGroupMessages([]);
      setGroupChallenges([]);
      setGroupLoading(false);
      return;
    }
    setGroupLoading(true);
    const unsubMessages = subscribeToGroupChatMessages(
      effectiveGroupId,
      (msgs) => {
        setGroupMessages(msgs);
        setGroupLoading(false);
      },
      (errMsg) => {
        setGroupLoading(false);
        setErrorBanner(errMsg || 'خطا در دریافت پیام‌های چت گروه');
      }
    );
    const unsubChallenges = subscribeToGroupChallenges(
      effectiveGroupId,
      (challenges) => {
        setGroupChallenges(challenges);
      },
      (errMsg) => {
        setErrorBanner(errMsg || 'خطا در دریافت رقابت‌های بازی گروه');
      }
    );
    return () => {
      unsubMessages();
      unsubChallenges();
    };
  }, [effectiveGroupId, isAuthenticated]);

  const groupFeed = useMemo(() => {
    const items: Array<
      | { kind: 'msg'; id: string; createdAtMs: number; msg: GroupChatMessage }
      | {
          kind: 'challenge';
          id: string;
          createdAtMs: number;
          challenge: GroupGameChallenge;
        }
    > = [
      ...groupMessages.map((msg) => ({
        kind: 'msg' as const,
        id: `msg_${msg.id}`,
        createdAtMs: msg.createdAtMs,
        msg,
      })),
      ...groupChallenges.map((challenge) => ({
        kind: 'challenge' as const,
        id: `chg_${challenge.id}`,
        createdAtMs: challenge.createdAtMs,
        challenge,
      })),
    ];
    items.sort((a, b) => a.createdAtMs - b.createdAtMs);
    return items;
  }, [groupMessages, groupChallenges]);

  // Auto-scroll newest messages into view
  useEffect(() => {
    if (activeTab === 'world') {
      worldEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [worldMessages.length, activeTab]);

  useEffect(() => {
    if (activeTab === 'dm' && selectedPeer) {
      dmEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dmMessages.length, activeTab, selectedPeer]);

  useEffect(() => {
    if (activeTab === 'group') {
      groupEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [groupFeed.length, activeTab]);

  // Lookup helpers for player metadata & gardens
  const neighborByUid = useMemo(() => {
    const map = new Map<string, LiveCloudNeighborGarden>();
    cloudNeighbors.forEach((cn) => map.set(cn.uid, cn));
    return map;
  }, [cloudNeighbors]);

  const worldProfileByUid = useMemo(() => {
    const map = new Map<string, ChatTargetUser>();
    worldMessages.forEach((m) => {
      map.set(m.senderUid, {
        uid: m.senderUid,
        name: m.senderName,
        gender: m.senderGender,
        avatarConfig: m.senderAvatar,
      });
    });
    return map;
  }, [worldMessages]);

  const dmContacts = useMemo(() => {
    const entries: {
      user: ChatTargetUser;
      lastMessage?: string;
      lastMessageAtMs: number;
      hasThread: boolean;
    }[] = [];
    const seen = new Set<string>();

    dmThreads.forEach((t) => {
      if (!verifiedUid) return;
      const peerUid = getPeerUidFromParticipants(t.participants, verifiedUid);
      if (!peerUid || seen.has(peerUid)) return;
      seen.add(peerUid);

      const neighbor = neighborByUid.get(peerUid);
      const fromWorld = worldProfileByUid.get(peerUid);
      entries.push({
        user: {
          uid: peerUid,
          name: neighbor?.visitorGarden.ownerName || fromWorld?.name || 'همسفر نور',
          gender: neighbor?.visitorGarden.gender || fromWorld?.gender || 'girl',
          avatarConfig: neighbor?.avatarConfig || fromWorld?.avatarConfig,
        },
        lastMessage: t.lastMessageText,
        lastMessageAtMs: t.lastMessageAtMs,
        hasThread: true,
      });
    });

    cloudNeighbors.forEach((cn) => {
      if (seen.has(cn.uid)) return;
      seen.add(cn.uid);
      entries.push({
        user: {
          uid: cn.uid,
          name: cn.visitorGarden.ownerName,
          gender: cn.visitorGarden.gender,
          avatarConfig: cn.avatarConfig,
        },
        lastMessageAtMs: 0,
        hasThread: false,
      });
    });

    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.user.name.toLowerCase().includes(q));
  }, [dmThreads, verifiedUid, neighborByUid, worldProfileByUid, cloudNeighbors, searchQuery]);

  const handleGoogleSignIn = async () => {
    setErrorBanner(null);
    setIsSigningIn(true);
    try {
      const synced = await signInWithGoogleAccount(profile);
      onUpdateProfile(synced);
      sound.playCoin();
    } catch (err) {
      console.error('Google Sign-In inside chat failed:', err);
      setErrorBanner('ورود با حساب گوگل انجام نشد. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleOpenDmWithUser = (target: ChatTargetUser) => {
    if (verifiedUid && target.uid === verifiedUid) return;
    sound.playClick();
    setErrorBanner(null);
    setSelectedPeer(target);
    setActiveTab('dm');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending || !canSendChatMessage(draftText)) return;
    setErrorBanner(null);
    setNoticeBanner(null);
    setIsSending(true);
    const textToSend = draftText;
    setDraftText('');

    try {
      sound.playClick();
      if (activeTab === 'world') {
        await sendWorldChatMessage(profile, textToSend);
      } else if (activeTab === 'group' && effectiveGroupId) {
        await sendGroupChatMessage(profile, effectiveGroupId, textToSend);
      } else if (selectedPeer) {
        await sendDmMessage(profile, selectedPeer.uid, textToSend);
      }
    } catch (err) {
      setDraftText(textToSend);
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'AUTH_REQUIRED') {
        setErrorBanner('برای ارسال پیام ابتدا باید با حساب جیمیل وارد شوید.');
      } else {
        setErrorBanner('ارسال پیام با خطا مواجه شد. اتصال خود را بررسی کنید.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteWorldMessage = async (messageId: string) => {
    sound.playClick();
    try {
      await deleteWorldChatMessage(messageId);
    } catch {
      setErrorBanner('حذف پیام امکان‌پذیر نشد.');
    }
  };

  const handleDeleteGroupMessage = async (messageId: string) => {
    if (!effectiveGroupId) return;
    sound.playClick();
    try {
      await deleteGroupChatMessage(effectiveGroupId, messageId);
    } catch {
      setErrorBanner('حذف پیام گروه امکان‌پذیر نشد.');
    }
  };

  const handlePostGroupChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveGroupId || isPostingChallenge) return;
    setErrorBanner(null);
    setNoticeBanner(null);
    setIsPostingChallenge(true);
    try {
      sound.playClick();
      await createGroupChallenge(
        profile,
        effectiveGroupId,
        selectedChallengeGameId,
        challengeTitleDraft
      );
      sound.playCoin();
      const meta = getGroupChallengeGameMeta(selectedChallengeGameId);
      setNoticeBanner(
        `رقابت «${meta.treeTitle}» در چت گروه قرار داده شد! اعضا می‌توانند بازی کنند و رکورد بزنند.`
      );
      setChallengeTitleDraft('');
      setIsChallengePickerOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'AUTH_REQUIRED') {
        setErrorBanner('برای ارسال رقابت ابتدا با حساب جیمیل وارد شوید.');
      } else {
        setErrorBanner('ثبت رقابت در گروه انجام نشد. لطفاً دوباره تلاش کنید.');
      }
    } finally {
      setIsPostingChallenge(false);
    }
  };

  const handleDeleteGroupChallenge = async (challengeId: string) => {
    if (!effectiveGroupId) return;
    sound.playClick();
    try {
      await deleteGroupChallenge(effectiveGroupId, challengeId);
    } catch {
      setErrorBanner('حذف رقابت امکان‌پذیر نشد.');
    }
  };

  const handleInviteTarget = async (target: ChatTargetUser) => {
    if (!isGroupLeader || !onInviteToGroup || invitedUids[target.uid]) return;
    setErrorBanner(null);
    setNoticeBanner(null);
    try {
      sound.playClick();
      await onInviteToGroup(target);
      sound.playCoin();
      setInvitedUids((prev) => ({ ...prev, [target.uid]: true }));
      setNoticeBanner(
        `دعوت‌نامه ورود به گروه «${myGroup?.name}» برای ${target.name} ارسال شد.`
      );
    } catch {
      setErrorBanner('ارسال دعوت‌نامه گروه انجام نشد.');
    }
  };

  const selectedPeerGarden = selectedPeer
    ? neighborByUid.get(selectedPeer.uid)?.visitorGarden
    : undefined;

  return (
    <div
      dir="rtl"
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-black/88 animate-fadeIn"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl h-[86dvh] max-h-[680px] bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/90 rounded-[28px] shadow-[0_18px_50px_rgba(0,0,0,0.9),0_4px_0_#451a03] text-slate-50 flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3 bg-gradient-to-b from-[#132e24] via-[#0d211a] to-[#081712] border-b border-amber-400/35 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-b from-[#fde68a] to-[#fbbf24] border border-amber-200 flex items-center justify-center text-slate-950 shadow shrink-0">
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-amber-200 truncate">
                چت و گفت‌وگوی کاربران
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-200 truncate">
                گفت‌وگوی عمومی جهان · پیام خصوصی · چت داخل گروه
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            aria-label="بستن پنجره چت"
            className="w-9 h-9 rounded-full bg-[#143026] hover:bg-[#1a3f32] border border-emerald-300/30 text-slate-100 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#071611] border border-emerald-300/25">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setErrorBanner(null);
                setActiveTab('world');
              }}
              className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] sm:text-sm font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                activeTab === 'world'
                  ? 'bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-950 shadow'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>گفت‌وگوی عمومی</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setErrorBanner(null);
                setActiveTab('dm');
              }}
              className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] sm:text-sm font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                activeTab === 'dm'
                  ? 'bg-gradient-to-r from-[#fde68a] to-[#fbbf24] text-slate-950 shadow'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span>پیام خصوصی</span>
              {dmThreads.length > 0 && (
                <span className={`tabular-nums text-[11px] ${activeTab === 'dm' ? 'text-slate-900' : 'text-slate-300'}`}>
                  ({dmThreads.length})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setErrorBanner(null);
                setActiveTab('group');
              }}
              className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] sm:text-sm font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                activeTab === 'group'
                  ? 'bg-gradient-to-r from-lime-300 to-emerald-300 text-slate-950 shadow'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>چت گروه</span>
              {myGroup && (
                <span className={`hidden sm:inline text-[10px] truncate max-w-[80px] ${activeTab === 'group' ? 'text-slate-900' : 'text-slate-300'}`}>
                  · {myGroup.name}
                </span>
              )}
            </button>
          </div>
        </div>

        {noticeBanner && (
          <div className="mx-4 sm:mx-6 mb-2 px-3 py-2 rounded-xl bg-emerald-950/90 border border-lime-400/60 text-lime-200 text-xs flex items-center justify-between gap-2 shrink-0">
            <span>{noticeBanner}</span>
            <button
              type="button"
              onClick={() => setNoticeBanner(null)}
              className="text-lime-300 hover:text-white cursor-pointer"
              aria-label="بستن اعلان"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorBanner && (
          <div className="mx-4 sm:mx-6 mb-2 px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center justify-between gap-2 shrink-0">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-300 hover:text-white cursor-pointer"
              aria-label="بستن خطا"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ===============================================================
            TAB 1: PUBLIC WORLD CHAT
           =============================================================== */}
        {activeTab === 'world' && (
          <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 pb-4">
            <div className="flex-1 overflow-y-auto space-y-2.5 py-2 pr-1">
              {worldLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-200">
                  در حال اتصال به تالار گفت‌وگوی انجلرن...
                </div>
              ) : worldMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10 space-y-2 text-slate-200">
                  <MessageCircle className="w-10 h-10 text-emerald-300" />
                  <p className="text-sm font-bold text-white">
                    هنوز پیامی در گفت‌وگوی عمومی ثبت نشده است
                  </p>
                  <p className="text-xs text-slate-300">
                    اولین پیام را بنویسید و با بقیه باغبانان گفتگو کنید.
                  </p>
                </div>
              ) : (
                worldMessages.map((msg) => {
                  const isMine = Boolean(verifiedUid && msg.senderUid === verifiedUid);
                  const peerGarden = neighborByUid.get(msg.senderUid)?.visitorGarden;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${
                        isMine ? 'flex-row' : 'flex-row-reverse justify-end'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!isMine) {
                            handleOpenDmWithUser({
                              uid: msg.senderUid,
                              name: msg.senderName,
                              gender: msg.senderGender,
                              avatarConfig: msg.senderAvatar,
                            });
                          }
                        }}
                        disabled={isMine}
                        title={
                          isMine ? msg.senderName : `ارسال پیام خصوصی به ${msg.senderName}`
                        }
                        className={`w-9 h-9 rounded-2xl bg-[#0b4a32] border border-emerald-500/50 flex items-center justify-center overflow-hidden shrink-0 ${
                          isMine
                            ? 'cursor-default'
                            : 'cursor-pointer hover:border-amber-400 transition-colors'
                        }`}
                      >
                        <CharacterAvatar
                          gender={msg.senderGender}
                          config={msg.senderAvatar}
                          variant="full"
                          showBackdrop={false}
                          size={34}
                        />
                      </button>

                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 border ${
                          isMine
                            ? 'bg-[#143a2c] border-amber-300/60 text-white'
                            : 'bg-[#0d211a] border-emerald-300/25 text-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[11px] mb-1">
                          <span className="font-black text-amber-200 truncate">
                            {isMine ? 'شما' : msg.senderName}
                          </span>
                          <span className="text-slate-300 tabular-nums shrink-0">
                            {formatChatTimestamp(msg.createdAtMs)}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>

                        <div className="flex items-center justify-end gap-2 mt-1.5">
                          {isMine ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteWorldMessage(msg.id)}
                              className="text-[10px] text-rose-200 hover:text-white flex items-center gap-1 cursor-pointer"
                              title="حذف پیام"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenDmWithUser({
                                    uid: msg.senderUid,
                                    name: msg.senderName,
                                    gender: msg.senderGender,
                                    avatarConfig: msg.senderAvatar,
                                  })
                                }
                                className="text-[10px] font-bold text-amber-200 hover:text-amber-100 flex items-center gap-1 cursor-pointer"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>پیام خصوصی</span>
                              </button>
                              {peerGarden && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    sound.playClick();
                                    onClose();
                                    onVisitGarden(peerGarden);
                                  }}
                                  className="text-[10px] font-bold text-emerald-300 hover:text-emerald-100 flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>بازدید از باغ</span>
                                </button>
                              )}
                              {isGroupLeader && (
                                <button
                                  type="button"
                                  disabled={Boolean(invitedUids[msg.senderUid])}
                                  onClick={() =>
                                    handleInviteTarget({
                                      uid: msg.senderUid,
                                      name: msg.senderName,
                                      gender: msg.senderGender,
                                      avatarConfig: msg.senderAvatar,
                                    })
                                  }
                                  className={`text-[10px] font-bold flex items-center gap-1 ${
                                    invitedUids[msg.senderUid]
                                      ? 'text-lime-300 cursor-default'
                                      : 'text-sky-300 hover:text-sky-100 cursor-pointer'
                                  }`}
                                >
                                  {invitedUids[msg.senderUid] ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <UserPlus className="w-3 h-3" />
                                  )}
                                  <span>
                                    {invitedUids[msg.senderUid]
                                      ? 'دعوت شد'
                                      : 'دعوت به گروه'}
                                  </span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={worldEndRef} />
            </div>

            {/* Composer or Google Sign-In prompt */}
            {isAuthenticated ? (
              <form
                onSubmit={handleSend}
                className="pt-2.5 border-t border-emerald-300/20 flex items-center gap-2 shrink-0"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={draftText}
                    onChange={(e) =>
                      setDraftText(e.target.value.slice(0, MAX_CHAT_MESSAGE_LENGTH))
                    }
                    maxLength={MAX_CHAT_MESSAGE_LENGTH}
                    placeholder="پیام خود را در گفت‌وگوی عمومی بنویسید..."
                    className="w-full bg-[#071611] border border-emerald-300/30 focus:border-amber-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none"
                  />
                  {draftText.length > 400 && (
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-200 tabular-nums">
                      {draftText.length}/{MAX_CHAT_MESSAGE_LENGTH}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSending || !canSendChatMessage(draftText)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] disabled:bg-none disabled:bg-slate-800/90 disabled:text-slate-300 disabled:border disabled:border-slate-600/80 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>ارسال</span>
                </button>
              </form>
            ) : (
              <div className="mt-2 p-3 rounded-2xl bg-[#143026] border border-amber-400/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
                <p className="text-xs text-amber-100 font-bold text-center sm:text-right">
                  برای ارسال پیام در چت عمومی با حساب جیمیل وارد شوید
                </p>
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={handleGoogleSignIn}
                  className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs whitespace-nowrap cursor-pointer shrink-0"
                >
                  {isSigningIn ? 'در حال اتصال...' : 'ورود با گوگل'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===============================================================
            TAB 2: PRIVATE 1-ON-1 DIRECT MESSAGES
           =============================================================== */}
        {activeTab === 'dm' && (
          <div className="flex-1 min-h-0 px-4 sm:px-6 pb-4 flex flex-col">
            {!isAuthenticated ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-300">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  پیام‌های خصوصی مخصوص کاربران واردشده است
                </h3>
                <p className="text-xs text-slate-200 max-w-md leading-relaxed">
                  برای شروع گفت‌وگوی خصوصی با سایر بازیکنان و همسایه‌ها، با حساب گوگل وارد شوید تا پیام‌های شما بین خودتان محرمانه و همگام ذخیره شوند.
                </p>
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={handleGoogleSignIn}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs sm:text-sm cursor-pointer shadow"
                >
                  {isSigningIn ? 'در حال ورود...' : 'ورود با حساب گوگل'}
                </button>
              </div>
            ) : (
              <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Contacts / Threads Directory */}
                <div
                  className={`sm:col-span-5 flex flex-col min-h-0 bg-[#0d211a] border border-emerald-300/25 rounded-2xl p-2.5 ${
                    selectedPeer ? 'hidden sm:flex' : 'flex'
                  }`}
                >
                  <div className="relative mb-2 shrink-0">
                    <Search className="w-3.5 h-3.5 text-slate-300 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="جستجوی کاربر..."
                      className="w-full bg-[#071611] border border-emerald-300/30 focus:border-amber-300 rounded-xl pr-8 pl-2.5 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                    {dmContacts.length === 0 ? (
                      <p className="text-xs text-slate-300 text-center py-6 leading-relaxed px-2">
                        هنوز کاربر ثبت‌نام‌شده دیگری پیدا نشد. به محض ورود بازیکنان با جیمیل، می‌توانید با آن‌ها گفت‌وگو کنید.
                      </p>
                    ) : (
                      dmContacts.map((entry) => {
                        const isSelected = selectedPeer?.uid === entry.user.uid;
                        const defaults = getDefaultAvatarConfig(entry.user.gender);
                        return (
                          <button
                            key={entry.user.uid}
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              setErrorBanner(null);
                              setSelectedPeer(entry.user);
                            }}
                            className={`w-full p-2 rounded-xl border text-right flex items-center gap-2.5 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#184031] border-amber-400 text-white'
                                : 'bg-[#143026] hover:bg-[#193d30] border-emerald-300/20 text-slate-100'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-xl bg-[#0b4a32] border border-emerald-500/40 overflow-hidden flex items-center justify-center shrink-0">
                              <CharacterAvatar
                                gender={entry.user.gender}
                                config={entry.user.avatarConfig || defaults}
                                variant="full"
                                showBackdrop={false}
                                size={32}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black truncate text-white">
                                  {entry.user.name}
                                </span>
                                {entry.hasThread && (
                                  <span className="text-[10px] text-slate-300 tabular-nums shrink-0">
                                    {formatChatTimestamp(entry.lastMessageAtMs)}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                                {entry.lastMessage || 'شروع گفت‌وگوی خصوصی'}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Active Conversation View */}
                <div
                  className={`sm:col-span-7 flex flex-col min-h-0 bg-[#0d211a] border border-emerald-300/25 rounded-2xl p-2.5 ${
                    selectedPeer ? 'flex' : 'hidden sm:flex'
                  }`}
                >
                  {!selectedPeer ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 space-y-2 text-slate-200">
                      <MessageCircle className="w-10 h-10 text-amber-300" />
                      <p className="text-sm font-black text-white">
                        یک کاربر را برای گفت‌وگو انتخاب کنید
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        از فهرست کنار، یکی از بازیکنان را انتخاب کنید یا در گفت‌وگوی عمومی روی پیامشان بزنید.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Thread Header */}
                      <div className="pb-2 mb-2 border-b border-emerald-800/70 flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedPeer(null)}
                            className="sm:hidden p-1.5 rounded-lg bg-emerald-900/80 text-emerald-200 cursor-pointer"
                            aria-label="بازگشت به فهرست"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <div className="w-8 h-8 rounded-xl bg-[#0b4a32] border border-emerald-500/40 overflow-hidden flex items-center justify-center shrink-0">
                            <CharacterAvatar
                              gender={selectedPeer.gender}
                              config={
                                selectedPeer.avatarConfig ||
                                getDefaultAvatarConfig(selectedPeer.gender)
                              }
                              variant="full"
                              showBackdrop={false}
                              size={30}
                            />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-white truncate">
                            {selectedPeer.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isGroupLeader && (
                            <button
                              type="button"
                              disabled={Boolean(invitedUids[selectedPeer.uid])}
                              onClick={() => handleInviteTarget(selectedPeer)}
                              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                                invitedUids[selectedPeer.uid]
                                  ? 'bg-emerald-950 border-lime-400/60 text-lime-300 cursor-default'
                                  : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/60 text-amber-200 cursor-pointer'
                              }`}
                            >
                              {invitedUids[selectedPeer.uid] ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <UserPlus className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {invitedUids[selectedPeer.uid]
                                  ? 'دعوت شد'
                                  : 'دعوت به گروه'}
                              </span>
                            </button>
                          )}

                          {selectedPeerGarden && (
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                onClose();
                                onVisitGarden(selectedPeerGarden);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>بازدید از باغ</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Messages List */}
                      <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-0.5">
                        {dmMessages.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-slate-300 text-center px-4">
                            اولین پیام خصوصی خود را برای {selectedPeer.name} بنویسید.
                          </div>
                        ) : (
                          dmMessages.map((msg) => {
                            const isMine = msg.senderUid === verifiedUid;
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${
                                  isMine ? 'justify-start' : 'justify-end'
                                }`}
                              >
                                <div
                                  className={`max-w-[82%] rounded-2xl px-3 py-2 border ${
                                    isMine
                                      ? 'bg-[#143a2c] border-amber-300/60 text-white'
                                      : 'bg-[#071611] border-emerald-300/25 text-slate-100'
                                  }`}
                                >
                                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                                    {msg.text}
                                  </p>
                                  <div className="text-[10px] text-slate-300 tabular-nums mt-1 text-left">
                                    {formatChatTimestamp(msg.createdAtMs)}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={dmEndRef} />
                      </div>

                      {/* DM Composer */}
                      <form
                        onSubmit={handleSend}
                        className="pt-2 mt-1 border-t border-emerald-300/20 flex items-center gap-2 shrink-0"
                      >
                        <input
                          type="text"
                          value={draftText}
                          onChange={(e) =>
                            setDraftText(
                              e.target.value.slice(0, MAX_CHAT_MESSAGE_LENGTH)
                            )
                          }
                          maxLength={MAX_CHAT_MESSAGE_LENGTH}
                          placeholder={`پیام به ${selectedPeer.name}...`}
                          className="flex-1 bg-[#071611] border border-emerald-300/30 focus:border-amber-300 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isSending || !canSendChatMessage(draftText)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] disabled:bg-none disabled:bg-slate-800/90 disabled:text-slate-300 disabled:border disabled:border-slate-600/80 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>ارسال</span>
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===============================================================
            TAB 3: DEDICATED GROUP CHAT (MEMBERS ONLY)
           =============================================================== */}
        {activeTab === 'group' && (
          <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 pb-4">
            {!isAuthenticated ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-300">
                  <Shield className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  چت داخل گروه برای کاربران واردشده فعال است
                </h3>
                <p className="text-xs text-slate-200 max-w-md leading-relaxed">
                  برای ساخت گروه یا گفت‌وگو با اعضای گروه خود، ابتدا با حساب گوگل وارد شوید.
                </p>
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={handleGoogleSignIn}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs sm:text-sm cursor-pointer shadow"
                >
                  {isSigningIn ? 'در حال ورود...' : 'ورود با حساب گوگل'}
                </button>
              </div>
            ) : !effectiveGroupId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3.5">
                <div className="w-16 h-16 rounded-2xl bg-[#143026] border-2 border-amber-400/60 flex items-center justify-center text-amber-300">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-sm sm:text-base font-black text-amber-200">
                    هنوز عضو هیچ گروهی نیستید
                  </h3>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    می‌توانید از فروشگاه یک گروه جدید با چادر همسفران بسازید یا به یکی از گروه‌های فعال جهان درخواست عضویت بدهید تا تالار چت گروه برایتان باز شود.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {onOpenGroupModal && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        onClose();
                        onOpenGroupModal();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Users className="w-4 h-4" />
                      <span>مشاهده گروه‌های جهان</span>
                    </button>
                  )}
                  {onOpenShopGroups && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        onClose();
                        onOpenShopGroups();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>ساخت گروه در فروشگاه</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Group Header Strip */}
                <div className="mb-2 p-2.5 rounded-2xl bg-[#143026] border border-amber-400/50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield className="w-4 h-4 text-amber-300 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-amber-200 truncate">
                        {myGroup?.name || profile.groupName || 'گروه شما'}
                      </div>
                      {myGroup && (
                        <div className="text-[10px] text-slate-300 truncate">
                          {getGroupTierMeta(myGroup.buildingLevel).title} · سطح{' '}
                          {myGroup.buildingLevel} · {myGroup.memberCount} عضو
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setIsChallengePickerOpen((prev) => !prev);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all ${
                        isChallengePickerOpen
                          ? 'bg-gradient-to-r from-[#fef08a] to-[#f59e0b] text-slate-950 border-white'
                          : 'bg-lime-400/20 hover:bg-lime-400/30 border-lime-400/70 text-lime-200'
                      }`}
                    >
                      <Gamepad2 className="w-3.5 h-3.5" />
                      <span>رقابت بازی‌های درختی</span>
                      {isChallengePickerOpen && <ChevronUp className="w-3 h-3" />}
                    </button>

                    {onOpenGroupModal && (
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          onClose();
                          onOpenGroupModal();
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 text-[11px] font-black cursor-pointer shrink-0"
                      >
                        ساختمان و اعضا
                      </button>
                    )}
                  </div>
                </div>

                {/* Group Tree-Game Competition Picker Drawer */}
                {isChallengePickerOpen && (
                  <form
                    onSubmit={handlePostGroupChallenge}
                    className="mb-2.5 p-3 rounded-2xl bg-[#042317] border-2 border-lime-400/70 space-y-2.5 shrink-0 animate-fadeIn"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-lime-200 flex items-center gap-1.5">
                        <Swords className="w-4 h-4 text-amber-300" />
                        <span>انتخاب بازی چالشی برای رقابت گروهی</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsChallengePickerOpen(false)}
                        className="text-emerald-300 hover:text-white cursor-pointer"
                        aria-label="بستن انتخابگر رقابت"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {GROUP_CHALLENGE_GAMES.map((g) => {
                        const isSelected = selectedChallengeGameId === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              setSelectedChallengeGameId(g.id);
                            }}
                            className={`p-2.5 rounded-xl border-2 text-right transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#1a4334] border-amber-300 shadow'
                                : 'bg-[#0d211a] hover:bg-[#143026] border-emerald-300/25'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-base">{g.emoji}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#071611] text-lime-200 border border-emerald-300/30">
                                {g.badgeText}
                              </span>
                            </div>
                            <div className="text-xs font-black text-white mt-1">
                              {g.treeTitle}
                            </div>
                            <div className="text-[10px] text-slate-300 mt-0.5 line-clamp-2">
                              {g.challengeTitle}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={challengeTitleDraft}
                        onChange={(e) => setChallengeTitleDraft(e.target.value.slice(0, 60))}
                        maxLength={60}
                        placeholder={`عنوان دلخواه چالش (مثلاً: ${
                          getGroupChallengeGameMeta(selectedChallengeGameId).defaultPostTitle
                        })`}
                        className="flex-1 bg-[#071611] border border-emerald-300/30 focus:border-amber-300 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isPostingChallenge}
                        className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#d9f99d] via-[#bef264] to-[#84cc16] disabled:bg-none disabled:bg-slate-800/90 disabled:text-slate-300 disabled:border disabled:border-slate-600/80 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer shrink-0"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>
                          {isPostingChallenge ? 'در حال ثبت...' : 'ارسال رقابت در گروه'}
                        </span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Group Messages & Posted Game Challenges Feed */}
                <div className="flex-1 overflow-y-auto space-y-3 py-1.5 pr-1">
                  {groupLoading ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-200">
                      در حال بارگذاری چت گروه...
                    </div>
                  ) : groupFeed.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6 py-8 space-y-2 text-slate-200">
                      <MessageCircle className="w-9 h-9 text-lime-300" />
                      <p className="text-sm font-bold text-white">
                        تالار گفت‌وگو و رقابت گروه آماده است!
                      </p>
                      <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                        با اعضای گروه گفت‌وگو کنید یا از دکمه «رقابت بازی‌های درختی» یکی از بازی‌های بینا، مغز، حافظه، تله رنگ‌ها، ذهن منطقی، حافظه فضایی یا دوئل هماهنگی را برای ثبت بالاترین رکورد گروه بگذارید!
                      </p>
                    </div>
                  ) : (
                    groupFeed.map((entry) => {
                      if (entry.kind === 'challenge') {
                        return (
                          <GroupChallengeCard
                            key={entry.id}
                            challenge={entry.challenge}
                            currentUid={verifiedUid}
                            isGroupLeader={isPureGroupLeader}
                            onDeleteChallenge={handleDeleteGroupChallenge}
                            onPlayChallenge={(chg, personalBestScore) => {
                              setErrorBanner(null);
                              setNoticeBanner(null);
                              setActivePlayChallenge({
                                challenge: chg,
                                personalBestScore,
                              });
                            }}
                          />
                        );
                      }

                      const msg = entry.msg;
                      const isMine = Boolean(verifiedUid && msg.senderUid === verifiedUid);
                      return (
                        <div
                          key={entry.id}
                          className={`flex items-end gap-2 ${
                            isMine ? 'flex-row' : 'flex-row-reverse justify-end'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-2xl bg-[#0b4a32] border border-emerald-500/50 flex items-center justify-center overflow-hidden shrink-0">
                            <CharacterAvatar
                              gender={msg.senderGender}
                              config={msg.senderAvatar}
                              variant="full"
                              showBackdrop={false}
                              size={34}
                            />
                          </div>

                          <div
                            className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 border ${
                              isMine
                                ? 'bg-[#143a2c] border-amber-300/60 text-white'
                                : 'bg-[#0d211a] border-emerald-300/25 text-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[11px] mb-1">
                              <span className="font-black text-amber-200 truncate">
                                {isMine ? 'شما' : msg.senderName}
                              </span>
                              <span className="text-slate-300 tabular-nums shrink-0">
                                {formatChatTimestamp(msg.createdAtMs)}
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {msg.text}
                            </p>

                            {isMine && (
                              <div className="flex justify-end mt-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGroupMessage(msg.id)}
                                  className="text-[10px] text-rose-200 hover:text-white flex items-center gap-1 cursor-pointer"
                                  title="حذف پیام"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>حذف</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={groupEndRef} />
                </div>

                {/* Group Chat Composer */}
                <form
                  onSubmit={handleSend}
                  className="pt-2.5 border-t border-emerald-300/20 flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={draftText}
                    onChange={(e) =>
                      setDraftText(e.target.value.slice(0, MAX_CHAT_MESSAGE_LENGTH))
                    }
                    maxLength={MAX_CHAT_MESSAGE_LENGTH}
                    placeholder={`پیام در گروه ${myGroup?.name || ''}...`}
                    className="flex-1 bg-[#071611] border border-emerald-300/30 focus:border-amber-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !canSendChatMessage(draftText)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] disabled:bg-none disabled:bg-slate-800/90 disabled:text-slate-300 disabled:border disabled:border-slate-600/80 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>ارسال</span>
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>

      {/* Active Competitive Challenge Mini-Game Overlay */}
      {activePlayChallenge && effectiveGroupId && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[10050]"
        >
          <Suspense fallback={null}>
            {activePlayChallenge.challenge.gameId === 'brain_math' && (
              <BrainMathGame
                challengeConfig={{
                  challengeId: activePlayChallenge.challenge.id,
                  title: activePlayChallenge.challenge.title,
                  personalBestScore: activePlayChallenge.personalBestScore,
                }}
                onChallengeComplete={async ({ score, detailLabel }) => {
                  const res = await submitGroupChallengeScore(
                    profile,
                    effectiveGroupId,
                    activePlayChallenge.challenge.id,
                    score,
                    detailLabel
                  );
                  setActivePlayChallenge((prev) =>
                    prev ? { ...prev, personalBestScore: res.bestScore } : null
                  );
                  setNoticeBanner(
                    res.isNewRecord
                      ? `🏆 رکورد جدید شما (${res.bestScore} امتیاز) زیر بازی گروه ثبت شد!`
                      : `امتیاز این دست: ${score} · بالاترین رکورد قبلی شما (${res.bestScore} امتیاز) حفظ شد.`
                  );
                  return { isNewRecord: res.isNewRecord, bestScore: res.bestScore };
                }}
                onComplete={() => setActivePlayChallenge(null)}
                onClose={() => setActivePlayChallenge(null)}
              />
            )}

            {activePlayChallenge.challenge.gameId === 'bina_balls' && (
              <BinaBallsGame
                challengeConfig={{
                  challengeId: activePlayChallenge.challenge.id,
                  title: activePlayChallenge.challenge.title,
                  personalBestScore: activePlayChallenge.personalBestScore,
                }}
                onChallengeComplete={async ({ score, detailLabel }) => {
                  const res = await submitGroupChallengeScore(
                    profile,
                    effectiveGroupId,
                    activePlayChallenge.challenge.id,
                    score,
                    detailLabel
                  );
                  setActivePlayChallenge((prev) =>
                    prev ? { ...prev, personalBestScore: res.bestScore } : null
                  );
                  setNoticeBanner(
                    res.isNewRecord
                      ? `🏆 رکورد جدید شما (${res.bestScore} امتیاز) زیر بازی گروه ثبت شد!`
                      : `امتیاز این دست: ${score} · بالاترین رکورد قبلی شما (${res.bestScore} امتیاز) حفظ شد.`
                  );
                  return { isNewRecord: res.isNewRecord, bestScore: res.bestScore };
                }}
                onComplete={() => setActivePlayChallenge(null)}
                onClose={() => setActivePlayChallenge(null)}
              />
            )}

            {activePlayChallenge.challenge.gameId === 'memory_cards' && (
              <MemoryCardsGame
                challengeConfig={{
                  challengeId: activePlayChallenge.challenge.id,
                  title: activePlayChallenge.challenge.title,
                  personalBestScore: activePlayChallenge.personalBestScore,
                }}
                onChallengeComplete={async ({ score, detailLabel }) => {
                  const res = await submitGroupChallengeScore(
                    profile,
                    effectiveGroupId,
                    activePlayChallenge.challenge.id,
                    score,
                    detailLabel
                  );
                  setActivePlayChallenge((prev) =>
                    prev ? { ...prev, personalBestScore: res.bestScore } : null
                  );
                  setNoticeBanner(
                    res.isNewRecord
                      ? `🏆 رکورد جدید شما (${res.bestScore} امتیاز) زیر بازی گروه ثبت شد!`
                      : `امتیاز این دست: ${score} · بالاترین رکورد قبلی شما (${res.bestScore} امتیاز) حفظ شد.`
                  );
                  return { isNewRecord: res.isNewRecord, bestScore: res.bestScore };
                }}
                onComplete={() => setActivePlayChallenge(null)}
                onClose={() => setActivePlayChallenge(null)}
              />
            )}

            {activePlayChallenge.challenge.gameId === 'color_trap' && (
              <ColorTrapGame
                challengeConfig={{
                  challengeId: activePlayChallenge.challenge.id,
                  title: activePlayChallenge.challenge.title,
                  personalBestScore: activePlayChallenge.personalBestScore,
                }}
                onChallengeComplete={async ({ score, detailLabel }) => {
                  const res = await submitGroupChallengeScore(
                    profile,
                    effectiveGroupId,
                    activePlayChallenge.challenge.id,
                    score,
                    detailLabel
                  );
                  setActivePlayChallenge((prev) =>
                    prev ? { ...prev, personalBestScore: res.bestScore } : null
                  );
                  setNoticeBanner(
                    res.isNewRecord
                      ? `🏆 رکورد جدید شما (${res.bestScore} امتیاز) زیر بازی گروه ثبت شد!`
                      : `امتیاز این دست: ${score} · بالاترین رکورد قبلی شما (${res.bestScore} امتیاز) حفظ شد.`
                  );
                  return { isNewRecord: res.isNewRecord, bestScore: res.bestScore };
                }}
                onClose={() => setActivePlayChallenge(null)}
              />
            )}

            {activePlayChallenge.challenge.gameId === 'logic_mind' && (
              <LogicMindGame
                challengeConfig={{
                  challengeId: activePlayChallenge.challenge.id,
                  title: activePlayChallenge.challenge.title,
                  personalBestScore: activePlayChallenge.personalBestScore,
                }}
                onChallengeComplete={async ({ score, detailLabel }) => {
                  const res = await submitGroupChallengeScore(
                    profile,
                    effectiveGroupId,
                    activePlayChallenge.challenge.id,
                    score,
                    detailLabel
                  );
                  setActivePlayChallenge((prev) =>
                    prev ? { ...prev, personalBestScore: res.bestScore } : null
                  );
                  setNoticeBanner(
                    res.isNewRecord
                      ? `🏆 رکورد جدید شما (${res.bestScore} امتیاز) زیر بازی گروه ثبت شد!`
                      : `امتیاز این دست: ${score} · بالاترین رکورد قبلی شما (${res.bestScore} امتیاز) حفظ شد.`
                  );
                  return { isNewRecord: res.isNewRecord, bestScore: res.bestScore };
                }}
                onClose={() => setActivePlayChallenge(null)}
              />
            )}

            {activePlayChallenge.challenge.gameId === 'spatial_memory' && (
              <SpatialMemoryGame
                challengeConfig={{
                  challengeId: activePlayChallenge.challenge.id,
                  title: activePlayChallenge.challenge.title,
                  personalBestScore: activePlayChallenge.personalBestScore,
                }}
                onChallengeComplete={async ({ score, detailLabel }) => {
                  const res = await submitGroupChallengeScore(
                    profile,
                    effectiveGroupId,
                    activePlayChallenge.challenge.id,
                    score,
                    detailLabel
                  );
                  setActivePlayChallenge((prev) =>
                    prev ? { ...prev, personalBestScore: res.bestScore } : null
                  );
                  setNoticeBanner(
                    res.isNewRecord
                      ? `🏆 رکورد جدید شما (${res.bestScore} امتیاز) زیر بازی گروه ثبت شد!`
                      : `امتیاز این دست: ${score} · بالاترین رکورد قبلی شما (${res.bestScore} امتیاز) حفظ شد.`
                  );
                  return { isNewRecord: res.isNewRecord, bestScore: res.bestScore };
                }}
                onClose={() => setActivePlayChallenge(null)}
              />
            )}

            {activePlayChallenge.challenge.gameId === 'coordination_duel' && (
              <CoordinationDuelGame
                challengeConfig={{
                  challengeId: activePlayChallenge.challenge.id,
                  title: activePlayChallenge.challenge.title,
                  personalBestScore: activePlayChallenge.personalBestScore,
                }}
                onChallengeComplete={async ({ score, detailLabel }) => {
                  const res = await submitGroupChallengeScore(
                    profile,
                    effectiveGroupId,
                    activePlayChallenge.challenge.id,
                    score,
                    detailLabel
                  );
                  setActivePlayChallenge((prev) =>
                    prev ? { ...prev, personalBestScore: res.bestScore } : null
                  );
                  setNoticeBanner(
                    res.isNewRecord
                      ? `🏆 رکورد جدید شما (${res.bestScore} امتیاز) زیر بازی گروه ثبت شد!`
                      : `امتیاز این دست: ${score} · بالاترین رکورد قبلی شما (${res.bestScore} امتیاز) حفظ شد.`
                  );
                  return { isNewRecord: res.isNewRecord, bestScore: res.bestScore };
                }}
                onClose={() => setActivePlayChallenge(null)}
              />
            )}
          </Suspense>
        </div>
      )}
    </div>
  );
};
