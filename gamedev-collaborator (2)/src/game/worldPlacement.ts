/**
 * Pure deterministic World Map coordinate placement & overlap-avoidance helpers
 * for registered players' gardens across the 2800x1850 meadow.
 */

export const WORLD_CANDIDATE_SPOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 1320, y: 860 },
  { x: 1080, y: 1020 },
  { x: 1580, y: 980 },
  { x: 1360, y: 580 },
  { x: 1050, y: 540 },
  { x: 1620, y: 720 },
  { x: 1220, y: 1220 },
  { x: 1760, y: 1140 },
  { x: 760, y: 1060 },
  { x: 1480, y: 760 },
  { x: 1890, y: 890 },
  { x: 1150, y: 780 },
];

/**
 * Compute a deterministic, well-spaced World Map position for a player UID.
 * Preserves valid custom coordinates (e.g. if the player relocated their garden),
 * while ignoring legacy/guest coordinates like (176, 171) or (512, 512).
 */
export function getDeterministicWorldCoords(
  uid: string,
  customCoords?: { x: number; y: number }
): { worldX: number; worldY: number } {
  if (
    customCoords &&
    typeof customCoords.x === 'number' &&
    typeof customCoords.y === 'number' &&
    Number.isFinite(customCoords.x) &&
    Number.isFinite(customCoords.y) &&
    customCoords.x >= 240 &&
    customCoords.x <= 2560 &&
    customCoords.y >= 200 &&
    customCoords.y <= 1650 &&
    !(customCoords.x === 512 && customCoords.y === 512)
  ) {
    return {
      worldX: Math.round(customCoords.x),
      worldY: Math.round(customCoords.y),
    };
  }

  let hash = 2166136261;
  for (let i = 0; i < uid.length; i++) {
    hash ^= uid.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  const baseSpot = WORLD_CANDIDATE_SPOTS[hash % WORLD_CANDIDATE_SPOTS.length];
  const jitterX = ((hash >> 5) % 70) - 35;
  const jitterY = ((hash >> 11) % 50) - 25;

  return {
    worldX: Math.max(280, Math.min(2520, baseSpot.x + jitterX)),
    worldY: Math.max(240, Math.min(1600, baseSpot.y + jitterY)),
  };
}

export const WORLD_GROUP_CANDIDATE_SPOTS: ReadonlyArray<{
  x: number;
  y: number;
}> = [
  { x: 1510, y: 540 },
  { x: 1120, y: 490 },
  { x: 640, y: 920 },
  { x: 2140, y: 840 },
  { x: 1320, y: 1290 },
  { x: 880, y: 1180 },
  { x: 1840, y: 1210 },
  { x: 1620, y: 420 },
  { x: 640, y: 520 },
  { x: 2150, y: 1110 },
];

/**
 * Compute a deterministic World Map position for a newly founded Group HQ.
 */
export function getDeterministicGroupCoords(groupId: string): {
  worldX: number;
  worldY: number;
} {
  let hash = 2166136261;
  for (let i = 0; i < groupId.length; i++) {
    hash ^= groupId.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const baseSpot =
    WORLD_GROUP_CANDIDATE_SPOTS[hash % WORLD_GROUP_CANDIDATE_SPOTS.length];
  const jitterX = ((hash >> 5) % 60) - 30;
  const jitterY = ((hash >> 11) % 44) - 22;
  return {
    worldX: Math.max(280, Math.min(2520, baseSpot.x + jitterX)),
    worldY: Math.max(240, Math.min(1600, baseSpot.y + jitterY)),
  };
}

/**
 * Ensures rendered cloud neighbor gardens (or groups) never visually overlap the player's own
 * garden, campus buildings, or each other on the 2800x1850 World Map.
 */
export function resolveNonOverlappingWorldCoords<
  T extends { uid: string; worldX: number; worldY: number }
>(
  neighbors: T[],
  playerCoords: { x: number; y: number },
  extraOccupied: Array<{ x: number; y: number }> = []
): T[] {
  const MIN_DIST = 190;
  const occupied: Array<{ x: number; y: number }> = [
    { x: playerCoords.x, y: playerCoords.y },
    { x: 1920, y: 520 }, // University campus
    { x: 820, y: 710 }, // School campus
    ...extraOccupied,
  ];

  const isClear = (x: number, y: number) =>
    occupied.every((pt) => Math.hypot(pt.x - x, pt.y - y) >= MIN_DIST);

  return neighbors.map((neighbor, idx) => {
    let x = Math.max(280, Math.min(2520, Math.round(neighbor.worldX)));
    let y = Math.max(240, Math.min(1600, Math.round(neighbor.worldY)));

    if (!isClear(x, y)) {
      const candidate = [...WORLD_CANDIDATE_SPOTS, ...WORLD_GROUP_CANDIDATE_SPOTS].find(
        (spot) => isClear(spot.x, spot.y)
      );
      if (candidate) {
        x = candidate.x;
        y = candidate.y;
      } else {
        // Fallback spiral offset around original spot
        for (let step = 1; step <= 12; step++) {
          const angle = (step + idx) * 1.1;
          const radius = 200 + step * 35;
          const tryX = Math.max(
            280,
            Math.min(2520, Math.round(x + Math.cos(angle) * radius))
          );
          const tryY = Math.max(
            240,
            Math.min(1600, Math.round(y + Math.sin(angle) * radius))
          );
          if (isClear(tryX, tryY)) {
            x = tryX;
            y = tryY;
            break;
          }
        }
      }
    }

    occupied.push({ x, y });
    if (x === neighbor.worldX && y === neighbor.worldY) {
      return neighbor;
    }
    return {
      ...neighbor,
      worldX: x,
      worldY: y,
    };
  });
}

/**
 * Clamp arbitrary map coordinates inside the valid 2800x1850 meadow bounds
 * (matching Firestore worldX: 240..2560 and worldY: 200..1650).
 */
export function clampWorldCoords(x: number, y: number): { x: number; y: number } {
  const safeX = Number.isFinite(x) ? Math.round(x) : 1400;
  const safeY = Number.isFinite(y) ? Math.round(y) : 920;
  return {
    x: Math.max(280, Math.min(2520, safeX)),
    y: Math.max(220, Math.min(1620, safeY)),
  };
}

/**
 * Resolves display coordinates for World Groups while respecting leader-relocated positions.
 * Only nudges a group if it sits directly on top of another group or main campus (< 95px).
 */
export function resolveGroupWorldPositions<
  T extends { id: string; worldX: number; worldY: number }
>(
  groups: T[],
  pinnedOverrideByGroupId?: Record<string, { x: number; y: number }>
): T[] {
  const MIN_CAMPUS_DIST = 95;
  const occupied: Array<{ x: number; y: number }> = [
    { x: 1920, y: 520 }, // University
    { x: 820, y: 710 }, // School
  ];

  const isTooClose = (x: number, y: number) =>
    occupied.some((pt) => Math.hypot(pt.x - x, pt.y - y) < MIN_CAMPUS_DIST);

  return groups.map((grp, idx) => {
    const override = pinnedOverrideByGroupId?.[grp.id];
    const clamped = clampWorldCoords(
      override ? override.x : grp.worldX,
      override ? override.y : grp.worldY
    );
    let x = clamped.x;
    let y = clamped.y;

    if (!override && isTooClose(x, y)) {
      for (let step = 1; step <= 10; step++) {
        const angle = (step + idx) * 1.1;
        const radius = 115 + step * 25;
        const candidate = clampWorldCoords(
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius
        );
        if (!isTooClose(candidate.x, candidate.y)) {
          x = candidate.x;
          y = candidate.y;
          break;
        }
      }
    }

    occupied.push({ x, y });
    if (x === grp.worldX && y === grp.worldY) {
      return grp;
    }
    return {
      ...grp,
      worldX: x,
      worldY: y,
    };
  });
}

