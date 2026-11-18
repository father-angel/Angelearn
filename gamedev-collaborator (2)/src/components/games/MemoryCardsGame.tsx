import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../../utils/audio';
import {
  MEMORY_PLACEMENT_ROUNDS,
  MEMORY_PLACEMENT_START_TIER,
  MEMORY_PAIR_LEVEL_VALUES,
  MEMORY_NUMBER_LEVEL_VALUES,
  MemoryPlacementAttempt,
  MemoryPlacementSummary,
  getMemoryPlacementTierConfig,
  getNextMemoryPlacementProbeTier,
  evaluateMemoryPlacement,
} from '../../game/rules';
import {
  Brain,
  RotateCcw,
  CheckCircle,
  Hash,
  Layers,
  EyeOff,
  Compass,
  Sparkles,
  Zap,
  Trophy,
  ArrowLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateMemoryChallengeScore } from '../../game/groupChallenges';
import { ExerciseCompletionReport } from '../../types/game';

interface MemoryCardsGameProps {
  onComplete: (
    success: boolean,
    report?: Partial<ExerciseCompletionReport>
  ) => void;
  onClose: () => void;
  challengeConfig?: {
    challengeId: string;
    title: string;
    personalBestScore?: number | null;
  } | null;
  onChallengeComplete?: (result: {
    score: number;
    detailLabel: string;
  }) => Promise<{ isNewRecord: boolean; bestScore: number } | void> | void;
}

type MemoryGameMode = 'pairs' | 'numbers';
type MemoryPhase = 'placement_intro' | 'placement_playing' | 'placement_result' | 'playing';

interface SavedMemoryPlacement {
  calibratedLevel: number; // 1..4
  totalMistakes: number;
  averageRecallSeconds: number;
  skillLabel: string;
  completedAt: string;
}

const MEMORY_PLACEMENT_STORAGE_KEY = 'angellearn_memory_placement_v1';

function loadSavedMemoryPlacement(): SavedMemoryPlacement | null {
  try {
    const raw = localStorage.getItem(MEMORY_PLACEMENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedMemoryPlacement>;
    if (
      typeof parsed.calibratedLevel !== 'number' ||
      !Number.isFinite(parsed.calibratedLevel)
    ) {
      return null;
    }
    const clamped = Math.max(1, Math.min(4, Math.round(parsed.calibratedLevel)));
    return {
      calibratedLevel: clamped,
      totalMistakes: typeof parsed.totalMistakes === 'number' ? parsed.totalMistakes : 0,
      averageRecallSeconds:
        typeof parsed.averageRecallSeconds === 'number' ? parsed.averageRecallSeconds : 0,
      skillLabel:
        typeof parsed.skillLabel === 'string'
          ? parsed.skillLabel
          : 'سطح تعیین‌شده بر اساس عملکرد شما',
      completedAt:
        typeof parsed.completedAt === 'string'
          ? parsed.completedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function saveMemoryPlacement(summary: MemoryPlacementSummary): SavedMemoryPlacement {
  const payload: SavedMemoryPlacement = {
    calibratedLevel: summary.recommendedLevel,
    totalMistakes: summary.totalMistakes,
    averageRecallSeconds: summary.averageRecallSeconds,
    skillLabel: summary.skillLabel,
    completedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(MEMORY_PLACEMENT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
  return payload;
}

interface PairCardItem {
  id: number;
  symbol: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface NumberCardItem {
  id: number;
  value: number;
  orderIndex: number; // 0-based rank from smallest to largest
  isFlipped: boolean;
  isSolved: boolean;
  isWrong: boolean;
}

const NATURE_SYMBOLS = [
  { symbol: '🍃', name: 'برگ سبز' },
  { symbol: '☀️', name: 'خورشید' },
  { symbol: '💧', name: 'قطره آب' },
  { symbol: '🦋', name: 'پروانه' },
  { symbol: '🌺', name: 'شکوفه' },
  { symbol: '🦉', name: 'جغد دانا' },
  { symbol: '⭐', name: 'ستاره' },
  { symbol: '🍄', name: 'قارچ جنگلی' },
  { symbol: '🌈', name: 'رنگین‌کمان' },
  { symbol: '🐝', name: 'زنبور عسل' },
  { symbol: '🐢', name: 'لاک‌پشت' },
  { symbol: '🦌', name: 'گوزن شمالی' },
];

// Harder pair levels: 4 pairs (8 cards), 6 pairs (12 cards), 8 pairs (16 cards), 10 pairs (20 cards)
const PAIR_LEVELS = MEMORY_PAIR_LEVEL_VALUES;

// Ascending number card levels: 5, 7, 9, 12 cards
const NUMBER_LEVELS = MEMORY_NUMBER_LEVEL_VALUES;

function toPersianDigits(num: number | string): string {
  return String(num).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

function buildShuffledNumberDeck(count: number): NumberCardItem[] {
  const pool = new Set<number>();
  while (pool.size < count) {
    pool.add(Math.floor(Math.random() * 90) + 1);
  }
  const sortedValues = Array.from(pool).sort((a, b) => a - b);

  const deck: NumberCardItem[] = sortedValues.map((val, idx) => ({
    id: idx,
    value: val,
    orderIndex: idx,
    isFlipped: true,
    isSolved: false,
    isWrong: false,
  }));

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export const MemoryCardsGame: React.FC<MemoryCardsGameProps> = ({
  onComplete,
  onClose,
  challengeConfig = null,
  onChallengeComplete,
}) => {
  const isChallengeMode = Boolean(challengeConfig);
  const [savedPlacement, setSavedPlacement] = useState<SavedMemoryPlacement | null>(
    loadSavedMemoryPlacement
  );
  const [phase, setPhase] = useState<MemoryPhase>(() =>
    isChallengeMode
      ? 'playing'
      : loadSavedMemoryPlacement()
      ? 'playing'
      : 'placement_intro'
  );
  const [gameMode, setGameMode] = useState<MemoryGameMode>('numbers');

  // Pre-select calibrated level if already evaluated
  const [levelPairs, setLevelPairs] = useState<number>(() => {
    const saved = loadSavedMemoryPlacement();
    return saved ? PAIR_LEVELS[saved.calibratedLevel - 1] : PAIR_LEVELS[0];
  });
  const [numberCount, setNumberCount] = useState<number>(() => {
    if (isChallengeMode) return NUMBER_LEVELS[0];
    const saved = loadSavedMemoryPlacement();
    return saved ? NUMBER_LEVELS[saved.calibratedLevel - 1] : NUMBER_LEVELS[0];
  });

  // Escalating Group Challenge state (stages 0..3 -> 5, 7, 9, 12 cards; max 3 total mistakes)
  const [challengeStageIdx, setChallengeStageIdx] = useState<number>(0);
  const [challengeClearedStages, setChallengeClearedStages] = useState<number>(0);
  const [challengeTotalMistakes, setChallengeTotalMistakes] = useState<number>(0);
  const [challengeMaxCardCount, setChallengeMaxCardCount] = useState<number>(0);
  const [challengeFinished, setChallengeFinished] = useState<{
    score: number;
    wonAll: boolean;
    isNewRecord: boolean | null;
    bestScore: number | null;
    submitting: boolean;
  } | null>(null);
  const challengeStartedAtMsRef = useRef<number>(Date.now());

  // Pair matching state
  const [pairCards, setPairCards] = useState<PairCardItem[]>([]);
  const [selectedPairIds, setSelectedPairIds] = useState<number[]>([]);
  const [pairMistakes, setPairMistakes] = useState<number>(0);

  // Ascending numbers state (shared between regular 'numbers' mode and adaptive placement)
  const [numberCards, setNumberCards] = useState<NumberCardItem[]>([]);
  const [nextOrderIndex, setNextOrderIndex] = useState<number>(0);
  const [numberMistakes, setNumberMistakes] = useState<number>(0);
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);

  // Adaptive Placement state (3 micro-rounds)
  const [placementRoundIdx, setPlacementRoundIdx] = useState<number>(0);
  const [placementProbeTier, setPlacementProbeTier] = useState<number>(
    MEMORY_PLACEMENT_START_TIER
  );
  const [placementAttempts, setPlacementAttempts] = useState<MemoryPlacementAttempt[]>([]);
  const [placementSummary, setPlacementSummary] = useState<MemoryPlacementSummary | null>(null);
  const [placementStepNotice, setPlacementStepNotice] = useState<string | null>(null);

  // Shared preview & completion state
  const [isPreviewing, setIsPreviewing] = useState<boolean>(true);
  const [previewRemainingMs, setPreviewRemainingMs] = useState<number>(3000);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const previewTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const actionTimeoutRef = useRef<number | null>(null);
  const recallStartMsRef = useRef<number>(Date.now());
  const sessionStartMsRef = useRef<number>(Date.now());
  const sessionStartIsoRef = useRef<string>(new Date().toISOString());
  const isSubmittingRef = useRef<boolean>(false);

  const clearPreviewTimers = useCallback(() => {
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const clearActionTimeout = useCallback(() => {
    if (actionTimeoutRef.current !== null) {
      window.clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearPreviewTimers();
    clearActionTimeout();
  }, [clearPreviewTimers, clearActionTimeout]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const startPreviewCountdown = useCallback(
    (durationMs: number, onFinishFlipDown: () => void) => {
      clearPreviewTimers();
      setIsPreviewing(true);
      setPreviewRemainingMs(durationMs);

      let remainMs = durationMs;
      countdownIntervalRef.current = window.setInterval(() => {
        if (document.hidden) return;
        remainMs = Math.max(0, remainMs - 100);
        setPreviewRemainingMs(remainMs);
        if (remainMs <= 0) {
          clearPreviewTimers();
          setIsPreviewing(false);
          recallStartMsRef.current = Date.now();
          onFinishFlipDown();
        }
      }, 100);
    },
    [clearPreviewTimers]
  );

  // Setup Pair-Matching Deck
  const setupPairsDeck = useCallback(
    (pairsCount: number) => {
      clearAllTimers();
      const shuffledSymbols = [...NATURE_SYMBOLS].sort(() => Math.random() - 0.5);
      const chosen = shuffledSymbols.slice(0, pairsCount);
      const deck: PairCardItem[] = [];

      chosen.forEach((item, idx) => {
        deck.push({
          id: idx * 2,
          symbol: item.symbol,
          name: item.name,
          isFlipped: true,
          isMatched: false,
        });
        deck.push({
          id: idx * 2 + 1,
          symbol: item.symbol,
          name: item.name,
          isFlipped: true,
          isMatched: false,
        });
      });

      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }

      setPairCards(deck);
      setSelectedPairIds([]);
      setPairMistakes(0);
      setIsCompleted(false);
      setIsBusy(false);

      const previewMs =
        pairsCount <= 4 ? 2800 : pairsCount <= 6 ? 3600 : pairsCount <= 8 ? 4400 : 5200;
      startPreviewCountdown(previewMs, () => {
        setPairCards((prev) => prev.map((c) => ({ ...c, isFlipped: false })));
      });
    },
    [clearAllTimers, startPreviewCountdown]
  );

  // Setup Ascending-Numbers Deck (for regular mode OR a custom placement tier)
  const setupNumbersDeck = useCallback(
    (count: number, customPreviewMs?: number) => {
      clearAllTimers();
      const deck = buildShuffledNumberDeck(count);

      setNumberCards(deck);
      setNextOrderIndex(0);
      setNumberMistakes(0);
      setWrongFeedback(null);
      setPlacementStepNotice(null);
      setIsCompleted(false);
      setIsBusy(false);

      const previewMs =
        customPreviewMs ??
        (count <= 5 ? 3600 : count <= 7 ? 4600 : count <= 9 ? 5600 : 6800);
      startPreviewCountdown(previewMs, () => {
        setNumberCards((prev) => prev.map((c) => ({ ...c, isFlipped: false })));
      });
    },
    [clearAllTimers, startPreviewCountdown]
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    if (gameMode === 'pairs') {
      setupPairsDeck(levelPairs);
    } else {
      setupNumbersDeck(numberCount);
    }
  }, [phase, gameMode, levelPairs, numberCount, setupPairsDeck, setupNumbersDeck]);

  // Launch 3-round adaptive memory placement
  const startPlacement = useCallback(() => {
    clearAllTimers();
    sound.playClick();
    const startCfg = getMemoryPlacementTierConfig(MEMORY_PLACEMENT_START_TIER);
    setPlacementRoundIdx(0);
    setPlacementProbeTier(MEMORY_PLACEMENT_START_TIER);
    setPlacementAttempts([]);
    setPlacementSummary(null);
    setPlacementStepNotice(null);
    setPhase('placement_playing');
    setupNumbersDeck(startCfg.numberCount, startCfg.previewMs);
  }, [clearAllTimers, setupNumbersDeck]);

  const finalizeMemoryChallenge = useCallback(
    (params: {
      clearedStages: number;
      maxCardCount: number;
      totalMistakes: number;
      wonAll: boolean;
    }) => {
      const elapsedSeconds = Math.max(
        5,
        Math.round((Date.now() - challengeStartedAtMsRef.current) / 1000)
      );
      const score = calculateMemoryChallengeScore({
        clearedStages: params.clearedStages,
        maxCardCount: params.maxCardCount,
        totalMistakes: params.totalMistakes,
        elapsedSeconds,
      });
      setChallengeFinished({
        score,
        wonAll: params.wonAll,
        isNewRecord: null,
        bestScore: challengeConfig?.personalBestScore ?? null,
        submitting: true,
      });
      setIsCompleted(true);
      setIsBusy(false);

      Promise.resolve(
        onChallengeComplete?.({
          score,
          detailLabel:
            params.clearedStages > 0
              ? `عبور تا ${toPersianDigits(params.maxCardCount)} عدد • ${toPersianDigits(params.totalMistakes)} خطا`
              : `${toPersianDigits(params.totalMistakes)} خطا`,
        })
      )
        .then((res) => {
          setChallengeFinished((prev) =>
            prev
              ? {
                  ...prev,
                  isNewRecord: res ? res.isNewRecord : true,
                  bestScore: res ? res.bestScore : score,
                  submitting: false,
                }
              : null
          );
        })
        .catch(() => {
          setChallengeFinished((prev) =>
            prev ? { ...prev, submitting: false } : null
          );
        });
    },
    [challengeConfig?.personalBestScore, onChallengeComplete]
  );

  const startMemoryChallengeRun = useCallback(() => {
    clearAllTimers();
    sound.playClick();
    challengeStartedAtMsRef.current = Date.now();
    setChallengeStageIdx(0);
    setChallengeClearedStages(0);
    setChallengeTotalMistakes(0);
    setChallengeMaxCardCount(0);
    setChallengeFinished(null);
    setGameMode('numbers');
    setNumberCount(NUMBER_LEVELS[0]);
    setPhase('playing');
    setupNumbersDeck(NUMBER_LEVELS[0]);
  }, [clearAllTimers, setupNumbersDeck]);

  const enterPlayingAtLevel = useCallback(
    (level: number) => {
      const clamped = Math.max(1, Math.min(4, Math.round(level)));
      clearAllTimers();
      sound.playClick();
      setLevelPairs(PAIR_LEVELS[clamped - 1]);
      setNumberCount(NUMBER_LEVELS[clamped - 1]);
      setGameMode('numbers');
      setPhase('playing');
    },
    [clearAllTimers]
  );

  const handleSkipPreview = () => {
    if (!isPreviewing) return;
    sound.playCardFlip();
    clearPreviewTimers();
    setPreviewRemainingMs(0);
    setIsPreviewing(false);
    recallStartMsRef.current = Date.now();
    if (phase === 'playing' && gameMode === 'pairs') {
      setPairCards((prev) => prev.map((c) => ({ ...c, isFlipped: false })));
    } else {
      setNumberCards((prev) => prev.map((c) => ({ ...c, isFlipped: false })));
    }
  };

  // Pair Mode Click Handler
  const handlePairCardClick = (cardId: number) => {
    if (phase !== 'playing' || isPreviewing || isBusy || isCompleted) return;
    if (selectedPairIds.length >= 2) return;

    const clickedCard = pairCards.find((c) => c.id === cardId);
    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched) return;

    sound.playCardFlip();

    const newSelected = [...selectedPairIds, cardId];
    setSelectedPairIds(newSelected);

    setPairCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );

    if (newSelected.length === 2) {
      setIsBusy(true);
      const card1 = pairCards.find((c) => c.id === newSelected[0]);
      const card2 = clickedCard;

      if (card1 && card1.symbol === card2.symbol) {
        clearActionTimeout();
        actionTimeoutRef.current = window.setTimeout(() => {
          actionTimeoutRef.current = null;
          sound.playCardMatch();
          setPairCards((prev) =>
            prev.map((c) =>
              c.id === newSelected[0] || c.id === newSelected[1]
                ? { ...c, isMatched: true }
                : c
            )
          );
          setSelectedPairIds([]);
          setIsBusy(false);

          const remaining = pairCards.filter(
            (c) => !c.isMatched && c.id !== newSelected[0] && c.id !== newSelected[1]
          );
          if (remaining.length === 0) {
            sound.playCoin();
            confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 } });
            setIsCompleted(true);
          }
        }, 360);
      } else {
        setPairMistakes((m) => m + 1);
        clearActionTimeout();
        actionTimeoutRef.current = window.setTimeout(() => {
          actionTimeoutRef.current = null;
          setPairCards((prev) =>
            prev.map((c) =>
              c.id === newSelected[0] || c.id === newSelected[1]
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setSelectedPairIds([]);
          setIsBusy(false);
        }, 820);
      }
    }
  };

  // Ascending Numbers Mode Click Handler (used for both regular Numbers mode & Placement rounds)
  const handleNumberCardClick = (cardId: number) => {
    if (isPreviewing || isBusy || isCompleted) return;

    const clickedCard = numberCards.find((c) => c.id === cardId);
    if (!clickedCard || clickedCard.isSolved || clickedCard.isFlipped) return;

    sound.playCardFlip();
    setWrongFeedback(null);

    if (clickedCard.orderIndex === nextOrderIndex) {
      sound.playCardMatch();
      const updatedNext = nextOrderIndex + 1;
      setNextOrderIndex(updatedNext);
      setNumberCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, isFlipped: true, isSolved: true, isWrong: false }
            : c
        )
      );

      if (updatedNext >= numberCards.length) {
        if (phase === 'placement_playing') {
          const recallTimeMs = Math.max(400, Date.now() - recallStartMsRef.current);
          const attempt: MemoryPlacementAttempt = {
            tier: placementProbeTier,
            cardCount: numberCards.length,
            mistakes: numberMistakes,
            recallTimeMs,
          };
          const nextAttempts = [...placementAttempts, attempt];
          const nextTier = getNextMemoryPlacementProbeTier(
            placementProbeTier,
            numberMistakes,
            recallTimeMs
          );
          setPlacementAttempts(nextAttempts);
          setIsBusy(true);

          if (placementRoundIdx + 1 < MEMORY_PLACEMENT_ROUNDS) {
            const nextTierCfg = getMemoryPlacementTierConfig(nextTier);
            setPlacementStepNotice(
              numberMistakes === 0
                ? `عالی! بدون خطا · انتقال به ${nextTierCfg.title}`
                : `ثبت شد (${toPersianDigits(numberMistakes)} خطا) · مرحله بعد: ${nextTierCfg.title}`
            );

            clearActionTimeout();
            actionTimeoutRef.current = window.setTimeout(() => {
              actionTimeoutRef.current = null;
              setPlacementRoundIdx((r) => r + 1);
              setPlacementProbeTier(nextTier);
              setupNumbersDeck(nextTierCfg.numberCount, nextTierCfg.previewMs);
            }, 850);
          } else {
            setPlacementStepNotice('در حال محاسبه سطح حافظه شما...');
            clearActionTimeout();
            actionTimeoutRef.current = window.setTimeout(() => {
              actionTimeoutRef.current = null;
              const summary = evaluateMemoryPlacement(nextAttempts);
              const saved = saveMemoryPlacement(summary);
              setSavedPlacement(saved);
              setPlacementSummary(summary);
              setLevelPairs(PAIR_LEVELS[summary.recommendedLevel - 1]);
              setNumberCount(NUMBER_LEVELS[summary.recommendedLevel - 1]);
              setIsBusy(false);
              setPhase('placement_result');
              sound.playCoin();
              confetti({ particleCount: 85, spread: 70, origin: { y: 0.6 } });
            }, 650);
          }
        } else if (isChallengeMode) {
          const nextCleared = challengeClearedStages + 1;
          const stageCardsCount = NUMBER_LEVELS[challengeStageIdx] ?? numberCards.length;
          const nextMaxCards = Math.max(challengeMaxCardCount, stageCardsCount);
          setChallengeClearedStages(nextCleared);
          setChallengeMaxCardCount(nextMaxCards);

          if (challengeStageIdx + 1 < NUMBER_LEVELS.length) {
            const nextCount = NUMBER_LEVELS[challengeStageIdx + 1];
            setIsBusy(true);
            setPlacementStepNotice(
              `آفرین! مرحله ${toPersianDigits(challengeStageIdx + 1)} تکمیل شد · صعود به ${toPersianDigits(nextCount)} عدد`
            );
            clearActionTimeout();
            actionTimeoutRef.current = window.setTimeout(() => {
              actionTimeoutRef.current = null;
              setChallengeStageIdx((s) => s + 1);
              setNumberCount(nextCount);
            }, 900);
          } else {
            sound.playCoin();
            confetti({ particleCount: 95, spread: 75, origin: { y: 0.6 } });
            finalizeMemoryChallenge({
              clearedStages: nextCleared,
              maxCardCount: nextMaxCards,
              totalMistakes: challengeTotalMistakes,
              wonAll: true,
            });
          }
        } else {
          sound.playCoin();
          confetti({ particleCount: 85, spread: 70, origin: { y: 0.6 } });
          setIsCompleted(true);
        }
      }
    } else {
      // Wrong card! Flash the clicked card briefly so user sees its number, then flip back down
      setIsBusy(true);
      const nextStageMistakes = numberMistakes + 1;
      const nextTotalChallengeMistakes = challengeTotalMistakes + 1;
      setNumberMistakes(nextStageMistakes);
      if (isChallengeMode) {
        setChallengeTotalMistakes(nextTotalChallengeMistakes);
      }

      setWrongFeedback(
        `این کارت عدد ${toPersianDigits(clickedCard.value)} بود! باید کوچک‌ترین عدد باقی‌مانده را انتخاب کنی.`
      );
      setNumberCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, isFlipped: true, isWrong: true } : c
        )
      );

      clearActionTimeout();
      actionTimeoutRef.current = window.setTimeout(() => {
        actionTimeoutRef.current = null;
        if (isChallengeMode && nextTotalChallengeMistakes >= 3) {
          finalizeMemoryChallenge({
            clearedStages: challengeClearedStages,
            maxCardCount: challengeMaxCardCount,
            totalMistakes: nextTotalChallengeMistakes,
            wonAll: false,
          });
          return;
        }
        setNumberCards((prev) =>
          prev.map((c) =>
            c.id === cardId ? { ...c, isFlipped: false, isWrong: false } : c
          )
        );
        setIsBusy(false);
      }, 900);
    }
  };

  const handleRestartCurrent = () => {
    sound.playClick();
    if (gameMode === 'pairs') {
      setupPairsDeck(levelPairs);
    } else {
      setupNumbersDeck(numberCount);
    }
  };

  const handleCompleteAndWaterNow = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    clearAllTimers();
    sound.playWater();
    const totalSteps = gameMode === 'pairs' ? levelPairs : numberCount;
    const mistakes = gameMode === 'pairs' ? pairMistakes : numberMistakes;
    const accuracyPercent = Math.min(
      100,
      Math.max(10, Math.round((totalSteps / Math.max(1, totalSteps + mistakes)) * 100))
    );
    const durationSeconds = Math.max(
      5,
      Math.round((Date.now() - sessionStartMsRef.current) / 1000)
    );
    onComplete(true, {
      treeId: 'memory_cards',
      completedReadingOrPractice: true,
      answeredCorrectly: true,
      overallSuccess: true,
      accuracyPercent,
      durationSeconds,
      startedAt: sessionStartIsoRef.current,
      completedAt: new Date().toISOString(),
    });
  };

  const handleNextLevelOrFinish = () => {
    if (gameMode === 'pairs') {
      const idx = PAIR_LEVELS.indexOf(levelPairs as (typeof PAIR_LEVELS)[number]);
      if (idx >= 0 && idx < PAIR_LEVELS.length - 1) {
        sound.playClick();
        setLevelPairs(PAIR_LEVELS[idx + 1]);
      } else {
        handleCompleteAndWaterNow();
      }
    } else {
      const idx = NUMBER_LEVELS.indexOf(numberCount as (typeof NUMBER_LEVELS)[number]);
      if (idx >= 0 && idx < NUMBER_LEVELS.length - 1) {
        sound.playClick();
        setNumberCount(NUMBER_LEVELS[idx + 1]);
      } else {
        handleCompleteAndWaterNow();
      }
    }
  };

  // Determine responsive grid columns and card dimensions based on card count
  const getPairsGridClass = (totalCards: number) => {
    if (totalCards <= 8) return 'grid-cols-4 gap-2.5 sm:gap-3.5';
    if (totalCards <= 12) return 'grid-cols-4 gap-2 sm:gap-3';
    if (totalCards <= 16) return 'grid-cols-4 gap-2 sm:gap-2.5';
    return 'grid-cols-5 gap-1.5 sm:gap-2.5'; // 20 cards (5x4)
  };

  const getPairsCardSizeClass = (totalCards: number) => {
    if (totalCards <= 8) return 'w-16 sm:w-20 h-20 sm:h-24 text-2xl sm:text-3xl';
    if (totalCards <= 12) return 'w-15 sm:w-19 h-18 sm:h-22 text-2xl sm:text-3xl';
    if (totalCards <= 16) return 'w-14 sm:w-18 h-16 sm:h-20 text-xl sm:text-2xl';
    return 'w-12 sm:w-16 h-14 sm:h-18 text-lg sm:text-2xl'; // 20 cards
  };

  const getNumbersGridClass = (totalCards: number) => {
    if (totalCards <= 4) return 'grid-cols-4 gap-2.5 sm:gap-3.5';
    if (totalCards <= 6) return 'grid-cols-3 gap-2.5 sm:gap-3.5';
    if (totalCards <= 8) return 'grid-cols-4 gap-2 sm:gap-3';
    if (totalCards <= 10) return 'grid-cols-5 gap-2 sm:gap-2.5';
    return 'grid-cols-4 gap-2 sm:gap-2.5'; // 12 cards
  };

  const getNumbersCardSizeClass = (totalCards: number) => {
    if (totalCards <= 5) return 'w-18 sm:w-20 h-22 sm:h-24';
    if (totalCards <= 9) return 'w-16 sm:w-20 h-18 sm:h-22';
    return 'w-14 sm:w-18 h-16 sm:h-20';
  };

  const solvedNumbersList = [...numberCards]
    .filter((c) => c.isSolved)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const placementTierCfg = getMemoryPlacementTierConfig(placementProbeTier);

  return (
    <div
      lang="fa"
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center p-2.5 sm:p-4 bg-[#040e0a]/92 backdrop-blur-md animate-fadeIn overflow-y-auto"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      <div className="relative w-full max-w-xl bg-gradient-to-b from-[#241a12] via-[#18110c] to-[#0e0a07] border-2 border-amber-300/45 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-50 flex flex-col justify-between min-h-[520px] max-h-[94dvh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-amber-300/25 pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-400/20 border border-amber-300/50 flex items-center justify-center text-amber-200 shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black text-white">
                  {isChallengeMode
                    ? `رقابت گروهی: ${challengeConfig?.title}`
                    : 'درخت حافظه — باشگاه تمرکز و یادسپاری'}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/45 text-amber-100 font-bold">
                  {isChallengeMode
                    ? `مرحله ${toPersianDigits(challengeStageIdx + 1)} از ۴ • حداکثر ۳ خطا`
                    : '۴ سطح · تعیین سطح هوشمند'}
                </span>
              </div>
              <p className="text-[11px] text-stone-200">
                {isChallengeMode
                  ? `ترتیب اعداد صعودی (${toPersianDigits(numberCount)} عدد) — خطاهای کل: ${toPersianDigits(challengeTotalMistakes)} از ۳`
                  : phase === 'placement_intro'
                  ? 'سنجش کوتاه حافظه دیداری و توالی برای تعیین سطح مناسب شما'
                  : phase === 'placement_playing'
                  ? `تعیین سطح · گام ${toPersianDigits(placementRoundIdx + 1)} از ${toPersianDigits(MEMORY_PLACEMENT_ROUNDS)} (${placementTierCfg.title})`
                  : phase === 'placement_result'
                  ? 'نتیجه ارزیابی حافظه و سطح پیشنهادی شما آماده است'
                  : gameMode === 'pairs'
                  ? `مدل جفت‌یابی تصاویر (${toPersianDigits(levelPairs)} جفت • ${toPersianDigits(levelPairs * 2)} کارت)`
                  : `مدل ترتیب اعداد از کوچک به بزرگ (${toPersianDigits(numberCount)} کارت عدد)`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              clearAllTimers();
              sound.playClick();
              onClose();
            }}
            aria-label="بستن بازی درخت حافظه"
            className="w-8 h-8 rounded-full bg-[#302318] hover:bg-amber-900 border border-amber-300/35 text-slate-100 flex items-center justify-center text-sm font-bold cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* =========================================================================
            PHASE 0A: INITIAL PLACEMENT INTRO (SHOWN ON FIRST VISIT)
           ========================================================================= */}
        {phase === 'placement_intro' && (
          <div className="my-5 flex flex-col items-center text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400/30 to-orange-500/25 border-2 border-amber-300/60 flex items-center justify-center shadow-lg">
              <Compass className="w-8 h-8 text-amber-200" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/45 text-amber-200 text-[11px] font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>تعیین سطح اولیه درخت حافظه</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                ظرفیت حافظه و تمرکز خود را در ۳۰ ثانیه بسنجید!
              </h3>
              <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                در <strong>{toPersianDigits(MEMORY_PLACEMENT_ROUNDS)} مرحله کوتاه و تطبیقی</strong>، چند کارت عدد به شما نشان داده می‌شود و پس از پنهان شدن باید آن‌ها را از کوچک به بزرگ انتخاب کنید. بر اساس{' '}
                <strong>تعداد خطا و سرعت یادآوری</strong>، سطح مناسب شما (۱ تا ۴) مشخص می‌شود.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full max-w-md text-[11px]">
              <div className="bg-[#302318] border border-amber-300/35 rounded-2xl p-2.5">
                <div className="font-black text-amber-300">۳ مرحله تطبیقی</div>
                <div className="text-stone-200 mt-0.5">شروع از ۶ کارت</div>
              </div>
              <div className="bg-[#302318] border border-amber-300/35 rounded-2xl p-2.5">
                <div className="font-black text-cyan-300">سنجش دقت و سرعت</div>
                <div className="text-stone-200 mt-0.5">بدون شانس و حدس</div>
              </div>
              <div className="bg-[#302318] border border-amber-300/35 rounded-2xl p-2.5">
                <div className="font-black text-emerald-300">هماهنگ با بازی اصلی</div>
                <div className="text-stone-200 mt-0.5">اعداد (کم به زیاد) و کارت</div>
              </div>
            </div>

            <div className="w-full max-w-md flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={startPlacement}
                className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>شروع تعیین سطح حافظه ({toPersianDigits(MEMORY_PLACEMENT_ROUNDS)} مرحله)</span>
              </button>

              <button
                type="button"
                onClick={() => enterPlayingAtLevel(1)}
                className="py-2 text-xs font-bold text-stone-200 hover:text-white cursor-pointer"
              >
                فعلاً رد شو و مستقیم وارد بازی شو
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PHASE 0B: ADAPTIVE PLACEMENT RESULT SCREEN
           ========================================================================= */}
        {phase === 'placement_result' && placementSummary && (
          <div className="my-4 space-y-4 animate-fadeIn">
            <div className="rounded-3xl bg-gradient-to-b from-[#302318] via-[#241a12] to-[#120c08] border-2 border-amber-300/55 p-4 sm:p-5 text-center space-y-2.5 shadow-xl">
              <div className="inline-flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/50 text-amber-200 text-xs font-black px-3 py-0.5 rounded-full">
                <Trophy className="w-4 h-4" />
                <span>نتیجه تعیین سطح اولیه درخت حافظه</span>
              </div>

              <div className="text-xs font-bold text-emerald-300">
                {placementSummary.skillLabel}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white">
                سطح پیشنهادی شما: سطح {toPersianDigits(placementSummary.recommendedLevel)} از ۴
              </h3>

              <p className="text-xs text-stone-200">
                بازی اصلی (ترتیب اعداد از کم به زیاد): {toPersianDigits(placementSummary.recommendedNumberCount)} عدد • بازی دوم (جفت‌یابی کارت‌ها): {toPersianDigits(placementSummary.recommendedPairCount * 2)} کارت
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-[#120c08] border border-amber-300/35 rounded-2xl p-2.5">
                  <div className="text-[10px] text-stone-300">کل خطاها</div>
                  <div className="text-sm sm:text-base font-black text-emerald-300 mt-0.5">
                    {toPersianDigits(placementSummary.totalMistakes)} خطا
                  </div>
                </div>
                <div className="bg-[#120c08] border border-amber-300/35 rounded-2xl p-2.5">
                  <div className="text-[10px] text-stone-300">میانگین یادآوری</div>
                  <div className="text-sm sm:text-base font-black text-cyan-300 mt-0.5">
                    {toPersianDigits(placementSummary.averageRecallSeconds)} ثانیه
                  </div>
                </div>
                <div className="bg-[#120c08] border border-amber-300/35 rounded-2xl p-2.5">
                  <div className="text-[10px] text-stone-300">سطح تعیین‌شده</div>
                  <div className="text-sm sm:text-base font-black text-amber-300 mt-0.5">
                    سطح {toPersianDigits(placementSummary.recommendedLevel)} از ۴
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => enterPlayingAtLevel(placementSummary.recommendedLevel)}
                className="flex-1 min-h-[46px] py-2.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>شروع بازی در سطح {toPersianDigits(placementSummary.recommendedLevel)}</span>
              </button>

              <button
                type="button"
                onClick={startPlacement}
                className="min-h-[46px] py-2.5 px-4 rounded-2xl bg-[#120c08] hover:bg-[#302318] border border-amber-300/35 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>آزمون مجدد</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PHASE 0C / PHASE 1: ADAPTIVE PLACEMENT OR REGULAR GAMEPLAY
           ========================================================================= */}
        {(phase === 'placement_playing' || phase === 'playing') && (
          <>
            {phase === 'placement_playing' ? (
              <div className="my-2 space-y-2">
                <div className="flex items-center justify-between gap-2 bg-[#302318] border border-amber-300/35 rounded-2xl px-3.5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-xl bg-[#fbbf24] text-slate-950 font-black text-[11px]">
                      تعیین سطح · {placementTierCfg.title}
                    </span>
                    <span className="text-xs font-black text-slate-100">
                      مرحله {toPersianDigits(placementRoundIdx + 1)} از {toPersianDigits(MEMORY_PLACEMENT_ROUNDS)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: MEMORY_PLACEMENT_ROUNDS }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-2 rounded-full transition-all ${
                          idx === placementRoundIdx
                            ? 'w-6 bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                            : idx < placementAttempts.length
                            ? placementAttempts[idx].mistakes === 0
                              ? 'w-2.5 bg-emerald-400'
                              : 'w-2.5 bg-cyan-400'
                            : 'w-2.5 bg-amber-900'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {!isChallengeMode ? (
                  <>
                    {/* Calibrated Recommendation & Recalibrate Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#302318] border border-amber-300/35 rounded-2xl px-3 py-1.5 mt-2 text-[11px]">
                      <span className="text-stone-200 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        {savedPlacement
                          ? `سطح پیشنهادی حافظه شما: سطح ${toPersianDigits(savedPlacement.calibratedLevel)} از ۴`
                          : 'هنوز تعیین سطح حافظه انجام نشده است'}
                      </span>
                      <button
                        type="button"
                        onClick={startPlacement}
                        className="px-2.5 py-1 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/50 text-amber-200 font-black text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Compass className="w-3 h-3" />
                        <span>{savedPlacement ? 'تعیین سطح مجدد' : 'آزمون تعیین سطح (۳ مرحله)'}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2 bg-[#302318] border border-amber-300/45 rounded-2xl px-3.5 py-2 mt-2 text-xs">
                    <span className="font-black text-amber-300">
                      چالش پلکانی: {toPersianDigits(numberCount)} عدد
                    </span>
                    <span className="font-bold text-rose-200">
                      فرصت باقی‌مانده: {toPersianDigits(Math.max(0, 3 - challengeTotalMistakes))} جان
                    </span>
                  </div>
                )}

                {/* Game Mode Switcher & Level Controls (hidden in Group Challenge Mode) */}
                {!isChallengeMode && (
                <>
                <div className="grid grid-cols-2 gap-2 my-2 bg-[#120c08] p-1.5 rounded-2xl border border-amber-300/30">
                  <button
                    type="button"
                    onClick={() => {
                      if (gameMode !== 'numbers') {
                        sound.playClick();
                        setGameMode('numbers');
                      }
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      gameMode === 'numbers'
                        ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 shadow-md'
                        : 'text-stone-200 hover:bg-[#302318]'
                    }`}
                  >
                    <Hash className="w-4 h-4 shrink-0" />
                    <span>بازی ۱: ترتیب اعداد (کم به زیاد)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (gameMode !== 'pairs') {
                        sound.playClick();
                        setGameMode('pairs');
                      }
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      gameMode === 'pairs'
                        ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 shadow-md'
                        : 'text-stone-200 hover:bg-[#302318]'
                    }`}
                  >
                    <Layers className="w-4 h-4 shrink-0" />
                    <span>بازی ۲: جفت‌یابی کارت‌ها</span>
                  </button>
                </div>

                {/* Difficulty / Card Count Selector */}
                {gameMode === 'pairs' ? (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 my-1">
                    {PAIR_LEVELS.map((p, idx) => {
                      const lvl = idx + 1;
                      const isRecommended = savedPlacement?.calibratedLevel === lvl;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setLevelPairs(p);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            levelPairs === p
                              ? 'bg-[#fbbf24] text-slate-950 shadow-md border border-amber-200'
                              : 'bg-[#302318] text-stone-100 hover:bg-[#3f2e20] border border-amber-300/30'
                          }`}
                        >
                          <span>
                            سطح {toPersianDigits(lvl)} ({toPersianDigits(p * 2)} کارت)
                          </span>
                          {isRecommended && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                                levelPairs === p
                                  ? 'bg-slate-950 text-amber-300'
                                  : 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50'
                              }`}
                            >
                              پیشنهادی ★
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 my-1">
                    {NUMBER_LEVELS.map((cnt, idx) => {
                      const lvl = idx + 1;
                      const isRecommended = savedPlacement?.calibratedLevel === lvl;
                      return (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setNumberCount(cnt);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            numberCount === cnt
                              ? 'bg-[#fbbf24] text-slate-950 shadow-md border border-amber-200'
                              : 'bg-[#302318] text-stone-100 hover:bg-[#3f2e20] border border-amber-300/30'
                          }`}
                        >
                          <span>
                            سطح {toPersianDigits(lvl)} ({toPersianDigits(cnt)} عدد)
                          </span>
                          {isRecommended && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                                numberCount === cnt
                                  ? 'bg-slate-950 text-amber-300'
                                  : 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50'
                              }`}
                            >
                              پیشنهادی ★
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                </>
                )}
              </>
            )}

            {/* Status & Instruction Bar */}
            <div className="my-1.5">
              {isPreviewing ? (
                <div className="flex items-center justify-between gap-2 bg-amber-500/20 border border-amber-300/45 px-3 py-1.5 rounded-2xl text-xs text-amber-100">
                  <span className="font-bold">
                    {phase === 'playing' && gameMode === 'pairs'
                      ? '👀 جای جفت‌ها را به خاطر بسپارید...'
                      : '👀 اعداد را به خاطر بسپارید تا از کوچک به بزرگ انتخاب کنید...'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-amber-300 tabular-nums">
                      {toPersianDigits(Math.ceil(previewRemainingMs / 1000))} ثانیه
                    </span>
                    <button
                      type="button"
                      onClick={handleSkipPreview}
                      className="px-2 py-0.5 rounded-lg bg-[#fbbf24] hover:bg-[#fde68a] text-slate-950 font-black text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>شروع فوری</span>
                    </button>
                  </div>
                </div>
              ) : (phase === 'placement_playing' || gameMode === 'numbers') && !isCompleted ? (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#302318] border border-amber-300/35 px-3 py-1.5 rounded-2xl text-xs">
                  <span className="text-slate-100 font-bold">
                    🎯 گام {toPersianDigits(Math.min(nextOrderIndex + 1, numberCards.length))} از{' '}
                    {toPersianDigits(numberCards.length)}: روی کوچک‌ترین عدد باقی‌مانده کلیک کنید
                  </span>
                  <span className="text-amber-300 font-bold text-[11px]">
                    خطاها: {toPersianDigits(numberMistakes)}
                  </span>
                </div>
              ) : gameMode === 'pairs' && !isCompleted ? (
                <div className="flex items-center justify-between gap-2 bg-[#302318] border border-amber-300/35 px-3 py-1.5 rounded-2xl text-xs">
                  <span className="text-slate-100 font-bold">
                    🃏 جفت‌های پیدا شده: {toPersianDigits(pairCards.filter((c) => c.isMatched).length / 2)} از{' '}
                    {toPersianDigits(levelPairs)}
                  </span>
                  <span className="text-amber-300 font-bold text-[11px]">
                    تلاش ناموفق: {toPersianDigits(pairMistakes)}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Cards Grid Area */}
            <div className="flex-1 flex flex-col items-center justify-center my-2">
              {phase === 'playing' && gameMode === 'pairs' ? (
                <div className={`grid justify-items-center ${getPairsGridClass(pairCards.length)}`}>
                  {pairCards.map((card) => {
                    const flipped = card.isFlipped || card.isMatched;

                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handlePairCardClick(card.id)}
                        className={`${getPairsCardSizeClass(
                          pairCards.length
                        )} rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none shadow-lg border-2 ${
                          card.isMatched
                            ? 'bg-emerald-900/90 border-emerald-300 scale-95 opacity-100'
                            : flipped
                            ? 'bg-gradient-to-tr from-[#fef3c7] via-[#fde68a] to-[#f59e0b] text-slate-950 border-amber-100 scale-100'
                            : 'bg-[#2b1f15] border-amber-300/45 hover:border-amber-200 hover:scale-105'
                        }`}
                      >
                        {flipped ? (
                          <span className="drop-shadow">{card.symbol}</span>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5 opacity-100">
                            <span className="text-base sm:text-lg">🌿</span>
                            <span className="text-[9px] text-amber-200 font-bold">حافظه</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={`grid justify-items-center ${getNumbersGridClass(numberCards.length)}`}>
                  {numberCards.map((card) => {
                    const revealed = card.isFlipped || card.isSolved;

                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleNumberCardClick(card.id)}
                        className={`${getNumbersCardSizeClass(
                          numberCards.length
                        )} relative rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none shadow-lg border-2 ${
                          card.isSolved
                            ? 'bg-gradient-to-b from-emerald-700 to-emerald-900 border-emerald-300 scale-95'
                            : card.isWrong
                            ? 'bg-gradient-to-b from-rose-700 to-rose-900 border-rose-300 animate-pulse scale-105'
                            : revealed
                            ? 'bg-gradient-to-tr from-[#fef3c7] via-[#fde68a] to-[#f59e0b] text-slate-950 border-amber-100 scale-100'
                            : 'bg-[#2b1f15] border-amber-300/45 hover:border-amber-200 hover:scale-105'
                        }`}
                      >
                        {card.isSolved && (
                          <span className="absolute top-1 right-1.5 text-[9px] font-black bg-emerald-950/95 text-emerald-100 px-1.5 py-0.2 rounded-full border border-emerald-300/60">
                            #{toPersianDigits(card.orderIndex + 1)}
                          </span>
                        )}

                        {revealed ? (
                          <span
                            className={`text-2xl sm:text-3xl font-black tabular-nums ${
                              card.isSolved || card.isWrong ? 'text-white' : 'text-slate-950'
                            }`}
                          >
                            {toPersianDigits(card.value)}
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5 opacity-100">
                            <span className="text-lg sm:text-xl font-black text-amber-200">؟</span>
                            <span className="text-[9px] text-stone-200 font-bold">انتخاب</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sequence of Solved Numbers */}
              {(phase === 'placement_playing' || gameMode === 'numbers') &&
                solvedNumbersList.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#120c08] border border-emerald-400/35 text-xs">
                    <span className="text-emerald-300 font-bold">ترتیب بازشده (کوچک به بزرگ):</span>
                    {solvedNumbersList.map((item, idx) => (
                      <React.Fragment key={item.id}>
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-800/90 text-white font-black text-xs border border-emerald-300/50">
                          {toPersianDigits(item.value)}
                        </span>
                        {idx < solvedNumbersList.length - 1 && (
                          <span className="text-emerald-300 font-black">←</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
            </div>

            {/* Placement OR Challenge transition notice */}
            {(phase === 'placement_playing' || isChallengeMode) && placementStepNotice && (
              <div className="text-center text-xs text-emerald-200 bg-emerald-500/25 py-2 px-3 rounded-xl border border-emerald-400/50 my-1 font-black animate-pulse">
                {placementStepNotice}
              </div>
            )}

            {/* Wrong Click Feedback */}
            {wrongFeedback && !isCompleted && !placementStepNotice && (
              <div className="text-center text-xs text-rose-200 bg-rose-500/25 py-1.5 px-3 rounded-xl border border-rose-400/50 my-1 font-bold">
                {wrongFeedback}
              </div>
            )}

            {/* Completion Banner (hidden in challenge mode since dedicated card is shown) */}
            {phase === 'playing' && isCompleted && !isChallengeMode && (
              <div className="text-center text-xs sm:text-sm text-emerald-200 bg-emerald-500/25 py-2 px-4 rounded-2xl border border-emerald-400/50 my-1.5 font-black animate-bounce">
                {gameMode === 'pairs'
                  ? `🌟 آفرین! همه ${toPersianDigits(levelPairs)} جفت (${toPersianDigits(levelPairs * 2)} کارت) را با موفقیت پیدا کردی!`
                  : `🌟 عالی بود! همه ${toPersianDigits(numberCount)} عدد را به ترتیب از کوچک به بزرگ باز کردی!`}
              </div>
            )}

            {/* Bottom Actions */}
            {phase === 'placement_playing' ? (
              <div className="border-t border-amber-300/25 pt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => enterPlayingAtLevel(savedPlacement?.calibratedLevel ?? 1)}
                  className="text-xs font-bold text-stone-200 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>انصراف و ورود مستقیم به بازی</span>
                </button>
                <span className="text-[11px] text-stone-300">
                  در حال سنجش حافظه کاری
                </span>
              </div>
            ) : isChallengeMode ? (
              <div className="border-t border-amber-300/25 pt-3 space-y-2.5">
                {challengeFinished ? (
                  <>
                    <div className="p-3 rounded-2xl bg-[#302318] border border-amber-300/55 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-amber-300">
                          {challengeFinished.wonAll
                            ? `🏆 تمام مراحل تکمیل شد! امتیاز: ${toPersianDigits(challengeFinished.score)}`
                            : `پایان رقابت · امتیاز: ${toPersianDigits(challengeFinished.score)}`}
                        </div>
                        <div className="text-[11px] text-emerald-200 mt-0.5">
                          {challengeFinished.submitting
                            ? 'در حال ثبت رکورد در گروه...'
                            : challengeFinished.isNewRecord
                            ? `🎉 رکورد جدید شما در چت گروه ثبت شد! (بهترین: ${toPersianDigits(challengeFinished.bestScore ?? challengeFinished.score)})`
                            : `بالاترین رکورد قبلی شما (${toPersianDigits(challengeFinished.bestScore ?? 0)} امتیاز) حفظ شد.`}
                        </div>
                      </div>
                      <Trophy className="w-6 h-6 text-amber-300 shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={startMemoryChallengeRun}
                        className="px-3.5 py-2.5 rounded-xl bg-[#302318] hover:bg-amber-900 border border-amber-300/40 text-stone-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>تلاش مجدد برای رکورد بالاتر</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearAllTimers();
                          sound.playClick();
                          onClose();
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 text-slate-950 font-black text-xs sm:text-sm cursor-pointer"
                      >
                        بازگشت به چت گروه
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between text-xs text-stone-200">
                    <span>مراحل گذرانده: {toPersianDigits(challengeClearedStages)} از ۴</span>
                    <span className="font-bold text-amber-300">
                      بیشترین عدد حل‌شده: {toPersianDigits(challengeMaxCardCount)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t border-amber-300/25 pt-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleRestartCurrent}
                  className="px-3.5 py-2 rounded-xl bg-[#302318] hover:bg-amber-900 border border-amber-300/35 text-stone-100 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>چیدن دوباره</span>
                </button>

                {isCompleted && (
                  <div className="flex-1 flex items-center gap-2">
                    {((gameMode === 'pairs' && levelPairs < PAIR_LEVELS[PAIR_LEVELS.length - 1]) ||
                      (gameMode === 'numbers' && numberCount < NUMBER_LEVELS[NUMBER_LEVELS.length - 1])) && (
                      <button
                        type="button"
                        onClick={handleNextLevelOrFinish}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                      >
                        <span>
                          {gameMode === 'pairs'
                            ? `سطح سخت‌تر (${toPersianDigits(
                                PAIR_LEVELS[PAIR_LEVELS.indexOf(levelPairs as (typeof PAIR_LEVELS)[number]) + 1] * 2
                              )} کارت)`
                            : `سطح سخت‌تر (${toPersianDigits(
                                NUMBER_LEVELS[NUMBER_LEVELS.indexOf(numberCount as (typeof NUMBER_LEVELS)[number]) + 1]
                              )} عدد)`}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCompleteAndWaterNow}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/80 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>آبیاری درخت (+۵ سکه)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
