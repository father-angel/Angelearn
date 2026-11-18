import React, { useState, useEffect } from 'react';
import { FillInBlankContent } from '../types';
import { evaluateChoiceAnswer } from '../engine';
import { sound } from '../../utils/audio';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface FillInTheBlankGameProps {
  content: FillInBlankContent;
  mode: 'practice' | 'exam';
  onFinish: (accuracyPercent: number, durationSeconds: number) => void;
  onBack: () => void;
}

export const FillInTheBlankGame: React.FC<FillInTheBlankGameProps> = ({
  content,
  mode,
  onFinish,
  onBack,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answersRecord, setAnswersRecord] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && !isCompleted) {
        setElapsedSec((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isCompleted]);

  const currentItem = content.items[currentIdx];
  const selectedOptionObj = currentItem?.options.find(
    (o) => o.id === selectedOptionId
  );

  const handleSelectOption = (optionId: string) => {
    if (mode === 'practice' && selectedOptionId !== null) return;
    sound.playClick();
    setSelectedOptionId(optionId);
    setAnswersRecord((prev) => ({
      ...prev,
      [currentItem.id]: optionId,
    }));

    if (mode === 'practice') {
      if (evaluateChoiceAnswer(optionId, currentItem.correctOptionId)) {
        sound.playCoin();
      }
    }
  };

  const handleNext = () => {
    sound.playClick();
    if (currentIdx + 1 < content.items.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedOptionId(null);
    } else {
      const total = content.items.length;
      let correct = 0;
      content.items.forEach((item) => {
        const chosen =
          item.id === currentItem.id
            ? selectedOptionId || answersRecord[item.id]
            : answersRecord[item.id];
        if (chosen && evaluateChoiceAnswer(chosen, item.correctOptionId)) {
          correct++;
        }
      });
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;
      setIsCompleted(true);
      onFinish(accuracy, Math.max(1, elapsedSec));
    }
  };

  const handleRetry = () => {
    sound.playClick();
    setCurrentIdx(0);
    setSelectedOptionId(null);
    setAnswersRecord({});
    setIsCompleted(false);
    setElapsedSec(0);
  };

  const totalItems = content.items.length;
  const correctCount = content.items.filter((item) => {
    const chosen = answersRecord[item.id];
    return chosen && evaluateChoiceAnswer(chosen, item.correctOptionId);
  }).length;
  const finalAccuracy =
    totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 100;

  return (
    <div className="w-full max-w-3xl mx-auto bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/90 rounded-[28px] p-3.5 sm:p-6 shadow-[0_16px_44px_rgba(0,0,0,0.88),0_4px_0_#451a03,inset_0_1px_0_rgba(254,240,138,0.3)] text-slate-50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-emerald-600/50 pb-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-emerald-300 to-teal-300 text-slate-950 flex items-center justify-center text-2xl border-2 border-emerald-100 shadow-[0_3px_0_#064e3b] shrink-0">
            ✍️
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
              قالب ۲: جای خالی چهارگزینه‌ای (۲۵٪ بازی‌وارسازی)
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#143026] hover:bg-[#193b2e] border-2 border-emerald-500/55 text-slate-100 text-xs font-black flex items-center gap-1.5 shadow-[0_3px_0_#02120c] active:translate-y-0.5 cursor-pointer shrink-0"
        >
          <span>بازگشت به درس</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-3 rounded-2xl bg-[#143026] border border-emerald-600/50 text-xs text-slate-100 leading-relaxed flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <span>{content.instructions}</span>
      </div>

      {!isCompleted && currentItem && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between text-xs text-slate-200 font-black">
            <span>
              جمله {currentIdx + 1} از {content.items.length}
            </span>
            <span className="text-amber-300">⏱️ {elapsedSec} ثانیه</span>
          </div>
          <div className="w-full h-3 bg-[#071611] rounded-full overflow-hidden border border-emerald-600/60 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-amber-300 transition-all duration-300"
              style={{
                width: `${Math.round(((currentIdx + 1) / content.items.length) * 100)}%`,
              }}
            />
          </div>

          {/* Magical Sentence Reconstruction Box */}
          <div className="p-4 sm:p-6 rounded-3xl bg-[#071611] border-2 border-[#f59e0b]/80 shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)] text-sm sm:text-base leading-9 font-bold text-slate-50">
            <span>{currentItem.sentenceBeforeBlank} </span>
            <span
              className={`inline-flex items-center justify-center min-w-[130px] px-3 py-0.5 mx-1.5 rounded-xl border-2 transition-all duration-300 ${
                selectedOptionObj
                  ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-white font-black shadow-md'
                  : 'bg-[#143026] border-dashed border-amber-300 text-amber-200'
              }`}
            >
              {selectedOptionObj ? selectedOptionObj.text : '........ ؟ ........'}
            </span>
            <span> {currentItem.sentenceAfterBlank}</span>
          </div>

          {/* 4 Tap Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentItem.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const isCorrect = opt.id === currentItem.correctOptionId;
              const showFeedback = mode === 'practice' && selectedOptionId !== null;

              let cardClass =
                'bg-[#143026] hover:bg-[#193b2e] border-emerald-500/55 text-slate-100 shadow-[0_3px_0_#02100a]';
              if (showFeedback) {
                if (isCorrect) {
                  cardClass =
                    'bg-emerald-700 border-emerald-200 text-slate-50 font-black shadow-[0_3px_0_#064e3b]';
                } else if (isSelected) {
                  cardClass =
                    'bg-rose-900 border-rose-400 text-rose-50 shadow-[0_3px_0_#4c0519]';
                }
              } else if (isSelected) {
                cardClass =
                  'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-white font-black shadow-[0_3px_0_#78350f]';
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`min-h-[50px] p-3.5 rounded-2xl border-2 text-xs sm:text-sm leading-relaxed flex items-center justify-between gap-2 transition-all cursor-pointer ${cardClass}`}
                >
                  <span>{opt.text}</span>
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

          {/* Immediate Explanation in Practice Mode */}
          {mode === 'practice' && selectedOptionId !== null && (
            <div
              className={`p-4 rounded-2xl border-2 text-xs sm:text-sm leading-7 ${
                evaluateChoiceAnswer(selectedOptionId, currentItem.correctOptionId)
                  ? 'bg-[#0a1e16] border-emerald-400 text-slate-100'
                  : 'bg-rose-950 border-rose-400 text-rose-100'
              }`}
            >
              <p className="font-bold">{currentItem.explanation}</p>
            </div>
          )}

          {selectedOptionId !== null && (
            <button
              onClick={handleNext}
              className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs sm:text-sm border-2 border-[#fef08a] shadow-[0_4px_0_#78350f] active:translate-y-0.5 cursor-pointer"
            >
              {currentIdx + 1 < content.items.length
                ? 'جمله بعدی ←'
                : 'ثبت و مشاهده نتیجه نهایی 🏆'}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {isCompleted && (
        <div className="text-center space-y-4 py-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 flex items-center justify-center text-4xl border-2 border-[#fef08a] shadow-[0_4px_0_#78350f]">
            ✨
          </div>
          <h4 className="text-lg font-black text-amber-200">
            پایان چالش «جای خالی چهارگزینه‌ای»
          </h4>
          <p className="text-xs sm:text-sm text-slate-100">
            امتیاز دقت: <strong className="text-amber-300">{finalAccuracy}٪</strong> (
            {correctCount} از {totalItems} جمله صحیح)
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={handleRetry}
              className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-[#143026] hover:bg-[#193b2e] border-2 border-emerald-500/55 text-slate-100 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_3px_0_#02100a] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تلاش مجدد</span>
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
