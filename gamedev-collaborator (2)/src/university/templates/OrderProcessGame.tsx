import React, { useState, useEffect, useMemo } from 'react';
import { OrderProcessContent, ProcessStepItem } from '../types';
import { evaluateSequenceOrder } from '../engine';
import { sound } from '../../utils/audio';
import {
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Sparkles,
  FileText,
} from 'lucide-react';

interface OrderProcessGameProps {
  content: OrderProcessContent;
  mode: 'practice' | 'exam';
  onFinish: (accuracyPercent: number, durationSeconds: number) => void;
  onBack: () => void;
}

export const OrderProcessGame: React.FC<OrderProcessGameProps> = ({
  content,
  onFinish,
  onBack,
}) => {
  const totalExercises = content.exercises.length;
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const exercise = content.exercises[exerciseIdx] || content.exercises[0];

  const initialShuffled = useMemo(() => {
    const arr = [...exercise.orderedSteps];
    if (arr.length >= 3) {
      return arr
        .map((item, idx) => ({ item, sortKey: (idx * 3 + 2) % arr.length }))
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((x) => x.item);
    }
    return arr.reverse();
  }, [exercise]);

  const [userSequence, setUserSequence] =
    useState<ProcessStepItem[]>(initialShuffled);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);
  const [evaluation, setEvaluation] = useState<ReturnType<
    typeof evaluateSequenceOrder
  > | null>(null);
  const [scoresHistory, setScoresHistory] = useState<number[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    setUserSequence(initialShuffled);
    setSelectedSlotIdx(null);
    setEvaluation(null);
  }, [initialShuffled]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && !evaluation) {
        setElapsedSec((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [evaluation]);

  const handleSelectExercise = (idx: number) => {
    sound.playClick();
    setExerciseIdx(idx);
  };

  const handleTapSlot = (idx: number) => {
    if (evaluation) return;
    sound.playClick();

    if (selectedSlotIdx === null) {
      setSelectedSlotIdx(idx);
      return;
    }

    if (selectedSlotIdx === idx) {
      setSelectedSlotIdx(null);
      return;
    }

    const copy = [...userSequence];
    const temp = copy[selectedSlotIdx];
    copy[selectedSlotIdx] = copy[idx];
    copy[idx] = temp;
    setUserSequence(copy);
    setSelectedSlotIdx(null);
  };

  const handleMoveStep = (
    idx: number,
    direction: -1 | 1,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (evaluation) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= userSequence.length) return;
    sound.playClick();
    const copy = [...userSequence];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    setUserSequence(copy);
    setSelectedSlotIdx(null);
  };

  const handleValidateSequence = () => {
    sound.playClick();
    const res = evaluateSequenceOrder(userSequence);
    if (res.isAllCorrect) {
      sound.playCoin();
    }
    setEvaluation(res);
    setScoresHistory((prev) => [...prev, res.accuracyPercent]);
  };

  const handleNextExerciseOrFinish = () => {
    sound.playClick();
    if (exerciseIdx + 1 < totalExercises) {
      setExerciseIdx((i) => i + 1);
    } else {
      const allScores =
        scoresHistory.length > 0
          ? scoresHistory
          : [evaluation?.accuracyPercent || 100];
      const avgAccuracy = Math.round(
        allScores.reduce((a, b) => a + b, 0) / allScores.length
      );
      onFinish(avgAccuracy, Math.max(1, elapsedSec));
    }
  };

  const handleRetryCurrent = () => {
    sound.playClick();
    setUserSequence([...initialShuffled]);
    setSelectedSlotIdx(null);
    setEvaluation(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-gradient-to-b from-[#1b1635] via-[#120e26] to-[#0a0818] border-2 border-[#f59e0b]/90 rounded-[28px] p-3.5 sm:p-6 shadow-[0_16px_44px_rgba(0,0,0,0.88),0_4px_0_#451a03,inset_0_1px_0_rgba(254,240,138,0.3)] text-slate-50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-indigo-500/45 pb-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-indigo-300 to-purple-300 text-slate-950 flex items-center justify-center text-2xl border-2 border-indigo-100 shadow-[0_3px_0_#312e81] shrink-0">
            🪜
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
              قالب ۴: مرتب‌سازی مراحل فرآیند (۴۰٪ بازی‌وارسازی · ویژه مدیریت نوآوری و توسعه محصول)
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#241e47] hover:bg-[#2f285c] border-2 border-indigo-400/55 text-slate-100 text-xs font-black flex items-center gap-1.5 shadow-[0_3px_0_#0a0818] active:translate-y-0.5 cursor-pointer shrink-0"
        >
          <span>بازگشت به درس</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Multi-Exercise Switcher Tabs */}
      {totalExercises > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 bg-[#0d0a1c] p-2 rounded-2xl border-2 border-indigo-500/45">
          {content.exercises.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => handleSelectExercise(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                exerciseIdx === idx
                  ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border border-amber-200 shadow-[0_2px_0_#78350f]'
                  : 'bg-[#241e47] hover:bg-[#2f285c] text-slate-100 border border-indigo-500/45'
              }`}
            >
              فرآیند {idx + 1}: {ex.processTitle}
            </button>
          ))}
        </div>
      )}

      {/* Process Description & Instructions */}
      <div className="mb-4 p-3.5 rounded-2xl bg-[#241e47] border border-indigo-500/45 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-amber-200">
            فرآیند {exerciseIdx + 1} از {totalExercises}: {exercise.processTitle}
          </span>
          <span className="text-slate-100 font-black">⏱️ {elapsedSec} ثانیه</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
          {exercise.description}
        </p>
        <p className="text-[11px] text-amber-200 flex items-center gap-1 pt-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>
            راهنمای لمسی: روی یک مرحله ضربه بزنید و سپس مرحله مقصد را لمس کنید تا جابه‌جا شوند، یا از فلش‌های بالا/پایین استفاده کنید.
          </span>
        </p>
      </div>

      {/* Numbered Destination Slots */}
      <div className="space-y-2.5 mb-4">
        {userSequence.map((step, idx) => {
          const isSelected = selectedSlotIdx === idx;
          const isMisplaced = evaluation?.misplacedStepIds.includes(step.id);
          const isCorrectSlot = evaluation && !isMisplaced;

          return (
            <div
              key={step.id}
              onClick={() => handleTapSlot(idx)}
              className={`min-h-[58px] p-3.5 rounded-2xl border-2 flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                isCorrectSlot
                  ? 'bg-[#0a1e16] border-emerald-400 text-slate-50 shadow-[0_3px_0_#064e3b]'
                  : isMisplaced
                  ? 'bg-rose-950 border-rose-400 text-rose-100 shadow-[0_3px_0_#4c0519]'
                  : isSelected
                  ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-white font-black shadow-[0_3px_0_#78350f]'
                  : 'bg-[#241e47] hover:bg-[#2f285c] border-indigo-500/55 text-slate-50 shadow-[0_3px_0_#0a0818]'
              }`}
            >
              {/* Slot Number Badge + Content */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-slate-950 text-amber-200'
                      : 'bg-[#0d0a1c] text-amber-200 border border-amber-400/55'
                  }`}
                >
                  گام {idx + 1}
                </div>
                <div className="text-right min-w-0">
                  <div className="text-xs sm:text-sm font-black leading-snug">
                    {step.title}
                  </div>
                  <div
                    className={`text-[11px] sm:text-xs mt-0.5 leading-relaxed ${
                      isSelected ? 'text-slate-950 font-bold' : 'text-slate-200'
                    }`}
                  >
                    {step.detail}
                  </div>
                </div>
              </div>

              {/* Touch-Friendly Up/Down Buttons or Evaluation Status */}
              {!evaluation ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={(e) => handleMoveStep(idx, -1, e)}
                    aria-label="انتقال به بالا"
                    className="w-9 h-9 rounded-xl bg-[#0d0a1c] hover:bg-[#372f6b] border border-indigo-400/60 text-slate-100 flex items-center justify-center cursor-pointer disabled:bg-slate-800/90 disabled:text-slate-400 disabled:border-slate-600/80 disabled:opacity-100 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === userSequence.length - 1}
                    onClick={(e) => handleMoveStep(idx, 1, e)}
                    aria-label="انتقال به پایین"
                    className="w-9 h-9 rounded-xl bg-[#0d0a1c] hover:bg-[#372f6b] border border-indigo-400/60 text-slate-100 flex items-center justify-center cursor-pointer disabled:bg-slate-800/90 disabled:text-slate-400 disabled:border-slate-600/80 disabled:opacity-100 disabled:cursor-not-allowed"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  {isCorrectSlot ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>درست</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-rose-300">
                      <XCircle className="w-4 h-4" />
                      <span>جایگاه اصلی: گام {step.stepNumber}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit or Results Explanation */}
      {!evaluation ? (
        <button
          onClick={handleValidateSequence}
          className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs sm:text-sm border-2 border-[#fef08a] shadow-[0_4px_0_#78350f] active:translate-y-0.5 cursor-pointer"
        >
          بررسی و ثبت ترتیب مراحل ✓
        </button>
      ) : (
        <div className="space-y-3 bg-[#0d0a1c] p-4 rounded-2xl border-2 border-indigo-500/55">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm sm:text-base font-black text-amber-200">
              {evaluation.isAllCorrect
                ? '🎉 آفرین! ترتیب تمامی مراحل کاملاً صحیح است.'
                : `نتیجه بررسی: ${evaluation.correctCount} از ${evaluation.totalCount} مرحله در جایگاه درست قرار داشت (${evaluation.accuracyPercent}٪)`}
            </h4>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-200 bg-[#241e47] px-2.5 py-1 rounded-full border border-indigo-500/50">
              <FileText className="w-3 h-3 text-amber-300" />
              <span>
                منبع: {exercise.sourceRef.fileName} · {exercise.sourceRef.pageOrSlide}
              </span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-100 leading-7">
            {exercise.explanation}
          </p>

          {!evaluation.isAllCorrect && (
            <div className="p-3.5 rounded-xl bg-[#241e47] border border-indigo-500/50 text-xs space-y-1.5">
              <div className="font-black text-amber-200 mb-1">
                ترتیب صحیح مراحل:
              </div>
              {exercise.orderedSteps.map((s) => (
                <div key={s.id} className="text-emerald-200 leading-relaxed">
                  {s.stepNumber}. {s.title}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={handleRetryCurrent}
              className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-[#241e47] hover:bg-[#2f285c] border-2 border-indigo-400/55 text-slate-100 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_3px_0_#0a0818] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تلاش مجدد این فرآیند</span>
            </button>
            <button
              onClick={handleNextExerciseOrFinish}
              className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs border-2 border-[#fef08a] shadow-[0_3px_0_#78350f] cursor-pointer"
            >
              {exerciseIdx + 1 < totalExercises
                ? `فرآیند بعدی (${exerciseIdx + 2} از ${totalExercises}) ←`
                : 'ثبت نهایی و مشاهده کارنامه 🏆'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
