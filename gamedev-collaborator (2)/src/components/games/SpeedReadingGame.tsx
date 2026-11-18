import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  DEFAULT_INITIAL_SPEED_READING_LEVEL,
  SPEED_READING_FEEDBACK_OPTIONS,
  SpeedReadingDifficultyFeedback,
  calculateNextSpeedReadingLevel,
  getSpeedReadingLevelDelta,
  getSpeedReadingWpmForLevel,
  getSpeedReadingDailyScript,
  SPEED_READING_PLACEMENT_PASSAGE,
  SpeedReadingPlacementSummary,
  evaluateSpeedReadingPlacement,
} from '../../game/speedReadingData';
import { ExerciseCompletionReport } from '../../types/game';
import { sound } from '../../utils/audio';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Sparkles,
  Eye,
  BookOpen,
  Gauge,
  Repeat,
  SkipForward,
  Compass,
  Timer,
  Trophy,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const SPEED_READING_STATE_STORAGE_KEY = 'angellearn_speed_reading_state_v1';
const SPEED_READING_PLACEMENT_STORAGE_KEY = 'angellearn_speed_reading_placement_v1';

interface PersistedSpeedReadingState {
  level: number;
  completedSessionsCount: number;
}

interface SavedSpeedReadingPlacement {
  calibratedLevel: number;
  calibratedWpm: number;
  measuredWpm: number;
  comprehensionPassed: boolean;
  skillLabel: string;
  completedAt: string;
}

function loadSavedSpeedReadingPlacement(): SavedSpeedReadingPlacement | null {
  try {
    const raw = localStorage.getItem(SPEED_READING_PLACEMENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedSpeedReadingPlacement>;
    if (
      typeof parsed.calibratedLevel !== 'number' ||
      !Number.isFinite(parsed.calibratedLevel)
    ) {
      return null;
    }
    const calibratedLevel = Math.max(1, Math.min(21, Math.round(parsed.calibratedLevel)));
    return {
      calibratedLevel,
      calibratedWpm:
        typeof parsed.calibratedWpm === 'number'
          ? parsed.calibratedWpm
          : getSpeedReadingWpmForLevel(calibratedLevel),
      measuredWpm: typeof parsed.measuredWpm === 'number' ? parsed.measuredWpm : 150,
      comprehensionPassed: Boolean(parsed.comprehensionPassed),
      skillLabel:
        typeof parsed.skillLabel === 'string'
          ? parsed.skillLabel
          : 'تعیین‌شده بر اساس آزمون تندخوانی',
      completedAt:
        typeof parsed.completedAt === 'string'
          ? parsed.completedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function saveSpeedReadingPlacement(
  summary: SpeedReadingPlacementSummary
): SavedSpeedReadingPlacement {
  const payload: SavedSpeedReadingPlacement = {
    calibratedLevel: summary.recommendedLevel,
    calibratedWpm: summary.recommendedWpm,
    measuredWpm: summary.measuredWpm,
    comprehensionPassed: summary.comprehensionPassed,
    skillLabel: summary.skillLabel,
    completedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(SPEED_READING_PLACEMENT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
  return payload;
}

function loadSpeedReadingState(): PersistedSpeedReadingState {
  try {
    const raw = localStorage.getItem(SPEED_READING_STATE_STORAGE_KEY);
    if (!raw) {
      return {
        level: DEFAULT_INITIAL_SPEED_READING_LEVEL,
        completedSessionsCount: 0,
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedSpeedReadingState>;
    const level =
      typeof parsed.level === 'number' && Number.isFinite(parsed.level)
        ? Math.max(1, Math.min(21, Math.round(parsed.level)))
        : DEFAULT_INITIAL_SPEED_READING_LEVEL;
    const completedSessionsCount =
      typeof parsed.completedSessionsCount === 'number' &&
      Number.isFinite(parsed.completedSessionsCount) &&
      parsed.completedSessionsCount >= 0
        ? Math.floor(parsed.completedSessionsCount)
        : 0;
    return { level, completedSessionsCount };
  } catch {
    return {
      level: DEFAULT_INITIAL_SPEED_READING_LEVEL,
      completedSessionsCount: 0,
    };
  }
}

function saveSpeedReadingState(state: PersistedSpeedReadingState): void {
  try {
    localStorage.setItem(SPEED_READING_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

interface SpeedReadingGameProps {
  dayNumber?: number;
  onComplete: (success: boolean, report?: Partial<ExerciseCompletionReport>) => void;
  onClose: () => void;
}

interface Point2D {
  x: number;
  y: number;
  label?: string;
}

type EyeStageId =
  | 'v_zigzag'
  | 'h_zigzag'
  | 'hourglass'
  | 'star5'
  | 'circle'
  | 'star8'
  | 'spiral';

interface EyeExerciseStage {
  id: EyeStageId;
  title: string;
  subtitle: string;
  cycleDurationSec: number;
}

const EYE_EXERCISE_STAGES: EyeExerciseStage[] = [
  {
    id: 'v_zigzag',
    title: '۱. زیگزاگ عمودی',
    subtitle: 'حرکت عمودی و مورب چشم بین ستون‌ها برای تقویت پرش دقیق نگاه',
    cycleDurationSec: 12,
  },
  {
    id: 'h_zigzag',
    title: '۲. زیگزاگ افقی (الگوی Z)',
    subtitle: 'جاروب افقی سطرها و بازگشت سریع به ابتدای سطر بعدی',
    cycleDurationSec: 12,
  },
  {
    id: 'hourglass',
    title: '۳. الگوی پروانه‌ای (ضربدری)',
    subtitle: 'گسترش دامنه حرکت قطری چشم در چهار گوشه میدان دید',
    cycleDurationSec: 10,
  },
  {
    id: 'star5',
    title: '۴. ستاره پنج‌پر',
    subtitle: 'تعقیب خطوط متقاطع ستاره‌ای برای چابکی عضلات چشم',
    cycleDurationSec: 11,
  },
  {
    id: 'circle',
    title: '۵. چرخش دایره‌ای ۳۶۰ درجه',
    subtitle: 'حرکت نرم و پیوسته چشم روی مدار دایره‌ای ساعت‌گرد و پادساعت‌گرد',
    cycleDurationSec: 10,
  },
  {
    id: 'star8',
    title: '۶. ستاره ۸ جهته تمرکز مرکزی',
    subtitle: 'پرتاب نگاه از مرکز به ۸ جهت شماره‌گذاری‌شده و بازگشت به کانون',
    cycleDurationSec: 16,
  },
  {
    id: 'spiral',
    title: '۷. مارپیچ دید محیطی',
    subtitle: 'گسترش تدریجی کانون دید از نقطه مرکزی به بیرونی‌ترین مدار مارپیچ',
    cycleDurationSec: 14,
  },
];

// Build geometry & waypoints for each of the 7 ocular gymnastics stages on a 600x380 SVG canvas
function buildStageGeometry(stageId: EyeStageId): {
  nodes: Point2D[];
  waypoints: Point2D[];
  guideSegments: Array<{ from: Point2D; to: Point2D; hasArrow?: boolean }>;
  isContinuousCurve?: boolean;
} {
  const cx = 300;
  const cy = 190;

  if (stageId === 'v_zigzag') {
    const cols = 6;
    const xStart = 80;
    const xStep = 88;
    const yTop = 72;
    const yBottom = 308;
    const nodes: Point2D[] = [];
    const waypoints: Point2D[] = [];
    const guideSegments: Array<{ from: Point2D; to: Point2D; hasArrow?: boolean }> = [];

    for (let c = 0; c < cols; c++) {
      const x = xStart + c * xStep;
      const bottomPt = { x, y: yBottom };
      const topPt = { x, y: yTop };
      nodes.push(topPt, bottomPt);
      waypoints.push(bottomPt, topPt);
    }
    // Reverse path back to start for smooth ping-pong loop
    const forwardCount = waypoints.length;
    for (let i = 0; i < forwardCount - 1; i++) {
      guideSegments.push({
        from: waypoints[i],
        to: waypoints[i + 1],
        hasArrow: true,
      });
    }
    for (let i = forwardCount - 2; i >= 0; i--) {
      waypoints.push(waypoints[i]);
    }
    return { nodes, waypoints, guideSegments };
  }

  if (stageId === 'h_zigzag') {
    const rows = 4;
    const xLeft = 95;
    const xRight = 505;
    const yStart = 64;
    const yStep = 84;
    const nodes: Point2D[] = [];
    const waypoints: Point2D[] = [];
    const guideSegments: Array<{ from: Point2D; to: Point2D; hasArrow?: boolean }> = [];

    for (let r = 0; r < rows; r++) {
      const y = yStart + r * yStep;
      const rightPt = { x: xRight, y };
      const leftPt = { x: xLeft, y };
      nodes.push(leftPt, rightPt);
      waypoints.push(rightPt, leftPt);
    }
    const forwardCount = waypoints.length;
    for (let i = 0; i < forwardCount - 1; i++) {
      guideSegments.push({
        from: waypoints[i],
        to: waypoints[i + 1],
        hasArrow: true,
      });
    }
    for (let i = forwardCount - 2; i >= 0; i--) {
      waypoints.push(waypoints[i]);
    }
    return { nodes, waypoints, guideSegments };
  }

  if (stageId === 'hourglass') {
    const tl: Point2D = { x: 120, y: 66 };
    const tr: Point2D = { x: 480, y: 66 };
    const bl: Point2D = { x: 120, y: 314 };
    const br: Point2D = { x: 480, y: 314 };
    const nodes = [tl, tr, bl, br];
    const waypoints = [bl, tl, br, tr, bl];
    const guideSegments = [
      { from: bl, to: tl, hasArrow: true },
      { from: tl, to: br, hasArrow: true },
      { from: br, to: tr, hasArrow: true },
      { from: tr, to: bl, hasArrow: true },
    ];
    return { nodes, waypoints, guideSegments };
  }

  if (stageId === 'star5') {
    const r = 138;
    const outerNodes: Point2D[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = ((-90 + i * 72) * Math.PI) / 180;
      outerNodes.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
    // Classic continuous pentagram order: 0 -> 2 -> 4 -> 1 -> 3 -> 0
    const order = [0, 2, 4, 1, 3, 0];
    const waypoints = order.map((idx) => outerNodes[idx]);
    const guideSegments = [];
    for (let i = 0; i < order.length - 1; i++) {
      guideSegments.push({
        from: outerNodes[order[i]],
        to: outerNodes[order[i + 1]],
        hasArrow: false,
      });
    }
    return { nodes: outerNodes, waypoints, guideSegments };
  }

  if (stageId === 'circle') {
    const r = 132;
    const topMarker: Point2D = { x: cx, y: cy - r };
    const waypoints: Point2D[] = [];
    const steps = 120;
    // Clockwise full revolution
    for (let i = 0; i <= steps; i++) {
      const angle = -Math.PI / 2 + (i / steps) * Math.PI * 2;
      waypoints.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
    // Counter-clockwise full revolution
    for (let i = 1; i <= steps; i++) {
      const angle = -Math.PI / 2 - (i / steps) * Math.PI * 2;
      waypoints.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
    return {
      nodes: [topMarker],
      waypoints,
      guideSegments: [],
      isContinuousCurve: true,
    };
  }

  if (stageId === 'star8') {
    const r = 134;
    const centerNode: Point2D = { x: cx, y: cy };
    const persianDigits = ['۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸'];
    // Match the 8 numbered directions around the center
    const anglesDeg = [-135, -45, 180, 0, 135, 45, -90, 90];
    const outerNodes: Point2D[] = anglesDeg.map((deg, idx) => {
      const rad = (deg * Math.PI) / 180;
      return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
        label: persianDigits[idx],
      };
    });
    const waypoints: Point2D[] = [centerNode];
    const guideSegments: Array<{ from: Point2D; to: Point2D; hasArrow?: boolean }> = [];
    outerNodes.forEach((pt) => {
      waypoints.push(pt, centerNode);
      guideSegments.push({ from: centerNode, to: pt, hasArrow: false });
    });
    return {
      nodes: [centerNode, ...outerNodes],
      waypoints,
      guideSegments,
    };
  }

  // Stage 7: Archimedean Spiral (expanding from center and spiraling back inward)
  const turns = 4.25;
  const maxR = 138;
  const totalSteps = 180;
  const spiralOut: Point2D[] = [];
  for (let i = 0; i <= totalSteps; i++) {
    const t = i / totalSteps;
    const angle = -Math.PI / 2 + t * turns * Math.PI * 2;
    const radius = t * maxR;
    spiralOut.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  const spiralIn = [...spiralOut].reverse().slice(1);
  return {
    nodes: [{ x: cx, y: cy }, spiralOut[spiralOut.length - 1]],
    waypoints: [...spiralOut, ...spiralIn],
    guideSegments: [],
    isContinuousCurve: true,
  };
}

// Compute position along polyline waypoints at normalized progress u in [0, 1]
function getPointAlongWaypoints(waypoints: Point2D[], u: number): Point2D {
  if (waypoints.length === 0) return { x: 300, y: 190 };
  if (waypoints.length === 1) return waypoints[0];

  const clampedU = ((u % 1) + 1) % 1;
  const lengths: number[] = [];
  let totalLength = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = waypoints[i + 1].x - waypoints[i].x;
    const dy = waypoints[i + 1].y - waypoints[i].y;
    const segLen = Math.hypot(dx, dy);
    lengths.push(segLen);
    totalLength += segLen;
  }

  if (totalLength <= 0.001) return waypoints[0];

  let targetDist = clampedU * totalLength;
  for (let i = 0; i < lengths.length; i++) {
    const segLen = lengths[i];
    if (targetDist <= segLen || i === lengths.length - 1) {
      const localT = segLen > 0 ? targetDist / segLen : 0;
      return {
        x: waypoints[i].x + (waypoints[i + 1].x - waypoints[i].x) * localT,
        y: waypoints[i].y + (waypoints[i + 1].y - waypoints[i].y) * localT,
      };
    }
    targetDist -= segLen;
  }
  return waypoints[waypoints.length - 1];
}

export const SpeedReadingGame: React.FC<SpeedReadingGameProps> = ({
  dayNumber = 1,
  onComplete,
  onClose,
}) => {
  // Primary mode switcher inside Speed Reading Tree: Game 1 (RSVP Words) vs Game 2 (Interactive Ocular Gymnastics)
  const [activeGameTab, setActiveGameTab] = useState<'game1_rsvp' | 'game2_eye_gym'>(
    'game1_rsvp'
  );
  const [sessionStartedAt] = useState<string>(() => new Date().toISOString());

  // Initial Speed Reading Placement Test state ('none' when already calibrated)
  const [savedPlacement, setSavedPlacement] = useState<SavedSpeedReadingPlacement | null>(
    loadSavedSpeedReadingPlacement
  );
  const [placementStage, setPlacementStage] = useState<
    'none' | 'intro' | 'reading' | 'question' | 'result'
  >(() => (loadSavedSpeedReadingPlacement() ? 'none' : 'intro'));
  const [placementElapsedMs, setPlacementElapsedMs] = useState<number>(0);
  const [placementReadDurationMs, setPlacementReadDurationMs] = useState<number>(0);
  const [placementSelectedOpt, setPlacementSelectedOpt] = useState<number | null>(null);
  const [placementSummary, setPlacementSummary] =
    useState<SpeedReadingPlacementSummary | null>(null);
  const placementStartMsRef = useRef<number>(Date.now());

  // Persistent adaptive level & session counter
  const [persistedState, setPersistedState] = useState<PersistedSpeedReadingState>(() =>
    loadSpeedReadingState()
  );

  // Determine effective day number:
  // Session 1 (when completedSessionsCount === 0 and dayNumber <= 1) uses Day 1's welcome text.
  // Every subsequent day/session uses a unique new daily passage (Day 2..30).
  const effectiveDay = useMemo(() => {
    if (persistedState.completedSessionsCount === 0 && dayNumber <= 1) {
      return 1;
    }
    return Math.max(dayNumber, persistedState.completedSessionsCount + 1);
  }, [dayNumber, persistedState.completedSessionsCount]);

  const scriptData = useMemo(
    () => getSpeedReadingDailyScript(effectiveDay),
    [effectiveDay]
  );
  const words = useMemo(() => scriptData.text.trim().split(/\s+/), [scriptData.text]);

  // Speed is automatically determined by the player's current level (Session 1 default = Level 3 -> 150 WPM)
  const currentLevel = persistedState.level;
  const wpm = getSpeedReadingWpmForLevel(currentLevel);

  const [currentWordIdx, setCurrentWordIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Post-reading 5-option self-assessment state (Game 1)
  const [showQuestion, setShowQuestion] = useState<boolean>(false);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<SpeedReadingDifficultyFeedback | null>(null);
  const [updatedLevelPreview, setUpdatedLevelPreview] = useState<number | null>(null);

  // Optional comprehension check state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questionFeedback, setQuestionFeedback] = useState<string | null>(null);

  // Game 2 (Interactive Native Eye-Tracking Gymnastics) state
  const [eyeStageIdx, setEyeStageIdx] = useState<number>(0);
  const [isEyeGymPlaying, setIsEyeGymPlaying] = useState<boolean>(false);
  const [autoAdvanceStages, setAutoAdvanceStages] = useState<boolean>(true);
  const [eyeSpeedMultiplier, setEyeSpeedMultiplier] = useState<number>(1);
  const [stageProgress, setStageProgress] = useState<number>(0); // 0..1 within current stage
  const [eyePracticeSeconds, setEyePracticeSeconds] = useState<number>(0);
  const [eyeGymCompleted, setEyeGymCompleted] = useState<boolean>(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const eyeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  // Live stopwatch while reading the placement passage
  useEffect(() => {
    if (placementStage !== 'reading') return;
    const ticker = window.setInterval(() => {
      if (document.hidden) {
        placementStartMsRef.current += 100;
        return;
      }
      setPlacementElapsedMs(Date.now() - placementStartMsRef.current);
    }, 100);
    return () => window.clearInterval(ticker);
  }, [placementStage]);

  const startPlacementReading = () => {
    sound.playClick();
    setIsPlaying(false);
    setIsEyeGymPlaying(false);
    setPlacementSelectedOpt(null);
    setPlacementSummary(null);
    setPlacementElapsedMs(0);
    setPlacementReadDurationMs(0);
    placementStartMsRef.current = Date.now();
    setPlacementStage('reading');
  };

  const finishPlacementReading = () => {
    sound.playClick();
    const duration = Math.max(400, Date.now() - placementStartMsRef.current);
    setPlacementReadDurationMs(duration);
    setPlacementStage('question');
  };

  const submitPlacementAnswer = (optionIdx: number) => {
    sound.playClick();
    setPlacementSelectedOpt(optionIdx);
    const summary = evaluateSpeedReadingPlacement({
      wordCount: SPEED_READING_PLACEMENT_PASSAGE.wordCount,
      readingTimeMs: placementReadDurationMs,
      selectedOptionIndex: optionIdx,
      correctOptionIndex: SPEED_READING_PLACEMENT_PASSAGE.correctIdx,
    });
    const saved = saveSpeedReadingPlacement(summary);
    setSavedPlacement(saved);
    setPlacementSummary(summary);

    const updatedState: PersistedSpeedReadingState = {
      level: summary.recommendedLevel,
      completedSessionsCount: persistedState.completedSessionsCount,
    };
    saveSpeedReadingState(updatedState);
    setPersistedState(updatedState);
    setPlacementStage('result');

    if (summary.comprehensionPassed) {
      sound.playCoin();
      confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
    }
  };

  const activeStage = EYE_EXERCISE_STAGES[eyeStageIdx] || EYE_EXERCISE_STAGES[0];
  const stageGeometry = useMemo(
    () => buildStageGeometry(activeStage.id),
    [activeStage.id]
  );
  const orbPos = useMemo(
    () => getPointAlongWaypoints(stageGeometry.waypoints, stageProgress),
    [stageGeometry.waypoints, stageProgress]
  );

  // Trail positions slightly behind the orb for visual smoothness
  const trailPos1 = useMemo(
    () =>
      getPointAlongWaypoints(
        stageGeometry.waypoints,
        Math.max(0, stageProgress - 0.018)
      ),
    [stageGeometry.waypoints, stageProgress]
  );
  const trailPos2 = useMemo(
    () =>
      getPointAlongWaypoints(
        stageGeometry.waypoints,
        Math.max(0, stageProgress - 0.036)
      ),
    [stageGeometry.waypoints, stageProgress]
  );

  // 1 second real timer ticker for Game 1
  useEffect(() => {
    if (activeGameTab === 'game1_rsvp' && isPlaying && !isFinished) {
      timerRef.current = setInterval(() => {
        if (!document.hidden) {
          setSecondsElapsed((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeGameTab, isPlaying, isFinished]);

  // 1 second real practice timer for Game 2 (Interactive Eye Gymnastics)
  useEffect(() => {
    if (activeGameTab === 'game2_eye_gym' && isEyeGymPlaying) {
      eyeTimerRef.current = setInterval(() => {
        if (document.hidden) return;
        setEyePracticeSeconds((prev) => {
          const next = prev + 1;
          if (next >= 20) {
            setEyeGymCompleted(true);
          }
          return next;
        });
      }, 1000);
    } else {
      if (eyeTimerRef.current) clearInterval(eyeTimerRef.current);
    }
    return () => {
      if (eyeTimerRef.current) clearInterval(eyeTimerRef.current);
    };
  }, [activeGameTab, isEyeGymPlaying]);

  // Smooth 60fps requestAnimationFrame loop for Game 2 orb motion
  useEffect(() => {
    if (activeGameTab !== 'game2_eye_gym' || !isEyeGymPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameTimeRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (document.hidden) {
        lastFrameTimeRef.current = timestamp;
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }
      const dtSec = Math.min(0.1, (timestamp - lastFrameTimeRef.current) / 1000);
      lastFrameTimeRef.current = timestamp;

      const duration = activeStage.cycleDurationSec / eyeSpeedMultiplier;
      const deltaProgress = dtSec / Math.max(2, duration);

      setStageProgress((prev) => {
        const next = prev + deltaProgress;
        if (next >= 1) {
          if (autoAdvanceStages) {
            setEyeStageIdx((idx) => (idx + 1) % EYE_EXERCISE_STAGES.length);
          }
          return next - 1;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    activeGameTab,
    isEyeGymPlaying,
    activeStage.cycleDurationSec,
    eyeSpeedMultiplier,
    autoAdvanceStages,
  ]);

  // RSVP word streamer (Game 1)
  useEffect(() => {
    if (activeGameTab === 'game1_rsvp' && isPlaying && !isFinished) {
      const delayMs = Math.round((60 / wpm) * 1000);
      intervalRef.current = setInterval(() => {
        if (document.hidden) return;
        setCurrentWordIdx((prev) => {
          if (prev >= words.length - 1) {
            clearInterval(intervalRef.current!);
            setIsPlaying(false);
            setIsFinished(true);
            setShowQuestion(true);
            return prev;
          }
          return prev + 1;
        });
      }, delayMs);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeGameTab, isPlaying, isFinished, wpm, words.length]);

  const handleStart = () => {
    sound.playClick();
    setIsPlaying(true);
  };

  const handlePause = () => {
    sound.playClick();
    setIsPlaying(false);
  };

  const handleReset = () => {
    sound.playClick();
    setIsPlaying(false);
    setCurrentWordIdx(0);
    setSecondsElapsed(0);
    setIsFinished(false);
    setShowQuestion(false);
    setSelectedDifficulty(null);
    setUpdatedLevelPreview(null);
    setSelectedOption(null);
    setQuestionFeedback(null);
  };

  // Game 2 Native Controls
  const handleToggleEyeGymPlay = () => {
    sound.playClick();
    setIsEyeGymPlaying((prev) => !prev);
  };

  const handleRestartEyeGym = () => {
    sound.playClick();
    setEyeStageIdx(0);
    setStageProgress(0);
    setIsEyeGymPlaying(true);
  };

  const handleSelectStage = (idx: number) => {
    sound.playClick();
    setEyeStageIdx(idx);
    setStageProgress(0);
    setIsEyeGymPlaying(true);
  };

  const handleNextStage = () => {
    sound.playClick();
    setEyeStageIdx((idx) => (idx + 1) % EYE_EXERCISE_STAGES.length);
    setStageProgress(0);
  };

  const handleChangeEyeSpeed = (rate: number) => {
    sound.playClick();
    setEyeSpeedMultiplier(rate);
  };

  const handleCompleteEyeGymExercise = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const completedAt = new Date().toISOString();
    const report: Partial<ExerciseCompletionReport> = {
      treeId: 'speed_reading',
      completedReadingOrPractice: true,
      answeredCorrectly: true,
      overallSuccess: true,
      accuracyPercent: 100,
      durationSeconds: Math.max(20, eyePracticeSeconds),
      startedAt: sessionStartedAt,
      completedAt,
    };
    sound.playWater();
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    onComplete(true, report);
  };

  const currentWord = words[currentWordIdx] || '';

  const handleSelectDifficultyFeedback = (feedback: SpeedReadingDifficultyFeedback) => {
    sound.playClick();
    setSelectedDifficulty(feedback);
    const { nextLevel } = calculateNextSpeedReadingLevel(currentLevel, feedback);
    setUpdatedLevelPreview(nextLevel);
    sound.playCoin();
    confetti({ particleCount: 55, spread: 55, origin: { y: 0.65 } });
  };

  const handleAnswerSubmit = (optionIndex: number) => {
    sound.playClick();
    setSelectedOption(optionIndex);

    if (optionIndex === scriptData.correctIdx) {
      setQuestionFeedback('آفرین! پاسخ درک مطلب امروز کاملاً درست بود.');
      sound.playCoin();
    } else {
      setQuestionFeedback('پاسخ درک مطلب متفاوت بود؛ گزینه سبز پاسخ صحیح متن امروز است.');
    }
  };

  const handleFinishSession = () => {
    if (!selectedDifficulty || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const { nextLevel } = calculateNextSpeedReadingLevel(currentLevel, selectedDifficulty);
    const nextState: PersistedSpeedReadingState = {
      level: nextLevel,
      completedSessionsCount: persistedState.completedSessionsCount + 1,
    };
    saveSpeedReadingState(nextState);
    setPersistedState(nextState);

    const answeredComprehensionCorrectly =
      selectedOption !== null ? selectedOption === scriptData.correctIdx : true;
    const completedAt = new Date().toISOString();
    const report: Partial<ExerciseCompletionReport> = {
      treeId: 'speed_reading',
      completedReadingOrPractice: true,
      answeredCorrectly: answeredComprehensionCorrectly,
      overallSuccess: true,
      accuracyPercent: answeredComprehensionCorrectly ? 100 : 75,
      durationSeconds: Math.max(5, secondsElapsed),
      startedAt: sessionStartedAt,
      completedAt,
      wpm,
      wordsRead: isFinished ? words.length : currentWordIdx + 1,
    };

    sound.playWater();
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    onComplete(true, report);
  };

  // Polyline string for spiral or continuous curves
  const spiralPointsString = useMemo(() => {
    if (activeStage.id !== 'spiral') return '';
    const half = Math.ceil(stageGeometry.waypoints.length / 2);
    return stageGeometry.waypoints
      .slice(0, half)
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
  }, [activeStage.id, stageGeometry.waypoints]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-[#040e0a]/92 backdrop-blur-md animate-fadeIn overflow-y-auto"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/80 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-50 flex flex-col justify-between min-h-[560px]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-emerald-300/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-float">🪽</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                <span>درخت تندخوانی انجلرن</span>
                <span className="text-xs bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-300/45">
                  روز {effectiveDay}
                </span>
                <span className="text-xs bg-emerald-400/20 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300/45">
                  سطح {currentLevel} ({wpm} WPM)
                </span>
              </h2>
              <p className="text-[11px] text-slate-200">
                متن اختصاصی روز {effectiveDay}: «{scriptData.title}»
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            aria-label="بستن بازی درخت تندخوانی"
            className="w-8 h-8 rounded-full bg-[#143026] hover:bg-emerald-800 border border-emerald-300/35 text-slate-100 flex items-center justify-center text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* =====================================================================
            INITIAL SPEED READING PLACEMENT TEST (PASSAGE -> STANDARD QUESTION)
           ===================================================================== */}
        {placementStage === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-5 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400/30 to-amber-400/25 border-2 border-emerald-300/60 flex items-center justify-center shadow-lg">
              <Compass className="w-8 h-8 text-amber-200" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/45 text-amber-200 text-[11px] font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>تعیین سطح اولیه درخت تندخوانی</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                سرعت طبیعی مطالعه و درک مطلب خود را بسنجید!
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                ابتدا یک <strong>متن کوتاه و استاندارد ({SPEED_READING_PLACEMENT_PASSAGE.wordCount} کلمه)</strong> به شما نمایش داده می‌شود. پس از خواندن کامل آن، متن بسته شده و{' '}
                <strong>یک سوال درک مطلب ۴ گزینه‌ای</strong> مرتبط با متن می‌پرسیم تا سرعت واقعی (WPM) و سطح شروع شما دقیق مشخص شود.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full max-w-md text-[11px]">
              <div className="bg-[#143026] border border-emerald-300/35 rounded-2xl p-2.5">
                <div className="font-black text-amber-300">۱. مطالعه متن</div>
                <div className="text-slate-200 mt-0.5">اندازه‌گیری دقیق زمان</div>
              </div>
              <div className="bg-[#143026] border border-emerald-300/35 rounded-2xl p-2.5">
                <div className="font-black text-cyan-300">۲. سوال استاندارد</div>
                <div className="text-slate-200 mt-0.5">سنجش درک واقعی</div>
              </div>
              <div className="bg-[#143026] border border-emerald-300/35 rounded-2xl p-2.5">
                <div className="font-black text-emerald-300">۳. تنظیم سطح</div>
                <div className="text-slate-200 mt-0.5">۱۰۰ تا ۴۵۰ کلمه/دقیقه</div>
              </div>
            </div>

            <div className="w-full max-w-md flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={startPlacementReading}
                className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>شروع تعیین سطح (نمایش متن و سوال)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPlacementStage('none');
                }}
                className="py-2 text-xs font-bold text-slate-200 hover:text-white cursor-pointer"
              >
                فعلاً رد شو و با سرعت پیش‌فرض بازی کن
              </button>
            </div>
          </div>
        )}

        {placementStage === 'reading' && (
          <div className="flex-1 flex flex-col justify-between my-4 space-y-4 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#143026] border border-emerald-300/35 rounded-2xl px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-xl bg-[#fbbf24] text-slate-950 font-black text-xs">
                  گام ۱ از ۲ · مطالعه متن
                </span>
                <span className="text-xs font-bold text-slate-100">
                  {SPEED_READING_PLACEMENT_PASSAGE.wordCount} کلمه
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-cyan-200 bg-[#071611] border border-cyan-300/40 px-2.5 py-1 rounded-xl">
                <Timer className="w-3.5 h-3.5" />
                <span>زمان مطالعه: {(placementElapsedMs / 1000).toFixed(1)} ثانیه</span>
              </div>
            </div>

            <div className="rounded-3xl bg-[#071611] border-2 border-emerald-300/40 p-5 sm:p-6 shadow-inner space-y-3">
              <div className="flex items-center gap-2 text-amber-300 text-xs sm:text-sm font-black">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>{SPEED_READING_PLACEMENT_PASSAGE.title}</span>
              </div>
              <p
                dir="rtl"
                className="text-sm sm:text-base leading-8 sm:leading-9 text-slate-50 font-medium text-justify"
              >
                {SPEED_READING_PLACEMENT_PASSAGE.text}
              </p>
              <div className="text-[11px] text-slate-300 pt-1 border-t border-emerald-300/20">
                با سرعت طبیعی خود بخوانید تا مطلب را کامل متوجه شوید؛ پس از زدن دکمه زیر، متن پنهان شده و سوال پرسیده می‌شود.
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPlacementStage('none');
                }}
                className="text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>انصراف</span>
              </button>

              <button
                type="button"
                onClick={finishPlacementReading}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl cursor-pointer"
              >
                <span>متن را خواندم — پاسخ به سوال ←</span>
              </button>
            </div>
          </div>
        )}

        {placementStage === 'question' && (
          <div className="flex-1 flex flex-col justify-center my-4 space-y-4 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#143026] border border-amber-300/50 rounded-2xl px-3.5 py-2.5">
              <span className="px-2.5 py-0.5 rounded-xl bg-[#fbbf24] text-slate-950 font-black text-xs">
                گام ۲ از ۲ · پرسش استاندارد درک مطلب
              </span>
              <span className="text-xs font-bold text-cyan-200">
                زمان خواندن شما: {(placementReadDurationMs / 1000).toFixed(1)} ثانیه
              </span>
            </div>

            <div className="rounded-3xl bg-[#071611] border-2 border-emerald-300/40 p-5 space-y-4 shadow-xl">
              <h3 className="text-sm sm:text-base font-black text-white leading-relaxed">
                {SPEED_READING_PLACEMENT_PASSAGE.question}
              </h3>

              <div className="space-y-2">
                {SPEED_READING_PLACEMENT_PASSAGE.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => submitPlacementAnswer(idx)}
                    className="w-full text-right p-3.5 rounded-2xl bg-[#143026] hover:bg-[#fbbf24] hover:text-slate-950 border border-emerald-300/35 hover:border-amber-200 text-slate-100 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2.5"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#071611] text-amber-200 flex items-center justify-center text-xs font-black shrink-0">
                      {idx + 1}
                    </span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {placementStage === 'result' && placementSummary && (
          <div className="flex-1 flex flex-col justify-center my-4 space-y-4 animate-fadeIn">
            <div className="rounded-3xl bg-gradient-to-b from-[#143026] to-[#071611] border-2 border-amber-300/60 p-4 sm:p-5 text-center space-y-2.5 shadow-xl">
              <div className="inline-flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/50 text-amber-200 text-xs font-black px-3 py-0.5 rounded-full">
                <Trophy className="w-4 h-4" />
                <span>نتیجه تعیین سطح اولیه درخت تندخوانی</span>
              </div>

              <div
                className={`text-xs font-bold ${
                  placementSummary.comprehensionPassed ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {placementSummary.skillLabel}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white">
                سطح پیشنهادی: لول {placementSummary.recommendedLevel} ({placementSummary.recommendedWpm} کلمه در دقیقه)
              </h3>

              {!placementSummary.comprehensionPassed && (
                <div className="text-xs bg-rose-950/75 border border-rose-400/50 text-rose-100 rounded-2xl px-3 py-2 text-right">
                  پاسخ صحیح متن: <strong>{SPEED_READING_PLACEMENT_PASSAGE.options[SPEED_READING_PLACEMENT_PASSAGE.correctIdx]}</strong> — به دلیل پاسخ نادرست به درک مطلب، سرعت شروع با احتیاط تنظیم شد تا درک هم‌زمان تقویت شود.
                </div>
              )}

              {placementSummary.rushedWarning && (
                <div className="text-[11px] bg-amber-950/80 border border-amber-400/50 text-amber-100 rounded-xl px-3 py-1.5">
                  متن بسیار سریع رد شد؛ برای دقت بیشتر سرعت پایه با احتیاط در نظر گرفته شد.
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-[#071611] border border-emerald-300/35 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">سرعت مطالعه</div>
                  <div className="text-sm sm:text-base font-black text-cyan-300 mt-0.5">
                    {placementSummary.measuredWpm} WPM
                  </div>
                </div>
                <div className="bg-[#071611] border border-emerald-300/35 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">درک مطلب</div>
                  <div
                    className={`text-sm sm:text-base font-black mt-0.5 ${
                      placementSummary.comprehensionPassed ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {placementSummary.comprehensionPassed ? 'صحیح ✓' : 'نیاز به دقت ✕'}
                  </div>
                </div>
                <div className="bg-[#071611] border border-emerald-300/35 rounded-2xl p-2.5">
                  <div className="text-[10px] text-slate-300">سطح شروع</div>
                  <div className="text-sm sm:text-base font-black text-amber-300 mt-0.5">
                    لول {placementSummary.recommendedLevel}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPlacementStage('none');
                  setActiveGameTab('game1_rsvp');
                }}
                className="flex-1 min-h-[46px] py-2.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>شروع تمرین در لول {placementSummary.recommendedLevel} ({placementSummary.recommendedWpm} WPM)</span>
              </button>

              <button
                type="button"
                onClick={startPlacementReading}
                className="min-h-[46px] py-2.5 px-4 rounded-2xl bg-[#071611] hover:bg-[#143026] border border-emerald-300/35 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تست مجدد با متن</span>
              </button>
            </div>
          </div>
        )}

        {placementStage === 'none' && (
          <>
            {/* =====================================================================
                2-GAME SWITCHER INSIDE SPEED READING TREE
                Game 1: RSVP Word Streamer | Game 2: Interactive Ocular Gymnastics
               ===================================================================== */}
            <div className="grid grid-cols-2 gap-2.5 mt-3 bg-[#071611] p-1.5 rounded-2xl border border-emerald-300/30">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsEyeGymPlaying(false);
                  setActiveGameTab('game1_rsvp');
                }}
                className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  activeGameTab === 'game1_rsvp'
                    ? 'bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-950 shadow-lg'
                    : 'text-slate-200 hover:bg-[#143026]'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>بازی ۱: تندخوانی واژگان (RSVP)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsPlaying(false);
                  setActiveGameTab('game2_eye_gym');
                }}
                className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  activeGameTab === 'game2_eye_gym'
                    ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 shadow-lg'
                    : 'text-amber-200 hover:bg-[#143026]'
                }`}
              >
                <Eye className="w-4 h-4 shrink-0" />
                <span>بازی ۲: ورزش و تعقیب چشمی</span>
              </button>
            </div>

            {/* =====================================================================
                GAME 1: RSVP SPEED READING + 5-OPTION SELF-ASSESSMENT LEVEL ADAPTATION
               ===================================================================== */}
            {activeGameTab === 'game1_rsvp' && (
              <>
                {!showQuestion ? (
                  <div className="flex-1 flex flex-col items-center justify-center my-5">
                    {!isPlaying && currentWordIdx === 0 && (
                      <div className="mb-4 text-center px-4 py-2 rounded-2xl bg-[#143026] border border-emerald-300/35 text-xs text-slate-100">
                        نگاهت را به نقطه قرمز وسط بدوز. سرعت پخش به صورت خودکار بر اساس سطح تو تنظیم شده است.
                      </div>
                    )}

                    {/* Word Display Screen */}
                    <div className="relative w-full h-44 bg-[#071611] border-2 border-emerald-300/45 rounded-3xl flex items-center justify-center shadow-inner overflow-hidden">
                      <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-rose-500/30 pointer-events-none" />

                      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/80 animate-ping" />
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400 -mt-2" />
                      </div>

                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/80" />
                      </div>

                      <div
                        dir="rtl"
                        className="text-3xl sm:text-4xl md:text-5xl font-black text-center tracking-normal text-white drop-shadow-lg z-10 font-['Vazirmatn',sans-serif] select-none px-6 py-2 transition-all duration-75"
                      >
                        {currentWord}
                      </div>
                    </div>

                    <div className="w-full mt-4 flex items-center justify-between text-xs text-slate-200 font-medium">
                      <span>زمان سپری‌شده: {secondsElapsed} ثانیه</span>
                      <span>
                        کلمه {currentWordIdx + 1} از {words.length}
                      </span>
                    </div>

                    <div className="w-full bg-[#071611] h-2 rounded-full mt-2 overflow-hidden border border-emerald-300/30">
                      <div
                        className="bg-gradient-to-r from-teal-300 to-emerald-300 h-full transition-all duration-150"
                        style={{ width: `${((currentWordIdx + 1) / words.length) * 100}%` }}
                      />
                    </div>

                    {/* Read-only Automatic Speed & Level Status Card + Recalibrate trigger */}
                    <div className="w-full mt-5 bg-[#143026] p-3.5 rounded-2xl border border-emerald-300/35 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-100">
                        <Gauge className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>
                          {savedPlacement
                            ? `سرعت تنظیم‌شده شما (لول ${currentLevel}):`
                            : persistedState.completedSessionsCount === 0
                            ? 'سرعت پیش‌فرض جلسه اول:'
                            : `سرعت خودکار سطح فعلی شما (لول ${currentLevel}):`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-xl bg-[#071611] border border-emerald-300/40 text-emerald-200 text-xs font-bold">
                          لول {currentLevel}
                        </span>
                        <span className="px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-300/50 font-extrabold text-amber-200 text-xs sm:text-sm">
                          {wpm} کلمه در دقیقه
                        </span>
                        <button
                          type="button"
                          onClick={startPlacementReading}
                          className="px-2.5 py-1 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/50 text-amber-200 font-black text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>{savedPlacement ? 'تعیین سطح مجدد' : 'تعیین سطح با متن'}</span>
                        </button>
                      </div>
                      <div className="w-full text-[11px] text-slate-300 mt-1">
                        در پایان خواندن، بر اساس پاسخ شما به سوال ۵ گزینه‌ای، سطح جلسه بعدی به صورت هوشمند تنظیم می‌شود.
                      </div>
                    </div>
                  </div>
            ) : (
              /* 5-Option Self-Assessment Difficulty Question + Optional Comprehension Check */
              <div className="flex-1 flex flex-col justify-center my-3 space-y-3 animate-fadeIn">
                <div className="bg-[#143026] p-4 rounded-2xl border-2 border-amber-300/60 shadow-lg">
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-emerald-600/50">
                    <div className="flex items-center gap-2 text-amber-300 text-xs sm:text-sm font-black">
                      <Gauge className="w-4 h-4 shrink-0" />
                      <span>تنظیم هوشمند سطح تندخوانی</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#071611] text-slate-100 border border-emerald-500/50 text-[11px] font-bold">
                      سطح فعلی: لول {currentLevel} ({wpm} WPM)
                    </span>
                  </div>

                  <p className="text-sm sm:text-base font-extrabold text-slate-50 leading-relaxed mb-3">
                    سطح و سرعت بازی در این جلسه برایت چطور بود؟
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {SPEED_READING_FEEDBACK_OPTIONS.map((opt) => {
                      const isSelected = selectedDifficulty === opt.id;
                      const delta = getSpeedReadingLevelDelta(opt.id);
                      const deltaBadge =
                        delta > 0
                          ? `+${delta} لول سخت‌تر`
                          : delta < 0
                          ? `${delta} لول آسان‌تر`
                          : 'بدون تغییر لول';
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectDifficultyFeedback(opt.id)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-amber-200 font-black shadow-lg scale-[1.02]'
                              : 'bg-[#0a1e16] hover:bg-[#193b2e] border-emerald-500/50 text-slate-100 font-bold'
                          }`}
                        >
                          <span className="text-xs sm:text-sm">{opt.label}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-slate-950/15 text-slate-950 font-extrabold'
                                : 'bg-[#071611] text-slate-200 border border-emerald-600/40'
                            }`}
                          >
                            {deltaBadge}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedDifficulty && updatedLevelPreview !== null && (
                    <div className="mt-3 p-3 rounded-xl bg-[#0a1e16] border border-emerald-500/60 text-xs text-slate-100 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
                      <div>
                        {updatedLevelPreview > currentLevel && (
                          <span>
                            عالی! سطح بازی برای جلسه بعد{' '}
                            <strong className="text-amber-300">
                              {updatedLevelPreview - currentLevel} لول سخت‌تر
                            </strong>{' '}
                            شد: انتقال به{' '}
                            <strong className="text-amber-300">
                              لول {updatedLevelPreview} ({getSpeedReadingWpmForLevel(updatedLevelPreview)} کلمه در دقیقه)
                            </strong>
                            .
                          </span>
                        )}
                        {updatedLevelPreview < currentLevel && (
                          <span>
                            تنظیم شد! سطح بازی برای جلسه بعد{' '}
                            <strong className="text-amber-300">
                              {currentLevel - updatedLevelPreview} لول آسان‌تر
                            </strong>{' '}
                            شد: انتقال به{' '}
                            <strong className="text-amber-300">
                              لول {updatedLevelPreview} ({getSpeedReadingWpmForLevel(updatedLevelPreview)} کلمه در دقیقه)
                            </strong>
                            .
                          </span>
                        )}
                        {updatedLevelPreview === currentLevel && (
                          <span>
                            سطح بازی برای جلسه بعد{' '}
                            <strong className="text-amber-300">بدون تغییر</strong> در{' '}
                            <strong className="text-amber-300">
                              لول {updatedLevelPreview} ({getSpeedReadingWpmForLevel(updatedLevelPreview)} کلمه در دقیقه)
                            </strong>{' '}
                            باقی می‌ماند.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bonus Daily Comprehension Reflection */}
                <div className="bg-[#143026] p-3.5 rounded-2xl border border-emerald-600/50">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>پرسش درک مطلب متن امروز (روز {effectiveDay}):</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-50 leading-relaxed mb-2.5">
                    {scriptData.question}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {scriptData.options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={selectedOption !== null}
                        onClick={() => handleAnswerSubmit(idx)}
                        className={`w-full text-right p-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                          selectedOption === null
                            ? 'bg-[#0a1e16] hover:bg-[#193b2e] border-emerald-500/50 text-slate-100'
                            : selectedOption === idx
                            ? idx === scriptData.correctIdx
                              ? 'bg-emerald-700 border-emerald-300 text-slate-50 font-bold'
                              : 'bg-rose-900 border-rose-400 text-rose-50 font-bold'
                            : idx === scriptData.correctIdx
                            ? 'bg-emerald-800 border-emerald-400 text-slate-50 font-bold'
                            : 'bg-[#071611] border-slate-600/70 text-slate-300'
                        }`}
                      >
                        {idx + 1}. {opt}
                      </button>
                    ))}
                  </div>
                  {questionFeedback && (
                    <div className="mt-2 text-[11px] text-slate-100">{questionFeedback}</div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Control Actions for Game 1 */}
            <div className="border-t border-emerald-600/50 pt-4 flex items-center justify-between gap-3">
              {!showQuestion ? (
                <>
                  <button
                    onClick={handleReset}
                    className="px-3 py-2.5 rounded-xl bg-[#143026] hover:bg-[#1a3e31] border border-emerald-500/50 text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>شروع مجدد</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {!isPlaying ? (
                      <button
                        onClick={handleStart}
                        className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/80 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-slate-950" />
                        <span>{currentWordIdx === 0 ? 'شروع خواندن' : 'ادامه'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={handlePause}
                        className="px-6 py-2.5 rounded-2xl bg-[#fbbf24] hover:bg-[#fde68a] text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-950/80 cursor-pointer"
                      >
                        <Pause className="w-4 h-4 fill-slate-950" />
                        <span>توقف موقت</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleFinishSession}
                    disabled={!selectedDifficulty}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-300 hover:from-emerald-200 hover:to-teal-200 text-slate-950 font-extrabold text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-[1.01] disabled:bg-none disabled:bg-slate-800/90 disabled:text-slate-300 disabled:border disabled:border-slate-600/80 disabled:shadow-none disabled:opacity-100 disabled:pointer-events-none"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>
                      {selectedDifficulty
                        ? 'ثبت سطح جدید و آبیاری درخت'
                        : 'ابتدا یکی از ۵ گزینه سطح بازی را انتخاب کنید'}
                    </span>
                  </button>
                  <button
                    onClick={handleReset}
                    className="py-2.5 px-4 rounded-2xl bg-[#143026] hover:bg-[#1a3e31] border border-emerald-500/50 text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>بازخوانی متن</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* =====================================================================
            GAME 2: NATIVE INTERACTIVE OCULAR GYMNASTICS & EYE-TRACKING ENGINE
            7 Geometric Patterns Rendered Natively in AngelLearn's Dark Emerald UI
           ===================================================================== */}
        {activeGameTab === 'game2_eye_gym' && (
          <div className="flex-1 flex flex-col justify-between my-3 space-y-3 animate-fadeIn">
            {/* Instruction & Active Stage Banner */}
            <div className="p-3 rounded-2xl bg-[#143026] border border-amber-300/45 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <div className="text-slate-50 font-black">
                    بدون حرکت دادن سر، فقط با حرکت چشم‌ها گوی طلایی را دنبال کنید
                  </div>
                  <div className="text-[11px] text-slate-200 mt-0.5">
                    {activeStage.subtitle}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300 text-amber-200 font-black text-[11px]">
                {activeStage.title}
              </span>
            </div>

            {/* Interactive SVG Ocular Gymnastics Stage (100% Native AngelLearn UI) */}
            <div
              onClick={handleToggleEyeGymPlay}
              className="relative w-full rounded-3xl overflow-hidden border-2 border-emerald-300/45 bg-gradient-to-br from-[#021b13] via-[#042f22] to-[#021810] shadow-[inset_0_0_50px_rgba(0,0,0,0.75)] aspect-[16/10] max-h-[320px] mx-auto flex items-center justify-center cursor-pointer select-none"
            >
              <svg
                viewBox="0 0 600 380"
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <radialGradient id="eyeStageGlow" cx="50%" cy="50%" r="55%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
                    <stop offset="65%" stopColor="#047857" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#022c22" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="goldenOrbGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="45%" stopColor="#fbbf24" />
                    <stop offset="85%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#9a3412" />
                  </radialGradient>
                  <marker
                    id="eyeArrowHead"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5.5"
                    markerHeight="5.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#34d399" fillOpacity="0.8" />
                  </marker>
                </defs>

                {/* Subtle Ambient Emerald Stage Halo & Grid Lines */}
                <rect x="0" y="0" width="600" height="380" fill="url(#eyeStageGlow)" />
                <circle
                  cx="300"
                  cy="190"
                  r="155"
                  fill="none"
                  stroke="#10b981"
                  strokeOpacity="0.1"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                />
                <line
                  x1="40"
                  y1="190"
                  x2="560"
                  y2="190"
                  stroke="#10b981"
                  strokeOpacity="0.08"
                  strokeWidth="1"
                />
                <line
                  x1="300"
                  y1="25"
                  x2="300"
                  y2="355"
                  stroke="#10b981"
                  strokeOpacity="0.08"
                  strokeWidth="1"
                />

                {/* Stage 5: Circular Orbit Path */}
                {activeStage.id === 'circle' && (
                  <g>
                    <circle
                      cx="300"
                      cy="190"
                      r="132"
                      fill="none"
                      stroke="#059669"
                      strokeWidth="12"
                      strokeOpacity="0.25"
                    />
                    <circle
                      cx="300"
                      cy="190"
                      r="132"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="4"
                      strokeOpacity="0.85"
                    />
                    <circle cx="300" cy="190" r="5" fill="#10b981" opacity="0.5" />
                  </g>
                )}

                {/* Stage 7: Archimedean Spiral Path */}
                {activeStage.id === 'spiral' && (
                  <g>
                    <polyline
                      points={spiralPointsString}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity="0.25"
                    />
                    <polyline
                      points={spiralPointsString}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity="0.85"
                    />
                  </g>
                )}

                {/* Guide Segments for Linear / Star / Zig-Zag Stages */}
                {stageGeometry.guideSegments.map((seg, idx) => {
                  // Shorten endpoint slightly so arrowheads sit cleanly before the node circle
                  const dx = seg.to.x - seg.from.x;
                  const dy = seg.to.y - seg.from.y;
                  const len = Math.hypot(dx, dy) || 1;
                  const padStart = 16;
                  const padEnd = seg.hasArrow ? 22 : 16;
                  const x1 = seg.from.x + (dx / len) * padStart;
                  const y1 = seg.from.y + (dy / len) * padStart;
                  const x2 = seg.to.x - (dx / len) * padEnd;
                  const y2 = seg.to.y - (dy / len) * padEnd;

                  return (
                    <g key={`seg-${idx}`}>
                      <line
                        x1={seg.from.x}
                        y1={seg.from.y}
                        x2={seg.to.x}
                        y2={seg.to.y}
                        stroke="#059669"
                        strokeWidth="8"
                        strokeOpacity="0.22"
                        strokeLinecap="round"
                      />
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#34d399"
                        strokeWidth="2.8"
                        strokeOpacity="0.8"
                        strokeLinecap="round"
                        markerEnd={seg.hasArrow ? 'url(#eyeArrowHead)' : undefined}
                      />
                    </g>
                  );
                })}

                {/* Anchor Nodes & Numbered Targets */}
                {stageGeometry.nodes.map((node, idx) => {
                  const distToOrb = Math.hypot(orbPos.x - node.x, orbPos.y - node.y);
                  const isActiveNode = distToOrb < 22;
                  const hasLabel = Boolean(node.label);

                  return (
                    <g key={`node-${idx}`} transform={`translate(${node.x}, ${node.y})`}>
                      {isActiveNode && (
                        <circle
                          cx="0"
                          cy="0"
                          r={hasLabel ? 24 : 19}
                          fill="#fbbf24"
                          opacity="0.28"
                        />
                      )}
                      <circle
                        cx="0"
                        cy="0"
                        r={hasLabel ? 17 : 12}
                        fill={isActiveNode ? '#065f46' : '#022c22'}
                        stroke={isActiveNode ? '#fbbf24' : '#34d399'}
                        strokeWidth={isActiveNode ? '3' : '2.2'}
                      />
                      {hasLabel ? (
                        <text
                          x="0"
                          y="5"
                          textAnchor="middle"
                          fill="#ecfdf5"
                          fontSize="14"
                          fontWeight="900"
                          className="font-['Vazirmatn',sans-serif]"
                        >
                          {node.label}
                        </text>
                      ) : (
                        <circle
                          cx="0"
                          cy="0"
                          r="4"
                          fill={isActiveNode ? '#fde047' : '#10b981'}
                          opacity="0.85"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Motion Trail Behind the Moving Golden Orb */}
                {isEyeGymPlaying && (
                  <>
                    <circle
                      cx={trailPos2.x}
                      cy={trailPos2.y}
                      r="8"
                      fill="#f59e0b"
                      opacity="0.22"
                    />
                    <circle
                      cx={trailPos1.x}
                      cy={trailPos1.y}
                      r="11"
                      fill="#fbbf24"
                      opacity="0.4"
                    />
                  </>
                )}

                {/* Primary Moving Golden-Orange Target Orb */}
                <g transform={`translate(${orbPos.x}, ${orbPos.y})`}>
                  <circle cx="0" cy="0" r="24" fill="#fbbf24" opacity="0.22" />
                  <circle
                    cx="0"
                    cy="0"
                    r="15"
                    fill="url(#goldenOrbGrad)"
                    stroke="#fef08a"
                    strokeWidth="2.5"
                  />
                  <circle cx="-4" cy="-4" r="4" fill="#ffffff" opacity="0.85" />
                </g>
              </svg>

              {/* Top-Left Stage Progress Badge inside Canvas */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-[#071611] border border-emerald-300/45 text-[11px] font-bold text-slate-100 pointer-events-none">
                مرحله {eyeStageIdx + 1} از {EYE_EXERCISE_STAGES.length} •{' '}
                {Math.round(stageProgress * 100)}%
              </div>

              {/* Play Overlay when Paused */}
              {!isEyeGymPlaying && (
                <div className="absolute inset-0 bg-[#040e0a]/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2.5 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 flex items-center justify-center shadow-2xl border-2 border-white">
                    <Play className="w-8 h-8 fill-slate-950 ml-0.5" />
                  </div>
                  <span className="px-4 py-1.5 rounded-full bg-[#071611] border border-amber-300 text-amber-200 font-black text-xs shadow-lg">
                    برای شروع تمرین تعقیب چشمی کلیک کنید
                  </span>
                </div>
              )}
            </div>

            {/* Stage Selector, Speed & Practice Progress Controls */}
            <div className="bg-[#143026] p-3 rounded-2xl border border-emerald-300/35 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-100">
                <span className="font-bold">
                  پیشرفت تمرین روزانه:{' '}
                  <strong className="text-amber-300">{eyePracticeSeconds} ثانیه</strong>{' '}
                  {eyeGymCompleted ? '✓ (آماده ثبت پاداش)' : '(حداقل ۲۰ ثانیه تمرین)'}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setAutoAdvanceStages((prev) => !prev);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border cursor-pointer transition-all ${
                    autoAdvanceStages
                      ? 'bg-emerald-400/20 border-emerald-300 text-emerald-100'
                      : 'bg-[#071611] border-emerald-300/35 text-slate-200'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>
                    {autoAdvanceStages
                      ? 'تغییر خودکار مراحل: روشن'
                      : 'تکرار همین الگو'}
                  </span>
                </button>
              </div>

              {/* 7 Exercise Stage Selector Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {EYE_EXERCISE_STAGES.map((st, idx) => {
                  const isCurrent = eyeStageIdx === idx;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSelectStage(idx)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold cursor-pointer transition-all border ${
                        isCurrent
                          ? 'bg-[#fbbf24] text-slate-950 border-white font-black shadow'
                          : 'bg-[#071611] hover:bg-[#193d30] text-slate-100 border-emerald-300/35'
                      }`}
                    >
                      {st.title}
                    </button>
                  );
                })}
              </div>

              {/* Speed Multiplier & Next Pattern Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-300/20">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Gauge className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[11px] text-slate-200 font-bold">
                    سرعت حرکت گوی:
                  </span>
                  {[0.75, 1, 1.5, 2, 2.5].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleChangeEyeSpeed(rate)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${
                        eyeSpeedMultiplier === rate
                          ? 'bg-emerald-300 text-slate-950'
                          : 'bg-[#071611] text-slate-100 hover:bg-[#193d30] border border-emerald-300/25'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleNextStage}
                  className="px-2.5 py-1 rounded-xl bg-[#071611] hover:bg-[#193d30] border border-emerald-300/35 text-slate-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5 text-amber-300" />
                  <span>الگوی بعدی</span>
                </button>
              </div>
            </div>

            {/* Bottom Control Actions for Game 2 */}
            <div className="border-t border-emerald-300/20 pt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestartEyeGym}
                  className="px-3 py-2.5 rounded-xl bg-[#143026] hover:bg-emerald-800 border border-emerald-300/35 text-slate-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>از اول</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleEyeGymPlay}
                  className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg cursor-pointer ${
                    isEyeGymPlaying
                      ? 'bg-[#fbbf24] hover:bg-[#fde68a] text-slate-950'
                      : 'bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 text-slate-950'
                  }`}
                >
                  {isEyeGymPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-slate-950" />
                      <span>توقف</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>شروع حرکت</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCompleteEyeGymExercise}
                disabled={!eyeGymCompleted}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xl cursor-pointer disabled:bg-none disabled:bg-slate-800/90 disabled:text-slate-300 disabled:border disabled:border-slate-600/80 disabled:shadow-none disabled:opacity-100 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {eyeGymCompleted
                    ? 'ثبت تمرین چشمی و آبیاری درخت'
                    : `۲۰ ثانیه گوی را دنبال کنید (${eyePracticeSeconds}/20)`}
                </span>
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};
