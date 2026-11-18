/**
 * AngelLearn A/B Research Mode Types
 * Stage 4: Implement A/B Research Reward Policies
 */

import { ActivityCategory, ActivityResult, VerificationType } from '../activities/types';

/**
 * Two official research reward policies:
 * - 'policy_a': Flat Shared Progression (Control Group)
 * - 'policy_b': Balanced Shared Progression (Experimental Group)
 */
export type ResearchPolicyId = 'policy_a' | 'policy_b';

export interface QualityBonusTier {
  minScorePercent: number;
  bonusCoins: number;
}

export interface ResearchStudyConfig {
  studyId: string;
  version: string;
  /** Shared constraints across both Policy A and Policy B */
  sharedConstraints: {
    /** Maximum coins a participant can earn per local calendar day (identical in A and B) */
    dailyCoinCap: number;
    /** Minimum score required for objective learning assessment pass */
    defaultLearningPassScore: number;
    /** Disables spring water, demo neighbor help, mail gifts, and legacy quest coin payouts */
    disableExternalCoinSources: boolean;
    /** Demo/sandbox content never grants main coins in either policy */
    allowDemoContentCoins: boolean;
  };
  /** Identical starting baseline for every research participant */
  baselineInitialState: {
    initialCoins: number;
    initialGems: number;
    vipLevel: number;
    streakDays: number;
  };
  /** Policy A — Flat Shared Progression (Control Group) */
  policyA: {
    policyId: 'policy_a';
    titlePersian: string;
    flatRewardCoins: number;
    eligibleCategories: ActivityCategory[];
    maxRewardedCompletionsPerActivityPerDay: number;
    maxRewardedCompletionsPerLearningContent: number;
  };
  /** Policy B — Balanced Shared Progression (Experimental Group) */
  policyB: {
    policyId: 'policy_b';
    titlePersian: string;
    categoryBaseCoins: Record<ActivityCategory, number>;
    /** Quality bonus tiers for measurable 'learning' activities (evaluated highest first) */
    learningQualityBonusTiers: QualityBonusTier[];
    /** Maximum coins earnable per day within each category */
    categoryDailyCaps: Record<ActivityCategory, number>;
    /** Multiplier per valid completion of the same activity on the same day (e.g. [1.0, 0.5]) */
    dailyRepetitionMultipliers: Record<ActivityCategory, number[]>;
    maxRewardedCompletionsPerLearningContent: number;
  };
}

export interface ResearchParticipantSession {
  studyId: string;
  participantId: string;
  assignedPolicy: ResearchPolicyId;
  enrollmentCode: string;
  enrolledAt: string;
  /** Once enrolled, participant cannot switch policies mid-study */
  groupLocked: true;
  isActive: boolean;
}

export interface ResearchRewardCalculationInput {
  policyId: ResearchPolicyId;
  playerId: string;
  activityId: string;
  category: ActivityCategory;
  contentId: string;
  courseId?: string;
  lessonId?: string;
  sessionMode?: 'practice' | 'exam';
  isDemoContent: boolean;
  activityPerformed: boolean;
  verifiedCompletion: boolean;
  learningProven: boolean;
  verificationType: VerificationType;
  scorePercent: number | null;
  localDate: string;
  /** Prior unified activity results for this participant ( paired with coinsAwarded ) */
  priorResults: Array<{
    result: ActivityResult;
    coinsAwarded: number;
  }>;
}

export interface ResearchRewardCalculationOutput {
  policyId: ResearchPolicyId;
  coinsAwarded: number;
  demoPointsAwarded: number;
  rawUncappedCoins: number;
  cappedByDailyLimit: boolean;
  cappedByCategoryLimit: boolean;
  dailyCoinsUsedBefore: number;
  dailyCoinsUsedAfter: number;
  dailyCoinCap: number;
  rewardType:
    | 'none'
    | 'policy_a_flat'
    | 'policy_b_balanced'
    | 'demo_practice';
  reasonPersian: string;
}

export interface PolicySimulationDaySummary {
  personaName: string;
  policyA: {
    totalCoinsEarned: number;
    byCategory: Record<ActivityCategory, number>;
    cappedByDailyLimit: boolean;
  };
  policyB: {
    totalCoinsEarned: number;
    byCategory: Record<ActivityCategory, number>;
    cappedByDailyLimit: boolean;
  };
}
