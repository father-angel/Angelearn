import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../../utils/audio';
import {
  COLOR_TRAP_ROUND_SECONDS,
  COLOR_TRAP_QUESTIONS_PER_STAGE,
  ColorTrapColorId,
  ColorTrapQuestion,
  ColorTrapRoundSummary,
  getColorTrapStageConfig,
  generateColorTrapQuestion,
  evaluateColorTrapAnswer,
  summarizeColorTrapRound,
} from '../../game/groupChallenges';
import {
  Palette,
  RotateCcw,
  Trophy,
  Zap,
  Flame,
  Timer,
  CheckCircle2,
  XCircle,
  Sparkles,
  Play,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ColorTrapGameProps {
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

type ColorTrapPhase = 'ready' | 'playing' | 'results';

function toPersianDigits(num: number | string): string {
  return String(num).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export const ColorTrapGame: React.FC<ColorTrapGameProps> = ({
  onClose,
  challengeConfig = null,
  onChallengeComplete,
}) => {
  const [phase, setPhase] = useState<ColorTrapPhase>('ready');
  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(
    COLOR_TRAP_ROUND_SECONDS * 1000
  );
  const [questionElapsedMs, setQuestionElapsedMs] = useState<number>(0);

  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<ColorTrapQuestion>(() =>
    generateColorTrapQuestion(0, null)
  );

  const [lastFeedback, setLastFeedback] = useState<{
    id: number;
    isCorrect: boolean;
    deltaText: string;
    subText: string;
  } | null>(null);

  const [roundSummary, setRoundSummary] = useState<ColorTrapRoundSummary | null>(
    null
  );
  const [challengeResultState, setChallengeResultState] = useState<{
    score: number;
    isNewRecord: boolean | null;
    bestScore: number | null;
    submitting: boolean;
  } | null>(null);

  // Mutable refs for accurate 60fps/100ms timer access without stale closures
  const scoreRef = useRef<number>(0);
  const streakRef = useRef<number>(0);
  const bestStreakRef = useRef<number>(0);
  const correctCountRef = useRef<number>(0);
  const wrongCountRef = useRef<number>(0);
  const responseTimesMsRef = useRef<number[]>([]);
  const questionStartMsRef = useRef<number>(Date.now());
  const currentQuestionRef = useRef<ColorTrapQuestion>(currentQuestion);
  const isRoundFinishedRef = useRef<boolean>(false);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const clearFeedbackTimeout = useCallback(() => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearFeedbackTimeout();
    };
  }, [clearFeedbackTimeout]);

  const finishRound = useCallback(() => {
    if (isRoundFinishedRef.current) return;
    isRoundFinishedRef.current = true;
    clearFeedbackTimeout();

    const summary = summarizeColorTrapRound({
      finalScore: scoreRef.current,
      correctCount: correctCountRef.current,
      wrongCount: wrongCountRef.current,
      responseTimesMs: responseTimesMsRef.current,
      bestStreak: bestStreakRef.current,
    });
    setRoundSummary(summary);
    setPhase('results');

    if (summary.finalScore > 0) {
      sound.playCoin();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    } else {
      sound.playClick();
    }

    const detailLabel = `دقت ${toPersianDigits(summary.accuracyPercent)}٪ • سرعت ${toPersianDigits(
      summary.averageResponseSeconds
    )}s • زنجیره ${toPersianDigits(summary.bestStreak)}`;

    setChallengeResultState({
      score: summary.finalScore,
      isNewRecord: null,
      bestScore: challengeConfig?.personalBestScore ?? null,
      submitting: Boolean(onChallengeComplete),
    });

    if (onChallengeComplete) {
      Promise.resolve(
        onChallengeComplete({
          score: summary.finalScore,
          detailLabel,
        })
      )
        .then((res) => {
          setChallengeResultState((prev) =>
            prev
              ? {
                  ...prev,
                  isNewRecord: res ? res.isNewRecord : true,
                  bestScore: res ? res.bestScore : summary.finalScore,
                  submitting: false,
                }
              : null
          );
        })
        .catch(() => {
          setChallengeResultState((prev) =>
            prev ? { ...prev, submitting: false } : null
          );
        });
    }
  }, [challengeConfig?.personalBestScore, clearFeedbackTimeout, onChallengeComplete]);

  const startNewRound = useCallback(() => {
    clearFeedbackTimeout();
    sound.playClick();
    const firstQ = generateColorTrapQuestion(0, null);
    scoreRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    correctCountRef.current = 0;
    wrongCountRef.current = 0;
    responseTimesMsRef.current = [];
    currentQuestionRef.current = firstQ;
    questionStartMsRef.current = Date.now();
    isRoundFinishedRef.current = false;

    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setWrongCount(0);
    setQuestionIndex(0);
    setCurrentQuestion(firstQ);
    setLastFeedback(null);
    setRoundSummary(null);
    setChallengeResultState(null);
    setTimeRemainingMs(COLOR_TRAP_ROUND_SECONDS * 1000);
    setQuestionElapsedMs(0);
    setPhase('playing');
  }, [clearFeedbackTimeout]);

  const handleSelectColor = useCallback(
    (chosenColorId: ColorTrapColorId | 'timeout') => {
      if (phase !== 'playing' || isRoundFinishedRef.current) return;

      const activeQ = currentQuestionRef.current;
      const now = Date.now();
      const responseTimeMs = Math.max(120, now - questionStartMsRef.current);
      const isCorrect =
        chosenColorId !== 'timeout' && chosenColorId === activeQ.inkColorId;

      const evalResult = evaluateColorTrapAnswer({
        currentScore: scoreRef.current,
        currentStreak: streakRef.current,
        bestStreak: bestStreakRef.current,
        isCorrect,
        responseTimeMs,
        questionTimeLimitMs: activeQ.questionTimeLimitMs,
      });

      scoreRef.current = evalResult.nextScore;
      streakRef.current = evalResult.nextStreak;
      bestStreakRef.current = evalResult.nextBestStreak;
      responseTimesMsRef.current.push(responseTimeMs);

      if (isCorrect) {
        correctCountRef.current += 1;
        setCorrectCount(correctCountRef.current);
        sound.playCardMatch();
      } else {
        wrongCountRef.current += 1;
        setWrongCount(wrongCountRef.current);
        sound.playClick();
      }

      setScore(evalResult.nextScore);
      setStreak(evalResult.nextStreak);
      setBestStreak(evalResult.nextBestStreak);

      const bonusParts: string[] = [];
      if (evalResult.speedBonus > 0) {
        bonusParts.push(`+${toPersianDigits(evalResult.speedBonus)} سرعت`);
      }
      if (evalResult.comboBonus > 0) {
        bonusParts.push(`+${toPersianDigits(evalResult.comboBonus)} زنجیره`);
      }

      setLastFeedback({
        id: now,
        isCorrect,
        deltaText: isCorrect
          ? `+${toPersianDigits(evalResult.scoreDelta)}`
          : evalResult.scoreDelta < 0
          ? `${toPersianDigits(evalResult.scoreDelta)}`
          : '۰',
        subText: isCorrect
          ? bonusParts.length > 0
            ? bonusParts.join(' · ')
            : 'پاسخ صحیح!'
          : chosenColorId === 'timeout'
          ? 'پایان مهلت سؤال · قطع زنجیره'
          : 'خطا · قطع زنجیره',
      });

      clearFeedbackTimeout();
      feedbackTimeoutRef.current = window.setTimeout(() => {
        feedbackTimeoutRef.current = null;
        setLastFeedback(null);
      }, 650);

      // Advance immediately to next question
      const nextIdx = activeQ.index + 1;
      const nextQ = generateColorTrapQuestion(nextIdx, activeQ);
      currentQuestionRef.current = nextQ;
      questionStartMsRef.current = Date.now();
      setQuestionIndex(nextIdx);
      setCurrentQuestion(nextQ);
      setQuestionElapsedMs(0);
    },
    [clearFeedbackTimeout, phase]
  );

  // Main 45-second round timer & per-question stopwatch (paused if tab is hidden)
  useEffect(() => {
    if (phase !== 'playing') return;

    let lastTick = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (document.hidden) {
        const pausedDelta = now - lastTick;
        questionStartMsRef.current += pausedDelta;
        lastTick = now;
        return;
      }

      const dt = Math.max(0, now - lastTick);
      lastTick = now;

      setTimeRemainingMs((prev) => {
        const next = Math.max(0, prev - dt);
        if (next <= 0) {
          window.clearInterval(interval);
          finishRound();
        }
        return next;
      });

      const qElapsed = Math.max(0, now - questionStartMsRef.current);
      setQuestionElapsedMs(qElapsed);

      const activeQ = currentQuestionRef.current;
      const stageCfg = getColorTrapStageConfig(activeQ.index);
      if (
        stageCfg.hasStrictQuestionTimer &&
        qElapsed >= activeQ.questionTimeLimitMs &&
        !isRoundFinishedRef.current
      ) {
        handleSelectColor('timeout');
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [phase, finishRound, handleSelectColor]);

  // Keyboard support (1..6 keys) for desktop players
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const idx = Number(e.key) - 1;
      const activeColors = currentQuestionRef.current.activeColors;
      if (idx >= 0 && idx < activeColors.length) {
        e.preventDefault();
        handleSelectColor(activeColors[idx].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, handleSelectColor]);

  const stageConfig = getColorTrapStageConfig(questionIndex);
  const remainingSeconds = Math.ceil(timeRemainingMs / 1000);
  const timeProgressPercent = Math.max(
    0,
    Math.min(100, (timeRemainingMs / (COLOR_TRAP_ROUND_SECONDS * 1000)) * 100)
  );
  const questionRemainingPercent = Math.max(
    0,
    Math.min(
      100,
      ((currentQuestion.questionTimeLimitMs - questionElapsedMs) /
        Math.max(1, currentQuestion.questionTimeLimitMs)) *
        100
    )
  );
  const currentComboTierBonus = Math.min(30, Math.floor(streak / 3) * 10);
  const questionsInCurrentStage =
    (questionIndex % COLOR_TRAP_QUESTIONS_PER_STAGE) + 1;

  return (
    <div
      lang="fa"
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center p-2.5 sm:p-4 bg-[#040e0a]/92 backdrop-blur-md animate-fadeIn overflow-y-auto select-none"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#161a2e] via-[#0f1322] to-[#080a14] border-2 border-amber-400/75 rounded-3xl p-4 sm:p-5 shadow-2xl text-slate-50 flex flex-col justify-between min-h-[530px] max-h-[94dvh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-indigo-300/25 pb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-300 via-rose-400 to-indigo-400 text-slate-950 flex items-center justify-center shadow-lg border border-white/60 shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white truncate">
                  {challengeConfig?.title || 'چالش سرعت و تمرکز: تله رنگ‌ها'}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/60 text-amber-200 font-black">
                  ۴۵ ثانیه · ۴ مرحله
                </span>
              </div>
              <p className="text-[11px] text-slate-200 truncate">
                رنگ واقعی نوشته را انتخاب کن، نه معنی کلمه را!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              clearFeedbackTimeout();
              sound.playClick();
              onClose();
            }}
            aria-label="بستن بازی تله رنگ‌ها"
            className="w-8 h-8 rounded-full bg-[#232946] hover:bg-rose-900 border border-indigo-300/40 text-slate-100 flex items-center justify-center text-sm font-bold cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* =====================================================================
            PHASE 0: READY / BRIEFING SCREEN
           ===================================================================== */}
        {phase === 'ready' && (
          <div className="my-4 flex-1 flex flex-col items-center justify-between text-center space-y-4 animate-fadeIn">
            <div className="space-y-2 max-w-md">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/50 text-amber-200 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>آزمون استروپ · رقابت چالشی گروه</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                فریب معنی کلمه را نخور؛ رنگ جوهر را بزن!
              </h3>
              <p className="text-xs text-slate-200 leading-relaxed">
                در مرکز صفحه یک کلمه رنگی نمایش داده می‌شود. وظیفه شما انتخاب{' '}
                <strong className="text-amber-300">رنگ واقعی نوشته</strong> از میان دکمه‌های پایین است. هر{' '}
                <strong className="text-emerald-300">۸ سؤال</strong> تعداد رنگ‌ها و درصد کلمات فریبنده بیشتر می‌شود!
              </p>
            </div>

            {/* Interactive Visual Example Card */}
            <div className="w-full rounded-2xl bg-[#090c16] border-2 border-indigo-300/35 p-3.5 space-y-2 shadow-inner">
              <div className="text-[11px] font-bold text-slate-300">
                مثال: اگر کلمه زیر را دیدید، کدام دکمه را می‌زنید؟
              </div>
              <div
                className="text-3xl sm:text-4xl font-black tracking-wide py-1"
                style={{
                  color: '#ff4d5e',
                  textShadow: '0 0 18px rgba(255,77,94,0.38)',
                }}
              >
                آبی
              </div>
              <div className="text-xs font-black text-emerald-300 bg-emerald-950/70 border border-emerald-400/40 rounded-xl py-1.5 px-3 inline-block">
                ✓ پاسخ درست: دکمه «قرمز» (چون رنگ نوشته قرمز است!)
              </div>
            </div>

            {/* Scoring & Escalation Rules Summary */}
            <div className="w-full grid grid-cols-2 gap-2 text-right text-[11px]">
              <div className="bg-[#1e233d] border border-indigo-300/30 rounded-2xl p-2.5 space-y-1">
                <div className="font-black text-amber-300">⚡ قانون امتیازدهی</div>
                <div className="text-slate-100">• پاسخ درست: +۱۰۰ امتیاز</div>
                <div className="text-cyan-200">• پاداش سرعت: تا +۲۰ امتیاز</div>
                <div className="text-emerald-300">• هر ۳ زنجیره: +۱۰ (حداکثر +۳۰)</div>
                <div className="text-rose-200">• خطا: -۳۰ امتیاز و قطع زنجیره</div>
              </div>
              <div className="bg-[#1e233d] border border-indigo-300/30 rounded-2xl p-2.5 space-y-1">
                <div className="font-black text-cyan-300">📈 ۴ مرحله صعودی (هر ۸ سؤال)</div>
                <div className="text-slate-100">• مرحله ۱: ۴ رنگ (۳۰٪ تناقض)</div>
                <div className="text-slate-100">• مرحله ۲: ۴ رنگ (۵۰٪ تناقض)</div>
                <div className="text-amber-200">• مرحله ۳: ۵ رنگ (۷۰٪ تناقض)</div>
                <div className="text-rose-200">• مرحله ۴: ۶ رنگ (۸۰٪ + زمان کوتاه)</div>
              </div>
            </div>

            {challengeConfig?.personalBestScore !== null &&
              challengeConfig?.personalBestScore !== undefined && (
                <div className="text-xs font-black text-amber-200 bg-amber-400/15 border border-amber-300/40 px-3.5 py-1.5 rounded-xl">
                  بهترین رکورد فعلی شما در این چالش:{' '}
                  {toPersianDigits(challengeConfig.personalBestScore)} امتیاز
                </div>
              )}

            <button
              type="button"
              onClick={startNewRound}
              className="w-full min-h-[50px] py-3 px-6 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:brightness-105 active:translate-y-0.5 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_4px_0_#78350f] cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>شروع رقابت ۴۵ ثانیه‌ای تله رنگ‌ها</span>
            </button>
          </div>
        )}

        {/* =====================================================================
            PHASE 1: ACTIVE 45-SECOND GAMEPLAY
           ===================================================================== */}
        {phase === 'playing' && (
          <div className="flex-1 flex flex-col justify-between my-2.5 space-y-2.5">
            {/* Top HUD: Timer, Score, Streak & Stage */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {/* 45s Timer */}
                <div
                  className={`rounded-2xl p-2 border flex items-center justify-between ${
                    remainingSeconds <= 7
                      ? 'bg-rose-950/80 border-rose-400 text-rose-100 animate-pulse'
                      : remainingSeconds <= 15
                      ? 'bg-amber-950/70 border-amber-400/70 text-amber-100'
                      : 'bg-[#1e233d] border-indigo-300/35 text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Timer className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span className="text-[10px] font-bold">زمان</span>
                  </div>
                  <span className="text-sm sm:text-base font-black tabular-nums">
                    {toPersianDigits(remainingSeconds)}s
                  </span>
                </div>

                {/* Live Score */}
                <div className="rounded-2xl p-2 bg-[#1e233d] border border-amber-300/50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-200">امتیاز</span>
                  <span className="text-sm sm:text-base font-black text-amber-300 tabular-nums">
                    {toPersianDigits(score)}
                  </span>
                </div>

                {/* Streak & Combo Multiplier */}
                <div
                  className={`rounded-2xl p-2 border flex items-center justify-between ${
                    streak >= 3
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-100'
                      : 'bg-[#1e233d] border-indigo-300/35 text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Flame
                      className={`w-4 h-4 shrink-0 ${
                        streak >= 3 ? 'text-amber-300 fill-amber-300' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-[10px] font-bold">زنجیره</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm sm:text-base font-black tabular-nums">
                      {toPersianDigits(streak)}
                    </span>
                    {currentComboTierBonus > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-300 text-slate-950 font-black">
                        +{toPersianDigits(currentComboTierBonus)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 45s Smooth Countdown Bar */}
              <div className="w-full h-2 bg-[#090c16] rounded-full overflow-hidden border border-indigo-300/30">
                <div
                  className={`h-full transition-all duration-75 ${
                    remainingSeconds <= 7
                      ? 'bg-gradient-to-r from-rose-500 to-red-400'
                      : remainingSeconds <= 15
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                      : 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300'
                  }`}
                  style={{ width: `${timeProgressPercent}%` }}
                />
              </div>

              {/* Stage Banner & Escalation Progress (Every 8 Questions) */}
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#1e233d] border border-indigo-300/30 text-[11px]">
                <span className="font-black text-amber-200">
                  {stageConfig.title}
                </span>
                <span className="text-slate-200 font-bold tabular-nums">
                  {stageConfig.stage < 4
                    ? `سؤال ${toPersianDigits(questionsInCurrentStage)} از ۸ تا مرحله ${toPersianDigits(
                        stageConfig.stage + 1
                      )}`
                    : `سؤال ${toPersianDigits(questionIndex + 1)} (حداکثر سختی)`}
                </span>
              </div>
            </div>

            {/* Center Stroop Word Arena */}
            <div className="relative flex-1 min-h-[165px] sm:min-h-[185px] rounded-3xl bg-[#070a12] border-2 border-indigo-300/45 shadow-[inset_0_0_36px_rgba(0,0,0,0.85)] flex flex-col items-center justify-between p-3.5 overflow-hidden">
              <div className="w-full flex items-center justify-between text-[11px] text-slate-200 z-10">
                <span className="font-bold">🎯 رنگ واقعی نوشته کدام است؟</span>
                <span className="px-2 py-0.5 rounded-lg bg-[#161b30] border border-indigo-300/30 text-cyan-200 font-bold">
                  {toPersianDigits(stageConfig.colorCount)} رنگ فعال
                </span>
              </div>

              {/* Displayed Colored Word */}
              <div className="my-auto flex flex-col items-center justify-center z-10 py-2">
                <div
                  key={currentQuestion.index}
                  data-testid="stroop-word"
                  data-ink-color={currentQuestion.inkColorId}
                  data-word-color={currentQuestion.wordColorId}
                  className="text-5xl sm:text-6xl font-black tracking-wide select-none transition-transform duration-100"
                  style={{
                    color: currentQuestion.inkHex,
                    textShadow: `0 0 24px ${currentQuestion.inkGlowCss}, 0 3px 8px rgba(0,0,0,0.9)`,
                  }}
                >
                  {currentQuestion.wordText}
                </div>
              </div>

              {/* Live Floating Score Feedback Pill + Per-Question Speed/Timer Bar */}
              <div className="w-full space-y-1.5 z-10">
                <div className="h-6 flex items-center justify-center">
                  {lastFeedback ? (
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border ${
                        lastFeedback.isCorrect
                          ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                          : 'bg-rose-950/90 border-rose-400 text-rose-200'
                      }`}
                    >
                      {lastFeedback.isCorrect ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-300" />
                      )}
                      <span dir="ltr">{lastFeedback.deltaText}</span>
                      <span>· {lastFeedback.subText}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300">
                      {stageConfig.hasStrictQuestionTimer
                        ? '⚡ مرحله ۴: قبل از اتمام نوار زمان سؤال پاسخ دهید!'
                        : '⚡ پاسخ سریع‌تر = تا +۲۰ امتیاز پاداش سرعت'}
                    </span>
                  )}
                </div>

                {/* Per-Question Speed / Time Window Gauge */}
                <div className="w-full h-1.5 bg-[#151a2e] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      stageConfig.hasStrictQuestionTimer
                        ? 'bg-gradient-to-r from-rose-400 to-amber-300'
                        : 'bg-gradient-to-r from-cyan-400 to-indigo-400'
                    }`}
                    style={{ width: `${questionRemainingPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom 4 to 6 Large Mobile-First Colored Choice Buttons */}
            <div className="pt-1">
              <div
                className={`grid gap-2.5 ${
                  currentQuestion.activeColors.length <= 4
                    ? 'grid-cols-2'
                    : 'grid-cols-2 sm:grid-cols-3'
                }`}
              >
                {currentQuestion.activeColors.map((colorItem, idx) => {
                  const isFifthCenteredOnMobile =
                    currentQuestion.activeColors.length === 5 && idx === 4;
                  return (
                    <button
                      key={colorItem.id}
                      type="button"
                      data-color-id={colorItem.id}
                      onClick={() => handleSelectColor(colorItem.id)}
                      className={`${
                        isFifthCenteredOnMobile ? 'col-span-2 sm:col-span-1' : ''
                      } min-h-[56px] sm:min-h-[64px] px-4 py-3 rounded-2xl ${
                        colorItem.buttonBgClass
                      } ${colorItem.buttonTextClass} border-2 ${
                        colorItem.buttonBorderClass
                      } font-black text-base sm:text-lg flex items-center justify-between shadow-[0_4px_0_rgba(0,0,0,0.45)] active:translate-y-0.5 transition-transform cursor-pointer`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border-2 border-white/90 shadow-sm shrink-0"
                          style={{ backgroundColor: colorItem.swatchHex }}
                        />
                        <span>{colorItem.label}</span>
                      </span>
                      <span className="text-[11px] font-black opacity-80 px-1.5 py-0.5 rounded-lg bg-black/15">
                        {toPersianDigits(idx + 1)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            PHASE 2: END-OF-ROUND SUMMARY & GROUP LEADERBOARD RECORD
           ===================================================================== */}
        {phase === 'results' && roundSummary && (
          <div className="my-3 space-y-4 animate-fadeIn">
            <div className="rounded-3xl bg-[#1e233d] border-2 border-amber-400/75 p-4 sm:p-5 text-center space-y-3 shadow-xl">
              <div className="inline-flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/50 text-amber-200 text-xs font-black px-3 py-0.5 rounded-full">
                <Trophy className="w-4 h-4" />
                <span>کارنامه نهایی تله رنگ‌ها (۴۵ ثانیه)</span>
              </div>

              <div>
                <div className="text-xs text-slate-200 font-bold">امتیاز نهایی شما</div>
                <div className="text-3xl sm:text-4xl font-black text-amber-300 tabular-nums mt-0.5">
                  {toPersianDigits(roundSummary.finalScore)} امتیاز
                </div>
              </div>

              {/* 4 Key Metrics Required by Specification */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-[#090c16] border border-indigo-300/30 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">امتیاز کل</div>
                  <div className="text-sm sm:text-base font-black text-amber-200 mt-0.5 tabular-nums">
                    {toPersianDigits(roundSummary.finalScore)}
                  </div>
                </div>

                <div className="bg-[#090c16] border border-indigo-300/30 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">دقت پاسخگویی</div>
                  <div className="text-sm sm:text-base font-black text-emerald-300 mt-0.5 tabular-nums">
                    {toPersianDigits(roundSummary.accuracyPercent)}٪
                  </div>
                  <div className="text-[10px] text-slate-300">
                    ({toPersianDigits(roundSummary.correctCount)} از{' '}
                    {toPersianDigits(roundSummary.totalAnswered)})
                  </div>
                </div>

                <div className="bg-[#090c16] border border-indigo-300/30 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">میانگین سرعت پاسخ</div>
                  <div className="text-sm sm:text-base font-black text-cyan-200 mt-0.5 tabular-nums">
                    {toPersianDigits(roundSummary.averageResponseSeconds)} ثانیه
                  </div>
                </div>

                <div className="bg-[#090c16] border border-indigo-300/30 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">بهترین زنجیره</div>
                  <div className="text-sm sm:text-base font-black text-rose-200 mt-0.5 tabular-nums">
                    {toPersianDigits(roundSummary.bestStreak)} متوالی
                  </div>
                </div>
              </div>
            </div>

            {/* Group Challenge Record Submission Status */}
            {challengeResultState && (
              <div className="p-3.5 rounded-2xl bg-[#1e233d] border-2 border-amber-400/70 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-amber-200">
                    ثبت در جدول رتبه‌بندی گروه: {toPersianDigits(challengeResultState.score)} امتیاز
                  </div>
                  <div className="text-[11px] text-emerald-200 mt-0.5">
                    {challengeResultState.submitting
                      ? 'در حال ثبت رکورد در چت گروه...'
                      : challengeResultState.isNewRecord
                      ? `🎉 رکورد جدید شما در گروه ثبت شد! (بهترین: ${toPersianDigits(
                          challengeResultState.bestScore ?? challengeResultState.score
                        )})`
                      : `بالاترین رکورد قبلی شما (${toPersianDigits(
                          challengeResultState.bestScore ?? 0
                        )} امتیاز) همچنان محفوظ ماند.`}
                  </div>
                </div>
                <Zap className="w-7 h-7 text-amber-300 shrink-0" />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={startNewRound}
                className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#1e233d] hover:bg-[#282f52] border border-indigo-300/40 text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تلاش مجدد برای رکورد بالاتر</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearFeedbackTimeout();
                  sound.playClick();
                  onClose();
                }}
                className="flex-1 min-h-[46px] py-2.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <span>بازگشت به چت گروه</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
