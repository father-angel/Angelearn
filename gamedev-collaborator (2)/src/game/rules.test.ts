import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getGrowthStage,
  getStageTitle,
  isTreeWithered,
  canClaimDailyReward,
  waterTree,
  getSpeedReadingBounds,
  evaluateSpeedReadingSession,
  isDeepBreathingComplete,
  canPurchaseItem,
  processPurchase,
  formatLocalDateString,
  getYesterdayLocalDateString,
  getCalendarDaysDifference,
  MATH_LEVEL_CONFIGS,
  QUESTIONS_PER_MATH_ROUND,
  generateMathQuestion,
  generateMathRound,
  evaluateMathRound,
  MATH_PLACEMENT_QUESTIONS,
  MATH_PLACEMENT_START_LEVEL,
  getNextMathPlacementProbeLevel,
  evaluateMathPlacement,
  FAMOUS_IRANIAN_POETS,
  isPoetryReadingComplete,
  DEFAULT_INITIAL_SPEED_READING_LEVEL,
  MIN_SPEED_READING_LEVEL,
  MAX_SPEED_READING_LEVEL,
  SPEED_READING_FEEDBACK_OPTIONS,
  calculateNextSpeedReadingLevel,
  getSpeedReadingWpmForLevel,
  getSpeedReadingDailyScript,
  MEMORY_PLACEMENT_ROUNDS,
  MEMORY_PLACEMENT_START_TIER,
  getMemoryPlacementTierConfig,
  getNextMemoryPlacementProbeTier,
  evaluateMemoryPlacement,
  BINA_LEVEL_CONFIGS,
  BINA_PLACEMENT_ROUNDS,
  BINA_PLACEMENT_START_LEVEL,
  getBinaLevelConfig,
  getNextBinaPlacementProbeLevel,
  evaluateBinaPlacement,
  SPEED_READING_PLACEMENT_PASSAGE,
  evaluateSpeedReadingPlacement,
  BREATHING_LEVEL_CONFIGS,
  getBreathingLevelConfig,
  evaluateBreathingPlacement,
  evaluateBrainKeypadDigit,
  SPRING_DAILY_COIN_REWARD,
  TREE_COIN_INTERVAL_MS,
  TREE_COIN_WINDOW_MS,
  getTreeCoinsPer4HoursForStage,
  getTreeCoinMaxDailyStorage,
  getTreeCoinStatus,
  harvestTreeCoins,
  canCollectSpringToday,
  collectSpringWater,
} from './rules';
import { TreeData, UserProfile } from '../types/game';

test('Growth stage calculation matches GDD milestones (3, 5, 8, 14, 30)', () => {
  assert.equal(getGrowthStage(0), 0);
  assert.equal(getGrowthStage(2), 0);
  assert.equal(getGrowthStage(3), 1);
  assert.equal(getGrowthStage(4), 1);
  assert.equal(getGrowthStage(5), 2);
  assert.equal(getGrowthStage(7), 2);
  assert.equal(getGrowthStage(8), 3);
  assert.equal(getGrowthStage(13), 3);
  assert.equal(getGrowthStage(14), 4);
  assert.equal(getGrowthStage(29), 4);
  assert.equal(getGrowthStage(30), 5);
  assert.equal(getGrowthStage(50), 5);
});

test('Stage title returns poetic Persian growth names', () => {
  assert.equal(getStageTitle(0), 'نهال آغازین');
  assert.equal(getStageTitle(1), 'جوانه پرامید');
  assert.equal(getStageTitle(5), 'درخت بالغ و جاودان');
});

test('Tree withers after 3 days without water without destroying days count', () => {
  assert.equal(isTreeWithered(0), false);
  assert.equal(isTreeWithered(2), false);
  assert.equal(isTreeWithered(3), true);
  assert.equal(isTreeWithered(5), true);
});

test('Daily watering grants exactly 5 coins on first try, 0 coins on repeated same-day try', () => {
  const mockTree: TreeData = {
    id: 'speed_reading',
    name: 'تندخوانی',
    description: '',
    cost: 0,
    unlocked: true,
    wateredDaysCount: 4,
    lastWateredDate: '2026-11-07',
    daysWithoutWater: 3,
    isWithered: true,
    position: { x: 0, y: 0 },
  };

  // Water on new day
  const result1 = waterTree(mockTree, '2026-11-08');
  assert.equal(result1.coinsEarned, 5);
  assert.equal(result1.wasFirstToday, true);
  assert.equal(result1.revived, true);
  assert.equal(result1.updatedTree.isWithered, false);
  assert.equal(result1.updatedTree.wateredDaysCount, 5);
  assert.equal(result1.updatedTree.lastWateredDate, '2026-11-08');

  // Water again on the same day
  const result2 = waterTree(result1.updatedTree, '2026-11-08');
  assert.equal(result2.coinsEarned, 0);
  assert.equal(result2.wasFirstToday, false);
  assert.equal(result2.updatedTree.wateredDaysCount, 5); // does not increase again today
  assert.equal(canClaimDailyReward('2026-11-08', '2026-11-08'), false);
});

test('Local date helpers format YYYY-MM-DD consistently and compute calendar day differences accurately', () => {
  const localNov10 = new Date(2026, 10, 10, 23, 45, 0); // Nov 10 at 23:45 local time
  assert.equal(formatLocalDateString(localNov10), '2026-11-10');
  assert.equal(getYesterdayLocalDateString(localNov10), '2026-11-09');
  assert.equal(getCalendarDaysDifference('2026-11-07', '2026-11-10'), 3);
  assert.equal(getCalendarDaysDifference('2026-11-10', '2026-11-10'), 0);
});

test('Speed reading WPM follows daily +25 ramp up to 600 max', () => {
  const day1 = getSpeedReadingBounds(1);
  assert.equal(day1.minWpm, 150);
  assert.equal(day1.maxWpm, 350);

  const day2 = getSpeedReadingBounds(2);
  assert.equal(day2.minWpm, 175);
  assert.equal(day2.maxWpm, 375);

  const day15 = getSpeedReadingBounds(15);
  // 150 + 14*25 = 500, 350 + 14*25 = 700 -> clamped to 600
  assert.equal(day15.minWpm, 500);
  assert.equal(day15.maxWpm, 600);
});

test('Speed reading 5-option self-assessment adjusts level by +2, +1, 0, -1, -2 and maps to WPM', () => {
  assert.equal(SPEED_READING_FEEDBACK_OPTIONS.length, 5);
  // Default Session 1 level is 3 (150 WPM)
  assert.equal(DEFAULT_INITIAL_SPEED_READING_LEVEL, 3);
  assert.equal(getSpeedReadingWpmForLevel(DEFAULT_INITIAL_SPEED_READING_LEVEL), 150);

  // Very easy -> +2 levels harder
  const veryEasyRes = calculateNextSpeedReadingLevel(3, 'very_easy');
  assert.equal(veryEasyRes.nextLevel, 5);
  assert.equal(veryEasyRes.deltaLevels, 2);
  assert.equal(veryEasyRes.nextWpm, 200);

  // Easy -> +1 level harder
  const easyRes = calculateNextSpeedReadingLevel(3, 'easy');
  assert.equal(easyRes.nextLevel, 4);
  assert.equal(easyRes.deltaLevels, 1);
  assert.equal(easyRes.nextWpm, 175);

  // Medium -> unchanged
  const mediumRes = calculateNextSpeedReadingLevel(3, 'medium');
  assert.equal(mediumRes.nextLevel, 3);
  assert.equal(mediumRes.deltaLevels, 0);
  assert.equal(mediumRes.nextWpm, 150);

  // Hard -> -1 level easier
  const hardRes = calculateNextSpeedReadingLevel(3, 'hard');
  assert.equal(hardRes.nextLevel, 2);
  assert.equal(hardRes.deltaLevels, -1);
  assert.equal(hardRes.nextWpm, 125);

  // Very hard -> -2 levels easier
  const veryHardRes = calculateNextSpeedReadingLevel(3, 'very_hard');
  assert.equal(veryHardRes.nextLevel, 1);
  assert.equal(veryHardRes.deltaLevels, -2);
  assert.equal(veryHardRes.nextWpm, 100);

  // Clamping at boundaries
  assert.equal(
    calculateNextSpeedReadingLevel(1, 'very_hard').nextLevel,
    MIN_SPEED_READING_LEVEL
  );
  assert.equal(
    calculateNextSpeedReadingLevel(MAX_SPEED_READING_LEVEL, 'very_easy').nextLevel,
    MAX_SPEED_READING_LEVEL
  );
});

test('Speed reading daily texts keep Day 1 greeting text and provide unique new texts for every subsequent day', () => {
  const day1 = getSpeedReadingDailyScript(1);
  assert.equal(day1.text.startsWith('سلام، به انجلرن خوش اومدی.'), true);

  const seenTexts = new Set<string>([day1.text]);
  for (let d = 2; d <= 30; d++) {
    const script = getSpeedReadingDailyScript(d);
    assert.equal(script.text.length > 100, true);
    assert.equal(
      seenTexts.has(script.text),
      false,
      `Day ${d} text should be unique and not repeat previous days`
    );
    seenTexts.add(script.text);
  }
});

test('evaluateSpeedReadingSession separates reading completion from comprehension accuracy', () => {
  // Completed reading all words, but chose wrong comprehension option
  const wrongAnswerResult = evaluateSpeedReadingSession({
    wordsRead: 25,
    totalWords: 25,
    selectedOptionIndex: 2,
    correctOptionIndex: 1,
  });
  assert.equal(wrongAnswerResult.readingCompleted, true);
  assert.equal(wrongAnswerResult.comprehensionPassed, false);
  assert.equal(wrongAnswerResult.overallSuccess, false);

  // Incomplete reading
  const incompleteReading = evaluateSpeedReadingSession({
    wordsRead: 10,
    totalWords: 25,
    selectedOptionIndex: 1,
    correctOptionIndex: 1,
  });
  assert.equal(incompleteReading.readingCompleted, false);
  assert.equal(incompleteReading.comprehensionPassed, true);
  assert.equal(incompleteReading.overallSuccess, false);

  // Both reading completed and comprehension question answered correctly
  const fullSuccess = evaluateSpeedReadingSession({
    wordsRead: 25,
    totalWords: 25,
    selectedOptionIndex: 1,
    correctOptionIndex: 1,
  });
  assert.equal(fullSuccess.readingCompleted, true);
  assert.equal(fullSuccess.comprehensionPassed, true);
  assert.equal(fullSuccess.overallSuccess, true);
});

test('Deep breathing requires at least 10s (5s inhale + 5s exhale)', () => {
  assert.equal(isDeepBreathingComplete(5), false);
  assert.equal(isDeepBreathingComplete(9), false);
  assert.equal(isDeepBreathingComplete(10), true);
  assert.equal(isDeepBreathingComplete(25), true);
});

test('Purchasing rules deduct coins and reject insufficient funds, negative/NaN costs, and duplicate purchases', () => {
  const profile: UserProfile = {
    id: 'u1',
    name: 'تست',
    gender: 'boy',
    coins: 5,
    isGuest: true,
    googleConnected: false,
    createdAt: '2026-11-08',
    lastActiveDate: '2026-11-08',
    streakDays: 1,
    privacy: { showAge: false, showGratitude: false, showStats: true },
  };

  assert.equal(canPurchaseItem(profile.coins, 5), true);
  assert.equal(canPurchaseItem(profile.coins, 10), false);
  assert.equal(canPurchaseItem(profile.coins, -5), false);
  assert.equal(canPurchaseItem(profile.coins, Number.NaN), false);
  assert.equal(canPurchaseItem(profile.coins, Number.POSITIVE_INFINITY), false);
  assert.equal(canPurchaseItem(profile.coins, 5, { alreadyOwned: true }), false);

  const purchaseSuccess = processPurchase(profile, 5);
  assert.equal(purchaseSuccess.success, true);
  assert.equal(purchaseSuccess.newCoins, 0);

  const purchaseFail = processPurchase({ ...profile, coins: 2 }, 5);
  assert.equal(purchaseFail.success, false);
  assert.equal(purchaseFail.newCoins, 2);

  // Negative cost must never increase player's coins
  const negativeCostAttempt = processPurchase(profile, -10);
  assert.equal(negativeCostAttempt.success, false);
  assert.equal(negativeCostAttempt.newCoins, 5);
  assert.equal(negativeCostAttempt.reason, 'invalid_cost');

  // Duplicate ownership must be rejected without deducting coins
  const duplicateAttempt = processPurchase(profile, 3, { alreadyOwned: true });
  assert.equal(duplicateAttempt.success, false);
  assert.equal(duplicateAttempt.newCoins, 5);
  assert.equal(duplicateAttempt.reason, 'already_owned');
});

test('Brain Tree Math Game generates 10 valid addition/subtraction questions across all 10 levels', () => {
  assert.equal(MATH_LEVEL_CONFIGS.length, 10);
  assert.equal(QUESTIONS_PER_MATH_ROUND, 10);

  for (let lvl = 1; lvl <= 10; lvl++) {
    const round = generateMathRound(lvl, 10);
    assert.equal(round.length, 10);

    for (const q of round) {
      assert.equal(q.level, lvl);
      assert.equal(q.correctAnswer >= 0, true);
      assert.equal(q.options.length, 4);
      assert.equal(q.options.includes(q.correctAnswer), true);
      // Verify arithmetic expression matches correctAnswer
      const computed = q.operands.reduce((acc, val, idx) => {
        if (idx === 0) return val;
        return q.operators[idx - 1] === '+' ? acc + val : acc - val;
      }, 0);
      assert.equal(computed, q.correctAnswer);
    }
  }
});

test('evaluateMathRound records response times and calculates accuracy for 10 questions', () => {
  const round = generateMathRound(3, 10);
  const attempts = round.map((q, idx) => ({
    question: q,
    userAnswer: idx < 8 ? q.correctAnswer : q.correctAnswer + 5,
    isCorrect: idx < 8,
    responseTimeMs: 1500 + idx * 200, // 1.5s to 3.3s
  }));

  const summary = evaluateMathRound(attempts, 3);
  assert.equal(summary.level, 3);
  assert.equal(summary.totalQuestions, 10);
  assert.equal(summary.correctCount, 8);
  assert.equal(summary.wrongCount, 2);
  assert.equal(summary.accuracyPercent, 80);
  assert.equal(summary.passed, true);
  assert.equal(summary.totalTimeSeconds, 24);
  assert.equal(summary.averageTimeSeconds, 2.4);
  assert.equal(summary.fastestTimeSeconds, 1.5);
});

test('Poetry Tree contains 10 famous Iranian poets and requires at least 10 seconds on poem page to water', () => {
  assert.equal(FAMOUS_IRANIAN_POETS.length, 10);
  const poetIds = FAMOUS_IRANIAN_POETS.map((p) => p.id);
  assert.equal(poetIds.includes('ferdowsi'), true);
  assert.equal(poetIds.includes('saadi'), true);
  assert.equal(poetIds.includes('hafez'), true);
  assert.equal(poetIds.includes('molavi'), true);

  for (const poet of FAMOUS_IRANIAN_POETS) {
    assert.equal(poet.poems.length > 0, true);
    assert.equal(poet.poems[0].lines.length >= 2, true);
  }

  assert.equal(isPoetryReadingComplete(10, null), false);
  assert.equal(isPoetryReadingComplete(9, 'hafez'), false);
  assert.equal(isPoetryReadingComplete(10, 'hafez'), true);
  assert.equal(isPoetryReadingComplete(15, 'ferdowsi'), true);
});

test('Brain Tree adaptive placement climbs for fast accurate answers and recommends calibrated level 1..10', () => {
  assert.equal(MATH_PLACEMENT_QUESTIONS, 5);
  assert.equal(MATH_PLACEMENT_START_LEVEL, 3);

  // Fast accurate player (5/5 under 2.5s) should reach top tier
  let fastProbe = MATH_PLACEMENT_START_LEVEL;
  const fastAttempts = Array.from({ length: MATH_PLACEMENT_QUESTIONS }, (_, i) => {
    const q = generateMathQuestion(fastProbe, i + 1);
    fastProbe = getNextMathPlacementProbeLevel(fastProbe, true, 2400);
    return {
      question: q,
      userAnswer: q.correctAnswer,
      isCorrect: true,
      responseTimeMs: 2400,
    };
  });
  const fastSummary = evaluateMathPlacement(fastAttempts);
  assert.equal(fastSummary.recommendedLevel, 10);
  assert.equal(fastSummary.correctCount, 5);
  assert.equal(fastSummary.accuracyPercent, 100);

  // Steady moderate speed player (5/5 at 5.5s) -> Level 7
  let midProbe = MATH_PLACEMENT_START_LEVEL;
  const midAttempts = Array.from({ length: MATH_PLACEMENT_QUESTIONS }, (_, i) => {
    const q = generateMathQuestion(midProbe, i + 1);
    midProbe = getNextMathPlacementProbeLevel(midProbe, true, 5500);
    return {
      question: q,
      userAnswer: q.correctAnswer,
      isCorrect: true,
      responseTimeMs: 5500,
    };
  });
  const midSummary = evaluateMathPlacement(midAttempts);
  assert.equal(midSummary.recommendedLevel, 7);

  // Struggling player (0/5 wrong) -> Level 1
  let lowProbe = MATH_PLACEMENT_START_LEVEL;
  const lowAttempts = Array.from({ length: MATH_PLACEMENT_QUESTIONS }, (_, i) => {
    const q = generateMathQuestion(lowProbe, i + 1);
    lowProbe = getNextMathPlacementProbeLevel(lowProbe, false, 6000);
    return {
      question: q,
      userAnswer: q.correctAnswer + 1,
      isCorrect: false,
      responseTimeMs: 6000,
    };
  });
  const lowSummary = evaluateMathPlacement(lowAttempts);
  assert.equal(lowSummary.recommendedLevel, 1);
  assert.equal(lowSummary.correctCount, 0);
});

test('Memory Tree adaptive placement calibrates level 1..4 based on mistakes and recall speed', () => {
  assert.equal(MEMORY_PLACEMENT_ROUNDS, 3);
  assert.equal(MEMORY_PLACEMENT_START_TIER, 2);
  assert.equal(getMemoryPlacementTierConfig(2).numberCount, 6);

  // Zero-mistake fast player climbs from Tier 2 -> 4 -> 4 -> recommends Level 4
  let fastTier = MEMORY_PLACEMENT_START_TIER;
  const fastAttempts = [];
  for (let i = 0; i < MEMORY_PLACEMENT_ROUNDS; i++) {
    const cfg = getMemoryPlacementTierConfig(fastTier);
    fastAttempts.push({
      tier: fastTier,
      cardCount: cfg.numberCount,
      mistakes: 0,
      recallTimeMs: 7500,
    });
    fastTier = getNextMemoryPlacementProbeTier(fastTier, 0, 7500);
  }
  const fastSummary = evaluateMemoryPlacement(fastAttempts);
  assert.equal(fastSummary.recommendedLevel, 4);
  assert.equal(fastSummary.recommendedPairCount, 10);
  assert.equal(fastSummary.recommendedNumberCount, 12);
  assert.equal(fastSummary.zeroMistakeRounds, 3);

  // Moderate player: 0 mistakes (slow) -> Tier 3, then 1 mistake -> Tier 3, then 1 mistake -> Tier 3
  const midSummary = evaluateMemoryPlacement([
    { tier: 2, cardCount: 6, mistakes: 0, recallTimeMs: 14000 },
    { tier: 3, cardCount: 8, mistakes: 1, recallTimeMs: 15000 },
    { tier: 3, cardCount: 8, mistakes: 1, recallTimeMs: 14500 },
  ]);
  assert.equal(midSummary.recommendedLevel, 3);
  assert.equal(midSummary.recommendedPairCount, 8);
  assert.equal(midSummary.recommendedNumberCount, 9);

  // Struggling player (3+ mistakes every round) -> Level 1
  const lowSummary = evaluateMemoryPlacement([
    { tier: 2, cardCount: 6, mistakes: 3, recallTimeMs: 18000 },
    { tier: 1, cardCount: 4, mistakes: 2, recallTimeMs: 16000 },
    { tier: 1, cardCount: 4, mistakes: 2, recallTimeMs: 15000 },
  ]);
  assert.equal(lowSummary.recommendedLevel, 1);
  assert.equal(lowSummary.recommendedPairCount, 4);
  assert.equal(lowSummary.recommendedNumberCount, 5);
});

test('Bina Tree has 5 escalating visual tracking levels and adaptive placement calibrates 1..5', () => {
  assert.equal(BINA_LEVEL_CONFIGS.length, 5);
  assert.equal(BINA_PLACEMENT_ROUNDS, 3);
  assert.equal(BINA_PLACEMENT_START_LEVEL, 2);
  assert.equal(getBinaLevelConfig(1).targetCount, 1);
  assert.equal(getBinaLevelConfig(4).targetCount, 2);
  assert.equal(getBinaLevelConfig(5).totalBalls, 13);

  // Fast accurate player hits Level 2 -> Level 4 -> Level 5 -> recommends Level 5
  let probe = BINA_PLACEMENT_START_LEVEL;
  const expertAttempts = [];
  for (let i = 0; i < BINA_PLACEMENT_ROUNDS; i++) {
    const cfg = getBinaLevelConfig(probe);
    expertAttempts.push({
      level: probe,
      targetCount: cfg.targetCount,
      correctTargets: cfg.targetCount,
      selectionTimeMs: 2200,
    });
    probe = getNextBinaPlacementProbeLevel(probe, cfg.targetCount, cfg.targetCount, 2200);
  }
  const expertSummary = evaluateBinaPlacement(expertAttempts);
  assert.equal(expertSummary.recommendedLevel, 5);
  assert.equal(expertSummary.perfectRounds, 3);
  assert.equal(expertSummary.accuracyPercent, 100);

  // Mid player: hits L2 (slow -> L3), hits L3 (slow -> L4), gets 1/2 targets at L4 -> holds L4 -> Level 4
  const midSummary = evaluateBinaPlacement([
    { level: 2, targetCount: 1, correctTargets: 1, selectionTimeMs: 5000 },
    { level: 3, targetCount: 1, correctTargets: 1, selectionTimeMs: 4200 },
    { level: 4, targetCount: 2, correctTargets: 1, selectionTimeMs: 4800 },
  ]);
  assert.equal(midSummary.recommendedLevel, 4);

  // Missing every round recommends Level 1
  const lowSummary = evaluateBinaPlacement([
    { level: 2, targetCount: 1, correctTargets: 0, selectionTimeMs: 5000 },
    { level: 1, targetCount: 1, correctTargets: 0, selectionTimeMs: 5000 },
    { level: 1, targetCount: 1, correctTargets: 0, selectionTimeMs: 5000 },
  ]);
  assert.equal(lowSummary.recommendedLevel, 1);
  assert.equal(lowSummary.accuracyPercent, 0);
});

test('Speed Reading initial placement calibrates WPM and level from reading speed + comprehension answer', () => {
  assert.equal(SPEED_READING_PLACEMENT_PASSAGE.options.length, 4);
  assert.equal(SPEED_READING_PLACEMENT_PASSAGE.wordCount > 60, true);

  // Fast accurate reader (~17s for ~84 words -> ~300 WPM -> Level 9)
  const fastAccurate = evaluateSpeedReadingPlacement({
    wordCount: SPEED_READING_PLACEMENT_PASSAGE.wordCount,
    readingTimeMs: 17000,
    selectedOptionIndex: SPEED_READING_PLACEMENT_PASSAGE.correctIdx,
    correctOptionIndex: SPEED_READING_PLACEMENT_PASSAGE.correctIdx,
  });
  assert.equal(fastAccurate.comprehensionPassed, true);
  assert.equal(fastAccurate.rushedWarning, false);
  assert.equal(fastAccurate.recommendedWpm >= 275 && fastAccurate.recommendedWpm <= 325, true);

  // Fast reader who answers comprehension WRONG is capped conservatively <= 150 WPM (Level <= 3)
  const fastWrong = evaluateSpeedReadingPlacement({
    wordCount: SPEED_READING_PLACEMENT_PASSAGE.wordCount,
    readingTimeMs: 12000,
    selectedOptionIndex: 0,
    correctOptionIndex: SPEED_READING_PLACEMENT_PASSAGE.correctIdx,
  });
  assert.equal(fastWrong.comprehensionPassed, false);
  assert.equal(fastWrong.recommendedWpm <= 150, true);
  assert.equal(fastWrong.recommendedLevel <= 3, true);

  // Instant double-click skip (< 5s) triggers rushedWarning and caps starting WPM
  const skipped = evaluateSpeedReadingPlacement({
    wordCount: SPEED_READING_PLACEMENT_PASSAGE.wordCount,
    readingTimeMs: 1200,
    selectedOptionIndex: SPEED_READING_PLACEMENT_PASSAGE.correctIdx,
    correctOptionIndex: SPEED_READING_PLACEMENT_PASSAGE.correctIdx,
  });
  assert.equal(skipped.rushedWarning, true);
  assert.equal(skipped.recommendedWpm, 175);
});

test('Deep Breathing Tree has 4 lung-capacity levels and calibrates from smooth exhale duration', () => {
  assert.equal(BREATHING_LEVEL_CONFIGS.length, 4);
  assert.equal(getBreathingLevelConfig(1).boxPhaseMs, 3000);
  assert.equal(getBreathingLevelConfig(2).boxPhaseMs, 4000);
  assert.equal(getBreathingLevelConfig(3).boxPhaseMs, 5000);
  assert.equal(getBreathingLevelConfig(4).boxPhaseMs, 6000);

  // Instant skip (< 2.5s) -> rushedWarning & safe Level 1
  const rushed = evaluateBreathingPlacement(800);
  assert.equal(rushed.rushedWarning, true);
  assert.equal(rushed.recommendedLevel, 1);

  // Short gentle exhale (6.5s) -> Level 1
  const gentle = evaluateBreathingPlacement(6500);
  assert.equal(gentle.rushedWarning, false);
  assert.equal(gentle.recommendedLevel, 1);

  // Balanced exhale (12.4s) -> Level 2
  const balanced = evaluateBreathingPlacement(12400);
  assert.equal(balanced.recommendedLevel, 2);
  assert.equal(balanced.exhaleSeconds, 12.4);

  // Deep exhale (19.0s) -> Level 3
  const deep = evaluateBreathingPlacement(19000);
  assert.equal(deep.recommendedLevel, 3);

  // Mastery exhale (26.5s) -> Level 4
  const mastery = evaluateBreathingPlacement(26500);
  assert.equal(mastery.recommendedLevel, 4);
});

test('Brain Math keypad auto-confirms only on exact match and shows no reaction on wrong digits', () => {
  // Multi-digit answer 14: typing '1' stays silent, then '4' auto-confirms
  const step1 = evaluateBrainKeypadDigit('', '1', 14);
  assert.equal(step1.nextInput, '1');
  assert.equal(step1.isExactMatch, false);

  const step2 = evaluateBrainKeypadDigit(step1.nextInput, '4', 14);
  assert.equal(step2.nextInput, '14');
  assert.equal(step2.isExactMatch, true);

  // Wrong digit stays silent without triggering match
  const wrong = evaluateBrainKeypadDigit('', '9', 14);
  assert.equal(wrong.nextInput, '9');
  assert.equal(wrong.isExactMatch, false);

  // Zero answer matches immediately when '0' is pressed
  const zeroMatch = evaluateBrainKeypadDigit('', '0', 0);
  assert.equal(zeroMatch.nextInput, '0');
  assert.equal(zeroMatch.isExactMatch, true);

  // Respects maxDigits cap and ignores non-digits
  const capped = evaluateBrainKeypadDigit('12345', '6', 14, 5);
  assert.equal(capped.nextInput, '12345');
  assert.equal(capped.isExactMatch, false);
});

test('Spring of Living Water grants exactly 20 coins once per day and resets next day', () => {
  const baseProfile: UserProfile = {
    id: 'u1',
    name: 'همسفر',
    gender: 'girl',
    coins: 45,
    isGuest: true,
    googleConnected: false,
    createdAt: '2026-11-16',
    lastActiveDate: '2026-11-17',
    streakDays: 1,
    privacy: { showAge: false, showGratitude: false, showStats: true },
  };

  assert.equal(SPRING_DAILY_COIN_REWARD, 20);
  assert.equal(canCollectSpringToday(undefined, '2026-11-17'), true);

  const first = collectSpringWater(baseProfile, '2026-11-17');
  assert.equal(first.collected, true);
  assert.equal(first.coinsEarned, 20);
  assert.equal(first.updatedProfile.coins, 65);
  assert.equal(first.updatedProfile.lastSpringCollectedDate, '2026-11-17');
  assert.equal(canCollectSpringToday(first.updatedProfile.lastSpringCollectedDate, '2026-11-17'), false);

  // Repeating on the same day yields 0 coins
  const repeatSameDay = collectSpringWater(first.updatedProfile, '2026-11-17');
  assert.equal(repeatSameDay.collected, false);
  assert.equal(repeatSameDay.coinsEarned, 0);
  assert.equal(repeatSameDay.updatedProfile.coins, 65);

  // Next day becomes available again
  assert.equal(canCollectSpringToday(first.updatedProfile.lastSpringCollectedDate, '2026-11-18'), true);
  const nextDay = collectSpringWater(first.updatedProfile, '2026-11-18');
  assert.equal(nextDay.collected, true);
  assert.equal(nextDay.coinsEarned, 20);
  assert.equal(nextDay.updatedProfile.coins, 85);
});

test('Tree coin payouts scale monotonically with growth stage and cap at 24h (6x 4h ticks)', () => {
  const rates = ([0, 1, 2, 3, 4, 5] as const).map((s) =>
    getTreeCoinsPer4HoursForStage(s)
  );
  assert.deepEqual(rates, [1, 2, 3, 5, 7, 10]);
  for (let i = 1; i < rates.length; i++) {
    assert.equal(rates[i] > rates[i - 1], true);
  }
  assert.equal(getTreeCoinMaxDailyStorage(0), 6);
  assert.equal(getTreeCoinMaxDailyStorage(3), 30);
  assert.equal(getTreeCoinMaxDailyStorage(5), 60);

  const startMs = Date.UTC(2026, 10, 17, 8, 0, 0);
  const unwateredTree: TreeData = {
    id: 'brain_math',
    name: 'درخت مغز',
    description: '',
    cost: 0,
    unlocked: true,
    wateredDaysCount: 8, // Stage 3 -> 5 coins / 4h, max 30 / day
    lastWateredDate: undefined,
    daysWithoutWater: 0,
    isWithered: false,
    position: { x: 4, y: 3 },
  };

  // Unwatered tree generates 0 coins
  const preStatus = getTreeCoinStatus(unwateredTree, startMs);
  assert.equal(preStatus.readyCoins, 0);
  assert.equal(preStatus.isActiveWindow, false);
  assert.equal(preStatus.coinsPerInterval, 5);
  assert.equal(preStatus.maxStorageCoins, 30);

  // Water at t = 0
  const { updatedTree: watered } = waterTree(unwateredTree, '2026-11-17', startMs);
  assert.equal(watered.lastWateredAtMs, startMs);
  assert.equal(getTreeCoinStatus(watered, startMs + 3 * 60 * 60 * 1000).readyCoins, 0);
  assert.equal(
    getTreeCoinStatus(watered, startMs + 3 * 60 * 60 * 1000).msUntilNextCoin,
    1 * 60 * 60 * 1000
  );

  // At t = 5h (1 tick ready, 1h into 2nd tick) -> 5 coins ready, 3h until next
  const at5h = getTreeCoinStatus(watered, startMs + 5 * 60 * 60 * 1000);
  assert.equal(at5h.readyCoins, 5);
  assert.equal(at5h.isFull, false);
  assert.equal(at5h.msUntilNextCoin, 3 * 60 * 60 * 1000);

  // Harvest at t = 5h preserves the 1h elapsed progress so next tick lands at t = 8h
  const { updatedTree: after5hHarvest, coinsHarvested } = harvestTreeCoins(
    watered,
    startMs + 5 * 60 * 60 * 1000
  );
  assert.equal(coinsHarvested, 5);
  assert.equal(
    getTreeCoinStatus(after5hHarvest, startMs + 7 * 60 * 60 * 1000).readyCoins,
    0
  );
  assert.equal(
    getTreeCoinStatus(after5hHarvest, startMs + 8 * 60 * 60 * 1000).readyCoins,
    5
  );

  // Wait 36h without harvesting -> capped strictly at 1 day (24h = 6 ticks = 30 coins)
  const at36h = getTreeCoinStatus(watered, startMs + 36 * 60 * 60 * 1000);
  assert.equal(at36h.readyCoins, 30);
  assert.equal(at36h.isFull, true);
  assert.equal(at36h.isActiveWindow, false);
  assert.equal(at36h.msUntilNextCoin, null);

  // Re-watering on a new day before harvesting preserves the 30 banked coins cleanly
  const { updatedTree: rewateredBeforeHarvest } = waterTree(
    watered,
    '2026-11-18',
    startMs + TREE_COIN_WINDOW_MS + 2 * 60 * 60 * 1000
  );
  assert.equal(rewateredBeforeHarvest.storedCoins, 30);
  // 4 hours into Day 2 after harvesting Day 1's 30 coins:
  const { updatedTree: clearedAfterRewater, coinsHarvested: day1Coins } =
    harvestTreeCoins(
      rewateredBeforeHarvest,
      startMs + TREE_COIN_WINDOW_MS + 2 * 60 * 60 * 1000
    );
  assert.equal(day1Coins, 30);
  assert.equal(
    getTreeCoinStatus(
      clearedAfterRewater,
      startMs + TREE_COIN_WINDOW_MS + 2 * 60 * 60 * 1000 + TREE_COIN_INTERVAL_MS
    ).readyCoins,
    5
  );
});
