import React, { useState, useEffect, useMemo } from 'react';
import { SpeedReadingContent } from '../types';
import { computeProgressiveWpm, evaluateChoiceAnswer } from '../engine';
import { sound } from '../../utils/audio';
import {
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface SpeedReadingUniGameProps {
  content: SpeedReadingContent;
  mode: 'practice' | 'exam';
  onFinish: (accuracyPercent: number, durationSeconds: number) => void;
  onBack: () => void;
}

export const SpeedReadingUniGame: React.FC<SpeedReadingUniGameProps> = ({
  content,
  mode,
  onFinish,
  onBack,
}) => {
  const words = useMemo(
    () => content.passageText.trim().split(/\s+/).filter(Boolean),
    [content.passageText]
  );

  const [phase, setPhase] = useState<'rsvp' | 'comprehension' | 'results'>('rsvp');
  const [wordIndex, setWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [customStartWpm, setCustomStartWpm] = useState(content.startWpm || 150);
  const [customEndWpm, setCustomEndWpm] = useState(content.targetEndWpm || 350);

  const [qIdx, setQIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [elapsedSec, setElapsedSec] = useState(0);

  const progressRatio = words.length > 1 ? wordIndex / (words.length - 1) : 0;
  const currentWpm = computeProgressiveWpm(
    progressRatio,
    customStartWpm,
    customEndWpm,
    content.maxCeilingWpm || 600
  );

  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden) {
        setIsPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, []);

  useEffect(() => {
    if (!isPlaying || phase !== 'rsvp') return;
    const intervalMs = Math.max(100, Math.round(60000 / currentWpm));
    const timer = setTimeout(() => {
      if (wordIndex + 1 < words.length) {
        setWordIndex((i) => i + 1);
      } else {
        setIsPlaying(false);
        setPhase('comprehension');
      }
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [isPlaying, phase, wordIndex, words.length, currentWpm]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && phase !== 'results') {
        setElapsedSec((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const currentQuestion = content.questions[qIdx];

  const handleSelectAnswer = (optId: string) => {
    if (mode === 'practice' && selectedOpt !== null) return;
    sound.playClick();
    setSelectedOpt(optId);
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optId }));
    if (
      mode === 'practice' &&
      evaluateChoiceAnswer(optId, currentQuestion.correctOptionId)
    ) {
      sound.playCoin();
    }
  };

  const handleNextQuestion = () => {
    sound.playClick();
    if (qIdx + 1 < content.questions.length) {
      setQIdx((i) => i + 1);
      setSelectedOpt(null);
    } else {
      const total = content.questions.length;
      let correct = 0;
      content.questions.forEach((q) => {
        const chosen =
          q.id === currentQuestion.id ? selectedOpt || answers[q.id] : answers[q.id];
        if (chosen && evaluateChoiceAnswer(chosen, q.correctOptionId)) {
          correct++;
        }
      });
      const comprehensionScore =
        total > 0 ? Math.round((correct / total) * 100) : 100;
      setPhase('results');
      onFinish(comprehensionScore, Math.max(1, elapsedSec));
    }
  };

  const handleReplaySpeedReading = (newStartWpm?: number) => {
    sound.playClick();
    if (newStartWpm) setCustomStartWpm(newStartWpm);
    setWordIndex(0);
    setIsPlaying(false);
    setQIdx(0);
    setSelectedOpt(null);
    setAnswers({});
    setPhase('rsvp');
  };

  const totalQ = content.questions.length;
  const correctQ = content.questions.filter((q) => {
    const chosen = answers[q.id];
    return chosen && evaluateChoiceAnswer(chosen, q.correctOptionId);
  }).length;
  const finalComprehension = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 100;

  return (
    <div className="w-full max-w-3xl mx-auto bg-gradient-to-b from-[#0c2233] via-[#081825] to-[#050f18] border-2 border-[#f59e0b]/90 rounded-[28px] p-3.5 sm:p-6 shadow-[0_16px_44px_rgba(0,0,0,0.88),0_4px_0_#451a03,inset_0_1px_0_rgba(254,240,138,0.3)] text-slate-50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-sky-500/45 pb-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-cyan-300 to-teal-300 text-slate-950 flex items-center justify-center text-2xl border-2 border-cyan-100 shadow-[0_3px_0_#083344] shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm sm:text-base font-black text-amber-200 truncate">
                {content.title}
              </h3>
              {content.isDemo && (
                <span className="text-[10px] font-black bg-amber-950/90 text-amber-200 border border-amber-400/60 px-2 py-0.5 rounded-full">
                  نمونه آزمایشی (Demo)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-200 mt-0.5">
              قالب ۵: تندخوانی و درک مطلب دانشگاهی (۴۵٪ بازی‌وارسازی · مستقل از درخت تندخوانی باغ)
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#112d42] hover:bg-[#183d59] border-2 border-sky-400/55 text-slate-100 text-xs font-black flex items-center gap-1.5 shadow-[0_3px_0_#050f18] active:translate-y-0.5 cursor-pointer shrink-0"
        >
          <span>بازگشت به درس</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* PHASE 1: ILLUMINATED RSVP WORD-BY-WORD DISPLAY */}
      {phase === 'rsvp' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-100 bg-[#112d42] p-3.5 rounded-2xl border-2 border-sky-500/45">
            <span className="font-black text-amber-200">{content.passageTitle}</span>
            <div className="flex items-center gap-3">
              <span className="text-amber-300 font-black">
                سرعت فعلی: {currentWpm} کلمه/دقیقه
              </span>
              <span className="font-bold">
                واژه {wordIndex + 1} از {words.length}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-[#061521] rounded-full overflow-hidden border border-sky-500/50 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-amber-300 transition-all duration-150"
              style={{ width: `${Math.round(progressRatio * 100)}%` }}
            />
          </div>

          {/* Stable Illuminated Focus Display */}
          <div className="relative h-44 sm:h-52 rounded-3xl bg-[#061521] border-2 border-[#f59e0b]/90 shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center p-4">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-amber-300" />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-amber-300" />

            <div
              className="text-2xl sm:text-4xl font-black text-amber-100 tracking-normal text-center select-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
              style={{ fontFamily: "'Vazirmatn', sans-serif" }}
            >
              {words[wordIndex] || ''}
            </div>
          </div>

          {/* Speed & Playback Controls */}
          <div className="bg-[#112d42] border-2 border-sky-500/45 rounded-3xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <button
                onClick={() => {
                  sound.playClick();
                  setIsPlaying((p) => !p);
                }}
                className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 border-2 border-[#fef08a] shadow-[0_4px_0_#78350f] active:translate-y-0.5 cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-slate-950" />
                    <span>توقف موقت (Pause)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>{wordIndex === 0 ? 'شروع نمایش کلمات' : 'ادامه مطالعه'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setIsPlaying(false);
                  setPhase('comprehension');
                }}
                className="min-h-[46px] px-4 py-2 rounded-2xl bg-[#061521] hover:bg-[#183d59] border-2 border-sky-400/55 text-slate-100 font-black text-xs shadow-[0_3px_0_#050f18] active:translate-y-0.5 cursor-pointer"
              >
                ورود به سوالات درک مطلب ←
              </button>
            </div>

            {mode === 'practice' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-sky-500/40 text-xs">
                <div>
                  <label className="block text-cyan-200 font-black mb-1">
                    سرعت شروع: {customStartWpm} WPM
                  </label>
                  <input
                    type="range"
                    min={100}
                    max={400}
                    step={25}
                    value={customStartWpm}
                    onChange={(e) => setCustomStartWpm(Number(e.target.value))}
                    className="w-full accent-cyan-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-amber-200 font-black mb-1">
                    سرعت پایانی هدف: {customEndWpm} WPM (سقف ۶۰۰)
                  </label>
                  <input
                    type="range"
                    min={150}
                    max={600}
                    step={25}
                    value={customEndWpm}
                    onChange={(e) => setCustomEndWpm(Number(e.target.value))}
                    className="w-full accent-amber-300 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PHASE 2: COMPREHENSION QUESTIONS */}
      {phase === 'comprehension' && currentQuestion && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-200 font-black">
            <span>
              سنجش درک مطلب: سوال {qIdx + 1} از {content.questions.length}
            </span>
            <button
              onClick={() => handleReplaySpeedReading()}
              className="text-amber-200 underline cursor-pointer"
            >
              بازخوانی مجدد متن ⚡
            </button>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-[#061521] border-2 border-sky-400/60 text-sm sm:text-base font-black text-slate-50 leading-8">
            {currentQuestion.question}
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedOpt === opt.id;
              const isCorrect = opt.id === currentQuestion.correctOptionId;
              const showFeedback = mode === 'practice' && selectedOpt !== null;

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectAnswer(opt.id)}
                  className={`min-h-[50px] p-3.5 rounded-2xl border-2 text-right text-xs sm:text-sm leading-relaxed flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    showFeedback
                      ? isCorrect
                        ? 'bg-emerald-700 border-emerald-200 text-slate-50 font-black shadow-[0_3px_0_#064e3b]'
                        : isSelected
                        ? 'bg-rose-900 border-rose-400 text-rose-50 shadow-[0_3px_0_#4c0519]'
                        : 'bg-[#061521] border-sky-700/60 text-slate-200'
                      : isSelected
                      ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-white font-black shadow-[0_3px_0_#78350f]'
                      : 'bg-[#112d42] hover:bg-[#183d59] border-sky-500/55 text-slate-100 shadow-[0_3px_0_#050f18]'
                  }`}
                >
                  <span>
                    {idx + 1}. {opt.text}
                  </span>
                  {showFeedback && isCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                  )}
                  {showFeedback && isSelected && !isCorrect && (
                    <XCircle className="w-4 h-4 text-rose-200 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {mode === 'practice' && selectedOpt !== null && (
            <div className="p-4 rounded-2xl bg-[#061521] border-2 border-sky-400/55 text-xs sm:text-sm text-slate-100 leading-7">
              {currentQuestion.explanation}
            </div>
          )}

          {selectedOpt !== null && (
            <button
              onClick={handleNextQuestion}
              className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs sm:text-sm border-2 border-[#fef08a] shadow-[0_4px_0_#78350f] active:translate-y-0.5 cursor-pointer"
            >
              {qIdx + 1 < content.questions.length
                ? 'سوال بعدی ←'
                : 'مشاهده کارنامه سرعت و درک مطلب 🏆'}
            </button>
          )}
        </div>
      )}

      {/* PHASE 3: SEPARATE SPEED & COMPREHENSION REPORT */}
      {phase === 'results' && (
        <div className="text-center space-y-4 py-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 flex items-center justify-center text-4xl border-2 border-[#fef08a] shadow-[0_4px_0_#78350f]">
            ⚡
          </div>
          <h4 className="text-lg font-black text-amber-200">
            کارنامه تندخوانی و درک مطلب دانشگاهی
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#061521] border-2 border-sky-500/50">
              <span className="text-slate-200 block mb-1">بازه سرعت مطالعه</span>
              <strong className="text-base text-amber-300 font-black">
                {customStartWpm} تا {customEndWpm} WPM
              </strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#061521] border-2 border-sky-500/50">
              <span className="text-slate-200 block mb-1">امتیاز درک مطلب</span>
              <strong className="text-base text-emerald-300 font-black">
                {finalComprehension}٪ ({correctQ}/{totalQ})
              </strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#061521] border-2 border-sky-500/50">
              <span className="text-slate-200 block mb-1">عملکرد کلی</span>
              <strong className="text-base text-slate-50 font-black">
                {finalComprehension >= 80 ? 'عالی و متمرکز 🌟' : 'نیازمند مرور مجدد 📖'}
              </strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={() => handleReplaySpeedReading(Math.max(125, customStartWpm - 25))}
              className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-[#112d42] hover:bg-[#183d59] border-2 border-sky-400/55 text-slate-100 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_3px_0_#050f18] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تکرار با سرعت متعادل‌تر</span>
            </button>
            <button
              onClick={onBack}
              className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs border-2 border-[#fef08a] shadow-[0_3px_0_#78350f] cursor-pointer"
            >
              بازگشت به درس
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
