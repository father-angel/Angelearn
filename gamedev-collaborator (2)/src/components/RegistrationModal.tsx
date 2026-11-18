import React, { useState } from 'react';
import { TreeData, TreeId, UserProfile } from '../types/game';
import { sound } from '../utils/audio';
import { markOnboardingCompleted } from '../utils/storage';
import { signInWithGoogleAccount } from '../firebase';
import {
  Sparkles,
  Droplets,
  Coins,
  ArrowLeft,
  ArrowRight,
  Play,
  X,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnboardingTutorialModalProps {
  trees: TreeData[];
  profile?: UserProfile;
  onUpdateProfile?: (updated: UserProfile) => void;
  onStartFirstActivity: (tree: TreeData) => void;
  onSkipTutorial: () => void;
}

const STARTER_TREES_PREVIEW: {
  id: TreeId;
  icon: string;
  title: string;
  shortDesc: string;
}[] = [
  {
    id: 'gratitude',
    icon: '🕊️',
    title: 'درخت شکرگزاری',
    shortDesc: 'ثبت یک جمله حس خوب روزانه (۳۰ ثانیه)',
  },
  {
    id: 'speed_reading',
    icon: '📖',
    title: 'درخت تندخوانی',
    shortDesc: 'تمرین کوتاه تقویت سرعت مطالعه و تمرکز',
  },
  {
    id: 'brain_math',
    icon: '🧮',
    title: 'درخت مغز',
    shortDesc: 'محاسبات سریع ذهنی برای چابکی ذهن',
  },
  {
    id: 'poetry',
    icon: '📜',
    title: 'درخت شعر',
    shortDesc: 'خوانش یک بیت ناب از شاعران پارسی',
  },
];

export const RegistrationModal: React.FC<OnboardingTutorialModalProps> = ({
  trees,
  profile,
  onUpdateProfile,
  onStartFirstActivity,
  onSkipTutorial,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTreeId, setSelectedTreeId] = useState<TreeId>('gratitude');
  const [demoWatered, setDemoWatered] = useState<boolean>(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState<boolean>(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (!profile || !onUpdateProfile || isSigningInGoogle) return;
    sound.playClick();
    setIsSigningInGoogle(true);
    setGoogleError(null);
    try {
      const syncedProfile = await signInWithGoogleAccount(profile);
      onUpdateProfile(syncedProfile);
      sound.playCoin();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('popup-closed-by-user')) {
        setGoogleError('خطا در اتصال به جیمیل. لطفاً پنجره پاپ‌آپ مرورگر را باز بگذارید.');
      }
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleNextStep = () => {
    sound.playClick();
    if (step < 3) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3);
    }
  };

  const handlePrevStep = () => {
    sound.playClick();
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleSkip = () => {
    sound.playClick();
    markOnboardingCompleted();
    onSkipTutorial();
  };

  const handleStartFirstExercise = () => {
    sound.playWater();
    markOnboardingCompleted();
    const targetTree =
      trees.find((t) => t.id === selectedTreeId && t.unlocked) ||
      trees.find((t) => t.unlocked) ||
      trees[0];
    onStartFirstActivity(targetTree);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-[#010e09]/92 animate-fadeIn select-none"
      style={{ zIndex: 10000, isolation: 'isolate' }}
    >
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/90 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.92),0_5px_0_#451a03,inset_0_1px_0_rgba(254,240,138,0.4)] text-slate-50 flex flex-col justify-between overflow-hidden p-4 sm:p-5">
        {/* Top Bar: Official Logo + Step Dots + Skip Button */}
        <div className="flex items-center justify-between border-b border-amber-400/35 pb-2.5">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/Neon-Lime_Winged_Book_Emblem_9f21e0f4.png"
              alt="لوگوی انجلرن"
              className="w-7 h-7 rounded-full object-cover border border-lime-400/70 shadow-sm shrink-0"
            />
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-[11px] font-black">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>گام {step} از ۳</span>
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setStep(idx as 1 | 2 | 3);
                  }}
                  aria-label={`مرحله ${idx}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    step === idx
                      ? 'w-6 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                      : idx < step
                      ? 'w-2 bg-emerald-400'
                      : 'w-2 bg-emerald-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="px-2.5 py-1 rounded-xl bg-[#0d211a] hover:bg-[#143026] border border-emerald-300/30 text-[11px] font-bold text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>رد کردن آموزش</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step Content Area */}
        <div className="py-4 flex flex-col items-center text-center min-h-[260px] justify-between">
          {/* ===============================================================
              STEP 1: INTRODUCE GARDEN & GOOGLE PLAY / GMAIL REGISTRATION
             =============================================================== */}
          {step === 1 && (
            <div className="w-full space-y-3 animate-fadeIn">
              <div className="w-18 h-18 mx-auto rounded-full p-0.5 bg-gradient-to-b from-[#a3e635] via-[#4ade80] to-[#15803d] shadow-[0_0_24px_rgba(163,230,53,0.4)] flex items-center justify-center">
                <img
                  src="/assets/aistudio/Neon-Lime_Winged_Book_Emblem_9f21e0f4.png"
                  alt="لوگوی بازی انجلرن"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-amber-200">
                  ۱. به انجلرن و باغ مهارت‌های خود خوش آمدید!
                </h2>
                <p className="text-xs text-slate-200 leading-relaxed mt-1">
                  برای ذخیره دائمی باغ، آواتار و سکه‌ها در فضای ابری، با{' '}
                  <strong className="text-amber-200">حساب گوگل (جیمیل / Google Play)</strong> وارد شوید یا به صورت مهمان ادامه دهید.
                </p>
              </div>

              {/* Google Play / Gmail Sign-In Card */}
              {profile && onUpdateProfile && (
                <div className="bg-[#0d211a] border-2 border-sky-400/60 rounded-2xl p-2.5 text-right shadow-md">
                  {profile.googleConnected ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldCheck className="w-5 h-5 text-emerald-300 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-black text-emerald-200 truncate">
                            متصل به جیمیل: {profile.name}
                          </div>
                          {profile.email && (
                            <div className="text-[10px] text-sky-200 truncate" dir="ltr">
                              {profile.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-emerald-500/25 text-emerald-200 border border-emerald-400/50 px-2 py-0.5 rounded-full shrink-0">
                        ذخیره ابری فعال ✓
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isSigningInGoogle}
                        className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs flex items-center justify-center gap-2 shadow-[0_3px_0_#94a3b8] active:translate-y-0.5 cursor-pointer transition-all disabled:bg-slate-700 disabled:text-slate-200"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                          <path
                            fill="#EA4335"
                            d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                          />
                          <path
                            fill="#4285F4"
                            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 12.3s.6 3.3 1.6 5.3l3.7-2.8z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 19.9 7.4 23 12 23z"
                          />
                        </svg>
                        <span>
                          {isSigningInGoogle
                            ? 'در حال اتصال به حساب گوگل...'
                            : 'ثبت‌نام / ورود سریع با جیمیل (Google Play)'}
                        </span>
                      </button>
                      {googleError && (
                        <div className="text-[10px] text-rose-200 text-center font-bold">
                          {googleError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Tree Preview Grid */}
              <div className="grid grid-cols-2 gap-2 text-right pt-1">
                {STARTER_TREES_PREVIEW.map((item) => {
                  const isActive = selectedTreeId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setSelectedTreeId(item.id);
                      }}
                      className={`p-2 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-2 ${
                        isActive
                          ? 'bg-[#1a4334] border-amber-300 shadow-md'
                          : 'bg-[#143026] border-emerald-300/25 hover:bg-[#1a3f32]'
                      }`}
                    >
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-300 leading-snug">
                          {item.shortDesc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===============================================================
              STEP 2: EXPLAIN EXERCISE & WATERING
             =============================================================== */}
          {step === 2 && (
            <div className="w-full space-y-3.5 animate-fadeIn">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-b from-cyan-400/25 to-cyan-900/60 border-2 border-cyan-400/60 flex items-center justify-center text-3xl shadow-inner">
                💧
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-cyan-200">
                  ۲. انجام تمرین کوتاه = آبیاری و رشد درخت
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mt-1">
                  هر روز با کلیک روی یک درخت و انجام تمرین کوتاه آن، درخت شما{' '}
                  <strong className="text-cyan-200">آبیاری</strong> می‌شود و از یک نهال کوچک به درختی تنومند تبدیل می‌گردد.
                </p>
              </div>

              {/* Interactive Mini Demo of Watering */}
              <div className="bg-[#0d211a] border border-emerald-300/25 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-right">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border transition-all duration-300 ${
                      demoWatered
                        ? 'bg-emerald-500/30 border-amber-300 scale-110'
                        : 'bg-[#071611] border-emerald-300/30'
                    }`}
                  >
                    {demoWatered ? '🌳' : '🌱'}
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">
                      {demoWatered ? 'درخت آبیاری و شاداب شد! ✨' : 'نهال آماده آبیاری روزانه'}
                    </div>
                    <div className="text-[11px] text-emerald-200 mt-0.5">
                      {demoWatered
                        ? 'رشد: ارتقا از نهال به درخت جوان (+۵ سکه)'
                        : 'برای امتحان کردن، دکمه آبیاری را بزنید'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playWater();
                    setDemoWatered(true);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                    demoWatered
                      ? 'bg-emerald-700/80 text-white border border-emerald-400/60'
                      : 'bg-gradient-to-r from-cyan-300 to-sky-300 text-slate-950 shadow-lg animate-pulse'
                  }`}
                >
                  <Droplets className="w-3.5 h-3.5" />
                  <span>{demoWatered ? 'آبیاری شد ✓' : 'امتحان آبیاری'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ===============================================================
              STEP 3: INTRODUCE COINS, BUYING NEW SEEDLINGS & START FIRST ACTIVITY
             =============================================================== */}
          {step === 3 && (
            <div className="w-full space-y-3 animate-fadeIn">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-b from-amber-400/25 to-amber-900/60 border-2 border-amber-400/60 flex items-center justify-center text-3xl shadow-inner">
                🪙
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-amber-200">
                  ۳. دریافت سکه و خرید نهال‌های جدید
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mt-1">
                  با هر آبیاری <strong className="text-amber-200">۵ سکه</strong> می‌گیرید و می‌توانید از فروشگاه، نهال‌های جدید (مثل{' '}
                  <strong className="text-emerald-200">تنفس عمیق، حافظه و بینا</strong>) بکارید.
                </p>
              </div>

              {/* Pick First Activity to Start Right Now */}
              <div className="bg-[#0d211a] border border-amber-400/50 rounded-2xl p-3 text-right space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-200 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-300" />
                    <span>اولین فعالیت خود را برای شروع انتخاب کنید:</span>
                  </span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full font-bold">
                    پاداش: +۵ سکه
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {STARTER_TREES_PREVIEW.map((item) => {
                    const isSelected = selectedTreeId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setSelectedTreeId(item.id);
                        }}
                        className={`p-2 rounded-xl border text-right flex items-center gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-gradient-to-l from-[#1a4334] to-[#0f2920] border-amber-300 text-white shadow'
                            : 'bg-[#143026] border-emerald-300/25 text-slate-200 hover:bg-[#1a3f32]'
                        }`}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-xs font-black truncate">{item.title}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 mr-auto shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="border-t border-emerald-300/20 pt-3 flex items-center justify-between gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-3.5 py-2.5 rounded-xl bg-[#0d211a] hover:bg-[#143026] border border-emerald-300/25 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>قبلی</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSkip}
              className="px-3.5 py-2.5 rounded-xl bg-[#0d211a] hover:bg-[#143026] border border-emerald-300/25 text-xs font-bold text-slate-200 cursor-pointer transition-colors"
            >
              ورود مستقیم به باغ
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-[#fef08a] shadow-[0_3px_0_#78350f] cursor-pointer transition-transform hover:scale-[1.01]"
            >
              <span>مرحله بعد ({step + 1} از ۳)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartFirstExercise}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 hover:from-emerald-200 hover:to-amber-100 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 border-2 border-white shadow-[0_4px_18px_rgba(52,211,153,0.45)] cursor-pointer transition-transform hover:scale-[1.01]"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>شروع اولین فعالیت و آبیاری 🌱</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
