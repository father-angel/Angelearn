import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Hand,
  Keyboard,
  RotateCcw,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  COORDINATION_DUEL_DUAL_SYNC_WINDOW_MS,
  COORDINATION_DUEL_ROUND_SECONDS,
  CoordinationDuelCommand,
  CoordinationDuelOutcomeType,
  CoordinationDuelRoundSummary,
  evaluateCoordinationDuelOutcome,
  generateCoordinationDuelCommand,
  getCoordinationDuelStageConfig,
  isValidDualTouchSync,
  summarizeCoordinationDuelRound,
} from '../../game/groupChallenges';
import { sound } from '../../utils/audio';

export interface CoordinationDuelChallengeConfig {
  challengeId: string;
  title: string;
  personalBestScore: number | null;
}

export interface CoordinationDuelGameProps {
  challengeConfig: CoordinationDuelChallengeConfig;
  onChallengeComplete: (result: {
    score: number;
    detailLabel: string;
  }) => Promise<{ isNewRecord: boolean; bestScore: number } | void>;
  onClose: () => void;
}

type MatchPhase = 'ready' | 'playing' | 'summary';

interface CommandFeedbackBanner {
  outcome: CoordinationDuelOutcomeType;
  scoreDelta: number;
  speedBonus: number;
  comboBonus: number;
  label: string;
}

export const CoordinationDuelGame: React.FC<CoordinationDuelGameProps> = ({
  challengeConfig,
  onChallengeComplete,
  onClose,
}) => {
  const [phase, setPhase] = useState<MatchPhase>('ready');
  const [timeLeftSec, setTimeLeftSec] = useState<number>(
    COORDINATION_DUEL_ROUND_SECONDS
  );

  const [currentCommand, setCurrentCommand] = useState<CoordinationDuelCommand>(
    () => generateCoordinationDuelCommand(0)
  );
  const [commandProgressRatio, setCommandProgressRatio] = useState<number>(1);

  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [missedCount, setMissedCount] = useState<number>(0);

  const [leftPressedVisual, setLeftPressedVisual] = useState<boolean>(false);
  const [rightPressedVisual, setRightPressedVisual] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<CommandFeedbackBanner | null>(null);

  const [summary, setSummary] = useState<CoordinationDuelRoundSummary | null>(
    null
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<{
    isNewRecord: boolean;
    bestScore: number;
  } | null>(null);

  const roundActiveRef = useRef<boolean>(false);
  const commandResolvedRef = useRef<boolean>(false);
  const commandIndexRef = useRef<number>(0);
  const currentCommandRef = useRef<CoordinationDuelCommand>(currentCommand);
  const commandSpawnMsRef = useRef<number>(performance.now());

  const leftTouchMsRef = useRef<number | null>(null);
  const rightTouchMsRef = useRef<number | null>(null);

  const commandTimeoutRef = useRef<number | null>(null);
  const dualSyncTimeoutRef = useRef<number | null>(null);
  const nextCommandTimeoutRef = useRef<number | null>(null);

  const scoreRef = useRef<number>(0);
  const streakRef = useRef<number>(0);
  const bestStreakRef = useRef<number>(0);
  const correctCountRef = useRef<number>(0);
  const wrongCountRef = useRef<number>(0);
  const missedCountRef = useRef<number>(0);
  const reactionTimesMsRef = useRef<number[]>([]);

  const clearCommandTimers = useCallback(() => {
    if (commandTimeoutRef.current !== null) {
      window.clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = null;
    }
    if (dualSyncTimeoutRef.current !== null) {
      window.clearTimeout(dualSyncTimeoutRef.current);
      dualSyncTimeoutRef.current = null;
    }
    if (nextCommandTimeoutRef.current !== null) {
      window.clearTimeout(nextCommandTimeoutRef.current);
      nextCommandTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCommandTimers();
    };
  }, [clearCommandTimers]);

  const finishRound = useCallback(async () => {
    if (!roundActiveRef.current) return;
    roundActiveRef.current = false;
    commandResolvedRef.current = true;
    clearCommandTimers();

    const finalSummary = summarizeCoordinationDuelRound({
      finalScore: scoreRef.current,
      correctCount: correctCountRef.current,
      wrongCount: wrongCountRef.current,
      missedCount: missedCountRef.current,
      reactionTimesMs: reactionTimesMsRef.current,
      bestStreak: bestStreakRef.current,
    });

    setSummary(finalSummary);
    setPhase('summary');
    sound.playCoin();

    const detailLabel = `دقت ${finalSummary.accuracyPercent}٪ · واکنش ${finalSummary.averageReactionMs}ms · زنجیره ${finalSummary.bestStreak}`;

    setSubmitting(true);
    try {
      const res = await onChallengeComplete({
        score: finalSummary.finalScore,
        detailLabel,
      });
      if (res && typeof res.bestScore === 'number') {
        setSubmitResult({
          isNewRecord: res.isNewRecord,
          bestScore: res.bestScore,
        });
      }
    } catch {
      // Handled by parent banner
    } finally {
      setSubmitting(false);
    }
  }, [clearCommandTimers, onChallengeComplete]);

  const spawnNextCommand = useCallback(
    (nextIdx: number) => {
      if (!roundActiveRef.current) return;
      clearCommandTimers();

      const nextCmd = generateCoordinationDuelCommand(nextIdx);
      commandIndexRef.current = nextIdx;
      currentCommandRef.current = nextCmd;
      commandResolvedRef.current = false;
      leftTouchMsRef.current = null;
      rightTouchMsRef.current = null;
      commandSpawnMsRef.current = performance.now();

      setCurrentCommand(nextCmd);
      setCommandProgressRatio(1);
      setLeftPressedVisual(false);
      setRightPressedVisual(false);

      // Schedule expiration timeout for this command's intervalMs window
      commandTimeoutRef.current = window.setTimeout(() => {
        commandTimeoutRef.current = null;
        if (!roundActiveRef.current || commandResolvedRef.current) return;
        commandResolvedRef.current = true;

        // If player touched only one side on a dual command and let it expire, count as wrong (-40);
        // otherwise if untouched, count as missed opportunity (-20).
        const hadPartialTouch =
          leftTouchMsRef.current !== null || rightTouchMsRef.current !== null;
        const outcomeType: CoordinationDuelOutcomeType = hadPartialTouch
          ? 'wrong'
          : 'missed';

        sound.playClick();
        const evalResult = evaluateCoordinationDuelOutcome({
          direction: nextCmd.direction,
          outcome: outcomeType,
          intervalMs: nextCmd.intervalMs,
          currentScore: scoreRef.current,
          currentStreak: streakRef.current,
          bestStreak: bestStreakRef.current,
        });

        scoreRef.current = evalResult.nextScore;
        streakRef.current = evalResult.nextStreak;
        bestStreakRef.current = evalResult.nextBestStreak;

        setScore(evalResult.nextScore);
        setStreak(evalResult.nextStreak);
        setBestStreak(evalResult.nextBestStreak);

        if (outcomeType === 'wrong') {
          wrongCountRef.current += 1;
          setWrongCount(wrongCountRef.current);
          setFeedback({
            outcome: 'wrong',
            scoreDelta: evalResult.scoreDelta,
            speedBonus: 0,
            comboBonus: 0,
            label: 'لمس ناقص فرمان دوگانه (-۴۰ امتیاز)',
          });
        } else {
          missedCountRef.current += 1;
          setMissedCount(missedCountRef.current);
          setFeedback({
            outcome: 'missed',
            scoreDelta: evalResult.scoreDelta,
            speedBonus: 0,
            comboBonus: 0,
            label: 'از دست دادن فرصت پاسخ (-۲۰ امتیاز)',
          });
        }

        nextCommandTimeoutRef.current = window.setTimeout(() => {
          nextCommandTimeoutRef.current = null;
          spawnNextCommand(nextIdx + 1);
        }, 140);
      }, nextCmd.intervalMs);
    },
    [clearCommandTimers]
  );

  const resolveActiveCommand = useCallback(
    (
      outcome: 'correct' | 'wrong',
      reactionTimeMs: number,
      dualTouchDeltaMs?: number,
      customWrongReason?: string
    ) => {
      if (!roundActiveRef.current || commandResolvedRef.current) return;
      commandResolvedRef.current = true;
      clearCommandTimers();

      const cmd = currentCommandRef.current;
      const evalResult = evaluateCoordinationDuelOutcome({
        direction: cmd.direction,
        outcome,
        reactionTimeMs,
        intervalMs: cmd.intervalMs,
        dualTouchDeltaMs,
        currentScore: scoreRef.current,
        currentStreak: streakRef.current,
        bestStreak: bestStreakRef.current,
      });

      scoreRef.current = evalResult.nextScore;
      streakRef.current = evalResult.nextStreak;
      bestStreakRef.current = evalResult.nextBestStreak;

      setScore(evalResult.nextScore);
      setStreak(evalResult.nextStreak);
      setBestStreak(evalResult.nextBestStreak);

      if (evalResult.isCorrect) {
        sound.playCardMatch();
        correctCountRef.current += 1;
        setCorrectCount(correctCountRef.current);
        reactionTimesMsRef.current.push(reactionTimeMs);
        setFeedback({
          outcome: 'correct',
          scoreDelta: evalResult.scoreDelta,
          speedBonus: evalResult.speedBonus,
          comboBonus: evalResult.comboBonus,
          label:
            cmd.direction === 'both'
              ? `همزمانی عالی! +${evalResult.scoreDelta}`
              : `واکنش دقیق! +${evalResult.scoreDelta}`,
        });
      } else {
        sound.playClick();
        wrongCountRef.current += 1;
        setWrongCount(wrongCountRef.current);
        setFeedback({
          outcome: 'wrong',
          scoreDelta: evalResult.scoreDelta,
          speedBonus: 0,
          comboBonus: 0,
          label: customWrongReason || 'پاسخ اشتباه (-۴۰ امتیاز)',
        });
      }

      nextCommandTimeoutRef.current = window.setTimeout(() => {
        nextCommandTimeoutRef.current = null;
        spawnNextCommand(commandIndexRef.current + 1);
      }, 150);
    },
    [clearCommandTimers, spawnNextCommand]
  );

  const handleZoneInput = useCallback(
    (side: 'left' | 'right') => {
      if (
        phase !== 'playing' ||
        !roundActiveRef.current ||
        commandResolvedRef.current
      ) {
        return;
      }

      const now = performance.now();
      const cmd = currentCommandRef.current;
      const reactionTimeMs = Math.max(80, Math.round(now - commandSpawnMsRef.current));

      if (side === 'left') {
        setLeftPressedVisual(true);
      } else {
        setRightPressedVisual(true);
      }

      // Case 1: Dual command ('both') -> requires both left & right within <= 180ms
      if (cmd.direction === 'both') {
        if (side === 'left' && leftTouchMsRef.current === null) {
          leftTouchMsRef.current = now;
        } else if (side === 'right' && rightTouchMsRef.current === null) {
          rightTouchMsRef.current = now;
        }

        const leftTs = leftTouchMsRef.current;
        const rightTs = rightTouchMsRef.current;

        if (leftTs !== null && rightTs !== null) {
          const deltaMs = Math.abs(leftTs - rightTs);
          if (isValidDualTouchSync(leftTs, rightTs)) {
            resolveActiveCommand('correct', reactionTimeMs, deltaMs);
          } else {
            resolveActiveCommand(
              'wrong',
              reactionTimeMs,
              deltaMs,
              `اختلاف لمس دوگانه بیش از ۱۸۰ms (${Math.round(deltaMs)}ms · -۴۰ امتیاز)`
            );
          }
          return;
        }

        // First touch registered; open the strict 180ms dual-sync window for the second touch
        if (dualSyncTimeoutRef.current === null) {
          dualSyncTimeoutRef.current = window.setTimeout(() => {
            dualSyncTimeoutRef.current = null;
            if (!roundActiveRef.current || commandResolvedRef.current) return;
            resolveActiveCommand(
              'wrong',
              Math.max(80, Math.round(performance.now() - commandSpawnMsRef.current)),
              COORDINATION_DUEL_DUAL_SYNC_WINDOW_MS + 50,
              'عدم لمس همزمان دو ناحیه در ۱۸۰ms (-۴۰ امتیاز)'
            );
          }, COORDINATION_DUEL_DUAL_SYNC_WINDOW_MS);
        }
        return;
      }

      // Case 2: Single-direction command ('left' or 'right')
      if (side === cmd.direction) {
        resolveActiveCommand('correct', reactionTimeMs);
      } else {
        resolveActiveCommand(
          'wrong',
          reactionTimeMs,
          undefined,
          'جهت اشتباه! (-۴۰ امتیاز)'
        );
      }
    },
    [phase, resolveActiveCommand]
  );

  // Windows / Desktop keyboard support: A for Left, L for Right (supports simultaneous keydown)
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (
        e.code === 'KeyA' ||
        e.key === 'a' ||
        e.key === 'A' ||
        e.key === 'ش'
      ) {
        e.preventDefault();
        handleZoneInput('left');
      } else if (
        e.code === 'KeyL' ||
        e.key === 'l' ||
        e.key === 'L' ||
        e.key === 'م'
      ) {
        e.preventDefault();
        handleZoneInput('right');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, handleZoneInput]);

  // Smooth visual progress bar for current command intervalMs window
  useEffect(() => {
    if (phase !== 'playing') return;
    let rafId = 0;
    const updateBar = () => {
      if (roundActiveRef.current && !commandResolvedRef.current) {
        const elapsed = performance.now() - commandSpawnMsRef.current;
        const limit = currentCommandRef.current.intervalMs;
        setCommandProgressRatio(Math.max(0, Math.min(1, 1 - elapsed / limit)));
      }
      rafId = window.requestAnimationFrame(updateBar);
    };
    rafId = window.requestAnimationFrame(updateBar);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, currentCommand]);

  // 60-second match countdown timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const intervalId = window.setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          void finishRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [phase, finishRound]);

  const startRound = useCallback(() => {
    sound.playClick();
    clearCommandTimers();

    scoreRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    correctCountRef.current = 0;
    wrongCountRef.current = 0;
    missedCountRef.current = 0;
    reactionTimesMsRef.current = [];

    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setWrongCount(0);
    setMissedCount(0);
    setFeedback(null);
    setSummary(null);
    setSubmitResult(null);
    setTimeLeftSec(COORDINATION_DUEL_ROUND_SECONDS);

    roundActiveRef.current = true;
    setPhase('playing');
    spawnNextCommand(0);
  }, [clearCommandTimers, spawnNextCommand]);

  const stageCfg = getCoordinationDuelStageConfig(currentCommand.index);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[10060] bg-[#04110d]/95 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-xl bg-gradient-to-b from-[#0b271e] via-[#081d16] to-[#05130e] border-2 border-emerald-400/35 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#061812] border-b border-emerald-400/25 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-300 via-emerald-400 to-cyan-400 p-0.5 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#061812] flex items-center justify-center text-lg">
                ⚡
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-white truncate">
                  دوئل هماهنگی
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-200 border border-amber-300/40 shrink-0">
                  رقابت گروهی
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {challengeConfig.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              roundActiveRef.current = false;
              clearCommandTimers();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-rose-500/25 text-slate-200 hover:text-rose-200 border border-slate-600/60 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="بستن بازی دوئل هماهنگی"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PHASE 1: READY / INTRO SCREEN */}
        {phase === 'ready' && (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            <div className="rounded-2xl bg-[#0c2d22] border border-emerald-300/30 p-4 text-center space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-300/35 text-amber-200 text-xs font-black">
                <Zap className="w-3.5 h-3.5" />
                <span>واکنش دو دست چپ و راست · ۶۰ ثانیه</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                هماهنگی چشم و دو دست با پشتیبانی لمس چندگانه!
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                صفحه به دو ناحیه بزرگ <span className="text-cyan-300 font-black">چپ</span> و{' '}
                <span className="text-amber-300 font-black">راست</span> تقسیم شده است. با ظهور فلش چپ، راست یا{' '}
                <span className="text-lime-300 font-black">دو فلش همزمان</span>، ناحیه متناظر را سریع لمس کنید (در ویندوز از کلیدهای{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-600 text-cyan-200 font-mono text-xs">
                  A
                </kbd>{' '}
                و{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-600 text-amber-200 font-mono text-xs">
                  L
                </kbd>{' '}
                استفاده کنید).
              </p>
            </div>

            {/* Stages & Scoring Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-2xl bg-[#092119] border border-emerald-400/25 p-3 space-y-1.5">
                <div className="font-black text-cyan-300 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  <span>افزایش سختی (هر ۱۰ فرمان)</span>
                </div>
                <ul className="space-y-1 text-slate-200 text-[11px] leading-relaxed">
                  <li>• مرحله ۱: <span className="text-emerald-300 font-bold">فقط فلش تکی · فاصله ۱۰۰۰ms</span></li>
                  <li>• مرحله ۲: <span className="text-sky-300 font-bold">۱۰٪ فرمان دوگانه · فاصله ۸۵۰ms</span></li>
                  <li>• مرحله ۳: <span className="text-amber-300 font-bold">۲۰٪ فرمان دوگانه · فاصله ۷۵۰ms</span></li>
                  <li>• مرحله ۴: <span className="text-fuchsia-300 font-bold">۳۰٪ فرمان دوگانه · فاصله ۶۵۰ms</span></li>
                </ul>
              </div>

              <div className="rounded-2xl bg-[#092119] border border-emerald-400/25 p-3 space-y-1.5">
                <div className="font-black text-amber-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>قوانین امتیازدهی</span>
                </div>
                <ul className="space-y-1 text-slate-200 text-[11px] leading-relaxed">
                  <li>• صحیح تک‌جهته: <span className="text-lime-300 font-bold">+۱۰۰</span> | دوگانه (≤۱۸۰ms): <span className="text-amber-300 font-bold">+۱۴۰</span></li>
                  <li>• پاداش سرعت: تا <span className="text-cyan-300 font-bold">+۲۰</span> | هر ۳ پاسخ صحیح: <span className="text-amber-300 font-bold">+۱۰</span> (تا ۳۰)</li>
                  <li>• پاسخ اشتباه: <span className="text-rose-300 font-bold">-۴۰ امتیاز</span></li>
                  <li>• از دست دادن فرصت پاسخ: <span className="text-orange-300 font-bold">-۲۰ امتیاز</span></li>
                </ul>
              </div>
            </div>

            {challengeConfig.personalBestScore !== null && (
              <div className="rounded-xl bg-amber-400/15 border border-amber-300/40 px-3.5 py-2.5 flex items-center justify-between text-xs">
                <span className="text-amber-100 font-bold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>بالاترین رکورد فعلی شما در این چالش:</span>
                </span>
                <span className="text-sm font-black text-amber-300 tabular-nums">
                  {challengeConfig.personalBestScore} امتیاز
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={startRound}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:brightness-105 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Swords className="w-5 h-5" />
              <span>شروع دوئل هماهنگی (۶۰ ثانیه)</span>
            </button>
          </div>
        )}

        {/* PHASE 2: ACTIVE 60-SECOND COORDINATION DUEL */}
        {phase === 'playing' && (
          <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-3 overflow-y-auto select-none">
            {/* Top HUD: Timer, Score, Streak, Stage */}
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                <div className="rounded-xl bg-[#071913] border border-emerald-400/35 px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-300" />
                    <span>زمان</span>
                  </span>
                  <span
                    className={`text-sm sm:text-base font-black tabular-nums ${
                      timeLeftSec <= 10 ? 'text-rose-300 animate-pulse' : 'text-white'
                    }`}
                  >
                    {timeLeftSec}s
                  </span>
                </div>

                <div className="rounded-xl bg-[#071913] border border-amber-400/35 px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-300 font-bold">امتیاز</span>
                  <span className="text-sm sm:text-base font-black text-amber-300 tabular-nums">
                    {score}
                  </span>
                </div>

                <div className="rounded-xl bg-[#071913] border border-lime-400/35 px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span>زنجیره</span>
                  </span>
                  <span className="text-sm sm:text-base font-black text-lime-300 tabular-nums">
                    {streak}×
                  </span>
                </div>

                <div className="rounded-xl bg-[#071913] border border-sky-400/35 px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-300 font-bold">
                    فرمان #{currentCommand.index + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-sky-300">
                    مرحله {stageCfg.stage}
                  </span>
                </div>
              </div>

              {/* Stage Info & Per-Command Window Countdown Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="text-slate-200 font-bold">{stageCfg.title}</span>
                  <span className="text-slate-300 tabular-nums">
                    صحیح: <strong className="text-lime-300">{correctCount}</strong> · اشتباه:{' '}
                    <strong className="text-rose-300">{wrongCount}</strong> · ازدست‌رفته:{' '}
                    <strong className="text-orange-300">{missedCount}</strong>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-none ${
                      commandProgressRatio > 0.45
                        ? 'bg-emerald-400'
                        : commandProgressRatio > 0.2
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                    style={{ width: `${Math.round(commandProgressRatio * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Center Command Prompt Display */}
            <div className="rounded-2xl bg-gradient-to-b from-[#0e3226] to-[#071b14] border-2 border-emerald-300/35 p-3.5 text-center space-y-2 shadow-inner">
              <div
                dir="ltr"
                className="flex items-center justify-center gap-4 min-h-[84px]"
              >
                {(currentCommand.direction === 'left' ||
                  currentCommand.direction === 'both') && (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 border-2 border-white shadow-lg flex flex-col items-center justify-center text-slate-950 animate-bounce">
                    <ArrowLeft className="w-10 h-10 stroke-[3]" />
                    <span className="text-[11px] font-black">چپ (A)</span>
                  </div>
                )}

                {currentCommand.direction === 'both' && (
                  <div className="px-2.5 py-1 rounded-xl bg-amber-400/20 border border-amber-300 text-amber-200 text-xs font-black">
                    همزمان!
                    <div className="text-[10px] text-amber-100 font-bold">
                      ≤ ۱۸۰ms
                    </div>
                  </div>
                )}

                {(currentCommand.direction === 'right' ||
                  currentCommand.direction === 'both') && (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 border-2 border-white shadow-lg flex flex-col items-center justify-center text-slate-950 animate-bounce">
                    <ArrowRight className="w-10 h-10 stroke-[3]" />
                    <span className="text-[11px] font-black">راست (L)</span>
                  </div>
                )}
              </div>

              <div className="text-xs sm:text-sm font-black text-white">
                {currentCommand.direction === 'left'
                  ? '👈 ناحیه چپ را لمس کنید (کلید A)'
                  : currentCommand.direction === 'right'
                  ? '👉 ناحیه راست را لمس کنید (کلید L)'
                  : '⚡ هر دو ناحیه چپ و راست را همزمان با دو انگشت لمس کنید (A + L)'}
              </div>

              {feedback && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${
                    feedback.outcome === 'correct'
                      ? 'bg-emerald-500/20 border-emerald-400 text-lime-200'
                      : feedback.outcome === 'missed'
                      ? 'bg-orange-500/20 border-orange-400 text-orange-200'
                      : 'bg-rose-500/20 border-rose-400 text-rose-200'
                  }`}
                >
                  {feedback.outcome === 'correct' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime-300" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-300" />
                  )}
                  <span>{feedback.label}</span>
                </div>
              )}
            </div>

            {/* TWO LARGE SPLIT TOUCH ZONES (LEFT & RIGHT) — Physical LTR layout so Left is on Left and Right is on Right */}
            <div
              dir="ltr"
              className="grid grid-cols-2 gap-3 min-h-[210px] sm:min-h-[240px] touch-none select-none"
            >
              {/* LEFT TOUCH ZONE */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleZoneInput('left');
                }}
                aria-label="ناحیه لمس چپ (کلید A)"
                className={`rounded-3xl border-3 p-4 flex flex-col items-center justify-center gap-2.5 transition-transform touch-none select-none cursor-pointer ${
                  leftPressedVisual
                    ? 'bg-gradient-to-b from-cyan-300 to-blue-500 border-white text-slate-950 scale-95 shadow-[0_0_28px_rgba(56,189,248,0.8)]'
                    : currentCommand.direction === 'left' ||
                      currentCommand.direction === 'both'
                    ? 'bg-gradient-to-b from-[#0e3946] to-[#08222b] border-cyan-300/80 text-white shadow-lg'
                    : 'bg-gradient-to-b from-[#0b2620] to-[#071915] border-emerald-400/30 text-slate-200'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-black/25 border border-white/20 flex items-center justify-center">
                  <ArrowLeft className="w-8 h-8" />
                </div>
                <div className="text-base sm:text-lg font-black">ناحیه چپ</div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-black/30 border border-white/15 text-[11px] font-bold">
                  <Keyboard className="w-3 h-3" />
                  <span>کلید A / لمس چپ</span>
                </div>
              </button>

              {/* RIGHT TOUCH ZONE */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleZoneInput('right');
                }}
                aria-label="ناحیه لمس راست (کلید L)"
                className={`rounded-3xl border-3 p-4 flex flex-col items-center justify-center gap-2.5 transition-transform touch-none select-none cursor-pointer ${
                  rightPressedVisual
                    ? 'bg-gradient-to-b from-amber-300 to-orange-500 border-white text-slate-950 scale-95 shadow-[0_0_28px_rgba(251,191,36,0.8)]'
                    : currentCommand.direction === 'right' ||
                      currentCommand.direction === 'both'
                    ? 'bg-gradient-to-b from-[#422c0d] to-[#261907] border-amber-300/80 text-white shadow-lg'
                    : 'bg-gradient-to-b from-[#0b2620] to-[#071915] border-emerald-400/30 text-slate-200'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-black/25 border border-white/20 flex items-center justify-center">
                  <ArrowRight className="w-8 h-8" />
                </div>
                <div className="text-base sm:text-lg font-black">ناحیه راست</div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-black/30 border border-white/15 text-[11px] font-bold">
                  <Hand className="w-3 h-3" />
                  <span>کلید L / لمس راست</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* PHASE 3: END-OF-ROUND SUMMARY SCREEN */}
        {phase === 'summary' && summary && (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            <div className="rounded-2xl bg-gradient-to-b from-[#11382b] to-[#092219] border-2 border-amber-300/50 p-4 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>پایان مسابقه دوئل هماهنگی</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-amber-300 tabular-nums">
                {summary.finalScore}
              </div>
              <div className="text-xs font-bold text-slate-200">امتیاز نهایی شما</div>

              {submitting ? (
                <div className="text-xs text-cyan-200 font-bold pt-1">
                  در حال ثبت رکورد در جدول رقابت گروه...
                </div>
              ) : submitResult ? (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${
                    submitResult.isNewRecord
                      ? 'bg-lime-400/20 border border-lime-300 text-lime-200'
                      : 'bg-slate-800/90 border border-slate-600 text-slate-200'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {submitResult.isNewRecord
                      ? `رکورد جدید شما در گروه ثبت شد: ${submitResult.bestScore} امتیاز!`
                      : `بهترین رکورد ثبت‌شده شما در گروه: ${submitResult.bestScore} امتیاز`}
                  </span>
                </div>
              ) : null}
            </div>

            {/* 4 Key End-of-Round Metrics Requested by Spec: امتیاز، دقت، میانگین زمان واکنش و بهترین زنجیره */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-[#092119] border border-amber-400/35 p-3 text-center">
                <div className="text-[11px] text-slate-300 font-bold">امتیاز</div>
                <div className="text-lg sm:text-xl font-black text-amber-300 tabular-nums mt-0.5">
                  {summary.finalScore}
                </div>
              </div>

              <div className="rounded-2xl bg-[#092119] border border-emerald-400/35 p-3 text-center">
                <div className="text-[11px] text-slate-300 font-bold">دقت</div>
                <div className="text-lg sm:text-xl font-black text-lime-300 tabular-nums mt-0.5">
                  {summary.accuracyPercent}٪
                </div>
              </div>

              <div className="rounded-2xl bg-[#092119] border border-cyan-400/35 p-3 text-center">
                <div className="text-[11px] text-slate-300 font-bold">
                  میانگین زمان واکنش
                </div>
                <div className="text-lg sm:text-xl font-black text-cyan-300 tabular-nums mt-0.5">
                  {summary.averageReactionMs > 0
                    ? `${summary.averageReactionMs}ms (${summary.averageReactionSeconds}s)`
                    : '—'}
                </div>
              </div>

              <div className="rounded-2xl bg-[#092119] border border-orange-400/35 p-3 text-center">
                <div className="text-[11px] text-slate-300 font-bold">
                  بهترین زنجیره
                </div>
                <div className="text-lg sm:text-xl font-black text-orange-300 tabular-nums mt-0.5">
                  {summary.bestStreak} پاسخ
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={startRound}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-b from-[#d9f99d] via-[#bef264] to-[#84cc16] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تلاش دوباره برای ارتقای رکورد</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-black text-xs sm:text-sm cursor-pointer"
              >
                بازگشت به گروه
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
