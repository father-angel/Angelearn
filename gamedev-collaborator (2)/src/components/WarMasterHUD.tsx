import React from 'react';
import { UserProfile, QuestItem } from '../types/game';
import { sound } from '../utils/audio';
import { Sparkles, Plus } from 'lucide-react';
import { CharacterAvatar } from './CharacterAvatar';
import {
  HudCoinIcon,
  HudQuestScrollIcon,
  HudShopIcon,
  HudMailboxIcon,
  HudChatIcon,
  HudGardenNavIcon,
  HudGlobeOrbIcon,
  HudGroupTentIcon,
} from './HudIcons25D';

interface WarMasterHUDProps {
  currentTab: 'garden' | 'map' | 'city';
  onTabChange: (tab: 'garden' | 'map' | 'city') => void;
  profile: UserProfile;
  totalWateredDays: number;
  activeQuest?: QuestItem;
  unclaimedQuestsCount: number;
  unclaimedMailsCount: number;
  groupNotificationCount?: number;
  onOpenProfile: () => void;
  onOpenShop: () => void;
  onOpenQuests: () => void;
  onOpenMailbox: () => void;
  onOpenChat: () => void;
  onOpenGroups: () => void;
  onOpenTutorial?: () => void;
}

export const WarMasterHUD: React.FC<WarMasterHUDProps> = React.memo(({
  currentTab,
  onTabChange,
  profile,
  totalWateredDays,
  activeQuest,
  unclaimedQuestsCount,
  unclaimedMailsCount,
  groupNotificationCount = 0,
  onOpenProfile,
  onOpenShop,
  onOpenQuests,
  onOpenMailbox,
  onOpenChat,
  onOpenGroups,
}) => {
  const growthLevel = Math.max(1, Math.floor(totalWateredDays / 3) + 1);

  return (
    <>
      {/* =========================================================================
          TOP EDGE FLOATING PERIMETER HUD
         ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-40 px-1.5 sm:px-3.5 pt-2 sm:pt-2.5 pb-1 select-none pointer-events-none">
        <div className="w-full flex items-start justify-between gap-1 sm:gap-2.5">
          {/* TOP-RIGHT CORNER COLUMN (RTL First Child):
              1. Avatar-Only Button in the corner (where Quests used to be)
              2. Quests Button moved 1 slot down directly beneath Avatar */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
            {/* 1. Avatar-Only Medallion (No name, no text, no level badge) */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenProfile();
              }}
              aria-label="پروفایل"
              className="group relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] p-[2px] shadow-[0_3px_0_#78350f,0_6px_14px_rgba(4,24,16,0.45)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_#78350f] transition-all duration-150 cursor-pointer shrink-0"
              title="مشاهده پروفایل"
            >
              <div className="w-full h-full rounded-[14px] bg-[#0a1d17] overflow-hidden flex items-center justify-center">
                <CharacterAvatar
                  gender={profile.gender}
                  config={profile.avatarConfig}
                  size={48}
                  className="w-full h-full group-hover:scale-105 transition-transform"
                />
              </div>
            </button>

            {/* 2. Daily Quests Scroll Button (Moved one slot down below Avatar) */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenQuests();
              }}
              aria-label="ماموریت‌های روزانه"
              className="group relative flex flex-col items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] p-[2px] shadow-[0_3px_0_#78350f,0_6px_14px_rgba(4,24,16,0.45)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_#78350f] transition-all duration-150 cursor-pointer shrink-0"
              title="ماموریت‌های روزانه (+۱۰ سکه برای هر ماموریت)"
            >
              <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-[#112c23] via-[#0b1f18] to-[#06140f] border border-emerald-300/25 flex flex-col items-center justify-center px-0.5">
                <HudQuestScrollIcon className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-105 transition-transform" />
                <span className="text-[8px] sm:text-[9px] font-black text-amber-200 leading-none mt-0.5 whitespace-nowrap">
                  ماموریت
                </span>
              </div>
              {unclaimedQuestsCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 border-2 border-white text-[9px] font-black text-white tabular-nums flex items-center justify-center shadow">
                  {unclaimedQuestsCount}
                </span>
              )}
            </button>
          </div>

          {/* TOP-CENTER: Official AngelLearn Game Logo & Emblem Banner */}
          <div className="flex flex-col items-center pointer-events-auto shrink min-w-0">
            <button
              onClick={() => {
                sound.playClick();
                onOpenProfile();
              }}
              className="group relative flex items-center gap-2 min-h-[38px] sm:min-h-[44px] bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 border-2 border-[#f59e0b]/90 px-2.5 sm:px-4 py-1 rounded-b-2xl rounded-t-lg shadow-[0_3px_0_#78350f,0_8px_16px_rgba(4,24,16,0.45)] hover:brightness-105 active:translate-y-[2px] transition-all duration-150 cursor-pointer whitespace-nowrap"
              title="لوگوی رسمی انجلرن | AngelLearn"
            >
              <img
                src="/assets/aistudio/Neon-Lime_Winged_Book_Emblem_9f21e0f4.png"
                alt="لوگوی انجلرن"
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover border border-emerald-300/60 shadow-sm shrink-0 group-hover:scale-105 transition-transform"
              />

              <div className="flex flex-col items-start leading-tight">
                <span className="text-[9.5px] sm:text-[10px] font-black text-amber-200 tabular-nums">
                  انجلرن · سطح {growthLevel}
                </span>
                <span className="hidden sm:inline text-[11px] font-black text-slate-50 tabular-nums">
                  🌿 {totalWateredDays} آبیاری · 🔥 {profile.streakDays} روز
                </span>
              </div>
            </button>

            {/* Active Quest Ribbon on Desktop Only */}
            {activeQuest && (
              <button
                onClick={() => {
                  sound.playClick();
                  onOpenQuests();
                }}
                className="hidden lg:flex items-center gap-1.5 mt-1 bg-[#0a1d17]/95 hover:bg-[#133227] border border-amber-400/75 px-3 py-0.5 rounded-full text-[10px] text-slate-100 shadow-sm active:translate-y-[1px] cursor-pointer transition-all whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                <span className="font-bold text-slate-100 truncate max-w-[210px]">
                  هدف امروز: {activeQuest.title}
                </span>
              </button>
            )}
          </div>

          {/* TOP-LEFT CLUSTER (RTL Last Child): Single Unified Currency (Coins) & Shop Stall */}
          <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto shrink-0">
            {/* Unified Gold Coins Counter Well */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenShop();
              }}
              aria-label={`سکه‌های طلا: ${profile.coins}`}
              className="group flex items-center gap-1.5 min-h-[38px] sm:min-h-[44px] bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 hover:brightness-105 border-2 border-[#f59e0b]/90 px-2.5 sm:px-3.5 py-1 rounded-2xl shadow-[0_3px_0_#78350f,0_6px_12px_rgba(4,24,16,0.4)] active:translate-y-[2px] transition-all duration-150 cursor-pointer whitespace-nowrap"
              title="سکه طلا (تمرین درخت: +۵ سکه · درس دانشگاه/مدرسه: +۱۰ سکه · ماموریت روزانه: +۱۰ سکه)"
            >
              <HudCoinIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] sm:text-sm font-black text-amber-200 tabular-nums">
                {profile.coins}
              </span>
              <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-100">
                سکه
              </span>
              <span className="hidden sm:flex w-3.5 h-3.5 rounded-md bg-gradient-to-b from-amber-200 to-amber-400 text-slate-950 items-center justify-center shadow-sm">
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            </button>

            {/* Illustrated 2.5D Shop Stall Button */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenShop();
              }}
              aria-label="فروشگاه"
              className="group relative flex flex-col items-center justify-center min-w-[40px] min-h-[40px] w-10 h-10 min-[380px]:w-11 min-[380px]:h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] p-[2px] shadow-[0_3px_0_#78350f,0_6px_14px_rgba(4,24,16,0.45)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_#78350f] transition-all duration-150 cursor-pointer shrink-0"
              title="فروشگاه بذر و تزئینات باغ"
            >
              <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-[#112c23] via-[#0b1f18] to-[#06140f] border border-emerald-300/25 flex flex-col items-center justify-center px-0.5">
                <HudShopIcon className="w-4 h-4 min-[380px]:w-5 min-[380px]:h-5 sm:w-6 sm:h-6 group-hover:scale-105 transition-transform" />
                <span className="text-[7.5px] min-[380px]:text-[8px] sm:text-[9px] font-black text-amber-200 leading-none mt-0.5 whitespace-nowrap">
                  فروشگاه
                </span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          LEFT EDGE FLOATING MEDALLION BUTTONS (Mailbox, Chat & Group)
         ========================================================================= */}
      <aside
        className={`fixed top-16 sm:top-20 left-1.5 sm:left-3.5 z-30 flex-col gap-2 select-none pointer-events-auto ${
          currentTab === 'garden' || currentTab === 'map' ? 'flex' : 'hidden xl:flex'
        }`}
      >
        {/* 1. Angel Mailbox */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenMailbox();
          }}
          className="group relative min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 hover:brightness-110 border-2 border-[#f59e0b]/90 shadow-[0_3px_0_#78350f,0_6px_12px_rgba(4,24,16,0.4)] flex flex-col items-center justify-center cursor-pointer active:translate-y-[2px] active:shadow-[0_1px_0_#78350f] transition-all duration-150"
          title="صندوق پیام فرشته"
        >
          <HudMailboxIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-black text-amber-200 mt-0.5 leading-none">
            پیام‌ها
          </span>
          {unclaimedMailsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 border-2 border-white text-[9px] font-black text-white tabular-nums flex items-center justify-center shadow">
              {unclaimedMailsCount}
            </span>
          )}
        </button>

        {/* 2. Real-Time Multi-User Chat */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenChat();
          }}
          aria-label="چت کاربران"
          className="group relative min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 hover:brightness-110 border-2 border-[#f59e0b]/90 shadow-[0_3px_0_#78350f,0_6px_12px_rgba(4,24,16,0.4)] flex flex-col items-center justify-center cursor-pointer active:translate-y-[2px] active:shadow-[0_1px_0_#78350f] transition-all duration-150"
          title="چت عمومی، خصوصی و گروهی"
        >
          <HudChatIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-black text-amber-200 mt-0.5 leading-none">
            چت
          </span>
        </button>

        {/* 4. World Groups & Shared Guild Tent */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenGroups();
          }}
          aria-label="گروه‌ها"
          className="group relative min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 hover:brightness-110 border-2 border-[#f59e0b]/90 shadow-[0_3px_0_#78350f,0_6px_12px_rgba(4,24,16,0.4)] flex flex-col items-center justify-center cursor-pointer active:translate-y-[2px] active:shadow-[0_1px_0_#78350f] transition-all duration-150"
          title="گروه‌های جهان، دعوت‌ها و ارتقای ساختمان گروه"
        >
          <HudGroupTentIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-black text-amber-200 mt-0.5 leading-none">
            گروه
          </span>
          {groupNotificationCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 border-2 border-white text-[9px] font-black text-white tabular-nums flex items-center justify-center shadow">
              {groupNotificationCount}
            </span>
          )}
        </button>
      </aside>

      {/* =========================================================================
          BOTTOM-LEFT CORNER WORLD / GARDEN ORB TOGGLE (Enlarged in both views)
         ========================================================================= */}
      <footer className="fixed bottom-3 sm:bottom-4 left-3 sm:left-5 z-40 select-none pointer-events-none">
        <button
          onClick={() => {
            sound.playClick();
            onTabChange(currentTab === 'garden' ? 'map' : 'garden');
          }}
          aria-label={currentTab === 'garden' ? 'جهان' : 'باغ من'}
          className="group pointer-events-auto relative w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-full bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] p-[3px] sm:p-[3.5px] shadow-[0_5px_0_#78350f,0_12px_24px_rgba(4,24,16,0.55)] hover:brightness-105 hover:scale-105 active:translate-y-[2px] active:shadow-[0_2px_0_#78350f] transition-all duration-150 flex items-center justify-center cursor-pointer shrink-0"
          title={currentTab === 'garden' ? 'ورود به نقشه جهان' : 'بازگشت به باغ من'}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-b from-[#112c23] via-[#0b1f18] to-[#06140f] border-2 border-emerald-300/35 shadow-[inset_0_2px_6px_rgba(255,255,255,0.14)] flex flex-col items-center justify-center">
            {currentTab === 'garden' ? (
              <HudGlobeOrbIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 group-hover:scale-110 transition-transform" />
            ) : (
              <HudGardenNavIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-[10px] sm:text-xs md:text-[13px] font-black text-amber-200 leading-none mt-0.5 whitespace-nowrap">
              {currentTab === 'garden' ? 'جهان' : 'باغ من'}
            </span>
          </div>
        </button>
      </footer>
    </>
  );
});
