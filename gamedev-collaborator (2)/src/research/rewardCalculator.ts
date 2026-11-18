/**
 * AngelLearn A/B Research Policy Reward Calculator & Simulation Engine
 * Stage 4: Implement A/B Research Reward Policies
 */

import { ActivityCategory, ActivityResult } from '../activities/types';
import { RESEARCH_STUDY_CONFIG } from './config';
import {
  PolicySimulationDaySummary,
  ResearchPolicyId,
  ResearchRewardCalculationInput,
  ResearchRewardCalculationOutput,
  ResearchStudyConfig,
} from './types';

/**
 * Pure function that computes the coin reward for a completed activity under
 * either Policy A (Flat Shared Progression) or Policy B (Balanced Shared Progression).
 * Both policies share the same progression engine and identical daily coin cap.
 */
export function calculateResearchPolicyReward(
  input: ResearchRewardCalculationInput,
  config: ResearchStudyConfig = RESEARCH_STUDY_CONFIG
): ResearchRewardCalculationOutput {
  const dailyCoinCap = config.sharedConstraints.dailyCoinCap;

  // Sum coins already earned today on this localDate
  const todayPriorRecords = input.priorResults.filter(
    (entry) =>
      entry.result.playerId === input.playerId &&
      entry.result.localDate === input.localDate &&
      entry.coinsAwarded > 0
  );

  const dailyCoinsUsedBefore = todayPriorRecords.reduce(
    (sum, entry) => sum + entry.coinsAwarded,
    0
  );

  // Check basic activity qualification:
  // Personal development (e.g., Gratitude) requires activityPerformed;
  // Learning & Recreational require verifiedCompletion.
  const qualifiesByCompletion =
    input.category === 'personal_development'
      ? input.activityPerformed
      : input.verifiedCompletion;

  if (!qualifiesByCompletion) {
    return {
      policyId: input.policyId,
      coinsAwarded: 0,
      demoPointsAwarded: 0,
      rawUncappedCoins: 0,
      cappedByDailyLimit: false,
      cappedByCategoryLimit: false,
      dailyCoinsUsedBefore,
      dailyCoinsUsedAfter: dailyCoinsUsedBefore,
      dailyCoinCap,
      rewardType: 'none',
      reasonPersian: 'شرایط تکمیل معتبر فعالیت احراز نشد؛ سکه‌ای تعلق نگرفت.',
    };
  }

  // Demo content separation: never grants main coins in either Policy A or Policy B
  if (input.isDemoContent && !config.sharedConstraints.allowDemoContentCoins) {
    const alreadyDemoRewarded = input.priorResults.some(
      (entry) =>
        entry.result.playerId === input.playerId &&
        entry.result.activityId === input.activityId &&
        entry.result.contentId === input.contentId &&
        entry.result.verifiedCompletion
    );
    const demoPoints = alreadyDemoRewarded ? 0 : 5;
    return {
      policyId: input.policyId,
      coinsAwarded: 0,
      demoPointsAwarded: demoPoints,
      rawUncappedCoins: 0,
      cappedByDailyLimit: false,
      cappedByCategoryLimit: false,
      dailyCoinsUsedBefore,
      dailyCoinsUsedAfter: dailyCoinsUsedBefore,
      dailyCoinCap,
      rewardType: demoPoints > 0 ? 'demo_practice' : 'none',
      reasonPersian:
        demoPoints > 0
          ? 'محتوای آزمایشی (Demo): بدون سکه اصلی پژوهش (۵ امتیاز تمرینی ثبت شد).'
          : 'محتوای آزمایشی (Demo): قبلاً تمرین شده است (بدون سکه پژوهشی).',
    };
  }

  let rawUncappedCoins = 0;
  let cappedByCategoryLimit = false;
  let afterCategoryCap = 0;

  if (input.policyId === 'policy_a') {
    // =========================================================================
    // POLICY A: FLAT SHARED PROGRESSION (Control Group)
    // =========================================================================
    if (!config.policyA.eligibleCategories.includes(input.category)) {
      rawUncappedCoins = 0;
    } else if (input.category === 'learning') {
      const priorLearningContentRewards = input.priorResults.filter(
        (entry) =>
          entry.result.playerId === input.playerId &&
          entry.result.activityId === input.activityId &&
          entry.result.contentId === input.contentId &&
          entry.result.courseId === input.courseId &&
          entry.result.lessonId === input.lessonId &&
          entry.result.sessionMode === input.sessionMode &&
          entry.coinsAwarded > 0
      ).length;

      if (
        priorLearningContentRewards <
        config.policyA.maxRewardedCompletionsPerLearningContent
      ) {
        rawUncappedCoins = config.policyA.flatRewardCoins;
      }
    } else {
      const priorActivityRewardsToday = todayPriorRecords.filter(
        (entry) => entry.result.activityId === input.activityId
      ).length;

      if (
        priorActivityRewardsToday <
        config.policyA.maxRewardedCompletionsPerActivityPerDay
      ) {
        rawUncappedCoins = config.policyA.flatRewardCoins;
      }
    }

    afterCategoryCap = rawUncappedCoins;
  } else {
    // =========================================================================
    // POLICY B: BALANCED SHARED PROGRESSION (Experimental Group)
    // =========================================================================
    if (input.category === 'learning') {
      const priorLearningContentRewards = input.priorResults.filter(
        (entry) =>
          entry.result.playerId === input.playerId &&
          entry.result.activityId === input.activityId &&
          entry.result.contentId === input.contentId &&
          entry.result.courseId === input.courseId &&
          entry.result.lessonId === input.lessonId &&
          entry.result.sessionMode === input.sessionMode &&
          entry.coinsAwarded > 0
      ).length;

      if (
        priorLearningContentRewards <
        config.policyB.maxRewardedCompletionsPerLearningContent
      ) {
        const base = config.policyB.categoryBaseCoins.learning;
        const score = input.scorePercent ?? 0;
        const sortedTiers = [...config.policyB.learningQualityBonusTiers].sort(
          (a, b) => b.minScorePercent - a.minScorePercent
        );
        const matchedTier = sortedTiers.find(
          (tier) => score >= tier.minScorePercent
        );
        const bonus = matchedTier ? matchedTier.bonusCoins : 0;
        rawUncappedCoins = base + bonus;
      }
    } else {
      // Personal development or Recreational: apply repetition multiplier schedule for today
      const priorValidCompletionsToday = input.priorResults.filter(
        (entry) =>
          entry.result.playerId === input.playerId &&
          entry.result.activityId === input.activityId &&
          entry.result.localDate === input.localDate &&
          (input.category === 'personal_development'
            ? entry.result.activityPerformed
            : entry.result.verifiedCompletion)
      ).length;

      const schedule =
        config.policyB.dailyRepetitionMultipliers[input.category] || [];
      const multiplier =
        priorValidCompletionsToday < schedule.length
          ? schedule[priorValidCompletionsToday]
          : 0;

      if (multiplier > 0) {
        const base = config.policyB.categoryBaseCoins[input.category];
        rawUncappedCoins = Math.round(base * multiplier);
      }
    }

    // Apply Policy B category daily cap
    const categoryCoinsUsedToday = todayPriorRecords
      .filter((entry) => entry.result.category === input.category)
      .reduce((sum, entry) => sum + entry.coinsAwarded, 0);

    const categoryCap = config.policyB.categoryDailyCaps[input.category];
    const remainingCategoryCap = Math.max(0, categoryCap - categoryCoinsUsedToday);

    if (rawUncappedCoins > remainingCategoryCap) {
      cappedByCategoryLimit = true;
      afterCategoryCap = remainingCategoryCap;
    } else {
      afterCategoryCap = rawUncappedCoins;
    }
  }

  // Apply shared daily coin cap (identical in Policy A and Policy B)
  const remainingDailyCap = Math.max(0, dailyCoinCap - dailyCoinsUsedBefore);
  const cappedByDailyLimit = afterCategoryCap > remainingDailyCap;
  const coinsAwarded = Math.min(afterCategoryCap, remainingDailyCap);
  const dailyCoinsUsedAfter = dailyCoinsUsedBefore + coinsAwarded;

  let reasonPersian = '';
  if (coinsAwarded > 0) {
    reasonPersian =
      input.policyId === 'policy_a'
        ? `پاداش فعالیت (${coinsAwarded}+ سکه طلا) ثبت شد.`
        : `پاداش فعالیت متوازن (${coinsAwarded}+ سکه طلا) ثبت شد.`;
  } else if (cappedByDailyLimit) {
    reasonPersian = `سقف روزانه دریافت سکه (${dailyCoinCap} سکه در روز) تکمیل شده است.`;
  } else if (cappedByCategoryLimit) {
    reasonPersian =
      'سقف روزانه سکه در این دسته از فعالیت‌ها تکمیل شده است؛ برای پیشرفت بیشتر به فعالیت‌های یادگیری یا رشد فردی سر بزنید.';
  } else {
    reasonPersian =
      'پاداش این فعالیت قبلاً دریافت شده است (تکرار تمرین بدون سکه اضافی ثبت شد).';
  }

  return {
    policyId: input.policyId,
    coinsAwarded,
    demoPointsAwarded: 0,
    rawUncappedCoins,
    cappedByDailyLimit,
    cappedByCategoryLimit,
    dailyCoinsUsedBefore,
    dailyCoinsUsedAfter,
    dailyCoinCap,
    rewardType:
      coinsAwarded > 0
        ? input.policyId === 'policy_a'
          ? 'policy_a_flat'
          : 'policy_b_balanced'
        : 'none',
    reasonPersian,
  };
}

/**
 * Simulates daily coin earnings across diverse learner personas under Policy A and Policy B
 * to verify Requirement #4:
 * - Identical maximum daily coin cap (20 coins) in both Policy A and Policy B.
 * - Balanced learner earns comparable coins in Policy A (15 coins) and Policy B (15 coins).
 * - Purely recreational grinder is bounded in Policy B (3 coins max) so recreational games
 *   cannot be used as the sole fast-track progression path.
 */
export function simulatePolicyPersonas(
  config: ResearchStudyConfig = RESEARCH_STUDY_CONFIG
): PolicySimulationDaySummary[] {
  interface SimStep {
    activityId: string;
    category: ActivityCategory;
    contentId: string;
    courseId?: string;
    lessonId?: string;
    sessionMode?: 'practice' | 'exam';
    scorePercent: number | null;
  }

  const personas: Array<{ name: string; steps: SimStep[] }> = [
    {
      // 1. Balanced Student: 1 Learning (95% score) + 1 Gratitude + 2 Recreational (BinaBalls)
      name: 'balanced_learner',
      steps: [
        {
          activityId: 'uni_read_and_answer',
          category: 'learning',
          contentId: 'content_npd_l1_read_1',
          courseId: 'course_innovation_mgmt',
          lessonId: 'lesson_npd_lecture_01',
          sessionMode: 'practice',
          scorePercent: 95,
        },
        {
          activityId: 'garden_gratitude',
          category: 'personal_development',
          contentId: 'habit_gratitude_daily_v1',
          scorePercent: null,
        },
        {
          activityId: 'garden_bina_balls',
          category: 'recreational',
          contentId: 'recreation_bina_balls_10_v1',
          scorePercent: 100,
        },
        {
          activityId: 'garden_bina_balls',
          category: 'recreational',
          contentId: 'recreation_bina_balls_10_v1',
          scorePercent: 100,
        },
      ],
    },
    {
      // 2. High-Effort All-Rounder (Hits the identical 20-coin daily cap in both Policy A & Policy B)
      name: 'max_daily_cap_achiever',
      steps: [
        {
          activityId: 'uni_read_and_answer',
          category: 'learning',
          contentId: 'content_npd_l1_read_1',
          courseId: 'course_innovation_mgmt',
          lessonId: 'lesson_npd_lecture_01',
          sessionMode: 'practice',
          scorePercent: 100,
        },
        {
          activityId: 'uni_read_and_answer',
          category: 'learning',
          contentId: 'content_npd_l1_read_1',
          courseId: 'course_innovation_mgmt',
          lessonId: 'lesson_npd_lecture_01',
          sessionMode: 'exam',
          scorePercent: 100,
        },
        {
          activityId: 'uni_read_and_answer',
          category: 'learning',
          contentId: 'content_npd_l2_read_1',
          courseId: 'course_innovation_mgmt',
          lessonId: 'lesson_npd_lecture_02',
          sessionMode: 'practice',
          scorePercent: 95,
        },
        {
          activityId: 'garden_gratitude',
          category: 'personal_development',
          contentId: 'habit_gratitude_daily_v1',
          scorePercent: null,
        },
        {
          activityId: 'garden_bina_balls',
          category: 'recreational',
          contentId: 'recreation_bina_balls_10_v1',
          scorePercent: 100,
        },
      ],
    },
    {
      // 3. Purely Recreational Grinder (Plays BinaBalls 5 times in a row, avoids learning & gratitude)
      name: 'recreational_only_grinder',
      steps: Array.from({ length: 5 }, () => ({
        activityId: 'garden_bina_balls',
        category: 'recreational' as const,
        contentId: 'recreation_bina_balls_10_v1',
        scorePercent: 100,
      })),
    },
  ];

  const runForPolicy = (policyId: ResearchPolicyId, steps: SimStep[]) => {
    const priorResults: Array<{ result: ActivityResult; coinsAwarded: number }> = [];
    const byCategory: Record<ActivityCategory, number> = {
      learning: 0,
      personal_development: 0,
      recreational: 0,
    };
    let cappedByDailyLimit = false;

    steps.forEach((step, idx) => {
      const calc = calculateResearchPolicyReward(
        {
          policyId,
          playerId: 'sim_user',
          activityId: step.activityId,
          category: step.category,
          contentId: step.contentId,
          courseId: step.courseId,
          lessonId: step.lessonId,
          sessionMode: step.sessionMode,
          isDemoContent: false,
          activityPerformed: true,
          verifiedCompletion: step.category !== 'personal_development',
          learningProven: step.category === 'learning',
          verificationType:
            step.category === 'learning'
              ? 'proven_learning'
              : step.category === 'personal_development'
              ? 'activity_performed'
              : 'verified_completion',
          scorePercent: step.scorePercent,
          localDate: '2026-11-10',
          priorResults,
        },
        config
      );

      if (calc.cappedByDailyLimit) {
        cappedByDailyLimit = true;
      }
      byCategory[step.category] += calc.coinsAwarded;

      priorResults.push({
        coinsAwarded: calc.coinsAwarded,
        result: {
          sessionId: `sim_${idx}`,
          playerId: 'sim_user',
          activityId: step.activityId,
          category: step.category,
          title: step.activityId,
          contentId: step.contentId,
          courseId: step.courseId,
          lessonId: step.lessonId,
          sessionMode: step.sessionMode,
          contentMaturity:
            step.category === 'learning' ? 'reviewed_research' : 'standard_habit',
          startedAt: '2026-11-10T10:00:00.000Z',
          completedAt: '2026-11-10T10:01:00.000Z',
          status: 'completed',
          durationSeconds: 60,
          scorePercent: step.scorePercent,
          activityPerformed: true,
          verifiedCompletion: step.category !== 'personal_development',
          learningProven: step.category === 'learning',
          mentalHealthOutcomeProven: false,
          verificationType:
            step.category === 'learning'
              ? 'proven_learning'
              : step.category === 'personal_development'
              ? 'activity_performed'
              : 'verified_completion',
          attemptNumber: idx + 1,
          privacySanitized: true,
          claimDisclaimer: '',
          localDate: '2026-11-10',
        },
      });
    });

    const totalCoinsEarned =
      byCategory.learning +
      byCategory.personal_development +
      byCategory.recreational;

    return {
      totalCoinsEarned,
      byCategory,
      cappedByDailyLimit,
    };
  };

  return personas.map((p) => ({
    personaName: p.name,
    policyA: runForPolicy('policy_a', p.steps),
    policyB: runForPolicy('policy_b', p.steps),
  }));
}
