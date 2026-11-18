import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateUnifiedActivitySubmission, ActivityResult } from '../activities';
import {
  RESEARCH_STUDY_CONFIG,
  RESEARCHER_ADMIN_RESET_TOKEN,
  calculateResearchPolicyReward,
  createBaselineResearchProfile,
  createBaselineResearchTrees,
  enrollWithResearcherCode,
  exitResearchModeWithAdminToken,
  parseResearcherEnrollmentCode,
  simulatePolicyPersonas,
} from './index';
import { INITIAL_TREES } from '../utils/storage';

test('Policy A (Flat) and Policy B (Balanced) use the same shared progression engine and match RESEARCH_STUDY_CONFIG exactly', () => {
  const fixedNow = new Date(2026, 10, 10, 12, 0, 0);

  // 1. Learning activity with 100% score on reviewed content
  const learnInput = {
    playerId: 'P-TEST',
    activityId: 'uni_read_and_answer',
    contentId: 'content_npd_l1_read_1',
    courseId: 'course_innovation_mgmt',
    lessonId: 'lesson_npd_lecture_01',
    templateType: 'read_and_answer' as const,
    sessionMode: 'exam' as const,
    isDemoContent: false,
    isReviewedResearchContent: true,
    durationSeconds: 90,
    scorePercent: 100,
    interactionCompleted: true,
    assessmentPassed: true,
  };

  const outA_learn = evaluateUnifiedActivitySubmission(learnInput, [], fixedNow, {
    researchPolicyId: 'policy_a',
  });
  const outB_learn = evaluateUnifiedActivitySubmission(learnInput, [], fixedNow, {
    researchPolicyId: 'policy_b',
  });

  // ActivityResult structure and verification fields are 100% identical
  assert.equal(outA_learn.result.verificationType, 'proven_learning');
  assert.equal(outB_learn.result.verificationType, 'proven_learning');
  assert.equal(outA_learn.result.learningProven, true);
  assert.equal(outB_learn.result.learningProven, true);

  // Only the reward differs according to RESEARCH_STUDY_CONFIG:
  // Policy A: flat 5 coins
  // Policy B: base 6 + 100%-tier bonus 2 = 8 coins
  assert.equal(outA_learn.reward.coinsAwarded, RESEARCH_STUDY_CONFIG.policyA.flatRewardCoins);
  assert.equal(outB_learn.reward.coinsAwarded, 8);

  // 2. Personal Development (Gratitude)
  const gratInput = {
    playerId: 'P-TEST',
    activityId: 'garden_gratitude',
    durationSeconds: 20,
    scorePercent: null,
    interactionCompleted: true,
  };

  const outA_grat = evaluateUnifiedActivitySubmission(gratInput, [], fixedNow, {
    researchPolicyId: 'policy_a',
  });
  const outB_grat = evaluateUnifiedActivitySubmission(gratInput, [], fixedNow, {
    researchPolicyId: 'policy_b',
  });

  assert.equal(outA_grat.reward.coinsAwarded, 5);
  assert.equal(outB_grat.reward.coinsAwarded, 5);

  // 3. Recreational (BinaBalls) — 1st and 2nd completion on the same day
  const recInput = {
    playerId: 'P-TEST',
    activityId: 'garden_bina_balls',
    durationSeconds: 15,
    scorePercent: 100,
    interactionCompleted: true,
    assessmentPassed: true,
  };

  const outA_rec1 = evaluateUnifiedActivitySubmission(recInput, [], fixedNow, {
    researchPolicyId: 'policy_a',
  });
  const outB_rec1 = evaluateUnifiedActivitySubmission(recInput, [], fixedNow, {
    researchPolicyId: 'policy_b',
  });

  // Policy A gives flat 5 on 1st completion; Policy B gives 2 coins on 1st completion
  assert.equal(outA_rec1.reward.coinsAwarded, 5);
  assert.equal(outB_rec1.reward.coinsAwarded, 2);

  // 2nd completion on the same day:
  // Policy A gives 0 (max 1/day); Policy B gives 50% multiplier = 1 coin (up to 3-coin recreational cap)
  const outA_rec2 = evaluateUnifiedActivitySubmission(
    recInput,
    [outA_rec1.result],
    fixedNow,
    {
      researchPolicyId: 'policy_a',
      researchPriorLedger: [{ result: outA_rec1.result, coinsAwarded: 5 }],
    }
  );
  const outB_rec2 = evaluateUnifiedActivitySubmission(
    recInput,
    [outB_rec1.result],
    fixedNow,
    {
      researchPolicyId: 'policy_b',
      researchPriorLedger: [{ result: outB_rec1.result, coinsAwarded: 2 }],
    }
  );

  assert.equal(outA_rec2.reward.coinsAwarded, 0);
  assert.equal(outB_rec2.reward.coinsAwarded, 1);

  // 3rd completion on the same day in Policy B gives 0 coins
  const outB_rec3 = evaluateUnifiedActivitySubmission(
    recInput,
    [outB_rec1.result, outB_rec2.result],
    fixedNow,
    {
      researchPolicyId: 'policy_b',
      researchPriorLedger: [
        { result: outB_rec1.result, coinsAwarded: 2 },
        { result: outB_rec2.result, coinsAwarded: 1 },
      ],
    }
  );
  assert.equal(outB_rec3.reward.coinsAwarded, 0);
});

test('Simulation Test (Requirement #4): Identical 20-coin daily cap in Policy A & B, balanced earning opportunity, and bounded recreational grinding', () => {
  const summaries = simulatePolicyPersonas(RESEARCH_STUDY_CONFIG);

  const balanced = summaries.find((s) => s.personaName === 'balanced_learner')!;
  const maxAchiever = summaries.find(
    (s) => s.personaName === 'max_daily_cap_achiever'
  )!;
  const recGrinder = summaries.find(
    (s) => s.personaName === 'recreational_only_grinder'
  )!;

  // 1. Balanced Learner (1 Learning @ 95%, 1 Gratitude, 2 Recreational):
  // Policy A: 5 (learning) + 5 (gratitude) + 5 (1st rec) + 0 (2nd rec) = 15 coins
  // Policy B: 7 (learning 95%) + 5 (gratitude) + 2 (1st rec) + 1 (2nd rec) = 15 coins
  // Zero unreasonable disparity in earning opportunity for a balanced student!
  assert.equal(balanced.policyA.totalCoinsEarned, 15);
  assert.equal(balanced.policyB.totalCoinsEarned, 15);

  // 2. High-Effort All-Rounder hits the exact same 20-coin daily cap in both Policy A and Policy B
  assert.equal(
    maxAchiever.policyA.totalCoinsEarned,
    RESEARCH_STUDY_CONFIG.sharedConstraints.dailyCoinCap
  );
  assert.equal(
    maxAchiever.policyB.totalCoinsEarned,
    RESEARCH_STUDY_CONFIG.sharedConstraints.dailyCoinCap
  );
  assert.equal(maxAchiever.policyA.totalCoinsEarned, 20);
  assert.equal(maxAchiever.policyB.totalCoinsEarned, 20);
  assert.equal(maxAchiever.policyA.cappedByDailyLimit, true);
  assert.equal(maxAchiever.policyB.cappedByDailyLimit, true);

  // 3. Recreational-only grinder (5x BinaBalls in a day) is capped at 3 coins in Policy B
  assert.equal(recGrinder.policyA.totalCoinsEarned, 5);
  assert.equal(recGrinder.policyB.totalCoinsEarned, 3);
  assert.equal(recGrinder.policyB.byCategory.learning, 0);
});

test('Researcher-issued enrollment codes assign deterministic anonymous participantId and fixed policy', () => {
  const codeA = parseResearcherEnrollmentCode('ang-a-104');
  assert.equal(codeA.valid, true);
  assert.equal(codeA.assignedPolicy, 'policy_a');
  assert.equal(codeA.participantId, 'P-A-104');

  const codeB = parseResearcherEnrollmentCode('RES-B-209');
  assert.equal(codeB.valid, true);
  assert.equal(codeB.assignedPolicy, 'policy_b');
  assert.equal(codeB.participantId, 'P-B-209');

  const invalid = parseResearcherEnrollmentCode('RANDOM-CODE');
  assert.equal(invalid.valid, false);
});

test('Baseline research profile and trees start with identical initial conditions (10 coins, 0 gems, VIP 0, 0 wateredDaysCount)', () => {
  const profileA = createBaselineResearchProfile('P-A-101');
  const profileB = createBaselineResearchProfile('P-B-101');

  assert.equal(profileA.coins, 10);
  assert.equal(profileB.coins, 10);
  assert.equal(profileA.gems, 0);
  assert.equal(profileB.gems, 0);
  assert.equal(profileA.vipLevel, 0);
  assert.equal(profileB.vipLevel, 0);

  const trees = createBaselineResearchTrees(INITIAL_TREES);
  for (const t of trees) {
    assert.equal(t.wateredDaysCount, 0);
    assert.equal(t.lastWateredDate, undefined);
    assert.equal(t.unlocked, t.cost === 0);
  }
});

test('Mid-study group lock prevents switching from Policy A to Policy B and preserves normal user data in localStorage', () => {
  // Mock localStorage in Node test environment
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
  (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage =
    mockStorage;

  try {
    // Seed normal user profile with 999 coins
    store.set(
      'angellearn_profile_v1',
      JSON.stringify({ id: 'normal_user', name: 'علی', coins: 999, vipLevel: 10 })
    );

    // Enroll as Participant A-101
    const enroll1 = enrollWithResearcherCode('ANG-A-101', INITIAL_TREES);
    assert.equal(enroll1.success, true);
    assert.equal(enroll1.session?.participantId, 'P-A-101');
    assert.equal(enroll1.session?.assignedPolicy, 'policy_a');

    // Attempt to switch to Group B mid-study -> MUST BE REJECTED
    const switchAttempt = enrollWithResearcherCode('ANG-B-202', INITIAL_TREES);
    assert.equal(switchAttempt.success, false);
    assert.equal(switchAttempt.reason, 'group_locked_mid_study');
    assert.equal(switchAttempt.session?.assignedPolicy, 'policy_a');

    // Attempt to exit with wrong admin token -> MUST BE REJECTED
    const wrongExit = exitResearchModeWithAdminToken('wrong-token');
    assert.equal(wrongExit.success, false);

    // Exit with valid researcher admin token -> succeeds and normal user data is 100% intact
    const validExit = exitResearchModeWithAdminToken(RESEARCHER_ADMIN_RESET_TOKEN);
    assert.equal(validExit.success, true);

    const preservedNormal = JSON.parse(store.get('angellearn_profile_v1')!);
    assert.equal(preservedNormal.coins, 999);
    assert.equal(preservedNormal.name, 'علی');
  } finally {
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
  }
});
