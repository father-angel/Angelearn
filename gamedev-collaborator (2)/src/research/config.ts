/**
 * AngelLearn A/B Research Mode Configuration
 * Stage 4: Single source of truth for Policy A (Flat) & Policy B (Balanced),
 * daily caps, repetition limits, baseline initial conditions, and researcher enrollment codes.
 */

import { ResearchPolicyId, ResearchStudyConfig } from './types';

export const RESEARCH_STUDY_CONFIG: ResearchStudyConfig = {
  studyId: 'angellearn_thesis_ab_2026',
  version: '1.0.0',

  // =========================================================================
  // SHARED CONSTRAINTS (Identical across Policy A and Policy B)
  // =========================================================================
  sharedConstraints: {
    dailyCoinCap: 20, // Identical maximum daily coin cap in both Policy A and Policy B
    defaultLearningPassScore: 80,
    disableExternalCoinSources: true, // Blocks spring water, neighbor help, mail/quest coin gifts
    allowDemoContentCoins: false,
  },

  // =========================================================================
  // BASELINE INITIAL CONDITIONS (Identical starting state for all participants)
  // =========================================================================
  baselineInitialState: {
    initialCoins: 10,
    initialGems: 0,
    vipLevel: 0,
    streakDays: 1,
  },

  // =========================================================================
  // POLICY A — FLAT SHARED PROGRESSION (Control Group)
  // Fixed reward (5 coins) for any valid activity completion across all categories
  // =========================================================================
  policyA: {
    policyId: 'policy_a',
    titlePersian: 'سیاست A — پیشرفت مشترک یکنواخت (گروه کنترل)',
    flatRewardCoins: 5,
    eligibleCategories: ['learning', 'personal_development', 'recreational'],
    maxRewardedCompletionsPerActivityPerDay: 1,
    maxRewardedCompletionsPerLearningContent: 1,
  },

  // =========================================================================
  // POLICY B — BALANCED SHARED PROGRESSION (Experimental Group)
  // Calibrated by category, measurable performance quality, and repetition
  // =========================================================================
  policyB: {
    policyId: 'policy_b',
    titlePersian: 'سیاست B — پیشرفت مشترک متوازن (گروه آزمایش)',
    categoryBaseCoins: {
      learning: 6,             // Base 6 coins for passing a learning activity (>=80%)
      personal_development: 5, // 5 coins for daily personal development reflection
      recreational: 2,         // 2 coins base for purely recreational challenge
    },
    learningQualityBonusTiers: [
      { minScorePercent: 100, bonusCoins: 2 }, // 100% -> 6 + 2 = 8 coins
      { minScorePercent: 90, bonusCoins: 1 },  // 90–99% -> 6 + 1 = 7 coins
      { minScorePercent: 80, bonusCoins: 0 },  // 80–89% -> 6 + 0 = 6 coins
    ],
    categoryDailyCaps: {
      learning: 20,            // Can reach full daily cap (20) through learning
      personal_development: 5, // Up to 5 coins/day from personal development
      recreational: 3,         // Up to 3 coins/day from recreational activities (prevents easy grinding)
    },
    dailyRepetitionMultipliers: {
      learning: [1.0],              // Once per unique learning content/lesson
      personal_development: [1.0],  // Once per day per personal development activity
      recreational: [1.0, 0.5],     // 1st today = 2 coins (100%), 2nd today = 1 coin (50%), 3rd+ = 0
    },
    maxRewardedCompletionsPerLearningContent: 1,
  },
};

/**
 * Researcher-issued enrollment code prefixes and validation rules.
 *
 * Valid Researcher Codes:
 * - Policy A (Control Group):
 *   Codes matching `ANG-A-<3..8 alphanumeric>` or `RES-A-<3..8 alphanumeric>`
 *   (e.g., `ANG-A-101`, `ANG-A-204`, `RES-A-001`)
 * - Policy B (Experimental Group):
 *   Codes matching `ANG-B-<3..8 alphanumeric>` or `RES-B-<3..8 alphanumeric>`
 *   (e.g., `ANG-B-101`, `ANG-B-204`, `RES-B-001`)
 *
 * The code deterministically generates an anonymous `participantId` (e.g., `P-A-101`)
 * so no personal name or email is embedded in the participant identifier.
 */
export interface ParsedEnrollmentCode {
  valid: boolean;
  normalizedCode: string;
  assignedPolicy?: ResearchPolicyId;
  participantId?: string;
  errorPersian?: string;
}

export function parseResearcherEnrollmentCode(rawCode: string): ParsedEnrollmentCode {
  const normalized = (rawCode || '').trim().toUpperCase();
  if (!normalized) {
    return {
      valid: false,
      normalizedCode: '',
      errorPersian: 'لطفاً کد پژوهشی دریافت‌شده از پژوهشگر را وارد کنید.',
    };
  }

  const match = /^(?:ANG|RES)-(A|B)-([A-Z0-9]{3,8})$/.exec(normalized);
  if (!match) {
    return {
      valid: false,
      normalizedCode: normalized,
      errorPersian:
        'کد پژوهشی معتبر نیست. نمونه کدهای معتبر پژوهشگر: ANG-A-101 یا ANG-B-101',
    };
  }

  const groupLetter = match[1];
  const suffix = match[2];
  const assignedPolicy: ResearchPolicyId =
    groupLetter === 'A' ? 'policy_a' : 'policy_b';
  const participantId = `P-${groupLetter}-${suffix}`;

  return {
    valid: true,
    normalizedCode: normalized,
    assignedPolicy,
    participantId,
  };
}

/**
 * Researcher administrative token required to exit Research Mode and return to normal mode.
 * Regular study participants cannot accidentally exit or switch their assigned policy mid-study.
 */
export const RESEARCHER_ADMIN_RESET_TOKEN = 'ADMIN-RESET-2026';
