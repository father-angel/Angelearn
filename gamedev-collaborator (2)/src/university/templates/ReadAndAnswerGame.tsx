import React, { useState, useEffect } from 'react';
import { ReadAndAnswerContent } from '../types';
import { evaluateChoiceAnswer } from '../engine';
import { sound } from '../../utils/audio';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Sparkles,
  FileText,
} from 'lucide-react';

interface ReadAndAnswerGameProps {
  content: ReadAndAnswerContent;
  mode: 'practice' | 'exam';
  onFinish: (accuracyPercent: number, durationSeconds: number) => void;
  onBack: () => void;
}

export const ReadAndAnswerGame: React.FC<ReadAndAnswerGameProps> = ({
  content,
  mode,
  onFinish,
  onBack,
}) => {
  const [phase, setPhase] = useState<'reading' | 'questions' | 'results'>('reading');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answersRecord, setAnswersRecord] = useState<Record<string, string>>({});
  const [elapsedSec, setElapsedSec] = useState(0);

  // Pause timer when browser tab is hidden
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && phase !== 'results') {
        setElapsedSec((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const currentQuestion = content.questions[currentIdx];

  const handleSelectOption = (optionId: string) => {
    if (mode === 'practice' && selectedOptionId !== null) return;
    sound.playClick();
    setSelectedOptionId(optionId);
    setAnswersRecord((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));

    if (mode === 'practice') {
      const isRight = evaluateChoiceAnswer(optionId, currentQuestion.correctOptionId);
      if (isRight) sound.playCoin();
    }
  };

  const handleNextQuestion = () => {
    sound.playClick();
    if (currentIdx + 1 < content.questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedOptionId(null);
    } else {
      const total = content.questions.length;
      let correct = 0;
      content.questions.forEach((q) => {
        const chosen =
          q.id === currentQuestion.id
            ? selectedOptionId || answersRecord[q.id]
            : answersRecord[q.id];
        if (chosen && evaluateChoiceAnswer(chosen, q.correctOptionId)) {
          correct++;
        }
      });
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;
      setPhase('results');
      onFinish(accuracy, Math.max(1, elapsedSec));
    }
  };

  const handleRetry = () => {
    sound.playClick();
    setPhase('reading');
    setCurrentIdx(0);
    setSelectedOptionId(null);
    setAnswersRecord({});
    setElapsedSec(0);
  };

  const totalQuestions = content.questions.length;
  const correctAnswersCount = content.questions.filter((q) => {
    const chosen = answersRecord[q.id];
    return chosen && evaluateChoiceAnswer(chosen, q.correctOptionId);
  }).length;
  const finalAccuracy =
    totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 100;

  return (
    <div className="w-full max-w-3xl mx-auto bg-gradient-to-b from-[#241a12] via-[#18110c] to-[#0e0a07] border-2 border-[#f59e0b]/90 rounded-[28px] p-3.5 sm:p-6 shadow-[0_16px_44px_rgba(0,0,0,0.88),0_4px_0_#451a03,inset_0_1px_0_rgba(254,240,138,0.3)] text-stone-100">
      {/* Top Enchanted Book Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-amber-500/40 pb-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 flex items-center justify-center text-2xl border-2 border-[#fef08a] shadow-[0_3px_0_#451a03] shrink-0">
            📖
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
            <p className="text-[11px] text-stone-200 mt-0.5">
              قالب ۱: مطالعه و آزمون (۱۵٪ بازی‌وارسازی) ·{' '}
              {mode === 'exam' ? 'حالت آزمون (بازخورد در پایان)' : 'حالت تمرین (بازخورد فوری)'}
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#302318] hover:bg-[#3e2d20] border-2 border-amber-400/55 text-stone-100 text-xs font-black flex items-center gap-1.5 shadow-[0_3px_0_#120c08] active:translate-y-0.5 cursor-pointer shrink-0"
        >
          <span>بازگشت به تالار درس</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Instructions Banner */}
      <div className="mb-4 p-3 rounded-2xl bg-[#302318] border border-amber-400/45 text-xs text-stone-100 leading-relaxed flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <span>{content.instructions}</span>
      </div>

      {/* PHASE 1: READING THE ENCHANTED TOME */}
      {phase === 'reading' && (
        <div className="space-y-4">
          <div className="bg-[#302318] border-2 border-[#f59e0b]/80 rounded-3xl p-4 sm:p-6 shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/40 pb-3 mb-4">
              <h4 className="text-sm sm:text-base font-black text-amber-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{content.passageTitle}</span>
              </h4>
              <span className="text-[11px] text-amber-200 font-black px-2.5 py-1 rounded-xl bg-[#120c08] border border-amber-500/50">
                ⏱️ زمان مطالعه: {elapsedSec} ثانیه
              </span>
            </div>

            <div className="space-y-3.5 text-xs sm:text-[15px] text-stone-100 leading-8 text-justify">
              {content.passageParagraphs.map((para, idx) => (
                <p
                  key={idx}
                  className="bg-[#120c08] p-3.5 sm:p-4 rounded-2xl border border-amber-500/40 shadow-inner leading-8"
                >
                  {para}
                </p>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              setPhase('questions');
            }}
            className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-xs sm:text-sm border-2 border-[#fef08a] shadow-[0_4px_0_#78350f] active:translate-y-0.5 cursor-pointer transition-all"
          >
            مطالعه کردم؛ ورود به پرسش‌های چهارگزینه‌ای ({content.questions.length} سوال) ←
          </button>
        </div>
      )}

      {/* PHASE 2: FOUR-OPTION QUESTIONS */}
      {phase === 'questions' && currentQuestion && (
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="flex items-center justify-between text-xs text-stone-200 font-black">
            <span>
              پرسش {currentIdx + 1} از {content.questions.length}
            </span>
            <button
              onClick={() => setPhase('reading')}
              className="text-[11px] text-amber-200 bg-[#120c08] px-2.5 py-1 rounded-xl border border-amber-500/50 hover:text-white cursor-pointer"
            >
              بازخوانی متن درس 📖
            </button>
          </div>
          <div className="w-full h-3 bg-[#120c08] rounded-full overflow-hidden border border-amber-500/50 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#fbbf24] to-[#fde68a] transition-all duration-300"
              style={{
                width: `${Math.round(((currentIdx + 1) / content.questions.length) * 100)}%`,
              }}
            />
          </div>

          {/* Question Box */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#302318] border-2 border-amber-400/70 shadow-inner">
            <p className="text-sm sm:text-base font-black text-stone-50 leading-8">
              {currentQuestion.question}
            </p>
            {currentQuestion.sourceRef && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] text-amber-200 bg-[#120c08] px-2.5 py-1 rounded-full border border-amber-500/50">
                <FileText className="w-3 h-3 text-amber-300" />
                <span>
                  مرجع علمی: {currentQuestion.sourceRef.fileName} ·{' '}
                  {currentQuestion.sourceRef.pageOrSlide}
                </span>
              </div>
            )}
          </div>

          {/* 4 Options */}
          <div className="grid grid-cols-1 gap-2.5">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedOptionId === opt.id;
              const isCorrect = opt.id === currentQuestion.correctOptionId;
              const showPracticeFeedback = mode === 'practice' && selectedOptionId !== null;

              let btnStyle =
                'bg-[#302318] hover:bg-[#3e2d20] border-amber-500/50 text-stone-100 shadow-[0_3px_0_#120c08]';
              if (showPracticeFeedback) {
                if (isCorrect) {
                  btnStyle =
                    'bg-emerald-800 border-emerald-300 text-slate-50 font-black shadow-[0_3px_0_#064e3b]';
                } else if (isSelected) {
                  btnStyle =
                    'bg-rose-900 border-rose-400 text-rose-50 shadow-[0_3px_0_#4c0519]';
                }
              } else if (isSelected) {
                btnStyle =
                  'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-white font-black shadow-[0_3px_0_#78350f]';
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`min-h-[50px] w-full text-right p-3.5 rounded-2xl border-2 text-xs sm:text-sm leading-relaxed transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                >
                  <span>
                    {idx + 1}. {opt.text}
                  </span>
                  {showPracticeFeedback && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                  )}
                  {showPracticeFeedback && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-300 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Immediate Feedback in Practice Mode */}
          {mode === 'practice' && selectedOptionId !== null && (
            <div
              className={`p-4 rounded-2xl border-2 text-xs sm:text-sm leading-7 ${
                evaluateChoiceAnswer(selectedOptionId, currentQuestion.correctOptionId)
                  ? 'bg-[#0a1e16] border-emerald-400 text-emerald-100'
                  : 'bg-rose-950 border-rose-400 text-rose-100'
              }`}
            >
              <div className="font-black mb-1">
                {evaluateChoiceAnswer(selectedOptionId, currentQuestion.correctOptionId)
                  ? '✅ پاسخ شما کاملاً صحیح است!'
                  : '💡 پاسخ انتخاب‌شده نادرست بود. نکته آموزشی:'}
              </div>
              <p>{currentQuestion.explanation}</p>
            </div>
          )}

          {/* Next Button */}
          {selectedOptionId !== null && (
            <button
              onClick={handleNextQuestion}
              className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-b from-emerald-200 via-emerald-300 to-teal-300 text-slate-950 font-black text-xs sm:text-sm border-2 border-emerald-100 shadow-[0_4px_0_#064e3b] active:translate-y-0.5 cursor-pointer"
            >
              {currentIdx + 1 < content.questions.length
                ? 'پرسش بعدی ←'
                : 'مشاهده نتیجه و کارنامه نهایی 🏆'}
            </button>
          )}
        </div>
      )}

      {/* PHASE 3: COMPLETION & RESULTS */}
      {phase === 'results' && (
        <div className="text-center space-y-4 py-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 flex items-center justify-center text-4xl border-2 border-[#fef08a] shadow-[0_4px_0_#78350f]">
            {finalAccuracy >= content.passingScore ? '🏆' : '📘'}
          </div>
          <h4 className="text-lg sm:text-xl font-black text-amber-200">
            پایان جلسه «مطالعه و آزمون»
          </h4>
          <p className="text-xs sm:text-sm text-stone-100">
            دقت پاسخ‌گویی شما: <strong className="text-amber-300">{finalAccuracy}٪</strong> (
            {correctAnswersCount} از {totalQuestions} پاسخ صحیح) · زمان: {elapsedSec} ثانیه
          </p>

          {/* Delayed Explanations in Exam Mode */}
          {mode === 'exam' && (
            <div className="text-right space-y-2.5 bg-[#120c08] p-4 rounded-2xl border-2 border-amber-500/50 max-h-60 overflow-y-auto">
              <div className="text-xs font-black text-amber-200 mb-1">
                پاسخ‌نامه تشریحی آزمون:
              </div>
              {content.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="text-xs text-stone-100 border-b border-amber-800/60 pb-2 leading-relaxed"
                >
                  <div className="font-black">
                    {idx + 1}. {q.question}
                  </div>
                  <div className="text-emerald-300 mt-1">{q.explanation}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={handleRetry}
              className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-[#302318] hover:bg-[#3e2d20] border-2 border-amber-400/55 text-stone-100 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_3px_0_#120c08] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تلاش مجدد</span>
            </button>
            <button
              onClick={onBack}
              className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs border-2 border-[#fef08a] shadow-[0_3px_0_#78350f] cursor-pointer"
            >
              بازگشت به صفحه درس
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
