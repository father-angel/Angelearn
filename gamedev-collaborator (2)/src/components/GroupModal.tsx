import React, { useEffect, useMemo, useState } from 'react';
import {
  GroupInvite,
  GroupJoinRequest,
  GroupMember,
  UserProfile,
  WorldGroup,
} from '../types/game';
import {
  acceptGroupInvite,
  approveGroupJoinRequest,
  contributeToGroupBuilding,
  declineGroupInvite,
  getCurrentVerifiedUid,
  leaveGroup,
  rejectGroupJoinRequest,
  requestToJoinGroup,
  signInWithGoogleAccount,
  subscribeToGroup,
  subscribeToGroupJoinRequests,
  subscribeToGroupMembers,
  subscribeToMyGroupInvites,
  subscribeToPublicGroups,
} from '../firebase';
import {
  GROUP_CONTRIBUTION_PRESETS,
  GROUP_MAX_LEVEL,
  GROUP_MAX_MEMBERS,
  getGroupTierMeta,
  getNextGroupUpgradeCost,
} from '../game/groups';
import { GroupBuilding25D } from './BuildingGraphic25D';
import { HudCoinIcon, HudGroupTentIcon } from './HudIcons25D';
import { CharacterAvatar } from './CharacterAvatar';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  Check,
  Crown,
  LogOut,
  Mail,
  MessageCircle,
  Move,
  PlusCircle,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

interface GroupModalProps {
  profile: UserProfile;
  initialGroupId?: string | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onOpenGroupChat: () => void;
  onOpenShopGroups: () => void;
  onLocateGroupOnMap?: (group: WorldGroup) => void;
  onRelocateGroupOnMap?: (group: WorldGroup) => void;
  onClose: () => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  profile,
  initialGroupId = null,
  onUpdateProfile,
  onOpenGroupChat,
  onOpenShopGroups,
  onLocateGroupOnMap,
  onRelocateGroupOnMap,
  onClose,
}) => {
  const verifiedUid = getCurrentVerifiedUid();
  const isAuthenticated = Boolean(verifiedUid && !profile.isGuest);

  const [publicGroups, setPublicGroups] = useState<WorldGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialGroupId || profile.groupId || null
  );
  const [activeGroup, setActiveGroup] = useState<WorldGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [myInvites, setMyInvites] = useState<GroupInvite[]>([]);

  const [customCoins, setCustomCoins] = useState<string>('50');
  const [joinNote, setJoinNote] = useState<string>('');
  const [requestSentForId, setRequestSentForId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    const unsub = subscribeToPublicGroups(setPublicGroups);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!verifiedUid) {
      setMyInvites([]);
      return;
    }
    const unsub = subscribeToMyGroupInvites(verifiedUid, setMyInvites);
    return () => unsub();
  }, [verifiedUid]);

  useEffect(() => {
    if (!selectedGroupId) {
      setActiveGroup(null);
      setMembers([]);
      return;
    }
    const unsubGroup = subscribeToGroup(selectedGroupId, (grp) => {
      setActiveGroup(grp);
    });
    const unsubMembers = subscribeToGroupMembers(selectedGroupId, setMembers);
    return () => {
      unsubGroup();
      unsubMembers();
    };
  }, [selectedGroupId]);

  const isLeaderOfViewedGroup = Boolean(
    verifiedUid && activeGroup && activeGroup.leaderUid === verifiedUid
  );

  useEffect(() => {
    if (!activeGroup || !isLeaderOfViewedGroup) {
      setJoinRequests([]);
      return;
    }
    const unsub = subscribeToGroupJoinRequests(
      activeGroup.id,
      activeGroup.leaderUid,
      setJoinRequests
    );
    return () => unsub();
  }, [activeGroup?.id, activeGroup?.leaderUid, isLeaderOfViewedGroup]);

  const amIMemberOfViewedGroup = useMemo(() => {
    if (!verifiedUid || !activeGroup) return false;
    return (
      profile.groupId === activeGroup.id ||
      members.some((m) => m.uid === verifiedUid)
    );
  }, [verifiedUid, activeGroup, profile.groupId, members]);

  // Auto-sync profile.groupId if leader approved our join request while we were away
  useEffect(() => {
    if (
      verifiedUid &&
      activeGroup &&
      !profile.groupId &&
      members.some((m) => m.uid === verifiedUid)
    ) {
      onUpdateProfile({
        ...profile,
        groupId: activeGroup.id,
        groupName: activeGroup.name,
      });
    }
  }, [verifiedUid, activeGroup, members, profile.groupId]);

  const tierMeta = getGroupTierMeta(activeGroup?.buildingLevel || 1);
  const nextUpgradeCost = activeGroup
    ? getNextGroupUpgradeCost(activeGroup.buildingLevel)
    : null;
  const progressPct =
    activeGroup && nextUpgradeCost
      ? Math.min(100, Math.round((activeGroup.treasuryCoins / nextUpgradeCost) * 100))
      : 100;

  const handleSignIn = async () => {
    setBusyAction('signin');
    setFeedback(null);
    try {
      const synced = await signInWithGoogleAccount(profile);
      onUpdateProfile(synced);
      sound.playCoin();
    } catch {
      setFeedback({
        type: 'error',
        text: 'اتصال با حساب گوگل انجام نشد. لطفاً دوباره تلاش کنید.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDonate = async (amount: number) => {
    if (!activeGroup || !amIMemberOfViewedGroup) return;
    if (activeGroup.buildingLevel >= GROUP_MAX_LEVEL) return;
    const cleanAmount = Math.floor(amount);
    if (cleanAmount <= 0) {
      setFeedback({ type: 'error', text: 'مقدار سکه اهدایی باید معتبر باشد.' });
      return;
    }
    if (profile.coins < cleanAmount) {
      sound.playClick();
      setFeedback({
        type: 'error',
        text: `سکه کافی ندارید! موجودی شما ${profile.coins} سکه است.`,
      });
      return;
    }

    setBusyAction(`donate_${cleanAmount}`);
    setFeedback(null);
    try {
      const res = await contributeToGroupBuilding(profile, activeGroup, cleanAmount);
      onUpdateProfile({
        ...profile,
        coins: Math.max(0, profile.coins - cleanAmount),
      });
      sound.playCoin();
      if (res.leveledUp) {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.55 } });
        const nextTier = getGroupTierMeta(res.nextLevel);
        setFeedback({
          type: 'success',
          text: `شگفت‌انگیز! ساختمان گروه به سطح ${res.nextLevel} («${nextTier.title}») ارتقا یافت!`,
        });
      } else {
        setFeedback({
          type: 'success',
          text: `${cleanAmount} سکه با موفقیت به خزانه ساختمانی گروه اهدا شد.`,
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        text: 'ثبت کمک مالی انجام نشد. اتصال اینترنت را بررسی کنید.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRequestJoin = async () => {
    if (!activeGroup) return;
    if (!isAuthenticated) {
      await handleSignIn();
      return;
    }
    if (profile.groupId) {
      setFeedback({
        type: 'error',
        text: 'شما هم‌اکنون عضو یک گروه هستید. برای عضویت در گروه جدید ابتدا از گروه فعلی خارج شوید.',
      });
      return;
    }

    setBusyAction('join_req');
    setFeedback(null);
    try {
      await requestToJoinGroup(profile, activeGroup, joinNote);
      sound.playCoin();
      setRequestSentForId(activeGroup.id);
      setJoinNote('');
      setFeedback({
        type: 'success',
        text: `درخواست عضویت برای رئیس گروه (${activeGroup.leaderName}) ارسال شد.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'ارسال درخواست عضویت با خطا مواجه شد.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleApproveRequest = async (req: GroupJoinRequest) => {
    if (!activeGroup) return;
    setBusyAction(`approve_${req.applicantUid}`);
    setFeedback(null);
    try {
      await approveGroupJoinRequest(activeGroup, req);
      sound.playCoin();
      setFeedback({
        type: 'success',
        text: `«${req.applicantName}» با تایید شما وارد گروه شد!`,
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setFeedback({
        type: 'error',
        text:
          code === 'GROUP_FULL'
            ? 'ظرفیت گروه تکمیل است.'
            : 'تایید درخواست انجام نشد.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRejectRequest = async (req: GroupJoinRequest) => {
    if (!activeGroup) return;
    setBusyAction(`reject_${req.applicantUid}`);
    try {
      await rejectGroupJoinRequest(activeGroup.id, req.applicantUid);
      sound.playClick();
    } catch {
      setFeedback({ type: 'error', text: 'حذف درخواست انجام نشد.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleAcceptInvite = async (invite: GroupInvite) => {
    if (profile.groupId) {
      setFeedback({
        type: 'error',
        text: 'برای پذیرش دعوت‌نامه جدید، ابتدا از گروه فعلی خود خارج شوید.',
      });
      return;
    }
    setBusyAction(`accept_inv_${invite.id}`);
    setFeedback(null);
    try {
      const joinedGroup = await acceptGroupInvite(profile, invite);
      if (joinedGroup) {
        onUpdateProfile({
          ...profile,
          groupId: joinedGroup.id,
          groupName: joinedGroup.name,
        });
        setSelectedGroupId(joinedGroup.id);
        sound.playCoin();
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        setFeedback({
          type: 'success',
          text: `به گروه «${joinedGroup.name}» خوش آمدید!`,
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'پذیرش دعوت‌نامه انجام نشد.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeclineInvite = async (invite: GroupInvite) => {
    setBusyAction(`decline_inv_${invite.id}`);
    try {
      await declineGroupInvite(invite);
      sound.playClick();
    } catch {
      setFeedback({ type: 'error', text: 'رد دعوت‌نامه انجام نشد.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    setBusyAction('leave');
    setFeedback(null);
    try {
      await leaveGroup(activeGroup);
      onUpdateProfile({
        ...profile,
        groupId: undefined,
        groupName: undefined,
      });
      setSelectedGroupId(null);
      sound.playClick();
      setFeedback({
        type: 'success',
        text: 'با موفقیت از گروه خارج شدید.',
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setFeedback({
        type: 'error',
        text:
          code === 'LEADER_CANNOT_LEAVE_WITH_MEMBERS'
            ? 'رئیس گروه تا زمانی که اعضای دیگر حضور دارند نمی‌تواند گروه را ترک کند.'
            : 'خروج از گروه انجام نشد.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div
      dir="rtl"
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-black/88 animate-fadeIn"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/90 rounded-[28px] shadow-[0_18px_50px_rgba(0,0,0,0.9),0_4px_0_#451a03] text-slate-50 flex flex-col max-h-[90dvh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3 bg-gradient-to-b from-[#132e24] via-[#0d211a] to-[#081712] border-b border-amber-400/35 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedGroupId && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedGroupId(null);
                  setFeedback(null);
                }}
                aria-label="فهرست گروه‌های جهان"
                className="p-1.5 rounded-xl bg-[#143026] hover:bg-[#1a3f32] text-amber-200 border border-emerald-300/30 cursor-pointer shrink-0"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[#fde68a] to-[#f59e0b] border border-amber-200 flex items-center justify-center shrink-0">
              <HudGroupTentIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-black text-amber-200 truncate">
                {activeGroup ? activeGroup.name : 'گروه‌ها و پایگاه‌های همسفران'}
              </h2>
              <p className="text-[11px] text-slate-200 truncate">
                {activeGroup
                  ? `${tierMeta.title} · سطح ${activeGroup.buildingLevel} از ${GROUP_MAX_LEVEL}`
                  : 'ساختمان مشترک بسازید، با هم ارتقا دهید و گفت‌وگو کنید'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 bg-[#140d05] border border-amber-500/60 px-2.5 py-1 rounded-xl">
              <HudCoinIcon className="w-4 h-4" />
              <span className="text-xs font-black text-amber-300 tabular-nums">
                {profile.coins}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              aria-label="بستن"
              className="w-9 h-9 rounded-full bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div
            className={`mx-4 sm:mx-6 mt-3 px-3.5 py-2.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/90 border-lime-400/70 text-lime-200'
                : 'bg-rose-950/90 border-rose-500/70 text-rose-200'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="cursor-pointer opacity-80 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Incoming Pending Invites Banner */}
          {myInvites.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/85 to-[#163d28]/90 border-2 border-amber-400/80 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-amber-200">
                <Mail className="w-4 h-4 text-amber-300 shrink-0" />
                <span>دعوت‌نامه‌های گروه برای شما ({myInvites.length})</span>
              </div>
              {myInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="p-2.5 rounded-xl bg-[#041d14]/90 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="text-xs">
                    <span className="font-black text-white">«{inv.groupName}»</span>
                    <span className="text-slate-200">
                      {' '}
                      — دعوت از طرف {inv.inviterName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busyAction === `accept_inv_${inv.id}`}
                      onClick={() => handleAcceptInvite(inv)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-emerald-300 to-teal-300 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>پذیرش و ورود</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyAction === `decline_inv_${inviteIdSafe(inv.id)}`}
                      onClick={() => handleDeclineInvite(inv)}
                      className="px-3 py-1.5 rounded-xl bg-rose-950/90 hover:bg-rose-900 border border-rose-400/60 text-rose-100 font-bold text-xs cursor-pointer"
                    >
                      رد
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!selectedGroupId || !activeGroup ? (
            /* ===============================================================
               GROUP DIRECTORY VIEW
               =============================================================== */
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-[#143026] border-2 border-amber-400/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-14 rounded-2xl bg-[#071611] border border-emerald-300/30 flex items-center justify-center shrink-0">
                    <GroupBuilding25D level={1} className="w-14 h-12" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-200">
                      گروه خودتان را در جهان بسازید
                    </h3>
                    <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                      با یک چادر کهنه در نقشه جهان شروع کنید، دوستانتان را دعوت کنید و با کمک هم آن را به دژ زرین برسانید!
                    </p>
                  </div>
                </div>

                {!profile.groupId ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      onClose();
                      onOpenShopGroups();
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>ساخت گروه در فروشگاه</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSelectedGroupId(profile.groupId!);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer shrink-0"
                  >
                    <Shield className="w-4 h-4" />
                    <span>گروه من ({profile.groupName || 'ورود'})</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-black text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-300" />
                    <span>گروه‌های فعال در جهان ({publicGroups.length})</span>
                  </span>
                </div>

                {publicGroups.length === 0 ? (
                  <div className="p-6 text-center rounded-3xl bg-[#0d211a] border border-emerald-300/25 space-y-2">
                    <p className="text-sm font-black text-white">
                      هنوز هیچ گروهی در جهان ساخته نشده است
                    </p>
                    <p className="text-xs text-slate-300">
                      اولین گروه جهان انجلرن را از فروشگاه تأسیس کنید و چادر گروهی خود را برپا کنید!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {publicGroups.map((grp) => {
                      const gTier = getGroupTierMeta(grp.buildingLevel);
                      const isMine = profile.groupId === grp.id;
                      return (
                        <button
                          key={grp.id}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setSelectedGroupId(grp.id);
                            setFeedback(null);
                          }}
                          className={`p-3 rounded-2xl border-2 text-right flex items-center gap-3 cursor-pointer transition-all ${
                            isMine
                              ? 'bg-[#1a4334] border-amber-400 shadow'
                              : 'bg-[#143026] hover:bg-[#193d30] border-emerald-300/25 hover:border-amber-400/70'
                          }`}
                        >
                          <div className="w-16 h-14 rounded-xl bg-[#071611] border border-emerald-300/25 flex items-center justify-center shrink-0">
                            <GroupBuilding25D
                              level={grp.buildingLevel}
                              className="w-14 h-12"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs sm:text-sm font-black text-amber-200 truncate">
                                {grp.name}
                              </h4>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#071611] text-lime-200 border border-emerald-300/30 shrink-0">
                                سطح {grp.buildingLevel}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-200 truncate mt-0.5">
                              {gTier.title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-1">
                              <span>رئیس: {grp.leaderName}</span>
                              <span>•</span>
                              <span>
                                {grp.memberCount}/{GROUP_MAX_MEMBERS} عضو
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ===============================================================
               SPECIFIC GROUP DETAIL, BUILDING UPGRADES & MEMBERSHIP WORKSPACE
               =============================================================== */
            <div className="space-y-4">
              {/* Building Architectural Stage & Progress */}
              <div className="p-4 rounded-3xl bg-gradient-to-b from-[#0b3e2b] to-[#041d14] border-2 border-amber-400/80 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-[#02140d]/90 border border-emerald-700/60">
                  <GroupBuilding25D
                    level={activeGroup.buildingLevel}
                    className="w-40 h-32 sm:w-44 sm:h-36"
                  />
                  <span className="mt-1 text-xs font-black text-amber-300">
                    {tierMeta.title} (سطح {activeGroup.buildingLevel})
                  </span>
                </div>

                <div className="sm:col-span-7 space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-base font-black text-white">
                        {activeGroup.name}
                      </h3>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200">
                        {activeGroup.memberCount} / {GROUP_MAX_MEMBERS} عضو
                      </span>
                    </div>
                    {activeGroup.motto && (
                      <p className="text-xs text-slate-200 mt-1 italic">
                        «{activeGroup.motto}»
                      </p>
                    )}
                    <p className="text-[11px] text-slate-300 mt-1">
                      {tierMeta.subtitle}
                    </p>
                  </div>

                  {/* Shared Upgrade Progress Bar */}
                  <div className="p-3 rounded-2xl bg-[#071611] border border-emerald-300/25 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-amber-200">
                        {nextUpgradeCost
                          ? `خزانه ارتقا به سطح ${activeGroup.buildingLevel + 1}`
                          : 'ساختمان به شکوه نهایی رسیده است!'}
                      </span>
                      <span className="font-black text-lime-200 tabular-nums">
                        {nextUpgradeCost
                          ? `${activeGroup.treasuryCoins} / ${nextUpgradeCost} سکه`
                          : 'سطح ۵ (حداکثر)'}
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[#040d0a] border border-emerald-300/25 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-lime-400 transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-300">
                      مجموع سرمایه‌گذاری اعضا تاکنون:{' '}
                      <span className="font-black text-amber-200 tabular-nums">
                        {activeGroup.totalContributedCoins} سکه
                      </span>
                    </p>
                  </div>

                  {/* Quick Actions Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {amIMemberOfViewedGroup && (
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          onClose();
                          onOpenGroupChat();
                        }}
                        className="flex-1 min-w-[130px] py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>چت داخل گروه</span>
                      </button>
                    )}

                    {onLocateGroupOnMap && (
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          onLocateGroupOnMap(activeGroup);
                          onClose();
                        }}
                        className="py-2 px-3 rounded-xl bg-[#143026] hover:bg-[#1a3f32] border border-emerald-300/35 text-slate-100 font-bold text-xs cursor-pointer"
                      >
                        نمایش روی نقشه جهان
                      </button>
                    )}

                    {isLeaderOfViewedGroup && onRelocateGroupOnMap && (
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          onRelocateGroupOnMap(activeGroup);
                          onClose();
                        }}
                        className="py-2 px-3 rounded-xl bg-sky-900/60 hover:bg-sky-800/70 border border-sky-400/70 text-sky-100 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Move className="w-3.5 h-3.5 text-sky-200" />
                        <span>جابه‌جایی چادر در جهان</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Donate Coins To Upgrade Building (For Members) */}
              {amIMemberOfViewedGroup &&
                activeGroup.buildingLevel < GROUP_MAX_LEVEL && (
                  <div className="p-4 rounded-3xl bg-[#143026] border border-amber-400/50 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-amber-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>مشارکت و تقویت ساختمان گروه</span>
                      </h4>
                      <span className="text-[11px] text-slate-200">
                        سکه شما:{' '}
                        <strong className="text-amber-200 tabular-nums">
                          {profile.coins}
                        </strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {GROUP_CONTRIBUTION_PRESETS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          disabled={
                            busyAction !== null || profile.coins < amt
                          }
                          onClick={() => handleDonate(amt)}
                          className={`py-2 px-2 rounded-xl border text-xs font-black tabular-nums transition-all ${
                            profile.coins >= amt
                              ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-amber-200 hover:brightness-105 cursor-pointer'
                              : 'bg-slate-800/90 text-slate-300 border-slate-600/80 cursor-not-allowed'
                          }`}
                        >
                          +{amt} سکه
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={profile.coins || 1}
                        value={customCoins}
                        onChange={(e) => setCustomCoins(e.target.value)}
                        className="flex-1 bg-[#071611] border border-emerald-300/30 focus:border-amber-300 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none tabular-nums"
                        placeholder="مقدار سکه دلخواه..."
                      />
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => handleDonate(Number(customCoins) || 0)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs cursor-pointer shrink-0"
                      >
                        اهدای سکه و ارتقا
                      </button>
                    </div>
                  </div>
                )}

              {/* Apply to Join Button (For Non-Members) */}
              {!amIMemberOfViewedGroup && (
                <div className="p-4 rounded-3xl bg-[#143026] border border-emerald-300/35 space-y-2.5">
                  <h4 className="text-xs sm:text-sm font-black text-lime-200 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-lime-300" />
                    <span>درخواست عضویت در این گروه</span>
                  </h4>
                  {requestSentForId === activeGroup.id ? (
                    <p className="text-xs font-bold text-lime-200">
                      ✓ درخواست عضویت شما ثبت شده و در انتظار تایید رئیس گروه ({activeGroup.leaderName}) است.
                    </p>
                  ) : (
                    <>
                      <input
                        type="text"
                        maxLength={120}
                        value={joinNote}
                        onChange={(e) => setJoinNote(e.target.value)}
                        placeholder="پیام کوتاه برای رئیس گروه (اختیاری)..."
                        className="w-full bg-[#071611] border border-emerald-300/30 focus:border-amber-300 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={handleRequestJoin}
                        className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>
                          {isAuthenticated
                            ? 'ارسال درخواست ورود به گروه'
                            : 'ورود با گوگل و درخواست عضویت'}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Leader Inbox: Pending Join Requests */}
              {isLeaderOfViewedGroup && (
                <div className="p-4 rounded-3xl bg-[#143026] border-2 border-amber-400/70 space-y-2.5">
                  <h4 className="text-xs sm:text-sm font-black text-amber-200 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-300" />
                    <span>
                      مدیریت درخواست‌های عضویت ({joinRequests.length})
                    </span>
                  </h4>
                  {joinRequests.length === 0 ? (
                    <p className="text-xs text-slate-200">
                      در حال حاضر درخواست جدیدی در انتظار تایید نیست. همچنین می‌توانید از پروفایل بازیکنان در نقشه جهان، باغ یا چت آن‌ها را به گروه دعوت کنید.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {joinRequests.map((req) => (
                        <div
                          key={req.applicantUid}
                          className="p-2.5 rounded-2xl bg-[#071611] border border-emerald-300/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#0b4a32] overflow-hidden flex items-center justify-center shrink-0">
                              <CharacterAvatar
                                gender={req.applicantGender}
                                config={req.applicantAvatar}
                                variant="full"
                                showBackdrop={false}
                                size={32}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-black text-white truncate">
                                {req.applicantName}
                              </div>
                              {req.note && (
                                <div className="text-[11px] text-slate-200 truncate">
                                  «{req.note}»
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => handleApproveRequest(req)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-emerald-300 to-teal-300 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>تایید</span>
                            </button>
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => handleRejectRequest(req)}
                              className="px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-400/60 text-rose-100 font-bold text-xs cursor-pointer"
                            >
                              رد
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Group Member Roster & Contributions */}
              <div className="p-4 rounded-3xl bg-[#0d211a] border border-emerald-300/25 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-black text-slate-100 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-300" />
                    <span>اعضای گروه ({members.length || activeGroup.memberCount})</span>
                  </h4>
                  <span className="text-[10px] text-amber-200 font-bold">
                    مشارکت در ساخت بنا
                  </span>
                </div>

                {!isAuthenticated ? (
                  <p className="text-xs text-slate-200">
                    برای مشاهده فهرست کامل اعضا و مشارکت‌ها با گوگل وارد شوید.
                  </p>
                ) : members.length === 0 ? (
                  <p className="text-xs text-slate-200">
                    رئیس گروه: {activeGroup.leaderName}
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                    {members.map((m) => (
                      <div
                        key={m.uid}
                        className="p-2 rounded-2xl bg-[#143026] border border-emerald-300/20 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-[#0b4a32] overflow-hidden flex items-center justify-center shrink-0">
                            <CharacterAvatar
                              gender={m.gender}
                              config={m.avatarConfig}
                              variant="full"
                              showBackdrop={false}
                              size={30}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-black text-white truncate">
                                {m.displayName}
                              </span>
                              {m.role === 'leader' && (
                                <span title="رئیس گروه" className="shrink-0 flex items-center">
                                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-300">
                              {m.role === 'leader' ? 'رئیس گروه' : 'عضو'}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-amber-200 tabular-nums shrink-0">
                          🪙 {m.contributedCoins}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {amIMemberOfViewedGroup && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={busyAction === 'leave'}
                    onClick={handleLeaveGroup}
                    className="px-3.5 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900/90 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>
                      {isLeaderOfViewedGroup && activeGroup.memberCount <= 1
                        ? 'انحلال و خروج از گروه'
                        : 'خروج از گروه'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function inviteIdSafe(id: string): string {
  return id;
}
