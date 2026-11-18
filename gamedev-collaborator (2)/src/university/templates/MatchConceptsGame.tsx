import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MatchConceptsContent } from '../types';
import { sound } from '../../utils/audio';
import {
  Link2,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Sparkles,
  FileText,
} from 'lucide-react';

interface MatchConceptsGameProps {
  content: MatchConceptsContent;
  mode: 'practice' | 'exam';
  onFinish: (accuracyPercent: number, durationSeconds: number) => void;
  onBack: () => void;
}

export const MatchConceptsGame: React.FC<MatchConceptsGameProps> = ({
  content,
  onFinish,
  onBack,
}) => {
  const totalRounds = content.rounds.length;
  const [roundIdx, setRoundIdx] = useState(0);
  const round = content.rounds[roundIdx] || content.rounds[0];
  const pairs = round.pairs;

  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [lastMatchedExplanation, setLastMatchedExplanation] = useState<string | null>(
    null
  );
  const [wrongFlashIds, setWrongFlashIds] = useState<{
    termId: string;
    defId: string;
  } | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [totalPairsMatchedAllRounds, setTotalPairsMatchedAllRounds] = useState(0);
  const [totalAttemptsAllRounds, setTotalAttemptsAllRounds] = useState(0);
  const [isAllRoundsCompleted, setIsAllRoundsCompleted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const wrongFlashTimeoutRef = useRef<number | null>(null);

  const clearWrongFlashTimeout = () => {
    if (wrongFlashTimeoutRef.current !== null) {
      window.clearTimeout(wrongFlashTimeoutRef.current);
      wrongFlashTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearWrongFlashTimeout();
  }, []);

  const shuffledDefs = useMemo(() => {
    const copy = [...pairs];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = (i + shuffleSeed + 1) % copy.length;
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }, [pairs, shuffleSeed]);

  const isCurrentRoundCompleted = matchedPairIds.length === pairs.length;

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && !isAllRoundsCompleted) {
        setElapsedSec((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isAllRoundsCompleted]);

  const handleSelectRound = (idx: number) => {
    clearWrongFlashTimeout();
    sound.playClick();
    setRoundIdx(idx);
    setSelectedTermId(null);
    setWrongFlashIds(null);
    setMatchedPairIds([]);
    setLastMatchedExplanation(null);
    setAttemptsCount(0);
    setShuffleSeed((s) => s + 1);
  };

  const handleTapTerm = (pairId: string) => {
    if (matchedPairIds.includes(pairId) || wrongFlashIds !== null) return;
    sound.playClick();
    setSelectedTermId((prev) => (prev === pairId ? null : pairId));
  };

  const handleTapDefinition = (defPairId: string) => {
    if (matchedPairIds.includes(defPairId) || wrongFlashIds !== null) return;
    if (!selectedTermId) {
      sound.playClick();
      return;
    }

    const nextAttempts = attemptsCount + 1;
    setAttemptsCount(nextAttempts);

    if (selectedTermId === defPairId) {
      sound.playCoin();
      const nextMatched = [...matchedPairIds, defPairId];
      setMatchedPairIds(nextMatched);
      const matchedPair = pairs.find((p) => p.id === defPairId);
      setLastMatchedExplanation(matchedPair?.explanation || null);
      setSelectedTermId(null);
    } else {
      sound.playClick();
      clearWrongFlashTimeout();
      setWrongFlashIds({ termId: selectedTermId, defId: defPairId });
      wrongFlashTimeoutRef.current = window.setTimeout(() => {
        wrongFlashTimeoutRef.current = null;
        setWrongFlashIds(null);
        setSelectedTermId(null);
      }, 650);
    }
  };

  const handleNextRoundOrFinish = () => {
    clearWrongFlashTimeout();
    sound.playClick();
    const nextTotalPairs = totalPairsMatchedAllRounds + pairs.length;
    const nextTotalAttempts = totalAttemptsAllRounds + Math.max(pairs.length, attemptsCount);
    setTotalPairsMatchedAllRounds(nextTotalPairs);
    setTotalAttemptsAllRounds(nextTotalAttempts);

    if (roundIdx + 1 < totalRounds) {
      setRoundIdx((r) => r + 1);
      setSelectedTermId(null);
      setWrongFlashIds(null);
      setMatchedPairIds([]);
      setLastMatchedExplanation(null);
      setAttemptsCount(0);
      setShuffleSeed((s) => s + 1);
    } else {
      const accuracy = Math.min(
        100,
        Math.round((nextTotalPairs / Math.max(1, nextTotalAttempts)) * 100)
      );
      setIsAllRoundsCompleted(true);
      onFinish(accuracy, Math.max(1, elapsedSec));
    }
  };

  const handleRetry = () => {
    clearWrongFlashTimeout();
    sound.playClick();
    setRoundIdx(0);
    setSelectedTermId(null);
    setWrongFlashIds(null);
    setMatchedPairIds([]);
    setLastMatchedExplanation(null);
    setAttemptsCount(0);
    setTotalPairsMatchedAllRounds(0);
    setTotalAttemptsAllRounds(0);
    setIsAllRoundsCompleted(false);
    setElapsedSec(0);
    setShuffleSeed((s) => s + 1);
  };

  const finalAccuracy = Math.min(
    100,
    Math.round(
      (Math.max(1, totalPairsMatchedAllRounds) /
        Math.max(1, totalAttemptsAllRounds)) *
        100
    )
  );

  return (
    <div className="w-full max-w-3xl mx-auto bg-gradient-to-b from-[#0d1f2d] via-[#091622] to-[#050d14] border-2 border-[#f59e0b]/90 rounded-[28px] p-3.5 sm:p-6 shadow-[0_16px_44px_rgba(0,0,0,0.88),0_4px_0_#451a03,inset_0_1px_0_rgba(254,240,138,0.3)] text-slate-50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-sky-500/45 pb-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-sky-300 to-cyan-300 text-slate-950 flex items-center justify-center text-2xl border-2 border-sky-100 shadow-[0_3px_0_#082f49] shrink-0">
            🔗
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
              قالب ۳: اتصال مفاهیم با لمس دوگانه (۳۵٪ بازی‌وارسازی · بدون نیاز به Drag & Drop)
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#132a3d] hover:bg-[#193852] border-2 border-sky-400/55 text-slate-100 text-xs font-black flex items-center gap-1.5 shadow-[0_3px_0_#050d14] active:translate-y-0.5 cursor-pointer shrink-0"
        >
          <span>بازگشت به درس</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Multi-Round Switcher Tabs */}
      {totalRounds > 1 && !isAllRoundsCompleted && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 bg-[#07121c] p-2 rounded-2xl border-2 border-sky-600/50">
          {content.rounds.map((r, idx) => (
            <button
              key={r.id}
              onClick={() => handleSelectRound(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                roundIdx === idx
                  ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border border-amber-200 shadow-[0_2px_0_#78350f]'
                  : 'bg-[#132a3d] hover:bg-[#193852] text-slate-100 border border-sky-500/45'
              }`}
            >
              بخش {idx + 1}: {r.roundTitle}
            </button>
          ))}
        </div>
      )}

      {/* Instructions & Source Reference */}
      <div className="mb-4 p-3 rounded-2xl bg-[#132a3d] border border-sky-500/45 text-xs text-slate-100 leading-relaxed flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <span>
            <strong className="text-amber-200">{round.roundTitle}:</strong>{' '}
            {content.instructions}
          </span>
        </div>
        {round.sourceRef && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-200 bg-[#07121c] px-2.5 py-0.5 rounded-full border border-sky-500/55">
            <FileText className="w-3 h-3" />
            <span>
              {round.sourceRef.fileName} · {round.sourceRef.pageOrSlide}
            </span>
          </span>
        )}
      </div>

      {!isAllRoundsCompleted ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-200 font-black">
            <span>
              بخش {roundIdx + 1} از {totalRounds} · جفت‌های متصل‌شده:{' '}
              {matchedPairIds.length} از {pairs.length}
            </span>
            <span className="text-amber-300">
              تلاش‌ها: {attemptsCount} · ⏱️ {elapsedSec} ثانیه
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Right Column: Terms */}
            <div className="space-y-2.5">
              <div className="text-xs font-black text-amber-200 mb-1">
                ۱. انتخاب اصطلاح یا مفهوم:
              </div>
              {pairs.map((p) => {
                const isMatched = matchedPairIds.includes(p.id);
                const isSelected = selectedTermId === p.id;
                const isWrong = wrongFlashIds?.termId === p.id;

                return (
                  <button
                    key={p.id}
                    disabled={isMatched}
                    onClick={() => handleTapTerm(p.id)}
                    className={`min-h-[54px] w-full p-3.5 rounded-2xl border-2 text-right text-xs sm:text-sm font-black flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isMatched
                        ? 'bg-[#0a1e16] border-emerald-400 text-emerald-100'
                        : isWrong
                        ? 'bg-rose-900 border-rose-400 text-rose-50 animate-pulse'
                        : isSelected
                        ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-white shadow-[0_3px_0_#78350f]'
                        : 'bg-[#132a3d] hover:bg-[#193852] border-sky-500/55 text-slate-50 shadow-[0_3px_0_#050d14]'
                    }`}
                  >
                    <span className="leading-relaxed">{p.term}</span>
                    {isMatched ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    ) : (
                      <Link2 className="w-4 h-4 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Left Column: Shuffled Definitions */}
            <div className="space-y-2.5">
              <div className="text-xs font-black text-cyan-200 mb-1">
                ۲. لمس تعریف یا کاربرد مرتبط:
              </div>
              {shuffledDefs.map((d) => {
                const isMatched = matchedPairIds.includes(d.id);
                const isWrong = wrongFlashIds?.defId === d.id;

                return (
                  <button
                    key={d.id}
                    disabled={isMatched}
                    onClick={() => handleTapDefinition(d.id)}
                    className={`min-h-[54px] w-full p-3.5 rounded-2xl border-2 text-right text-xs sm:text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isMatched
                        ? 'bg-[#0a1e16] border-emerald-400 text-emerald-100'
                        : isWrong
                        ? 'bg-rose-900 border-rose-400 text-rose-50 animate-pulse'
                        : selectedTermId
                        ? 'bg-[#17344b] hover:bg-[#1e4361] border-amber-300/85 text-slate-50 shadow-[0_3px_0_#050d14]'
                        : 'bg-[#07121c] border-sky-600/50 text-slate-100 shadow-[0_3px_0_#050d14]'
                    }`}
                  >
                    <span className="leading-relaxed">{d.definition}</span>
                    {isMatched && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {lastMatchedExplanation && (
            <div className="p-3.5 rounded-2xl bg-[#0a1e16] border-2 border-emerald-400/75 text-xs sm:text-sm text-emerald-100 leading-relaxed">
              ✅ {lastMatchedExplanation}
            </div>
          )}

          {isCurrentRoundCompleted && (
            <button
              onClick={handleNextRoundOrFinish}
              className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs sm:text-sm border-2 border-[#fef08a] shadow-[0_4px_0_#78350f] active:translate-y-0.5 cursor-pointer"
            >
              {roundIdx + 1 < totalRounds
                ? `ادامه به بخش ${roundIdx + 2}: ${content.rounds[roundIdx + 1].roundTitle} ←`
                : 'تکمیل تمام بخش‌ها و مشاهده نتیجه نهایی 🏆'}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 flex items-center justify-center text-4xl border-2 border-[#fef08a] shadow-[0_4px_0_#78350f]">
            🔗
          </div>
          <h4 className="text-lg font-black text-amber-200">
            تمامی بخش‌های اتصال مفاهیم با موفقیت تکمیل شدند!
          </h4>
          <p className="text-xs sm:text-sm text-slate-100">
            دقت کل: <strong className="text-amber-300">{finalAccuracy}٪</strong> ·
            زمان: {elapsedSec} ثانیه
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={handleRetry}
              className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-[#132a3d] hover:bg-[#193852] border-2 border-sky-400/55 text-slate-100 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_3px_0_#050d14] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>بازی مجدد از بخش اول</span>
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
