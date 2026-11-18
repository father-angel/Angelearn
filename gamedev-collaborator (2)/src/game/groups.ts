/**
 * AngelLearn - Pure World Group Constants, Architecture Tiers & Progression Math
 */

export const GROUP_CREATE_COST = 250;
export const GROUP_MAX_LEVEL = 5;
export const GROUP_MAX_MEMBERS = 30;
export const GROUP_NAME_MIN_LENGTH = 2;
export const GROUP_NAME_MAX_LENGTH = 40;
export const GROUP_MOTTO_MAX_LENGTH = 120;

export const GROUP_CONTRIBUTION_PRESETS: ReadonlyArray<number> = [
  25, 50, 100, 250,
];

export interface GroupTierMeta {
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  nextUpgradeCost: number | null;
}

export const GROUP_UPGRADE_TIERS: ReadonlyArray<GroupTierMeta> = [
  {
    level: 1,
    title: 'چادر کهنه همسفران',
    subtitle: 'پناهگاه اولیه با چادر پارچه‌ای وصله‌دار و آتش‌دان گرم',
    nextUpgradeCost: 400,
  },
  {
    level: 2,
    title: 'خیمه بزرگ پرچم‌دار',
    subtitle: 'خیمه مستحکم با تیرهای چوبی، فانوس آویز و درفش گروه',
    nextUpgradeCost: 1000,
  },
  {
    level: 3,
    title: 'تالار چوبی و سنگی',
    subtitle: 'اقامتگاه سنگی با سقف سفالی، دودکش گرم و ایوان هم‌نشینی',
    nextUpgradeCost: 2200,
  },
  {
    level: 4,
    title: 'عمارت باشکوه دانش',
    subtitle: 'عمارت زمردین دوبرج با تالار شورا و رواق‌های طلایی',
    nextUpgradeCost: 4500,
  },
  {
    level: 5,
    title: 'دژ زرین جاویدان',
    subtitle: 'شکوه نهایی گروه با گنبد فیروزه‌ای، مناره‌های زرین و پرچم افتخار',
    nextUpgradeCost: null,
  },
];

export function clampGroupLevel(level: number): 1 | 2 | 3 | 4 | 5 {
  const n = Math.floor(Number(level) || 1);
  if (n <= 1) return 1;
  if (n >= 5) return 5;
  return n as 1 | 2 | 3 | 4 | 5;
}

export function getGroupTierMeta(level: number): GroupTierMeta {
  const clamped = clampGroupLevel(level);
  return GROUP_UPGRADE_TIERS[clamped - 1];
}

export function getNextGroupUpgradeCost(level: number): number | null {
  return getGroupTierMeta(level).nextUpgradeCost;
}

export function applyGroupContribution(
  currentLevel: number,
  currentTreasuryCoins: number,
  addedCoins: number
): {
  nextLevel: 1 | 2 | 3 | 4 | 5;
  nextTreasuryCoins: number;
  leveledUp: boolean;
  levelsGained: number;
  maxReached: boolean;
} {
  let level = clampGroupLevel(currentLevel);
  const safeAdded = Math.max(0, Math.floor(Number(addedCoins) || 0));
  let treasury = Math.max(0, Math.floor(Number(currentTreasuryCoins) || 0)) + safeAdded;
  let levelsGained = 0;

  while (level < GROUP_MAX_LEVEL) {
    const needed = getNextGroupUpgradeCost(level);
    if (!needed || treasury < needed) break;
    treasury -= needed;
    level = clampGroupLevel(level + 1);
    levelsGained += 1;
  }

  if (level >= GROUP_MAX_LEVEL) {
    treasury = 0;
  }

  return {
    nextLevel: level,
    nextTreasuryCoins: treasury,
    leveledUp: levelsGained > 0,
    levelsGained,
    maxReached: level >= GROUP_MAX_LEVEL,
  };
}

export function sanitizeGroupName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, GROUP_NAME_MAX_LENGTH);
}

export function sanitizeGroupMotto(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, GROUP_MOTTO_MAX_LENGTH);
}

export function canCreateGroupName(raw: string): boolean {
  return sanitizeGroupName(raw).length >= GROUP_NAME_MIN_LENGTH;
}

export function makeGroupId(leaderUid: string, nowMs = Date.now()): string {
  const cleanUid = leaderUid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12) || 'ldr';
  const rand = Math.random().toString(36).slice(2, 7);
  return `grp_${nowMs.toString(36)}_${cleanUid}_${rand}`;
}

export function makeGroupInviteId(groupId: string, targetUid: string): string {
  return `${groupId}__${targetUid}`;
}
