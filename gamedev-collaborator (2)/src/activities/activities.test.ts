import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_ACTIVITY_CATEGORIES,
  getActivityDefinition,
  listActivitiesByCategory,
  listRegisteredActivities,
  evaluateUnifiedActivitySubmission,
  sanitizeActivityMetadata,
  ActivityResult,
} from './index';

test('Unified Activity Registry defines all 3 official categories and registers the 3 sample activities with required fields', () => {
  assert.deepEqual(OFFICIAL_ACTIVITY_CATEGORIES, [
    'learning',
    'personal_development',
    'recreational',
  ]);

  const allActivities = listRegisteredActivities();
  assert.ok(allActivities.length >= 3);

  const learningSample = getActivityDefinition('uni_read_and_answer');
  const personalSample = getActivityDefinition('garden_gratitude');
  const recreationalSample = getActivityDefinition('garden_bina_balls');

  assert.ok(learningSample);
  assert.ok(personalSample);
  assert.ok(recreationalSample);

  // Verify every registered activity has all 8 mandatory fields
  for (const def of [learningSample!, personalSample!, recreationalSample!]) {
    assert.ok(typeof def.activityId === 'string' && def.activityId.length > 0);
    assert.ok(OFFICIAL_ACTIVITY_CATEGORIES.includes(def.category));
    assert.ok(typeof def.title === 'string' && def.title.length > 0);
    assert.ok(typeof def.contentId === 'string' && def.contentId.length > 0);
    assert.ok(def.completionRule && typeof def.completionRule === 'object');
    assert.ok(typeof def.assessmentType === 'string');
    assert.ok(typeof def.repeatability === 'string');
    assert.ok(def.rewardEligibility && typeof def.rewardEligibility === 'object');
  }

  assert.equal(listActivitiesByCategory('learning')[0].activityId, 'uni_read_and_answer');
  assert.equal(
    listActivitiesByCategory('personal_development')[0].activityId,
    'garden_gratitude'
  );
  assert.equal(
    listActivitiesByCategory('recreational')[0].activityId,
    'garden_bina_balls'
  );
});

test('Acceptance Criterion: 3 activities from 3 categories produce uniform ActivityResult records consumed by the Central Progression Engine', () => {
  const fixedNow = new Date(2026, 10, 10, 14, 30, 0);
  const history: ActivityResult[] = [];

  // 1. Learning: University Read & Answer (Reviewed NPD Lecture 1 content)
  const learningOut = evaluateUnifiedActivitySubmission(
    {
      playerId: 'player_1',
      activityId: 'uni_read_and_answer',
      contentId: 'content_npd_l1_read_1',
      courseId: 'course_innovation_mgmt',
      lessonId: 'lesson_npd_lecture_01',
      templateType: 'read_and_answer',
      sessionMode: 'exam',
      isDemoContent: false,
      isReviewedResearchContent: true,
      durationSeconds: 95,
      scorePercent: 90,
      interactionCompleted: true,
      assessmentPassed: true,
    },
    history,
    fixedNow
  );
  history.push(learningOut.result);

  // 2. Personal Development: GratitudeGame (Self-expression, private note)
  const personalOut = evaluateUnifiedActivitySubmission(
    {
      playerId: 'player_1',
      activityId: 'garden_gratitude',
      durationSeconds: 25,
      scorePercent: 100, // Even if caller passes 100, engine normalizes non-assessed personal_development to null
      interactionCompleted: true,
      metadata: {
        gratitudeText: 'متن خصوصی شکرگزاری من که نباید در لاگ پژوهش ثبت شود',
        note: 'یادداشت محرمانه',
        hasSparrowAnimation: true,
      },
    },
    history,
    fixedNow
  );
  history.push(personalOut.result);

  // 3. Recreational: BinaBallsGame (10-ball tracking challenge)
  const recreationalOut = evaluateUnifiedActivitySubmission(
    {
      playerId: 'player_1',
      activityId: 'garden_bina_balls',
      durationSeconds: 14,
      scorePercent: 100,
      interactionCompleted: true,
      assessmentPassed: true,
    },
    history,
    fixedNow
  );
  history.push(recreationalOut.result);

  // Verify uniform schema across all 3 results
  for (const res of [learningOut.result, personalOut.result, recreationalOut.result]) {
    assert.ok(res.sessionId.length > 0);
    assert.ok(res.startedAt.length > 0);
    assert.ok(res.completedAt.length > 0);
    assert.equal(res.status, 'completed');
    assert.ok(res.durationSeconds > 0);
    assert.equal(typeof res.verifiedCompletion, 'boolean');
    assert.ok(
      ['none', 'activity_performed', 'verified_completion', 'proven_learning'].includes(
        res.verificationType
      )
    );
    assert.equal(res.attemptNumber, 1);
    assert.equal(res.privacySanitized, true);
  }

  // Requirement #1: Scientific distinction between 'activity_performed', 'verified_completion', and 'proven_learning'
  // Learning (reviewed course, 90% >= 80%): proven_learning
  assert.equal(learningOut.result.activityPerformed, true);
  assert.equal(learningOut.result.verifiedCompletion, true);
  assert.equal(learningOut.result.learningProven, true);
  assert.equal(learningOut.result.verificationType, 'proven_learning');
  assert.equal(learningOut.result.courseId, 'course_innovation_mgmt');
  assert.equal(learningOut.result.lessonId, 'lesson_npd_lecture_01');
  assert.equal(learningOut.result.contentId, 'content_npd_l1_read_1');

  // Personal Development (Gratitude): strictly 'activity_performed', NEVER proven_learning or mentalHealthOutcomeProven
  assert.equal(personalOut.result.activityPerformed, true);
  assert.equal(personalOut.result.verifiedCompletion, false);
  assert.equal(personalOut.result.learningProven, false);
  assert.equal(personalOut.result.mentalHealthOutcomeProven, false);
  assert.equal(personalOut.result.verificationType, 'activity_performed');
  assert.equal(personalOut.result.scorePercent, null);

  // Requirement #3: Private gratitude text is strictly stripped from ActivityResult
  const serializedPersonal = JSON.stringify(personalOut.result);
  assert.equal(serializedPersonal.includes('متن خصوصی شکرگزاری'), false);
  assert.equal(serializedPersonal.includes('یادداشت محرمانه'), false);
  assert.equal(personalOut.result.safeMetadata?.hasSparrowAnimation, true);

  // Recreational (BinaBalls): 'verified_completion' of the game challenge, but learningProven is false
  assert.equal(recreationalOut.result.activityPerformed, true);
  assert.equal(recreationalOut.result.verifiedCompletion, true);
  assert.equal(recreationalOut.result.learningProven, false);
  assert.equal(recreationalOut.result.verificationType, 'verified_completion');
});

test('Requirement #4 & #6: University Demo content is separated from reviewed research content and increments attemptNumber', () => {
  const fixedNow = new Date(2026, 10, 10, 15, 0, 0);
  const history: ActivityResult[] = [];

  // Demo Read & Answer with 100% score
  const demoAttempt1 = evaluateUnifiedActivitySubmission(
    {
      playerId: 'player_1',
      activityId: 'uni_read_and_answer',
      contentId: 'content_demo_read_1',
      courseId: 'course_demo_sandbox',
      lessonId: 'lesson_innov_sandbox_1',
      templateType: 'read_and_answer',
      sessionMode: 'exam',
      isDemoContent: true,
      durationSeconds: 45,
      scorePercent: 100,
      interactionCompleted: true,
      assessmentPassed: true,
    },
    history,
    fixedNow
  );
  history.push(demoAttempt1.result);

  assert.equal(demoAttempt1.result.contentMaturity, 'demo_experimental');
  assert.equal(demoAttempt1.result.verifiedCompletion, true);
  assert.equal(demoAttempt1.result.learningProven, false); // Demo NEVER proves research learning
  assert.equal(demoAttempt1.result.verificationType, 'verified_completion');
  assert.equal(demoAttempt1.result.attemptNumber, 1);
  assert.equal(demoAttempt1.reward.coinsAwarded, 0); // Demo NEVER awards main coins
  assert.equal(demoAttempt1.reward.demoPointsAwarded, 5);
  assert.equal(demoAttempt1.reward.rewardType, 'demo_practice');

  // Second attempt on the same Demo content increments attemptNumber to 2 and awards 0 additional demo points
  const demoAttempt2 = evaluateUnifiedActivitySubmission(
    {
      playerId: 'player_1',
      activityId: 'uni_read_and_answer',
      contentId: 'content_demo_read_1',
      courseId: 'course_demo_sandbox',
      lessonId: 'lesson_innov_sandbox_1',
      templateType: 'read_and_answer',
      sessionMode: 'exam',
      isDemoContent: true,
      durationSeconds: 30,
      scorePercent: 100,
      interactionCompleted: true,
      assessmentPassed: true,
    },
    history,
    fixedNow
  );
  assert.equal(demoAttempt2.result.attemptNumber, 2);
  assert.equal(demoAttempt2.reward.coinsAwarded, 0);
  assert.equal(demoAttempt2.reward.demoPointsAwarded, 0);
});

test('Low score (<80%) on University Read & Answer records activity_performed without verifiedCompletion or learningProven', () => {
  const lowScoreOut = evaluateUnifiedActivitySubmission({
    playerId: 'player_1',
    activityId: 'uni_read_and_answer',
    contentId: 'content_npd_l2_read_1',
    courseId: 'course_innovation_mgmt',
    lessonId: 'lesson_npd_lecture_02',
    templateType: 'read_and_answer',
    sessionMode: 'practice',
    isDemoContent: false,
    isReviewedResearchContent: true,
    durationSeconds: 60,
    scorePercent: 50,
    interactionCompleted: true,
    assessmentPassed: false,
  });

  assert.equal(lowScoreOut.result.activityPerformed, true);
  assert.equal(lowScoreOut.result.verifiedCompletion, false);
  assert.equal(lowScoreOut.result.learningProven, false);
  assert.equal(lowScoreOut.result.verificationType, 'activity_performed');
  assert.equal(lowScoreOut.reward.coinsAwarded, 0);
});

test('sanitizeActivityMetadata removes all forbidden text/note keys', () => {
  const cleaned = sanitizeActivityMetadata({
    gratitudeText: 'خدایا شکرت',
    privateNote: 'یادداشت شخصی',
    rawText: 'متن خام',
    treeId: 'gratitude',
    durationBucket: 2,
  });
  assert.deepEqual(cleaned, {
    treeId: 'gratitude',
    durationBucket: 2,
  });
});
