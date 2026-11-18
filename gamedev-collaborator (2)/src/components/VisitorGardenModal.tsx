import React, { useMemo, useState } from 'react';
import { ChatTargetUser, VisitorGarden } from '../types/game';
import { Garden2DView } from './Garden2DView';
import { CharacterAvatar } from './CharacterAvatar';
import { buildVisitorOwnerProfile } from '../game/gardenSnapshot';
import { sound } from '../utils/audio';
import { ArrowRight, Check, Eye, Flame, Lock, UserPlus } from 'lucide-react';

interface VisitorGardenModalProps {
  garden: VisitorGarden;
  canInviteToGroup?: boolean;
  inviteGroupName?: string;
  onInviteOwnerToGroup?: (target: ChatTargetUser) => Promise<void> | void;
  onClose: () => void;
}

export const VisitorGardenModal: React.FC<VisitorGardenModalProps> = ({
  garden,
  canInviteToGroup = false,
  inviteGroupName,
  onInviteOwnerToGroup,
  onClose,
}) => {
  const ownerProfile = useMemo(() => buildVisitorOwnerProfile(garden), [garden]);
  const unlockedTreesCount = useMemo(
    () => garden.trees.filter((t) => t.unlocked).length,
    [garden.trees]
  );
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleInviteOwner = async () => {
    if (!garden.ownerUid || !onInviteOwnerToGroup || inviteStatus === 'sending') return;
    sound.playClick();
    setInviteStatus('sending');
    try {
      await onInviteOwnerToGroup({
        uid: garden.ownerUid,
        name: garden.ownerName,
        gender: garden.gender,
        avatarConfig: garden.avatarConfig,
      });
      sound.playCoin();
      setInviteStatus('sent');
    } catch {
      setInviteStatus('error');
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 w-full h-screen overflow-hidden animate-fadeIn select-none"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      {/* Full-Screen Identical 2.5D Garden Stage in Strict Read-Only Visitor Mode */}
      <Garden2DView
        trees={garden.trees}
        decorations={garden.decorations}
        profile={ownerProfile}
        readOnly={true}
      />

      {/* Minimal Top Visitor Info Banner (Owner Identity + Read-Only Status + Optional Group Invite) */}
      <div className="fixed top-2.5 sm:top-3 left-2 right-2 z-[10000] pointer-events-none flex items-start justify-between gap-2 max-w-5xl mx-auto">
        <div className="pointer-events-auto flex items-center gap-2.5 bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 border-2 border-[#f59e0b]/90 rounded-2xl px-3 py-2 shadow-[0_6px_18px_rgba(4,47,30,0.5)] text-white max-w-[72vw] sm:max-w-md">
          <div className="w-11 h-11 rounded-xl bg-[#071611] border border-emerald-300/35 flex items-center justify-center shrink-0 overflow-hidden">
            <CharacterAvatar
              gender={ownerProfile.gender}
              config={ownerProfile.avatarConfig}
              variant="portrait"
              showBackdrop={false}
              size={42}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black text-amber-200 truncate">
                باغ {garden.ownerName}
              </h2>
              <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black bg-[#071611] text-lime-200 border border-lime-400/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                <Eye className="w-3 h-3 text-lime-300" />
                <span>فقط مشاهده</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-200 mt-0.5 truncate">
              <span className="inline-flex items-center gap-0.5 text-amber-300 font-bold shrink-0">
                <Flame className="w-3 h-3 text-amber-300 fill-amber-400" />
                {garden.streakDays} روز
              </span>
              <span className="text-slate-400">•</span>
              <span className="shrink-0 font-bold text-lime-200">
                {unlockedTreesCount} درخت
              </span>
              {garden.bio && (
                <>
                  <span className="text-slate-400 hidden sm:inline">•</span>
                  <span className="hidden sm:inline truncate italic text-slate-200">
                    «{garden.bio}»
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {canInviteToGroup && garden.ownerUid && onInviteOwnerToGroup && (
            <button
              type="button"
              disabled={inviteStatus === 'sending' || inviteStatus === 'sent'}
              onClick={handleInviteOwner}
              title={inviteGroupName ? `دعوت به گروه «${inviteGroupName}»` : 'دعوت به گروه'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 text-xs font-black shadow-md transition-all cursor-pointer shrink-0 ${
                inviteStatus === 'sent'
                  ? 'bg-emerald-900/95 border-lime-400 text-lime-200 cursor-default'
                  : 'bg-gradient-to-b from-[#fef08a] via-[#fbbf24] to-[#f59e0b] border-white text-slate-950 hover:brightness-105'
              }`}
            >
              {inviteStatus === 'sent' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>دعوت به گروه ارسال شد</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>
                    {inviteStatus === 'sending' ? 'در حال ارسال...' : 'دعوت به گروه'}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Read-Only Lock Pill */}
          <div className="pointer-events-none hidden md:flex items-center gap-1.5 bg-[#0a1d17]/95 border border-emerald-300/35 rounded-2xl px-3 py-2 text-[11px] font-bold text-slate-100 shadow-md">
            <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>نمای بازدیدکننده (بدون امکان تغییر)</span>
          </div>
        </div>
      </div>

      {/* Bottom-Left Exit Button to Return to World Map */}
      <div className="fixed bottom-4 sm:bottom-5 left-3 sm:left-5 z-[10000] pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          aria-label="بازگشت به جهان"
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:brightness-105 active:translate-y-[2px] text-slate-950 font-black text-xs sm:text-sm border-2 border-[#fef08a] shadow-[0_5px_0_#78350f,0_12px_24px_rgba(0,0,0,0.65)] cursor-pointer transition-all"
        >
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.6]" />
          <span>بازگشت به جهان</span>
        </button>
      </div>
    </div>
  );
};
