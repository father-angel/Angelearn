import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DifficultyLevel, ScientificMemoryContent } from '../types';
import { getMemoryPairCountForDifficulty } from '../engine';
import { sound } from '../../utils/audio';
import {
  RotateCcw,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Eye,
} from 'lucide-react';

interface ScientificMemoryGameProps {
  content: ScientificMemoryContent;
  difficulty?: DifficultyLevel;
  mode: 'practice' | 'exam';
  onFinish: (accuracyPercent: number, durationSeconds: number) => void;
  onBack: () => void;
}

interface MemoryDeckCard {
  uid: string;
  pairId: string;
  text: string;
  relationLabel: string;
  side: 'A' | 'B';
}

export const ScientificMemoryGame: React.FC<ScientificMemoryGameProps> = ({
  content,
  difficulty = 2,
  onFinish,
  onBack,
}) => {
  const [activeDifficulty, setActiveDifficulty] = useState<DifficultyLevel>(difficulty);
  const { pairCount, previewSeconds } = getMemoryPairCountForDifficulty(
    activeDifficulty,
    content.pairs.length
  );

  const [seed, setSeed] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState(true);
  const [previewTimeLeft, setPreviewTimeLeft] = useState(previewSeconds);
  const [flippedUids, setFlippedUids] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const mismatchTimeoutRef = useRef<number | null>(null);

  const clearMismatchTimeout = () => {
    if (mismatchTimeoutRef.current !== null) {
      window.clearTimeout(mismatchTimeoutRef.current);
      mismatchTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearMismatchTimeout();
  }, []);

  const deck: MemoryDeckCard[] = useMemo(() => {
    const selectedPairs = content.pairs.slice(0, pairCount);
    const rawCards: MemoryDeckCard[] = [];
    selectedPairs.forEach((p) => {
      rawCards.push({
        uid: `${p.id}_A`,
        pairId: p.id,
        text: p.cardA,
        relationLabel: p.relationLabel,
        side: 'A',
      });
      rawCards.push({
        uid: `${p.id}_B`,
        pairId: p.id,
        text: p.cardB,
        relationLabel: p.relationLabel,
        side: 'B',
      });
    });

    for (let i = rawCards.length - 1; i > 0; i--) {
      const j = (i * 3 + seed + 1) % (i + 1);
      const tmp = rawCards[i];
      rawCards[i] = rawCards[j];
      rawCards[j] = tmp;
    }
    return rawCards;
  }, [content.pairs, pairCount, seed]);

  const isCompleted = matchedPairIds.length === pairCount;

  useEffect(() => {
    setIsPreviewing(true);
    setPreviewTimeLeft(previewSeconds);
    const countdown = setInterval(() => {
      if (document.hidden) return;
      setPreviewTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(countdown);
          setIsPreviewing(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(countdown);
  }, [previewSeconds, seed, activeDifficulty]);

  useEffect(() => {
    if (isPreviewing || isCompleted) return;
    const timer = setInterval(() => {
      if (!document.hidden) {
        setElapsedSec((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isPreviewing, isCompleted]);

  const handleCardTap = (card: MemoryDeckCard) => {
    if (isPreviewing || isLocked || isCompleted) return;
    if (matchedPairIds.includes(card.pairId)) return;
    if (flippedUids.includes(card.uid)) return;

    sound.playClick();
    const nextFlipped = [...flippedUids, card.uid];
    setFlippedUids(nextFlipped);

    if (nextFlipped.length === 2) {
      setIsLocked(true);
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      const firstCard = deck.find((c) => c.uid === nextFlipped[0]);
      if (firstCard && firstCard.pairId === card.pairId) {
        sound.playCoin();
        const nextMatched = [...matchedPairIds, card.pairId];
        setMatchedPairIds(nextMatched);
        setFlippedUids([]);
        setIsLocked(false);

        if (nextMatched.length === pairCount) {
          const accuracy = Math.min(
            100,
            Math.round((pairCount / Math.max(pairCount, nextAttempts)) * 100)
          );
          onFinish(accuracy, Math.max(1, elapsedSec));
        }
      } else {
        clearMismatchTimeout();
        mismatchTimeoutRef.current = window.setTimeout(() => {
          mismatchTimeoutRef.current = null;
          setFlippedUids([]);
          setIsLocked(false);
        }, 750);
      }
    }
  };

  const handleRestart = (nextDiff?: DifficultyLevel) => {
    clearMismatchTimeout();
    sound.playClick();
    if (nextDiff) setActiveDifficulty(nextDiff);
    setFlippedUids([]);
    setMatchedPairIds([]);
    setAttempts(0);
    setElapsedSec(0);
    setIsLocked(false);
    setSeed((s) => s + 1);
  };

  const finalAccuracy = Math.min(
    100,
    Math.round((pairCount / Math.max(pairCount, attempts)) * 100)
  );

  return (
    <div className="w-full max-w-3xl mx-auto bg-gradient-to-b from-[#261221] via-[#1a0c17] to-[#0f070e] border-2 border-[#f59e0b]/90 rounded-[28px] p-3.5 sm:p-6 shadow-[0_16px_44px_rgba(0,0,0,0.88),0_4px_0_#451a03,inset_0_1px_0_rgba(254,240,138,0.3)] text-slate-50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-pink-500/40 pb-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-pink-300 to-rose-300 text-slate-950 flex items-center justify-center text-2xl border-2 border-pink-100 shadow-[0_3px_0_#4c0519] shrink-0">
            🃏
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
              قالب ۶: حافظه علمی تطبیقی (۵۵٪ بازی‌وارسازی · سطح دشواری {activeDifficulty} با{' '}
              {pairCount} جفت علمی)
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#33192c] hover:bg-[#44213b] border-2 border-pink-400/55 text-slate-100 text-xs font-black flex items-center gap-1.5 shadow-[0_3px_0_#120810] active:translate-y-0.5 cursor-pointer shrink-0"
        >
          <span>بازگشت به درس</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Top Controls & Adaptive Pair Count Switcher */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 bg-[#120810] p-3 rounded-2xl border-2 border-pink-500/45 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-100 font-black">تعداد جفت‌ها:</span>
          {([1, 2, 3, 4] as DifficultyLevel[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => handleRestart(lvl)}
              className={`px-2.5 py-1 rounded-xl font-black cursor-pointer transition-all ${
                activeDifficulty === lvl
                  ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border border-amber-200 shadow-[0_2px_0_#78350f]'
                  : 'bg-[#33192c] text-slate-100 border border-pink-500/45 hover:bg-[#44213b]'
              }`}
            >
              {lvl + 1} جفت
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 font-black text-slate-100">
          {isPreviewing ? (
            <span className="text-amber-300 flex items-center gap-1 animate-pulse">
              <Eye className="w-4 h-4" />
              <span>به خاطر بسپارید: {previewTimeLeft} ثانیه</span>
            </span>
          ) : (
            <>
              <span>
                جفت‌های کشف‌شده: {matchedPairIds.length}/{pairCount}
              </span>
              <span>تلاش: {attempts}</span>
              <span className="text-amber-300">⏱️ {elapsedSec}s</span>
            </>
          )}
        </div>
      </div>

      {!isCompleted ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {deck.map((card) => {
            const isMatched = matchedPairIds.includes(card.pairId);
            const isFlipped = isPreviewing || isMatched || flippedUids.includes(card.uid);

            return (
              <button
                key={card.uid}
                onClick={() => handleCardTap(card)}
                className={`min-h-[100px] sm:min-h-[114px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer ${
                  isMatched
                    ? 'bg-[#0a1e16] border-emerald-400 text-slate-50 shadow-[0_4px_0_#064e3b]'
                    : isFlipped
                    ? 'bg-gradient-to-b from-[#fef3c7] via-[#fde68a] to-[#f59e0b] border-white text-slate-950 font-black shadow-[0_4px_0_#78350f]'
                    : 'bg-[#33192c] hover:bg-[#44213b] border-pink-400/55 text-slate-100 shadow-[0_4px_0_#120810]'
                }`}
              >
                {isFlipped ? (
                  <>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full mb-1.5 ${
                        isMatched
                          ? 'bg-[#071611] text-emerald-300 border border-emerald-400/50'
                          : 'bg-slate-950/15 text-slate-950 border border-slate-950/30'
                      }`}
                    >
                      {card.side === 'A' ? 'مفهوم / اصطلاح' : 'تعریف / کاربرد'}
                    </span>
                    <span className="text-xs sm:text-sm font-black leading-relaxed">
                      {card.text}
                    </span>
                    {isMatched && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-1" />
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-full bg-[#120810] border border-amber-300/50 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                    <span className="text-[10px] font-black text-slate-200">
                      کارت علمی انجلرن
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 flex items-center justify-center text-4xl border-2 border-[#fef08a] shadow-[0_4px_0_#78350f]">
            🃏
          </div>
          <h4 className="text-lg font-black text-amber-200">
            آفرین! تمام جفت‌های علمی کشف شدند
          </h4>
          <p className="text-xs sm:text-sm text-slate-100">
            دقت حافظه: <strong className="text-amber-300">{finalAccuracy}٪</strong> ·
            تعداد تلاش: {attempts} · زمان تکمیل: {elapsedSec} ثانیه
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={() =>
                handleRestart(
                  Math.min(4, activeDifficulty + 1) as DifficultyLevel
                )
              }
              className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-[#33192c] hover:bg-[#44213b] border-2 border-pink-400/55 text-slate-100 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_3px_0_#120810] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تکرار با جفت‌های بیشتر (افزایش چالش)</span>
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
