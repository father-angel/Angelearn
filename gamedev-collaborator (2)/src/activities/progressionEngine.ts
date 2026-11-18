/**
 * AngelLearn Central Progression Engine for Unified Activities
 * Stage 3 & Stage 4: Shared Progression Engine + A/B Research Reward Policy Integration
 *
 * UI-agnostic engine that receives activity completion/abandonment payloads,
 * enforces scientific verification rules, strips private user text, separates
 * demo vs. reviewed research content, tracks attempt counts, and computes
 * rewards (using Policy A or Policy B when in Research Mode).
 */

import { formatLocalDateString } from '../game/rules';
import {
  RESEARCH_STORAGE_KEYS,
  ResearchPolicyId,
  ResearchRewardLedgerEntry,
  appendResearchRewardLedger,
  calculateResearchPolicyReward,
  getActiveResearchSession,
  isResearchModeActive,
  loadResearchRewardLedger,
} from '../research';
import { getActivityDefinition } from './registry';
import {
  ActivityDefinition,
  ActivityResult,
  ActivitySubmissionInput,
  ContentMaturityLevel,
  ProgressionEngineOutput,
  VerificationType,
} from './types';

const UNIFIED_RESULTS_STORAGE_KEY = 'angellearn_unified_activity_results_v1';

/**
 * Keys that must NEVER be persisted in research or unified activity logs
 * to protect user privacy (especially private Gratitude notes).
 */
const FORBIDDEN_PRIVATE_METADATA_KEYS = new Set([
  'text',
  'gratitudetext',
  'rawtext',
  'note',
  'privatenote',
  'diarytext',
  'message',
  'body',
  'content',
  'entrytext',
]);

/**
 * Strips any private text or sensitive strings from activity metadata.
 * Only safe primitive flags/counts (numbers, booleans, or short safe enum identifiers) are kept.
 */
export function sanitizeActivityMetadata(
  rawMetadata?: Record<string, unknown>
): Record<string, string | number | boolean> | undefined {
  if (!rawMetadata || typeof rawMetadata !== 'object') return undefined;

  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(rawMetadata)) {
    const normalizedKey = key.trim().toLowerCase();
    if (FORBIDDEN_PRIVATE_METADATA_KEYS.has(normalizedKey)) {
      continue;
    }
    if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value;
    } else if (
      typeof value === 'string' &&
      value.length <= 64 &&
      !normalizedKey.includes('text') &&
      !normalizedKey.includes('note')
    ) {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Loads all unified ActivityResult records from the active storage namespace
 * (isolated research namespace when Research Mode is active, normal namespace otherwise).
 */
export function loadUnifiedActivityResults(): ActivityResult[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const storageKey = isResearchModeActive()
      ? RESEARCH_STORAGE_KEYS.ACTIVITY_RESULTS
      : UNIFIED_RESULTS_STORAGE_KEY;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves unified ActivityResult records to the active storage namespace
 */
export function saveUnifiedActivityResults(results: ActivityResult[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const storageKey = isResearchModeActive()
      ? RESEARCH_STORAGE_KEYS.ACTIVITY_RESULTS
      : UNIFIED_RESULTS_STORAGE_KEY;
    localStorage.setItem(storageKey, JSON.stringify(results));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

/**
 * Computes the 1-based attempt number for a given player, activityId, and contentId
 */
export function computeNextAttemptNumber(
  existingResults: ActivityResult[],
  playerId: string,
  activityId: string,
  contentId: string
): number {
  const priorCount = existingResults.filter(
    (r) =>
      r.playerId === playerId &&
      r.activityId === activityId &&
      r.contentId === contentId
  ).length;
  return priorCount + 1;
}

/**
 * Determines ContentMaturityLevel ('demo_experimental' | 'reviewed_research' | 'standard_habit')
 */
export function resolveContentMaturity(
  definition: ActivityDefinition,
  input: ActivitySubmissionInput
): ContentMaturityLevel {
  if (input.isDemoContent) {
    return 'demo_experimental';
  }
  if (definition.category === 'learning' && definition.completionRule.canProveLearning) {
    return input.isReviewedResearchContent === false
      ? 'demo_experimental'
      : 'reviewed_research';
  }
  return 'standard_habit';
}

export interface EvaluateActivityOptions {
  /** Optional explicit research policy ('policy_a' | 'policy_b') for A/B evaluation */
  researchPolicyId?: ResearchPolicyId;
  /** Optional prior research reward ledger entries for stateless tests */
  researchPriorLedger?: Array<{ result: ActivityResult; coinsAwarded: number }>;
}

/**
 * Pure evaluation function: converts an ActivitySubmissionInput + ActivityDefinition
 * into a standardized ActivityResult and reward decision without touching the DOM/UI.
 * Both normal mode and A/B Research Mode (Policy A & Policy B) use this exact shared engine.
 */
export function evaluateUnifiedActivitySubmission(
  input: ActivitySubmissionInput,
  existingResults: ActivityResult[] = [],
  now: Date = new Date(),
  options?: EvaluateActivityOptions
): ProgressionEngineOutput {
  const definition = getActivityDefinition(input.activityId);
  if (!definition) {
    throw new Error(`Unregistered activityId: "${input.activityId}"`);
  }

  const resolvedContentId = input.contentId || definition.contentId;
  const localDate = formatLocalDateString(now);
  const completedIso = input.completedAt || now.toISOString();
  const safeDuration = Math.max(0, Math.round(input.durationSeconds || 0));
  const startedIso =
    input.startedAt ||
    new Date(now.getTime() - safeDuration * 1000).toISOString();

  const sessionId =
    input.sessionId ||
    `act_sess_${input.activityId}_${now.getTime()}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;

  const attemptNumber = computeNextAttemptNumber(
    existingResults,
    input.playerId,
    definition.activityId,
    resolvedContentId
  );

  const contentMaturity = resolveContentMaturity(definition, input);
  const status =
    input.status || (input.interactionCompleted ? 'completed' : 'abandoned');

  // Normalize scorePercent: non-assessed personal development activities ALWAYS have null scorePercent
  const normalizedScore: number | null =
    definition.assessmentType === 'self_expression_non_assessed'
      ? null
      : typeof input.scorePercent === 'number' && Number.isFinite(input.scorePercent)
      ? Math.max(0, Math.min(100, Math.round(input.scorePercent)))
      : null;

  // ---------------------------------------------------------------------------
  // THREE-TIER SCIENTIFIC VERIFICATION LOGIC (Notes #1, #2, #4)
  // 1. activityPerformed («انجام فعالیت»)
  // 2. verifiedCompletion («اتمام معتبر فعالیت»)
  // 3. learningProven («اثبات یادگیری»)
  // ---------------------------------------------------------------------------
  const meetsMinDuration =
    safeDuration >= definition.completionRule.minDurationSeconds;

  const activityPerformed =
    status === 'completed' && Boolean(input.interactionCompleted);

  let verifiedCompletion = false;
  let learningProven = false;
  let verificationType: VerificationType = 'none';

  if (activityPerformed) {
    if (definition.assessmentType === 'self_expression_non_assessed') {
      // Activities like Gratitude are strictly 'activity_performed'
      verificationType = 'activity_performed';
      verifiedCompletion = false;
      learningProven = false;
    } else {
      const minScore = definition.completionRule.minScorePercent;
      const meetsScore =
        minScore === null ||
        (normalizedScore !== null && normalizedScore >= minScore);
      const meetsAssessment =
        !definition.completionRule.requiresAssessmentPass ||
        (Boolean(input.assessmentPassed ?? true) && meetsScore);

      if (meetsMinDuration && meetsScore && meetsAssessment) {
        verifiedCompletion = true;

        if (
          definition.category === 'learning' &&
          definition.completionRule.canProveLearning &&
          contentMaturity === 'reviewed_research'
        ) {
          learningProven = true;
          verificationType = 'proven_learning';
        } else {
          learningProven = false;
          verificationType = 'verified_completion';
        }
      } else {
        verifiedCompletion = false;
        learningProven = false;
        verificationType = 'activity_performed';
      }
    }
  }

  const safeMetadata = sanitizeActivityMetadata(input.metadata);

  const result: ActivityResult = {
    sessionId,
    playerId: input.playerId,
    activityId: definition.activityId,
    category: definition.category,
    title: definition.title,
    contentId: resolvedContentId,
    ...(input.courseId ? { courseId: input.courseId } : {}),
    ...(input.lessonId ? { lessonId: input.lessonId } : {}),
    ...(input.templateType ? { templateType: input.templateType } : {}),
    ...(input.sessionMode ? { sessionMode: input.sessionMode } : {}),
    contentMaturity,
    startedAt: startedIso,
    completedAt: completedIso,
    status,
    durationSeconds: safeDuration,
    scorePercent: normalizedScore,
    activityPerformed,
    verifiedCompletion,
    learningProven,
    mentalHealthOutcomeProven: false,
    verificationType,
    attemptNumber,
    privacySanitized: true,
    ...(safeMetadata ? { safeMetadata } : {}),
    claimDisclaimer: definition.interpretationNotePersian,
    localDate,
  };

  // ---------------------------------------------------------------------------
  // REWARD CALCULATION: A/B RESEARCH POLICY OR STANDARD MODE
  // ---------------------------------------------------------------------------
  const activeResearchPolicy =
    options?.researchPolicyId || getActiveResearchSession()?.assignedPolicy;

  if (activeResearchPolicy) {
    const priorLedger =
      options?.researchPriorLedger ||
      existingResults.map((r) => ({
        result: r,
        coinsAwarded:
          typeof r.safeMetadata?.coinsAwarded === 'number'
            ? r.safeMetadata.coinsAwarded
            : 0,
      }));

    const policyCalc = calculateResearchPolicyReward({
      policyId: activeResearchPolicy,
      playerId: input.playerId,
      activityId: definition.activityId,
      category: definition.category,
      contentId: resolvedContentId,
      courseId: input.courseId,
      lessonId: input.lessonId,
      sessionMode: input.sessionMode,
      isDemoContent: contentMaturity === 'demo_experimental',
      activityPerformed,
      verifiedCompletion,
      learningProven,
      verificationType,
      scorePercent: normalizedScore,
      localDate,
      priorResults: priorLedger,
    });

    result.safeMetadata = {
      ...(result.safeMetadata || {}),
      researchPolicy: activeResearchPolicy,
      coinsAwarded: policyCalc.coinsAwarded,
    };

    return {
      result,
      reward: {
        coinsAwarded: policyCalc.coinsAwarded,
        demoPointsAwarded: policyCalc.demoPointsAwarded,
        rewardType:
          policyCalc.rewardType === 'demo_practice'
            ? 'demo_practice'
            : policyCalc.coinsAwarded > 0
            ? definition.category === 'learning' &&
              definition.completionRule.canProveLearning
              ? 'official_research_coin'
              : 'daily_habit_coin'
            : 'none',
        reasonPersian: policyCalc.reasonPersian,
      },
    };
  }

  // Standard (Non-Research) Reward Calculation
  let coinsAwarded = 0;
  let demoPointsAwarded = 0;
  let rewardType: ProgressionEngineOutput['reward']['rewardType'] = 'none';
  let reasonPersian = 'بدون پاداش سکه.';

  const qualifiesForRewardByOutcome = definition.rewardEligibility.requiresVerifiedOutcome
    ? verifiedCompletion
    : activityPerformed;

  if (!qualifiesForRewardByOutcome) {
    reasonPersian =
      status === 'abandoned'
        ? 'جلسه پیش از تکمیل رها شد؛ پاداشی تعلق نگرفت.'
        : 'حدنصاب لازم برای دریافت پاداش کسب نشد.';
  } else if (contentMaturity === 'demo_experimental') {
    const alreadyDemoRewarded = existingResults.some(
      (r) =>
        r.playerId === input.playerId &&
        r.activityId === definition.activityId &&
        r.contentId === resolvedContentId &&
        r.sessionMode === input.sessionMode &&
        r.verifiedCompletion
    );
    if (!alreadyDemoRewarded && definition.rewardEligibility.demoPracticePoints > 0) {
      demoPointsAwarded = definition.rewardEligibility.demoPracticePoints;
      rewardType = 'demo_practice';
      reasonPersian = `محتوای آزمایشی (Demo): +${demoPointsAwarded} امتیاز تمرینی آزمایشگاه ثبت شد (بدون سکه اصلی و بدون اثبات یادگیری رسمی).`;
    } else {
      reasonPersian =
        'پاداش تمرینی این فعالیت آزمایشی قبلاً ثبت شده است.';
    }
  } else if (definition.repeatability === 'daily_reward_unlimited_practice') {
    const alreadyRewardedToday = existingResults.some(
      (r) =>
        r.playerId === input.playerId &&
        r.activityId === definition.activityId &&
        r.localDate === localDate &&
        (definition.rewardEligibility.requiresVerifiedOutcome
          ? r.verifiedCompletion
          : r.activityPerformed)
    );
    if (!alreadyRewardedToday && definition.rewardEligibility.eligibleForMainCoins) {
      coinsAwarded = definition.rewardEligibility.baseCoins;
      rewardType = 'daily_habit_coin';
      reasonPersian = `پاداش روزانه فعالیت «${definition.title}»: +${coinsAwarded} سکه طلا.`;
    } else {
      reasonPersian =
        'پاداش روزانه این فعالیت امروز قبلاً دریافت شده است (تکرار تمرین بدون سکه اضافی ثبت شد).';
    }
  } else if (definition.repeatability === 'one_time_mastery_unlimited_practice') {
    const alreadyMastered = existingResults.some(
      (r) =>
        r.playerId === input.playerId &&
        r.activityId === definition.activityId &&
        r.contentId === resolvedContentId &&
        r.courseId === input.courseId &&
        r.lessonId === input.lessonId &&
        r.sessionMode === input.sessionMode &&
        r.verifiedCompletion
    );
    if (!alreadyMastered && definition.rewardEligibility.eligibleForMainCoins) {
      coinsAwarded = definition.rewardEligibility.baseCoins;
      rewardType = 'official_research_coin';
      reasonPersian = `پاداش کسب تسلط در فعالیت پژوهشی «${definition.title}»: +${coinsAwarded} سکه طلا.`;
    } else {
      reasonPersian =
        'پاداش این بخش آموزشی قبلاً دریافت شده است (نتیجه تلاش جدید در کارنامه پژوهشی ثبت شد).';
    }
  }

  return {
    result,
    reward: {
      coinsAwarded,
      demoPointsAwarded,
      rewardType,
      reasonPersian,
    },
  };
}

/**
 * Stateful entry point for the application: evaluates an ActivitySubmissionInput,
 * persists the sanitized ActivityResult into the active storage namespace,
 * records research ledger entries when in Research Mode, and returns the ProgressionEngineOutput.
 */
export function submitUnifiedActivityResult(
  input: ActivitySubmissionInput,
  now: Date = new Date()
): ProgressionEngineOutput {
  const existing = loadUnifiedActivityResults();
  const activeSession = getActiveResearchSession();
  const researchPriorLedger: ResearchRewardLedgerEntry[] | undefined = activeSession
    ? loadResearchRewardLedger()
    : undefined;

  const output = evaluateUnifiedActivitySubmission(input, existing, now, {
    researchPolicyId: activeSession?.assignedPolicy,
    researchPriorLedger,
  });

  saveUnifiedActivityResults([output.result, ...existing].slice(0, 500));

  if (activeSession) {
    appendResearchRewardLedger({
      result: output.result,
      coinsAwarded: output.reward.coinsAwarded,
      policyId: activeSession.assignedPolicy,
    });
  }

  return output;
}
