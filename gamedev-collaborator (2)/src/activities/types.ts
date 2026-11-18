/**
 * AngelLearn Unified Activity Registry & Central Progression Types
 * Stage 3: Unified Activity Registry and Completion Results
 */

import { TreeId } from '../types/game';
import { GameTemplateType } from '../university/types';

/**
 * Three official activity categories in AngelLearn
 */
export type ActivityCategory =
  | 'learning'             // فعالیت‌های یادگیری و تمرین دانش یا مهارت
  | 'personal_development' // فعالیت‌های رشد فردی
  | 'recreational';        // فعالیت‌های صرفاً سرگرمی‌محور

/**
 * Distinction between performing an activity, completing it validly, and proving learning:
 * - 'none': Activity was abandoned or did not meet even minimal participation
 * - 'activity_performed': صرفاً انجام فعالیت (e.g., Gratitude note submission, or attempting a quiz below passing threshold)
 * - 'verified_completion': اتمام معتبر فعالیت (e.g., Completing BinaBalls visual tracking challenge, or passing a Demo/practice activity)
 * - 'proven_learning': اثبات یادگیری (e.g., Passing an objective assessment on reviewed research/educational content)
 */
export type VerificationType =
  | 'none'
  | 'activity_performed'
  | 'verified_completion'
  | 'proven_learning';

export type ActivitySessionStatus =
  | 'in_progress'
  | 'completed'
  | 'abandoned'
  | 'failed';

export type AssessmentType =
  | 'objective_quiz'               // آزمون چندگزینه‌ای یا ارزیابی عینی قابل نمره‌دهی
  | 'self_expression_non_assessed' // ثبت شخصی بدون نمره‌دهی یا ادعای اثبات یادگیری/سلامت روان (مثل شکرگزاری)
  | 'perceptual_challenge'         // چالش توجه و ردیابی دیداری/تفریحی (مثل توپ‌های بینا)
  | 'skill_drill';                 // تمرین مهارتی زمان‌دار یا مرحله‌ای

export type RepeatabilityRule =
  | 'daily_reward_unlimited_practice'    // پاداش سکه یک‌بار در روز، تکرار نامحدود بدون سکه اضافی
  | 'one_time_mastery_unlimited_practice'// پاداش سکه یک‌بار به ازای تسلط بر محتوا (course+lesson+template+mode)، تمرین نامحدود
  | 'unlimited_no_coin';                 // تکرار نامحدود بدون پاداش سکه اصلی

/**
 * Separates experimental/demo educational content from reviewed research content
 */
export type ContentMaturityLevel =
  | 'demo_experimental' // محتوای آزمایشی / سندباکس (غیرقابل استناد پژوهشی و بدون سکه اصلی)
  | 'reviewed_research' // محتوای بررسی‌شده و معتبر آموزشی/پژوهشی
  | 'standard_habit';   // فعالیت استاندارد باغ (رشد فردی / سرگرمی)

export interface CompletionRule {
  /** Minimum duration in seconds required for valid completion (0 if not time-gated) */
  minDurationSeconds: number;
  /** Minimum score percentage required for verified completion or mastery (null if non-scored) */
  minScorePercent: number | null;
  /** Whether passing an objective assessment is required to count as verified completion */
  requiresAssessmentPass: boolean;
  /** Whether the activity can ever produce 'proven_learning' when content is reviewed_research */
  canProveLearning: boolean;
  /** Human-readable Persian description of the completion rule */
  descriptionPersian: string;
}

export interface RewardEligibilityRule {
  eligibleForMainCoins: boolean;
  baseCoins: number;
  demoPracticePoints: number;
  /** If true, requires verifiedCompletion (or activity_performed for non-assessed habits) */
  requiresVerifiedOutcome: boolean;
  /** Linked garden tree ID if this activity waters a daily habit tree */
  linkedTreeId?: TreeId;
}

/**
 * Formal definition for each activity registered in the Unified Activity Registry
 */
export interface ActivityDefinition {
  activityId: string;
  category: ActivityCategory;
  title: string;
  contentId: string;
  completionRule: CompletionRule;
  assessmentType: AssessmentType;
  repeatability: RepeatabilityRule;
  rewardEligibility: RewardEligibilityRule;
  /** Explicit scientific/research interpretation guard */
  interpretationNotePersian: string;
}

/**
 * Unified ActivityResult model produced by any activity and consumed by the Central Progression Engine
 */
export interface ActivityResult {
  sessionId: string;
  playerId: string;
  activityId: string;
  category: ActivityCategory;
  title: string;
  contentId: string;
  /** Real course ID for university learning activities */
  courseId?: string;
  /** Real lesson ID for university learning activities */
  lessonId?: string;
  /** University game template type if applicable */
  templateType?: GameTemplateType;
  /** Practice vs Exam mode for university learning activities */
  sessionMode?: 'practice' | 'exam';
  /** Distinguishes experimental/demo content from reviewed research content */
  contentMaturity: ContentMaturityLevel;
  startedAt: string;
  completedAt: string;
  status: ActivitySessionStatus;
  durationSeconds: number;
  /** Objective score percentage (0..100), or null for non-scored personal development activities */
  scorePercent: number | null;
  /**
   * Three-tier scientific distinction (Requirement #1 & #2):
   * 1. activityPerformed: Did the user perform the activity?
   * 2. verifiedCompletion: Did the user complete the activity according to its validity rule?
   * 3. learningProven: Is objective learning proven on reviewed educational content?
   */
  activityPerformed: boolean;
  verifiedCompletion: boolean;
  learningProven: boolean;
  /** Explicitly false for habit/gratitude activities to prevent overclaiming mental health outcomes */
  mentalHealthOutcomeProven: boolean;
  verificationType: VerificationType;
  attemptNumber: number;
  /** Confirming that private user text (e.g., gratitude note) was stripped before logging */
  privacySanitized: true;
  /** Safe, non-private metadata (never contains raw gratitude text) */
  safeMetadata?: Record<string, string | number | boolean>;
  /** Scientific/research interpretation disclaimer */
  claimDisclaimer: string;
  /** Local date string (YYYY-MM-DD) for consistent daily tracking */
  localDate: string;
}

/**
 * UI-agnostic input passed by any game/activity adapter into the Central Progression Engine
 */
export interface ActivitySubmissionInput {
  sessionId?: string;
  playerId: string;
  activityId: string;
  /** Specific content ID (overrides default definition contentId when dynamic, e.g., university lessons) */
  contentId?: string;
  courseId?: string;
  lessonId?: string;
  templateType?: GameTemplateType;
  sessionMode?: 'practice' | 'exam';
  isDemoContent?: boolean;
  isReviewedResearchContent?: boolean;
  startedAt?: string;
  completedAt?: string;
  status?: ActivitySessionStatus;
  durationSeconds: number;
  scorePercent?: number | null;
  /** Did the player complete the interactive steps (e.g. wrote a note, finished reading, or finished ball tracking phase)? */
  interactionCompleted: boolean;
  /** Did the player pass the objective check/question if applicable? */
  assessmentPassed?: boolean;
  /**
   * Optional raw metadata from the caller; the progression engine automatically strips
   * any sensitive keys (like `gratitudeText`, `privateText`, `note`, `rawText`) before persisting.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Output returned by the Central Progression Engine after processing an ActivityResult
 */
export interface ProgressionEngineOutput {
  result: ActivityResult;
  reward: {
    coinsAwarded: number;
    demoPointsAwarded: number;
    rewardType: 'none' | 'daily_habit_coin' | 'official_research_coin' | 'demo_practice';
    reasonPersian: string;
  };
}
