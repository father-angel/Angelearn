import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  Grid,
  Heart,
  Hand,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import {
  SPATIAL_MEMORY_INITIAL_LIVES,
  SPATIAL_MEMORY_ROUND_SECONDS,
  SpatialMemoryRoundSummary,
  evaluateSpatialMemoryLevelOutcome,
  generateSpatialMemorySequence,
  getSpatialMemoryLevelConfig,
  summarizeSpatialMemoryRound,
} from '../../game/groupChallenges';
import { sound } from '../../utils/audio';

export interface SpatialMemoryChallengeConfig {
  challengeId: string;
  title: string;
  personalBestScore: number | null;
}

export interface SpatialMemoryGameProps {
  challengeConfig: SpatialMemoryChallengeConfig;
  onChallengeComplete: (result: {
    score: number;
    detailLabel: string;
  }) => Promise<{ isNewRecord: boolean; bestScore: number } | void>;
  onClose: () => void;
}

type MatchPhase = 'ready' | 'playing' | 'summary';
type TurnState = 'showing' | 'input' | 'level_success' | 'level_mistake';

interface TilePalette {
  idleBg: string;
  idleBorder: string;
  litBg: string;
  litBorder: string;
  litShadow: string;
  swatchHex: string;
  freqHz: number;
}

const TILE_PALETTES: ReadonlyArray<TilePalette> = [
  {
    // Emerald
    idleBg: 'bg-emerald-950/85 hover:bg-emerald-900/80',
    idleBorder: 'border-emerald-500/45',
    litBg: 'bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-500',
    litBorder: 'border-white',
    litShadow: '0 0 26px rgba(52, 211, 153, 0.85)',
    swatchHex: '#34d399',
    freqHz: 329.63, // E4
  },
  {
    // Sky / Cyan
    idleBg: 'bg-sky-950/85 hover:bg-sky-900/80',
    idleBorder: 'border-sky-400/45',
    litBg: 'bg-gradient-to-br from-sky-200 via-cyan-400 to-blue-500',
    litBorder: 'border-white',
    litShadow: '0 0 26px rgba(56, 189, 248, 0.85)',
    swatchHex: '#38bdf8',
    freqHz: 392.0, // G4
  },
  {
    // Amber / Gold
    idleBg: 'bg-amber-950/85 hover:bg-amber-900/80',
    idleBorder: 'border-amber-400/45',
    litBg: 'bg-gradient-to-br from-yellow-200 via-amber-400 to-orange-500',
    litBorder: 'border-white',
    litShadow: '0 0 26px rgba(251, 191, 36, 0.88)',
    swatchHex: '#fbbf24',
    freqHz: 440.0, // A4
  },
  {
    // Rose / Coral
    idleBg: 'bg-rose-950/85 hover:bg-rose-900/80',
    idleBorder: 'border-rose-400/45',
    litBg: 'bg-gradient-to-br from-rose-200 via-rose-400 to-red-500',
    litBorder: 'border-white',
    litShadow: '0 0 26px rgba(251, 113, 133, 0.85)',
    swatchHex: '#fb7185',
    freqHz: 523.25, // C5
  },
  {
    // Violet / Fuchsia
    idleBg: 'bg-purple-950/85 hover:bg-purple-900/80',
    idleBorder: 'border-purple-400/45',
    litBg: 'bg-gradient-to-br from-fuchsia-200 via-purple-400 to-indigo-500',
    litBorder: 'border-white',
    litShadow: '0 0 26px rgba(192, 132, 252, 0.85)',
    swatchHex: '#c084fc',
    freqHz: 587.33, // D5
  },
];

function getTilePalette(cellIndex: number, gridSize: number): TilePalette {
  const row = Math.floor(cellIndex / gridSize);
  const col = cellIndex % gridSize;
  const idx = (row * 2 + col) % TILE_PALETTES.length;
  return TILE_PALETTES[idx];
}

function playSimonTone(freqHz: number, durationMs = 180) {
  try {
    const ctx = sound.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqHz, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + Math.max(0.08, durationMs / 1000)
    );

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + Math.max(0.09, durationMs / 1000 + 0.02));
  } catch {
    // Ignore audio context restrictions
  }
}

export const SpatialMemoryGame: React.FC<SpatialMemoryGameProps> = ({
  challengeConfig,
  onChallengeComplete,
  onClose,
}) => {
  const [phase, setPhase] = useState<MatchPhase>('ready');
  const [turnState, setTurnState] = useState<TurnState>('showing');
  const [timeLeftSec, setTimeLeftSec] = useState<number>(
    SPATIAL_MEMORY_ROUND_SECONDS
  );

  const [level, setLevel] = useState<number>(1);
  const [highestLevelReached, setHighestLevelReached] = useState<number>(1);
  const [levelsCleared, setLevelsCleared] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(SPATIAL_MEMORY_INITIAL_LIVES);
  const [consecutiveClears, setConsecutiveClears] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [totalMistakes, setTotalMistakes] = useState<number>(0);

  const [sequence, setSequence] = useState<number[]>([]);
  const [playerStep, setPlayerStep] = useState<number>(0);
  const [showingStepIdx, setShowingStepIdx] = useState<number>(0);
  const [litCellIndex, setLitCellIndex] = useState<number | null>(null);
  const [wrongCellIndex, setWrongCellIndex] = useState<number | null>(null);
  const [expectedCellIndex, setExpectedCellIndex] = useState<number | null>(null);
  const [bannerText, setBannerText] = useState<string | null>(null);

  const [summary, setSummary] = useState<SpatialMemoryRoundSummary | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<{
    isNewRecord: boolean;
    bestScore: number;
  } | null>(null);

  const roundActiveRef = useRef<boolean>(false);
  const timersRef = useRef<number[]>([]);

  const scoreRef = useRef<number>(0);
  const levelRef = useRef<number>(1);
  const highestLevelRef = useRef<number>(1);
  const levelsClearedRef = useRef<number>(0);
  const livesRef = useRef<number>(SPATIAL_MEMORY_INITIAL_LIVES);
  const consecutiveClearsRef = useRef<number>(0);
  const bestStreakRef = useRef<number>(0);
  const mistakesRef = useRef<number>(0);
  const sequenceRef = useRef<number[]>([]);

  const clearAllTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const scheduleTimer = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, delayMs);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const levelConfig = useMemo(() => getSpatialMemoryLevelConfig(level), [level]);

  const finishRound = useCallback(async () => {
    if (!roundActiveRef.current) return;
    roundActiveRef.current = false;
    clearAllTimers();
    setLitCellIndex(null);
    setWrongCellIndex(null);
    setExpectedCellIndex(null);

    const finalSummary = summarizeSpatialMemoryRound({
      finalScore: scoreRef.current,
      highestLevelReached: highestLevelRef.current,
      levelsCleared: levelsClearedRef.current,
      totalMistakes: mistakesRef.current,
      bestStreak: bestStreakRef.current,
      previousBestScore: challengeConfig.personalBestScore,
    });

    setSummary(finalSummary);
    setPhase('summary');
    sound.playCoin();

    const detailLabel = `سطح ${finalSummary.highestLevelReached} · ${finalSummary.levelsCleared} مرحله تکمیل · ${finalSummary.totalMistakes} اشتباه`;

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
      // Handled by parent notice/error banner
    } finally {
      setSubmitting(false);
    }
  }, [challengeConfig.personalBestScore, clearAllTimers, onChallengeComplete]);

  const playSequencePlayback = useCallback(
    (targetLevel: number, seq: number[]) => {
      clearAllTimers();
      const cfg = getSpatialMemoryLevelConfig(targetLevel);
      setTurnState('showing');
      setPlayerStep(0);
      setShowingStepIdx(0);
      setLitCellIndex(null);
      setWrongCellIndex(null);
      setExpectedCellIndex(null);

      const activeFlashMs = Math.max(210, Math.round(cfg.displaySpeedMs * 0.72));
      const stepTotalMs = cfg.displaySpeedMs;
      const initialDelayMs = 420;

      seq.forEach((cellIdx, stepIdx) => {
        const startOffset = initialDelayMs + stepIdx * stepTotalMs;
        scheduleTimer(() => {
          if (!roundActiveRef.current) return;
          setShowingStepIdx(stepIdx + 1);
          setLitCellIndex(cellIdx);
          const palette = getTilePalette(cellIdx, cfg.gridSize);
          playSimonTone(palette.freqHz, activeFlashMs);
        }, startOffset);

        scheduleTimer(() => {
          if (!roundActiveRef.current) return;
          setLitCellIndex(null);
        }, startOffset + activeFlashMs);
      });

      const totalPlaybackMs = initialDelayMs + seq.length * stepTotalMs + 120;
      scheduleTimer(() => {
        if (!roundActiveRef.current) return;
        setLitCellIndex(null);
        setBannerText(null);
        setTurnState('input');
      }, totalPlaybackMs);
    },
    [clearAllTimers, scheduleTimer]
  );

  const startRound = useCallback(() => {
    sound.playClick();
    clearAllTimers();

    scoreRef.current = 0;
    levelRef.current = 1;
    highestLevelRef.current = 1;
    levelsClearedRef.current = 0;
    livesRef.current = SPATIAL_MEMORY_INITIAL_LIVES;
    consecutiveClearsRef.current = 0;
    bestStreakRef.current = 0;
    mistakesRef.current = 0;

    const firstSeq = generateSpatialMemorySequence(1, null);
    sequenceRef.current = firstSeq;

    setScore(0);
    setLevel(1);
    setHighestLevelReached(1);
    setLevelsCleared(0);
    setLives(SPATIAL_MEMORY_INITIAL_LIVES);
    setConsecutiveClears(0);
    setBestStreak(0);
    setTotalMistakes(0);
    setSequence(firstSeq);
    setPlayerStep(0);
    setBannerText(null);
    setSummary(null);
    setSubmitResult(null);
    setTimeLeftSec(SPATIAL_MEMORY_ROUND_SECONDS);

    roundActiveRef.current = true;
    setPhase('playing');
    playSequencePlayback(1, firstSeq);
  }, [clearAllTimers, playSequencePlayback]);

  // 90-second match countdown timer
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

  const handleTileTap = useCallback(
    (cellIdx: number) => {
      if (
        phase !== 'playing' ||
        turnState !== 'input' ||
        !roundActiveRef.current
      ) {
        return;
      }

      const activeSeq = sequenceRef.current;
      const expectedCell = activeSeq[playerStep];
      const currentLvl = levelRef.current;
      const cfg = getSpatialMemoryLevelConfig(currentLvl);

      if (cellIdx === expectedCell) {
        // Correct tile tap
        const palette = getTilePalette(cellIdx, cfg.gridSize);
        playSimonTone(palette.freqHz, 160);
        setLitCellIndex(cellIdx);
        scheduleTimer(() => {
          if (roundActiveRef.current) {
            setLitCellIndex((prev) => (prev === cellIdx ? null : prev));
          }
        }, 170);

        const nextStep = playerStep + 1;
        setPlayerStep(nextStep);

        // Did the player complete the entire sequence for this level?
        if (nextStep >= activeSeq.length) {
          sound.playCardMatch();
          const evalResult = evaluateSpatialMemoryLevelOutcome({
            level: currentLvl,
            completed: true,
            currentScore: scoreRef.current,
            currentLives: livesRef.current,
            consecutiveClears: consecutiveClearsRef.current,
            bestStreak: bestStreakRef.current,
          });

          scoreRef.current = evalResult.nextScore;
          consecutiveClearsRef.current = evalResult.nextConsecutiveClears;
          bestStreakRef.current = evalResult.nextBestStreak;
          levelsClearedRef.current += 1;
          const nextLvl = evalResult.nextLevel;
          levelRef.current = nextLvl;
          highestLevelRef.current = Math.max(highestLevelRef.current, nextLvl);

          setScore(evalResult.nextScore);
          setConsecutiveClears(evalResult.nextConsecutiveClears);
          setBestStreak(evalResult.nextBestStreak);
          setLevelsCleared(levelsClearedRef.current);
          setHighestLevelReached(highestLevelRef.current);
          setTurnState('level_success');

          const upgradeNotice =
            nextLvl === 4
              ? ' · ارتقای شبکه به ۴×۴!'
              : nextLvl === 8
              ? ' · ارتقای شبکه به ۵×۵!'
              : '';
          setBannerText(
            `✨ مرحله ${currentLvl} تکمیل شد! +${evalResult.scoreDelta} امتیاز${
              evalResult.comboBonus > 0 ? ` (پاداش متوالی +${evalResult.comboBonus})` : ''
            }${upgradeNotice}`
          );

          scheduleTimer(() => {
            if (!roundActiveRef.current) return;
            const nextSeq = generateSpatialMemorySequence(nextLvl, null);
            sequenceRef.current = nextSeq;
            setLevel(nextLvl);
            setSequence(nextSeq);
            setBannerText(null);
            playSequencePlayback(nextLvl, nextSeq);
          }, 850);
        }
      } else {
        // Wrong tile tap -> deduct 1 life & repeat same level with a new sequence (or game over if 0 lives)
        sound.playClick();
        playSimonTone(155, 260);
        mistakesRef.current += 1;
        setTotalMistakes(mistakesRef.current);

        const evalResult = evaluateSpatialMemoryLevelOutcome({
          level: currentLvl,
          completed: false,
          currentScore: scoreRef.current,
          currentLives: livesRef.current,
          consecutiveClears: consecutiveClearsRef.current,
          bestStreak: bestStreakRef.current,
        });

        livesRef.current = evalResult.nextLives;
        consecutiveClearsRef.current = 0;

        setLives(evalResult.nextLives);
        setConsecutiveClears(0);
        setWrongCellIndex(cellIdx);
        setExpectedCellIndex(expectedCell);
        setTurnState('level_mistake');

        if (evalResult.isGameOver) {
          setBannerText('💔 جان‌های شما به پایان رسید! پایان بازی...');
          scheduleTimer(() => {
            void finishRound();
          }, 900);
        } else {
          setBannerText(
            `⚠️ خانه اشتباه! ۱ جان کم شد · تکرار سطح ${currentLvl} با توالی جدید...`
          );
          scheduleTimer(() => {
            if (!roundActiveRef.current) return;
            const retrySeq = generateSpatialMemorySequence(
              currentLvl,
              activeSeq
            );
            sequenceRef.current = retrySeq;
            setSequence(retrySeq);
            setBannerText(null);
            playSequencePlayback(currentLvl, retrySeq);
          }, 1050);
        }
      }
    },
    [
      finishRound,
      phase,
      playSequencePlayback,
      playerStep,
      scheduleTimer,
      turnState,
    ]
  );

  const displayedPersonalBest =
    submitResult?.bestScore ??
    summary?.personalBestScore ??
    challengeConfig.personalBestScore ??
    0;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[10060] bg-[#04110d]/95 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-gradient-to-b from-[#0b271e] via-[#081d16] to-[#05130e] border-2 border-emerald-400/35 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#061812] border-b border-emerald-400/25 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-400 via-emerald-400 to-amber-300 p-0.5 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#061812] flex items-center justify-center text-lg">
                🟦
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-white truncate">
                  حافظه فضایی
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-sky-400/20 text-sky-200 border border-sky-300/40 shrink-0">
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
              clearAllTimers();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-rose-500/25 text-slate-200 hover:text-rose-200 border border-slate-600/60 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="بستن بازی حافظه فضایی"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PHASE 1: READY / INTRO SCREEN */}
        {phase === 'ready' && (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            <div className="rounded-2xl bg-[#0c2d22] border border-emerald-300/30 p-4 text-center space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-400/15 border border-sky-300/35 text-sky-200 text-xs font-black">
                <Grid className="w-3.5 h-3.5" />
                <span>شبکه ۳×۳ تا ۵×۵ · ۳ جان · ۹۰ ثانیه</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                ترتیب روشن‌شدن خانه‌های رنگی را به خاطر بسپار و تکرار کن!
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                در هر مرحله، خانه‌های شبکه به ترتیب روشن می‌شوند. پس از پایان نمایش، دقیقاً همان مسیر را با لمس خانه‌ها تکرار کنید تا به مراحل بالاتر صعود کنید و رکورد خود را بشکنید!
              </p>
            </div>

            {/* Progression & Scoring Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-2xl bg-[#092119] border border-emerald-400/25 p-3 space-y-1.5">
                <div className="font-black text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>افزایش سختی و قوانین</span>
                </div>
                <ul className="space-y-1 text-slate-200 text-[11px] leading-relaxed">
                  <li>• شروع از <span className="text-emerald-300 font-bold">شبکه ۳×۳</span> با توالی <span className="text-emerald-300 font-bold">۳ خانه</span> (سرعت ۶۵۰ms)</li>
                  <li>• در هر مرحله <span className="text-amber-300 font-bold">۱ خانه</span> به توالی اضافه می‌شود</li>
                  <li>• سطح ۴: شبکه <span className="text-sky-300 font-bold">۴×۴</span> | سطح ۸: شبکه <span className="text-fuchsia-300 font-bold">۵×۵</span> (سرعت تا ۳۵۰ms)</li>
                  <li>• <span className="text-rose-300 font-bold">۳ جان</span> دارید؛ پس از اشتباه همان سطح با توالی جدید تکرار می‌شود</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-[#092119] border border-emerald-400/25 p-3 space-y-1.5">
                <div className="font-black text-amber-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>امتیازدهی مراحل</span>
                </div>
                <ul className="space-y-1 text-slate-200 text-[11px] leading-relaxed">
                  <li>• تکمیل هر مرحله: <span className="text-lime-300 font-bold">+۱۰۰ امتیاز پایه</span></li>
                  <li>• هر خانه بیشتر از توالی اولیه (۳): <span className="text-cyan-300 font-bold">+۱۵ امتیاز اضافه</span></li>
                  <li>• تکمیل مراحل متوالی: <span className="text-amber-300 font-bold">+۱۰ امتیاز ترکیبی</span> (حداکثر +۳۰)</li>
                  <li>• مراحل ناموفق امتیاز ندارند</li>
                </ul>
              </div>
            </div>

            {challengeConfig.personalBestScore !== null && (
              <div className="rounded-xl bg-amber-400/15 border border-amber-300/40 px-3.5 py-2.5 flex items-center justify-between text-xs">
                <span className="text-amber-100 font-bold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>رکورد شخصی فعلی شما در این چالش:</span>
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
              <span>شروع چالش حافظه فضایی (۹۰ ثانیه)</span>
            </button>
          </div>
        )}

        {/* PHASE 2: ACTIVE GAMEPLAY */}
        {phase === 'playing' && (
          <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between gap-3 overflow-y-auto">
            {/* Top HUD: Level, Lives, Timer, Score */}
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {/* Level & Grid Size */}
                <div className="rounded-xl bg-[#071913] border border-sky-400/35 px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-300 font-bold">
                    سطح ({levelConfig.gridLabel})
                  </span>
                  <span className="text-sm sm:text-base font-black text-sky-300 tabular-nums">
                    مرحله {level}
                  </span>
                </div>

                {/* 3 Lives Hearts */}
                <div className="rounded-xl bg-[#071913] border border-rose-400/35 px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-300 font-bold">جان‌ها</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3].map((heartIdx) => {
                      const alive = heartIdx <= lives;
                      return (
                        <Heart
                          key={heartIdx}
                          className={`w-4 h-4 transition-transform ${
                            alive
                              ? 'text-rose-400 fill-rose-400 scale-100'
                              : 'text-slate-700 fill-slate-800 scale-90'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Score */}
                <div className="rounded-xl bg-[#071913] border border-amber-400/35 px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-300 font-bold">امتیاز</span>
                  <span className="text-sm sm:text-base font-black text-amber-300 tabular-nums">
                    {score}
                  </span>
                </div>

                {/* 90s Countdown Timer */}
                <div className="rounded-xl bg-[#071913] border border-emerald-400/35 px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-300" />
                    <span>زمان</span>
                  </span>
                  <span
                    className={`text-sm sm:text-base font-black tabular-nums ${
                      timeLeftSec <= 15 ? 'text-rose-300 animate-pulse' : 'text-white'
                    }`}
                  >
                    {timeLeftSec}s
                  </span>
                </div>
              </div>

              {/* Sub-header info bar: sequence length, display speed, consecutive combo */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#061611] border border-emerald-400/20 text-[11px]">
                <span className="text-slate-200 font-bold">
                  طول توالی:{' '}
                  <span className="text-lime-300 font-black">
                    {levelConfig.sequenceLength} خانه
                  </span>{' '}
                  · سرعت:{' '}
                  <span className="text-cyan-300 font-black">
                    {levelConfig.displaySpeedMs}ms
                  </span>
                </span>
                <span className="text-amber-300 font-black flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span>مراحل متوالی: {consecutiveClears}×</span>
                </span>
              </div>

              {/* Turn Status Banner */}
              <div
                className={`rounded-xl px-3 py-2 border text-xs font-black flex items-center justify-between transition-all ${
                  turnState === 'showing'
                    ? 'bg-sky-500/15 border-sky-400/45 text-sky-100'
                    : turnState === 'input'
                    ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-100'
                    : turnState === 'level_success'
                    ? 'bg-lime-500/20 border-lime-300 text-lime-200'
                    : 'bg-rose-500/20 border-rose-400 text-rose-100'
                }`}
              >
                {bannerText ? (
                  <span className="flex items-center gap-1.5">
                    {turnState === 'level_success' ? (
                      <CheckCircle2 className="w-4 h-4 text-lime-300 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-300 shrink-0" />
                    )}
                    <span>{bannerText}</span>
                  </span>
                ) : turnState === 'showing' ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-sky-300 shrink-0" />
                      <span>به ترتیب روشن‌شدن خانه‌ها دقت کنید...</span>
                    </span>
                    <span className="text-sky-200 tabular-nums">
                      {showingStepIdx} / {sequence.length}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Hand className="w-4 h-4 text-lime-300 shrink-0" />
                      <span>نوبت شما! همان ترتیب را لمس کنید</span>
                    </span>
                    <span className="text-lime-300 tabular-nums">
                      {playerStep} / {sequence.length}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Colored Simon Spatial Grid (3x3, 4x4, or 5x5) */}
            <div className="flex-1 flex flex-col items-center justify-center py-1">
              <div
                dir="ltr"
                className={`w-full max-w-[330px] sm:max-w-[360px] aspect-square p-2.5 sm:p-3 rounded-3xl bg-[#05140f] border-2 border-emerald-400/30 shadow-inner grid ${
                  levelConfig.gridSize === 3
                    ? 'grid-cols-3 gap-2.5 sm:gap-3'
                    : levelConfig.gridSize === 4
                    ? 'grid-cols-4 gap-2 sm:gap-2.5'
                    : 'grid-cols-5 gap-1.5 sm:gap-2'
                }`}
              >
                {Array.from({ length: levelConfig.totalCells }, (_, cellIdx) => {
                  const palette = getTilePalette(cellIdx, levelConfig.gridSize);
                  const isLit = litCellIndex === cellIdx;
                  const isWrong = wrongCellIndex === cellIdx;
                  const isExpectedHint = expectedCellIndex === cellIdx;

                  let tileClasses = `${palette.idleBg} ${palette.idleBorder}`;
                  let inlineShadow: string | undefined;

                  if (isLit) {
                    tileClasses = `${palette.litBg} ${palette.litBorder} scale-[1.04] z-10`;
                    inlineShadow = palette.litShadow;
                  } else if (isWrong) {
                    tileClasses =
                      'bg-gradient-to-br from-rose-500 to-red-700 border-white ring-2 ring-rose-300 scale-95';
                  } else if (isExpectedHint) {
                    tileClasses =
                      'bg-gradient-to-br from-lime-300 to-emerald-500 border-white ring-2 ring-lime-200 animate-pulse';
                  }

                  return (
                    <button
                      key={`spatial_cell_${levelConfig.gridSize}_${cellIdx}`}
                      type="button"
                      disabled={turnState !== 'input'}
                      onClick={() => handleTileTap(cellIdx)}
                      style={
                        inlineShadow ? { boxShadow: inlineShadow } : undefined
                      }
                      aria-label={`خانه شماره ${cellIdx + 1}`}
                      className={`relative w-full h-full aspect-square rounded-2xl border-2 flex items-center justify-center transition-all duration-150 select-none touch-manipulation ${
                        turnState === 'input'
                          ? 'cursor-pointer active:scale-95'
                          : 'cursor-default'
                      } ${tileClasses}`}
                    >
                      {/* Center Color Dot Cue for Clear Spatial Orientation */}
                      <span
                        className={`rounded-full transition-all ${
                          levelConfig.gridSize === 5
                            ? 'w-2.5 h-2.5'
                            : 'w-3.5 h-3.5'
                        } ${isLit ? 'bg-white scale-125' : 'opacity-65'}`}
                        style={
                          !isLit
                            ? { backgroundColor: palette.swatchHex }
                            : undefined
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sequence Step Dots Indicator */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 py-1">
              {sequence.map((_, idx) => {
                const isDone =
                  turnState === 'input'
                    ? idx < playerStep
                    : turnState === 'level_success';
                const isActive =
                  (turnState === 'showing' && idx === showingStepIdx - 1) ||
                  (turnState === 'input' && idx === playerStep);
                return (
                  <span
                    key={`seq_dot_${idx}`}
                    className={`h-2.5 rounded-full transition-all ${
                      isDone
                        ? 'w-5 bg-lime-400'
                        : isActive
                        ? 'w-5 bg-amber-300 ring-2 ring-white/80'
                        : 'w-2.5 bg-slate-700'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* PHASE 3: END-OF-ROUND SUMMARY SCREEN */}
        {phase === 'summary' && summary && (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            <div className="rounded-2xl bg-gradient-to-b from-[#11382b] to-[#092219] border-2 border-amber-300/50 p-4 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>پایان چالش حافظه فضایی</span>
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

            {/* 4 Key End-of-Round Metrics Requested by Spec: بیشترین سطح، امتیاز، تعداد اشتباهات و رکورد شخصی */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-[#092119] border border-sky-400/35 p-3 text-center">
                <div className="text-[11px] text-slate-300 font-bold">
                  بیشترین سطح
                </div>
                <div className="text-lg sm:text-xl font-black text-sky-300 tabular-nums mt-0.5">
                  سطح {summary.highestLevelReached}
                </div>
              </div>

              <div className="rounded-2xl bg-[#092119] border border-amber-400/35 p-3 text-center">
                <div className="text-[11px] text-slate-300 font-bold">امتیاز</div>
                <div className="text-lg sm:text-xl font-black text-amber-300 tabular-nums mt-0.5">
                  {summary.finalScore}
                </div>
              </div>

              <div className="rounded-2xl bg-[#092119] border border-rose-400/30 p-3 text-center">
                <div className="text-[11px] text-slate-300 font-bold">
                  تعداد اشتباهات
                </div>
                <div className="text-lg sm:text-xl font-black text-rose-300 tabular-nums mt-0.5">
                  {summary.totalMistakes}
                </div>
              </div>

              <div className="rounded-2xl bg-[#092119] border border-emerald-400/35 p-3 text-center">
                <div className="text-[11px] text-slate-300 font-bold">
                  رکورد شخصی
                </div>
                <div className="text-lg sm:text-xl font-black text-lime-300 tabular-nums mt-0.5">
                  {displayedPersonalBest}
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
                <span>تلاش دوباره برای شکستن رکورد</span>
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
