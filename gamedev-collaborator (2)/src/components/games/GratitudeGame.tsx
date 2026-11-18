import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../../utils/audio';
import { loadGratitudeNotes, saveGratitudeNotes, getTodayDateString } from '../../utils/storage';
import { GratitudeEntry, ExerciseCompletionReport } from '../../types/game';
import { Send, Heart, Feather, BookOpen, Calendar, Trash2, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GratitudeGameProps {
  onComplete: (
    success: boolean,
    report?: Partial<ExerciseCompletionReport>
  ) => void;
  onClose: () => void;
}

export const GratitudeGame: React.FC<GratitudeGameProps> = ({ onComplete, onClose }) => {
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write');
  const [notes, setNotes] = useState<GratitudeEntry[]>(() => loadGratitudeNotes());
  const [gratitudeText, setGratitudeText] = useState<string>('');
  const [isFlying, setIsFlying] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const startedAtMsRef = useRef<number>(Date.now());
  const startedAtIsoRef = useRef<string>(new Date().toISOString());
  const flyTimeoutRef = useRef<number | null>(null);
  const completeTimeoutRef = useRef<number | null>(null);

  const clearFlightTimeouts = () => {
    if (flyTimeoutRef.current !== null) {
      window.clearTimeout(flyTimeoutRef.current);
      flyTimeoutRef.current = null;
    }
    if (completeTimeoutRef.current !== null) {
      window.clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearFlightTimeouts();
    };
  }, []);

  const handleDeleteNote = (id: string) => {
    sound.playClick();
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    saveGratitudeNotes(updated);
  };

  const handleSubmitAndFly = () => {
    if (!gratitudeText.trim() || isFlying || isSubmitted) return;

    sound.playSparrow();
    setIsFlying(true);

    // Save in private local diary ONLY — never sent to public or research activity logs
    const newEntry: GratitudeEntry = {
      id: 'g_' + Date.now(),
      text: gratitudeText.trim(),
      date: getTodayDateString(),
      timestamp: Date.now(),
    };
    const currentNotes = loadGratitudeNotes();
    const nextNotes = [newEntry, ...currentNotes];
    saveGratitudeNotes(nextNotes);
    setNotes(nextNotes);

    const completedAtIso = new Date().toISOString();
    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - startedAtMsRef.current) / 1000)
    );

    clearFlightTimeouts();
    flyTimeoutRef.current = window.setTimeout(() => {
      flyTimeoutRef.current = null;
      sound.playWater();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      setIsSubmitted(true);
      completeTimeoutRef.current = window.setTimeout(() => {
        completeTimeoutRef.current = null;
        onComplete(true, {
          treeId: 'gratitude',
          completedReadingOrPractice: true,
          answeredCorrectly: false, // Self-expression only; no objective quiz or learning/mental-health claim
          overallSuccess: true,
          durationSeconds,
          startedAt: startedAtIsoRef.current,
          completedAt: completedAtIso,
        });
      }, 1500);
    }, 2000);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-[#040e0a]/92 animate-fadeIn"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border border-emerald-300/40 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-50 flex flex-col justify-between min-h-[500px] max-h-[90vh] overflow-hidden">
        {/* Soft Background Rays */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-emerald-300/20 pb-3 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-300 fill-rose-400/30" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-amber-200">درخت شکرگزاری</h2>
              <p className="text-[11px] text-rose-200">نامه آرامش، پرواز گنجشک و مرور یادداشت‌ها</p>
            </div>
          </div>
          <button
            onClick={() => {
              clearFlightTimeouts();
              sound.playClick();
              onClose();
            }}
            aria-label="بستن پنجره درخت شکرگزاری"
            className="w-8 h-8 rounded-full bg-[#143026] hover:bg-[#1a3f32] border border-emerald-300/30 text-slate-100 flex items-center justify-center text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Mode Switcher: Write Today vs View Previous Notes */}
        {!isFlying && !isSubmitted && (
          <div className="grid grid-cols-2 gap-2 mt-3 z-10 shrink-0 bg-[#071611] p-1 rounded-2xl border border-emerald-300/25">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('write');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'write'
                  ? 'bg-gradient-to-b from-rose-600 to-rose-700 text-white shadow-md'
                  : 'text-slate-200 hover:text-white hover:bg-[#143026]'
              }`}
            >
              <Feather className="w-3.5 h-3.5" />
              <span>نامه امروز</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setNotes(loadGratitudeNotes());
                setActiveTab('history');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 shadow-md'
                  : 'text-slate-200 hover:text-white hover:bg-[#143026]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>نامه‌های قبلی ({notes.length})</span>
            </button>
          </div>
        )}

        {/* Main Interaction Area */}
        <div className="flex-1 flex flex-col justify-center my-3 z-10 min-h-0">
          {isSubmitted ? (
            /* Celebration Screen */
            <div className="flex flex-col items-center text-center animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-pink-500/20 border-2 border-pink-400 flex items-center justify-center text-4xl mb-4 shadow-lg shadow-pink-900/50">
                ✨
              </div>
              <h3 className="text-xl font-black text-white mb-2">شکرگزاری شما به پرواز درآمد!</h3>
              <p className="text-sm text-slate-200 max-w-xs leading-relaxed">
                گنجشک نامه زیبایت را به آسمان برد. درخت شکرگزاری آبیاری شد و ۵ سکه طلا دریافت کردی.
              </p>
              <div className="mt-4 text-xs font-bold text-amber-200 bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-400/40">
                🪙 ۵+ سکه طلا به کیف پولت اضافه شد!
              </div>
            </div>
          ) : activeTab === 'history' ? (
            /* Previous Gratitude Notes History */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="mb-2 bg-[#0d211a] border border-emerald-300/25 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[11px] text-slate-200 shrink-0">
                <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>این یادداشت‌ها کاملاً خصوصی هستند و فقط خودت به آن‌ها دسترسی داری.</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[320px]">
                {notes.length > 0 ? (
                  notes.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-[#fffdf7] text-amber-950 p-3.5 rounded-2xl border border-amber-200 shadow-md flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-xs text-amber-900 mb-1.5 font-semibold border-b border-amber-200 pb-1">
                        <span className="flex items-center gap-1">
                          <Feather className="w-3 h-3 text-rose-700" />
                          نامه شکرگزاری
                        </span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3" />
                          {entry.date}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-normal leading-relaxed text-slate-900 font-['Vazirmatn'] py-1 whitespace-pre-wrap">
                        {entry.text}
                      </p>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(entry.id)}
                          className="p-1 rounded-lg text-rose-700 hover:text-rose-900 hover:bg-rose-50 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="حذف این یادداشت"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-200 bg-[#0d211a] rounded-2xl border border-emerald-300/25">
                    هنوز نامه‌ای ارسال نکرده‌اید. در بخش «نامه امروز» اولین شکرگزاری خود را بنویسید.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* Parchment Letter Paper in Center */}
              <div
                className={`relative w-full max-w-md bg-[#fffdf5] text-amber-950 p-5 rounded-2xl shadow-2xl border-2 border-[#e6dcbf] transition-all duration-700 ${
                  isFlying ? 'scale-0 translate-y-36 opacity-0 rotate-12' : 'scale-100 opacity-100'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-amber-900 mb-2 font-semibold">
                  <span className="flex items-center gap-1">
                    <Feather className="w-3.5 h-3.5" />
                    نامه خصوصی شکرگزاری امروز
                  </span>
                  <span>{getTodayDateString()}</span>
                </div>

                <textarea
                  value={gratitudeText}
                  onChange={(e) => setGratitudeText(e.target.value)}
                  placeholder="امروز بابت چه چیزی شکرگزار هستی؟ برای یک اتفاق ساده، حضور یک عزیز یا فرصت دوباره برای رشد بنویس..."
                  rows={4}
                  className="w-full bg-transparent resize-none focus:outline-none text-sm sm:text-base leading-relaxed text-slate-900 placeholder:text-stone-600 font-['Vazirmatn']"
                />

                <div className="flex justify-between items-center text-[10px] text-stone-700 mt-1 font-medium">
                  <span>🔒 این یادداشت کاملاً محرمانه است و فقط برای خودت ثبت می‌شود.</span>
                </div>
              </div>

              {/* The Sparrow (گنجشک) at Bottom */}
              <div
                onClick={handleSubmitAndFly}
                className={`mt-5 flex flex-col items-center transition-all duration-1000 cursor-pointer group ${
                  isFlying
                    ? '-translate-y-96 scale-75 opacity-0'
                    : 'translate-y-0 scale-100 hover:scale-105'
                }`}
              >
                {/* Cute Animated SVG Sparrow */}
                <div className="relative w-26 h-26 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl animate-float">
                    {/* Shadow */}
                    <ellipse cx="50" cy="85" rx="25" ry="5" fill="rgba(0,0,0,0.2)" />
                    {/* Tail feathers */}
                    <polygon points="20,55 5,45 10,60" fill="#78350f" />
                    {/* Body */}
                    <ellipse cx="48" cy="55" rx="24" ry="18" fill="#a16207" />
                    <ellipse cx="52" cy="58" rx="18" ry="14" fill="#fef08a" />
                    {/* Wing */}
                    <path
                      d="M35 52 C30 38 48 40 55 50 C48 58 38 60 35 52 Z"
                      fill="#78350f"
                      className="group-hover:animate-pulse"
                    />
                    {/* Head */}
                    <circle cx="70" cy="42" r="14" fill="#a16207" />
                    <circle cx="68" cy="46" r="10" fill="#fef08a" />
                    {/* Eye */}
                    <circle cx="74" cy="40" r="3" fill="#1e293b" />
                    <circle cx="75" cy="39" r="1" fill="#ffffff" />
                    {/* Beak */}
                    <polygon points="84,42 94,45 84,48" fill="#ea580c" />
                    {/* Attached tiny letter envelope if flying */}
                    {isFlying && (
                      <g transform="translate(65, 52) rotate(10)">
                        <rect width="18" height="12" rx="2" fill="#fff" stroke="#ca8a04" strokeWidth="1" />
                        <polygon points="0,0 9,6 18,0" fill="#fef9c3" />
                        <circle cx="9" cy="6" r="2" fill="#e11d48" />
                      </g>
                    )}
                  </svg>
                </div>

                <div className="mt-1 px-4 py-1.5 rounded-full bg-[#0d211a] border border-emerald-300/35 text-xs font-bold text-rose-200 flex items-center gap-1.5 shadow-lg group-hover:bg-[#143026] transition-colors">
                  <Send className="w-3.5 h-3.5 text-rose-300" />
                  <span>لمس گنجشک برای ارسال و آبیاری</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="border-t border-emerald-300/20 pt-3 flex items-center justify-between text-xs text-slate-300 shrink-0 z-10">
          <span>شکرگزاری باعث آرامش روانی و افزایش تمرکز مغز می‌شود.</span>
        </div>
      </div>
    </div>
  );
};
