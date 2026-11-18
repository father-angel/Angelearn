import React, { useState } from 'react';
import { QuestItem, UserProfile } from '../types/game';
import { sound } from '../utils/audio';
import { CheckCircle2, Gift, Sparkles, Award, Zap, Trophy, X } from 'lucide-react';

interface QuestsModalProps {
  quests: QuestItem[];
  profile: UserProfile;
  onClaimQuest: (questId: string) => void;
  onClose: () => void;
  onStartQuestAction: (quest: QuestItem) => void;
}

export const QuestsModal: React.FC<QuestsModalProps> = ({
  quests,
  profile,
  onClaimQuest,
  onClose,
  onStartQuestAction,
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'main' | 'growth'>('daily');

  const filteredQuests = quests.filter((q) => q.category === activeTab);
  const completedCount = quests.filter((q) => q.completed).length;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center p-1.5 sm:p-4 bg-black/88 animate-fadeIn"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/90 rounded-[28px] p-3.5 sm:p-6 shadow-[0_18px_50px_rgba(0,0,0,0.9),0_4px_0_#451a03] text-slate-50 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          aria-label="بستن پنجره ماموریت‌ها"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#143026] hover:bg-[#1a3e31] border border-emerald-300/30 text-slate-100 flex items-center justify-center text-sm font-bold cursor-pointer transition-transform hover:scale-110"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-300 to-yellow-400 flex items-center justify-center text-2xl shadow-lg shadow-amber-950/50">
            📋
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              ماموریت‌های رشد و شکوفایی
              <span className="text-[11px] bg-amber-500/20 text-amber-200 font-bold px-2 py-0.5 rounded-full border border-amber-300/45">
                {completedCount} از {quests.length} تکمیل شده
              </span>
            </h2>
            <p className="text-xs text-slate-200 mt-0.5">
              با انجام ماموریت‌های روزانه، سکه طلا دریافت کنید (هر ماموریت روزانه: +۱۰ سکه).
            </p>
          </div>
        </div>

        {/* Milestone Progress Chest Bar */}
        <div className="bg-[#143026] border border-emerald-300/25 rounded-2xl p-3 mb-4">
          <div className="flex justify-between items-center text-xs text-slate-100 mb-1.5 font-bold">
            <span>صندوق پیشرفت هفتگی</span>
            <span className="text-amber-300">{Math.round((completedCount / quests.length) * 100)}%</span>
          </div>
          <div className="w-full bg-[#071611] h-2.5 rounded-full overflow-hidden border border-emerald-300/25">
            <div
              className="bg-gradient-to-r from-amber-400 to-yellow-300 h-full rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / quests.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-300 mt-1.5">
            <span>🎁 جایزه مرحله ۱</span>
            <span>🪙 صندوق نقره‌ای</span>
            <span>👑 صندوق طلایی حکمت</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex bg-[#071611] p-1 rounded-2xl border border-emerald-300/25 mb-3 text-xs">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('daily');
            }}
            className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-950 shadow'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            روزانه
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('main');
            }}
            className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'main'
                ? 'bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-950 shadow'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            اصلی
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('growth');
            }}
            className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'growth'
                ? 'bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-950 shadow'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            دستاوردهای رشد
          </button>
        </div>

        {/* Quest List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredQuests.map((quest) => {
            const isFinished = quest.current >= quest.target || quest.completed;

            return (
              <div
                key={quest.id}
                className="bg-[#143026] border border-emerald-300/25 rounded-2xl p-3 flex items-center justify-between gap-3 hover:border-amber-300/50 transition-all"
              >
                <div className="flex items-start gap-2.5 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-0.5 ${
                      quest.claimed
                        ? 'bg-[#0d211a] text-emerald-300 border border-emerald-300/25'
                        : isFinished
                        ? 'bg-amber-500/20 text-amber-200 border border-amber-300/50'
                        : 'bg-[#071611] text-emerald-200 border border-emerald-300/20'
                    }`}
                  >
                    {quest.claimed ? '✓' : isFinished ? '🎁' : '📜'}
                  </div>

                  <div className="flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      {quest.title}
                    </h4>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-24 bg-[#071611] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (quest.current / quest.target) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-200 font-medium">
                        {quest.current}/{quest.target}
                      </span>
                    </div>

                    {/* Single Unified Coin Reward */}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] font-bold">
                      <span className="text-amber-300 flex items-center gap-1">
                        🪙 +{quest.rewardCoins} سکه
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div>
                  {quest.claimed ? (
                    <span className="text-[11px] text-slate-200 bg-[#0d211a] px-3 py-1.5 rounded-xl border border-emerald-300/25 font-semibold">
                      دریافت شد
                    </span>
                  ) : isFinished ? (
                    <button
                      onClick={() => {
                        sound.playCoin();
                        onClaimQuest(quest.id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs shadow-md shadow-amber-950/60 cursor-pointer animate-pulse hover:scale-105 transition-transform"
                    >
                      دریافت پاداش
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        sound.playClick();
                        onStartQuestAction(quest);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#1b4032] hover:bg-[#235240] text-white font-bold text-xs cursor-pointer border border-emerald-300/35 hover:scale-105 transition-transform"
                    >
                      برو به انجام
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
