/**
 * AngelLearn - Pure Game Rules & Logic
 * Fully testable pure functions
 */

import { TreeData, TreeId, UserProfile } from '../types/game';

// Growth stage milestones according to GDD v1.0
export const GROWTH_MILESTONES = [0, 3, 5, 8, 14, 30] as const;

export type GrowthStage = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Calculate the growth stage of a tree based on successful watering days.
 * 0: 0-2 days (نهال تازه)
 * 1: 3-4 days (جوانه پرطراوت)
 * 2: 5-7 days (درختچه جوان)
 * 3: 8-13 days (درخت بارور)
 * 4: 14-29 days (درخت تناور)
 * 5: 30+ days (درخت کهنسال و بالغ)
 */
export function getGrowthStage(wateredDays: number): GrowthStage {
  if (wateredDays >= 30) return 5;
  if (wateredDays >= 14) return 4;
  if (wateredDays >= 8) return 3;
  if (wateredDays >= 5) return 2;
  if (wateredDays >= 3) return 1;
  return 0;
}

export function getStageTitle(stage: GrowthStage): string {
  switch (stage) {
    case 5: return 'درخت بالغ و جاودان';
    case 4: return 'درخت پرشکوه و تناور';
    case 3: return 'درخت سبز و بارور';
    case 2: return 'درختچه جوان و شاداب';
    case 1: return 'جوانه پرامید';
    case 0:
    default: return 'نهال آغازین';
  }
}

/**
 * Returns whether a tree is withered.
 * As per GDD: after 3 consecutive days without watering, tree withers.
 * It does not disappear or reset progress.
 */
export function isTreeWithered(daysWithoutWater: number): boolean {
  return daysWithoutWater >= 3;
}

/**
 * Format a Date object into a consistent local calendar date string (YYYY-MM-DD).
 * Avoids UTC offset issues caused by toISOString().
 */
export function formatLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns yesterday's local calendar date string (YYYY-MM-DD) relative to referenceDate.
 */
export function getYesterdayLocalDateString(referenceDate: Date = new Date()): string {
  const yesterday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - 1
  );
  return formatLocalDateString(yesterday);
}

/**
 * Computes exact calendar day difference (toDate - fromDate) between two YYYY-MM-DD strings
 * without timezone or daylight-saving distortion.
 */
export function getCalendarDaysDifference(fromDateStr: string, toDateStr: string): number {
  const parseParts = (s: string): number | null => {
    if (typeof s !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!match) return null;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };
  const fromUtc = parseParts(fromDateStr);
  const toUtc = parseParts(toDateStr);
  if (fromUtc === null || toUtc === null) return 0;
  return Math.floor((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

export const SPRING_DAILY_COIN_REWARD = 20;

export const TREE_COIN_INTERVAL_HOURS = 4;
export const TREE_COIN_INTERVAL_MS = TREE_COIN_INTERVAL_HOURS * 60 * 60 * 1000;
export const TREE_COIN_MAX_STORAGE_HOURS = 24;
export const TREE_COIN_WINDOW_MS = TREE_COIN_MAX_STORAGE_HOURS * 60 * 60 * 1000;
export const TREE_COIN_MAX_TICKS =
  TREE_COIN_MAX_STORAGE_HOURS / TREE_COIN_INTERVAL_HOURS; // 6 intervals per day

/**
 * Coins produced per 4-hour interval by GrowthStage (0..5 / سطح ۱..۶):
 * Stage 0 (نهال آغازین, 0-2d):  1 / 4h  -> max 6 / day
 * Stage 1 (جوانه پرامید, 3-4d): 2 / 4h  -> max 12 / day
 * Stage 2 (درختچه جوان, 5-7d):  3 / 4h  -> max 18 / day
 * Stage 3 (درخت بارور, 8-13d):  5 / 4h  -> max 30 / day
 * Stage 4 (درخت تناور, 14-29d): 7 / 4h  -> max 42 / day
 * Stage 5 (درخت جاودان, 30+d):  10 / 4h -> max 60 / day
 */
export const TREE_COINS_PER_4_HOURS_BY_STAGE: readonly [
  number,
  number,
  number,
  number,
  number,
  number,
] = [1, 2, 3, 5, 7, 10];

export function getTreeCoinsPer4HoursForStage(stage: GrowthStage): number {
  return TREE_COINS_PER_4_HOURS_BY_STAGE[stage] ?? 1;
}

export function getTreeCoinMaxDailyStorage(stage: GrowthStage): number {
  return getTreeCoinsPer4HoursForStage(stage) * TREE_COIN_MAX_TICKS;
}

export interface TreeCoinStatus {
  stage: GrowthStage;
  coinsPerInterval: number;
  maxStorageCoins: number;
  readyCoins: number;
  ticksReady: number;
  isFull: boolean;
  isActiveWindow: boolean;
  msUntilNextCoin: number | null;
  msRemainingInWindow: number;
}

/**
 * Pure calculator for a tree's 4-hour coin generation & 24-hour internal storage cap.
 */
export function getTreeCoinStatus(
  tree: TreeData,
  nowMs: number = Date.now()
): TreeCoinStatus {
  const stage = getGrowthStage(tree.wateredDaysCount);
  const coinsPerInterval = getTreeCoinsPer4HoursForStage(stage);
  const maxStorageCoins = getTreeCoinMaxDailyStorage(stage);
  const baseStored = Math.max(0, Math.floor(Number(tree.storedCoins) || 0));

  if (!tree.unlocked) {
    return {
      stage,
      coinsPerInterval,
      maxStorageCoins,
      readyCoins: 0,
      ticksReady: 0,
      isFull: false,
      isActiveWindow: false,
      msUntilNextCoin: null,
      msRemainingInWindow: 0,
    };
  }

  const hasWaterTime =
    typeof tree.lastWateredAtMs === 'number' &&
    Number.isFinite(tree.lastWateredAtMs) &&
    tree.lastWateredAtMs > 0;

  let completedTicks = 0;
  let isActiveWindow = false;
  let msRemainingInWindow = 0;
  let msUntilNextCoin: number | null = null;

  if (hasWaterTime && !tree.isWithered) {
    const wateredAtMs = tree.lastWateredAtMs!;
    const windowEndMs = wateredAtMs + TREE_COIN_WINDOW_MS;
    const tickOriginMs =
      typeof tree.lastCoinTickAtMs === 'number' &&
      Number.isFinite(tree.lastCoinTickAtMs)
        ? Math.max(wateredAtMs, tree.lastCoinTickAtMs)
        : wateredAtMs;

    const effectiveEndMs = Math.min(nowMs, windowEndMs);
    if (effectiveEndMs > tickOriginMs) {
      const elapsedMs = effectiveEndMs - tickOriginMs;
      completedTicks = Math.floor(elapsedMs / TREE_COIN_INTERVAL_MS);
    }

    isActiveWindow = nowMs >= wateredAtMs && nowMs < windowEndMs;
    msRemainingInWindow = isActiveWindow ? Math.max(0, windowEndMs - nowMs) : 0;

    if (isActiveWindow) {
      const elapsedSinceOrigin = Math.max(0, effectiveEndMs - tickOriginMs);
      const remainderIntoTick = elapsedSinceOrigin % TREE_COIN_INTERVAL_MS;
      msUntilNextCoin = TREE_COIN_INTERVAL_MS - remainderIntoTick;
    }
  }

  const rawTotal = baseStored + completedTicks * coinsPerInterval;
  const readyCoins = Math.min(maxStorageCoins, rawTotal);
  const isFull = readyCoins >= maxStorageCoins;

  if (isFull) {
    msUntilNextCoin = null;
  }

  return {
    stage,
    coinsPerInterval,
    maxStorageCoins,
    readyCoins,
    ticksReady: completedTicks,
    isFull,
    isActiveWindow,
    msUntilNextCoin,
    msRemainingInWindow,
  };
}

/**
 * Collects all accumulated coins stored inside a watered tree, preserving partial
 * progress toward the next 4-hour drop while inside the active 24h window.
 */
export function harvestTreeCoins(
  tree: TreeData,
  nowMs: number = Date.now()
): { updatedTree: TreeData; coinsHarvested: number } {
  const status = getTreeCoinStatus(tree, nowMs);
  if (status.readyCoins <= 0) {
    return { updatedTree: tree, coinsHarvested: 0 };
  }

  const hasWaterTime =
    typeof tree.lastWateredAtMs === 'number' &&
    Number.isFinite(tree.lastWateredAtMs) &&
    tree.lastWateredAtMs > 0;

  let nextTickAtMs = tree.lastCoinTickAtMs;
  if (hasWaterTime) {
    const wateredAtMs = tree.lastWateredAtMs!;
    const windowEndMs = wateredAtMs + TREE_COIN_WINDOW_MS;
    const tickOriginMs =
      typeof tree.lastCoinTickAtMs === 'number' &&
      Number.isFinite(tree.lastCoinTickAtMs)
        ? Math.max(wateredAtMs, tree.lastCoinTickAtMs)
        : wateredAtMs;

    if (nowMs >= windowEndMs) {
      nextTickAtMs = windowEndMs;
    } else {
      nextTickAtMs = tickOriginMs + status.ticksReady * TREE_COIN_INTERVAL_MS;
    }
  }

  return {
    updatedTree: {
      ...tree,
      storedCoins: 0,
      lastCoinTickAtMs: nextTickAtMs,
    },
    coinsHarvested: status.readyCoins,
  };
}

/**
 * Checks whether the Spring of Living Water (چشمه حیات) can be collected today.
 */
export function canCollectSpringToday(
  lastCollectedDate: string | undefined,
  todayDateString: string
): boolean {
  if (!lastCollectedDate) return true;
  return lastCollectedDate !== todayDateString;
}

/**
 * Applies daily once-per-day (+20 coins) collection for the Spring of Living Water.
 */
export function collectSpringWater(
  profile: UserProfile,
  todayDateString: string
): {
  updatedProfile: UserProfile;
  coinsEarned: number;
  collected: boolean;
} {
  if (!canCollectSpringToday(profile.lastSpringCollectedDate, todayDateString)) {
    return {
      updatedProfile: profile,
      coinsEarned: 0,
      collected: false,
    };
  }

  const safeCoins = isValidCoinAmount(profile.coins) ? profile.coins : 0;
  return {
    updatedProfile: {
      ...profile,
      coins: safeCoins + SPRING_DAILY_COIN_REWARD,
      lastSpringCollectedDate: todayDateString,
    },
    coinsEarned: SPRING_DAILY_COIN_REWARD,
    collected: true,
  };
}

/**
 * Milliseconds remaining until the next local calendar midnight (used for daily reset display).
 */
export function getMsUntilNextLocalMidnight(now: Date = new Date()): number {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return Math.max(0, nextMidnight.getTime() - now.getTime());
}

/**
 * Check if the tree can grant daily reward today.
 * Exactly 5 coins and 1 growth count per day per tree.
 */
export function canClaimDailyReward(lastWateredDate: string | undefined, todayDateString: string): boolean {
  if (!lastWateredDate) return true;
  return lastWateredDate !== todayDateString;
}

/**
 * Apply watering logic to a tree.
 * If first watering of the day: increases wateredDaysCount, resets withered status, updates date,
 * preserves any uncollected banked coins (capped at 1 day), and starts a fresh 24-hour 4h-tick coin window.
 * If repeated watering today: tree is safe, practices allowed, keeps ongoing 4h timer untouched, returns 0 bonus coins.
 */
export function waterTree(
  tree: TreeData,
  todayDateString: string,
  nowMs: number = Date.now()
): { updatedTree: TreeData; coinsEarned: number; wasFirstToday: boolean; revived: boolean } {
  const isFirstToday = canClaimDailyReward(tree.lastWateredDate, todayDateString);
  const wasWithered = tree.isWithered;
  const nextWateredDays = isFirstToday ? tree.wateredDaysCount + 1 : tree.wateredDaysCount;
  const nextStage = getGrowthStage(nextWateredDays);
  const nextMaxStorage = getTreeCoinMaxDailyStorage(nextStage);

  const shouldStartNewWindow =
    isFirstToday ||
    wasWithered ||
    typeof tree.lastWateredAtMs !== 'number' ||
    !Number.isFinite(tree.lastWateredAtMs);

  let nextStoredCoins = Math.max(0, Math.floor(Number(tree.storedCoins) || 0));
  let nextWateredAtMs = tree.lastWateredAtMs;
  let nextCoinTickAtMs = tree.lastCoinTickAtMs;

  if (shouldStartNewWindow) {
    const prevStatus = getTreeCoinStatus(tree, nowMs);
    nextStoredCoins = Math.min(nextMaxStorage, prevStatus.readyCoins);
    nextWateredAtMs = nowMs;
    nextCoinTickAtMs = nowMs;
  }

  const updatedTree: TreeData = {
    ...tree,
    lastWateredDate: todayDateString,
    lastWateredAtMs: nextWateredAtMs,
    lastCoinTickAtMs: nextCoinTickAtMs,
    storedCoins: nextStoredCoins,
    daysWithoutWater: 0,
    isWithered: false, // Revives immediately upon watering!
    wateredDaysCount: nextWateredDays,
  };

  return {
    updatedTree,
    coinsEarned: isFirstToday ? 5 : 0,
    wasFirstToday: isFirstToday,
    revived: wasWithered,
  };
}

/**
 * Speed reading WPM formula as per GDD:
 * Day 1: 150 to 350 WPM
 * Day 2: 175 to 375 WPM (+25 to both bounds)
 * Max ceiling: 600 WPM
 */
export function getSpeedReadingBounds(dayNumber: number): { minWpm: number; maxWpm: number } {
  const boundedDay = Math.max(1, dayNumber);
  const increment = (boundedDay - 1) * 25;
  const minWpm = Math.min(600, 150 + increment);
  const maxWpm = Math.min(600, 350 + increment);
  return { minWpm, maxWpm };
}

/**
 * Calculates words needed for at least 60 seconds at given WPM.
 */
export function getRequiredWordsFor60Seconds(wpm: number): number {
  return Math.ceil((wpm / 60) * 60); // wpm words for 60 seconds
}

/**
 * Evaluates a speed reading session so that completion of the reading stream
 * and answering the comprehension question correctly are tracked separately,
 * and overallSuccess requires both.
 */
export function evaluateSpeedReadingSession(params: {
  wordsRead: number;
  totalWords: number;
  selectedOptionIndex: number | null;
  correctOptionIndex: number;
}): {
  readingCompleted: boolean;
  comprehensionPassed: boolean;
  overallSuccess: boolean;
  accuracyPercent: number;
} {
  const readingCompleted =
    params.totalWords > 0 && params.wordsRead >= params.totalWords;
  const comprehensionPassed =
    params.selectedOptionIndex !== null &&
    params.selectedOptionIndex === params.correctOptionIndex;

  return {
    readingCompleted,
    comprehensionPassed,
    overallSuccess: readingCompleted && comprehensionPassed,
    accuracyPercent: comprehensionPassed ? 100 : 0,
  };
}

/**
 * Validates that a coin amount (balance or cost) is a finite, non-negative number.
 */
export function isValidCoinAmount(amount: unknown): amount is number {
  return (
    typeof amount === 'number' &&
    Number.isFinite(amount) &&
    !Number.isNaN(amount) &&
    amount >= 0
  );
}

/**
 * Validate purchase of an item (sapling, decoration, or avatar item).
 * Rejects negative/NaN/infinite costs, invalid balances, and already-owned items.
 */
export function canPurchaseItem(
  currentCoins: number,
  itemCost: number,
  options?: { alreadyOwned?: boolean }
): boolean {
  if (options?.alreadyOwned) return false;
  if (!isValidCoinAmount(currentCoins) || !isValidCoinAmount(itemCost)) {
    return false;
  }
  return currentCoins >= itemCost;
}

export function processPurchase(
  profile: UserProfile,
  cost: number,
  options?: { alreadyOwned?: boolean; itemId?: string }
): {
  success: boolean;
  newCoins: number;
  reason?: 'invalid_cost' | 'invalid_balance' | 'already_owned' | 'insufficient_funds';
} {
  const safeCurrentCoins = isValidCoinAmount(profile.coins) ? profile.coins : 0;

  if (options?.alreadyOwned) {
    return {
      success: false,
      newCoins: safeCurrentCoins,
      reason: 'already_owned',
    };
  }

  if (!isValidCoinAmount(cost)) {
    return {
      success: false,
      newCoins: safeCurrentCoins,
      reason: 'invalid_cost',
    };
  }

  if (!isValidCoinAmount(profile.coins)) {
    return {
      success: false,
      newCoins: safeCurrentCoins,
      reason: 'invalid_balance',
    };
  }

  if (profile.coins < cost) {
    return {
      success: false,
      newCoins: profile.coins,
      reason: 'insufficient_funds',
    };
  }

  return {
    success: true,
    newCoins: profile.coins - cost,
  };
}

/**
 * Validate deep breathing completion:
 * At least 10 seconds (1 full cycle of 5s inhale + 5s exhale)
 */
export function isDeepBreathingComplete(secondsElapsed: number): boolean {
  return secondsElapsed >= 10;
}

// ============================================================================
// BRAIN TREE («درخت مغز») — 10-LEVEL ADDITION & SUBTRACTION MATH ENGINE
// ============================================================================

export const QUESTIONS_PER_MATH_ROUND = 10;

export interface MathLevelConfig {
  level: number; // 1 to 10
  title: string;
  subtitle: string;
  minA: number;
  maxA: number;
  minB: number;
  maxB: number;
  threeTerms?: boolean;
  minC?: number;
  maxC?: number;
}

export const MATH_LEVEL_CONFIGS: MathLevelConfig[] = [
  {
    level: 1,
    title: 'سطح ۱: جوانه ذهن',
    subtitle: 'جمع و تفریق یک‌رقمی ساده (۱ تا ۹)',
    minA: 2,
    maxA: 9,
    minB: 1,
    maxB: 9,
  },
  {
    level: 2,
    title: 'سطح ۲: گام آغازین',
    subtitle: 'جمع و تفریق اعداد تا ۲۰',
    minA: 6,
    maxA: 20,
    minB: 3,
    maxB: 15,
  },
  {
    level: 3,
    title: 'سطح ۳: تمرکز سبز',
    subtitle: 'جمع و تفریق دورقمی پایه (۱۰ تا ۴۵)',
    minA: 12,
    maxA: 45,
    minB: 10,
    maxB: 35,
  },
  {
    level: 4,
    title: 'سطح ۴: چابکی ذهن',
    subtitle: 'جمع و تفریق دورقمی با انتقال (۱۸ تا ۷۵)',
    minA: 24,
    maxA: 75,
    minB: 15,
    maxB: 58,
  },
  {
    level: 5,
    title: 'سطح ۵: تسلط دورقمی',
    subtitle: 'جمع و تفریق اعداد دورقمی بزرگ (۳۰ تا ۹۹)',
    minA: 35,
    maxA: 99,
    minB: 25,
    maxB: 89,
  },
  {
    level: 6,
    title: 'سطح ۶: زنجیره سه‌عددی پایه',
    subtitle: 'ترکیب جمع و تفریق سه عدد (A ± B ± C)',
    minA: 12,
    maxA: 35,
    minB: 8,
    maxB: 25,
    threeTerms: true,
    minC: 4,
    maxC: 18,
  },
  {
    level: 7,
    title: 'سطح ۷: پل سه‌رقمی',
    subtitle: 'جمع و تفریق سه‌رقمی با دورقمی (۱۰۰ تا ۲۵۰)',
    minA: 105,
    maxA: 250,
    minB: 18,
    maxB: 95,
  },
  {
    level: 8,
    title: 'سطح ۸: محاسبات سه‌رقمی',
    subtitle: 'جمع و تفریق دو عدد سه‌رقمی (۱۲۰ تا ۵۰۰)',
    minA: 140,
    maxA: 500,
    minB: 110,
    maxB: 380,
  },
  {
    level: 9,
    title: 'سطح ۹: زنجیره سه‌عددی پیشرفته',
    subtitle: 'ترکیب جمع و تفریق سه عدد دورقمی بزرگ',
    minA: 35,
    maxA: 90,
    minB: 20,
    maxB: 75,
    threeTerms: true,
    minC: 15,
    maxC: 55,
  },
  {
    level: 10,
    title: 'سطح ۱۰: استاد بزرگ درخت مغز',
    subtitle: 'چالش نخبگان؛ جمع و تفریق سه‌رقمی سنگین (تا ۹۹۹)',
    minA: 280,
    maxA: 950,
    minB: 165,
    maxB: 740,
  },
];

export interface MathQuestion {
  id: string;
  questionNumber: number; // 1 to 10
  level: number; // 1 to 10
  operands: number[];
  operators: ('+' | '-')[];
  expressionText: string; // e.g., "48 + 27"
  correctAnswer: number;
  options: number[]; // 4 distinct options including correctAnswer
}

export interface MathQuestionAttempt {
  question: MathQuestion;
  userAnswer: number;
  isCorrect: boolean;
  responseTimeMs: number;
}

export interface MathRoundSummary {
  level: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  accuracyPercent: number;
  totalTimeMs: number;
  totalTimeSeconds: number;
  averageTimeSeconds: number;
  fastestTimeSeconds: number;
  passed: boolean;
}

function randomIntBetween(min: number, max: number, rng: () => number = Math.random): number {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return Math.floor(rng() * (high - low + 1)) + low;
}

export function getMathLevelConfig(level: number): MathLevelConfig {
  const clamped = Math.max(1, Math.min(10, Math.round(level)));
  return MATH_LEVEL_CONFIGS[clamped - 1];
}

export function generateMathQuestion(
  level: number,
  questionNumber: number,
  rng: () => number = Math.random
): MathQuestion {
  const cfg = getMathLevelConfig(level);

  let operands: number[] = [];
  let operators: ('+' | '-')[] = [];
  let correctAnswer = 0;

  if (cfg.threeTerms) {
    const a = randomIntBetween(cfg.minA, cfg.maxA, rng);
    const b = randomIntBetween(cfg.minB, cfg.maxB, rng);
    const c = randomIntBetween(cfg.minC ?? 5, cfg.maxC ?? 20, rng);
    const op1: '+' | '-' = rng() < 0.65 ? '+' : '-';

    if (op1 === '+') {
      const firstSum = a + b;
      const op2: '+' | '-' = questionNumber % 2 === 0 ? '-' : '+';
      if (op2 === '-' && firstSum >= c) {
        operands = [a, b, c];
        operators = ['+', '-'];
        correctAnswer = firstSum - c;
      } else {
        operands = [a, b, c];
        operators = ['+', '+'];
        correctAnswer = firstSum + c;
      }
    } else {
      const high = Math.max(a, b);
      const low = Math.min(a, b);
      operands = [high, low, c];
      operators = ['-', '+'];
      correctAnswer = high - low + c;
    }
  } else {
    const rawA = randomIntBetween(cfg.minA, cfg.maxA, rng);
    const rawB = randomIntBetween(cfg.minB, cfg.maxB, rng);
    // Alternate and randomize between addition and subtraction
    const isAddition = (questionNumber % 2 === 1 && rng() < 0.7) || (questionNumber % 2 === 0 && rng() < 0.3);
    if (isAddition) {
      operands = [rawA, rawB];
      operators = ['+'];
      correctAnswer = rawA + rawB;
    } else {
      const high = Math.max(rawA, rawB);
      const low = Math.min(rawA, rawB);
      // Avoid trivial 0 when possible
      const adjustedHigh = high === low ? high + randomIntBetween(2, 9, rng) : high;
      operands = [adjustedHigh, low];
      operators = ['-'];
      correctAnswer = adjustedHigh - low;
    }
  }

  const expressionText = operands.reduce((acc, num, idx) => {
    if (idx === 0) return `${num}`;
    return `${acc} ${operators[idx - 1]} ${num}`;
  }, '');

  // Generate 4 distinct, plausible options (for players who prefer tapping options or checking keypad)
  const optionSet = new Set<number>([correctAnswer]);
  const deltas = [1, -1, 2, -2, 3, -3, 10, -10, 5, -5, 11, -9, 12, -12];
  let safety = 0;
  while (optionSet.size < 4 && safety < 40) {
    safety++;
    const delta = deltas[Math.floor(rng() * deltas.length)];
    const candidate = correctAnswer + delta;
    if (candidate >= 0 && candidate !== correctAnswer) {
      optionSet.add(candidate);
    }
  }
  while (optionSet.size < 4) {
    optionSet.add(correctAnswer + optionSet.size + 1);
  }

  const options = Array.from(optionSet).sort((x, y) => x - y);

  return {
    id: `math_l${cfg.level}_q${questionNumber}_${Math.floor(rng() * 100000)}`,
    questionNumber,
    level: cfg.level,
    operands,
    operators,
    expressionText,
    correctAnswer,
    options,
  };
}

export function generateMathRound(
  level: number,
  count: number = QUESTIONS_PER_MATH_ROUND,
  rng: () => number = Math.random
): MathQuestion[] {
  const questions: MathQuestion[] = [];
  const usedExpressions = new Set<string>();

  for (let i = 1; i <= count; i++) {
    let q = generateMathQuestion(level, i, rng);
    let retries = 0;
    while (usedExpressions.has(q.expressionText) && retries < 10) {
      q = generateMathQuestion(level, i, rng);
      retries++;
    }
    usedExpressions.add(q.expressionText);
    questions.push(q);
  }

  return questions;
}

export function evaluateMathRound(
  attempts: MathQuestionAttempt[],
  level: number
): MathRoundSummary {
  const totalQuestions = attempts.length;
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const wrongCount = totalQuestions - correctCount;
  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const totalTimeMs = attempts.reduce((sum, a) => sum + Math.max(0, a.responseTimeMs), 0);
  const totalTimeSeconds = Number((totalTimeMs / 1000).toFixed(2));
  const averageTimeSeconds =
    totalQuestions > 0 ? Number((totalTimeSeconds / totalQuestions).toFixed(2)) : 0;

  const correctTimesMs = attempts
    .filter((a) => a.isCorrect && a.responseTimeMs > 0)
    .map((a) => a.responseTimeMs);
  const fastestTimeSeconds =
    correctTimesMs.length > 0
      ? Number((Math.min(...correctTimesMs) / 1000).toFixed(2))
      : totalQuestions > 0
      ? Number((Math.min(...attempts.map((a) => Math.max(100, a.responseTimeMs))) / 1000).toFixed(2))
      : 0;

  // Passing threshold: at least 60% (6 out of 10) correct
  const passed = correctCount >= Math.ceil(totalQuestions * 0.6);

  return {
    level: Math.max(1, Math.min(10, Math.round(level))),
    totalQuestions,
    correctCount,
    wrongCount,
    accuracyPercent,
    totalTimeMs,
    totalTimeSeconds,
    averageTimeSeconds,
    fastestTimeSeconds,
    passed,
  };
}

export const MATH_PLACEMENT_QUESTIONS = 5;
export const MATH_PLACEMENT_START_LEVEL = 3;

export interface MathPlacementSummary {
  recommendedLevel: number; // 1 to 10
  totalQuestions: number;
  correctCount: number;
  accuracyPercent: number;
  averageTimeSeconds: number;
  highestCorrectLevel: number;
  skillLabel: string;
}

/**
 * Adaptive staircase probe step for the Brain Tree initial placement test.
 * Fast & accurate answers climb +2 levels; steady correct climb +1;
 * slow correct holds steady; wrong drops -1 (or -2 if also slow).
 */
export function getNextMathPlacementProbeLevel(
  currentProbeLevel: number,
  isCorrect: boolean,
  responseTimeMs: number
): number {
  const clamped = Math.max(1, Math.min(10, Math.round(currentProbeLevel)));
  let delta = 0;

  if (isCorrect) {
    if (responseTimeMs <= 3800) {
      delta = 2;
    } else if (responseTimeMs <= 8500) {
      delta = 1;
    } else {
      delta = 0;
    }
  } else {
    delta = responseTimeMs >= 9000 ? -2 : -1;
  }

  return Math.max(1, Math.min(10, clamped + delta));
}

export function evaluateMathPlacement(
  attempts: MathQuestionAttempt[]
): MathPlacementSummary {
  const totalQuestions = attempts.length;
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const totalTimeMs = attempts.reduce(
    (sum, a) => sum + Math.max(0, a.responseTimeMs),
    0
  );
  const averageTimeSeconds =
    totalQuestions > 0
      ? Number((totalTimeMs / 1000 / totalQuestions).toFixed(2))
      : 0;

  let probe = MATH_PLACEMENT_START_LEVEL;
  let highestCorrectLevel = 0;

  for (const att of attempts) {
    if (att.isCorrect) {
      highestCorrectLevel = Math.max(highestCorrectLevel, att.question.level);
    }
    probe = getNextMathPlacementProbeLevel(
      probe,
      att.isCorrect,
      att.responseTimeMs
    );
  }

  const recommendedLevel =
    correctCount === 0
      ? 1
      : Math.max(
          1,
          Math.min(10, Math.round(probe * 0.45 + highestCorrectLevel * 0.55))
        );

  let skillLabel = 'سطح پایه — شروع آرام و دقیق';
  if (recommendedLevel >= 8) {
    skillLabel = 'سطح نخبه — پردازش سریع ذهنی';
  } else if (recommendedLevel >= 5) {
    skillLabel = 'سطح پیشرفته — سرعت و دقت بالا';
  } else if (recommendedLevel >= 3) {
    skillLabel = 'سطح متوسط — چابکی خوب محاسبات';
  }

  return {
    recommendedLevel,
    totalQuestions,
    correctCount,
    accuracyPercent,
    averageTimeSeconds,
    highestCorrectLevel,
    skillLabel,
  };
}

/// ============================================================================
// POETRY TREE & SPEED READING DATA (Re-exported for backwards compatibility;
// lazy game chunks import directly from ./poetryData and ./speedReadingData)
// ============================================================================
export * from './poetryData';
export * from './speedReadingData';

// ============================================================================
// MEMORY TREE («درخت حافظه») — ADAPTIVE INITIAL PLACEMENT (3 MICRO-ROUNDS)
// ============================================================================

export const MEMORY_PLACEMENT_ROUNDS = 3;
export const MEMORY_PLACEMENT_START_TIER = 2; // Starts at Tier 2 (6 numbers)
export const MEMORY_PAIR_LEVEL_VALUES = [4, 6, 8, 10] as const;
export const MEMORY_NUMBER_LEVEL_VALUES = [5, 7, 9, 12] as const;

export interface MemoryPlacementTierConfig {
  tier: number; // 1..4
  numberCount: number;
  previewMs: number;
  title: string;
}

export const MEMORY_PLACEMENT_TIERS: MemoryPlacementTierConfig[] = [
  { tier: 1, numberCount: 4, previewMs: 2600, title: 'مرحله پایه (۴ کارت)' },
  { tier: 2, numberCount: 6, previewMs: 3200, title: 'مرحله میانی (۶ کارت)' },
  { tier: 3, numberCount: 8, previewMs: 3800, title: 'مرحله پیشرفته (۸ کارت)' },
  { tier: 4, numberCount: 10, previewMs: 4400, title: 'مرحله نخبگان (۱۰ کارت)' },
];

export function getMemoryPlacementTierConfig(tier: number): MemoryPlacementTierConfig {
  const clamped = Math.max(1, Math.min(4, Math.round(tier)));
  return MEMORY_PLACEMENT_TIERS[clamped - 1];
}

export interface MemoryPlacementAttempt {
  tier: number; // 1..4
  cardCount: number;
  mistakes: number;
  recallTimeMs: number;
}

export interface MemoryPlacementSummary {
  recommendedLevel: number; // 1..4
  recommendedPairCount: number;
  recommendedNumberCount: number;
  totalRounds: number;
  totalMistakes: number;
  cleanRounds: number; // rounds with <= 1 mistake
  zeroMistakeRounds: number;
  averageRecallSeconds: number;
  highestCleanTier: number;
  skillLabel: string;
}

/**
 * Adaptive staircase for Memory Tree initial placement (tiers 1..4):
 * - 0 mistakes and fast recall (<= 11s): +2 tiers (e.g. Tier 2 -> Tier 4)
 * - 0 mistakes (normal speed): +1 tier
 * - 1 mistake: hold steady (0)
 * - 2-3 mistakes: -1 tier
 * - 4+ mistakes: -2 tiers
 */
export function getNextMemoryPlacementProbeTier(
  currentTier: number,
  mistakes: number,
  recallTimeMs: number
): number {
  const clamped = Math.max(1, Math.min(4, Math.round(currentTier)));
  const safeMistakes = Math.max(0, Math.floor(mistakes));
  let delta = 0;

  if (safeMistakes === 0) {
    delta = recallTimeMs <= 11000 ? 2 : 1;
  } else if (safeMistakes === 1) {
    delta = 0;
  } else if (safeMistakes >= 4) {
    delta = -2;
  } else {
    delta = -1;
  }

  return Math.max(1, Math.min(4, clamped + delta));
}

export function evaluateMemoryPlacement(
  attempts: MemoryPlacementAttempt[]
): MemoryPlacementSummary {
  const totalRounds = attempts.length;
  const totalMistakes = attempts.reduce((sum, a) => sum + Math.max(0, a.mistakes), 0);
  const cleanRounds = attempts.filter((a) => a.mistakes <= 1).length;
  const zeroMistakeRounds = attempts.filter((a) => a.mistakes === 0).length;

  const totalRecallMs = attempts.reduce((sum, a) => sum + Math.max(0, a.recallTimeMs), 0);
  const averageRecallSeconds =
    totalRounds > 0 ? Number((totalRecallMs / 1000 / totalRounds).toFixed(2)) : 0;

  let probe = MEMORY_PLACEMENT_START_TIER;
  let highestCleanTier = 0;

  for (const att of attempts) {
    if (att.mistakes <= 1) {
      highestCleanTier = Math.max(highestCleanTier, att.tier);
    }
    probe = getNextMemoryPlacementProbeTier(probe, att.mistakes, att.recallTimeMs);
  }

  let recommendedLevel = 1;
  if (cleanRounds === 0) {
    recommendedLevel = 1;
  } else if (zeroMistakeRounds === totalRounds && totalRounds > 0 && probe >= 4) {
    recommendedLevel = 4;
  } else {
    recommendedLevel = Math.max(
      1,
      Math.min(4, Math.round(probe * 0.5 + Math.max(1, highestCleanTier) * 0.5))
    );
  }

  let skillLabel = 'سطح پایه — شروع آرام برای تثبیت حافظه';
  if (recommendedLevel === 4) {
    skillLabel = 'سطح نخبگان — یادسپاری سریع و بدون خطا';
  } else if (recommendedLevel === 3) {
    skillLabel = 'سطح پیشرفته — تمرکز دیداری و توالی قوی';
  } else if (recommendedLevel === 2) {
    skillLabel = 'سطح متوسط — حافظه متعادل و آماده رشد';
  }

  return {
    recommendedLevel,
    recommendedPairCount: MEMORY_PAIR_LEVEL_VALUES[recommendedLevel - 1],
    recommendedNumberCount: MEMORY_NUMBER_LEVEL_VALUES[recommendedLevel - 1],
    totalRounds,
    totalMistakes,
    cleanRounds,
    zeroMistakeRounds,
    averageRecallSeconds,
    highestCleanTier,
    skillLabel,
  };
}

// ============================================================================
// BINA TREE («درخت بینا») — 5 VISUAL TRACKING LEVELS & ADAPTIVE PLACEMENT
// ============================================================================

export const BINA_PLACEMENT_ROUNDS = 3;
export const BINA_PLACEMENT_START_LEVEL = 2;

export interface BinaLevelConfig {
  level: number; // 1..5
  title: string;
  subtitle: string;
  totalBalls: number;
  targetCount: number;
  minSpeed: number;
  maxSpeed: number;
  memorizeSeconds: number;
  moveSeconds: number;
  placementMoveSeconds: number;
}

export const BINA_LEVEL_CONFIGS: BinaLevelConfig[] = [
  {
    level: 1,
    title: 'سطح ۱: ردیابی آرام (پایه)',
    subtitle: '۶ توپ • ۱ توپ هدف • حرکت ملایم',
    totalBalls: 6,
    targetCount: 1,
    minSpeed: 2.0,
    maxSpeed: 2.7,
    memorizeSeconds: 3,
    moveSeconds: 5,
    placementMoveSeconds: 4,
  },
  {
    level: 2,
    title: 'سطح ۲: ردیابی متعادل (متوسط)',
    subtitle: '۸ توپ • ۱ توپ هدف • سرعت متوسط',
    totalBalls: 8,
    targetCount: 1,
    minSpeed: 2.6,
    maxSpeed: 3.4,
    memorizeSeconds: 3,
    moveSeconds: 6,
    placementMoveSeconds: 4,
  },
  {
    level: 3,
    title: 'سطح ۳: ردیابی چابک (استاندارد)',
    subtitle: '۱۰ توپ • ۱ توپ هدف • حرکت چابک',
    totalBalls: 10,
    targetCount: 1,
    minSpeed: 3.1,
    maxSpeed: 4.1,
    memorizeSeconds: 3,
    moveSeconds: 7,
    placementMoveSeconds: 4,
  },
  {
    level: 4,
    title: 'سطح ۴: ردیابی دوهدفه (پیشرفته)',
    subtitle: '۱۱ توپ • ۲ توپ هدف هم‌زمان • تمرکز تقسیم‌شده',
    totalBalls: 11,
    targetCount: 2,
    minSpeed: 3.3,
    maxSpeed: 4.3,
    memorizeSeconds: 3,
    moveSeconds: 7,
    placementMoveSeconds: 5,
  },
  {
    level: 5,
    title: 'سطح ۵: ردیابی نخبگان (استاد)',
    subtitle: '۱۳ توپ • ۲ توپ هدف هم‌زمان • سرعت بالا',
    totalBalls: 13,
    targetCount: 2,
    minSpeed: 3.9,
    maxSpeed: 4.9,
    memorizeSeconds: 3,
    moveSeconds: 8,
    placementMoveSeconds: 5,
  },
];

export function getBinaLevelConfig(level: number): BinaLevelConfig {
  const clamped = Math.max(1, Math.min(5, Math.round(level)));
  return BINA_LEVEL_CONFIGS[clamped - 1];
}

export interface BinaPlacementAttempt {
  level: number; // 1..5
  targetCount: number;
  correctTargets: number;
  selectionTimeMs: number;
}

export interface BinaPlacementSummary {
  recommendedLevel: number; // 1..5
  totalRounds: number;
  perfectRounds: number;
  totalTargetsFound: number;
  totalTargetsAsked: number;
  accuracyPercent: number;
  averageSelectionSeconds: number;
  highestPerfectLevel: number;
  skillLabel: string;
}

/**
 * Adaptive staircase probe for Bina Tree visual tracking placement (1..5):
 * - All targets found fast at low level (<=2): +2 levels (tests multi-target tracking)
 * - All targets found otherwise: +1 level
 * - Partial hit on multi-target level: hold (0)
 * - Zero targets found: -1 level
 */
export function getNextBinaPlacementProbeLevel(
  currentLevel: number,
  correctTargets: number,
  targetCount: number,
  selectionTimeMs: number
): number {
  const clamped = Math.max(1, Math.min(5, Math.round(currentLevel)));
  const safeTargets = Math.max(1, targetCount);
  let delta = 0;

  if (correctTargets >= safeTargets) {
    delta = clamped <= 2 && selectionTimeMs <= 3500 ? 2 : 1;
  } else if (correctTargets > 0) {
    delta = 0;
  } else {
    delta = -1;
  }

  return Math.max(1, Math.min(5, clamped + delta));
}

export function evaluateBinaPlacement(
  attempts: BinaPlacementAttempt[]
): BinaPlacementSummary {
  const totalRounds = attempts.length;
  const perfectRounds = attempts.filter((a) => a.correctTargets >= a.targetCount).length;
  const totalTargetsFound = attempts.reduce((s, a) => s + Math.max(0, a.correctTargets), 0);
  const totalTargetsAsked = attempts.reduce((s, a) => s + Math.max(1, a.targetCount), 0);
  const accuracyPercent =
    totalTargetsAsked > 0 ? Math.round((totalTargetsFound / totalTargetsAsked) * 100) : 0;

  const totalSelMs = attempts.reduce((s, a) => s + Math.max(0, a.selectionTimeMs), 0);
  const averageSelectionSeconds =
    totalRounds > 0 ? Number((totalSelMs / 1000 / totalRounds).toFixed(2)) : 0;

  let probe = BINA_PLACEMENT_START_LEVEL;
  let highestPerfectLevel = 0;

  for (const att of attempts) {
    if (att.correctTargets >= att.targetCount) {
      highestPerfectLevel = Math.max(highestPerfectLevel, att.level);
    }
    probe = getNextBinaPlacementProbeLevel(
      probe,
      att.correctTargets,
      att.targetCount,
      att.selectionTimeMs
    );
  }

  let recommendedLevel = 1;
  if (totalTargetsFound === 0) {
    recommendedLevel = 1;
  } else if (perfectRounds === totalRounds && totalRounds > 0 && probe >= 5) {
    recommendedLevel = 5;
  } else {
    recommendedLevel = Math.max(
      1,
      Math.min(5, Math.round(probe * 0.5 + Math.max(1, highestPerfectLevel) * 0.5))
    );
  }

  let skillLabel = 'سطح پایه — شروع ردیابی تک‌هدفه آرام';
  if (recommendedLevel === 5) {
    skillLabel = 'سطح استاد — ردیابی سریع دو هدف هم‌زمان';
  } else if (recommendedLevel === 4) {
    skillLabel = 'سطح پیشرفته — تمرکز دیداری دوهدفه';
  } else if (recommendedLevel === 3) {
    skillLabel = 'سطح استاندارد — هماهنگی چشم و تمرکز چابک';
  } else if (recommendedLevel === 2) {
    skillLabel = 'سطح متوسط — کنترل متعادل میدان دید';
  }

  return {
    recommendedLevel,
    totalRounds,
    perfectRounds,
    totalTargetsFound,
    totalTargetsAsked,
    accuracyPercent,
    averageSelectionSeconds,
    highestPerfectLevel,
    skillLabel,
  };
}



// ============================================================================
// DEEP BREATHING TREE («درخت تنفس عمیق») — LUNG CAPACITY LEVELS & PLACEMENT
// ============================================================================

export interface BreathingLevelConfig {
  level: number; // 1..4
  title: string;
  shortLabel: string;
  subtitle: string;
  climbSipMs: number;
  climbExhaleMs: number;
  boxPhaseMs: number;
}

export const BREATHING_LEVEL_CONFIGS: BreathingLevelConfig[] = [
  {
    level: 1,
    title: 'سطح ۱: ریتم ملایم (پایه)',
    shortLabel: 'سطح ۱ · ملایم',
    subtitle: 'مربعی ۳·۳·۳·۳ | پله‌ای ۱.۶ث + ۵.۲ث',
    climbSipMs: 1600,
    climbExhaleMs: 5200,
    boxPhaseMs: 3000,
  },
  {
    level: 2,
    title: 'سطح ۲: ریتم متعادل (استاندارد)',
    shortLabel: 'سطح ۲ · استاندارد',
    subtitle: 'مربعی ۴·۴·۴·۴ | پله‌ای ۲.۲ث + ۷.۴ث',
    climbSipMs: 2200,
    climbExhaleMs: 7400,
    boxPhaseMs: 4000,
  },
  {
    level: 3,
    title: 'سطح ۳: ریتم عمیق (پیشرفته)',
    shortLabel: 'سطح ۳ · عمیق',
    subtitle: 'مربعی ۵·۵·۵·۵ | پله‌ای ۲.۶ث + ۹.۲ث',
    climbSipMs: 2600,
    climbExhaleMs: 9200,
    boxPhaseMs: 5000,
  },
  {
    level: 4,
    title: 'سطح ۴: ریتم استادی (ظرفیت بالا)',
    shortLabel: 'سطح ۴ · استادی',
    subtitle: 'مربعی ۶·۶·۶·۶ | پله‌ای ۳.۰ث + ۱۱.۰ث',
    climbSipMs: 3000,
    climbExhaleMs: 11000,
    boxPhaseMs: 6000,
  },
];

export function getBreathingLevelConfig(level: number): BreathingLevelConfig {
  const clamped = Math.max(1, Math.min(4, Math.round(level)));
  return BREATHING_LEVEL_CONFIGS[clamped - 1];
}

export interface BreathingPlacementSummary {
  recommendedLevel: number; // 1..4
  exhaleSeconds: number;
  rushedWarning: boolean;
  skillLabel: string;
  description: string;
}

/**
 * Calibrates Deep Breathing Tree starting level (1..4) from controlled calm exhale duration:
 * - < 2.5s click: rushedWarning flagged -> Level 1 (gentle safe start)
 * - < 9.0s: Level 1 (Gentle 3-3-3-3)
 * - 9.0s .. 15.9s: Level 2 (Standard 4-4-4-4)
 * - 16.0s .. 23.9s: Level 3 (Deep 5-5-5-5)
 * - >= 24.0s: Level 4 (Mastery 6-6-6-6)
 */
export function evaluateBreathingPlacement(
  exhaleDurationMs: number
): BreathingPlacementSummary {
  const safeMs = Math.max(0, exhaleDurationMs);
  const exhaleSeconds = Number((safeMs / 1000).toFixed(1));
  const rushedWarning = safeMs < 2500;

  let recommendedLevel = 1;
  if (rushedWarning || exhaleSeconds < 9.0) {
    recommendedLevel = 1;
  } else if (exhaleSeconds < 16.0) {
    recommendedLevel = 2;
  } else if (exhaleSeconds < 24.0) {
    recommendedLevel = 3;
  } else {
    recommendedLevel = 4;
  }

  let skillLabel = 'ظرفیت پایه — ریتم ملایم و بدون فشار';
  let description =
    'برای شروع راحت و اکسیژن‌رسانی تدریجی، ریتم ملایم (مربعی ۳·۳·۳·۳) برایتان تنظیم شد.';

  if (recommendedLevel === 4) {
    skillLabel = 'ظرفیت استادی — کنترل عالی دیافراگم';
    description =
      'مدت بازدم پیوسته شما عالی است! ریتم استادی (مربعی ۶·۶·۶·۶ و بازدم ۱۱ ثانیه‌ای) برایتان فعال شد.';
  } else if (recommendedLevel === 3) {
    skillLabel = 'ظرفیت عمیق — آرامش و کنترل پیشرفته';
    description =
      'کنترل بازدم شما فراتر از حد استاندارد است؛ ریتم عمیق (مربعی ۵·۵·۵·۵) متناسب با توان شما انتخاب شد.';
  } else if (recommendedLevel === 2) {
    skillLabel = 'ظرفیت متعادل — هماهنگی استاندارد ریه';
    description =
      'ریتم تنفس شما متعادل و منظم است؛ سطح استاندارد (مربعی ۴·۴·۴·۴ و دم پله‌ای ۱۴ ثانیه‌ای) برایتان آماده شد.';
  }

  return {
    recommendedLevel,
    exhaleSeconds,
    rushedWarning,
    skillLabel,
    description,
  };
}

/**
 * Processes a numeric digit press on the 3x4 Brain Math keypad.
 * Auto-matches as soon as the entered digits equal `correctAnswer`,
 * and triggers no reaction on wrong or incomplete inputs.
 */
export function evaluateBrainKeypadDigit(
  currentInput: string,
  digitChar: string,
  correctAnswer: number,
  maxDigits: number = 5
): {
  nextInput: string;
  isExactMatch: boolean;
} {
  if (!/^\d$/.test(digitChar)) {
    return { nextInput: currentInput, isExactMatch: false };
  }
  const nextInput =
    currentInput.length < maxDigits ? currentInput + digitChar : currentInput;
  const parsed = Number.parseInt(nextInput, 10);
  const isExactMatch =
    nextInput.length > 0 && Number.isFinite(parsed) && parsed === correctAnswer;
  return {
    nextInput,
    isExactMatch,
  };
}
