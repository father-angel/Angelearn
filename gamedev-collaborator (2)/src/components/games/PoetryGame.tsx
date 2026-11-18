import React, { useState, useEffect, useRef } from 'react';
import {
  FAMOUS_IRANIAN_POETS,
  IranianPoet,
  POETRY_MIN_READING_SECONDS,
  isPoetryReadingComplete,
} from '../../game/poetryData';
import { ExerciseCompletionReport } from '../../types/game';
import { sound } from '../../utils/audio';
import {
  BookOpen,
  Feather,
  ArrowRight,
  Clock,
  CheckCircle,
  Sparkles,
  RefreshCw,
  ChevronLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PoetryGameProps {
  onComplete: (success: boolean, report?: Partial<ExerciseCompletionReport>) => void;
  onClose: () => void;
}

export const PoetryGame: React.FC<PoetryGameProps> = ({ onComplete, onClose }) => {
  const [sessionStartedAt] = useState<string>(() => new Date().toISOString());
  const [selectedPoet, setSelectedPoet] = useState<IranianPoet | null>(null);
  const [activePoemIndex, setActivePoemIndex] = useState<number>(0);
  const [secondsOnPoemPage, setSecondsOnPoemPage] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  // Count seconds only while the user is inside a selected poet's poem page (paused when tab is hidden)
  useEffect(() => {
    if (selectedPoet) {
      timerRef.current = setInterval(() => {
        if (!document.hidden) {
          setSecondsOnPoemPage((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedPoet]);

  const handleSelectPoet = (poet: IranianPoet) => {
    sound.playClick();
    setSelectedPoet(poet);
    setActivePoemIndex(0);
    setSecondsOnPoemPage(0);
  };

  const handleBackToPoetsList = () => {
    sound.playClick();
    setSelectedPoet(null);
    setSecondsOnPoemPage(0);
  };

  const handleNextPoemFromPoet = () => {
    if (!selectedPoet) return;
    sound.playClick();
    setActivePoemIndex((prev) => (prev + 1) % selectedPoet.poems.length);
  };

  const canWaterTree = isPoetryReadingComplete(
    secondsOnPoemPage,
    selectedPoet ? selectedPoet.id : null
  );

  const handleWaterPoetryTree = () => {
    if (!canWaterTree || !selectedPoet || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const completedAt = new Date().toISOString();
    const report: Partial<ExerciseCompletionReport> = {
      treeId: 'poetry',
      completedReadingOrPractice: true,
      answeredCorrectly: true,
      overallSuccess: true,
      accuracyPercent: 100,
      durationSeconds: secondsOnPoemPage,
      startedAt: sessionStartedAt,
      completedAt,
    };

    sound.playWater();
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.55 } });
    onComplete(true, report);
  };

  const currentPoem =
    selectedPoet?.poems[activePoemIndex] || selectedPoet?.poems[0] || null;
  const remainingSeconds = Math.max(0, POETRY_MIN_READING_SECONDS - secondsOnPoemPage);
  const progressPercent = Math.min(
    100,
    Math.round((secondsOnPoemPage / POETRY_MIN_READING_SECONDS) * 100)
  );

  return (
    <div
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-[#040e0a]/90 backdrop-blur-md animate-fadeIn overflow-y-auto font-['Vazirmatn',sans-serif]"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0d2626] via-[#081a1b] to-[#051011] border-2 border-teal-300/50 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-50 flex flex-col justify-between min-h-[560px]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-teal-300/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-300 to-emerald-300 text-slate-950 flex items-center justify-center text-xl shadow-lg border border-white/70 shrink-0">
              📜
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-200 flex items-center gap-2 flex-wrap">
                <span>درخت شعر و ادب پارسی</span>
                <span className="text-[11px] bg-amber-400/20 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-400/40 font-bold">
                  ۱۰ شاعر نامدار ایران
                </span>
              </h2>
              <p className="text-[11px] text-slate-200 mt-0.5">
                شاعر دلخواه خود را انتخاب کنید و حداقل ۱۰ ثانیه در صفحه شعر تأمل نمایید تا درخت آبیاری شود
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#123333] hover:bg-[#194545] border border-teal-300/30 text-slate-100 flex items-center justify-center text-sm font-bold cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* =====================================================================
            VIEW 1: LIST OF 10 FAMOUS IRANIAN POETS (Clear, High-Contrast Names)
           ===================================================================== */}
        {!selectedPoet ? (
          <div className="flex-1 flex flex-col justify-between my-3.5 space-y-3 animate-fadeIn">
            <div className="p-3 rounded-2xl bg-[#123333] border border-teal-300/30 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-100 font-bold">
                <Feather className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  روی نام هر یک از ۱۰ شاعر بزرگ ایرانی کلیک کنید تا شعر منتخب او نمایش داده شود:
                </span>
              </div>
            </div>

            {/* 10 Poets List Grid — Full-width readable poet names with zero clipping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[390px] overflow-y-auto pl-1">
              {FAMOUS_IRANIAN_POETS.map((poet, idx) => (
                <button
                  key={poet.id}
                  type="button"
                  onClick={() => handleSelectPoet(poet)}
                  className="group w-full text-right p-3.5 rounded-2xl bg-[#102d2d] hover:bg-[#163d3d] border-2 border-teal-400/40 hover:border-amber-300 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-md hover:shadow-xl"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {/* Poet Emblem & Number Badge */}
                    <div
                      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-inner border border-amber-300/40 group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: `${poet.accentColor}25` }}
                    >
                      <span className="text-xl leading-none">{poet.icon}</span>
                      <span className="text-[10px] font-black text-amber-200 mt-0.5">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Poet Name, Masterpiece & Title (Never Truncated) */}
                    <div className="flex-1 text-right">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base sm:text-lg font-black text-amber-200 group-hover:text-amber-100 leading-snug">
                          {poet.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#081a1b] text-teal-100 border border-teal-300/35">
                          {poet.masterpiece}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-white mt-0.5 leading-snug">
                        {poet.fullName}
                      </div>

                      <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                        {poet.title}
                      </div>
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-xl bg-amber-400/20 group-hover:bg-amber-400 text-amber-200 group-hover:text-slate-950 flex items-center justify-center shrink-0 border border-amber-400/40 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>

            {/* Footer Info */}
            <div className="border-t border-teal-300/20 pt-3 flex items-center justify-between text-xs text-slate-300">
              <span>با انتخاب هر شاعر، وارد تالار شعر او می‌شوید.</span>
              <span className="font-bold text-amber-200">
                پاداش آبیاری روزانه: +۵ سکه
              </span>
            </div>
          </div>
        ) : (
          /* ===================================================================
             VIEW 2: SELECTED POET'S POEM DISPLAY & 10-SECOND CONTEMPLATION TIMER
             =================================================================== */
          <div className="flex-1 flex flex-col justify-between my-4 space-y-4 animate-fadeIn">
            {/* Selected Poet Header & Back Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#123333] p-3 rounded-2xl border border-teal-300/30">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{selectedPoet.icon}</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-black text-amber-200">
                      {selectedPoet.fullName}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#081a1b] text-teal-100 border border-teal-300/35">
                      {selectedPoet.century}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-200 mt-0.5">
                    {selectedPoet.title} • اثر برجسته: {selectedPoet.masterpiece}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackToPoetsList}
                className="px-3 py-1.5 rounded-xl bg-[#081a1b] hover:bg-[#194545] border border-teal-300/35 text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>بازگشت به فهرست ۱۰ شاعر</span>
              </button>
            </div>

            {/* Ornate Persian Illuminated Poetry Frame (تذهیب فیروزه‌ای و طلایی) */}
            {currentPoem && (
              <div className="relative rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-[#102e2e] via-[#091c1c] to-[#0c2626] border-2 border-amber-400/75 shadow-[inset_0_0_40px_rgba(20,184,166,0.16)] flex flex-col items-center text-center overflow-hidden">
                {/* Corner Arabesque Accents */}
                <div className="absolute top-2 right-3 text-amber-300/65 text-lg select-none pointer-events-none">
                  ❈
                </div>
                <div className="absolute top-2 left-3 text-amber-300/65 text-lg select-none pointer-events-none">
                  ❈
                </div>
                <div className="absolute bottom-2 right-3 text-amber-300/65 text-lg select-none pointer-events-none">
                  ❈
                </div>
                <div className="absolute bottom-2 left-3 text-amber-300/65 text-lg select-none pointer-events-none">
                  ❈
                </div>

                <span className="mb-3 px-3 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/50 text-amber-200 text-[11px] font-black flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>موضوع: {currentPoem.theme}</span>
                </span>

                {/* Couplets / Short Poem Lines */}
                <div className="w-full max-w-lg space-y-2.5 my-2">
                  {currentPoem.lines.map((hemistich, idx) => (
                    <p
                      key={idx}
                      className={`text-base sm:text-lg font-black leading-relaxed tracking-wide ${
                        idx % 2 === 0 ? 'text-amber-100' : 'text-teal-100'
                      }`}
                    >
                      « {hemistich} »
                    </p>
                  ))}
                </div>

                {/* Wisdom & Reflection Note */}
                <div className="mt-4 pt-3 border-t border-teal-300/20 w-full text-xs text-slate-200 leading-relaxed">
                  <strong className="text-amber-200 ml-1">پیام حکمت:</strong>
                  {currentPoem.reflection}
                </div>

                {/* Switch to Next Poem of Same Poet */}
                {selectedPoet.poems.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNextPoemFromPoet}
                    className="mt-3 px-3 py-1 rounded-xl bg-[#123333] hover:bg-[#194545] border border-teal-300/35 text-slate-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 text-amber-300" />
                    <span>
                      نمایش شعر دیگر از {selectedPoet.name} ({activePoemIndex + 1}/
                      {selectedPoet.poems.length})
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* 10-Second Reading & Contemplation Timer Box */}
            <div className="bg-[#123333] p-3.5 rounded-2xl border border-teal-300/30 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-100 font-bold">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span>
                    مدت حضور و تأمل در صفحه شعر:{' '}
                    <strong className="text-amber-200">{secondsOnPoemPage} ثانیه</strong>{' '}
                    از {POETRY_MIN_READING_SECONDS} ثانیه
                  </span>
                </div>

                {canWaterTree ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400 text-emerald-200 font-black text-[11px]">
                    ✓ ۱۰ ثانیه کامل شد! آماده آبیاری درخت شعر
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold text-[11px]">
                    {remainingSeconds} ثانیه دیگر تا فعال شدن آبیاری...
                  </span>
                )}
              </div>

              <div className="w-full h-2.5 bg-[#081a1b] rounded-full overflow-hidden border border-teal-300/25">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-amber-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="border-t border-teal-300/20 pt-3 flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleBackToPoetsList}
                className="px-4 py-2.5 rounded-xl bg-[#123333] hover:bg-[#194545] border border-teal-300/30 text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>انتخاب شاعر دیگر</span>
              </button>

              <button
                type="button"
                onClick={handleWaterPoetryTree}
                disabled={!canWaterTree}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer disabled:bg-none disabled:bg-slate-800/90 disabled:text-slate-300 disabled:border disabled:border-slate-600/80 disabled:cursor-not-allowed transition-transform hover:scale-[1.01]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {canWaterTree
                    ? 'آبیاری درخت شعر و دریافت پاداش (+۵ سکه)'
                    : `حداقل ۱۰ ثانیه در صفحه شعر بمانید (${secondsOnPoemPage}/${POETRY_MIN_READING_SECONDS})`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
