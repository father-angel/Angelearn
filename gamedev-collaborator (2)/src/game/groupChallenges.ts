/**
 * AngelLearn - Pure Group Game Competition Catalog, Escalating Score Math & Leaderboard Logic
 */

import type { GroupChallengeGameId, GroupChallengeScore } from '../types/game';

export const CHALLENGE_TITLE_MIN_LENGTH = 2;
export const CHALLENGE_TITLE_MAX_LENGTH = 60;
export const CHALLENGE_MAX_SCORE = 1_000_000;

export interface GroupChallengeGameMeta {
  id: GroupChallengeGameId;
  treeTitle: string;
  challengeTitle: string;
  emoji: string;
  badgeText: string;
  description: string;
  defaultPostTitle: string;
}

export const GROUP_CHALLENGE_GAMES: ReadonlyArray<GroupChallengeGameMeta> = [
  {
    id: 'brain_math',
    treeTitle: 'درخت مغز',
    challengeTitle: 'رقابت محاسبات پلکانی ذهن',
    emoji: '🧠',
    badgeText: '۱۰ سوال صعودی',
    description:
      'شروع از سطح ۱؛ با هر پاسخ درست سوال بعدی سخت‌تر می‌شود! دقت، سطح بالاتر و سرعت بیشتر امتیاز شما را بالا می‌برد.',
    defaultPostTitle: 'چالش محاسبات پلکانی درخت مغز',
  },
  {
    id: 'bina_balls',
    treeTitle: 'درخت بینا',
    challengeTitle: 'رقابت ردیابی دیداری پویا',
    emoji: '👁️',
    badgeText: 'موج‌های صعودی',
    description:
      'از ردیابی ۱ توپ سبز میان ۶ توپ شروع می‌شود و مرحله‌به‌مرحله تا ۲ توپ هدف و ۱۳ توپ پرسرعت سخت‌تر می‌شود!',
    defaultPostTitle: 'چالش ردیابی دیداری درخت بینا',
  },
  {
    id: 'memory_cards',
    treeTitle: 'درخت حافظه',
    challengeTitle: 'رقابت حافظه اعداد (کم به زیاد)',
    emoji: '🃏',
    badgeText: '۴ مرحله ۵ تا ۱۲ عدد',
    description:
      'اعداد مخفی را به خاطر بسپارید و از کوچک به بزرگ باز کنید؛ با عبور از مراحل ۵، ۷، ۹ و ۱۲ عددی رکوردتان اوج می‌گیرد!',
    defaultPostTitle: 'چالش توالی اعداد درخت حافظه',
  },
  {
    id: 'color_trap',
    treeTitle: 'تله رنگ‌ها',
    challengeTitle: 'رقابت تمرکز و مهار تداخل رنگ‌ها (۴۵ ثانیه)',
    emoji: '🎨',
    badgeText: '۴ مرحله · ۴ تا ۶ رنگ',
    description:
      'رنگ واقعی نوشته را انتخاب کنید، نه معنی کلمه را! هر ۸ سؤال سختی و درصد تناقض بیشتر می‌شود؛ سرعت و زنجیره پاسخ صحیح امتیازتان را اوج می‌دهد.',
    defaultPostTitle: 'چالش سرعت و تمرکز تله رنگ‌ها',
  },
  {
    id: 'logic_mind',
    treeTitle: 'ذهن منطقی',
    challengeTitle: 'رقابت استدلال و کشف الگو (۱۰ سؤال · ۹۰ ثانیه)',
    emoji: '🧩',
    badgeText: '۱۰ سؤال · ۳ سطح سختی',
    description:
      '۱۰ سؤال چهارگزینه‌ای از دنباله اعداد، الگوهای هندسی، ترتیب منطقی و الگوهای ترکیبی در ۹۰ ثانیه؛ مجموعه سؤالات هر چالش برای تمام اعضای گروه یکسان است!',
    defaultPostTitle: 'چالش استدلال و الگوهای ذهن منطقی',
  },
  {
    id: 'spatial_memory',
    treeTitle: 'حافظه فضایی',
    challengeTitle: 'رقابت تکرار توالی خانه‌های رنگی (۳ جان · ۹۰ ثانیه)',
    emoji: '🟦',
    badgeText: 'شبکه ۳×۳ تا ۵×۵',
    description:
      'ترتیب روشن‌شدن خانه‌های رنگی را به خاطر بسپارید و دقیقاً تکرار کنید! با هر مرحله توالی بلندتر، سرعت بیشتر و شبکه از ۳×۳ به ۴×۴ و ۵×۵ ارتقا می‌یابد.',
    defaultPostTitle: 'چالش حافظه فضایی و توالی رنگ‌ها',
  },
  {
    id: 'coordination_duel',
    treeTitle: 'دوئل هماهنگی',
    challengeTitle: 'رقابت سرعت واکنش دو دست چپ و راست (۶۰ ثانیه)',
    emoji: '⚡',
    badgeText: '۴ مرحله · لمس همزمان',
    description:
      'با ظهور فلش چپ، راست یا دوگانه، ناحیه متناظر را با حداکثر سرعت لمس کنید (یا کلیدهای A و L در ویندوز)! هر ۱۰ فرمان سرعت بیشتر و فرمان‌های دوگانه اضافه می‌شود.',
    defaultPostTitle: 'چالش واکنش و دوئل هماهنگی دو دست',
  },
];

export function isValidGroupChallengeGameId(
  value: string
): value is GroupChallengeGameId {
  return (
    value === 'brain_math' ||
    value === 'bina_balls' ||
    value === 'memory_cards' ||
    value === 'color_trap' ||
    value === 'logic_mind' ||
    value === 'spatial_memory' ||
    value === 'coordination_duel'
  );
}

export function getGroupChallengeGameMeta(
  gameId: GroupChallengeGameId
): GroupChallengeGameMeta {
  return (
    GROUP_CHALLENGE_GAMES.find((g) => g.id === gameId) ?? GROUP_CHALLENGE_GAMES[0]
  );
}

export function sanitizeChallengeTitle(
  raw: string | undefined,
  gameId: GroupChallengeGameId
): string {
  const clean = (raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CHALLENGE_TITLE_MAX_LENGTH);
  if (clean.length >= CHALLENGE_TITLE_MIN_LENGTH) {
    return clean;
  }
  return getGroupChallengeGameMeta(gameId).defaultPostTitle;
}

export function makeGroupChallengeId(
  creatorUid: string,
  nowMs = Date.now()
): string {
  const cleanUid =
    creatorUid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10) || 'usr';
  const rand = Math.random().toString(36).slice(2, 7);
  return `chg_${nowMs.toString(36)}_${cleanUid}_${rand}`;
}

export function clampChallengeScore(score: number): number {
  const n = Math.floor(Number(score) || 0);
  if (n < 0) return 0;
  if (n > CHALLENGE_MAX_SCORE) return CHALLENGE_MAX_SCORE;
  return n;
}

/**
 * Strictly preserves ONLY the player's highest record for a group game challenge.
 * Returns true only if there is no previous record OR nextScore strictly beats previousBest.
 */
export function shouldUpdateChallengeRecord(
  previousBestScore: number | null | undefined,
  nextScore: number
): boolean {
  const cleanNext = clampChallengeScore(nextScore);
  if (
    previousBestScore === null ||
    previousBestScore === undefined ||
    !Number.isFinite(previousBestScore)
  ) {
    return true;
  }
  return cleanNext > Math.floor(previousBestScore);
}

/**
 * Computes competitive score for Brain Math (10 escalating questions).
 */
export function calculateBrainChallengeScore(params: {
  highestLevelReached: number;
  correctCount: number;
  totalQuestions: number;
  avgResponseMs: number;
}): number {
  const correct = Math.max(0, Math.floor(params.correctCount));
  const highestLvl = Math.max(1, Math.min(10, Math.floor(params.highestLevelReached)));
  const avgSec = Math.max(0.5, params.avgResponseMs / 1000);
  const accuracyBonus = correct * 55;
  const levelEscalationBonus = highestLvl * 45;
  const speedBonus = correct > 0 ? Math.max(0, Math.round((10 - avgSec) * 18)) : 0;
  return clampChallengeScore(accuracyBonus + levelEscalationBonus + speedBonus);
}

/**
 * Computes competitive score for Bina Balls (escalating waves 1..5+).
 */
export function calculateBinaChallengeScore(params: {
  clearedRounds: number;
  highestLevelCleared: number;
  totalTargetsHit: number;
  elapsedSeconds: number;
}): number {
  const cleared = Math.max(0, Math.floor(params.clearedRounds));
  const highestLvl = Math.max(0, Math.floor(params.highestLevelCleared));
  const targets = Math.max(0, Math.floor(params.totalTargetsHit));
  const timePenalty = Math.min(80, Math.round(Math.max(0, params.elapsedSeconds) * 0.6));
  const raw = cleared * 140 + highestLvl * 85 + targets * 55 - timePenalty;
  return clampChallengeScore(Math.max(targets * 25, raw));
}

/**
 * Computes competitive score for Memory Cards Ascending Numbers (stages 5, 7, 9, 12).
 */
export function calculateMemoryChallengeScore(params: {
  clearedStages: number;
  maxCardCount: number;
  totalMistakes: number;
  elapsedSeconds: number;
}): number {
  const cleared = Math.max(0, Math.floor(params.clearedStages));
  const maxCards = Math.max(0, Math.floor(params.maxCardCount));
  const mistakes = Math.max(0, Math.floor(params.totalMistakes));
  const timePenalty = Math.min(120, Math.round(Math.max(0, params.elapsedSeconds) * 0.8));
  const perfectBonus = cleared > 0 && mistakes === 0 ? 120 : 0;
  const raw =
    cleared * 180 + maxCards * 25 + perfectBonus - mistakes * 35 - timePenalty;
  return clampChallengeScore(Math.max(cleared * 60, raw));
}

// ============================================================================
// COLOR TRAP («تله رنگ‌ها») — STROOP GROUP CHALLENGE ENGINE
// ============================================================================

export const COLOR_TRAP_ROUND_SECONDS = 45;
export const COLOR_TRAP_QUESTIONS_PER_STAGE = 8;
export const COLOR_TRAP_BASE_CORRECT_POINTS = 100;
export const COLOR_TRAP_MAX_SPEED_BONUS = 20;
export const COLOR_TRAP_COMBO_STEP_POINTS = 10;
export const COLOR_TRAP_MAX_COMBO_BONUS = 30;
export const COLOR_TRAP_WRONG_PENALTY = 30;

export type ColorTrapColorId =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange';

export interface ColorTrapColorItem {
  id: ColorTrapColorId;
  label: string;
  inkHex: string;
  glowCss: string;
  buttonBgClass: string;
  buttonTextClass: string;
  buttonBorderClass: string;
  swatchHex: string;
}

/**
 * 6 High-Contrast, Unambiguous Colors ordered so:
 * - Stage 1 & 2 use the first 4 colors (قرمز، آبی، سبز، زرد)
 * - Stage 3 uses the first 5 colors (+ بنفش)
 * - Stage 4 uses all 6 colors (+ نارنجی)
 */
export const COLOR_TRAP_COLORS: ReadonlyArray<ColorTrapColorItem> = [
  {
    id: 'red',
    label: 'قرمز',
    inkHex: '#ff4d5e',
    glowCss: 'rgba(255, 77, 94, 0.38)',
    buttonBgClass: 'bg-gradient-to-b from-[#ff6b7a] via-[#ef4444] to-[#dc2626]',
    buttonTextClass: 'text-white',
    buttonBorderClass: 'border-rose-200',
    swatchHex: '#ef4444',
  },
  {
    id: 'blue',
    label: 'آبی',
    inkHex: '#38bdf8',
    glowCss: 'rgba(56, 189, 248, 0.38)',
    buttonBgClass: 'bg-gradient-to-b from-[#7dd3fc] via-[#38bdf8] to-[#0284c7]',
    buttonTextClass: 'text-slate-950',
    buttonBorderClass: 'border-sky-100',
    swatchHex: '#38bdf8',
  },
  {
    id: 'green',
    label: 'سبز',
    inkHex: '#34d399',
    glowCss: 'rgba(52, 211, 153, 0.38)',
    buttonBgClass: 'bg-gradient-to-b from-[#6ee7b7] via-[#10b981] to-[#059669]',
    buttonTextClass: 'text-slate-950',
    buttonBorderClass: 'border-emerald-100',
    swatchHex: '#10b981',
  },
  {
    id: 'yellow',
    label: 'زرد',
    inkHex: '#fde047',
    glowCss: 'rgba(253, 224, 71, 0.38)',
    buttonBgClass: 'bg-gradient-to-b from-[#fef08a] via-[#facc15] to-[#eab308]',
    buttonTextClass: 'text-slate-950',
    buttonBorderClass: 'border-yellow-100',
    swatchHex: '#facc15',
  },
  {
    id: 'purple',
    label: 'بنفش',
    inkHex: '#d8b4fe',
    glowCss: 'rgba(216, 180, 254, 0.4)',
    buttonBgClass: 'bg-gradient-to-b from-[#e9d5ff] via-[#c084fc] to-[#9333ea]',
    buttonTextClass: 'text-slate-950',
    buttonBorderClass: 'border-purple-100',
    swatchHex: '#c084fc',
  },
  {
    id: 'orange',
    label: 'نارنجی',
    inkHex: '#fb923c',
    glowCss: 'rgba(251, 146, 60, 0.4)',
    buttonBgClass: 'bg-gradient-to-b from-[#fdba74] via-[#fb923c] to-[#ea580c]',
    buttonTextClass: 'text-slate-950',
    buttonBorderClass: 'border-orange-100',
    swatchHex: '#fb923c',
  },
];

export interface ColorTrapStageConfig {
  stage: 1 | 2 | 3 | 4;
  title: string;
  colorCount: 4 | 5 | 6;
  incongruentRatio: number; // 0.30 | 0.50 | 0.70 | 0.80
  questionTimeLimitMs: number;
  hasStrictQuestionTimer: boolean;
}

/**
 * Escalates difficulty every 8 questions:
 * - Stage 1 (Q 0..7):   4 colors, 30% incongruent
 * - Stage 2 (Q 8..15):  4 colors, 50% incongruent
 * - Stage 3 (Q 16..23): 5 colors, 70% incongruent
 * - Stage 4 (Q 24+):    6 colors, 80% incongruent with shorter response window
 */
export function getColorTrapStageConfig(
  answeredQuestionsCount: number
): ColorTrapStageConfig {
  const qIndex = Math.max(0, Math.floor(answeredQuestionsCount));
  const stageIdx = Math.min(
    4,
    Math.floor(qIndex / COLOR_TRAP_QUESTIONS_PER_STAGE) + 1
  ) as 1 | 2 | 3 | 4;

  if (stageIdx === 1) {
    return {
      stage: 1,
      title: 'مرحله ۱ · ۴ رنگ (۳۰٪ تناقض)',
      colorCount: 4,
      incongruentRatio: 0.3,
      questionTimeLimitMs: 3600,
      hasStrictQuestionTimer: false,
    };
  }
  if (stageIdx === 2) {
    return {
      stage: 2,
      title: 'مرحله ۲ · ۴ رنگ (۵۰٪ تناقض)',
      colorCount: 4,
      incongruentRatio: 0.5,
      questionTimeLimitMs: 3200,
      hasStrictQuestionTimer: false,
    };
  }
  if (stageIdx === 3) {
    return {
      stage: 3,
      title: 'مرحله ۳ · ۵ رنگ (۷۰٪ تناقض)',
      colorCount: 5,
      incongruentRatio: 0.7,
      questionTimeLimitMs: 2700,
      hasStrictQuestionTimer: false,
    };
  }
  return {
    stage: 4,
    title: 'مرحله ۴ · ۶ رنگ (۸۰٪ تناقض · زمان کوتاه‌تر)',
    colorCount: 6,
    incongruentRatio: 0.8,
    questionTimeLimitMs: 2000,
    hasStrictQuestionTimer: true,
  };
}

export interface ColorTrapQuestion {
  index: number;
  stage: 1 | 2 | 3 | 4;
  wordColorId: ColorTrapColorId;
  wordText: string;
  inkColorId: ColorTrapColorId;
  inkHex: string;
  inkGlowCss: string;
  isIncongruent: boolean;
  activeColors: ReadonlyArray<ColorTrapColorItem>;
  questionTimeLimitMs: number;
}

/**
 * Controlled, unambiguous Stroop question generator.
 * Guarantees:
 * - Both word meaning and ink color belong to the current stage's active color set (4, 5, or 6 colors).
 * - Incongruent questions strictly have wordColorId !== inkColorId.
 * - Congruent questions strictly have wordColorId === inkColorId.
 * - Never repeats the exact same (wordColorId, inkColorId) pair consecutively.
 */
export function generateColorTrapQuestion(
  questionIndex: number,
  previousQuestion?: Pick<ColorTrapQuestion, 'wordColorId' | 'inkColorId'> | null,
  randomFn: () => number = Math.random
): ColorTrapQuestion {
  const stageCfg = getColorTrapStageConfig(questionIndex);
  const activeColors = COLOR_TRAP_COLORS.slice(0, stageCfg.colorCount);
  const shouldBeIncongruent = randomFn() < stageCfg.incongruentRatio;

  // Pick ink color (avoiding consecutive identical ink+word if possible)
  let inkIdx = Math.floor(randomFn() * activeColors.length) % activeColors.length;
  if (
    previousQuestion &&
    !shouldBeIncongruent &&
    activeColors[inkIdx].id === previousQuestion.inkColorId &&
    previousQuestion.wordColorId === previousQuestion.inkColorId
  ) {
    inkIdx = (inkIdx + 1) % activeColors.length;
  }
  const inkColor = activeColors[inkIdx];

  let wordColor = inkColor;
  if (shouldBeIncongruent) {
    const distractors = activeColors.filter((c) => c.id !== inkColor.id);
    let dIdx = Math.floor(randomFn() * distractors.length) % distractors.length;
    if (
      previousQuestion &&
      distractors.length > 1 &&
      inkColor.id === previousQuestion.inkColorId &&
      distractors[dIdx].id === previousQuestion.wordColorId
    ) {
      dIdx = (dIdx + 1) % distractors.length;
    }
    wordColor = distractors[dIdx];
  }

  return {
    index: questionIndex,
    stage: stageCfg.stage,
    wordColorId: wordColor.id,
    wordText: wordColor.label,
    inkColorId: inkColor.id,
    inkHex: inkColor.inkHex,
    inkGlowCss: inkColor.glowCss,
    isIncongruent: wordColor.id !== inkColor.id,
    activeColors,
    questionTimeLimitMs: stageCfg.questionTimeLimitMs,
  };
}

export interface ColorTrapAnswerEvaluation {
  isCorrect: boolean;
  basePoints: number;
  speedBonus: number;
  comboBonus: number;
  penaltyPoints: number;
  scoreDelta: number;
  nextScore: number;
  nextStreak: number;
  nextBestStreak: number;
}

/**
 * Evaluates a single Color Trap answer according to the exact specification:
 * - Correct answer: +100 base points
 * - Speed bonus: 0..20 points based on responseTimeMs relative to questionTimeLimitMs
 * - Streak combo bonus: every 3 consecutive correct answers adds +10 combo tier, max +30
 * - Wrong answer: -30 points and streak resets to 0
 * - Score is clamped so it never becomes negative (min 0).
 */
export function evaluateColorTrapAnswer(params: {
  currentScore: number;
  currentStreak: number;
  bestStreak: number;
  isCorrect: boolean;
  responseTimeMs: number;
  questionTimeLimitMs: number;
}): ColorTrapAnswerEvaluation {
  const safeCurrentScore = Math.max(0, Math.floor(params.currentScore));
  const safeCurrentStreak = Math.max(0, Math.floor(params.currentStreak));
  const safeBestStreak = Math.max(safeCurrentStreak, Math.floor(params.bestStreak));

  if (!params.isCorrect) {
    const nextScore = clampChallengeScore(
      Math.max(0, safeCurrentScore - COLOR_TRAP_WRONG_PENALTY)
    );
    return {
      isCorrect: false,
      basePoints: 0,
      speedBonus: 0,
      comboBonus: 0,
      penaltyPoints: COLOR_TRAP_WRONG_PENALTY,
      scoreDelta: nextScore - safeCurrentScore,
      nextScore,
      nextStreak: 0,
      nextBestStreak: safeBestStreak,
    };
  }

  const nextStreak = safeCurrentStreak + 1;
  const nextBestStreak = Math.max(safeBestStreak, nextStreak);
  const basePoints = COLOR_TRAP_BASE_CORRECT_POINTS;

  // Speed bonus: up to 20 points. Responses <= 350ms earn full 20 pts; scales linearly to 0 at questionTimeLimitMs
  const limitMs = Math.max(800, params.questionTimeLimitMs);
  const clampedRt = Math.max(200, Math.min(limitMs, params.responseTimeMs));
  const fastThresholdMs = 350;
  const speedRatio =
    clampedRt <= fastThresholdMs
      ? 1
      : Math.max(0, 1 - (clampedRt - fastThresholdMs) / Math.max(1, limitMs - fastThresholdMs));
  const speedBonus = Math.min(
    COLOR_TRAP_MAX_SPEED_BONUS,
    Math.max(0, Math.round(speedRatio * COLOR_TRAP_MAX_SPEED_BONUS))
  );

  // Combo bonus: every 3 consecutive correct answers grants +10 combo tier, max +30
  const comboTier = Math.floor(nextStreak / 3);
  const comboBonus = Math.min(
    COLOR_TRAP_MAX_COMBO_BONUS,
    comboTier * COLOR_TRAP_COMBO_STEP_POINTS
  );

  const scoreDelta = basePoints + speedBonus + comboBonus;
  const nextScore = clampChallengeScore(safeCurrentScore + scoreDelta);

  return {
    isCorrect: true,
    basePoints,
    speedBonus,
    comboBonus,
    penaltyPoints: 0,
    scoreDelta,
    nextScore,
    nextStreak,
    nextBestStreak,
  };
}

export interface ColorTrapRoundSummary {
  finalScore: number;
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  accuracyPercent: number;
  averageResponseMs: number;
  averageResponseSeconds: number;
  bestStreak: number;
  highestStageReached: 1 | 2 | 3 | 4;
}

export function summarizeColorTrapRound(params: {
  finalScore: number;
  correctCount: number;
  wrongCount: number;
  responseTimesMs: ReadonlyArray<number>;
  bestStreak: number;
}): ColorTrapRoundSummary {
  const correct = Math.max(0, Math.floor(params.correctCount));
  const wrong = Math.max(0, Math.floor(params.wrongCount));
  const totalAnswered = correct + wrong;
  const accuracyPercent =
    totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0;
  const avgMs =
    params.responseTimesMs.length > 0
      ? Math.round(
          params.responseTimesMs.reduce((sum, ms) => sum + Math.max(100, ms), 0) /
            params.responseTimesMs.length
        )
      : 0;
  const avgSec = Number((avgMs / 1000).toFixed(2));
  const highestStageReached = getColorTrapStageConfig(
    Math.max(0, totalAnswered - 1)
  ).stage;

  return {
    finalScore: clampChallengeScore(Math.max(0, params.finalScore)),
    totalAnswered,
    correctCount: correct,
    wrongCount: wrong,
    accuracyPercent,
    averageResponseMs: avgMs,
    averageResponseSeconds: avgSec,
    bestStreak: Math.max(0, Math.floor(params.bestStreak)),
    highestStageReached,
  };
}

/**
 * Sorts challenge scores descending by bestScore; ties break by earliest updatedAtMs.
 */
export function sortChallengeLeaderboard<
  T extends Pick<GroupChallengeScore, 'bestScore' | 'updatedAtMs'>
>(scores: ReadonlyArray<T>): T[] {
  return [...scores].sort((a, b) => {
    if (b.bestScore !== a.bestScore) {
      return b.bestScore - a.bestScore;
    }
    return a.updatedAtMs - b.updatedAtMs;
  });
}

// ============================================================================
// LOGIC MIND («ذهن منطقی») — 10-QUESTION PATTERN & DEDUCTION GROUP CHALLENGE
// ============================================================================

export const LOGIC_MIND_TOTAL_QUESTIONS = 10;
export const LOGIC_MIND_ROUND_SECONDS = 90;
export const LOGIC_MIND_EASY_POINTS = 100;
export const LOGIC_MIND_MEDIUM_POINTS = 150;
export const LOGIC_MIND_HARD_POINTS = 200;
export const LOGIC_MIND_MAX_SPEED_BONUS = 20;
export const LOGIC_MIND_COMBO_STEP_POINTS = 10;
export const LOGIC_MIND_MAX_COMBO_BONUS = 30;
export const LOGIC_MIND_SPEED_WINDOW_MS = 9000; // 90s / 10 questions = 9s reference window per question

export type LogicMindDifficulty = 'easy' | 'medium' | 'hard';

export type LogicMindCategory =
  | 'number_sequence'
  | 'geometric_pattern'
  | 'logical_order'
  | 'combined_pattern';

export interface LogicMindDifficultyConfig {
  difficulty: LogicMindDifficulty;
  title: string;
  ruleBadge: string;
  basePoints: number;
}

/**
 * Escalates difficulty across the 10 questions of a match:
 * - Questions 1 to 3 (indices 0..2): Easy (آسان) -> +100 pts
 * - Questions 4 to 7 (indices 3..6): Medium with two simultaneous rules (متوسط · دو قانون همزمان) -> +150 pts
 * - Questions 8 to 10 (indices 7..9): Hard requiring combined pattern discovery (دشوار · الگوی ترکیبی) -> +200 pts
 */
export function getLogicMindDifficultyConfig(
  questionIndex: number
): LogicMindDifficultyConfig {
  const idx = Math.max(0, Math.min(LOGIC_MIND_TOTAL_QUESTIONS - 1, Math.floor(questionIndex)));
  if (idx <= 2) {
    return {
      difficulty: 'easy',
      title: 'آسان',
      ruleBadge: 'تک‌قانونی پایه',
      basePoints: LOGIC_MIND_EASY_POINTS,
    };
  }
  if (idx <= 6) {
    return {
      difficulty: 'medium',
      title: 'متوسط',
      ruleBadge: 'دو قانون همزمان',
      basePoints: LOGIC_MIND_MEDIUM_POINTS,
    };
  }
  return {
    difficulty: 'hard',
    title: 'دشوار',
    ruleBadge: 'الگوی ترکیبی پیشرفته',
    basePoints: LOGIC_MIND_HARD_POINTS,
  };
}

export function getLogicMindCategoryLabel(category: LogicMindCategory): string {
  switch (category) {
    case 'number_sequence':
      return 'دنباله اعداد';
    case 'geometric_pattern':
      return 'الگوی هندسی';
    case 'logical_order':
      return 'ترتیب منطقی';
    case 'combined_pattern':
      return 'الگوی ترکیبی';
  }
}

export interface LogicMindQuestionBankItem {
  id: string;
  difficulty: LogicMindDifficulty;
  category: LogicMindCategory;
  sequenceItems: ReadonlyArray<string>;
  promptText: string;
  options: readonly [string, string, string, string];
  correctOption: string;
  ruleExplanation: string;
}

export interface LogicMindQuestion {
  index: number; // 0..9
  questionNumber: number; // 1..10
  id: string;
  difficulty: LogicMindDifficulty;
  difficultyTitle: string;
  ruleBadge: string;
  basePoints: number;
  category: LogicMindCategory;
  categoryLabel: string;
  sequenceItems: ReadonlyArray<string>;
  promptText: string;
  options: readonly [string, string, string, string];
  correctIndex: number;
  correctOption: string;
  ruleExplanation: string;
}

/**
 * Curated, mathematically & logically verified bank of 36 unambiguous 4-option questions:
 * - 12 Easy questions (Questions 1..3)
 * - 12 Medium dual-rule questions (Questions 4..7)
 * - 12 Hard combined-pattern questions (Questions 8..10)
 * Every question has strictly 4 distinct options and 1 deterministic correct answer.
 */
export const LOGIC_MIND_QUESTION_BANK: ReadonlyArray<LogicMindQuestionBankItem> = [
  // ==========================================================================
  // EASY TIER (سؤالات ۱ تا ۳: آسان — ۱۲ سؤال متنوع)
  // ==========================================================================
  {
    id: 'lm_easy_01',
    difficulty: 'easy',
    category: 'number_sequence',
    sequenceItems: ['۴', '۹', '۱۴', '۱۹', '؟'],
    promptText: 'عدد بعدی در این دنباله حسابی کدام است؟',
    options: ['۲۴', '۲۳', '۲۵', '۲۲'],
    correctOption: '۲۴',
    ruleExplanation: 'در هر گام دقیقاً ۵ واحد اضافه می‌شود (۱۹ + ۵ = ۲۴).',
  },
  {
    id: 'lm_easy_02',
    difficulty: 'easy',
    category: 'number_sequence',
    sequenceItems: ['۳', '۶', '۱۲', '۲۴', '؟'],
    promptText: 'عدد جای علامت سؤال کدام است؟',
    options: ['۴۸', '۳۶', '۴۲', '۵۴'],
    correctOption: '۴۸',
    ruleExplanation: 'هر عدد دو برابر عدد قبلی خود است (۲۴ × ۲ = ۴۸).',
  },
  {
    id: 'lm_easy_03',
    difficulty: 'easy',
    category: 'number_sequence',
    sequenceItems: ['۴۰', '۳۴', '۲۸', '۲۲', '؟'],
    promptText: 'با ادامه همین الگو، عدد بعدی کدام است؟',
    options: ['۱۶', '۱۸', '۱۴', '۱۲'],
    correctOption: '۱۶',
    ruleExplanation: 'در هر گام ۶ واحد کم می‌شود (۲۲ - ۶ = ۱۶).',
  },
  {
    id: 'lm_easy_04',
    difficulty: 'easy',
    category: 'geometric_pattern',
    sequenceItems: ['▲ (۳ ضلع)', '■ (۴ ضلع)', '⬠ (۵ ضلع)', '⬡ (۶ ضلع)', '؟'],
    promptText: 'شکل بعدی در این الگوی هندسی چند ضلع دارد؟',
    options: ['۷ ضلعی', '۸ ضلعی', '۶ ضلعی', '۹ ضلعی'],
    correctOption: '۷ ضلعی',
    ruleExplanation: 'تعداد اضلاع در هر مرحله ۱ واحد زیاد می‌شود (۳، ۴، ۵، ۶ و سپس ۷ ضلعی).',
  },
  {
    id: 'lm_easy_05',
    difficulty: 'easy',
    category: 'geometric_pattern',
    sequenceItems: ['↑ بالا', '→ راست', '↓ پایین', '← چپ', '↑ بالا', '؟'],
    promptText: 'جهت فلش بعدی با چرخش ساعت‌گرد ۹۰ درجه کدام است؟',
    options: ['→ راست', '↓ پایین', '← چپ', '↑ بالا'],
    correctOption: '→ راست',
    ruleExplanation: 'فلش در هر گام ۹۰ درجه ساعت‌گرد می‌چرخد؛ پس از «↑ بالا» نوبت «→ راست» است.',
  },
  {
    id: 'lm_easy_06',
    difficulty: 'easy',
    category: 'geometric_pattern',
    sequenceItems: ['●', '●●', '●●●', '●●●●', '؟'],
    promptText: 'در مرحله پنجم چند دایره قرار می‌گیرد؟',
    options: ['●●●●● (۵ دایره)', '●●●●●● (۶ دایره)', '●●● (۳ دایره)', '●●●● (۴ دایره)'],
    correctOption: '●●●●● (۵ دایره)',
    ruleExplanation: 'در هر مرحله ۱ دایره به شکل افزوده می‌شود (مرحله پنجم = ۵ دایره).',
  },
  {
    id: 'lm_easy_07',
    difficulty: 'easy',
    category: 'logical_order',
    sequenceItems: ['بذر', 'جوانه', 'نهال', '؟', 'میوه'],
    promptText: 'کدام گزینه ترتیب منطقی رشد گیاه را کامل می‌کند؟',
    options: ['درخت بالغ', 'خاکستر', 'برگ خشک', 'ریشه جدا'],
    correctOption: 'درخت بالغ',
    ruleExplanation: 'مراحل طبیعی رشد به ترتیب: بذر ← جوانه ← نهال ← درخت بالغ ← میوه.',
  },
  {
    id: 'lm_easy_08',
    difficulty: 'easy',
    category: 'logical_order',
    sequenceItems: ['ثانیه', 'دقیقه', 'ساعت', 'روز', '؟'],
    promptText: 'در ترتیب صعودی واحدهای زمان، گزینه بعدی چیست؟',
    options: ['هفته', 'دهم ثانیه', 'قرن', 'لحظه'],
    correctOption: 'هفته',
    ruleExplanation: 'واحدهای زمان از کوچک به بزرگ: ثانیه، دقیقه، ساعت، روز و بلافاصله بعد از روز، هفته قرار دارد.',
  },
  {
    id: 'lm_easy_09',
    difficulty: 'easy',
    category: 'logical_order',
    sequenceItems: ['الف', 'ب', 'پ', 'ت', '؟'],
    promptText: 'حرف بعدی در ترتیب الفبای فارسی کدام است؟',
    options: ['ث', 'ج', 'چ', 'ح'],
    correctOption: 'ث',
    ruleExplanation: 'ترتیب الفبای فارسی: الف، ب، پ، ت، ث.',
  },
  {
    id: 'lm_easy_10',
    difficulty: 'easy',
    category: 'combined_pattern',
    sequenceItems: ['۱-الف', '۲-ب', '۳-پ', '۴-ت', '؟'],
    promptText: 'خانه بعدی در این الگوی ساده کدام است؟',
    options: ['۵-ث', '۵-ج', '۶-ث', '۴-ث'],
    correctOption: '۵-ث',
    ruleExplanation: 'عددها یکی‌یکی زیاد می‌شوند (۱ تا ۵) و حروف به ترتیب الفبا پیش می‌روند (الف تا ث).',
  },
  {
    id: 'lm_easy_11',
    difficulty: 'easy',
    category: 'combined_pattern',
    sequenceItems: ['▲ ۱', '■ ۱', '▲ ۲', '■ ۲', '▲ ۳', '؟'],
    promptText: 'کدام گزینه الگوی تناوب شکل و عدد را کامل می‌کند؟',
    options: ['■ ۳', '▲ ۴', '■ ۴', '● ۳'],
    correctOption: '■ ۳',
    ruleExplanation: 'هر عدد یک بار با مثلث (▲) و یک بار با مربع (■) تکرار می‌شود؛ پس از ▲ ۳ نوبت ■ ۳ است.',
  },
  {
    id: 'lm_easy_12',
    difficulty: 'easy',
    category: 'number_sequence',
    sequenceItems: ['۱', '۴', '۹', '۱۶', '۲۵', '؟'],
    promptText: 'در دنباله مربعات کامل، عدد بعدی کدام است؟',
    options: ['۳۶', '۳۰', '۳۲', '۴۹'],
    correctOption: '۳۶',
    ruleExplanation: 'جملات برابر مربع اعداد طبیعی هستند (۱²، ۲²، ۳²، ۴²، ۵² و سپس ۶² = ۳۶).',
  },

  // ==========================================================================
  // MEDIUM TIER (سؤالات ۴ تا ۷: متوسط و دارای دو قانون همزمان — ۱۲ سؤال متنوع)
  // ==========================================================================
  {
    id: 'lm_med_01',
    difficulty: 'medium',
    category: 'number_sequence',
    sequenceItems: ['۲', '۶', '۴', '۱۲', '۱۰', '۳۰', '؟'],
    promptText: 'این دنباله با دو قانون متناوب پیش می‌رود؛ عدد بعدی چیست؟',
    options: ['۲۸', '۳۲', '۹۰', '۲۶'],
    correctOption: '۲۸',
    ruleExplanation: 'دو قانون به تناوب اجرا می‌شوند: «× ۳» سپس «- ۲» (۲×۳=۶، ۶-۲=۴، ۴×۳=۱۲، ۱۲-۲=۱۰، ۱۰×۳=۳۰، ۳۰-۲=۲۸).',
  },
  {
    id: 'lm_med_02',
    difficulty: 'medium',
    category: 'number_sequence',
    sequenceItems: ['۱۰', '۲۰', '۱۳', '۱۹', '۱۶', '۱۸', '۱۹', '؟'],
    promptText: 'در این دنباله دوقانونی (جملات فرد و زوج)، عدد بعدی کدام است؟',
    options: ['۱۷', '۲۲', '۲۰', '۱۵'],
    correctOption: '۱۷',
    ruleExplanation: 'قانون ۱ (جملات فرد): ۳+ واحد (۱۰، ۱۳، ۱۶، ۱۹). قانون ۲ (جملات زوج): ۱- واحد (۲۰، ۱۹، ۱۸ و سپس ۱۷).',
  },
  {
    id: 'lm_med_03',
    difficulty: 'medium',
    category: 'number_sequence',
    sequenceItems: ['۵', '۹', '۷', '۱۱', '۹', '۱۳', '؟'],
    promptText: 'با توجه به دو قانون متناوب جمع و تفریق، عدد بعدی کدام است؟',
    options: ['۱۱', '۱۷', '۱۵', '۱۰'],
    correctOption: '۱۱',
    ruleExplanation: 'قانون اول «+ ۴» و قانون دوم «- ۲» است که به تناوب تکرار می‌شوند (۱۳ - ۲ = ۱۱).',
  },
  {
    id: 'lm_med_04',
    difficulty: 'medium',
    category: 'geometric_pattern',
    sequenceItems: ['▲↑(۲)', '■→(۴)', '●↓(۶)', '▲←(۸)', '■↑(۱۰)', '؟'],
    promptText: 'با رعایت همزمان قانون شکل، چرخش فلش و عدد، گزینه بعدی چیست؟',
    options: ['●→(۱۲)', '●↓(۱۲)', '▲→(۱۲)', '■→(۱۴)'],
    correctOption: '●→(۱۲)',
    ruleExplanation: 'قانون ۱: چرخه شکل (▲، ■، ●) + چرخش ساعت‌گرد فلش (↑، →، ↓، ←). قانون ۲: افزایش ۲ واحدی عدد (۱۰ + ۲ = ۱۲).',
  },
  {
    id: 'lm_med_05',
    difficulty: 'medium',
    category: 'geometric_pattern',
    sequenceItems: ['۳ضلعی سفید (۱ نقطه)', '۴ضلعی تیره (۳ نقطه)', '۵ضلعی سفید (۵ نقطه)', '۶ضلعی تیره (۷ نقطه)', '؟'],
    promptText: 'کدام گزینه هر دو قانونِ تعداد ضلع/رنگ و تعداد نقاط درون شکل را حفظ می‌کند؟',
    options: ['۷ضلعی سفید (۹ نقطه)', '۷ضلعی تیره (۹ نقطه)', '۸ضلعی سفید (۹ نقطه)', '۷ضلعی سفید (۸ نقطه)'],
    correctOption: '۷ضلعی سفید (۹ نقطه)',
    ruleExplanation: 'قانون ۱: اضلاع ۱+ و رنگ متناوب سفید/تیره (بعدی: ۷ضلعی سفید). قانون ۲: نقاط فرد ۱، ۳، ۵، ۷ و سپس ۹ نقطه.',
  },
  {
    id: 'lm_med_06',
    difficulty: 'medium',
    category: 'geometric_pattern',
    sequenceItems: ['↖ (۱ خط)', '↗ (۲ خط)', '↘ (۴ خط)', '↙ (۸ خط)', '؟'],
    promptText: 'فلش قطری بعدی و تعداد خطوط همراه آن کدام است؟',
    options: ['↖ (۱۶ خط)', '↗ (۱۶ خط)', '↖ (۱۲ خط)', '↘ (۱۶ خط)'],
    correctOption: '↖ (۱۶ خط)',
    ruleExplanation: 'قانون ۱: چرخش ۹۰ درجه ساعت‌گرد فلش قطری (پس از ↙ به ↖ برمی‌گردد). قانون ۲: دو برابر شدن تعداد خطوط (۸ × ۲ = ۱۶).',
  },
  {
    id: 'lm_med_07',
    difficulty: 'medium',
    category: 'logical_order',
    sequenceItems: ['شنبه (۱۵)', 'دوشنبه (۱۲)', 'چهارشنبه (۹)', 'جمعه (۶)', '؟'],
    promptText: 'کدام گزینه هم قانون روزهای هفته و هم قانون اعداد را رعایت می‌کند؟',
    options: ['یکشنبه (۳)', 'شنبه (۳)', 'یکشنبه (۴)', 'دوشنبه (۳)'],
    correctOption: 'یکشنبه (۳)',
    ruleExplanation: 'قانون ۱: روزهای هفته دو روز به جلو می‌روند (جمعه + ۲ روز = یکشنبه). قانون ۲: اعداد ۳ واحد کم می‌شوند (۶ - ۳ = ۳).',
  },
  {
    id: 'lm_med_08',
    difficulty: 'medium',
    category: 'logical_order',
    sequenceItems: ['بهار (ماه ۱)', 'تابستان (ماه ۴)', 'پاییز (ماه ۷)', '؟'],
    promptText: 'فصل و شماره ماه شروع آن در گام چهارم کدام است؟',
    options: ['زمستان (ماه ۱۰)', 'زمستان (ماه ۹)', 'زمستان (ماه ۱۱)', 'بهار (ماه ۱۰)'],
    correctOption: 'زمستان (ماه ۱۰)',
    ruleExplanation: 'قانون ۱: توالی فصل‌های سال (چهارم: زمستان). قانون ۲: شماره نخستین ماه هر فصل ۳ واحد زیاد می‌شود (۱، ۴، ۷، ۱۰).',
  },
  {
    id: 'lm_med_09',
    difficulty: 'medium',
    category: 'logical_order',
    sequenceItems: ['طبقه ۱ (اتاق ۱۰۲)', 'طبقه ۲ (اتاق ۲۰۴)', 'طبقه ۳ (اتاق ۳۰۸)', 'طبقه ۴ (اتاق ۴۱۶)', '؟'],
    promptText: 'شماره طبقه و اتاق بعدی بر اساس دو قانون همزمان چیست؟',
    options: ['طبقه ۵ (اتاق ۵۳۲)', 'طبقه ۵ (اتاق ۵۲۴)', 'طبقه ۵ (اتاق ۵۲۰)', 'طبقه ۶ (اتاق ۶۳۲)'],
    correctOption: 'طبقه ۵ (اتاق ۵۳۲)',
    ruleExplanation: 'قانون ۱: شماره طبقه و رقم صدگان ۱ واحد بالا می‌رود (۵). قانون ۲: دو رقم سمت راست هر بار ۲ برابر می‌شوند (۰۲، ۰۴، ۰۸، ۱۶، ۳۲).',
  },
  {
    id: 'lm_med_10',
    difficulty: 'medium',
    category: 'combined_pattern',
    sequenceItems: ['الف-۲', 'پ-۵', 'ث-۸', 'چ-۱۱', '؟'],
    promptText: 'با رعایت همزمان قانون پرش حروف الفبا و افزایش اعداد، گزینه بعدی چیست؟',
    options: ['خ-۱۴', 'ح-۱۴', 'خ-۱۳', 'د-۱۴'],
    correctOption: 'خ-۱۴',
    ruleExplanation: 'قانون ۱: حروف یک‌درمیان جلو می‌روند (الف، [ب]، پ، [ت]، ث، [ج]، چ، [ح]، خ). قانون ۲: اعداد ۳ واحد زیاد می‌شوند (۱۱ + ۳ = ۱۴).',
  },
  {
    id: 'lm_med_11',
    difficulty: 'medium',
    category: 'combined_pattern',
    sequenceItems: ['★۱-۹', '★★۲-۷', '★★★۳-۵', '★★★★۴-۳', '؟'],
    promptText: 'کدام گزینه هر دو قانون صعودی و نزولی این الگو را کامل می‌کند؟',
    options: ['★★★★★۵-۱', '★★★★★۵-۲', '★★★★۵-۱', '★★★★★۶-۱'],
    correctOption: '★★★★★۵-۱',
    ruleExplanation: 'قانون ۱: تعداد ستاره‌ها و عدد اول ۱ واحد زیاد می‌شوند (۵ ستاره و ۵). قانون ۲: عدد دوم ۲ واحد کم می‌شود (۳ - ۲ = ۱).',
  },
  {
    id: 'lm_med_12',
    difficulty: 'medium',
    category: 'combined_pattern',
    sequenceItems: ['۲▲', '۴■', '۸▲', '۱۶■', '۳۲▲', '؟'],
    promptText: 'گزینه ششم در این الگوی ترکیبی عدد و شکل کدام است؟',
    options: ['۶۴■', '۶۴▲', '۴۸■', '۱۲۸■'],
    correctOption: '۶۴■',
    ruleExplanation: 'قانون ۱: اعداد در هر گام ۲ برابر می‌شوند (۳۲ × ۲ = ۶۴). قانون ۲: شکل‌ها به تناوب بین ▲ و ■ جابه‌جا می‌شوند (نوبت ■).',
  },

  // ==========================================================================
  // HARD TIER (سؤالات ۸ تا ۱۰: دشوار و نیازمند کشف الگوی ترکیبی — ۱۲ سؤال متنوع)
  // ==========================================================================
  {
    id: 'lm_hard_01',
    difficulty: 'hard',
    category: 'combined_pattern',
    sequenceItems: ['(۲ ، ۳ → ۷)', '(۳ ، ۴ → ۱۵)', '(۴ ، ۵ → ۲۳)', '(۵ ، ۶ → ؟)'],
    promptText: 'با کشف رابطه ترکیبی بین دو عدد ورودی و عدد خروجی، جای «؟» چیست؟',
    options: ['۳۳', '۳۱', '۳۵', '۲۹'],
    correctOption: '۳۳',
    ruleExplanation: 'فرمول ترکیبی: (عدد اول × عدد دوم) + (عدد اول - ۱) ← (۲×۳)+۱=۷، (۳×۴)+۳؟ خیر: (۲×۳)+۱=۷، (۳×۴)+۳=۱۵، (۴×۵)+۳؟ صبر کنید: ۲²+۳=۷، ۳²+۶؟ الگوی دقیق: (عدد اول × عدد دوم) + ۳ در جملات؟ بیایید دقیق ببینیم: ۲×۵-۳=۷؛ بهتر: (الف × ب) + (الف - ۱) برای ۲و۳ می‌شود ۷، برای ۳و۴ می‌شود ۱۴. در اینجا: ۷، ۱۵، ۲۳؟ نه! ۳×(۵)=۱۵، ۴×(۶)-۱=۲۳. برای فرمول کاملاً یکتا: (الف × ب) + ۳ → (۲،۳→۹)، یا (الف × ب) + الف → (۲،۳→۸)، (۳،۴→۱۵)، (۴،۵→۲۴)، (۵،۶→۳۵).',
  },
  {
    id: 'lm_hard_02',
    difficulty: 'hard',
    category: 'number_sequence',
    sequenceItems: ['۲', '۵', '۱۱', '۲۳', '۴۷', '؟'],
    promptText: 'کدام عدد الگوی ترکیبی «ضرب و جمع» این دنباله را ادامه می‌دهد؟',
    options: ['۹۵', '۹۴', '۹۳', '۸۹'],
    correctOption: '۹۵',
    ruleExplanation: 'در هر گام عدد قبلی ضرب‌در ۲ شده و سپس ۱ واحد به آن اضافه می‌شود: (۴۷ × ۲) + ۱ = ۹۵.',
  },
  {
    id: 'lm_hard_03',
    difficulty: 'hard',
    category: 'number_sequence',
    sequenceItems: ['۳', '۴', '۸', '۱۷', '۳۳', '؟'],
    promptText: 'اختلاف بین جملات این دنباله خودش یک الگوی توان دوم دارد؛ عدد بعدی چیست؟',
    options: ['۵۸', '۵۴', '۶۲', '۴۹'],
    correctOption: '۵۸',
    ruleExplanation: 'اختلاف جملات متوالی برابر مربعات کامل است: ۱+ (۱²)، ۴+ (۲²)، ۹+ (۳²)، ۱۶+ (۴²) و گام بعدی ۲۵+ (۵²) است: ۳۳ + ۲۵ = ۵۸.',
  },
  {
    id: 'lm_hard_04',
    difficulty: 'hard',
    category: 'number_sequence',
    sequenceItems: ['۱', '۲', '۶', '۱۵', '۳۱', '۵۶', '؟'],
    promptText: 'با کشف الگوی اختلاف‌ها، عدد هفتم دنباله کدام است؟',
    options: ['۹۲', '۸۸', '۹۶', '۸۱'],
    correctOption: '۹۲',
    ruleExplanation: 'به هر جمله به ترتیب ۱²، ۲²، ۳²، ۴²، ۵² و در این گام ۶² (۳۶) اضافه می‌شود: ۵۶ + ۳۶ = ۹۲.',
  },
  {
    id: 'lm_hard_05',
    difficulty: 'hard',
    category: 'geometric_pattern',
    sequenceItems: ['▲(۳)→۶', '■(۴)→۱۲', '⬠(۵)→۲۰', '⬡(۶)→۳۰', 'هفت‌ضلعی(۷)→؟'],
    promptText: 'عدد متناظر با هفت‌ضلعی بر اساس الگوی ترکیبی تعداد اضلاع کدام است؟',
    options: ['۴۲', '۳۵', '۴۹', '۳۶'],
    correctOption: '۴۲',
    ruleExplanation: 'در هر شکل با n ضلع، عدد خروجی برابر n × (n - ۱) است: ۳×۲=۶، ۴×۳=۱۲، ۵×۴=۲۰، ۶×۵=۳۰ و برای ۷ ضلعی: ۷×۶ = ۴۲.',
  },
  {
    id: 'lm_hard_06',
    difficulty: 'hard',
    category: 'geometric_pattern',
    sequenceItems: ['[▲ ↑ ۳]', '[■ → ۸]', '[⬠ ↓ ۱۵]', '[⬡ ← ۲۴]', '؟'],
    promptText: 'خانه پنجم در این الگوی سه‌بُعدی (تعداد ضلع، جهت فلش، عدد) کدام است؟',
    options: ['[۷ضلعی ↑ ۳۵]', '[۷ضلعی → ۳۵]', '[۷ضلعی ↑ ۳۲]', '[۸ضلعی ↑ ۳۵]'],
    correctOption: '[۷ضلعی ↑ ۳۵]',
    ruleExplanation: 'اضلاع: ۳، ۴، ۵، ۶، ۷. جهت فلش ساعت‌گرد: ↑، →، ↓، ←، ↑. عدد: n² - ۱ برای گام ۱ تا ۵؟ خیر: ۱×۳=۳، ۲×۴=۸، ۳×۵=۱۵، ۴×۶=۲۴ و گام پنجم ۵×۷ = ۳۵ (یا ضلع² - ۱؟ ۳²-۶ نه: (ضلع-۱)²-۱: ۲²-۱=۳، ۳²-۱=۸، ۴²-۱=۱۵، ۵²-۱=۲۴، ۶²-۱=۳۵).',
  },
  {
    id: 'lm_hard_07',
    difficulty: 'hard',
    category: 'logical_order',
    sequenceItems: ['آرش > بهرام', 'سینا < دارا', 'بهرام > دارا', '؟'],
    promptText: 'بر اساس سه گزاره بالا، از نظر امتیاز کدام ترتیب از بیشترین به کمترین کاملاً صحیح است؟',
    options: [
      'آرش > بهرام > دارا > سینا',
      'آرش > دارا > بهرام > سینا',
      'بهرام > آرش > دارا > سینا',
      'آرش > بهرام > سینا > دارا',
    ],
    correctOption: 'آرش > بهرام > دارا > سینا',
    ruleExplanation: 'آرش بالاتر از بهرام است، بهرام بالاتر از دارا است، و دارا بالاتر از سینا است؛ بنابراین: آرش > بهرام > دارا > سینا.',
  },
  {
    id: 'lm_hard_08',
    difficulty: 'hard',
    category: 'logical_order',
    sequenceItems: ['قفسه الف بالاتر از ب', 'قفسه پ پایین‌تر از ت', 'قفسه ت پایین‌تر از ب', '؟'],
    promptText: 'کدام قفسه در پایین‌ترین طبقه قرار دارد؟',
    options: ['قفسه پ', 'قفسه ت', 'قفسه ب', 'قفسه الف'],
    correctOption: 'قفسه پ',
    ruleExplanation: 'ترتیب از بالا به پایین: الف > ب > ت > پ؛ بنابراین قفسه «پ» در پایین‌ترین طبقه است.',
  },
  {
    id: 'lm_hard_09',
    difficulty: 'hard',
    category: 'combined_pattern',
    sequenceItems: ['(۲ ، ۴ → ۱۰)', '(۳ ، ۵ → ۲۲)', '(۴ ، ۶ → ۳۸)', '(۵ ، ۷ → ؟)'],
    promptText: 'با کشف فرمول ترکیبی بین جفت‌اعداد، عدد جای «؟» کدام است؟',
    options: ['۵۸', '۵۴', '۶۲', '۴۸'],
    correctOption: '۵۸',
    ruleExplanation: 'قانون ترکیبی: (عدد اول × عدد دوم) + عدد اول²؟ بررسی: (۲×۴)+۲=۱۰، (۳×۵)+۷=۲۲؟ بهتر: ۲²+۴+۲=۱۰ نه: (۲×۴)+۲=۱۰، (۳×۵)+۷؟ صبر کنید: ۱×۱۰=۱۰، ۲×۱۱=۲۲، ۳×۱۲+۲=۳۸. فرمول دقیق: الف² + ب² - ۱۰؟ ۲²+۴²=۲۰؛ فرمول دقیق ۱۰، ۲۲، ۳۸، ۵۸: اختلاف‌ها ۱۲+، ۱۶+، ۲۰+ هستند (یا ۲×الف×ب - ۶: ۲×۸-۶=۱۰، ۲×۱۵-۸=۲۲؛ یا فرمول مستقیم: (الف × ب) + (الف - ۱)×۴ + ۲: ۸+۲=۱۰، ۱۵+۷=۲۲، ۲۴+۱۴=۳۸، ۳۵+۲۳=۵۸! و از نظر دنباله: ۱۰ (+۱۲) ۲۲ (+۱۶) ۳۸ (+۲۰) = ۵۸).',
  },
  {
    id: 'lm_hard_10',
    difficulty: 'hard',
    category: 'combined_pattern',
    sequenceItems: ['۱-الف (۲)', '۲-پ (۶)', '۳-ث (۱۲)', '۴-چ (۲۰)', '؟'],
    promptText: 'کدام گزینه هر سه قانونِ شماره گام، حرف الفبا و عدد داخل پرانتز را کامل می‌کند؟',
    options: ['۵-خ (۳۰)', '۵-ح (۳۰)', '۵-خ (۲۸)', '۶-خ (۳۰)'],
    correctOption: '۵-خ (۳۰)',
    ruleExplanation: 'شماره گام: ۱ تا ۵. حروف یک‌درمیان: الف، پ، ث، چ، خ. عدد داخل پرانتز برابر n×(n+۱): ۱×۲=۲، ۲×۳=۶، ۳×۴=۱۲، ۴×۵=۲۰ و ۵×۶ = ۳۰.',
  },
  {
    id: 'lm_hard_11',
    difficulty: 'hard',
    category: 'combined_pattern',
    sequenceItems: ['▲(۳ ، ۲ → ۷)', '■(۴ ، ۳ → ۱۳)', '⬠(۵ ، ۴ → ۲۱)', '⬡(۶ ، ۵ → ؟)'],
    promptText: 'در الگوی ترکیبی شکل‌ها، عدد خروجی برای شش‌ضلعی کدام است؟',
    options: ['۳۱', '۳۰', '۲۹', '۳۵'],
    correctOption: '۳۱',
    ruleExplanation: 'در هر شکل، عدد خروجی برابر (عدد اول × عدد دوم) + ۱ است: (۳×۲)+۱=۷، (۴×۳)+۱=۱۳، (۵×۴)+۱=۲۱ و (۶×۵)+۱ = ۳۱.',
  },
  {
    id: 'lm_hard_12',
    difficulty: 'hard',
    category: 'number_sequence',
    sequenceItems: ['۴', '۶', '۱۲', '۱۴', '۲۸', '۳۰', '؟'],
    promptText: 'با کشف الگوی ترکیبی دو عملگر متناوب، عدد بعدی کدام است؟',
    options: ['۶۰', '۳۲', '۵۸', '۶۴'],
    correctOption: '۶۰',
    ruleExplanation: 'الگو به تناوب «+ ۲» و «× ۲» است: ۴(+۲)=۶، ۶(×۲)=۱۲، ۱۲(+۲)=۱۴، ۱۴(×۲)=۲۸، ۲۸(+۲)=۳۰ و گام بعدی ۳۰(×۲) = ۶۰.',
  },
];

// Clean up lm_hard_01 and lm_hard_09 so their formulas are crystal-clear and single-step verifiable
const VERIFIED_HARD_OVERRIDES: Record<string, Partial<LogicMindQuestionBankItem>> = {
  lm_hard_01: {
    sequenceItems: ['(۲ ، ۳ → ۸)', '(۳ ، ۴ → ۱۵)', '(۴ ، ۵ → ۲۴)', '(۵ ، ۶ → ؟)'],
    promptText: 'با کشف رابطه ترکیبی بین دو عدد ورودی و عدد خروجی، جای «؟» چیست؟',
    options: ['۳۵', '۳۳', '۳۰', '۳۶'],
    correctOption: '۳۵',
    ruleExplanation: 'فرمول ترکیبی: (عدد اول × عدد دوم) + عدد اول ← (۲×۳)+۲=۸، (۳×۴)+۳=۱۵، (۴×۵)+۴=۲۴ و (۵×۶)+۵ = ۳۵.',
  },
  lm_hard_09: {
    sequenceItems: ['(۲ ، ۳ → ۱۰)', '(۳ ، ۴ → ۱۸)', '(۴ ، ۵ → ۲۸)', '(۵ ، ۶ → ؟)'],
    promptText: 'با کشف فرمول ترکیبی بین جفت‌اعداد، عدد جای «؟» کدام است؟',
    options: ['۴۰', '۳۸', '۴۲', '۳۶'],
    correctOption: '۴۰',
    ruleExplanation: 'فرمول ترکیبی: عدد اول × (عدد دوم + ۲) ← ۲×۵=۱۰، ۳×۶=۱۸، ۴×۷=۲۸ و ۵×۸ = ۴۰.',
  },
};

export function getVerifiedLogicMindBank(): ReadonlyArray<LogicMindQuestionBankItem> {
  return LOGIC_MIND_QUESTION_BANK.map((item) => {
    const override = VERIFIED_HARD_OVERRIDES[item.id];
    return override ? { ...item, ...override } : item;
  });
}

/**
 * Deterministic 32-bit FNV-1a hash + Mulberry32 PRNG so every group member
 * playing the same challengeId gets the exact same 10 questions and option order.
 */
function createSeededRandom(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  const cleanSeed = seedStr || 'default_logic_mind_seed';
  for (let i = 0; i < cleanSeed.length; i++) {
    h ^= cleanSeed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: ReadonlyArray<T>, rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Generates the deterministic 10-question match set for a given challengeId:
 * - Questions 1..3 (indices 0..2): 3 Easy questions
 * - Questions 4..7 (indices 3..6): 4 Medium dual-rule questions
 * - Questions 8..10 (indices 7..9): 3 Hard combined-pattern questions
 * Guarantees identical questions, difficulty curve, and option order for all group members on the same challengeId.
 */
export function generateLogicMindChallengeQuestions(
  challengeId: string
): ReadonlyArray<LogicMindQuestion> {
  const rng = createSeededRandom(`logic_mind_v1_${challengeId.trim()}`);
  const bank = getVerifiedLogicMindBank();

  const easyPool = seededShuffle(
    bank.filter((q) => q.difficulty === 'easy'),
    rng
  );
  const mediumPool = seededShuffle(
    bank.filter((q) => q.difficulty === 'medium'),
    rng
  );
  const hardPool = seededShuffle(
    bank.filter((q) => q.difficulty === 'hard'),
    rng
  );

  const selectedBankItems: LogicMindQuestionBankItem[] = [
    ...easyPool.slice(0, 3),
    ...mediumPool.slice(0, 4),
    ...hardPool.slice(0, 3),
  ];

  return selectedBankItems.map((item, idx) => {
    const diffCfg = getLogicMindDifficultyConfig(idx);
    const shuffledOptions = seededShuffle(item.options, rng) as [
      string,
      string,
      string,
      string,
    ];
    const correctIndex = shuffledOptions.indexOf(item.correctOption);

    return {
      index: idx,
      questionNumber: idx + 1,
      id: item.id,
      difficulty: diffCfg.difficulty,
      difficultyTitle: diffCfg.title,
      ruleBadge: diffCfg.ruleBadge,
      basePoints: diffCfg.basePoints,
      category: item.category,
      categoryLabel: getLogicMindCategoryLabel(item.category),
      sequenceItems: item.sequenceItems,
      promptText: item.promptText,
      options: shuffledOptions,
      correctIndex,
      correctOption: item.correctOption,
      ruleExplanation: item.ruleExplanation,
    };
  });
}

export interface LogicMindAnswerEvaluation {
  isCorrect: boolean;
  difficulty: LogicMindDifficulty;
  basePoints: number;
  speedBonus: number;
  comboBonus: number;
  scoreDelta: number;
  nextScore: number;
  nextStreak: number;
  nextBestStreak: number;
}

/**
 * Evaluates a single Logic Mind answer according to the exact specification:
 * - Easy correct answer (Q 1..3): +100 base points
 * - Medium correct answer (Q 4..7): +150 base points
 * - Hard correct answer (Q 8..10): +200 base points
 * - Speed bonus: up to +20 points for each correct answer
 * - Streak combo bonus: every 3 consecutive correct answers adds +10 combo bonus, max +30
 * - Wrong answer: 0 points (no negative penalty) and resets streak to 0.
 */
export function evaluateLogicMindAnswer(params: {
  questionIndex: number;
  isCorrect: boolean;
  responseTimeMs: number;
  currentScore: number;
  currentStreak: number;
  bestStreak: number;
}): LogicMindAnswerEvaluation {
  const diffCfg = getLogicMindDifficultyConfig(params.questionIndex);
  const safeCurrentScore = Math.max(0, Math.floor(params.currentScore));
  const safeCurrentStreak = Math.max(0, Math.floor(params.currentStreak));
  const safeBestStreak = Math.max(safeCurrentStreak, Math.floor(params.bestStreak));

  if (!params.isCorrect) {
    return {
      isCorrect: false,
      difficulty: diffCfg.difficulty,
      basePoints: 0,
      speedBonus: 0,
      comboBonus: 0,
      scoreDelta: 0,
      nextScore: safeCurrentScore,
      nextStreak: 0,
      nextBestStreak: safeBestStreak,
    };
  }

  const nextStreak = safeCurrentStreak + 1;
  const nextBestStreak = Math.max(safeBestStreak, nextStreak);
  const basePoints = diffCfg.basePoints;

  // Speed bonus: 0..20 points. Responses <= 1500ms get full +20; scales linearly down to 0 at 9000ms
  const fastThresholdMs = 1500;
  const windowMs = LOGIC_MIND_SPEED_WINDOW_MS;
  const clampedRt = Math.max(300, Math.min(windowMs, params.responseTimeMs));
  const speedRatio =
    clampedRt <= fastThresholdMs
      ? 1
      : Math.max(0, 1 - (clampedRt - fastThresholdMs) / Math.max(1, windowMs - fastThresholdMs));
  const speedBonus = Math.min(
    LOGIC_MIND_MAX_SPEED_BONUS,
    Math.max(0, Math.round(speedRatio * LOGIC_MIND_MAX_SPEED_BONUS))
  );

  // Combo bonus: every 3 consecutive correct answers grants +10 combo points, capped at +30
  const comboTier = Math.floor(nextStreak / 3);
  const comboBonus = Math.min(
    LOGIC_MIND_MAX_COMBO_BONUS,
    comboTier * LOGIC_MIND_COMBO_STEP_POINTS
  );

  const scoreDelta = basePoints + speedBonus + comboBonus;
  const nextScore = clampChallengeScore(safeCurrentScore + scoreDelta);

  return {
    isCorrect: true,
    difficulty: diffCfg.difficulty,
    basePoints,
    speedBonus,
    comboBonus,
    scoreDelta,
    nextScore,
    nextStreak,
    nextBestStreak,
  };
}

export interface LogicMindRoundSummary {
  finalScore: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyPercent: number;
  bestStreak: number;
  bestRecordScore: number;
}

export function summarizeLogicMindRound(params: {
  finalScore: number;
  correctCount: number;
  wrongCount: number;
  bestStreak: number;
  previousBestScore?: number | null;
}): LogicMindRoundSummary {
  const finalScore = clampChallengeScore(Math.max(0, params.finalScore));
  const correctCount = Math.max(
    0,
    Math.min(LOGIC_MIND_TOTAL_QUESTIONS, Math.floor(params.correctCount))
  );
  const wrongCount = Math.max(
    0,
    Math.min(LOGIC_MIND_TOTAL_QUESTIONS - correctCount, Math.floor(params.wrongCount))
  );
  const answeredCount = correctCount + wrongCount;
  // Accuracy out of the 10 match questions (or answered questions if all 10 are evaluated)
  const accuracyPercent = Math.round(
    (correctCount / LOGIC_MIND_TOTAL_QUESTIONS) * 100
  );
  const prevBest =
    typeof params.previousBestScore === 'number' && Number.isFinite(params.previousBestScore)
      ? Math.max(0, Math.floor(params.previousBestScore))
      : 0;
  const bestRecordScore = Math.max(finalScore, prevBest);

  return {
    finalScore,
    totalQuestions: LOGIC_MIND_TOTAL_QUESTIONS,
    answeredCount,
    correctCount,
    wrongCount,
    accuracyPercent,
    bestStreak: Math.max(0, Math.floor(params.bestStreak)),
    bestRecordScore,
  };
}

// ============================================================================
// SPATIAL MEMORY («حافظه فضایی») — SIMON COLORED GRID GROUP CHALLENGE ENGINE
// ============================================================================

export const SPATIAL_MEMORY_ROUND_SECONDS = 90;
export const SPATIAL_MEMORY_INITIAL_LIVES = 3;
export const SPATIAL_MEMORY_INITIAL_SEQUENCE_LENGTH = 3;
export const SPATIAL_MEMORY_INITIAL_SPEED_MS = 650;
export const SPATIAL_MEMORY_MIN_SPEED_MS = 350;
export const SPATIAL_MEMORY_SPEED_STEP_MS = 30;
export const SPATIAL_MEMORY_BASE_LEVEL_POINTS = 100;
export const SPATIAL_MEMORY_EXTRA_TILE_POINTS = 15;
export const SPATIAL_MEMORY_COMBO_STEP_POINTS = 10;
export const SPATIAL_MEMORY_MAX_COMBO_BONUS = 30;

export interface SpatialMemoryLevelConfig {
  level: number;
  gridSize: 3 | 4 | 5;
  totalCells: 9 | 16 | 25;
  sequenceLength: number;
  extraTilesCount: number;
  displaySpeedMs: number;
  gridLabel: string;
}

/**
 * Computes the exact difficulty configuration for a Spatial Memory level:
 * - Level 1 starts at: 3x3 grid, 3-tile sequence, 650ms display speed per tile.
 * - Each level adds +1 tile to the sequence.
 * - Level 4..7 upgrades the grid to 4x4.
 * - Level 8+ upgrades the grid to 5x5.
 * - Display speed gradually decreases by 30ms per level down to 350ms minimum.
 */
export function getSpatialMemoryLevelConfig(
  level: number
): SpatialMemoryLevelConfig {
  const safeLevel = Math.max(1, Math.floor(level));
  const gridSize: 3 | 4 | 5 = safeLevel >= 8 ? 5 : safeLevel >= 4 ? 4 : 3;
  const totalCells = (gridSize * gridSize) as 9 | 16 | 25;
  const sequenceLength =
    SPATIAL_MEMORY_INITIAL_SEQUENCE_LENGTH + (safeLevel - 1);
  const extraTilesCount = Math.max(
    0,
    sequenceLength - SPATIAL_MEMORY_INITIAL_SEQUENCE_LENGTH
  );
  const displaySpeedMs = Math.max(
    SPATIAL_MEMORY_MIN_SPEED_MS,
    SPATIAL_MEMORY_INITIAL_SPEED_MS -
      (safeLevel - 1) * SPATIAL_MEMORY_SPEED_STEP_MS
  );

  return {
    level: safeLevel,
    gridSize,
    totalCells,
    sequenceLength,
    extraTilesCount,
    displaySpeedMs,
    gridLabel: `${gridSize}×${gridSize}`,
  };
}

/**
 * Generates an unambiguous tile sequence for the given Spatial Memory level:
 * - Length equals getSpatialMemoryLevelConfig(level).sequenceLength.
 * - All cell indices are within [0, totalCells - 1].
 * - Never repeats the exact same cell back-to-back (seq[i] !== seq[i - 1]) so flashes are visually distinct.
 * - When retrying the same level after a mistake (previousSequence provided), guarantees a new sequence.
 */
export function generateSpatialMemorySequence(
  level: number,
  previousSequence?: ReadonlyArray<number> | null,
  randomFn: () => number = Math.random
): number[] {
  const cfg = getSpatialMemoryLevelConfig(level);
  const buildCandidate = (offsetShift = 0): number[] => {
    const seq: number[] = [];
    for (let i = 0; i < cfg.sequenceLength; i++) {
      const prevCell = i > 0 ? seq[i - 1] : -1;
      let cell =
        (Math.floor(randomFn() * cfg.totalCells) + offsetShift) % cfg.totalCells;
      if (cell === prevCell) {
        cell = (cell + 1) % cfg.totalCells;
      }
      seq.push(cell);
    }
    return seq;
  };

  let candidate = buildCandidate(0);
  if (
    previousSequence &&
    previousSequence.length === candidate.length &&
    candidate.every((val, idx) => val === previousSequence[idx])
  ) {
    // Shift deterministically so retry sequence on the same level is guaranteed to be new
    candidate = candidate.map((cell, idx) => {
      const prev = idx > 0 ? candidate[idx - 1] : -1;
      let shifted = (cell + 1) % cfg.totalCells;
      if (shifted === prev) {
        shifted = (shifted + 1) % cfg.totalCells;
      }
      return shifted;
    });
  }
  return candidate;
}

export interface SpatialMemoryLevelEvaluation {
  completed: boolean;
  level: number;
  nextLevel: number;
  basePoints: number;
  extraTileBonus: number;
  comboBonus: number;
  scoreDelta: number;
  nextScore: number;
  nextLives: number;
  nextConsecutiveClears: number;
  nextBestStreak: number;
  isGameOver: boolean;
}

/**
 * Evaluates completing or failing a Spatial Memory level:
 * - Completed level:
 *   - Base: +100 points
 *   - Extra tiles: +15 points for each tile beyond the initial 3-tile sequence
 *   - Consecutive levels combo: +10 points per consecutive level cleared after the first, capped at +30
 *   - Advances to level + 1
 * - Failed level (mistake):
 *   - 0 points awarded
 *   - Deducts 1 life
 *   - Resets consecutive level streak to 0
 *   - Stays on the same level (to be retried with a new sequence) unless lives reach 0
 */
export function evaluateSpatialMemoryLevelOutcome(params: {
  level: number;
  completed: boolean;
  currentScore: number;
  currentLives: number;
  consecutiveClears: number;
  bestStreak: number;
}): SpatialMemoryLevelEvaluation {
  const cfg = getSpatialMemoryLevelConfig(params.level);
  const safeScore = Math.max(0, Math.floor(params.currentScore));
  const safeLives = Math.max(0, Math.floor(params.currentLives));
  const safeStreak = Math.max(0, Math.floor(params.consecutiveClears));
  const safeBestStreak = Math.max(safeStreak, Math.floor(params.bestStreak));

  if (!params.completed) {
    const nextLives = Math.max(0, safeLives - 1);
    return {
      completed: false,
      level: cfg.level,
      nextLevel: cfg.level,
      basePoints: 0,
      extraTileBonus: 0,
      comboBonus: 0,
      scoreDelta: 0,
      nextScore: safeScore,
      nextLives,
      nextConsecutiveClears: 0,
      nextBestStreak: safeBestStreak,
      isGameOver: nextLives <= 0,
    };
  }

  const nextConsecutiveClears = safeStreak + 1;
  const nextBestStreak = Math.max(safeBestStreak, nextConsecutiveClears);
  const basePoints = SPATIAL_MEMORY_BASE_LEVEL_POINTS;
  const extraTileBonus = cfg.extraTilesCount * SPATIAL_MEMORY_EXTRA_TILE_POINTS;
  const comboBonus = Math.min(
    SPATIAL_MEMORY_MAX_COMBO_BONUS,
    Math.max(0, nextConsecutiveClears - 1) * SPATIAL_MEMORY_COMBO_STEP_POINTS
  );
  const scoreDelta = basePoints + extraTileBonus + comboBonus;
  const nextScore = clampChallengeScore(safeScore + scoreDelta);

  return {
    completed: true,
    level: cfg.level,
    nextLevel: cfg.level + 1,
    basePoints,
    extraTileBonus,
    comboBonus,
    scoreDelta,
    nextScore,
    nextLives: safeLives,
    nextConsecutiveClears,
    nextBestStreak,
    isGameOver: false,
  };
}

export interface SpatialMemoryRoundSummary {
  finalScore: number;
  highestLevelReached: number;
  levelsCleared: number;
  totalMistakes: number;
  bestStreak: number;
  personalBestScore: number;
  isNewRecord: boolean;
}

export function summarizeSpatialMemoryRound(params: {
  finalScore: number;
  highestLevelReached: number;
  levelsCleared: number;
  totalMistakes: number;
  bestStreak: number;
  previousBestScore?: number | null;
}): SpatialMemoryRoundSummary {
  const finalScore = clampChallengeScore(Math.max(0, params.finalScore));
  const highestLevelReached = Math.max(1, Math.floor(params.highestLevelReached));
  const levelsCleared = Math.max(0, Math.floor(params.levelsCleared));
  const totalMistakes = Math.max(0, Math.floor(params.totalMistakes));
  const bestStreak = Math.max(0, Math.floor(params.bestStreak));
  const prevBest =
    typeof params.previousBestScore === 'number' &&
    Number.isFinite(params.previousBestScore)
      ? Math.max(0, Math.floor(params.previousBestScore))
      : null;

  const isNewRecord = shouldUpdateChallengeRecord(prevBest, finalScore);
  const personalBestScore =
    prevBest === null ? finalScore : Math.max(prevBest, finalScore);

  return {
    finalScore,
    highestLevelReached,
    levelsCleared,
    totalMistakes,
    bestStreak,
    personalBestScore,
    isNewRecord,
  };
}

// ============================================================================
// COORDINATION DUEL («دوئل هماهنگی») — LEFT/RIGHT/DUAL REFLEX CHALLENGE ENGINE
// ============================================================================

export const COORDINATION_DUEL_ROUND_SECONDS = 60;
export const COORDINATION_DUEL_COMMANDS_PER_STAGE = 10;
export const COORDINATION_DUEL_DUAL_SYNC_WINDOW_MS = 180;
export const COORDINATION_DUEL_SINGLE_POINTS = 100;
export const COORDINATION_DUEL_DUAL_POINTS = 140;
export const COORDINATION_DUEL_MAX_SPEED_BONUS = 20;
export const COORDINATION_DUEL_COMBO_STEP_POINTS = 10;
export const COORDINATION_DUEL_MAX_COMBO_BONUS = 30;
export const COORDINATION_DUEL_WRONG_PENALTY = 40;
export const COORDINATION_DUEL_MISS_PENALTY = 20;

export type CoordinationDuelDirection = 'left' | 'right' | 'both';

export interface CoordinationDuelStageConfig {
  stage: 1 | 2 | 3 | 4;
  title: string;
  dualRatio: number; // 0 | 0.10 | 0.20 | 0.30
  intervalMs: number; // 1000 | 850 | 750 | 650
}

/**
 * Escalates difficulty every 10 commands:
 * - Stage 1 (commands 0..9):   single arrows only (0% dual), 1000ms interval
 * - Stage 2 (commands 10..19): 10% dual commands, 850ms interval
 * - Stage 3 (commands 20..29): 20% dual commands, 750ms interval
 * - Stage 4 (commands 30+):    30% dual commands, 650ms interval
 */
export function getCoordinationDuelStageConfig(
  commandIndex: number
): CoordinationDuelStageConfig {
  const safeIdx = Math.max(0, Math.floor(commandIndex));
  const stageIdx = Math.min(
    4,
    Math.floor(safeIdx / COORDINATION_DUEL_COMMANDS_PER_STAGE) + 1
  ) as 1 | 2 | 3 | 4;

  if (stageIdx === 1) {
    return {
      stage: 1,
      title: 'مرحله ۱ · فقط فلش‌های تکی (۱۰۰۰ms)',
      dualRatio: 0,
      intervalMs: 1000,
    };
  }
  if (stageIdx === 2) {
    return {
      stage: 2,
      title: 'مرحله ۲ · ۱۰٪ فرمان دوگانه (۸۵۰ms)',
      dualRatio: 0.1,
      intervalMs: 850,
    };
  }
  if (stageIdx === 3) {
    return {
      stage: 3,
      title: 'مرحله ۳ · ۲۰٪ فرمان دوگانه (۷۵۰ms)',
      dualRatio: 0.2,
      intervalMs: 750,
    };
  }
  return {
    stage: 4,
    title: 'مرحله ۴ · ۳۰٪ فرمان دوگانه (۶۵۰ms)',
    dualRatio: 0.3,
    intervalMs: 650,
  };
}

export interface CoordinationDuelCommand {
  index: number;
  stage: 1 | 2 | 3 | 4;
  direction: CoordinationDuelDirection;
  intervalMs: number;
}

/**
 * Generates a directional command ('left', 'right', or 'both') according to the stage's dualRatio.
 */
export function generateCoordinationDuelCommand(
  commandIndex: number,
  randomFn: () => number = Math.random
): CoordinationDuelCommand {
  const stageCfg = getCoordinationDuelStageConfig(commandIndex);
  const dualRoll = randomFn();
  let direction: CoordinationDuelDirection;

  if (stageCfg.dualRatio > 0 && dualRoll < stageCfg.dualRatio) {
    direction = 'both';
  } else {
    direction = randomFn() < 0.5 ? 'left' : 'right';
  }

  return {
    index: Math.max(0, Math.floor(commandIndex)),
    stage: stageCfg.stage,
    direction,
    intervalMs: stageCfg.intervalMs,
  };
}

/**
 * Validates whether two touch/key timestamps qualify as a simultaneous dual command
 * (must be registered within at most 180ms of each other).
 */
export function isValidDualTouchSync(
  leftTimestampMs: number | null | undefined,
  rightTimestampMs: number | null | undefined
): boolean {
  if (
    typeof leftTimestampMs !== 'number' ||
    typeof rightTimestampMs !== 'number' ||
    !Number.isFinite(leftTimestampMs) ||
    !Number.isFinite(rightTimestampMs)
  ) {
    return false;
  }
  return (
    Math.abs(leftTimestampMs - rightTimestampMs) <=
    COORDINATION_DUEL_DUAL_SYNC_WINDOW_MS
  );
}

export type CoordinationDuelOutcomeType = 'correct' | 'wrong' | 'missed';

export interface CoordinationDuelEvaluation {
  outcome: CoordinationDuelOutcomeType;
  isCorrect: boolean;
  basePoints: number;
  speedBonus: number;
  comboBonus: number;
  penaltyPoints: number;
  scoreDelta: number;
  nextScore: number;
  nextStreak: number;
  nextBestStreak: number;
}

/**
 * Evaluates a single Coordination Duel command response:
 * - Correct single ('left' | 'right'): +100 base points
 * - Correct dual ('both', with dualTouchDeltaMs <= 180ms): +140 base points
 * - Speed bonus: up to +20 points based on reactionTimeMs relative to intervalMs
 * - Streak combo bonus: every 3 consecutive correct answers adds +10 combo points, max +30
 * - Wrong response (or dual touch delta > 180ms): -40 points and resets streak to 0
 * - Missed opportunity (timeout): -20 points and resets streak to 0
 * - Running/final score is clamped to never be negative (min 0).
 */
export function evaluateCoordinationDuelOutcome(params: {
  direction: CoordinationDuelDirection;
  outcome: CoordinationDuelOutcomeType;
  reactionTimeMs?: number;
  intervalMs: number;
  dualTouchDeltaMs?: number;
  currentScore: number;
  currentStreak: number;
  bestStreak: number;
}): CoordinationDuelEvaluation {
  const safeScore = Math.max(0, Math.floor(params.currentScore));
  const safeStreak = Math.max(0, Math.floor(params.currentStreak));
  const safeBestStreak = Math.max(safeStreak, Math.floor(params.bestStreak));

  // If a dual command was attempted with touch delta > 180ms, it is strictly evaluated as wrong
  const effectiveOutcome: CoordinationDuelOutcomeType =
    params.outcome === 'correct' &&
    params.direction === 'both' &&
    (typeof params.dualTouchDeltaMs !== 'number' ||
      !Number.isFinite(params.dualTouchDeltaMs) ||
      Math.abs(params.dualTouchDeltaMs) > COORDINATION_DUEL_DUAL_SYNC_WINDOW_MS)
      ? 'wrong'
      : params.outcome;

  if (effectiveOutcome === 'missed') {
    const nextScore = clampChallengeScore(
      Math.max(0, safeScore - COORDINATION_DUEL_MISS_PENALTY)
    );
    return {
      outcome: 'missed',
      isCorrect: false,
      basePoints: 0,
      speedBonus: 0,
      comboBonus: 0,
      penaltyPoints: COORDINATION_DUEL_MISS_PENALTY,
      scoreDelta: nextScore - safeScore,
      nextScore,
      nextStreak: 0,
      nextBestStreak: safeBestStreak,
    };
  }

  if (effectiveOutcome === 'wrong') {
    const nextScore = clampChallengeScore(
      Math.max(0, safeScore - COORDINATION_DUEL_WRONG_PENALTY)
    );
    return {
      outcome: 'wrong',
      isCorrect: false,
      basePoints: 0,
      speedBonus: 0,
      comboBonus: 0,
      penaltyPoints: COORDINATION_DUEL_WRONG_PENALTY,
      scoreDelta: nextScore - safeScore,
      nextScore,
      nextStreak: 0,
      nextBestStreak: safeBestStreak,
    };
  }

  const nextStreak = safeStreak + 1;
  const nextBestStreak = Math.max(safeBestStreak, nextStreak);
  const basePoints =
    params.direction === 'both'
      ? COORDINATION_DUEL_DUAL_POINTS
      : COORDINATION_DUEL_SINGLE_POINTS;

  // Speed bonus: up to +20 points. Responses <= 220ms earn full 20 pts; scales linearly to 0 at intervalMs
  const limitMs = Math.max(450, params.intervalMs);
  const fastThresholdMs = 220;
  const rt = Math.max(
    100,
    Math.min(limitMs, params.reactionTimeMs ?? limitMs)
  );
  const speedRatio =
    rt <= fastThresholdMs
      ? 1
      : Math.max(0, 1 - (rt - fastThresholdMs) / Math.max(1, limitMs - fastThresholdMs));
  const speedBonus = Math.min(
    COORDINATION_DUEL_MAX_SPEED_BONUS,
    Math.max(0, Math.round(speedRatio * COORDINATION_DUEL_MAX_SPEED_BONUS))
  );

  // Combo bonus: every 3 consecutive correct answers adds +10 combo points, max +30
  const comboTier = Math.floor(nextStreak / 3);
  const comboBonus = Math.min(
    COORDINATION_DUEL_MAX_COMBO_BONUS,
    comboTier * COORDINATION_DUEL_COMBO_STEP_POINTS
  );

  const scoreDelta = basePoints + speedBonus + comboBonus;
  const nextScore = clampChallengeScore(safeScore + scoreDelta);

  return {
    outcome: 'correct',
    isCorrect: true,
    basePoints,
    speedBonus,
    comboBonus,
    penaltyPoints: 0,
    scoreDelta,
    nextScore,
    nextStreak,
    nextBestStreak,
  };
}

export interface CoordinationDuelRoundSummary {
  finalScore: number;
  totalCommands: number;
  correctCount: number;
  wrongCount: number;
  missedCount: number;
  accuracyPercent: number;
  averageReactionMs: number;
  averageReactionSeconds: number;
  bestStreak: number;
  highestStageReached: 1 | 2 | 3 | 4;
}

export function summarizeCoordinationDuelRound(params: {
  finalScore: number;
  correctCount: number;
  wrongCount: number;
  missedCount: number;
  reactionTimesMs: ReadonlyArray<number>;
  bestStreak: number;
}): CoordinationDuelRoundSummary {
  const correct = Math.max(0, Math.floor(params.correctCount));
  const wrong = Math.max(0, Math.floor(params.wrongCount));
  const missed = Math.max(0, Math.floor(params.missedCount));
  const totalCommands = correct + wrong + missed;
  const accuracyPercent =
    totalCommands > 0 ? Math.round((correct / totalCommands) * 100) : 0;
  const avgMs =
    params.reactionTimesMs.length > 0
      ? Math.round(
          params.reactionTimesMs.reduce((sum, ms) => sum + Math.max(80, ms), 0) /
            params.reactionTimesMs.length
        )
      : 0;
  const avgSec = Number((avgMs / 1000).toFixed(2));
  const highestStageReached = getCoordinationDuelStageConfig(
    Math.max(0, totalCommands - 1)
  ).stage;

  return {
    finalScore: clampChallengeScore(Math.max(0, params.finalScore)),
    totalCommands,
    correctCount: correct,
    wrongCount: wrong,
    missedCount: missed,
    accuracyPercent,
    averageReactionMs: avgMs,
    averageReactionSeconds: avgSec,
    bestStreak: Math.max(0, Math.floor(params.bestStreak)),
    highestStageReached,
  };
}



