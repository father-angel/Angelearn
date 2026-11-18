import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROUP_CHALLENGE_GAMES,
  isValidGroupChallengeGameId,
  sanitizeChallengeTitle,
  makeGroupChallengeId,
  shouldUpdateChallengeRecord,
  calculateBrainChallengeScore,
  calculateBinaChallengeScore,
  calculateMemoryChallengeScore,
  sortChallengeLeaderboard,
  COLOR_TRAP_ROUND_SECONDS,
  COLOR_TRAP_QUESTIONS_PER_STAGE,
  COLOR_TRAP_COLORS,
  getColorTrapStageConfig,
  generateColorTrapQuestion,
  evaluateColorTrapAnswer,
  summarizeColorTrapRound,
  LOGIC_MIND_TOTAL_QUESTIONS,
  LOGIC_MIND_ROUND_SECONDS,
  getLogicMindDifficultyConfig,
  getVerifiedLogicMindBank,
  generateLogicMindChallengeQuestions,
  evaluateLogicMindAnswer,
  summarizeLogicMindRound,
  SPATIAL_MEMORY_ROUND_SECONDS,
  SPATIAL_MEMORY_INITIAL_LIVES,
  getSpatialMemoryLevelConfig,
  generateSpatialMemorySequence,
  evaluateSpatialMemoryLevelOutcome,
  summarizeSpatialMemoryRound,
  COORDINATION_DUEL_ROUND_SECONDS,
  COORDINATION_DUEL_COMMANDS_PER_STAGE,
  COORDINATION_DUEL_DUAL_SYNC_WINDOW_MS,
  getCoordinationDuelStageConfig,
  generateCoordinationDuelCommand,
  isValidDualTouchSync,
  evaluateCoordinationDuelOutcome,
  summarizeCoordinationDuelRound,
} from './groupChallenges';

test('GROUP_CHALLENGE_GAMES includes escalating games brain_math, bina_balls, memory_cards, color_trap, logic_mind, spatial_memory, and coordination_duel', () => {
  const ids = GROUP_CHALLENGE_GAMES.map((g) => g.id);
  assert.deepEqual(ids, [
    'brain_math',
    'bina_balls',
    'memory_cards',
    'color_trap',
    'logic_mind',
    'spatial_memory',
    'coordination_duel',
  ]);
  assert.equal(isValidGroupChallengeGameId('bina_balls'), true);
  assert.equal(isValidGroupChallengeGameId('color_trap'), true);
  assert.equal(isValidGroupChallengeGameId('logic_mind'), true);
  assert.equal(isValidGroupChallengeGameId('spatial_memory'), true);
  assert.equal(isValidGroupChallengeGameId('coordination_duel'), true);
  assert.equal(isValidGroupChallengeGameId('poetry'), false);
});

test('sanitizeChallengeTitle falls back gracefully and enforces max 60 chars', () => {
  assert.equal(
    sanitizeChallengeTitle('   ', 'bina_balls'),
    'چالش ردیابی دیداری درخت بینا'
  );
  assert.equal(
    sanitizeChallengeTitle('', 'color_trap'),
    'چالش سرعت و تمرکز تله رنگ‌ها'
  );
  assert.equal(
    sanitizeChallengeTitle('', 'logic_mind'),
    'چالش استدلال و الگوهای ذهن منطقی'
  );
  assert.equal(
    sanitizeChallengeTitle('', 'spatial_memory'),
    'چالش حافظه فضایی و توالی رنگ‌ها'
  );
  const long = 'الف'.repeat(80);
  assert.equal(sanitizeChallengeTitle(long, 'brain_math').length, 60);
});

test('shouldUpdateChallengeRecord strictly keeps only the highest record on repeated attempts', () => {
  assert.equal(shouldUpdateChallengeRecord(null, 0), true);
  assert.equal(shouldUpdateChallengeRecord(undefined, 120), true);
  assert.equal(shouldUpdateChallengeRecord(500, 720), true);
  assert.equal(shouldUpdateChallengeRecord(500, 500), false);
  assert.equal(shouldUpdateChallengeRecord(500, 340), false);
  assert.equal(shouldUpdateChallengeRecord(500, 0), false);
});

test('scoring helpers reward escalating level mastery, accuracy, and speed', () => {
  const brainHigh = calculateBrainChallengeScore({
    highestLevelReached: 9,
    correctCount: 9,
    totalQuestions: 10,
    avgResponseMs: 2200,
  });
  const brainLow = calculateBrainChallengeScore({
    highestLevelReached: 2,
    correctCount: 3,
    totalQuestions: 10,
    avgResponseMs: 6500,
  });
  assert.equal(brainHigh > brainLow, true);

  const binaHigh = calculateBinaChallengeScore({
    clearedRounds: 5,
    highestLevelCleared: 5,
    totalTargetsHit: 7,
    elapsedSeconds: 45,
  });
  const binaLow = calculateBinaChallengeScore({
    clearedRounds: 1,
    highestLevelCleared: 1,
    totalTargetsHit: 1,
    elapsedSeconds: 20,
  });
  assert.equal(binaHigh > binaLow, true);

  const memHigh = calculateMemoryChallengeScore({
    clearedStages: 4,
    maxCardCount: 12,
    totalMistakes: 0,
    elapsedSeconds: 50,
  });
  const memLow = calculateMemoryChallengeScore({
    clearedStages: 1,
    maxCardCount: 5,
    totalMistakes: 4,
    elapsedSeconds: 40,
  });
  assert.equal(memHigh > memLow, true);
});

test('sortChallengeLeaderboard orders highest scores first and breaks ties by earliest timestamp', () => {
  const sorted = sortChallengeLeaderboard([
    { playerUid: 'u1', bestScore: 600, updatedAtMs: 3000 },
    { playerUid: 'u2', bestScore: 850, updatedAtMs: 5000 },
    { playerUid: 'u3', bestScore: 850, updatedAtMs: 2000 },
  ]);
  assert.deepEqual(
    sorted.map((s) => s.playerUid),
    ['u3', 'u2', 'u1']
  );
  assert.match(makeGroupChallengeId('uid_123', 1000), /^chg_[a-z0-9]+_uid_123_/);
});

test('Color Trap (تله رنگ‌ها) escalates difficulty every 8 questions across 4 stages', () => {
  assert.equal(COLOR_TRAP_ROUND_SECONDS, 45);
  assert.equal(COLOR_TRAP_QUESTIONS_PER_STAGE, 8);
  assert.equal(COLOR_TRAP_COLORS.length, 6);

  // Stage 1 (questions 0..7): 4 colors, 30% incongruent
  const s1Start = getColorTrapStageConfig(0);
  const s1End = getColorTrapStageConfig(7);
  assert.equal(s1Start.stage, 1);
  assert.equal(s1End.stage, 1);
  assert.equal(s1Start.colorCount, 4);
  assert.equal(s1Start.incongruentRatio, 0.30);
  assert.equal(s1Start.hasStrictQuestionTimer, false);

  // Stage 2 (questions 8..15): 4 colors, 50% incongruent
  const s2Start = getColorTrapStageConfig(8);
  const s2End = getColorTrapStageConfig(15);
  assert.equal(s2Start.stage, 2);
  assert.equal(s2End.stage, 2);
  assert.equal(s2Start.colorCount, 4);
  assert.equal(s2Start.incongruentRatio, 0.50);

  // Stage 3 (questions 16..23): 5 colors, 70% incongruent
  const s3Start = getColorTrapStageConfig(16);
  const s3End = getColorTrapStageConfig(23);
  assert.equal(s3Start.stage, 3);
  assert.equal(s3End.stage, 3);
  assert.equal(s3Start.colorCount, 5);
  assert.equal(s3Start.incongruentRatio, 0.70);

  // Stage 4 (questions 24+): 6 colors, 80% incongruent, shorter response timer
  const s4Start = getColorTrapStageConfig(24);
  const s4Later = getColorTrapStageConfig(42);
  assert.equal(s4Start.stage, 4);
  assert.equal(s4Later.stage, 4);
  assert.equal(s4Start.colorCount, 6);
  assert.equal(s4Start.incongruentRatio, 0.80);
  assert.equal(s4Start.hasStrictQuestionTimer, true);
  assert.equal(s4Start.questionTimeLimitMs < s1Start.questionTimeLimitMs, true);
});

test('Color Trap generates controlled, unambiguous questions from active color pool', () => {
  // Force incongruent question in Stage 1 (randomFn returns 0.1 < 0.30)
  let seq = 0;
  const rolls = [0.1, 0.0, 0.5, 0.25];
  const qIncongruent = generateColorTrapQuestion(0, null, () => {
    const val = rolls[seq % rolls.length];
    seq += 1;
    return val;
  });
  assert.equal(qIncongruent.stage, 1);
  assert.equal(qIncongruent.activeColors.length, 4);
  assert.equal(qIncongruent.isIncongruent, true);
  assert.notEqual(qIncongruent.wordColorId, qIncongruent.inkColorId);
  assert.equal(
    qIncongruent.activeColors.some((c) => c.id === qIncongruent.inkColorId),
    true
  );
  assert.equal(
    qIncongruent.activeColors.some((c) => c.id === qIncongruent.wordColorId),
    true
  );

  // Force congruent question in Stage 1 (randomFn returns 0.85 >= 0.30)
  const qCongruent = generateColorTrapQuestion(1, qIncongruent, () => 0.85);
  assert.equal(qCongruent.isIncongruent, false);
  assert.equal(qCongruent.wordColorId, qCongruent.inkColorId);

  // Avoids immediate identical repetition when previousQuestion is provided
  const qNext = generateColorTrapQuestion(2, qCongruent, () => 0.85);
  assert.equal(
    qNext.wordColorId === qCongruent.wordColorId &&
      qNext.inkColorId === qCongruent.inkColorId,
    false
  );
});

test('Color Trap scoring awards +100 base, up to +20 speed, +10/+20/+30 every 3 streak, -30 on wrong, and never goes negative', () => {
  const wrongFromLow = evaluateColorTrapAnswer({
    isCorrect: false,
    responseTimeMs: 900,
    questionTimeLimitMs: 3000,
    currentStreak: 2,
    bestStreak: 2,
    currentScore: 10,
  });
  assert.equal(wrongFromLow.isCorrect, false);
  assert.equal(wrongFromLow.nextStreak, 0);
  assert.equal(wrongFromLow.nextScore, 0);

  const c1 = evaluateColorTrapAnswer({
    isCorrect: true,
    responseTimeMs: 300,
    questionTimeLimitMs: 3000,
    currentStreak: 0,
    bestStreak: 0,
    currentScore: 0,
  });
  assert.equal(c1.isCorrect, true);
  assert.equal(c1.basePoints, 100);
  assert.equal(c1.speedBonus, 20);
  assert.equal(c1.comboBonus, 0);
  assert.equal(c1.nextStreak, 1);
  assert.equal(c1.nextScore, 120);

  const c2 = evaluateColorTrapAnswer({
    isCorrect: true,
    responseTimeMs: 300,
    questionTimeLimitMs: 3000,
    currentStreak: c1.nextStreak,
    bestStreak: c1.nextBestStreak,
    currentScore: c1.nextScore,
  });
  assert.equal(c2.nextStreak, 2);
  assert.equal(c2.comboBonus, 0);

  const c3 = evaluateColorTrapAnswer({
    isCorrect: true,
    responseTimeMs: 300,
    questionTimeLimitMs: 3000,
    currentStreak: c2.nextStreak,
    bestStreak: c2.nextBestStreak,
    currentScore: c2.nextScore,
  });
  assert.equal(c3.nextStreak, 3);
  assert.equal(c3.comboBonus, 10);
  assert.equal(c3.scoreDelta, 130);

  const c6 = evaluateColorTrapAnswer({
    isCorrect: true,
    responseTimeMs: 300,
    questionTimeLimitMs: 3000,
    currentStreak: 5,
    bestStreak: 5,
    currentScore: 600,
  });
  assert.equal(c6.nextStreak, 6);
  assert.equal(c6.comboBonus, 20);

  const c9 = evaluateColorTrapAnswer({
    isCorrect: true,
    responseTimeMs: 300,
    questionTimeLimitMs: 3000,
    currentStreak: 8,
    bestStreak: 8,
    currentScore: 1000,
  });
  assert.equal(c9.nextStreak, 9);
  assert.equal(c9.comboBonus, 30);

  const c12 = evaluateColorTrapAnswer({
    isCorrect: true,
    responseTimeMs: 300,
    questionTimeLimitMs: 3000,
    currentStreak: 11,
    bestStreak: 11,
    currentScore: 1400,
  });
  assert.equal(c12.nextStreak, 12);
  assert.equal(c12.comboBonus, 30);

  const wrongAfterStreak = evaluateColorTrapAnswer({
    isCorrect: false,
    responseTimeMs: 600,
    questionTimeLimitMs: 3000,
    currentStreak: 9,
    bestStreak: 9,
    currentScore: 1000,
  });
  assert.equal(wrongAfterStreak.isCorrect, false);
  assert.equal(wrongAfterStreak.scoreDelta, -30);
  assert.equal(wrongAfterStreak.nextScore, 970);
  assert.equal(wrongAfterStreak.nextStreak, 0);
  assert.equal(wrongAfterStreak.nextBestStreak, 9);
});

test('summarizeColorTrapRound computes final score, accuracy, average speed, and best streak', () => {
  const responseTimesMs = Array.from({ length: 20 }, () => 950);
  const summary = summarizeColorTrapRound({
    finalScore: 1840,
    correctCount: 17,
    wrongCount: 3,
    responseTimesMs,
    bestStreak: 11,
  });
  assert.equal(summary.finalScore, 1840);
  assert.equal(summary.totalAnswered, 20);
  assert.equal(summary.accuracyPercent, 85);
  assert.equal(summary.averageResponseMs, 950);
  assert.equal(summary.averageResponseSeconds, 0.95);
  assert.equal(summary.bestStreak, 11);
  assert.equal(summary.highestStageReached, 3);
});

test('Logic Mind (ذهن منطقی) question bank has 36 verified 4-option questions with unique correct answers', () => {
  assert.equal(LOGIC_MIND_TOTAL_QUESTIONS, 10);
  assert.equal(LOGIC_MIND_ROUND_SECONDS, 90);

  const bank = getVerifiedLogicMindBank();
  assert.equal(bank.length, 36);

  const easyItems = bank.filter((q) => q.difficulty === 'easy');
  const mediumItems = bank.filter((q) => q.difficulty === 'medium');
  const hardItems = bank.filter((q) => q.difficulty === 'hard');
  assert.equal(easyItems.length, 12);
  assert.equal(mediumItems.length, 12);
  assert.equal(hardItems.length, 12);

  for (const item of bank) {
    assert.equal(item.options.length, 4);
    const uniqueOpts = new Set(item.options);
    assert.equal(uniqueOpts.size, 4, `Question ${item.id} must have 4 distinct options`);
    assert.equal(
      item.options.includes(item.correctOption),
      true,
      `Question ${item.id} correctOption must exist in options`
    );
  }
});

test('Logic Mind difficulty escalates Q1..3 easy, Q4..7 medium dual-rule, Q8..10 hard combined', () => {
  for (let i = 0; i <= 2; i++) {
    const cfg = getLogicMindDifficultyConfig(i);
    assert.equal(cfg.difficulty, 'easy');
    assert.equal(cfg.basePoints, 100);
  }
  for (let i = 3; i <= 6; i++) {
    const cfg = getLogicMindDifficultyConfig(i);
    assert.equal(cfg.difficulty, 'medium');
    assert.equal(cfg.basePoints, 150);
  }
  for (let i = 7; i <= 9; i++) {
    const cfg = getLogicMindDifficultyConfig(i);
    assert.equal(cfg.difficulty, 'hard');
    assert.equal(cfg.basePoints, 200);
  }
});

test('Logic Mind generates deterministic 10-question set shared identically across all group members for a challengeId', () => {
  const memberA = generateLogicMindChallengeQuestions('chg_group_alpha_101');
  const memberB = generateLogicMindChallengeQuestions('chg_group_alpha_101');
  const otherChallenge = generateLogicMindChallengeQuestions('chg_group_alpha_999');

  assert.equal(memberA.length, 10);
  assert.deepEqual(memberA, memberB);

  // Verify difficulty curve across the 10 generated questions
  assert.deepEqual(
    memberA.map((q) => q.difficulty),
    [
      'easy',
      'easy',
      'easy',
      'medium',
      'medium',
      'medium',
      'medium',
      'hard',
      'hard',
      'hard',
    ]
  );

  // Different challengeId yields a different question set from the bank
  assert.notDeepEqual(
    memberA.map((q) => q.id),
    otherChallenge.map((q) => q.id)
  );
});

test('Logic Mind scoring awards +100/+150/+200 base, up to +20 speed, +10/+20/+30 every 3 streak, and 0 on wrong answer', () => {
  // Easy correct (Q1, index 0) fast response -> +100 base + 20 speed = 120
  const q1 = evaluateLogicMindAnswer({
    questionIndex: 0,
    isCorrect: true,
    responseTimeMs: 1200,
    currentScore: 0,
    currentStreak: 0,
    bestStreak: 0,
  });
  assert.equal(q1.basePoints, 100);
  assert.equal(q1.speedBonus, 20);
  assert.equal(q1.comboBonus, 0);
  assert.equal(q1.nextScore, 120);

  // Easy correct (Q2, index 1)
  const q2 = evaluateLogicMindAnswer({
    questionIndex: 1,
    isCorrect: true,
    responseTimeMs: 1200,
    currentScore: q1.nextScore,
    currentStreak: q1.nextStreak,
    bestStreak: q1.nextBestStreak,
  });
  assert.equal(q2.nextStreak, 2);
  assert.equal(q2.comboBonus, 0);

  // Easy correct (Q3, index 2) -> 3rd consecutive correct triggers +10 combo bonus!
  const q3 = evaluateLogicMindAnswer({
    questionIndex: 2,
    isCorrect: true,
    responseTimeMs: 1200,
    currentScore: q2.nextScore,
    currentStreak: q2.nextStreak,
    bestStreak: q2.nextBestStreak,
  });
  assert.equal(q3.nextStreak, 3);
  assert.equal(q3.comboBonus, 10);
  assert.equal(q3.scoreDelta, 130);

  // Medium correct (Q4, index 3) -> +150 base
  const q4 = evaluateLogicMindAnswer({
    questionIndex: 3,
    isCorrect: true,
    responseTimeMs: 1200,
    currentScore: q3.nextScore,
    currentStreak: q3.nextStreak,
    bestStreak: q3.nextBestStreak,
  });
  assert.equal(q4.difficulty, 'medium');
  assert.equal(q4.basePoints, 150);

  // Hard correct (Q9, index 8) at streak 8 -> 9th consecutive correct triggers +200 base + 20 speed + 30 combo = 250
  const q9 = evaluateLogicMindAnswer({
    questionIndex: 8,
    isCorrect: true,
    responseTimeMs: 1200,
    currentScore: 1000,
    currentStreak: 8,
    bestStreak: 8,
  });
  assert.equal(q9.difficulty, 'hard');
  assert.equal(q9.basePoints, 200);
  assert.equal(q9.speedBonus, 20);
  assert.equal(q9.comboBonus, 30);
  assert.equal(q9.scoreDelta, 250);
  assert.equal(q9.nextScore, 1250);

  // Wrong answer awards 0 points (does not deduct points) and resets streak to 0
  const wrong = evaluateLogicMindAnswer({
    questionIndex: 9,
    isCorrect: false,
    responseTimeMs: 4000,
    currentScore: 1250,
    currentStreak: 9,
    bestStreak: 9,
  });
  assert.equal(wrong.isCorrect, false);
  assert.equal(wrong.scoreDelta, 0);
  assert.equal(wrong.nextScore, 1250);
  assert.equal(wrong.nextStreak, 0);
  assert.equal(wrong.nextBestStreak, 9);

  // Round summary computes correctCount, accuracy, finalScore, and bestRecordScore
  const summary = summarizeLogicMindRound({
    finalScore: 1250,
    correctCount: 8,
    wrongCount: 2,
    bestStreak: 9,
    previousBestScore: 1100,
  });
  assert.equal(summary.correctCount, 8);
  assert.equal(summary.totalQuestions, 10);
  assert.equal(summary.accuracyPercent, 80);
  assert.equal(summary.finalScore, 1250);
  assert.equal(summary.bestRecordScore, 1250);
});

test('Spatial Memory (حافظه فضایی) starts at 3x3 grid, 3 tiles, 650ms and upgrades to 4x4 at L4, 5x5 at L8, and 350ms min speed', () => {
  assert.equal(SPATIAL_MEMORY_ROUND_SECONDS, 90);
  assert.equal(SPATIAL_MEMORY_INITIAL_LIVES, 3);

  // Level 1: 3x3, 3 tiles, 650ms
  const l1 = getSpatialMemoryLevelConfig(1);
  assert.equal(l1.gridSize, 3);
  assert.equal(l1.totalCells, 9);
  assert.equal(l1.sequenceLength, 3);
  assert.equal(l1.extraTilesCount, 0);
  assert.equal(l1.displaySpeedMs, 650);

  // Level 3: still 3x3, 5 tiles, faster speed
  const l3 = getSpatialMemoryLevelConfig(3);
  assert.equal(l3.gridSize, 3);
  assert.equal(l3.sequenceLength, 5);
  assert.equal(l3.extraTilesCount, 2);
  assert.equal(l3.displaySpeedMs, 590);

  // Level 4: upgraded to 4x4, 6 tiles
  const l4 = getSpatialMemoryLevelConfig(4);
  assert.equal(l4.gridSize, 4);
  assert.equal(l4.totalCells, 16);
  assert.equal(l4.sequenceLength, 6);
  assert.equal(l4.extraTilesCount, 3);
  assert.equal(l4.displaySpeedMs, 560);

  // Level 7: still 4x4, 9 tiles
  const l7 = getSpatialMemoryLevelConfig(7);
  assert.equal(l7.gridSize, 4);
  assert.equal(l7.sequenceLength, 9);

  // Level 8: upgraded to 5x5, 10 tiles
  const l8 = getSpatialMemoryLevelConfig(8);
  assert.equal(l8.gridSize, 5);
  assert.equal(l8.totalCells, 25);
  assert.equal(l8.sequenceLength, 10);
  assert.equal(l8.extraTilesCount, 7);
  assert.equal(l8.displaySpeedMs, 440);

  // Level 11+: speed floors at 350ms
  const l11 = getSpatialMemoryLevelConfig(11);
  const l15 = getSpatialMemoryLevelConfig(15);
  assert.equal(l11.displaySpeedMs, 350);
  assert.equal(l15.displaySpeedMs, 350);
});

test('Spatial Memory generates valid non-repeating adjacent sequences and guarantees a new sequence on level retry', () => {
  const seq1 = generateSpatialMemorySequence(1, null, () => 0.2);
  assert.equal(seq1.length, 3);
  for (let i = 0; i < seq1.length; i++) {
    assert.equal(seq1[i] >= 0 && seq1[i] < 9, true);
    if (i > 0) {
      assert.notEqual(seq1[i], seq1[i - 1]);
    }
  }

  // Retrying the same level with the same RNG seed still produces a new sequence different from previousSequence
  const retrySeq = generateSpatialMemorySequence(1, seq1, () => 0.2);
  assert.equal(retrySeq.length, 3);
  assert.notDeepEqual(retrySeq, seq1);
});

test('Spatial Memory scoring awards +100 base, +15 per extra tile, +10..+30 consecutive level combo, and deducts 1 life on mistake while repeating same level', () => {
  // Level 1 cleared (3 tiles -> 0 extra tiles, 1st clear -> 0 combo): +100 pts -> advances to Level 2
  const c1 = evaluateSpatialMemoryLevelOutcome({
    level: 1,
    completed: true,
    currentScore: 0,
    currentLives: 3,
    consecutiveClears: 0,
    bestStreak: 0,
  });
  assert.equal(c1.completed, true);
  assert.equal(c1.basePoints, 100);
  assert.equal(c1.extraTileBonus, 0);
  assert.equal(c1.comboBonus, 0);
  assert.equal(c1.scoreDelta, 100);
  assert.equal(c1.nextScore, 100);
  assert.equal(c1.nextLevel, 2);
  assert.equal(c1.nextLives, 3);

  // Level 2 cleared consecutively (4 tiles -> 1 extra tile = +15, 2nd consecutive clear -> +10 combo): +125 pts
  const c2 = evaluateSpatialMemoryLevelOutcome({
    level: 2,
    completed: true,
    currentScore: c1.nextScore,
    currentLives: c1.nextLives,
    consecutiveClears: c1.nextConsecutiveClears,
    bestStreak: c1.nextBestStreak,
  });
  assert.equal(c2.basePoints, 100);
  assert.equal(c2.extraTileBonus, 15);
  assert.equal(c2.comboBonus, 10);
  assert.equal(c2.scoreDelta, 125);
  assert.equal(c2.nextScore, 225);
  assert.equal(c2.nextLevel, 3);

  // Level 3 cleared consecutively (5 tiles -> 2 extra = +30, 3rd consecutive -> +20 combo): +150 pts
  const c3 = evaluateSpatialMemoryLevelOutcome({
    level: 3,
    completed: true,
    currentScore: c2.nextScore,
    currentLives: c2.nextLives,
    consecutiveClears: c2.nextConsecutiveClears,
    bestStreak: c2.nextBestStreak,
  });
  assert.equal(c3.extraTileBonus, 30);
  assert.equal(c3.comboBonus, 20);
  assert.equal(c3.scoreDelta, 150);
  assert.equal(c3.nextScore, 375);

  // Level 4 cleared consecutively (6 tiles -> 3 extra = +45, 4th consecutive -> +30 max combo): +175 pts
  const c4 = evaluateSpatialMemoryLevelOutcome({
    level: 4,
    completed: true,
    currentScore: c3.nextScore,
    currentLives: c3.nextLives,
    consecutiveClears: c3.nextConsecutiveClears,
    bestStreak: c3.nextBestStreak,
  });
  assert.equal(c4.extraTileBonus, 45);
  assert.equal(c4.comboBonus, 30);
  assert.equal(c4.scoreDelta, 175);
  assert.equal(c4.nextScore, 550);

  // Mistake on Level 5: 0 points, loses 1 life (3 -> 2), stays on Level 5, resets streak
  const fail5 = evaluateSpatialMemoryLevelOutcome({
    level: 5,
    completed: false,
    currentScore: c4.nextScore,
    currentLives: c4.nextLives,
    consecutiveClears: c4.nextConsecutiveClears,
    bestStreak: c4.nextBestStreak,
  });
  assert.equal(fail5.completed, false);
  assert.equal(fail5.scoreDelta, 0);
  assert.equal(fail5.nextScore, 550);
  assert.equal(fail5.nextLevel, 5);
  assert.equal(fail5.nextLives, 2);
  assert.equal(fail5.nextConsecutiveClears, 0);
  assert.equal(fail5.isGameOver, false);

  // Losing the last life triggers isGameOver
  const lastLifeFail = evaluateSpatialMemoryLevelOutcome({
    level: 5,
    completed: false,
    currentScore: 550,
    currentLives: 1,
    consecutiveClears: 0,
    bestStreak: 4,
  });
  assert.equal(lastLifeFail.nextLives, 0);
  assert.equal(lastLifeFail.isGameOver, true);

  // Summary reports highestLevelReached, finalScore, totalMistakes, and personalBestScore
  const summary = summarizeSpatialMemoryRound({
    finalScore: 550,
    highestLevelReached: 5,
    levelsCleared: 4,
    totalMistakes: 3,
    bestStreak: 4,
    previousBestScore: 420,
  });
  assert.equal(summary.highestLevelReached, 5);
  assert.equal(summary.finalScore, 550);
  assert.equal(summary.totalMistakes, 3);
  assert.equal(summary.personalBestScore, 550);
  assert.equal(summary.isNewRecord, true);
});

test('Coordination Duel (دوئل هماهنگی) escalates difficulty every 10 commands across 4 stages', () => {
  assert.equal(COORDINATION_DUEL_ROUND_SECONDS, 60);
  assert.equal(COORDINATION_DUEL_COMMANDS_PER_STAGE, 10);
  assert.equal(COORDINATION_DUEL_DUAL_SYNC_WINDOW_MS, 180);

  // Stage 1: commands 0..9 -> 0% dual, 1000ms interval
  const s1Start = getCoordinationDuelStageConfig(0);
  const s1End = getCoordinationDuelStageConfig(9);
  assert.equal(s1Start.stage, 1);
  assert.equal(s1End.stage, 1);
  assert.equal(s1Start.dualRatio, 0);
  assert.equal(s1Start.intervalMs, 1000);

  // Stage 2: commands 10..19 -> 10% dual, 850ms interval
  const s2Start = getCoordinationDuelStageConfig(10);
  const s2End = getCoordinationDuelStageConfig(19);
  assert.equal(s2Start.stage, 2);
  assert.equal(s2End.stage, 2);
  assert.equal(s2Start.dualRatio, 0.1);
  assert.equal(s2Start.intervalMs, 850);

  // Stage 3: commands 20..29 -> 20% dual, 750ms interval
  const s3Start = getCoordinationDuelStageConfig(20);
  const s3End = getCoordinationDuelStageConfig(29);
  assert.equal(s3Start.stage, 3);
  assert.equal(s3End.stage, 3);
  assert.equal(s3Start.dualRatio, 0.2);
  assert.equal(s3Start.intervalMs, 750);

  // Stage 4: commands 30+ -> 30% dual, 650ms interval
  const s4Start = getCoordinationDuelStageConfig(30);
  const s4Late = getCoordinationDuelStageConfig(55);
  assert.equal(s4Start.stage, 4);
  assert.equal(s4Late.stage, 4);
  assert.equal(s4Start.dualRatio, 0.3);
  assert.equal(s4Start.intervalMs, 650);

  // Stage 1 command generation never emits 'both'
  const cmdStage1 = generateCoordinationDuelCommand(0, () => 0.01);
  assert.notEqual(cmdStage1.direction, 'both');
  assert.equal(cmdStage1.intervalMs, 1000);

  // Stage 2..4 command generation emits 'both' when roll < dualRatio
  const cmdStage4Dual = generateCoordinationDuelCommand(32, () => 0.15);
  assert.equal(cmdStage4Dual.direction, 'both');
  assert.equal(cmdStage4Dual.stage, 4);
  assert.equal(cmdStage4Dual.intervalMs, 650);
});

test('Coordination Duel enforces 180ms dual-touch synchronization and awards +100 single, +140 dual, +20 max speed, +10/+20/+30 every 3 streak, -40 wrong, -20 missed with 0 floor', () => {
  // Dual sync helper checks |t1 - t2| <= 180ms
  assert.equal(isValidDualTouchSync(1000, 1000), true);
  assert.equal(isValidDualTouchSync(1000, 1180), true);
  assert.equal(isValidDualTouchSync(1180, 1000), true);
  assert.equal(isValidDualTouchSync(1000, 1181), false);
  assert.equal(isValidDualTouchSync(1000, null), false);

  // 1) Fast single correct ('left') -> +100 base + 20 speed = +120
  const r1 = evaluateCoordinationDuelOutcome({
    direction: 'left',
    outcome: 'correct',
    reactionTimeMs: 120,
    intervalMs: 1000,
    currentScore: 0,
    currentStreak: 0,
    bestStreak: 0,
  });
  assert.equal(r1.outcome, 'correct');
  assert.equal(r1.basePoints, 100);
  assert.equal(r1.speedBonus, 20);
  assert.equal(r1.comboBonus, 0);
  assert.equal(r1.scoreDelta, 120);
  assert.equal(r1.nextScore, 120);
  assert.equal(r1.nextStreak, 1);

  // 2) Second consecutive correct ('right')
  const r2 = evaluateCoordinationDuelOutcome({
    direction: 'right',
    outcome: 'correct',
    reactionTimeMs: 120,
    intervalMs: 1000,
    currentScore: r1.nextScore,
    currentStreak: r1.nextStreak,
    bestStreak: r1.nextBestStreak,
  });
  assert.equal(r2.nextStreak, 2);
  assert.equal(r2.comboBonus, 0);

  // 3) Third consecutive correct ('both' with dualTouchDeltaMs <= 180ms) -> +140 base + 20 speed + 10 combo = +170
  const r3 = evaluateCoordinationDuelOutcome({
    direction: 'both',
    outcome: 'correct',
    reactionTimeMs: 120,
    intervalMs: 850,
    dualTouchDeltaMs: 95,
    currentScore: r2.nextScore,
    currentStreak: r2.nextStreak,
    bestStreak: r2.nextBestStreak,
  });
  assert.equal(r3.outcome, 'correct');
  assert.equal(r3.basePoints, 140);
  assert.equal(r3.speedBonus, 20);
  assert.equal(r3.comboBonus, 10);
  assert.equal(r3.scoreDelta, 170);
  assert.equal(r3.nextStreak, 3);
  assert.equal(r3.nextScore, 410);

  // 4) Dual command where touches are > 180ms apart is rejected as 'wrong' (-40 penalty, streak reset)
  const rDualDesynced = evaluateCoordinationDuelOutcome({
    direction: 'both',
    outcome: 'correct',
    reactionTimeMs: 250,
    intervalMs: 850,
    dualTouchDeltaMs: 210,
    currentScore: r3.nextScore,
    currentStreak: r3.nextStreak,
    bestStreak: r3.nextBestStreak,
  });
  assert.equal(rDualDesynced.outcome, 'wrong');
  assert.equal(rDualDesynced.penaltyPoints, 40);
  assert.equal(rDualDesynced.scoreDelta, -40);
  assert.equal(rDualDesynced.nextScore, 370);
  assert.equal(rDualDesynced.nextStreak, 0);
  assert.equal(rDualDesynced.nextBestStreak, 3);

  // 5) Missed command deducts 20 points and resets streak
  const rMissed = evaluateCoordinationDuelOutcome({
    direction: 'left',
    outcome: 'missed',
    intervalMs: 850,
    currentScore: 370,
    currentStreak: 2,
    bestStreak: 3,
  });
  assert.equal(rMissed.outcome, 'missed');
  assert.equal(rMissed.penaltyPoints, 20);
  assert.equal(rMissed.scoreDelta, -20);
  assert.equal(rMissed.nextScore, 350);
  assert.equal(rMissed.nextStreak, 0);

  // 6) Non-negative score floor: wrong (-40) from 25 pts clamps at 0
  const rFloor = evaluateCoordinationDuelOutcome({
    direction: 'right',
    outcome: 'wrong',
    reactionTimeMs: 300,
    intervalMs: 1000,
    currentScore: 25,
    currentStreak: 1,
    bestStreak: 3,
  });
  assert.equal(rFloor.nextScore, 0);
  assert.equal(rFloor.scoreDelta, -25);

  // 7) Summary reports score, accuracyPercent, averageReactionMs, and bestStreak
  const summary = summarizeCoordinationDuelRound({
    finalScore: 1450,
    correctCount: 12,
    wrongCount: 2,
    missedCount: 1,
    reactionTimesMs: Array(12).fill(320),
    bestStreak: 7,
  });
  assert.equal(summary.finalScore, 1450);
  assert.equal(summary.totalCommands, 15);
  assert.equal(summary.accuracyPercent, 80);
  assert.equal(summary.averageReactionMs, 320);
  assert.equal(summary.bestStreak, 7);
});

