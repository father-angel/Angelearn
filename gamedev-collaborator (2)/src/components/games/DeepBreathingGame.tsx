import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../../utils/audio';
import {
  isDeepBreathingComplete,
  BREATHING_LEVEL_CONFIGS,
  getBreathingLevelConfig,
  evaluateBreathingPlacement,
  BreathingPlacementSummary,
} from '../../game/rules';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle,
  Music,
  BellRing,
  RotateCcw,
  Wind,
  Timer,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExerciseCompletionReport } from '../../types/game';

interface DeepBreathingGameProps {
  onComplete: (
    success: boolean,
    report?: Partial<ExerciseCompletionReport>
  ) => void;
  onClose: () => void;
}

export type BreathingModelType = 'climb_slide' | 'box_breathing';
type BreathingPlacementStage = 'none' | 'intro' | 'inhale_prep' | 'exhale_measure' | 'result';

const BREATHING_PLACEMENT_STORAGE_KEY = 'angellearn_breathing_placement_v1';

interface SavedBreathingPlacement {
  calibratedLevel: number;
  exhaleSeconds: number;
  skillLabel: string;
  completedAt: string;
}

function loadSavedBreathingPlacement(): SavedBreathingPlacement | null {
  try {
    const raw = localStorage.getItem(BREATHING_PLACEMENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedBreathingPlacement;
    if (
      typeof parsed?.calibratedLevel === 'number' &&
      parsed.calibratedLevel >= 1 &&
      parsed.calibratedLevel <= 4
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveBreathingPlacement(data: SavedBreathingPlacement): void {
  try {
    localStorage.setItem(BREATHING_PLACEMENT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Shared Botanical & Anatomical Lungs SVG with Trachea, Bronchial Branches,
 * Optional 3-Sip Dashed Tier Lines, and Smooth Liquid/Light Fill.
 */
const SanctuaryLungsGraphic: React.FC<{
  fillLevel: number; // 0..1
  fillColorMode: 'emerald' | 'amber' | 'coral' | 'cyan';
  showSipDashedLines?: boolean;
  sizeClass?: string;
  uid: string;
}> = ({ fillLevel, fillColorMode, showSipDashedLines = false, sizeClass = 'w-28 h-24', uid }) => {
  const clampedFill = Math.min(1, Math.max(0, fillLevel));
  const lungTopY = 44;
  const lungBottomY = 168;
  const lungHeight = lungBottomY - lungTopY;
  const fillTopY = lungBottomY - clampedFill * lungHeight;

  const palette = {
    emerald: {
      top: '#6ee7b7',
      mid: '#10b981',
      bot: '#047857',
      stroke: '#a7f3d0',
      glow: 'rgba(52, 211, 153, 0.35)',
    },
    amber: {
      top: '#fde68a',
      mid: '#f59e0b',
      bot: '#b45309',
      stroke: '#fef3c7',
      glow: 'rgba(251, 191, 36, 0.35)',
    },
    coral: {
      top: '#fdba74',
      mid: '#f97316',
      bot: '#c2410c',
      stroke: '#ffedd5',
      glow: 'rgba(249, 115, 22, 0.32)',
    },
    cyan: {
      top: '#a5f3fc',
      mid: '#06b6d4',
      bot: '#0e7490',
      stroke: '#cffafe',
      glow: 'rgba(34, 211, 238, 0.28)',
    },
  }[fillColorMode];

  const leftLobePath =
    'M 90,46 C 68,46 42,74 36,118 C 31,152 40,168 62,167 C 82,166 93,152 94,132 L 94,62 C 94,50 92,46 90,46 Z';
  const rightLobePath =
    'M 110,46 C 132,46 158,74 164,118 C 169,152 160,168 138,167 C 118,166 107,152 106,132 L 106,62 C 106,50 108,46 110,46 Z';

  // 1/3 and 2/3 dashed tier lines for "Climb in, slide out"
  const tier1Y = lungBottomY - lungHeight * (1 / 3);
  const tier2Y = lungBottomY - lungHeight * (2 / 3);

  return (
    <svg viewBox="0 0 200 182" className={`${sizeClass} overflow-visible select-none shrink-0`}>
      <defs>
        <clipPath id={`${uid}-lungs-clip`}>
          <path d={leftLobePath} />
          <path d={rightLobePath} />
        </clipPath>
        <linearGradient id={`${uid}-lung-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={palette.top} stopOpacity="0.92" />
          <stop offset="50%" stopColor={palette.mid} stopOpacity="0.82" />
          <stop offset="100%" stopColor={palette.bot} stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Soft Bioluminescent Backlight behind Lungs */}
      <ellipse
        cx="100"
        cy="112"
        rx={58 + clampedFill * 14}
        ry={50 + clampedFill * 12}
        fill={palette.glow}
      />

      {/* Base Empty Lung Chambers */}
      <path d={leftLobePath} fill="rgba(4, 34, 48, 0.72)" />
      <path d={rightLobePath} fill="rgba(4, 34, 48, 0.72)" />

      {/* Clipped Rising/Draining Breath Fill Inside Lungs */}
      <g clipPath={`url(#${uid}-lungs-clip)`}>
        <rect
          x="24"
          y={fillTopY}
          width="152"
          height={lungBottomY - fillTopY + 12}
          fill={`url(#${uid}-lung-fill)`}
        />
        {clampedFill > 0.02 && clampedFill < 0.99 && (
          <line
            x1="28"
            y1={fillTopY}
            x2="172"
            y2={fillTopY}
            stroke={palette.stroke}
            strokeWidth="2.2"
            opacity="0.85"
          />
        )}

        {/* 3-Sip Horizontal Dashed Guide Lines (1/3 and 2/3 levels) */}
        {showSipDashedLines && (
          <>
            <line
              x1="30"
              y1={tier2Y}
              x2="170"
              y2={tier2Y}
              stroke="rgba(254, 243, 199, 0.6)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <line
              x1="30"
              y1={tier1Y}
              x2="170"
              y2={tier1Y}
              stroke="rgba(254, 243, 199, 0.6)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          </>
        )}
      </g>

      {/* Trachea (Windpipe) & Cartilage Rings */}
      <path
        d="M 94,14 L 94,64 L 84,78 M 106,14 L 106,64 L 116,78"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[20, 28, 36, 44, 52].map((ry) => (
        <line
          key={ry}
          x1="94.5"
          y1={ry}
          x2="105.5"
          y2={ry}
          stroke="#94a3b8"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ))}

      {/* Detailed Bronchial Tree Branches (Left & Right Lobes) */}
      {!showSipDashedLines && (
        <g
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.82"
        >
          <path d="M 93,68 C 80,78 68,96 58,128" />
          <path d="M 82,78 C 72,74 62,76 54,82" />
          <path d="M 74,92 C 62,92 52,98 46,108" />
          <path d="M 76,98 C 82,110 84,124 80,142" />
          <path d="M 65,112 C 56,118 48,128 45,142" />
          <path d="M 62,122 C 66,134 66,146 62,155" />

          <path d="M 107,68 C 120,78 132,96 142,128" />
          <path d="M 118,78 C 128,74 138,76 146,82" />
          <path d="M 126,92 C 138,92 148,98 154,108" />
          <path d="M 124,98 C 118,110 116,124 120,142" />
          <path d="M 135,112 C 144,118 152,128 155,142" />
          <path d="M 138,122 C 134,134 134,146 138,155" />
        </g>
      )}

      {/* Crisp Outer Lung Lobe Outlines */}
      <path
        d={leftLobePath}
        fill="none"
        stroke={palette.stroke}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d={rightLobePath}
        fill="none"
        stroke={palette.stroke}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const DeepBreathingGame: React.FC<DeepBreathingGameProps> = ({
  onComplete,
  onClose,
}) => {
  const [savedPlacement, setSavedPlacement] = useState<SavedBreathingPlacement | null>(() =>
    loadSavedBreathingPlacement()
  );
  const [placementStage, setPlacementStage] = useState<BreathingPlacementStage>(() =>
    loadSavedBreathingPlacement() ? 'none' : 'intro'
  );
  const [breathingLevel, setBreathingLevel] = useState<number>(
    () => loadSavedBreathingPlacement()?.calibratedLevel ?? 2
  );
  const [exhaleElapsedMs, setExhaleElapsedMs] = useState<number>(0);
  const [placementResult, setPlacementResult] = useState<BreathingPlacementSummary | null>(null);
  const exhaleStartMsRef = useRef<number>(0);

  const levelConfig = getBreathingLevelConfig(breathingLevel);
  const climbSipMs = levelConfig.climbSipMs;
  const climbTotalInhaleMs = climbSipMs * 3;
  const climbExhaleMs = levelConfig.climbExhaleMs;
  const climbCycleMs = climbTotalInhaleMs + climbExhaleMs;
  const boxPhaseMs = levelConfig.boxPhaseMs;
  const boxCycleMs = boxPhaseMs * 4;

  const [model, setModel] = useState<BreathingModelType>('climb_slide');
  // Wait for user to press Start button before beginning the breathing cycle
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [cyclesCount, setCyclesCount] = useState<number>(0);
  const [dailyRewardUnlocked, setDailyRewardUnlocked] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());

  const [cycleElapsedMs, setCycleElapsedMs] = useState<number>(0);

  const elapsedMsRef = useRef<number>(0);
  const totalElapsedMsRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastTotalSecondsRef = useRef<number>(0);
  const rewardUnlockedRef = useRef<boolean>(false);
  const lastTriggeredAudioKeyRef = useRef<string>('');
  const startedAtIsoRef = useRef<string>(new Date().toISOString());
  const isSubmittingRef = useRef<boolean>(false);

  // Live timer during exhale measurement placement stage
  useEffect(() => {
    if (placementStage !== 'exhale_measure') return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setExhaleElapsedMs(Date.now() - exhaleStartMsRef.current);
    }, 80);
    return () => clearInterval(id);
  }, [placementStage]);

  const handleStartPlacement = async () => {
    await sound.ensureAudio();
    sound.playClick();
    setIsActive(false);
    setHasStarted(false);
    sound.stopBreathingMusic();
    setExhaleElapsedMs(0);
    setPlacementResult(null);
    setPlacementStage('inhale_prep');
  };

  const handleBeginExhaleMeasure = () => {
    sound.playExhaleCue();
    exhaleStartMsRef.current = Date.now();
    setExhaleElapsedMs(0);
    setPlacementStage('exhale_measure');
  };

  const handleFinishExhaleMeasure = () => {
    const durationMs = Math.max(200, Date.now() - exhaleStartMsRef.current);
    sound.playCardMatch();
    const summary = evaluateBreathingPlacement(durationMs);
    setPlacementResult(summary);
    setBreathingLevel(summary.recommendedLevel);
    const saved: SavedBreathingPlacement = {
      calibratedLevel: summary.recommendedLevel,
      exhaleSeconds: summary.exhaleSeconds,
      skillLabel: summary.skillLabel,
      completedAt: new Date().toISOString(),
    };
    saveBreathingPlacement(saved);
    setSavedPlacement(saved);
    setPlacementStage('result');
  };

  const handleApplyPlacementAndPlay = () => {
    sound.playClick();
    if (placementResult) {
      setBreathingLevel(placementResult.recommendedLevel);
    }
    elapsedMsRef.current = 0;
    lastTriggeredAudioKeyRef.current = '';
    setCycleElapsedMs(0);
    setCyclesCount(0);
    setPlacementStage('none');
  };

  const handleBypassPlacement = () => {
    sound.playClick();
    setBreathingLevel(2);
    setPlacementStage('none');
  };

  const handleSelectBreathingLevel = (lvl: number) => {
    sound.playClick();
    setBreathingLevel(lvl);
    elapsedMsRef.current = 0;
    lastTriggeredAudioKeyRef.current = '';
    setCycleElapsedMs(0);
  };

  // Clean up breathing music on unmount
  useEffect(() => {
    return () => {
      sound.stopBreathingMusic();
    };
  }, []);

  // Start or Resume breathing session when user clicks the Start button
  const handleStartBreathing = async () => {
    await sound.ensureAudio();
    sound.playClick();
    if (!hasStarted) {
      elapsedMsRef.current = 0;
      lastTriggeredAudioKeyRef.current = '';
      setCycleElapsedMs(0);
      setHasStarted(true);
    }
    await sound.startBreathingMusic();
    setIsActive(true);
  };

  const handleTogglePause = async () => {
    if (!hasStarted) {
      await handleStartBreathing();
      return;
    }
    sound.playClick();
    if (isActive) {
      setIsActive(false);
      sound.stopBreathingMusic();
    } else {
      await sound.ensureAudio();
      await sound.startBreathingMusic();
      lastTriggeredAudioKeyRef.current = '';
      setIsActive(true);
    }
  };

  const handleResetCycle = () => {
    sound.playClick();
    elapsedMsRef.current = 0;
    lastTriggeredAudioKeyRef.current = '';
    setCycleElapsedMs(0);
    setCyclesCount(0);
  };

  // Switch between the 2 models
  const handleSelectModel = (nextModel: BreathingModelType) => {
    sound.playClick();
    elapsedMsRef.current = 0;
    lastTriggeredAudioKeyRef.current = '';
    setCycleElapsedMs(0);
    setModel(nextModel);
  };

  // Continuous 60fps requestAnimationFrame loop driving both visual models and exact audio sync
  useEffect(() => {
    if (!isActive || !hasStarted || placementStage !== 'none') {
      lastFrameTimeRef.current = null;
      return;
    }

    let rafId: number;

    const animate = (now: number) => {
      if (document.hidden) {
        lastFrameTimeRef.current = now;
        rafId = requestAnimationFrame(animate);
        return;
      }
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = now;
      }
      const dt = Math.min(100, Math.max(0, now - lastFrameTimeRef.current));
      lastFrameTimeRef.current = now;

      elapsedMsRef.current += dt;
      totalElapsedMsRef.current += dt;

      const cycleDuration = model === 'climb_slide' ? climbCycleMs : boxCycleMs;
      const inCycleMs = elapsedMsRef.current % cycleDuration;
      const currentCycleIdx = Math.floor(elapsedMsRef.current / cycleDuration);

      setCycleElapsedMs(inCycleMs);
      setCyclesCount(currentCycleIdx);

      // Trigger exact breath-synchronized audio cues at phase boundaries
      if (model === 'climb_slide') {
        let subStage: 'sip1' | 'sip2' | 'sip3' | 'slide';
        if (inCycleMs < climbSipMs) subStage = 'sip1';
        else if (inCycleMs < climbSipMs * 2) subStage = 'sip2';
        else if (inCycleMs < climbTotalInhaleMs) subStage = 'sip3';
        else subStage = 'slide';

        const audioKey = `climb-${breathingLevel}-${currentCycleIdx}-${subStage}`;
        if (audioKey !== lastTriggeredAudioKeyRef.current) {
          lastTriggeredAudioKeyRef.current = audioKey;
          const sipDurSec = (climbSipMs - 100) / 1000;
          const slideDurSec = (climbExhaleMs - 100) / 1000;
          if (subStage === 'sip1') {
            sound.updateBreathingPhase('inhale');
            sound.playClimbSip(1, sipDurSec);
          } else if (subStage === 'sip2') {
            sound.playClimbSip(2, sipDurSec);
          } else if (subStage === 'sip3') {
            sound.playClimbSip(3, sipDurSec);
          } else {
            sound.updateBreathingPhase('exhale');
            sound.playClimbSlideOut(slideDurSec);
          }
        }
      } else {
        // Box breathing audio sync matching calibrated boxPhaseMs
        let boxStage: 'inhale' | 'hold_in' | 'exhale' | 'hold_out';
        if (inCycleMs < boxPhaseMs) boxStage = 'inhale';
        else if (inCycleMs < boxPhaseMs * 2) boxStage = 'hold_in';
        else if (inCycleMs < boxPhaseMs * 3) boxStage = 'exhale';
        else boxStage = 'hold_out';

        const audioKey = `box-${breathingLevel}-${currentCycleIdx}-${boxStage}`;
        if (audioKey !== lastTriggeredAudioKeyRef.current) {
          lastTriggeredAudioKeyRef.current = audioKey;
          sound.playBoxPhaseAudio(boxStage, Math.max(1.5, boxPhaseMs / 1000 - 0.05));
        }
      }

      // Total seconds & 10-second daily reward check
      const nextTotalSec = Math.floor(totalElapsedMsRef.current / 1000);
      if (nextTotalSec !== lastTotalSecondsRef.current) {
        lastTotalSecondsRef.current = nextTotalSec;
        setTotalSeconds(nextTotalSec);

        if (isDeepBreathingComplete(nextTotalSec) && !rewardUnlockedRef.current) {
          rewardUnlockedRef.current = true;
          setDailyRewardUnlocked(true);
          sound.playCoin();
          confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [
    isActive,
    hasStarted,
    model,
    placementStage,
    breathingLevel,
    climbCycleMs,
    climbSipMs,
    climbTotalInhaleMs,
    climbExhaleMs,
    boxCycleMs,
    boxPhaseMs,
  ]);

  const handleToggleSound = async () => {
    await sound.ensureAudio();
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted && isActive) {
      sound.startBreathingMusic();
    }
  };

  const handleManualPlayAudio = async () => {
    await sound.ensureAudio();
    if (isMuted) {
      sound.setMuted(false);
      setIsMuted(false);
    }
    if (!hasStarted || !isActive) {
      setHasStarted(true);
      setIsActive(true);
    }
    await sound.startBreathingMusic();
    lastTriggeredAudioKeyRef.current = '';
  };

  const handleTestChime = async () => {
    await sound.ensureAudio();
    if (isMuted) {
      sound.setMuted(false);
      setIsMuted(false);
    }
    sound.playTestChime();
  };

  const handleFinishSession = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    sound.stopBreathingMusic();
    sound.playWater();
    onComplete(dailyRewardUnlocked, {
      treeId: 'deep_breathing',
      completedReadingOrPractice: dailyRewardUnlocked,
      answeredCorrectly: dailyRewardUnlocked,
      overallSuccess: dailyRewardUnlocked,
      accuracyPercent: dailyRewardUnlocked ? 100 : 0,
      durationSeconds: Math.max(10, totalSeconds),
      startedAt: startedAtIsoRef.current,
      completedAt: new Date().toISOString(),
    });
  };

  const handleClose = () => {
    sound.stopBreathingMusic();
    sound.playClick();
    onClose();
  };

  // ============================================================================
  // MODEL 1 COMPUTATIONS: "Climb in, slide out" (3 sips in + smooth slide out)
  // ============================================================================
  const renderClimbSlideModel = () => {
    const t = cycleElapsedMs; // 0..climbCycleMs
    const isSipPhase = t < climbTotalInhaleMs;

    // Smooth stepped climb function for the 3 sips
    let climbLevel = 0;
    let activeSipNum = 1;
    const climbRampMs = climbSipMs * 0.75;

    if (t < climbSipMs) {
      activeSipNum = 1;
      const p = Math.min(1, t / climbRampMs);
      climbLevel = (0.5 - 0.5 * Math.cos(Math.PI * p)) * (1 / 3);
    } else if (t < climbSipMs * 2) {
      activeSipNum = 2;
      const p = Math.min(1, (t - climbSipMs) / climbRampMs);
      climbLevel = 1 / 3 + (0.5 - 0.5 * Math.cos(Math.PI * p)) * (1 / 3);
    } else if (t < climbTotalInhaleMs) {
      activeSipNum = 3;
      const p = Math.min(1, (t - climbSipMs * 2) / climbRampMs);
      climbLevel = 2 / 3 + (0.5 - 0.5 * Math.cos(Math.PI * p)) * (1 / 3);
    } else {
      const slideP = Math.min(1, Math.max(0, (t - climbTotalInhaleMs) / climbExhaleMs));
      climbLevel = 1 - slideP;
    }

    const cycleWidth = 300;
    const scrollX = (t / climbCycleMs) * cycleWidth;
    const baseY = 92;
    const peakY = 22;
    const stepH = (baseY - peakY) / 3;

    const sW = 47;
    const rampX = sW * 0.75;

    const getCycleTerrainPoints = (offsetX: number) => [
      { x: offsetX + 0, y: baseY },
      { x: offsetX + rampX, y: baseY - stepH },
      { x: offsetX + sW, y: baseY - stepH },
      { x: offsetX + sW + rampX, y: baseY - stepH * 2 },
      { x: offsetX + sW * 2, y: baseY - stepH * 2 },
      { x: offsetX + sW * 2 + rampX, y: peakY },
      { x: offsetX + sW * 3, y: peakY },
      { x: offsetX + cycleWidth, y: baseY },
    ];

    const allPoints = [
      ...getCycleTerrainPoints(-cycleWidth),
      ...getCycleTerrainPoints(0),
      ...getCycleTerrainPoints(cycleWidth),
    ];

    const polylineStr = allPoints
      .map((pt) => `${(150 + pt.x - scrollX).toFixed(1)},${pt.y.toFixed(1)}`)
      .join(' ');

    const areaPolygonStr = `${(150 - cycleWidth - scrollX).toFixed(1)},110 ${polylineStr} ${(
      150 +
      cycleWidth * 2 -
      scrollX
    ).toFixed(1)},110`;

    const orbY = baseY - climbLevel * (baseY - peakY);

    // Remaining seconds in current step or slide
    const stepRemainingSec = isSipPhase
      ? Math.max(1, Math.ceil((activeSipNum * climbSipMs - t) / 1000))
      : Math.max(1, Math.ceil((climbCycleMs - t) / 1000));

    const sipSecLabel = (climbSipMs / 1000).toFixed(1);
    const exhaleSecLabel = (climbExhaleMs / 1000).toFixed(1);

    return (
      <div className="w-full flex flex-col items-center">
        {/* Subtitle Header */}
        <div className="text-center mb-1">
          <div className="text-xs sm:text-sm font-black text-amber-200">
            دم پله‌ای ۳ سطحی و بازدم سرسره‌ای آرام ({levelConfig.shortLabel})
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-200 font-medium">
            ۳ دم آرام پله‌ای (هر پله {sipSecLabel} ثانیه) • بازدم طولانی و نرم ({exhaleSecLabel} ثانیه)
          </div>
        </div>

        {/* TOP VISUAL: Scrolling 3-Step Climb & Long Slide Terrain */}
        <div className="w-full bg-[#061521] border border-cyan-300/35 rounded-xl p-1.5 sm:p-2 shadow-inner overflow-hidden">
          <svg viewBox="0 0 300 108" className="w-full h-18 sm:h-22 overflow-hidden select-none">
            <defs>
              <linearGradient id="climbAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop
                  offset="0%"
                  stopColor={isSipPhase ? '#34d399' : '#f59e0b'}
                  stopOpacity="0.32"
                />
                <stop
                  offset="100%"
                  stopColor={isSipPhase ? '#065f46' : '#78350f'}
                  stopOpacity="0.03"
                />
              </linearGradient>
              <clipPath id="passedTrailClip">
                <rect x="0" y="0" width="150" height="108" />
              </clipPath>
              <clipPath id="futureTrailClip">
                <rect x="150" y="0" width="150" height="108" />
              </clipPath>
            </defs>

            <polygon points={areaPolygonStr} fill="url(#climbAreaGrad)" />

            <polyline
              points={polylineStr}
              fill="none"
              stroke="rgba(148, 163, 184, 0.45)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              clipPath="url(#futureTrailClip)"
            />

            <polyline
              points={polylineStr}
              fill="none"
              stroke={isSipPhase ? '#34d399' : '#fb923c'}
              strokeWidth="3.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath="url(#passedTrailClip)"
            />

            {[-cycleWidth, 0, cycleWidth].map((offset) => {
              const baseX = 150 + offset - scrollX;
              return (
                <g key={offset} className="text-[8.5px] font-bold">
                  <text
                    x={baseX + 22}
                    y={baseY - stepH - 6}
                    fill="#6ee7b7"
                    textAnchor="middle"
                  >
                    دم ۱
                  </text>
                  <text
                    x={baseX + 69}
                    y={baseY - stepH * 2 - 6}
                    fill="#6ee7b7"
                    textAnchor="middle"
                  >
                    دم ۲
                  </text>
                  <text
                    x={baseX + 116}
                    y={peakY - 6}
                    fill="#fde047"
                    textAnchor="middle"
                  >
                    دم ۳
                  </text>
                  <text
                    x={baseX + 220}
                    y={peakY + 32}
                    fill="#fdba74"
                    textAnchor="middle"
                    transform={`rotate(23 ${baseX + 220} ${peakY + 32})`}
                  >
                    بازدم سرسره‌ای آرام
                  </text>
                </g>
              );
            })}

            <circle
              cx="150"
              cy={orbY}
              r="11"
              fill={isSipPhase ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 146, 60, 0.3)'}
            />
            <circle
              cx="150"
              cy={orbY}
              r="6"
              fill={isSipPhase ? '#10b981' : '#f97316'}
              stroke="#ffffff"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* BOTTOM VISUAL: Compact Side-by-Side 3-Tier Lungs + Step Badges & Live Instruction */}
        <div className="w-full mt-1.5 flex items-center justify-center gap-3 sm:gap-4 bg-[#112d42] border border-cyan-300/35 rounded-2xl px-3 py-1.5">
          <SanctuaryLungsGraphic
            fillLevel={climbLevel}
            fillColorMode={isSipPhase ? 'emerald' : 'coral'}
            showSipDashedLines={true}
            sizeClass="w-24 h-22 sm:w-28 sm:h-24"
            uid="climb"
          />

          <div className="flex flex-col items-start text-right flex-1 min-w-0">
            {/* Step Indicators (1 - 2 - 3) */}
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {[1, 2, 3].map((stepNum) => {
                const reached = isSipPhase ? activeSipNum >= stepNum : true;
                return (
                  <span
                    key={stepNum}
                    className={`px-2 py-0.5 rounded-full text-[9.5px] font-black border transition-all ${
                      hasStarted && isSipPhase && activeSipNum === stepNum
                        ? 'bg-emerald-300 text-slate-950 border-white scale-105 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
                        : hasStarted && reached
                        ? 'bg-emerald-900/90 text-emerald-100 border-emerald-400/60'
                        : 'bg-slate-800/90 text-slate-200 border-slate-500/60'
                    }`}
                  >
                    پله {stepNum}
                  </span>
                );
              })}
            </div>

            <div
              className={`text-sm sm:text-base font-black leading-snug ${
                !hasStarted
                  ? 'text-cyan-200'
                  : isSipPhase
                  ? 'text-emerald-300'
                  : 'text-amber-300'
              }`}
            >
              {!hasStarted
                ? 'آماده شروع تمرین ۳ سطحی'
                : isSipPhase
                ? `دَم پله‌ای ${activeSipNum} از ۳ (${stepRemainingSec}s)`
                : `بازدم سرسره‌ای آرام (${stepRemainingSec}s)`}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-200 font-medium leading-relaxed">
              {!hasStarted
                ? 'برای آغاز تمرین و پخش موسیقی هماهنگ، دکمه «شروع تمرین تنفس» را بزنید.'
                : isSipPhase
                ? 'با آرامش یک‌سوم دیگر از ریه را از راه بینی پُر کنید'
                : 'نفس را بسیار نرم، پیوسته و طولانی از دهان خارج کنید'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MODEL 2 COMPUTATIONS: "Box Breathing N · N · N · N"
  // ============================================================================
  const renderBoxBreathingModel = () => {
    const t = cycleElapsedMs; // 0..boxCycleMs
    const phaseSec = Math.round(boxPhaseMs / 1000);
    const phaseIndex = Math.min(3, Math.floor(t / boxPhaseMs));
    const msInPhase = t - phaseIndex * boxPhaseMs;
    const phaseProgress = Math.min(1, Math.max(0, msInPhase / boxPhaseMs));
    const countdownSec = Math.max(1, phaseSec - Math.floor(msInPhase / 1000));

    let lungFill = 0;
    let colorMode: 'emerald' | 'amber' | 'coral' | 'cyan' = 'emerald';
    let phaseTitle = '';
    let phaseSubtitle = '';
    let phaseColorClass = '';

    if (phaseIndex === 0) {
      lungFill = phaseProgress;
      colorMode = 'emerald';
      phaseTitle = 'دَم (Inhale)';
      phaseSubtitle = 'به‌آرامی از راه بینی ریه‌ها را پر کنید';
      phaseColorClass = 'text-emerald-300';
    } else if (phaseIndex === 1) {
      lungFill = 1;
      colorMode = 'amber';
      phaseTitle = 'نگهداری دَم (Hold in)';
      phaseSubtitle = 'نفس را به نرمی با ریه پُر نگه دارید';
      phaseColorClass = 'text-amber-300';
    } else if (phaseIndex === 2) {
      lungFill = 1 - phaseProgress;
      colorMode = 'coral';
      phaseTitle = 'بازدم (Exhale)';
      phaseSubtitle = 'به‌آرامی و یکنواخت نفس را خارج کنید';
      phaseColorClass = 'text-orange-300';
    } else {
      lungFill = 0;
      colorMode = 'cyan';
      phaseTitle = 'مکث بازدم (Hold out)';
      phaseSubtitle = 'در آرامش با ریه خالی استراحت کنید';
      phaseColorClass = 'text-cyan-300';
    }

    const bMin = 42;
    const bMax = 218;
    const bLen = bMax - bMin; // 176

    let orbX = bMin;
    let orbY = bMax;
    let orbColor = '#10b981';

    if (phaseIndex === 0) {
      orbX = bMin;
      orbY = bMax - phaseProgress * bLen;
      orbColor = '#34d399';
    } else if (phaseIndex === 1) {
      orbX = bMin + phaseProgress * bLen;
      orbY = bMin;
      orbColor = '#fbbf24';
    } else if (phaseIndex === 2) {
      orbX = bMax;
      orbY = bMin + phaseProgress * bLen;
      orbColor = '#fb923c';
    } else {
      orbX = bMax - phaseProgress * bLen;
      orbY = bMax;
      orbColor = '#38bdf8';
    }

    return (
      <div className="w-full flex flex-col items-center">
        <div className="text-center mb-0.5">
          <div className="text-xs sm:text-sm font-black text-emerald-200">
            تنفس مربعی ({phaseSec} · {phaseSec} · {phaseSec} · {phaseSec})
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-200 font-medium">
            {phaseSec} ثانیه دم • {phaseSec} ثانیه نگهداری • {phaseSec} ثانیه بازدم • {phaseSec} ثانیه مکث
          </div>
        </div>

        {/* Compact Square Track so top and bottom modal buttons remain 100% visible */}
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
          <svg viewBox="0 0 260 260" className="w-full h-full overflow-visible select-none">
            <line
              x1={bMin}
              y1={bMax}
              x2={bMin}
              y2={bMin}
              stroke="rgba(52, 211, 153, 0.28)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1={bMin}
              y1={bMin}
              x2={bMax}
              y2={bMin}
              stroke="rgba(251, 191, 36, 0.28)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1={bMax}
              y1={bMin}
              x2={bMax}
              y2={bMax}
              stroke="rgba(251, 146, 60, 0.28)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1={bMax}
              y1={bMax}
              x2={bMin}
              y2={bMax}
              stroke="rgba(56, 189, 248, 0.28)"
              strokeWidth="5"
              strokeLinecap="round"
            />

            <line
              x1={bMin}
              y1={bMax}
              x2={bMin}
              y2={phaseIndex === 0 ? orbY : bMin}
              stroke="#34d399"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            {phaseIndex >= 1 && (
              <line
                x1={bMin}
                y1={bMin}
                x2={phaseIndex === 1 ? orbX : bMax}
                y2={bMin}
                stroke="#fbbf24"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
            )}
            {phaseIndex >= 2 && (
              <line
                x1={bMax}
                y1={bMin}
                x2={bMax}
                y2={phaseIndex === 2 ? orbY : bMax}
                stroke="#fb923c"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
            )}
            {phaseIndex >= 3 && (
              <line
                x1={bMax}
                y1={bMax}
                x2={orbX}
                y2={bMax}
                stroke="#38bdf8"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
            )}

            {[
              { x: bMin, y: bMin, c: '#34d399' },
              { x: bMax, y: bMin, c: '#fbbf24' },
              { x: bMax, y: bMax, c: '#fb923c' },
              { x: bMin, y: bMax, c: '#38bdf8' },
            ].map((node, i) => (
              <circle
                key={i}
                cx={node.x}
                cy={node.y}
                r="5.5"
                fill="#041d2d"
                stroke={node.c}
                strokeWidth="2.5"
              />
            ))}

            <text
              x="130"
              y="26"
              fill={phaseIndex === 1 ? '#fde047' : '#cbd5e1'}
              fontSize="11.5"
              fontWeight="800"
              textAnchor="middle"
            >
              نگهداری پُر • {phaseSec}
            </text>
            <text
              x="130"
              y="245"
              fill={phaseIndex === 3 ? '#7dd3fc' : '#cbd5e1'}
              fontSize="11.5"
              fontWeight="800"
              textAnchor="middle"
            >
              مکث خالی • {phaseSec}
            </text>
            <text
              x="20"
              y="130"
              fill={phaseIndex === 0 ? '#6ee7b7' : '#cbd5e1'}
              fontSize="11.5"
              fontWeight="800"
              textAnchor="middle"
              transform="rotate(-90 20 130)"
            >
              دَم • {phaseSec}
            </text>
            <text
              x="240"
              y="130"
              fill={phaseIndex === 2 ? '#fdba74' : '#cbd5e1'}
              fontSize="11.5"
              fontWeight="800"
              textAnchor="middle"
              transform="rotate(90 240 130)"
            >
              بازدم • {phaseSec}
            </text>

            <circle cx={orbX} cy={orbY} r="14" fill={orbColor} opacity="0.28" />
            <circle
              cx={orbX}
              cy={orbY}
              r="7.5"
              fill="#ffffff"
              stroke={orbColor}
              strokeWidth="3.2"
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <SanctuaryLungsGraphic
              fillLevel={lungFill}
              fillColorMode={colorMode}
              showSipDashedLines={false}
              sizeClass="w-26 h-24 sm:w-28 sm:h-26"
              uid="box"
            />
          </div>
        </div>

        <div className="text-center -mt-1">
          <div className="flex items-center justify-center gap-2">
            <span className={`text-sm sm:text-base font-black ${phaseColorClass}`}>
              {!hasStarted ? 'آماده شروع تنفس مربعی' : phaseTitle}
            </span>
            {hasStarted && (
              <span
                className={`w-6 h-6 rounded-full bg-slate-900/90 border border-cyan-500/40 flex items-center justify-center text-xs font-black font-mono ${phaseColorClass}`}
              >
                {countdownSec}
              </span>
            )}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-200 font-medium">
            {!hasStarted
              ? 'برای آغاز تمرین و پخش موسیقی هماهنگ، دکمه «شروع تمرین تنفس» را بزنید.'
              : phaseSubtitle}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-[#040e0a]/92 backdrop-blur-2xl animate-fadeIn select-none"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      <div className="relative w-full max-w-md max-h-[94dvh] sm:max-h-[92vh] bg-gradient-to-b from-[#0c2233] via-[#081724] to-[#050f18] border border-cyan-300/40 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-[0_0_60px_rgba(20,184,166,0.22)] text-slate-50 flex flex-col justify-between overflow-hidden">
        {/* 1. Top Header (Pinned & Compact) */}
        <div className="relative z-10 shrink-0 flex items-center justify-between border-b border-cyan-300/25 pb-2">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5">
              <span className="text-xl">🌬️</span>
              <span>درخت تنفس عمیق</span>
            </h2>
            <p className="text-[10px] text-slate-200 font-medium">
              هماهنگی کامل تصویر و موسیقی با ریتم تنفس شما
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleSound}
              aria-label={isMuted ? 'روشن کردن صدا' : 'قطع صدا'}
              className="px-2.5 py-1 rounded-full bg-[#112d42] border border-cyan-300/40 flex items-center gap-1 text-xs text-slate-100 hover:text-white hover:bg-cyan-900 transition-all cursor-pointer"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-300" />
                  <span className="text-[10px] text-rose-200 font-bold">بی‌صدا</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-teal-300 animate-pulse" />
                  <span className="text-[10px] text-cyan-100 font-bold">صدا روشن</span>
                </>
              )}
            </button>
            <button
              onClick={handleClose}
              aria-label="بستن صفحه تنفس عمیق"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#112d42] hover:bg-rose-950/90 border border-cyan-300/40 hover:border-rose-400 flex items-center justify-center text-xs font-bold text-slate-100 hover:text-rose-200 transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. Placement Test Screens OR Main Breathing Practice Stage */}
        {placementStage !== 'none' ? (
          <div className="relative z-10 flex-1 min-h-0 overflow-y-auto flex flex-col justify-between py-2 space-y-3 animate-fadeIn">
            {placementStage === 'intro' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 px-2">
                <div className="w-16 h-16 rounded-2xl bg-cyan-400/20 border-2 border-cyan-300/60 flex items-center justify-center shadow-lg">
                  <Wind className="w-8 h-8 text-cyan-200" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  تعیین سطح اولیه درخت تنفس عمیق
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-sm">
                  برای اینکه ریتم تنفس (دم پله‌ای و مربعی) دقیقاً متناسب با ظرفیت ریه و آرامش شما باشد، یک آزمون کوتاه «کنترل بازدم آرام» انجام می‌دهیم.
                </p>

                <div className="w-full bg-[#112d42] border border-cyan-300/35 rounded-2xl p-3 text-right text-[11px] text-slate-100 space-y-1.5">
                  <div className="font-black text-amber-300">نحوه انجام آزمون (بدون حبس نفس و بدون فشار):</div>
                  <div>۱. یک دَم آرام و عمیق از راه بینی می‌کشید.</div>
                  <div>۲. سپس با فشردن دکمه «شروع بازدم»، نفس را بسیار نرم و باریک بیرون می‌دهید.</div>
                  <div>۳. به محض اتمام بازدم راحت، دکمه توقف را می‌زنید تا سطح مناسب (۱ تا ۴) تنظیم شود.</div>
                </div>

                <div className="w-full space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleStartPlacement}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 hover:from-emerald-200 hover:to-cyan-200 text-slate-950 font-black text-xs sm:text-sm shadow-lg cursor-pointer transition-transform hover:scale-[1.01]"
                  >
                    شروع آزمون ظرفیت تنفس (اندازه‌گیری بازدم)
                  </button>
                  <button
                    type="button"
                    onClick={handleBypassPlacement}
                    className="w-full py-2 text-[11px] text-slate-200 hover:text-white cursor-pointer"
                  >
                    فعلاً رد شو و با سطح استاندارد (مربعی ۴×۴) تمرین کن
                  </button>
                </div>
              </div>
            )}

            {placementStage === 'inhale_prep' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 px-2">
                <span className="px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/50 text-emerald-100 text-xs font-black">
                  گام ۱ از ۲ · آماده‌سازی دَم
                </span>

                <SanctuaryLungsGraphic
                  fillLevel={1}
                  fillColorMode="emerald"
                  sizeClass="w-32 h-28"
                  uid="placement-prep"
                />

                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-black text-emerald-300">
                    یک دَم عمیق و راحت از بینی بکشید
                  </h3>
                  <p className="text-xs text-slate-200 max-w-sm leading-relaxed">
                    شانه‌ها را آزاد بگذارید؛ به محض اینکه ریه‌هایتان به‌راحتی پر شد، دکمه زیر را بزنید و بازدم آرام و پیوسته را آغاز کنید.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleBeginExhaleMeasure}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-sm shadow-xl cursor-pointer transition-transform hover:scale-[1.01]"
                >
                  ریه پُر شد — شروع بازدم آرام ←
                </button>
              </div>
            )}

            {placementStage === 'exhale_measure' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 px-2">
                <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/50 text-amber-100 text-xs font-black flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  <span>گام ۲ از ۲ · سنجش کنترل بازدم</span>
                </span>

                <SanctuaryLungsGraphic
                  fillLevel={Math.max(0.08, 1 - Math.min(1, exhaleElapsedMs / 24000))}
                  fillColorMode="coral"
                  sizeClass="w-28 h-24"
                  uid="placement-exhale"
                />

                <div className="text-3xl font-black font-mono text-amber-300">
                  {(exhaleElapsedMs / 1000).toFixed(1)}{' '}
                  <span className="text-sm font-sans text-slate-200">ثانیه</span>
                </div>

                <p className="text-xs text-slate-200 max-w-sm leading-relaxed">
                  نفس را بسیار آرام و یکنواخت بیرون بدهید. به‌محض اتمام بازدم راحت (قبل از احساس فشار)، دکمه پایان را بزنید:
                </p>

                <button
                  type="button"
                  onClick={handleFinishExhaleMeasure}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-300 to-emerald-300 hover:from-cyan-200 hover:to-emerald-200 text-slate-950 font-black text-sm shadow-xl cursor-pointer"
                >
                  پایان بازدم آرام (ثبت زمان و تعیین سطح)
                </button>
              </div>
            )}

            {placementStage === 'result' && placementResult && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 px-2">
                <div className="w-14 h-14 rounded-full bg-emerald-400/20 border-2 border-emerald-300 flex items-center justify-center text-2xl">
                  🌬️
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  نتیجه تعیین سطح اولیه درخت تنفس عمیق
                </h3>

                <div className="w-full bg-[#112d42] border border-cyan-300/40 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs border-b border-cyan-300/25 pb-2">
                    <span className="text-slate-200">مدت بازدم پیوسته:</span>
                    <strong className="text-amber-300 text-sm font-mono">
                      {placementResult.exhaleSeconds} ثانیه
                    </strong>
                  </div>
                  <div className="text-sm font-black text-emerald-300">
                    {getBreathingLevelConfig(placementResult.recommendedLevel).title}
                  </div>
                  <div className="text-xs font-bold text-amber-200">
                    {placementResult.skillLabel}
                  </div>
                  <div className="text-[11px] text-slate-200 leading-relaxed">
                    {placementResult.description}
                  </div>
                  {placementResult.rushedWarning && (
                    <div className="text-[10px] text-amber-200 bg-amber-500/20 border border-amber-300/45 rounded-lg px-2 py-1">
                      زمان ثبت‌شده بسیار کوتاه بود؛ برای ایمنی ریتم ملایم (سطح ۱) انتخاب شد.
                    </div>
                  )}
                </div>

                <div className="w-full space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleApplyPlacementAndPlay}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 text-slate-950 font-black text-xs sm:text-sm shadow-lg cursor-pointer"
                  >
                    شروع تمرین در سطح {placementResult.recommendedLevel} (
                    {getBreathingLevelConfig(placementResult.recommendedLevel).shortLabel})
                  </button>
                  <button
                    type="button"
                    onClick={handleStartPlacement}
                    className="w-full py-2 rounded-xl bg-[#061521] hover:bg-[#112d42] border border-cyan-300/35 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    اندازه‌گیری مجدد ظرفیت تنفس
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Model Selector Tabs (Pinned & Compact) */}
            <div className="relative z-10 shrink-0 grid grid-cols-2 gap-1.5 my-1 bg-[#061521] p-1 rounded-xl border border-cyan-300/35">
              <button
                onClick={() => handleSelectModel('climb_slide')}
                className={`py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  model === 'climb_slide'
                    ? 'bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-950 shadow-md'
                    : 'text-slate-200 hover:bg-[#112d42]'
                }`}
              >
                <span>⛰️</span>
                <span>دم پله‌ای و سرسره (۳+۱)</span>
              </button>

              <button
                onClick={() => handleSelectModel('box_breathing')}
                className={`py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  model === 'box_breathing'
                    ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 shadow-md'
                    : 'text-slate-200 hover:bg-[#112d42]'
                }`}
              >
                <span>🔲</span>
                <span>
                  تنفس مربعی ({Math.round(boxPhaseMs / 1000)}×{Math.round(boxPhaseMs / 1000)})
                </span>
              </button>
            </div>

            {/* Calibrated Breathing Pace Level Bar */}
            <div className="relative z-10 shrink-0 flex items-center justify-between gap-1 bg-[#112d42] border border-cyan-300/35 rounded-xl px-2 py-1 mb-1">
              <div className="flex items-center gap-1 flex-wrap">
                {BREATHING_LEVEL_CONFIGS.map((cfg) => (
                  <button
                    key={cfg.level}
                    type="button"
                    onClick={() => handleSelectBreathingLevel(cfg.level)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      breathingLevel === cfg.level
                        ? 'bg-[#fbbf24] text-slate-950 shadow'
                        : 'bg-[#061521] text-slate-200 hover:bg-cyan-900'
                    }`}
                  >
                    سطح {cfg.level}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleStartPlacement}
                className="px-2 py-0.5 rounded-lg bg-[#061521] hover:bg-cyan-900 border border-cyan-300/40 text-[10px] font-bold text-slate-100 cursor-pointer shrink-0"
              >
                {savedPlacement ? 'تعیین سطح مجدد' : 'سنجش ظرفیت'}
              </button>
            </div>

            {/* 3. Active Breathing Model Stage (Scroll-safe & Compact) */}
            <div className="relative z-10 flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-between py-1">
              {model === 'climb_slide' ? renderClimbSlideModel() : renderBoxBreathingModel()}

              {/* Compact Combined Stats & Sound Row */}
              <div className="w-full mt-1.5 bg-[#112d42] border border-cyan-300/35 rounded-xl px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                  <span>
                    چرخه: <strong className="text-white font-bold">{cyclesCount}</strong>
                  </span>
                  <span className="text-cyan-300/50">|</span>
                  <span>
                    زمان: <strong className="text-white font-bold">{totalSeconds} ثانیه</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleManualPlayAudio}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-teal-300 to-cyan-300 hover:from-teal-200 hover:to-cyan-200 text-slate-950 font-bold text-[10px] shadow cursor-pointer transition-transform active:scale-95"
                  >
                    <Music className="w-3 h-3" />
                    <span>موسیقی نفس</span>
                  </button>

                  <button
                    onClick={handleTestChime}
                    title="تست صدای کاسه تبتی"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#061521] hover:bg-cyan-900 border border-cyan-300/40 text-slate-100 hover:text-white text-[10px] cursor-pointer"
                  >
                    <BellRing className="w-3 h-3 text-amber-300" />
                    <span>تست نغمه</span>
                  </button>
                </div>
              </div>

              {/* 10-Second Daily Reward Milestone Toast */}
              {dailyRewardUnlocked && (
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-amber-200 bg-amber-500/20 border border-amber-300/45 px-2.5 py-0.5 rounded-full shadow">
                  <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                  <span>شرط آبیاری روزانه حاصل شد (+۵ سکه پاداش)!</span>
                </div>
              )}
            </div>

            {/* 4. Bottom Action Controls (Pinned at Bottom — Always Visible) */}
            <div className="relative z-10 shrink-0 border-t border-cyan-300/25 pt-2 mt-1.5 flex items-center justify-between gap-2">
              {!hasStarted ? (
                <>
                  <button
                    onClick={handleStartBreathing}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 hover:from-emerald-200 hover:to-cyan-200 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(52,211,153,0.45)] cursor-pointer transition-transform hover:scale-[1.01] active:scale-98"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>شروع تمرین تنفس (Start)</span>
                  </button>

                  <button
                    onClick={handleClose}
                    className="px-3.5 py-2.5 rounded-xl bg-[#112d42] hover:bg-cyan-900 border border-cyan-300/35 text-xs font-bold text-slate-100 cursor-pointer transition-colors"
                  >
                    انصراف
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleTogglePause}
                    className="px-3 py-2 rounded-xl bg-[#112d42] hover:bg-cyan-900 border border-cyan-300/35 text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isActive ? 'توقف موقت' : 'ادامه'}</span>
                  </button>

                  <button
                    onClick={handleResetCycle}
                    title="شروع مجدد چرخه"
                    className="p-2 rounded-xl bg-[#061521] hover:bg-[#112d42] border border-cyan-300/35 text-slate-100 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleFinishSession}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-300 hover:from-cyan-200 hover:to-emerald-200 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/80 cursor-pointer transition-transform hover:scale-[1.01]"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>پایان تمرین و آبیاری درخت</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
