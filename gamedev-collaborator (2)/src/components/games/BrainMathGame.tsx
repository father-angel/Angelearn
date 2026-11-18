import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MATH_LEVEL_CONFIGS,
  QUESTIONS_PER_MATH_ROUND,
  MATH_PLACEMENT_QUESTIONS,
  MATH_PLACEMENT_START_LEVEL,
  MathQuestion,
  MathQuestionAttempt,
  MathRoundSummary,
  MathPlacementSummary,
  generateMathQuestion,
  generateMathRound,
  evaluateMathRound,
  getNextMathPlacementProbeLevel,
  evaluateMathPlacement,
  getMathLevelConfig,
  evaluateBrainKeypadDigit,
} from '../../game/rules';
import { sound } from '../../utils/audio';
import {
  Brain,
  Timer,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  Delete,
  Zap,
  Compass,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { ExerciseCompletionReport } from '../../types/game';
import { calculateBrainChallengeScore } from '../../game/groupChallenges';

interface BrainMathGameProps {
  onComplete: (success: boolean, report?: Partial<ExerciseCompletionReport>) => void;
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

interface LevelBestRecord {
  level: number;
  bestCorrect: number;
  bestTotalTimeSeconds: number;
  bestAvgTimeSeconds: number;
  playedCount: number;
}

interface SavedMathPlacement {
  calibratedLevel: number;
  accuracyPercent: number;
  averageTimeSeconds: number;
  skillLabel: string;
  completedAt: string;
}

const MATH_RECORDS_STORAGE_KEY = 'angellearn_brain_math_records_v1';
const MATH_PLACEMENT_STORAGE_KEY = 'angellearn_brain_math_placement_v1';

function loadMathRecords(): Record<number, LevelBestRecord> {
  try {
    const raw = localStorage.getItem(MATH_RECORDS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function loadSavedMathPlacement(): SavedMathPlacement | null {
  try {
    const raw = localStorage.getItem(MATH_PLACEMENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedMathPlacement>;
    if (
      typeof parsed.calibratedLevel === 'number' &&
      Number.isFinite(parsed.calibratedLevel)
    ) {
      return {
        calibratedLevel: Math.max(1, Math.min(10, Math.round(parsed.calibratedLevel))),
        accuracyPercent: Number(parsed.accuracyPercent ?? 0),
        averageTimeSeconds: Number(parsed.averageTimeSeconds ?? 0),
        skillLabel: String(parsed.skillLabel || ''),
        completedAt: String(parsed.completedAt || new Date().toISOString()),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

function saveMathPlacement(summary: MathPlacementSummary): SavedMathPlacement {
  const saved: SavedMathPlacement = {
    calibratedLevel: summary.recommendedLevel,
    accuracyPercent: summary.accuracyPercent,
    averageTimeSeconds: summary.averageTimeSeconds,
    skillLabel: summary.skillLabel,
    completedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(MATH_PLACEMENT_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // ignore
  }
  return saved;
}

function saveMathRecord(summary: MathRoundSummary): Record<number, LevelBestRecord> {
  const records = loadMathRecords();
  const existing = records[summary.level];

  const isBetter =
    !existing ||
    summary.correctCount > existing.bestCorrect ||
    (summary.correctCount === existing.bestCorrect &&
      summary.totalTimeSeconds < existing.bestTotalTimeSeconds);

  records[summary.level] = {
    level: summary.level,
    bestCorrect: isBetter ? summary.correctCount : existing.bestCorrect,
    bestTotalTimeSeconds: isBetter
      ? summary.totalTimeSeconds
      : existing.bestTotalTimeSeconds,
    bestAvgTimeSeconds: isBetter
      ? summary.averageTimeSeconds
      : existing.bestAvgTimeSeconds,
    playedCount: (existing?.playedCount ?? 0) + 1,
  };

  try {
    localStorage.setItem(MATH_RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
  return records;
}

type BrainMathPhase =
  | 'placement_intro'
  | 'placement_playing'
  | 'placement_result'
  | 'select_level'
  | 'playing'
  | 'results';

export const BrainMathGame: React.FC<BrainMathGameProps> = ({
  onComplete,
  onClose,
  challengeConfig = null,
  onChallengeComplete,
}) => {
  const isChallengeMode = Boolean(challengeConfig);
  const [savedPlacement, setSavedPlacement] = useState<SavedMathPlacement | null>(
    loadSavedMathPlacement
  );
  const [phase, setPhase] = useState<BrainMathPhase>(() =>
    isChallengeMode
      ? 'playing'
      : loadSavedMathPlacement()
      ? 'select_level'
      : 'placement_intro'
  );
  const [selectedLevel, setSelectedLevel] = useState<number>(() =>
    isChallengeMode ? 1 : loadSavedMathPlacement()?.calibratedLevel ?? 1
  );
  const [records, setRecords] = useState<Record<number, LevelBestRecord>>(loadMathRecords);

  // Adaptive placement test state (5 questions)
  const [placementProbeLevel, setPlacementProbeLevel] = useState<number>(
    MATH_PLACEMENT_START_LEVEL
  );
  const [placementQuestion, setPlacementQuestion] = useState<MathQuestion | null>(null);
  const [placementIndex, setPlacementIndex] = useState<number>(0);
  const [placementAttempts, setPlacementAttempts] = useState<MathQuestionAttempt[]>([]);
  const [placementSummary, setPlacementSummary] = useState<MathPlacementSummary | null>(null);

  // Escalating Group Challenge tracking
  const [challengeLevel, setChallengeLevel] = useState<number>(1);
  const [highestChallengeLevel, setHighestChallengeLevel] = useState<number>(1);
  const [challengeResultState, setChallengeResultState] = useState<{
    score: number;
    isNewRecord: boolean | null;
    bestScore: number | null;
    submitting: boolean;
  } | null>(null);

  // Active 10-question round state
  const [questions, setQuestions] = useState<MathQuestion[]>(() =>
    isChallengeMode ? [generateMathQuestion(1, 1)] : []
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [typedInput, setTypedInput] = useState<string>('');
  const [attempts, setAttempts] = useState<MathQuestionAttempt[]>([]);
  const [roundSummary, setRoundSummary] = useState<MathRoundSummary | null>(null);

  // Brief feedback state between questions
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: number;
    timeSec: number;
    nextProbeLevel?: number;
  } | null>(null);

  // High-precision response time tracking
  const questionStartMsRef = useRef<number>(Date.now());
  const accumulatedQuestionMsRef = useRef<number>(0);
  const pendingAdvanceTimeoutRef = useRef<number | null>(null);
  const roundStartedAtIsoRef = useRef<string>(new Date().toISOString());
  const isSubmittingRef = useRef<boolean>(false);
  const [currentQuestionElapsedMs, setCurrentQuestionElapsedMs] = useState<number>(0);
  const [isTabPaused, setIsTabPaused] = useState<boolean>(false);

  const clearPendingAdvance = useCallback(() => {
    if (pendingAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(pendingAdvanceTimeoutRef.current);
      pendingAdvanceTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearPendingAdvance, [clearPendingAdvance]);

  // Start the 5-question adaptive placement test
  const startPlacement = useCallback(() => {
    clearPendingAdvance();
    sound.playClick();
    const firstQuestion = generateMathQuestion(MATH_PLACEMENT_START_LEVEL, 1);
    setPlacementProbeLevel(MATH_PLACEMENT_START_LEVEL);
    setPlacementQuestion(firstQuestion);
    setPlacementIndex(0);
    setPlacementAttempts([]);
    setPlacementSummary(null);
    setTypedInput('');
    setFeedback(null);
    accumulatedQuestionMsRef.current = 0;
    questionStartMsRef.current = Date.now();
    setCurrentQuestionElapsedMs(0);
    setPhase('placement_playing');
  }, [clearPendingAdvance]);

  // Start a new 10-question round (escalating if in Group Challenge mode)
  const startRound = useCallback(
    (level: number) => {
      clearPendingAdvance();
      sound.playClick();
      if (isChallengeMode) {
        setSelectedLevel(1);
        setChallengeLevel(1);
        setHighestChallengeLevel(1);
        setChallengeResultState(null);
        setQuestions([generateMathQuestion(1, 1)]);
      } else {
        const generated = generateMathRound(level, QUESTIONS_PER_MATH_ROUND);
        setSelectedLevel(level);
        setQuestions(generated);
      }
      setCurrentIndex(0);
      setTypedInput('');
      setAttempts([]);
      setRoundSummary(null);
      setFeedback(null);
      accumulatedQuestionMsRef.current = 0;
      questionStartMsRef.current = Date.now();
      roundStartedAtIsoRef.current = new Date().toISOString();
      setCurrentQuestionElapsedMs(0);
      setPhase('playing');
    },
    [clearPendingAdvance, isChallengeMode]
  );

  // Pause timer automatically if browser tab becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        accumulatedQuestionMsRef.current += Date.now() - questionStartMsRef.current;
        setIsTabPaused(true);
      } else {
        questionStartMsRef.current = Date.now();
        setIsTabPaused(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Live 100ms stopwatch update during active play OR placement
  useEffect(() => {
    if (
      (phase !== 'playing' && phase !== 'placement_playing') ||
      feedback !== null ||
      isTabPaused
    ) {
      return;
    }
    const interval = setInterval(() => {
      const elapsed =
        accumulatedQuestionMsRef.current + (Date.now() - questionStartMsRef.current);
      setCurrentQuestionElapsedMs(elapsed);
    }, 100);
    return () => clearInterval(interval);
  }, [phase, feedback, isTabPaused]);

  const activeQuestion =
    phase === 'placement_playing' ? placementQuestion : questions[currentIndex];
  const levelConfig = getMathLevelConfig(selectedLevel);

  const submitNumericAnswer = useCallback(
    (numericAnswer: number) => {
      if (
        (phase !== 'playing' && phase !== 'placement_playing') ||
        !activeQuestion ||
        feedback !== null
      ) {
        return;
      }

      const responseTimeMs = Math.max(
        120,
        accumulatedQuestionMsRef.current + (Date.now() - questionStartMsRef.current)
      );
      const isCorrect = numericAnswer === activeQuestion.correctAnswer;

      if (isCorrect) {
        sound.playCardMatch();
      } else {
        sound.playClick();
      }

      const newAttempt: MathQuestionAttempt = {
        question: activeQuestion,
        userAnswer: numericAnswer,
        isCorrect,
        responseTimeMs,
      };

      if (phase === 'placement_playing') {
        const nextAttempts = [...placementAttempts, newAttempt];
        const nextProbe = getNextMathPlacementProbeLevel(
          placementProbeLevel,
          isCorrect,
          responseTimeMs
        );
        setPlacementAttempts(nextAttempts);
        setFeedback({
          isCorrect,
          correctAnswer: activeQuestion.correctAnswer,
          timeSec: Number((responseTimeMs / 1000).toFixed(2)),
          nextProbeLevel: nextProbe,
        });

        clearPendingAdvance();
        pendingAdvanceTimeoutRef.current = window.setTimeout(() => {
          pendingAdvanceTimeoutRef.current = null;
          if (placementIndex + 1 < MATH_PLACEMENT_QUESTIONS) {
            const nextQ = generateMathQuestion(nextProbe, placementIndex + 2);
            setPlacementProbeLevel(nextProbe);
            setPlacementQuestion(nextQ);
            setPlacementIndex((i) => i + 1);
            setTypedInput('');
            setFeedback(null);
            accumulatedQuestionMsRef.current = 0;
            questionStartMsRef.current = Date.now();
            setCurrentQuestionElapsedMs(0);
          } else {
            const summary = evaluateMathPlacement(nextAttempts);
            const saved = saveMathPlacement(summary);
            setSavedPlacement(saved);
            setPlacementSummary(summary);
            setSelectedLevel(summary.recommendedLevel);
            setFeedback(null);
            setPhase('placement_result');
            sound.playCoin();
            confetti({ particleCount: 85, spread: 70, origin: { y: 0.6 } });
          }
        }, 520);
        return;
      }

      // Standard OR Escalating Challenge 10-question round
      const nextAttempts = [...attempts, newAttempt];
      const nextEscalatedLevel = isChallengeMode
        ? isCorrect
          ? Math.min(10, challengeLevel + 1)
          : Math.max(1, challengeLevel - 1)
        : selectedLevel;
      const nextPeakLevel = isChallengeMode
        ? Math.max(highestChallengeLevel, challengeLevel, nextEscalatedLevel)
        : selectedLevel;

      setAttempts(nextAttempts);
      setFeedback({
        isCorrect,
        correctAnswer: activeQuestion.correctAnswer,
        timeSec: Number((responseTimeMs / 1000).toFixed(2)),
        nextProbeLevel: isChallengeMode ? nextEscalatedLevel : undefined,
      });

      clearPendingAdvance();
      pendingAdvanceTimeoutRef.current = window.setTimeout(() => {
        pendingAdvanceTimeoutRef.current = null;
        if (currentIndex + 1 < QUESTIONS_PER_MATH_ROUND) {
          if (isChallengeMode) {
            const nextQ = generateMathQuestion(nextEscalatedLevel, currentIndex + 2);
            setChallengeLevel(nextEscalatedLevel);
            setHighestChallengeLevel(nextPeakLevel);
            setSelectedLevel(nextEscalatedLevel);
            setQuestions((prev) => [...prev, nextQ]);
          }
          setCurrentIndex((i) => i + 1);
          setTypedInput('');
          setFeedback(null);
          accumulatedQuestionMsRef.current = 0;
          questionStartMsRef.current = Date.now();
          setCurrentQuestionElapsedMs(0);
        } else {
          // Completed all 10 questions!
          const summary = evaluateMathRound(nextAttempts, nextPeakLevel);
          setRoundSummary(summary);
          if (!isChallengeMode) {
            const updatedRecords = saveMathRecord(summary);
            setRecords(updatedRecords);
          } else {
            const score = calculateBrainChallengeScore({
              highestLevelReached: nextPeakLevel,
              correctCount: summary.correctCount,
              totalQuestions: summary.totalQuestions,
              avgResponseMs: summary.averageTimeSeconds * 1000,
            });
            setChallengeResultState({
              score,
              isNewRecord: null,
              bestScore: challengeConfig?.personalBestScore ?? null,
              submitting: true,
            });
            Promise.resolve(
              onChallengeComplete?.({
                score,
                detailLabel: `حداکثر سطح ${nextPeakLevel} • ${summary.correctCount} از ${summary.totalQuestions} درست`,
              })
            )
              .then((res) => {
                setChallengeResultState({
                  score,
                  isNewRecord: res ? res.isNewRecord : true,
                  bestScore: res ? res.bestScore : score,
                  submitting: false,
                });
              })
              .catch(() => {
                setChallengeResultState((prev) =>
                  prev ? { ...prev, submitting: false } : null
                );
              });
          }
          setFeedback(null);
          setPhase('results');
          sound.playCoin();
          confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 } });
        }
      }, 480);
    },
    [
      phase,
      activeQuestion,
      feedback,
      placementAttempts,
      placementProbeLevel,
      placementIndex,
      attempts,
      isChallengeMode,
      challengeLevel,
      highestChallengeLevel,
      challengeConfig?.personalBestScore,
      onChallengeComplete,
      currentIndex,
      selectedLevel,
      clearPendingAdvance,
    ]
  );

  const handleDigitInput = useCallback(
    (digitChar: string) => {
      if (
        (phase !== 'playing' && phase !== 'placement_playing') ||
        !activeQuestion ||
        feedback !== null
      ) {
        return;
      }
      const { nextInput, isExactMatch } = evaluateBrainKeypadDigit(
        typedInput,
        digitChar,
        activeQuestion.correctAnswer
      );
      setTypedInput(nextInput);
      if (isExactMatch) {
        submitNumericAnswer(activeQuestion.correctAnswer);
      } else {
        sound.playClick();
      }
    },
    [phase, activeQuestion, feedback, typedInput, submitNumericAnswer]
  );

  const handleBackspaceInput = useCallback(() => {
    if ((phase !== 'playing' && phase !== 'placement_playing') || feedback !== null) {
      return;
    }
    sound.playClick();
    setTypedInput((prev) => prev.slice(0, -1));
  }, [phase, feedback]);

  // Desktop keyboard support for fast numeric typing (0-9, Backspace) with auto-confirm on exact match
  useEffect(() => {
    if ((phase !== 'playing' && phase !== 'placement_playing') || feedback !== null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitInput(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspaceInput();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, feedback, handleDigitInput, handleBackspaceInput]);

  const totalRoundTimeSoFarSec = (
    (attempts.reduce((acc, a) => acc + a.responseTimeMs, 0) + currentQuestionElapsedMs) /
    1000
  ).toFixed(1);

  return (
    <div
      lang="fa"
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center p-2.5 sm:p-4 bg-[#040e0a]/92 animate-fadeIn select-none"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#1b1635] via-[#120e26] to-[#0a0818] border-2 border-indigo-300/45 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-50 flex flex-col justify-between max-h-[92vh] overflow-y-auto">
        {/* =========================================================================
            TOP HEADER: BRAIN TREE TITLE & CLOSE BUTTON
           ========================================================================= */}
        <div className="flex items-center justify-between border-b border-indigo-300/20 pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#241e47] border border-indigo-300/45 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🧠
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-amber-200">
                  {isChallengeMode
                    ? `رقابت گروهی: ${challengeConfig?.title}`
                    : 'درخت مغز — چالش محاسبات ریاضی'}
                </h2>
                <span className="text-[10px] font-black bg-amber-400/20 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded-full">
                  {isChallengeMode
                    ? `حالت رقابتی پلکانی (سطح ۱ تا ۱۰)`
                    : '۱۰ سطح · تعیین سطح هوشمند'}
                </span>
              </div>
              <p className="text-[11px] text-slate-200 mt-0.5">
                {isChallengeMode
                  ? 'با هر پاسخ صحیح سختی سوال بالاتر می‌رود — فقط بالاترین رکورد شما در گروه ثبت می‌شود!'
                  : 'تقویت سرعت پردازش ذهن با پرسش‌های جمع و تفریق و تطبیق سطح با توانایی شما'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            aria-label="بستن بازی درخت مغز"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#241e47] hover:bg-[#31295e] border border-indigo-300/35 text-slate-100 flex items-center justify-center text-sm font-bold cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* =========================================================================
            PHASE 0A: INITIAL PLACEMENT INTRO (SHOWN ON FIRST VISIT)
           ========================================================================= */}
        {phase === 'placement_intro' && (
          <div className="my-5 flex flex-col items-center text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-[#241e47] border-2 border-amber-400/60 flex items-center justify-center shadow-lg">
              <Compass className="w-8 h-8 text-amber-300" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-200 text-[11px] font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>تعیین سطح اولیه درخت مغز</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                بیایید سطح مناسب ذهن شما را پیدا کنیم!
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                با پاسخ به فقط <strong>{MATH_PLACEMENT_QUESTIONS} سوال کوتاه</strong>، سیستم بر اساس{' '}
                <strong>دقت و سرعت پاسخگویی شما</strong> سختی سوال‌ها را به‌صورت زنده تغییر می‌دهد و دقیقاً سطح مناسب شما (از ۱ تا ۱۰) را مشخص می‌کند.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full max-w-md text-[11px]">
              <div className="bg-[#241e47] border border-indigo-300/35 rounded-2xl p-2.5">
                <div className="font-black text-amber-200">۵ سوال تطبیقی</div>
                <div className="text-slate-300 mt-0.5">کمتر از ۳۰ ثانیه</div>
              </div>
              <div className="bg-[#241e47] border border-indigo-300/35 rounded-2xl p-2.5">
                <div className="font-black text-cyan-200">سنجش سرعت و دقت</div>
                <div className="text-slate-300 mt-0.5">سطح‌یابی واقعی</div>
              </div>
              <div className="bg-[#241e47] border border-indigo-300/35 rounded-2xl p-2.5">
                <div className="font-black text-emerald-200">تنظیم سطح ۱ تا ۱۰</div>
                <div className="text-slate-300 mt-0.5">شروع بدون سختی اضافه</div>
              </div>
            </div>

            <div className="w-full max-w-md flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={startPlacement}
                className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>شروع تعیین سطح اولیه ({MATH_PLACEMENT_QUESTIONS} سوال)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPhase('select_level');
                }}
                className="py-2 text-xs font-bold text-indigo-200 hover:text-white cursor-pointer"
              >
                فعلاً رد شو و سطح را دستی انتخاب کن
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PHASE 0B: PLACEMENT RESULT SUMMARY
           ========================================================================= */}
        {phase === 'placement_result' && placementSummary && (
          <div className="my-4 space-y-4 animate-fadeIn">
            <div className="rounded-3xl bg-[#241e47] border-2 border-amber-400/70 p-5 text-center space-y-2.5 shadow-xl">
              <div className="inline-flex items-center gap-1.5 bg-amber-400/20 border border-amber-400/50 text-amber-200 text-xs font-black px-3 py-0.5 rounded-full">
                <Award className="w-4 h-4" />
                <span>نتیجه تعیین سطح اولیه</span>
              </div>

              <div className="text-xs font-bold text-emerald-200">
                {placementSummary.skillLabel}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white">
                سطح پیشنهادی شما: {getMathLevelConfig(placementSummary.recommendedLevel).title}
              </h3>

              <p className="text-xs text-slate-200">
                {getMathLevelConfig(placementSummary.recommendedLevel).subtitle}
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-[#0d0a1c] border border-indigo-300/30 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">دقت پاسخ‌ها</div>
                  <div className="text-sm sm:text-base font-black text-emerald-300 mt-0.5">
                    {placementSummary.correctCount} از {placementSummary.totalQuestions} ({placementSummary.accuracyPercent}٪)
                  </div>
                </div>
                <div className="bg-[#0d0a1c] border border-indigo-300/30 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">میانگین سرعت</div>
                  <div className="text-sm sm:text-base font-black text-cyan-200 mt-0.5">
                    {placementSummary.averageTimeSeconds} ثانیه
                  </div>
                </div>
                <div className="bg-[#0d0a1c] border border-indigo-300/30 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">سطح تعیین‌شده</div>
                  <div className="text-sm sm:text-base font-black text-amber-200 mt-0.5">
                    سطح {placementSummary.recommendedLevel} از ۱۰
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => startRound(placementSummary.recommendedLevel)}
                className="flex-1 min-h-[46px] py-2.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>شروع بازی در سطح {placementSummary.recommendedLevel}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPhase('select_level');
                }}
                className="min-h-[46px] py-2.5 px-4 rounded-2xl bg-[#241e47] hover:bg-[#31295e] border border-indigo-300/35 text-slate-100 text-xs font-bold cursor-pointer"
              >
                مشاهده همه سطوح
              </button>

              <button
                type="button"
                onClick={startPlacement}
                className="min-h-[46px] py-2.5 px-3.5 rounded-2xl bg-[#0d0a1c] hover:bg-[#1b1635] border border-indigo-300/30 text-slate-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>آزمون مجدد</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PHASE 1: 10-LEVEL DIFFICULTY SELECTOR
           ========================================================================= */}
        {phase === 'select_level' && (
          <div className="my-4 space-y-4">
            <div className="bg-[#241e47] border border-indigo-300/35 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-black text-amber-200 flex items-center gap-1.5 flex-wrap">
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {savedPlacement
                      ? `سطح پیشنهادی شما بر اساس تعیین سطح: سطح ${savedPlacement.calibratedLevel}`
                      : 'سطح دشواری بازی ریاضی را انتخاب کنید (سطح ۱ تا ۱۰):'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-200 leading-relaxed">
                  در هر دست بازی، دقیقاً <strong>۱۰ سوال جمع و تفریق</strong> متناسب با سطح انتخابی از شما پرسیده می‌شود و زمان پاسخگویی هر سوال و کل دست ثبت می‌گردد.
                </p>
              </div>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={startPlacement}
                  className="min-h-[40px] px-3.5 py-2 rounded-2xl bg-[#0d0a1c] hover:bg-[#1b1635] border border-indigo-300/40 text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-amber-300" />
                  <span>{savedPlacement ? 'تعیین سطح مجدد' : 'آزمون تعیین سطح (۵ سوال)'}</span>
                </button>
                <button
                  onClick={() => startRound(selectedLevel)}
                  className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>شروع دست ۱۰ سوالی (سطح {selectedLevel})</span>
                </button>
              </div>
            </div>

            {/* 10 Levels Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {MATH_LEVEL_CONFIGS.map((cfg) => {
                const rec = records[cfg.level];
                const isSelected = selectedLevel === cfg.level;
                const isCalibrated = savedPlacement?.calibratedLevel === cfg.level;
                return (
                  <div
                    key={cfg.level}
                    onClick={() => {
                      sound.playClick();
                      setSelectedLevel(cfg.level);
                    }}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#2f285e] border-amber-300 shadow-lg scale-[1.02]'
                        : isCalibrated
                        ? 'bg-[#241e47] border-emerald-400/75 hover:bg-[#2d2659]'
                        : 'bg-[#1a1536] hover:bg-[#241e47] border-indigo-300/25'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-amber-300 text-slate-950'
                              : 'bg-[#0d0a1c] text-indigo-100 border border-indigo-300/30'
                          }`}
                        >
                          سطح {cfg.level}
                        </span>
                        {isCalibrated ? (
                          <span className="text-[9px] font-black text-emerald-200 bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-400/40">
                            پیشنهادی ★
                          </span>
                        ) : rec ? (
                          <span className="text-[10px] font-bold text-emerald-300">
                            ★ {rec.bestCorrect}/10
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs font-black text-white leading-snug">
                        {cfg.title.replace(`سطح ${cfg.level}: `, '')}
                      </div>
                      <div className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                        {cfg.subtitle}
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-indigo-300/20 flex items-center justify-between text-[10px]">
                      {rec ? (
                        <span className="text-amber-200 font-bold">
                          ⏱️ {rec.bestTotalTimeSeconds}s
                        </span>
                      ) : (
                        <span className="text-slate-300">بدون رکورد</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRound(cfg.level);
                        }}
                        className="text-amber-200 hover:text-amber-100 font-black cursor-pointer"
                      >
                        شروع ←
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            PHASE 2: ACTIVE GAME OR ADAPTIVE PLACEMENT SESSION
           ========================================================================= */}
        {(phase === 'playing' || phase === 'placement_playing') && activeQuestion && (
          <div className="my-3 space-y-3.5">
            {/* Top Status Bar: Level, Question Counter & Live Stopwatch */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#241e47] border border-indigo-300/35 rounded-2xl px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-amber-300 text-slate-950 font-black text-xs">
                  {phase === 'placement_playing'
                    ? `تعیین سطح · سطح آزمایشی ${placementProbeLevel}`
                    : isChallengeMode
                    ? `مرحله رقابتی · سطح ${challengeLevel}`
                    : levelConfig.title}
                </span>
                <span className="text-xs sm:text-sm font-black text-white">
                  {phase === 'placement_playing'
                    ? `سوال ${placementIndex + 1} از ${MATH_PLACEMENT_QUESTIONS}`
                    : `سوال ${currentIndex + 1} از ${QUESTIONS_PER_MATH_ROUND}`}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold">
                <div className="flex items-center gap-1 text-cyan-200 bg-[#0d0a1c] border border-cyan-400/45 px-2.5 py-1 rounded-xl">
                  <Timer className="w-3.5 h-3.5" />
                  <span>این سوال: {(currentQuestionElapsedMs / 1000).toFixed(1)} ثانیه</span>
                </div>
                {phase === 'playing' && (
                  <div className="flex items-center gap-1 text-amber-200 bg-[#0d0a1c] border border-amber-400/45 px-2.5 py-1 rounded-xl">
                    <span>کل زمان: {totalRoundTimeSoFarSec} ثانیه</span>
                  </div>
                )}
              </div>
            </div>

            {/* Question Progress Dots */}
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({
                length:
                  phase === 'placement_playing'
                    ? MATH_PLACEMENT_QUESTIONS
                    : QUESTIONS_PER_MATH_ROUND,
              }).map((_, idx) => {
                const attempt =
                  phase === 'placement_playing'
                    ? placementAttempts[idx]
                    : attempts[idx];
                const isCurrent =
                  idx === (phase === 'placement_playing' ? placementIndex : currentIndex);
                return (
                  <div
                    key={idx}
                    className={`h-2.5 rounded-full transition-all ${
                      isCurrent
                        ? 'w-7 bg-amber-300 shadow-[0_0_8px_#fbbf24]'
                        : attempt
                        ? attempt.isCorrect
                          ? 'w-3 bg-emerald-400'
                          : 'w-3 bg-rose-500'
                        : 'w-3 bg-[#241e47]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Math Question Display Card */}
            <div className="relative rounded-3xl bg-[#241e47] border-2 border-indigo-300/45 p-4 sm:p-6 text-center shadow-inner">
              <div className="text-[11px] font-bold text-slate-200 mb-2">
                {phase === 'placement_playing'
                  ? 'بر اساس دقت و سرعت پاسخ شما، سوال بعدی خودکار تنظیم می‌شود:'
                  : 'حاصل عبارت زیر را محاسبه کنید:'}
              </div>

              <div
                dir="ltr"
                className="text-3xl sm:text-5xl font-black tracking-wider text-white flex items-center justify-center gap-3 py-2 font-mono"
              >
                <span>{activeQuestion.expressionText}</span>
                <span className="text-amber-300">=</span>
                <span className="min-w-[84px] sm:min-w-[110px] px-3 py-1 rounded-2xl bg-[#0d0a1c] border-2 border-amber-300/80 text-amber-200">
                  {typedInput !== '' ? typedInput : '؟'}
                </span>
              </div>

              {/* Instant Feedback Overlay Pill */}
              {feedback && (
                <div
                  className={`mt-2 inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-black animate-bounce ${
                    feedback.isCorrect
                      ? 'bg-emerald-300 text-slate-950'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {feedback.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        آفرین! پاسخ درست در {feedback.timeSec} ثانیه
                        {phase === 'placement_playing' &&
                        feedback.nextProbeLevel &&
                        feedback.nextProbeLevel > placementProbeLevel
                          ? ` · ارتقا به سطح ${feedback.nextProbeLevel}`
                          : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>پاسخ صحیح: {feedback.correctAnswer} ({feedback.timeSec} ثانیه)</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 3x4 Direct Numeric Keypad (Auto-confirms on exact match, silent if wrong) */}
            <div className="bg-[#0d0a1c]/90 border border-indigo-300/35 rounded-2xl p-3 sm:p-3.5 space-y-2.5 max-w-sm mx-auto w-full">
              <div className="text-[11px] text-slate-200 font-bold text-center">
                عدد جواب را وارد کنید؛ به محض درست شدن خودکار تایید می‌شود:
              </div>
              <div
                className="grid grid-cols-3 gap-2"
                dir="ltr"
                data-testid="brain-keypad-3x4"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={feedback !== null}
                    onClick={() => handleDigitInput(String(digit))}
                    className="min-h-[50px] rounded-xl bg-[#2b2454] hover:bg-[#372e6b] active:scale-95 border border-indigo-300/40 text-white font-black text-xl cursor-pointer font-mono transition-transform shadow-sm disabled:bg-slate-800/90 disabled:text-slate-400"
                  >
                    {digit}
                  </button>
                ))}

                {/* Bottom Row (3 cells): Left = Delete, Center = 0, Right = Empty */}
                <button
                  type="button"
                  disabled={feedback !== null}
                  onClick={handleBackspaceInput}
                  aria-label="پاک کردن رقم"
                  className="min-h-[50px] rounded-xl bg-rose-900/90 hover:bg-rose-800 active:scale-95 border border-rose-400/60 text-rose-100 font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-transform shadow-sm disabled:bg-slate-800/90 disabled:text-slate-400"
                >
                  <Delete className="w-4 h-4" />
                  <span>حذف</span>
                </button>

                <button
                  type="button"
                  disabled={feedback !== null}
                  onClick={() => handleDigitInput('0')}
                  className="min-h-[50px] rounded-xl bg-[#2b2454] hover:bg-[#372e6b] active:scale-95 border border-indigo-300/40 text-white font-black text-xl cursor-pointer font-mono transition-transform shadow-sm disabled:bg-slate-800/90 disabled:text-slate-400"
                >
                  0
                </button>

                <div aria-hidden="true" className="min-h-[50px]" />
              </div>
            </div>

            {/* Return to Level Selection (hidden in Group Challenge Mode) */}
            <div className="flex items-center justify-between pt-1">
              {!isChallengeMode ? (
                <button
                  onClick={() => {
                    clearPendingAdvance();
                    setFeedback(null);
                    sound.playClick();
                    setPhase('select_level');
                  }}
                  className="text-xs font-bold text-indigo-200 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>
                    {phase === 'placement_playing'
                      ? 'انصراف و انتخاب دستی سطح'
                      : 'تغییر سطح دشواری (۱ تا ۱۰)'}
                  </span>
                </button>
              ) : (
                <span className="text-xs font-black text-amber-200">
                  بالاترین سطح رسیده: سطح {highestChallengeLevel}
                </span>
              )}
              <span className="text-[11px] text-slate-300">
                پاسخ‌های درست تا این لحظه:{' '}
                {(phase === 'placement_playing' ? placementAttempts : attempts).filter(
                  (a) => a.isCorrect
                ).length}{' '}
                از {(phase === 'placement_playing' ? placementAttempts : attempts).length}
              </span>
            </div>
          </div>
        )}

        {/* =========================================================================
            PHASE 3: 10-QUESTION ROUND SUMMARY & RESPONSE TIME LOG
           ========================================================================= */}
        {phase === 'results' && roundSummary && (
          <div className="my-3 space-y-4 animate-fadeIn">
            {/* Summary Banner */}
            <div className="rounded-3xl bg-[#241e47] border-2 border-amber-400/70 p-4 sm:p-5 text-center space-y-2 shadow-xl">
              <div className="inline-flex items-center gap-1.5 bg-amber-400/20 border border-amber-400/50 text-amber-200 text-xs font-black px-3 py-0.5 rounded-full">
                <Trophy className="w-4 h-4" />
                <span>کارنامه دست ۱۰ سوالی — {levelConfig.title}</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white">
                {roundSummary.correctCount} پاسخ صحیح از {roundSummary.totalQuestions} سوال ({roundSummary.accuracyPercent}٪)
              </h3>

              {/* 3 Key Time & Speed Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-[#0d0a1c] border border-indigo-300/30 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">زمان کل پاسخگویی</div>
                  <div className="text-sm sm:text-base font-black text-amber-200 mt-0.5">
                    {roundSummary.totalTimeSeconds} ثانیه
                  </div>
                </div>
                <div className="bg-[#0d0a1c] border border-indigo-300/30 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">میانگین هر سوال</div>
                  <div className="text-sm sm:text-base font-black text-cyan-200 mt-0.5">
                    {roundSummary.averageTimeSeconds} ثانیه
                  </div>
                </div>
                <div className="bg-[#0d0a1c] border border-indigo-300/30 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">سریع‌ترین پاسخ</div>
                  <div className="text-sm sm:text-base font-black text-emerald-300 mt-0.5">
                    {roundSummary.fastestTimeSeconds} ثانیه
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Per-Question Response Time Breakdown */}
            <div className="bg-[#0d0a1c] border border-indigo-300/30 rounded-2xl p-3 max-h-48 overflow-y-auto space-y-1.5">
              <div className="text-xs font-black text-slate-200 mb-1">
                ریز زمان پاسخگویی هر ۱۰ سوال:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {attempts.map((att, idx) => (
                  <div
                    key={att.question.id}
                    className={`px-3 py-1.5 rounded-xl border text-xs flex items-center justify-between ${
                      att.isCorrect
                        ? 'bg-emerald-950/60 border-emerald-400/50 text-emerald-100'
                        : 'bg-rose-950/60 border-rose-400/50 text-rose-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-amber-200">#{idx + 1}</span>
                      <span dir="ltr" className="font-mono font-bold">
                        {att.question.expressionText} = {att.userAnswer}
                      </span>
                      {!att.isCorrect && (
                        <span className="text-[10px] text-rose-200">
                          (صحیح: {att.question.correctAnswer})
                        </span>
                      )}
                    </div>
                    <span className="font-black text-cyan-200">
                      {(att.responseTimeMs / 1000).toFixed(2)}s
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions: Repeat/Next/Water OR Group Challenge Result Actions */}
            {isChallengeMode && challengeResultState ? (
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-[#241e47] border-2 border-amber-400/70 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-black text-amber-200">
                      امتیاز این دور: {challengeResultState.score} امتیاز
                    </div>
                    <div className="text-[11px] text-emerald-200 mt-0.5">
                      {challengeResultState.submitting
                        ? 'در حال ثبت رکورد در گروه...'
                        : challengeResultState.isNewRecord
                        ? `🎉 رکورد جدید شما در چت گروه ثبت شد! (بهترین: ${challengeResultState.bestScore})`
                        : `بهترین رکورد قبلی شما (${challengeResultState.bestScore} امتیاز) همچنان محفوظ ماند.`}
                    </div>
                  </div>
                  <Trophy className="w-7 h-7 text-amber-300 shrink-0" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startRound(1)}
                    className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#241e47] hover:bg-[#31295e] border border-indigo-300/35 text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>تلاش مجدد برای رکورد بالاتر</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      onClose();
                    }}
                    className="flex-1 min-h-[44px] py-2.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    <span>بازگشت به چت گروه</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => startRound(selectedLevel)}
                  className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#241e47] hover:bg-[#31295e] border border-indigo-300/35 text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>تکرار سطح {selectedLevel}</span>
                </button>

                {selectedLevel < 10 && (
                  <button
                    onClick={() => startRound(selectedLevel + 1)}
                    className="min-h-[44px] px-4 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>سطح بعدی (سطح {selectedLevel + 1})</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (isSubmittingRef.current) return;
                    isSubmittingRef.current = true;
                    const report: Partial<ExerciseCompletionReport> = {
                      treeId: 'brain_math',
                      completedReadingOrPractice: true,
                      answeredCorrectly: roundSummary.passed,
                      overallSuccess: roundSummary.passed,
                      accuracyPercent: roundSummary.accuracyPercent,
                      durationSeconds: roundSummary.totalTimeSeconds,
                      startedAt: roundStartedAtIsoRef.current,
                      completedAt: new Date().toISOString(),
                    };
                    if (roundSummary.passed) {
                      sound.playWater();
                    } else {
                      sound.playClick();
                    }
                    onComplete(roundSummary.passed, report);
                  }}
                  className="flex-1 min-h-[44px] py-2.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <Brain className="w-4 h-4" />
                  <span>
                    {roundSummary.passed
                      ? 'ثبت زمان و آبیاری درخت مغز 💧'
                      : 'ثبت نتیجه تمرین (نیازمند حداقل ۶ پاسخ صحیح برای آبیاری)'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
