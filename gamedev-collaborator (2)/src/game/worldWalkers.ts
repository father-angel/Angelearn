/**
 * Pure deterministic World Map walking route builder for real registered players.
 * Replaces all fake NPC citizens with real user avatars roaming between their
 * own garden, University, School, Group HQs, and scenic meadow clearings.
 */

export type WorldWalkerAction = 'walking' | 'studying' | 'greeting' | 'admiring';

export interface WorldWalkerWaypoint {
  x: number;
  y: number;
  action: WorldWalkerAction;
  statusText: string;
  dwellMs: number;
}

const SCENIC_WORLD_SPOTS: ReadonlyArray<{
  x: number;
  y: number;
  action: WorldWalkerAction;
  statusText: string;
}> = [
  {
    x: 1910,
    y: 595,
    action: 'studying',
    statusText: 'در حیاط دانشگاه انجلرن 🎓',
  },
  {
    x: 840,
    y: 780,
    action: 'studying',
    statusText: 'در مدرسه مهارت‌ها 📚',
  },
  {
    x: 1420,
    y: 700,
    action: 'admiring',
    statusText: 'قدم‌زدن در دشت سرسبز 🌿',
  },
  {
    x: 2130,
    y: 830,
    action: 'admiring',
    statusText: 'کنار رودخانه زلال جهان 🌊',
  },
  {
    x: 1180,
    y: 1090,
    action: 'admiring',
    statusText: 'گشت‌وگذار در چمنزار ✨',
  },
  {
    x: 1680,
    y: 960,
    action: 'greeting',
    statusText: 'در حال کاوش در جهان 🧭',
  },
];

function hashUid(uid: string): number {
  let hash = 2166136261;
  for (let i = 0; i < uid.length; i++) {
    hash ^= uid.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function clampStageX(x: number): number {
  return Math.max(300, Math.min(2500, Math.round(x)));
}

function clampStageY(y: number): number {
  return Math.max(260, Math.min(1580, Math.round(y)));
}

export function getPlayerWalkerSpeed(uid: string): number {
  const h = hashUid(uid);
  return 56 + (h % 18);
}

/**
 * Builds a deterministic, unique 4-stop patrol route inside the 2800x1850 World Map
 * for a real player's character based on their UID, home garden coords, and optional Group HQ.
 */
export function buildRealPlayerWorldWaypoints(params: {
  uid: string;
  displayName: string;
  gardenPos: { x: number; y: number };
  groupPos?: { x: number; y: number; groupName?: string } | null;
  isSelf?: boolean;
}): WorldWalkerWaypoint[] {
  const { uid, displayName, gardenPos, groupPos, isSelf } = params;
  const h = hashUid(uid);
  const offsetX = ((h % 9) - 4) * 14;
  const offsetY = (((h >> 4) % 7) - 3) * 12;

  const homeStop: WorldWalkerWaypoint = {
    x: clampStageX(gardenPos.x + (offsetX >= 0 ? 52 : -52)),
    y: clampStageY(gardenPos.y + 62),
    action: 'admiring',
    statusText: isSelf ? 'در کنار باغ شما 🌱' : `در کنار باغ ${displayName} 🌱`,
    dwellMs: 3200 + (h % 900),
  };

  const spotA = SCENIC_WORLD_SPOTS[h % SCENIC_WORLD_SPOTS.length];
  const spotB = SCENIC_WORLD_SPOTS[(h + 2) % SCENIC_WORLD_SPOTS.length];
  const spotC = SCENIC_WORLD_SPOTS[(h + 4) % SCENIC_WORLD_SPOTS.length];

  const stop1: WorldWalkerWaypoint = {
    x: clampStageX(spotA.x + offsetX),
    y: clampStageY(spotA.y + offsetY),
    action: spotA.action,
    statusText: spotA.statusText,
    dwellMs: 3100 + ((h >> 3) % 1000),
  };

  const stop2: WorldWalkerWaypoint = groupPos
    ? {
        x: clampStageX(groupPos.x + (offsetX >= 0 ? -46 : 46)),
        y: clampStageY(groupPos.y + 56),
        action: 'greeting',
        statusText: groupPos.groupName
          ? `در پایگاه گروه «${groupPos.groupName}» ⛺`
          : 'در پایگاه گروه ⛺',
        dwellMs: 3400 + ((h >> 5) % 800),
      }
    : {
        x: clampStageX(spotB.x - offsetX),
        y: clampStageY(spotB.y + offsetY),
        action: spotB.action,
        statusText: spotB.statusText,
        dwellMs: 2900 + ((h >> 5) % 900),
      };

  const stop3: WorldWalkerWaypoint = {
    x: clampStageX(spotC.x + Math.round(offsetX * 0.7)),
    y: clampStageY(spotC.y - Math.round(offsetY * 0.7)),
    action: spotC.action,
    statusText: spotC.statusText,
    dwellMs: 3000 + ((h >> 7) % 1000),
  };

  return [homeStop, stop1, stop2, stop3];
}
