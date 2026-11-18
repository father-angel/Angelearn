import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAwardOfficialMedal,
  computeNextDifficulty,
  computeProgressiveWpm,
  evaluateChoiceAnswer,
  evaluateSequenceOrder,
  evaluateUniversityReward,
  findMatchingGameContent,
  getMemoryPairCountForDifficulty,
  validateUniversityContentPackage,
} from './engine';
import {
  INITIAL_TEMPLATE_CONTENTS,
  INITIAL_UNIVERSITY_COURSES,
  SAMPLE_IMPORTABLE_COURSE_PACKAGE,
} from './demoData';

test('evaluateChoiceAnswer validates 4-option multiple choice and fill-in-the-blank answers', () => {
  assert.equal(evaluateChoiceAnswer('opt_2', 'opt_2'), true);
  assert.equal(evaluateChoiceAnswer('opt_1', 'opt_2'), false);
});

test('evaluateSequenceOrder identifies misplaced steps and computes accuracy', () => {
  const steps = [
    { id: 's1', stepNumber: 1, title: 'Step 1', detail: '' },
    { id: 's3', stepNumber: 3, title: 'Step 3', detail: '' },
    { id: 's2', stepNumber: 2, title: 'Step 2', detail: '' },
  ];
  const res = evaluateSequenceOrder(steps);
  assert.equal(res.isAllCorrect, false);
  assert.equal(res.correctCount, 1);
  assert.deepEqual(res.misplacedStepIds, ['s3', 's2']);
});

test('computeNextDifficulty adapts fairly and stays bounded within 1..5', () => {
  assert.equal(computeNextDifficulty(1, 90), 2);
  assert.equal(computeNextDifficulty(5, 100), 5); // Capped at 5
  assert.equal(computeNextDifficulty(1, 20), 1);  // Floor at 1
  assert.equal(computeNextDifficulty(3, 40), 2);
});

test('computeProgressiveWpm ramps from 150 to 350 and respects 600 WPM ceiling', () => {
  assert.equal(computeProgressiveWpm(0, 150, 350, 600), 150);
  assert.equal(computeProgressiveWpm(0.5, 150, 350, 600), 250);
  assert.equal(computeProgressiveWpm(1, 150, 350, 600), 350);
  assert.equal(computeProgressiveWpm(1, 150, 800, 600), 600);
});

test('getMemoryPairCountForDifficulty scales from 2 pairs up to available pairs', () => {
  assert.deepEqual(getMemoryPairCountForDifficulty(1, 5), {
    pairCount: 2,
    previewSeconds: 5,
  });
  assert.deepEqual(getMemoryPairCountForDifficulty(4, 5), {
    pairCount: 5,
    previewSeconds: 2,
  });
});

test('canAwardOfficialMedal never awards official medals for demo/sandbox or pending_source courses', () => {
  const pendingCourse = INITIAL_UNIVERSITY_COURSES[0]; // مدیریت نوآوری
  const demoCourse = INITIAL_UNIVERSITY_COURSES[1]; // آزمایشگاه نمونه (Demo)

  const demoResult = canAwardOfficialMedal({
    course: demoCourse,
    mode: 'exam',
    scorePercent: 100,
    isDemoContent: true,
  });
  assert.equal(demoResult.eligible, false);

  // Even if isDemoContent flag is passed as false, a course with demo lessons cannot award a medal
  const demoLessonCourseResult = canAwardOfficialMedal({
    course: demoCourse,
    mode: 'exam',
    scorePercent: 100,
    isDemoContent: false,
  });
  assert.equal(demoLessonCourseResult.eligible, false);

  // Approved course with >= 80% in exam mode DOES award medal
  const approvedCourse = {
    ...pendingCourse,
    sourceStatus: 'approved_ready' as const,
    isDemoCourse: false,
  };
  const practiceResult = canAwardOfficialMedal({
    course: approvedCourse,
    mode: 'practice',
    scorePercent: 100,
    isDemoContent: false,
  });
  assert.equal(practiceResult.eligible, false);

  const examPassResult = canAwardOfficialMedal({
    course: approvedCourse,
    mode: 'exam',
    scorePercent: 85,
    isDemoContent: false,
  });
  assert.equal(examPassResult.eligible, true);
});

test('evaluateUniversityReward blocks repeated coin farming and separates Demo rewards from official research coins', () => {
  // First time passing an official research activity (>=80%) awards 10 main coins
  const firstOfficialPass = evaluateUniversityReward({
    isDemoContent: false,
    accuracyPercent: 90,
    alreadyRewardedForActivity: false,
  });
  assert.equal(firstOfficialPass.rewardType, 'official_research');
  assert.equal(firstOfficialPass.coinsAwarded, 10);
  assert.equal(firstOfficialPass.demoPointsAwarded, 0);
  assert.equal(firstOfficialPass.eligibleForMainCoins, true);

  // Repeating the same activity must NOT grant additional coins
  const repeatedOfficialPass = evaluateUniversityReward({
    isDemoContent: false,
    accuracyPercent: 100,
    alreadyRewardedForActivity: true,
  });
  assert.equal(repeatedOfficialPass.rewardType, 'none');
  assert.equal(repeatedOfficialPass.coinsAwarded, 0);
  assert.equal(repeatedOfficialPass.eligibleForMainCoins, false);

  // Demo activity never grants main game coins; grants demo practice points on first pass only
  const firstDemoPass = evaluateUniversityReward({
    isDemoContent: true,
    accuracyPercent: 95,
    alreadyRewardedForActivity: false,
  });
  assert.equal(firstDemoPass.rewardType, 'demo_practice');
  assert.equal(firstDemoPass.coinsAwarded, 0);
  assert.equal(firstDemoPass.demoPointsAwarded, 5);
  assert.equal(firstDemoPass.eligibleForMainCoins, false);
});

test('findMatchingGameContent strictly matches courseId, lessonId, and templateType without cross-lesson fallback', () => {
  const exactMatch = findMatchingGameContent(
    INITIAL_TEMPLATE_CONTENTS,
    'course_new_product_development',
    'lesson_npd_lecture_01',
    'read_and_answer'
  );
  assert.ok(exactMatch);
  assert.equal(exactMatch.lessonId, 'lesson_npd_lecture_01');

  // Requesting a non-existent lessonId must return undefined, NOT fall back to lesson 1 or demo
  const missingLesson = findMatchingGameContent(
    INITIAL_TEMPLATE_CONTENTS,
    'course_new_product_development',
    'lesson_non_existent_99',
    'read_and_answer'
  );
  assert.equal(missingLesson, undefined);

  // Requesting mismatched courseId for a valid lessonId must return undefined
  const wrongCourse = findMatchingGameContent(
    INITIAL_TEMPLATE_CONTENTS,
    'course_demo_sandbox',
    'lesson_npd_lecture_01',
    'read_and_answer'
  );
  assert.equal(wrongCourse, undefined);
});

test('validateUniversityContentPackage validates valid package and reports invalid fields', () => {
  const validJson = JSON.stringify(SAMPLE_IMPORTABLE_COURSE_PACKAGE);
  const resValid = validateUniversityContentPackage(validJson);
  assert.equal(resValid.valid, true);
  assert.equal(resValid.issues.length, 0);

  const invalidJson = JSON.stringify({
    schemaVersion: '0.1',
    course: { id: '', title: '' },
    contents: [],
  });
  const resInvalid = validateUniversityContentPackage(invalidJson);
  assert.equal(resInvalid.valid, false);
  assert.ok(resInvalid.issues.length >= 3);
});

test('New Product Development course («توسعه محصول») uses canonical ID course_new_product_development and contains both Lecture 1 and Lecture 2 across all 6 templates', () => {
  const course = INITIAL_UNIVERSITY_COURSES[0];
  assert.equal(course.id, 'course_new_product_development');
  assert.equal(course.title, 'توسعه محصول');
  assert.equal(course.lessons.length, 2);
  assert.equal(course.lessons[0].id, 'lesson_npd_lecture_01');
  assert.equal(course.lessons[0].courseId, 'course_new_product_development');
  assert.equal(course.lessons[1].id, 'lesson_npd_lecture_02');
  assert.equal(course.lessons[1].courseId, 'course_new_product_development');

  const pkgContents = SAMPLE_IMPORTABLE_COURSE_PACKAGE.contents;
  const l1Contents = pkgContents.filter(
    (c) =>
      c.courseId === 'course_new_product_development' &&
      c.lessonId === 'lesson_npd_lecture_01'
  );
  const l2Contents = pkgContents.filter(
    (c) =>
      c.courseId === 'course_new_product_development' &&
      c.lessonId === 'lesson_npd_lecture_02'
  );
  assert.equal(l1Contents.length, 6);
  assert.equal(l2Contents.length, 6);
});

test('Consecutive JSON imports merge lessons and contents so importing Lecture 2 never deletes Lecture 1, and legacy course_innovation_mgmt migrates cleanly', async () => {
  const {
    CANONICAL_NPD_COURSE_ID,
    CANONICAL_NPD_COURSE_TITLE,
    mergeCourseLessons,
    mergeCourseContents,
    normalizeUniversityCourseId,
  } = await import('./persistence');
  const { NPD_COURSE_LESSONS, NPD_LECTURE_01_CONTENTS, NPD_LECTURE_02_CONTENTS } =
    await import('./npdLecturesData');

  assert.equal(
    normalizeUniversityCourseId('course_innovation_mgmt'),
    CANONICAL_NPD_COURSE_ID
  );
  assert.equal(
    normalizeUniversityCourseId('course_new_product_development'),
    CANONICAL_NPD_COURSE_ID
  );
  assert.equal(
    normalizeUniversityCourseId('course_demo_sandbox'),
    'course_demo_sandbox'
  );
  assert.equal(CANONICAL_NPD_COURSE_TITLE, 'توسعه محصول');

  // Simulate importing Lecture 1 package alone, then importing Lecture 2 package alone
  const afterLecture1Lessons = mergeCourseLessons(
    [],
    [{ ...NPD_COURSE_LESSONS[0], courseId: 'course_innovation_mgmt' }],
    CANONICAL_NPD_COURSE_ID
  );
  assert.equal(afterLecture1Lessons.length, 1);
  assert.equal(afterLecture1Lessons[0].id, 'lesson_npd_lecture_01');
  assert.equal(afterLecture1Lessons[0].courseId, CANONICAL_NPD_COURSE_ID);

  // Now import Lecture 2 package (which only lists Lecture 2 in its lessons array):
  // Lecture 1 MUST NOT be deleted!
  const afterLecture2Lessons = mergeCourseLessons(
    afterLecture1Lessons,
    [NPD_COURSE_LESSONS[1]],
    CANONICAL_NPD_COURSE_ID
  );
  assert.equal(afterLecture2Lessons.length, 2);
  assert.equal(afterLecture2Lessons[0].id, 'lesson_npd_lecture_01');
  assert.equal(afterLecture2Lessons[1].id, 'lesson_npd_lecture_02');

  // Verify contents merge: importing Lecture 2 contents after Lecture 1 contents preserves all 6 Lecture 1 templates AND all 6 Lecture 2 templates
  const afterL1Contents = mergeCourseContents(
    [],
    NPD_LECTURE_01_CONTENTS.map((c) => ({
      ...c,
      courseId: 'course_innovation_mgmt',
    }))
  );
  assert.equal(afterL1Contents.length, 6);
  assert.ok(
    afterL1Contents.every((c) => c.courseId === CANONICAL_NPD_COURSE_ID)
  );

  const afterL2Contents = mergeCourseContents(
    afterL1Contents,
    NPD_LECTURE_02_CONTENTS
  );
  assert.equal(afterL2Contents.length, 12);
  const mergedL1 = afterL2Contents.filter(
    (c) => c.lessonId === 'lesson_npd_lecture_01'
  );
  const mergedL2 = afterL2Contents.filter(
    (c) => c.lessonId === 'lesson_npd_lecture_02'
  );
  assert.equal(mergedL1.length, 6);
  assert.equal(mergedL2.length, 6);
});


