import React from 'react';
import { MailItem } from '../types/game';
import { sound } from '../utils/audio';
import { Mail, CheckCircle2, Gift, X } from 'lucide-react';

interface MailboxModalProps {
  mails: MailItem[];
  onClaimMail: (mailId: string) => void;
  onClose: () => void;
}

export const MailboxModal: React.FC<MailboxModalProps> = ({
  mails,
  onClaimMail,
  onClose,
}) => {
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
          aria-label="بستن صندوق نامه‌ها"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#143026] hover:bg-[#1a3e31] border border-emerald-300/30 text-slate-100 flex items-center justify-center text-sm font-bold cursor-pointer transition-transform hover:scale-110"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-teal-500 flex items-center justify-center text-2xl shadow-lg shadow-sky-950/70">
            ✉️
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              صندوق پیام‌ها و نامه‌های فرشتگان
            </h2>
            <p className="text-xs text-slate-200 mt-0.5">
              پیام‌های سیستمی، هدایای منتورها و جوایز رویدادها
            </p>
          </div>
        </div>

        {/* Mail List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {mails.map((mail) => (
            <div
              key={mail.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                mail.isClaimed
                  ? 'bg-[#0d211a] border-emerald-300/20'
                  : 'bg-[#143026] border-amber-300/45 shadow-lg'
              }`}
            >
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-bold text-teal-200 flex items-center gap-1.5">
                  <span className="text-sm">🕊️</span> {mail.sender}
                </span>
                <span className="text-[10px] text-slate-300">{mail.date}</span>
              </div>

              <h4 className="text-xs sm:text-sm font-black text-white mb-1">
                {mail.title}
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed mb-3">
                {mail.content}
              </p>

              {/* Reward and Claim */}
              {mail.rewardCoins && mail.rewardCoins > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-emerald-300/20">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="text-amber-300">🪙 +{mail.rewardCoins} سکه</span>
                  </div>

                  {mail.isClaimed ? (
                    <span className="text-[11px] text-slate-300 font-semibold">
                      دریافت شد ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        sound.playCoin();
                        onClaimMail(mail.id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs shadow-md cursor-pointer hover:scale-105 transition-transform"
                    >
                      دریافت هدیه
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
