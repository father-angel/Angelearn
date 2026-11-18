/**
 * AngelLearn A/B Research Mode State & Isolated Storage Manager
 * Stage 4: Implement A/B Research Reward Policies
 *
 * Guarantees:
 * - Anonymous `participantId` and fixed `assignedPolicy` ('policy_a' | 'policy_b')
 * - Group assignment strictly via researcher-issued code; locked mid-study
 * - Clean baseline initial state (10 coins, 0 gems, VIP 0, fresh trees)
 * - 100% isolation from normal user progress (normal localStorage keys are never overwritten or deleted)
 */

import { ActivityResult } from '../activities/types';
import { formatLocalDateString } from '../game/rules';
import { TreeData, UserProfile } from '../types/game';
import {
  RESEARCH_STUDY_CONFIG,
  RESEARCHER_ADMIN_RESET_TOKEN,
  parseResearcherEnrollmentCode,
} from './config';
import { ResearchParticipantSession, ResearchPolicyId } from './types';

export const RESEARCH_STORAGE_KEYS = {
  SESSION: 'angellearn_research_session_v1',
  PROFILE: 'angellearn_research_profile_v1',
  TREES: 'angellearn_research_trees_v1',
  DECORATIONS: 'angellearn_research_decorations_v1',
  QUESTS: 'angellearn_research_quests_v1',
  MAILS: 'angellearn_research_mails_v1',
  ACTIVITY_RESULTS: 'angellearn_research_activity_results_v1',
  REWARD_LEDGER: 'angellearn_research_reward_ledger_v1',
  UNI_REWARDED: 'angellearn_research_uni_rewarded_v1',
} as const;

export interface ResearchRewardLedgerEntry {
  result: ActivityResult;
  coinsAwarded: number;
  policyId: ResearchPolicyId;
}

/**
 * Loads the active research participant session if enrolled
 */
export function getActiveResearchSession(): ResearchParticipantSession | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(RESEARCH_STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResearchParticipantSession;
    if (
      parsed &&
      parsed.isActive &&
      (parsed.assignedPolicy === 'policy_a' || parsed.assignedPolicy === 'policy_b') &&
      typeof parsed.participantId === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function isResearchModeActive(): boolean {
  return getActiveResearchSession() !== null;
}

export function areExternalCoinSourcesBlocked(): boolean {
  const session = getActiveResearchSession();
  if (!session) return false;
  return RESEARCH_STUDY_CONFIG.sharedConstraints.disableExternalCoinSources;
}

/**
 * Creates the clean, standardized baseline profile for any research participant
 * (Requirement #8: identical starting coins, no VIP, no prior coins/progress carried over)
 */
export function createBaselineResearchProfile(
  participantId: string,
  now: Date = new Date()
): UserProfile {
  const today = formatLocalDateString(now);
  const { initialCoins, initialGems, vipLevel, streakDays } =
    RESEARCH_STUDY_CONFIG.baselineInitialState;

  return {
    id: participantId,
    name: `شرکت‌کننده ${participantId}`,
    gender: 'girl',
    coins: initialCoins,
    gems: initialGems,
    vipLevel,
    bio: '',
    isGuest: true,
    googleConnected: false,
    createdAt: today,
    lastActiveDate: today,
    streakDays,
    unlockedAvatarItems: [],
    privacy: {
      showAge: false,
      showGratitude: false,
      showStats: false,
    },
  };
}

/**
 * Creates standardized baseline trees for a new research participant
 * (All starter trees start with wateredDaysCount: 0 and lastWateredDate: undefined
 * so every participant has identical day-1 earning opportunities)
 */
export function createBaselineResearchTrees(templateTrees: TreeData[]): TreeData[] {
  return templateTrees.map((t) => ({
    ...t,
    unlocked: t.cost === 0,
    unlockedAt: undefined,
    wateredDaysCount: 0,
    lastWateredDate: undefined,
    daysWithoutWater: 0,
    isWithered: false,
  }));
}

export function loadResearchRewardLedger(): ResearchRewardLedgerEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(RESEARCH_STORAGE_KEYS.REWARD_LEDGER);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendResearchRewardLedger(entry: ResearchRewardLedgerEntry): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const current = loadResearchRewardLedger();
    localStorage.setItem(
      RESEARCH_STORAGE_KEYS.REWARD_LEDGER,
      JSON.stringify([entry, ...current].slice(0, 500))
    );
  } catch {
    // Ignore storage quota errors
  }
}

export interface EnrollmentOutcome {
  success: boolean;
  session?: ResearchParticipantSession;
  reason?:
    | 'enrolled_new'
    | 'already_enrolled_same_code'
    | 'group_locked_mid_study'
    | 'invalid_code';
  messagePersian: string;
}

/**
 * Enrolls the user into Research Mode using a researcher-issued code (e.g., ANG-A-101 or ANG-B-101).
 * - Prevents switching groups mid-study once enrolled (Requirement #7).
 * - Initializes isolated baseline state without touching normal user data (Requirements #8 & #10).
 */
export function enrollWithResearcherCode(
  rawCode: string,
  templateTrees: TreeData[] = [],
  now: Date = new Date()
): EnrollmentOutcome {
  const existing = getActiveResearchSession();
  const parsed = parseResearcherEnrollmentCode(rawCode);

  if (!parsed.valid || !parsed.assignedPolicy || !parsed.participantId) {
    return {
      success: false,
      reason: 'invalid_code',
      messagePersian:
        parsed.errorPersian || 'کد پژوهشی واردشده معتبر نیست.',
    };
  }

  // Requirement #7: Cannot switch group or participant code mid-study
  if (existing && existing.isActive && existing.groupLocked) {
    if (
      existing.enrollmentCode === parsed.normalizedCode &&
      existing.assignedPolicy === parsed.assignedPolicy
    ) {
      return {
        success: true,
        session: existing,
        reason: 'already_enrolled_same_code',
        messagePersian: `شما هم‌اکنون با شناسه ${existing.participantId} در مطالعه فعال هستید.`,
      };
    }

    return {
      success: false,
      session: existing,
      reason: 'group_locked_mid_study',
      messagePersian:
        'تغییر گروه یا کد پژوهشی در حین مطالعه مجاز نیست. گروه تخصیص‌یافته شما ثابت است.',
    };
  }

  const newSession: ResearchParticipantSession = {
    studyId: RESEARCH_STUDY_CONFIG.studyId,
    participantId: parsed.participantId,
    assignedPolicy: parsed.assignedPolicy,
    enrollmentCode: parsed.normalizedCode,
    enrolledAt: now.toISOString(),
    groupLocked: true,
    isActive: true,
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        RESEARCH_STORAGE_KEYS.SESSION,
        JSON.stringify(newSession)
      );

      // Initialize clean baseline state for this participant in isolated research keys
      const baselineProfile = createBaselineResearchProfile(
        parsed.participantId,
        now
      );
      localStorage.setItem(
        RESEARCH_STORAGE_KEYS.PROFILE,
        JSON.stringify(baselineProfile)
      );

      if (templateTrees.length > 0) {
        const baselineTrees = createBaselineResearchTrees(templateTrees);
        localStorage.setItem(
          RESEARCH_STORAGE_KEYS.TREES,
          JSON.stringify(baselineTrees)
        );
      } else {
        localStorage.removeItem(RESEARCH_STORAGE_KEYS.TREES);
      }

      localStorage.setItem(RESEARCH_STORAGE_KEYS.DECORATIONS, JSON.stringify([]));
      localStorage.setItem(
        RESEARCH_STORAGE_KEYS.ACTIVITY_RESULTS,
        JSON.stringify([])
      );
      localStorage.setItem(
        RESEARCH_STORAGE_KEYS.REWARD_LEDGER,
        JSON.stringify([])
      );
      localStorage.setItem(
        RESEARCH_STORAGE_KEYS.UNI_REWARDED,
        JSON.stringify([])
      );
    }
  } catch {
    // Ignore storage errors in restricted environments
  }

  return {
    success: true,
    session: newSession,
    reason: 'enrolled_new',
    messagePersian: `حالت پژوهش با شناسه ناشناس ${newSession.participantId} فعال شد. شرایط اولیه یکسان اعمال گردید.`,
  };
}

/**
 * Allows only the researcher (using RESEARCHER_ADMIN_RESET_TOKEN) to exit Research Mode
 * and return the browser to the untouched normal user profile.
 */
export function exitResearchModeWithAdminToken(adminToken: string): {
  success: boolean;
  messagePersian: string;
} {
  if ((adminToken || '').trim() !== RESEARCHER_ADMIN_RESET_TOKEN) {
    return {
      success: false,
      messagePersian:
        'خروج از مطالعه یا تغییر گروه برای شرکت‌کننده قفل است (نیازمند کد سرپرست پژوهش).',
    };
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(RESEARCH_STORAGE_KEYS.SESSION);
    }
  } catch {
    // Ignore
  }

  return {
    success: true,
    messagePersian:
      'حالت پژوهش پایان یافت و پروفایل عادی شما بدون هیچ تغییری بازیابی شد.',
  };
}
