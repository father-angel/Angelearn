import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TreeData, GardenDecoration, AvatarGender, AvatarConfig } from '../types/game';
import { HAND_PAINTED_25D_TOKENS } from '../theme/handPainted25DTokens';
import { CharacterAvatar } from './CharacterAvatar';

interface CompanionGardenersLayerProps {
  trees: TreeData[];
  decorations?: GardenDecoration[];
  gender?: AvatarGender;
  avatarConfig?: AvatarConfig;
}

type GardenerAction = 'walking' | 'watering' | 'tending' | 'filling' | 'inspecting';

interface GridCell {
  col: number;
  row: number;
}

interface PatrolStop {
  tile: GridCell;
  standPos: { x: number; y: number };
  action: GardenerAction;
  durationMs: number;
}

const GRID_SIZE = HAND_PAINTED_25D_TOKENS.isometric.gardenGridSize;
const TILE_HALF_W = HAND_PAINTED_25D_TOKENS.isometric.gardenTileHalfWidth;
const TILE_HALF_H = HAND_PAINTED_25D_TOKENS.isometric.gardenTileHalfHeight;
const GRID_TOP_X = HAND_PAINTED_25D_TOKENS.isometric.gardenOriginTop.x;
const GRID_TOP_Y = HAND_PAINTED_25D_TOKENS.isometric.gardenOriginTop.y;

function getTileIsoCenter(col: number, row: number): { x: number; y: number } {
  const x = GRID_TOP_X + (col - row) * TILE_HALF_W;
  const y = GRID_TOP_Y + (col + row + 1) * TILE_HALF_H;
  return { x, y };
}

/**
 * Exact isometric depth Z-index matching Garden2DView's tile scale,
 * ensuring the player's avatar is layered above ground decorations while sorting naturally with trees.
 */
function getGardenerDepthZIndex(footY: number): number {
  const colPlusRow = (footY - (GRID_TOP_Y + TILE_HALF_H)) / TILE_HALF_H;
  return Math.min(42, Math.max(28, Math.round(28 + colPlusRow)));
}

/**
 * BFS pathfinder on the 5x5 isometric grid that routes around tiles occupied by decorations or trees.
 */
function findWalkableTilePath(
  start: GridCell,
  goal: GridCell,
  blockedSet: Set<string>
): GridCell[] {
  const key = (c: number, r: number) => `${c},${r}`;
  if (start.col === goal.col && start.row === goal.row) return [start];

  const queue: GridCell[][] = [[start]];
  const visited = new Set<string>([key(start.col, start.row)]);

  const cardinalDirs = [
    { dc: 1, dr: 0 },
    { dc: -1, dr: 0 },
    { dc: 0, dr: 1 },
    { dc: 0, dr: -1 },
  ];
  const diagDirs = [
    { dc: 1, dr: 1 },
    { dc: 1, dr: -1 },
    { dc: -1, dr: 1 },
    { dc: -1, dr: -1 },
  ];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const curr = path[path.length - 1];

    if (curr.col === goal.col && curr.row === goal.row) {
      return path;
    }

    for (const { dc, dr } of cardinalDirs) {
      const nc = curr.col + dc;
      const nr = curr.row + dr;
      const k = key(nc, nr);
      if (
        nc >= 0 &&
        nc < GRID_SIZE &&
        nr >= 0 &&
        nr < GRID_SIZE &&
        !visited.has(k) &&
        (!blockedSet.has(k) || (nc === goal.col && nr === goal.row))
      ) {
        visited.add(k);
        queue.push([...path, { col: nc, row: nr }]);
      }
    }

    for (const { dc, dr } of diagDirs) {
      const nc = curr.col + dc;
      const nr = curr.row + dr;
      const k = key(nc, nr);
      const side1Blocked = blockedSet.has(key(curr.col + dc, curr.row));
      const side2Blocked = blockedSet.has(key(curr.col, curr.row + dr));
      if (
        nc >= 0 &&
        nc < GRID_SIZE &&
        nr >= 0 &&
        nr < GRID_SIZE &&
        !visited.has(k) &&
        !side1Blocked &&
        !side2Blocked &&
        (!blockedSet.has(k) || (nc === goal.col && nr === goal.row))
      ) {
        visited.add(k);
        queue.push([...path, { col: nc, row: nr }]);
      }
    }
  }

  return [start, goal];
}

/**
 * Find the best empty walkable tile adjacent to a target tree/decoration tile.
 */
function findBestAdjacentWalkableTile(
  targetCol: number,
  targetRow: number,
  blockedSet: Set<string>
): { tile: GridCell; standPos: { x: number; y: number } } {
  const candidates: Array<{ dc: number; dr: number }> = [
    { dc: 0, dr: 1 }, // South-Left
    { dc: 1, dr: 0 }, // South-Right
    { dc: -1, dr: 0 }, // North-Left
    { dc: 0, dr: -1 }, // North-Right
  ];

  const targetCenter = getTileIsoCenter(targetCol, targetRow);

  for (const { dc, dr } of candidates) {
    const nc = targetCol + dc;
    const nr = targetRow + dr;
    if (
      nc >= 0 &&
      nc < GRID_SIZE &&
      nr >= 0 &&
      nr < GRID_SIZE &&
      !blockedSet.has(`${nc},${nr}`)
    ) {
      const neighborCenter = getTileIsoCenter(nc, nr);
      const standX = neighborCenter.x * 0.88 + targetCenter.x * 0.12;
      const standY = neighborCenter.y * 0.88 + targetCenter.y * 0.12 + 4;
      return {
        tile: { col: nc, row: nr },
        standPos: { x: Math.round(standX), y: Math.round(standY) },
      };
    }
  }

  return {
    tile: { col: targetCol, row: targetRow },
    standPos: { x: targetCenter.x - 32, y: targetCenter.y + 22 },
  };
}

/**
 * Autonomous Player Avatar Agent that walks around the 5x5 garden using the user's exact
 * full-body custom avatar without any name or text labels.
 */
const PlayerGardenAvatarAgent: React.FC<{
  gender: AvatarGender;
  avatarConfig?: AvatarConfig;
  stops: PatrolStop[];
  blockedSet: Set<string>;
  walkSpeedPxPerSec: number;
}> = React.memo(({ gender, avatarConfig, stops, blockedSet, walkSpeedPxPerSec }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isWalking, setIsWalking] = useState<boolean>(false);

  useEffect(() => {
    if (stops.length === 0) return;

    let stopIdx = 0;
    let phase: 'working' | 'walking' = 'working';
    let phaseTimerId: number | null = null;
    let rafId: number | null = null;
    let lastZIndex = -1;
    let isDisposed = false;

    const applyDomPos = (x: number, y: number) => {
      const el = containerRef.current;
      if (!el) return;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate3d(-50%, -88%, 0)`;
      const nextZ = getGardenerDepthZIndex(y);
      if (nextZ !== lastZIndex) {
        lastZIndex = nextZ;
        el.style.zIndex = `${nextZ}`;
      }
    };

    const firstPos = stops[0].standPos;
    applyDomPos(firstPos.x, firstPos.y);

    const startStandingAtStop = (idx: number) => {
      if (isDisposed) return;
      phase = 'working';
      const currentStop = stops[idx % stops.length];
      applyDomPos(currentStop.standPos.x, currentStop.standPos.y);
      setIsWalking((prev) => (prev ? false : prev));

      phaseTimerId = window.setTimeout(() => {
        startWalkingToNextStop(idx);
      }, currentStop.durationMs);
    };

    const startWalkingToNextStop = (fromIdx: number) => {
      if (isDisposed) return;
      phase = 'walking';
      const fromStop = stops[fromIdx % stops.length];
      const toIdx = (fromIdx + 1) % stops.length;
      const toStop = stops[toIdx];

      const tilePath = findWalkableTilePath(fromStop.tile, toStop.tile, blockedSet);

      const pixelPoints: Array<{ x: number; y: number }> = [fromStop.standPos];
      for (let i = 1; i < tilePath.length - 1; i++) {
        pixelPoints.push(getTileIsoCenter(tilePath[i].col, tilePath[i].row));
      }
      pixelPoints.push(toStop.standPos);

      const segments: Array<{
        x0: number;
        y0: number;
        x1: number;
        y1: number;
        dist: number;
      }> = [];
      for (let i = 0; i < pixelPoints.length - 1; i++) {
        const p0 = pixelPoints[i];
        const p1 = pixelPoints[i + 1];
        const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        if (dist > 2) {
          segments.push({ x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, dist });
        }
      }

      if (segments.length === 0) {
        stopIdx = toIdx;
        startStandingAtStop(stopIdx);
        return;
      }

      let currentSegIdx = 0;
      let segElapsedSec = 0;
      let lastTime = performance.now();

      setIsWalking((prev) => (prev ? prev : true));

      const stepFrame = (now: number) => {
        if (isDisposed || phase !== 'walking') return;
        if (document.hidden) {
          lastTime = now;
          rafId = requestAnimationFrame(stepFrame);
          return;
        }
        const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
        lastTime = now;

        const seg = segments[currentSegIdx];
        const segDurationSec = Math.max(0.25, seg.dist / walkSpeedPxPerSec);
        segElapsedSec += dt;

        if (segElapsedSec >= segDurationSec) {
          currentSegIdx++;
          segElapsedSec = 0;
          if (currentSegIdx >= segments.length) {
            stopIdx = toIdx;
            startStandingAtStop(stopIdx);
            return;
          }
        }

        const activeSeg = segments[currentSegIdx];
        const activeDur = Math.max(0.25, activeSeg.dist / walkSpeedPxPerSec);
        const t = Math.min(1, Math.max(0, segElapsedSec / activeDur));
        const curX = activeSeg.x0 + (activeSeg.x1 - activeSeg.x0) * t;
        const curY = activeSeg.y0 + (activeSeg.y1 - activeSeg.y0) * t;

        applyDomPos(curX, curY);

        rafId = requestAnimationFrame(stepFrame);
      };

      rafId = requestAnimationFrame(stepFrame);
    };

    startStandingAtStop(0);

    return () => {
      isDisposed = true;
      phase = 'working';
      if (phaseTimerId !== null) window.clearTimeout(phaseTimerId);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [stops, blockedSet, walkSpeedPxPerSec]);

  const initX = stops[0]?.standPos.x ?? 450;
  const initY = stops[0]?.standPos.y ?? 345;

  return (
    <div
      ref={containerRef}
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${initX}px, ${initY}px, 0) translate3d(-50%, -88%, 0)`,
        zIndex: getGardenerDepthZIndex(initY),
        willChange: 'transform',
      }}
      className="absolute pointer-events-none select-none"
    >
      <CharacterAvatar
        gender={gender}
        config={avatarConfig}
        variant="full"
        showBackdrop={false}
        isWalking={isWalking}
        size={64}
      />
    </div>
  );
});

export const CompanionGardenersLayer: React.FC<CompanionGardenersLayerProps> = React.memo(({
  trees,
  decorations = [],
  gender = 'girl',
  avatarConfig,
}) => {
  const layoutKey =
    trees.map((t) => `${t.id}:${t.unlocked ? 1 : 0}:${t.position.x},${t.position.y}`).join('|') +
    '#' +
    decorations.map((d) => `${d.id}:${d.x},${d.y}`).join('|');

  const { playerRoute, blockedSet } = useMemo(() => {
    const blocked = new Set<string>();
    for (const t of trees) {
      const col = t.position.x === 0 && t.position.y === 0 ? 1 : t.position.x;
      const row = t.position.x === 0 && t.position.y === 0 ? 1 : t.position.y;
      blocked.add(`${col},${row}`);
    }
    for (const d of decorations) {
      blocked.add(`${d.x},${d.y}`);
    }

    const unlockedTrees = trees.filter((t) => t.unlocked);
    const treeStops: PatrolStop[] = [];

    unlockedTrees.forEach((t, idx) => {
      const col = t.position.x === 0 && t.position.y === 0 ? 1 : t.position.x;
      const row = t.position.x === 0 && t.position.y === 0 ? 1 : t.position.y;
      const spot = findBestAdjacentWalkableTile(col, row, blocked);
      treeStops.push({
        tile: spot.tile,
        standPos: spot.standPos,
        action: idx % 2 === 0 ? 'watering' : 'tending',
        durationMs: 3800,
      });
    });

    const pickEmptyTile = (candidates: GridCell[], fallback: GridCell): GridCell => {
      for (const c of candidates) {
        if (!blocked.has(`${c.col},${c.row}`)) return c;
      }
      return fallback;
    };

    const springTile = pickEmptyTile(
      [
        { col: 2, row: 0 },
        { col: 3, row: 0 },
        { col: 3, row: 1 },
        { col: 2, row: 1 },
      ],
      { col: 2, row: 0 }
    );
    const springStop: PatrolStop = {
      tile: springTile,
      standPos: getTileIsoCenter(springTile.col, springTile.row),
      action: 'filling',
      durationMs: 3400,
    };

    const pavilionTile = pickEmptyTile(
      [
        { col: 1, row: 1 },
        { col: 1, row: 0 },
        { col: 2, row: 1 },
      ],
      { col: 1, row: 1 }
    );
    const pavilionStop: PatrolStop = {
      tile: pavilionTile,
      standPos: getTileIsoCenter(pavilionTile.col, pavilionTile.row),
      action: 'inspecting',
      durationMs: 3200,
    };

    const greenhouseTile = pickEmptyTile(
      [
        { col: 0, row: 2 },
        { col: 1, row: 2 },
        { col: 1, row: 1 },
      ],
      { col: 0, row: 2 }
    );
    const greenhouseStop: PatrolStop = {
      tile: greenhouseTile,
      standPos: getTileIsoCenter(greenhouseTile.col, greenhouseTile.row),
      action: 'tending',
      durationMs: 3400,
    };

    const routeList: PatrolStop[] = [
      pavilionStop,
      ...treeStops.slice(0, Math.ceil(treeStops.length / 2)),
      springStop,
      ...treeStops.slice(Math.ceil(treeStops.length / 2)),
      greenhouseStop,
    ];

    return {
      playerRoute: routeList,
      blockedSet: blocked,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  return (
    <PlayerGardenAvatarAgent
      gender={gender}
      avatarConfig={avatarConfig}
      stops={playerRoute}
      blockedSet={blockedSet}
      walkSpeedPxPerSec={56}
    />
  );
});
