import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../../utils/audio';
import { ExerciseCompletionReport } from '../../types/game';
import { calculateBinaChallengeScore } from '../../game/groupChallenges';
import {
  BINA_LEVEL_CONFIGS,
  BINA_PLACEMENT_ROUNDS,
  BINA_PLACEMENT_START_LEVEL,
  BinaPlacementAttempt,
  BinaPlacementSummary,
  getBinaLevelConfig,
  getNextBinaPlacementProbeLevel,
  evaluateBinaPlacement,
} from '../../game/rules';
import {
  Eye,
  RotateCcw,
  CheckCircle,
  Sparkles,
  Compass,
  Zap,
  Trophy,
  ArrowLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BinaBallsGameProps {
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

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isTarget: boolean;
}

type BinaModalPhase =
  | 'placement_intro'
  | 'placement_playing'
  | 'placement_result'
  | 'select_level'
  | 'playing';

type RoundStage = 'memorize' | 'moving' | 'guess' | 'result';

interface SavedBinaPlacement {
  calibratedLevel: number; // 1..5
  accuracyPercent: number;
  averageSelectionSeconds: number;
  skillLabel: string;
  completedAt: string;
}

const BINA_PLACEMENT_STORAGE_KEY = 'angellearn_bina_placement_v1';

function loadSavedBinaPlacement(): SavedBinaPlacement | null {
  try {
    const raw = localStorage.getItem(BINA_PLACEMENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedBinaPlacement>;
    if (
      typeof parsed.calibratedLevel !== 'number' ||
      !Number.isFinite(parsed.calibratedLevel)
    ) {
      return null;
    }
    const clamped = Math.max(1, Math.min(5, Math.round(parsed.calibratedLevel)));
    return {
      calibratedLevel: clamped,
      accuracyPercent: typeof parsed.accuracyPercent === 'number' ? parsed.accuracyPercent : 0,
      averageSelectionSeconds:
        typeof parsed.averageSelectionSeconds === 'number' ? parsed.averageSelectionSeconds : 0,
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

function saveBinaPlacement(summary: BinaPlacementSummary): SavedBinaPlacement {
  const payload: SavedBinaPlacement = {
    calibratedLevel: summary.recommendedLevel,
    accuracyPercent: summary.accuracyPercent,
    averageSelectionSeconds: summary.averageSelectionSeconds,
    skillLabel: summary.skillLabel,
    completedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(BINA_PLACEMENT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
  return payload;
}

function toPersianDigits(num: number | string): string {
  return String(num).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

function generateArenaBalls(level: number): Ball[] {
  const cfg = getBinaLevelConfig(level);
  const radius = cfg.totalBalls >= 12 ? 14 : 15;

  // Build 5x3 grid slots inside 360x280 arena so up to 15 balls spawn separated
  const slots: Array<{ x: number; y: number }> = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      slots.push({
        x: 42 + col * 68 + (Math.random() * 12 - 6),
        y: 48 + row * 90 + (Math.random() * 12 - 6),
      });
    }
  }
  // Shuffle slots
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  // Choose `targetCount` random ball IDs as green targets
  const targetIndices = new Set<number>();
  while (targetIndices.size < cfg.targetCount) {
    targetIndices.add(Math.floor(Math.random() * cfg.totalBalls));
  }

  const balls: Ball[] = [];
  for (let i = 0; i < cfg.totalBalls; i++) {
    const slot = slots[i];
    const angle = Math.random() * Math.PI * 2;
    const speed = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
    balls.push({
      id: i,
      x: slot.x,
      y: slot.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      isTarget: targetIndices.has(i),
    });
  }
  return balls;
}

export const BinaBallsGame: React.FC<BinaBallsGameProps> = ({
  onComplete,
  onClose,
  challengeConfig = null,
  onChallengeComplete,
}) => {
  const isChallengeMode = Boolean(challengeConfig);
  const [savedPlacement, setSavedPlacement] = useState<SavedBinaPlacement | null>(
    loadSavedBinaPlacement
  );
  const [modalPhase, setModalPhase] = useState<BinaModalPhase>(() =>
    isChallengeMode
      ? 'playing'
      : loadSavedBinaPlacement()
      ? 'select_level'
      : 'placement_intro'
  );
  const [selectedLevel, setSelectedLevel] = useState<number>(() =>
    isChallengeMode ? 1 : loadSavedBinaPlacement()?.calibratedLevel ?? 2
  );

  // Escalating Group Challenge state (waves 1 -> 5)
  const [challengeWave, setChallengeWave] = useState<number>(1);
  const [challengeClearedRounds, setChallengeClearedRounds] = useState<number>(0);
  const [challengeTargetsHit, setChallengeTargetsHit] = useState<number>(0);
  const [challengeFinished, setChallengeFinished] = useState<{
    score: number;
    wonAll: boolean;
    isNewRecord: boolean | null;
    bestScore: number | null;
    submitting: boolean;
  } | null>(null);

  // Adaptive placement state (3 quick visual rounds)
  const [placementRoundIdx, setPlacementRoundIdx] = useState<number>(0);
  const [placementProbeLevel, setPlacementProbeLevel] = useState<number>(
    BINA_PLACEMENT_START_LEVEL
  );
  const [placementAttempts, setPlacementAttempts] = useState<BinaPlacementAttempt[]>([]);
  const [placementSummary, setPlacementSummary] = useState<BinaPlacementSummary | null>(null);
  const [placementFeedbackText, setPlacementFeedbackText] = useState<string | null>(null);

  // Active arena round state
  const [roundStage, setRoundStage] = useState<RoundStage>('memorize');
  const [countdown, setCountdown] = useState<number>(3);
  const [movingTimeLeft, setMovingTimeLeft] = useState<number>(6);
  const [selectedBallIds, setSelectedBallIds] = useState<number[]>([]);
  const [foundCount, setFoundCount] = useState<number>(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [ballsState, setBallsState] = useState<Ball[]>(() =>
    isChallengeMode ? generateArenaBalls(1) : []
  );

  const startedAtMsRef = useRef<number>(Date.now());
  const startedAtIsoRef = useRef<string>(new Date().toISOString());
  const guessStartMsRef = useRef<number>(Date.now());
  const requestRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<number | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const ballsRef = useRef<Ball[]>(ballsState);

  // Ensure initial ballsRef sync in challenge mode
  useEffect(() => {
    if (isChallengeMode && ballsRef.current.length > 0 && countdown === 3) {
      const cfg = getBinaLevelConfig(1);
      setCountdown(cfg.memorizeSeconds);
      setMovingTimeLeft(cfg.moveSeconds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeLevel =
    modalPhase === 'placement_playing'
      ? placementProbeLevel
      : isChallengeMode
      ? Math.min(5, challengeWave)
      : selectedLevel;
  const activeCfg = getBinaLevelConfig(activeLevel);

  const clearPendingTimeout = useCallback(() => {
    if (pendingTimeoutRef.current !== null) {
      window.clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearPendingTimeout();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [clearPendingTimeout]);

  const launchArenaForLevel = useCallback(
    (level: number, isPlacementMode: boolean) => {
      clearPendingTimeout();
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      const cfg = getBinaLevelConfig(level);
      const balls = generateArenaBalls(level);
      ballsRef.current = balls;
      setBallsState([...balls]);
      setSelectedBallIds([]);
      setFoundCount(0);
      setIsCorrect(null);
      setPlacementFeedbackText(null);
      setCountdown(isPlacementMode ? 2 : cfg.memorizeSeconds);
      setMovingTimeLeft(isPlacementMode ? cfg.placementMoveSeconds : cfg.moveSeconds);
      setRoundStage('memorize');
    },
    [clearPendingTimeout]
  );

  const startPlacement = useCallback(() => {
    clearPendingTimeout();
    sound.playClick();
    setPlacementRoundIdx(0);
    setPlacementProbeLevel(BINA_PLACEMENT_START_LEVEL);
    setPlacementAttempts([]);
    setPlacementSummary(null);
    setPlacementFeedbackText(null);
    setModalPhase('placement_playing');
    launchArenaForLevel(BINA_PLACEMENT_START_LEVEL, true);
  }, [clearPendingTimeout, launchArenaForLevel]);

  const startChallengeRun = useCallback(() => {
    clearPendingTimeout();
    sound.playClick();
    startedAtMsRef.current = Date.now();
    startedAtIsoRef.current = new Date().toISOString();
    setChallengeWave(1);
    setChallengeClearedRounds(0);
    setChallengeTargetsHit(0);
    setChallengeFinished(null);
    setSelectedLevel(1);
    setModalPhase('playing');
    launchArenaForLevel(1, false);
  }, [clearPendingTimeout, launchArenaForLevel]);

  const startRegularRound = useCallback(
    (level: number) => {
      clearPendingTimeout();
      sound.playClick();
      const clamped = Math.max(1, Math.min(5, Math.round(level)));
      setSelectedLevel(clamped);
      startedAtMsRef.current = Date.now();
      startedAtIsoRef.current = new Date().toISOString();
      setModalPhase('playing');
      launchArenaForLevel(clamped, false);
    },
    [clearPendingTimeout, launchArenaForLevel]
  );

  // Memorize countdown (runs only during placement_playing or playing, paused when tab hidden)
  useEffect(() => {
    if (
      (modalPhase !== 'placement_playing' && modalPhase !== 'playing') ||
      roundStage !== 'memorize'
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(timer);
          setRoundStage('moving');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [modalPhase, roundStage]);

  // Moving physics loop & countdown
  useEffect(() => {
    if (
      (modalPhase !== 'placement_playing' && modalPhase !== 'playing') ||
      roundStage !== 'moving'
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setMovingTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(timer);
          guessStartMsRef.current = Date.now();
          setRoundStage('guess');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    const width = 360;
    const height = 280;
    const SUB_STEPS = 2;
    const minSpeed = activeCfg.minSpeed;
    const maxSpeed = activeCfg.maxSpeed;

    const updatePhysics = () => {
      if (document.hidden) {
        requestRef.current = requestAnimationFrame(updatePhysics);
        return;
      }
      const balls = ballsRef.current;

      for (let step = 0; step < SUB_STEPS; step++) {
        for (let i = 0; i < balls.length; i++) {
          const b = balls[i];
          b.x += b.vx / SUB_STEPS;
          b.y += b.vy / SUB_STEPS;

          if (b.x - b.radius < 5) {
            b.x = 5 + b.radius;
            b.vx = Math.abs(b.vx);
          } else if (b.x + b.radius > width - 5) {
            b.x = width - 5 - b.radius;
            b.vx = -Math.abs(b.vx);
          }

          if (b.y - b.radius < 5) {
            b.y = 5 + b.radius;
            b.vy = Math.abs(b.vy);
          } else if (b.y + b.radius > height - 5) {
            b.y = height - 5 - b.radius;
            b.vy = -Math.abs(b.vy);
          }
        }

        for (let i = 0; i < balls.length; i++) {
          for (let j = i + 1; j < balls.length; j++) {
            const b1 = balls[i];
            const b2 = balls[j];
            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const minDist = b1.radius + b2.radius;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDist * minDist) {
              const dist = Math.sqrt(distSq) || 0.001;
              const nx = dx / dist;
              const ny = dy / dist;

              const overlap = (minDist - dist) * 0.5 + 0.15;
              b1.x -= nx * overlap;
              b1.y -= ny * overlap;
              b2.x += nx * overlap;
              b2.y += ny * overlap;

              b1.x = Math.max(5 + b1.radius, Math.min(width - 5 - b1.radius, b1.x));
              b1.y = Math.max(5 + b1.radius, Math.min(height - 5 - b1.radius, b1.y));
              b2.x = Math.max(5 + b2.radius, Math.min(width - 5 - b2.radius, b2.x));
              b2.y = Math.max(5 + b2.radius, Math.min(height - 5 - b2.radius, b2.y));

              const dvx = b1.vx - b2.vx;
              const dvy = b1.vy - b2.vy;
              const relVelNormal = dvx * nx + dvy * ny;

              if (relVelNormal > 0) {
                b1.vx -= relVelNormal * nx;
                b1.vy -= relVelNormal * ny;
                b2.vx += relVelNormal * nx;
                b2.vy += relVelNormal * ny;

                for (const ball of [b1, b2]) {
                  const spd = Math.hypot(ball.vx, ball.vy);
                  if (spd > 0.001) {
                    const clampedSpd = Math.max(minSpeed, Math.min(maxSpeed, spd));
                    ball.vx = (ball.vx / spd) * clampedSpd;
                    ball.vy = (ball.vy / spd) * clampedSpd;
                  }
                }
              }
            }
          }
        }
      }

      setBallsState([...balls]);
      requestRef.current = requestAnimationFrame(updatePhysics);
    };

    requestRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      window.clearInterval(timer);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [modalPhase, roundStage, activeCfg]);

  const handleBallClick = (ball: Ball) => {
    if (roundStage !== 'guess') return;
    if (selectedBallIds.includes(ball.id)) return;

    sound.playBallTap();
    const nextSelected = [...selectedBallIds, ball.id];
    setSelectedBallIds(nextSelected);

    if (nextSelected.length < activeCfg.targetCount) {
      return;
    }

    // All required targets picked -> evaluate round
    const balls = ballsRef.current;
    const correctHits = nextSelected.filter(
      (id) => balls.find((b) => b.id === id)?.isTarget
    ).length;
    const allHit = correctHits === activeCfg.targetCount;
    setFoundCount(correctHits);
    setIsCorrect(allHit);
    setRoundStage('result');

    if (modalPhase === 'placement_playing') {
      const selectionTimeMs = Math.max(250, Date.now() - guessStartMsRef.current);
      const attempt: BinaPlacementAttempt = {
        level: placementProbeLevel,
        targetCount: activeCfg.targetCount,
        correctTargets: correctHits,
        selectionTimeMs,
      };
      const nextAttempts = [...placementAttempts, attempt];
      const nextProbe = getNextBinaPlacementProbeLevel(
        placementProbeLevel,
        correctHits,
        activeCfg.targetCount,
        selectionTimeMs
      );
      setPlacementAttempts(nextAttempts);

      if (allHit) {
        sound.playCardMatch();
      }

      if (placementRoundIdx + 1 < BINA_PLACEMENT_ROUNDS) {
        const nextCfg = getBinaLevelConfig(nextProbe);
        setPlacementFeedbackText(
          allHit
            ? `آفرین! هر ${toPersianDigits(activeCfg.targetCount)} هدف درست بود · مرحله بعدی: ${nextCfg.title}`
            : correctHits > 0
            ? `${toPersianDigits(correctHits)} از ${toPersianDigits(activeCfg.targetCount)} هدف درست بود · ادامه در ${nextCfg.title}`
            : `توپ هدف جا ماند · تنظیم خودکار در ${nextCfg.title}`
        );

        clearPendingTimeout();
        pendingTimeoutRef.current = window.setTimeout(() => {
          pendingTimeoutRef.current = null;
          setPlacementRoundIdx((r) => r + 1);
          setPlacementProbeLevel(nextProbe);
          launchArenaForLevel(nextProbe, true);
        }, 1150);
      } else {
        setPlacementFeedbackText('در حال محاسبه سطح دیداری شما...');
        clearPendingTimeout();
        pendingTimeoutRef.current = window.setTimeout(() => {
          pendingTimeoutRef.current = null;
          const summary = evaluateBinaPlacement(nextAttempts);
          const saved = saveBinaPlacement(summary);
          setSavedPlacement(saved);
          setPlacementSummary(summary);
          setSelectedLevel(summary.recommendedLevel);
          setModalPhase('placement_result');
          sound.playCoin();
          confetti({ particleCount: 85, spread: 70, origin: { y: 0.6 } });
        }, 900);
      }
      return;
    }

    if (isChallengeMode) {
      const nextTargets = challengeTargetsHit + correctHits;
      setChallengeTargetsHit(nextTargets);

      if (allHit && challengeWave < 5) {
        const nextCleared = challengeClearedRounds + 1;
        const nextWave = challengeWave + 1;
        setChallengeClearedRounds(nextCleared);
        sound.playCardMatch();
        setPlacementFeedbackText(
          `آفرین! مرحله ${toPersianDigits(challengeWave)} رد شد · صعود به سطح ${toPersianDigits(nextWave)}`
        );
        clearPendingTimeout();
        pendingTimeoutRef.current = window.setTimeout(() => {
          pendingTimeoutRef.current = null;
          setChallengeWave(nextWave);
          setSelectedLevel(nextWave);
          launchArenaForLevel(nextWave, false);
        }, 1050);
        return;
      }

      // Challenge run finishes either by conquering all 5 escalating waves OR missing a target
      const finalCleared = allHit ? challengeClearedRounds + 1 : challengeClearedRounds;
      const highestLvl = allHit ? challengeWave : Math.max(0, challengeWave - 1);
      const elapsedSeconds = Math.max(5, Math.round((Date.now() - startedAtMsRef.current) / 1000));
      const score = calculateBinaChallengeScore({
        clearedRounds: finalCleared,
        highestLevelCleared: highestLvl,
        totalTargetsHit: nextTargets,
        elapsedSeconds,
      });
      if (allHit) {
        setChallengeClearedRounds(finalCleared);
        sound.playCoin();
        confetti({ particleCount: 95, spread: 75, origin: { y: 0.6 } });
      } else {
        sound.playClick();
      }
      setChallengeFinished({
        score,
        wonAll: allHit,
        isNewRecord: null,
        bestScore: challengeConfig?.personalBestScore ?? null,
        submitting: true,
      });
      Promise.resolve(
        onChallengeComplete?.({
          score,
          detailLabel:
            finalCleared > 0
              ? `عبور از ${toPersianDigits(finalCleared)} مرحله (تا سطح ${toPersianDigits(highestLvl)})`
              : `${toPersianDigits(nextTargets)} هدف`,
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
      return;
    }

    if (allHit) {
      sound.playCoin();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }
  };

  const handleRestartRegular = () => {
    sound.playClick();
    if (isChallengeMode) {
      startChallengeRun();
      return;
    }
    launchArenaForLevel(selectedLevel, false);
  };

  const handleFinishAndWater = () => {
    if (!isCorrect || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    sound.playWater();
    const completedAtIso = new Date().toISOString();
    const durationSeconds = Math.max(
      10,
      Math.round((Date.now() - startedAtMsRef.current) / 1000)
    );
    onComplete(true, {
      treeId: 'bina_balls',
      completedReadingOrPractice: true,
      answeredCorrectly: true,
      overallSuccess: true,
      accuracyPercent: 100,
      durationSeconds,
      startedAt: startedAtIsoRef.current,
      completedAt: completedAtIso,
    });
  };

  const ballsToRender = ballsState.length > 0 ? ballsState : ballsRef.current;

  return (
    <div
      lang="fa"
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center p-2.5 sm:p-4 bg-[#040e0a]/92 backdrop-blur-md animate-fadeIn overflow-y-auto"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#181733] via-[#101024] to-[#080814] border-2 border-violet-300/45 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-50 flex flex-col justify-between min-h-[520px] max-h-[94dvh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-violet-400/25 pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-violet-400/20 border border-violet-300/50 flex items-center justify-center text-violet-200 shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black text-white">
                  {isChallengeMode
                    ? `رقابت گروهی: ${challengeConfig?.title}`
                    : 'درخت بینا — ردیابی دیداری پویا'}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-400/20 border border-violet-300/45 text-violet-100 font-bold">
                  {isChallengeMode
                    ? `موج ${toPersianDigits(challengeWave)} از ۵ (سختی صعودی)`
                    : '۵ سطح · تعیین سطح هوشمند'}
                </span>
              </div>
              <p className="text-[11px] text-slate-200">
                {isChallengeMode
                  ? `تا ۵ مرحله صعودی: ${activeCfg.title} (${toPersianDigits(activeCfg.targetCount)} هدف از ${toPersianDigits(activeCfg.totalBalls)} توپ)`
                  : modalPhase === 'placement_intro'
                  ? 'سنجش کوتاه تمرکز دیداری برای یافتن سطح مناسب شما'
                  : modalPhase === 'placement_playing'
                  ? `تعیین سطح · مرحله ${toPersianDigits(placementRoundIdx + 1)} از ${toPersianDigits(BINA_PLACEMENT_ROUNDS)} (${activeCfg.title})`
                  : modalPhase === 'placement_result'
                  ? 'نتیجه ارزیابی بینایی دیداری و سطح پیشنهادی آماده است'
                  : modalPhase === 'select_level'
                  ? 'سطح ردیابی توپ‌ها را انتخاب کنید (۱ تا ۵)'
                  : `${activeCfg.title} — ${toPersianDigits(activeCfg.targetCount)} توپ سبز را دنبال کن`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              clearPendingTimeout();
              sound.playClick();
              onClose();
            }}
            aria-label="بستن بازی درخت بینا"
            className="w-8 h-8 rounded-full bg-[#211f45] hover:bg-violet-800 border border-violet-300/35 text-slate-100 flex items-center justify-center text-sm font-bold cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* =========================================================================
            PHASE 0A: INITIAL PLACEMENT INTRO
           ========================================================================= */}
        {modalPhase === 'placement_intro' && (
          <div className="my-5 flex flex-col items-center text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-400/30 to-cyan-400/25 border-2 border-violet-300/60 flex items-center justify-center shadow-lg">
              <Compass className="w-8 h-8 text-violet-200" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-violet-400/20 border border-violet-300/45 text-violet-100 text-[11px] font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>تعیین سطح اولیه درخت بینا</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                سرعت ردیابی چشمی خود را در ۲۵ ثانیه بسنجید!
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                در <strong>{toPersianDigits(BINA_PLACEMENT_ROUNDS)} مرحله کوتاه و تطبیقی</strong>، توپ‌های سبز را میان حرکت توپ‌ها دنبال کنید. سیستم بر اساس{' '}
                <strong>دقت ردیابی و سرعت تشخیص</strong>، تعداد توپ و تک‌هدفه یا دوهدفه بودن بازی (سطح ۱ تا ۵) را برای شما تنظیم می‌کند.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full max-w-md text-[11px]">
              <div className="bg-[#211f45] border border-violet-300/35 rounded-2xl p-2.5">
                <div className="font-black text-amber-300">۳ مرحله کوتاه</div>
                <div className="text-slate-200 mt-0.5">کمتر از ۲۵ ثانیه</div>
              </div>
              <div className="bg-[#211f45] border border-violet-300/35 rounded-2xl p-2.5">
                <div className="font-black text-cyan-300">تک یا دوهدفه</div>
                <div className="text-slate-200 mt-0.5">سطح‌بندی هوشمند</div>
              </div>
              <div className="bg-[#211f45] border border-violet-300/35 rounded-2xl p-2.5">
                <div className="font-black text-emerald-300">۵ سطح تخصصی</div>
                <div className="text-slate-200 mt-0.5">۶ تا ۱۳ توپ</div>
              </div>
            </div>

            <div className="w-full max-w-md flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={startPlacement}
                className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>شروع تعیین سطح بینا ({toPersianDigits(BINA_PLACEMENT_ROUNDS)} مرحله)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setModalPhase('select_level');
                }}
                className="py-2 text-xs font-bold text-slate-200 hover:text-white cursor-pointer"
              >
                فعلاً رد شو و سطح را دستی انتخاب کن
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PHASE 0B: PLACEMENT RESULT
           ========================================================================= */}
        {modalPhase === 'placement_result' && placementSummary && (
          <div className="my-4 space-y-4 animate-fadeIn">
            <div className="rounded-3xl bg-gradient-to-b from-[#211f45] via-[#171533] to-[#0b0a1c] border-2 border-violet-300/50 p-4 sm:p-5 text-center space-y-2.5 shadow-xl">
              <div className="inline-flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/50 text-amber-200 text-xs font-black px-3 py-0.5 rounded-full">
                <Trophy className="w-4 h-4" />
                <span>نتیجه تعیین سطح اولیه درخت بینا</span>
              </div>

              <div className="text-xs font-bold text-emerald-300">
                {placementSummary.skillLabel}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white">
                سطح پیشنهادی شما: {getBinaLevelConfig(placementSummary.recommendedLevel).title}
              </h3>

              <p className="text-xs text-slate-200">
                {getBinaLevelConfig(placementSummary.recommendedLevel).subtitle}
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-[#0b0a1c] border border-violet-300/35 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">دقت ردیابی</div>
                  <div className="text-sm sm:text-base font-black text-emerald-300 mt-0.5">
                    {toPersianDigits(placementSummary.accuracyPercent)}٪
                  </div>
                </div>
                <div className="bg-[#0b0a1c] border border-violet-300/35 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">سرعت تشخیص</div>
                  <div className="text-sm sm:text-base font-black text-cyan-300 mt-0.5">
                    {toPersianDigits(placementSummary.averageSelectionSeconds)} ثانیه
                  </div>
                </div>
                <div className="bg-[#0b0a1c] border border-violet-300/35 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">سطح تعیین‌شده</div>
                  <div className="text-sm sm:text-base font-black text-amber-300 mt-0.5">
                    سطح {toPersianDigits(placementSummary.recommendedLevel)} از ۵
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => startRegularRound(placementSummary.recommendedLevel)}
                className="flex-1 min-h-[46px] py-2.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>شروع بازی در سطح {toPersianDigits(placementSummary.recommendedLevel)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setModalPhase('select_level');
                }}
                className="min-h-[46px] py-2.5 px-4 rounded-2xl bg-[#211f45] hover:bg-violet-800 border border-violet-300/40 text-slate-100 text-xs font-bold cursor-pointer"
              >
                مشاهده همه سطوح
              </button>

              <button
                type="button"
                onClick={startPlacement}
                className="min-h-[46px] py-2.5 px-3.5 rounded-2xl bg-[#0b0a1c] hover:bg-[#211f45] border border-violet-300/35 text-slate-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>آزمون مجدد</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PHASE 1: LEVEL SELECTOR (1 TO 5)
           ========================================================================= */}
        {modalPhase === 'select_level' && (
          <div className="my-4 space-y-3.5 animate-fadeIn">
            <div className="bg-[#211f45] border border-violet-300/35 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    {savedPlacement
                      ? `سطح پیشنهادی شما: سطح ${toPersianDigits(savedPlacement.calibratedLevel)} از ۵`
                      : 'سطح دشواری ردیابی را انتخاب کنید (۱ تا ۵):'}
                  </span>
                </div>
                {savedPlacement && (
                  <p className="text-[11px] text-slate-200">{savedPlacement.skillLabel}</p>
                )}
              </div>

              <button
                type="button"
                onClick={startPlacement}
                className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/50 text-amber-200 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{savedPlacement ? 'تعیین سطح مجدد' : 'آزمون تعیین سطح (۳ مرحله)'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {BINA_LEVEL_CONFIGS.map((cfg) => {
                const isSelected = selectedLevel === cfg.level;
                const isRecommended = savedPlacement?.calibratedLevel === cfg.level;
                return (
                  <div
                    key={cfg.level}
                    onClick={() => startRegularRound(cfg.level)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        startRegularRound(cfg.level);
                      }
                    }}
                    className={`rounded-2xl p-3 border text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#2e2960] to-[#23204a] border-amber-300 shadow-lg'
                        : 'bg-[#211f45] border-violet-300/35 hover:border-violet-200/70'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-white">
                          {cfg.title}
                        </span>
                        {isRecommended && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-300 text-slate-950 font-black">
                            پیشنهادی ★
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-200">{cfg.subtitle}</p>
                    </div>

                    <span className="px-3 py-1.5 rounded-xl bg-[#fbbf24] text-slate-950 font-black text-xs shrink-0">
                      شروع ←
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            PHASE 2: ACTIVE ARENA (PLACEMENT OR REGULAR ROUND)
           ========================================================================= */}
        {(modalPhase === 'placement_playing' || modalPhase === 'playing') && (
          <>
            {modalPhase === 'placement_playing' && (
              <div className="mt-2 flex items-center justify-between gap-2 bg-[#211f45] border border-violet-300/35 rounded-2xl px-3 py-1.5 text-xs">
                <span className="px-2 py-0.5 rounded-lg bg-[#fbbf24] text-slate-950 font-black text-[11px]">
                  {activeCfg.title}
                </span>
                <span className="font-black text-slate-100">
                  مرحله {toPersianDigits(placementRoundIdx + 1)} از {toPersianDigits(BINA_PLACEMENT_ROUNDS)}
                </span>
              </div>
            )}

            {/* Phase instructions Banner */}
            <div className="my-2 text-center">
              {roundStage === 'memorize' && (
                <div className="text-xs font-semibold text-amber-300 bg-amber-500/20 py-1 px-3 rounded-full inline-block border border-amber-400/30 animate-pulse">
                  {activeCfg.targetCount > 1
                    ? `هر ${toPersianDigits(activeCfg.targetCount)} توپ سبز را به خاطر بسپار! (${toPersianDigits(countdown)} ثانیه)`
                    : `توپ سبز را خوب به خاطر بسپار! (${toPersianDigits(countdown)} ثانیه تا شروع حرکت)`}
                </div>
              )}
              {roundStage === 'moving' && (
                <div className="text-xs font-semibold text-cyan-300 bg-cyan-500/20 py-1 px-3 rounded-full inline-block border border-cyan-400/30">
                  با چشم {activeCfg.targetCount > 1 ? 'هر دو توپ هدف را' : 'توپ مورد نظر را'} در کادر تعقیب کن... ({toPersianDigits(movingTimeLeft)} ثانیه)
                </div>
              )}
              {roundStage === 'guess' && (
                <div className="text-xs font-semibold text-emerald-300 bg-emerald-500/20 py-1 px-3 rounded-full inline-block border border-emerald-400/30 animate-bounce">
                  {activeCfg.targetCount > 1
                    ? `توپ‌ها متوقف شدند! ${toPersianDigits(activeCfg.targetCount)} توپ هدف را انتخاب کن (${toPersianDigits(selectedBallIds.length)} از ${toPersianDigits(activeCfg.targetCount)})`
                    : 'توپ‌ها متوقف شدند! روی توپی که سبز بود کلیک کن.'}
                </div>
              )}
              {roundStage === 'result' &&
                (modalPhase === 'placement_playing' || isChallengeMode) &&
                placementFeedbackText && (
                  <div className="text-xs font-bold py-1.5 px-4 rounded-full inline-block border bg-amber-400/20 text-amber-200 border-amber-400/60">
                    {placementFeedbackText}
                  </div>
                )}
              {roundStage === 'result' &&
                modalPhase === 'playing' &&
                !placementFeedbackText && (
                  <div
                    className={`text-xs font-bold py-1.5 px-4 rounded-full inline-block border ${
                      isCorrect
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                        : 'bg-rose-500/30 text-rose-200 border-rose-400'
                    }`}
                  >
                    {isChallengeMode && challengeFinished
                      ? challengeFinished.wonAll
                        ? `🏆 شاهکار! هر ۵ سطح صعودی بینا را با ${toPersianDigits(challengeFinished.score)} امتیاز تمام کردید!`
                        : `پایان رقابت در سطح ${toPersianDigits(challengeWave)} — امتیاز نهایی: ${toPersianDigits(challengeFinished.score)}`
                      : isCorrect
                      ? 'آفرین! ردیابی دیداری و تمرکز شما فوق‌العاده بود.'
                      : activeCfg.targetCount > 1
                      ? `${toPersianDigits(foundCount)} از ${toPersianDigits(activeCfg.targetCount)} توپ هدف درست بود — دوباره تلاش کن!`
                      : 'این بار درست نبود، اما نگران نباشید و دوباره تلاش کنید!'}
                  </div>
                )}
            </div>

            {/* The Arena / Field */}
            <div className="flex-1 flex items-center justify-center my-2">
              <div className="relative w-[360px] h-[280px] bg-[#0b0a1c] rounded-2xl border-2 border-violet-300/40 shadow-inner overflow-hidden select-none">
                <div className="absolute inset-0 bg-[radial-gradient(#a78bfa_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

                {ballsToRender.map((b) => {
                  const isSelected = selectedBallIds.includes(b.id);
                  let ballColor = 'from-slate-100 to-slate-300';
                  let ringClass = '';

                  if (roundStage === 'memorize') {
                    if (b.isTarget) {
                      ballColor = 'from-emerald-400 to-emerald-600';
                      ringClass = 'ring-4 ring-emerald-300 animate-pulse';
                    } else {
                      ballColor = 'from-rose-500 to-rose-700';
                    }
                  } else if (roundStage === 'guess' && isSelected) {
                    ballColor = 'from-amber-300 to-amber-500';
                    ringClass = 'ring-4 ring-amber-300';
                  } else if (roundStage === 'result') {
                    if (b.isTarget) {
                      ballColor = 'from-emerald-400 to-emerald-600';
                      ringClass = isSelected
                        ? 'ring-4 ring-amber-300'
                        : 'ring-4 ring-emerald-300';
                    } else if (isSelected) {
                      ballColor = 'from-rose-500 to-rose-700';
                      ringClass = 'ring-4 ring-rose-400';
                    }
                  }

                  return (
                    <div
                      key={b.id}
                      role={roundStage === 'guess' ? 'button' : undefined}
                      aria-label={b.isTarget ? 'توپ هدف' : 'توپ عادی'}
                      data-target={b.isTarget ? 'true' : 'false'}
                      onClick={() => handleBallClick(b)}
                      className={`absolute rounded-full bg-gradient-to-tr ${ballColor} shadow-md transition-transform flex items-center justify-center cursor-pointer ${ringClass} ${
                        roundStage === 'guess' ? 'hover:scale-125' : ''
                      }`}
                      style={{
                        left: `${b.x - b.radius}px`,
                        top: `${b.y - b.radius}px`,
                        width: `${b.radius * 2}px`,
                        height: `${b.radius * 2}px`,
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-white/70 absolute top-1 left-1.5 pointer-events-none" />
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] text-slate-300 text-center my-1">
              این تمرین یک بازی توجه و ردیابی دیداری است و آزمایش بینایی یا ادعای درمان چشم‌پزشکی محسوب نمی‌شود.
            </p>

            {/* Bottom Actions */}
            {modalPhase === 'placement_playing' ? (
              <div className="border-t border-violet-400/25 pt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearPendingTimeout();
                    sound.playClick();
                    setModalPhase('select_level');
                  }}
                  className="text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>انصراف و انتخاب دستی سطح</span>
                </button>
                <span className="text-[11px] text-slate-300">
                  سنجش ردیابی دیداری ({toPersianDigits(activeCfg.totalBalls)} توپ)
                </span>
              </div>
            ) : isChallengeMode ? (
              <div className="border-t border-violet-400/25 pt-3 space-y-2.5">
                {challengeFinished ? (
                  <>
                    <div className="p-3 rounded-2xl bg-[#211f45] border border-amber-300/60 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-amber-300">
                          امتیاز رقابت: {toPersianDigits(challengeFinished.score)} امتیاز
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
                        onClick={startChallengeRun}
                        className="px-3.5 py-2.5 rounded-xl bg-[#211f45] hover:bg-violet-800 border border-violet-300/40 text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>تلاش مجدد برای رکورد بالاتر</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearPendingTimeout();
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
                  <div className="flex items-center justify-between text-xs text-slate-200">
                    <span>در حال رقابت صعودی · موج {toPersianDigits(challengeWave)} از ۵</span>
                    <span className="font-bold text-amber-300">
                      مراحل ردشده: {toPersianDigits(challengeClearedRounds)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t border-violet-400/25 pt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRestartRegular}
                    className="px-3 py-2 rounded-xl bg-[#211f45] hover:bg-violet-800 border border-violet-300/35 text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>تلاش مجدد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearPendingTimeout();
                      sound.playClick();
                      setModalPhase('select_level');
                    }}
                    className="px-3 py-2 rounded-xl bg-[#0b0a1c] hover:bg-[#211f45] border border-violet-300/35 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>تغییر سطح</span>
                  </button>
                </div>

                {isCorrect && (
                  <button
                    type="button"
                    onClick={handleFinishAndWater}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/80 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>پایان تمرین و آبیاری درخت (+۵ سکه)</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
