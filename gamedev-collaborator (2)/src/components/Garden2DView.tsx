import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TreeData, GardenDecoration, UserProfile, TreeId } from '../types/game';
import { getTodayDateString, AVAILABLE_DECORATIONS } from '../utils/storage';
import {
  canPurchaseItem,
  getGrowthStage,
  getStageTitle,
  isTreeWithered,
  canCollectSpringToday,
  getMsUntilNextLocalMidnight,
  getTreeCoinStatus,
  SPRING_DAILY_COIN_REWARD,
} from '../game/rules';
import {
  TreeGraphic,
  DormantSeedlingGraphic,
  AmbientForestTree25D,
  AmbientForestDefs,
} from './TreeGraphic';
import {
  GardenDecorationGraphic,
  HandPaintedBush25D,
  HandPaintedRock25D,
  HandPaintedFlowerPatch25D,
  HandPaintedWoodenFenceSection25D,
} from './GardenDecorationGraphic';
import {
  GardenSanctuaryPavilion25D,
  GardenSpringShrine25D,
  GardenGreenhouse25D,
} from './BuildingGraphic25D';
import { HudLayoutCrateIcon } from './HudIcons25D';
import { CompanionGardenersLayer } from './CompanionGardener3D';
import { sound } from '../utils/audio';
import { HAND_PAINTED_25D_TOKENS } from '../theme/handPainted25DTokens';
import {
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  X,
  Plus,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Garden2DViewProps {
  trees: TreeData[];
  decorations: GardenDecoration[];
  profile: UserProfile;
  readOnly?: boolean;
  onSelectTree?: (tree: TreeData) => void;
  onUnlockTree?: (
    treeId: TreeId,
    cost: number,
    targetPos?: { x: number; y: number }
  ) => void;
  onBuyDecoration?: (
    deco: Omit<GardenDecoration, 'id' | 'x' | 'y'>,
    targetPos?: { x: number; y: number }
  ) => void;
  onOpenShop?: () => void;
  onSaveDecorations?: (decos: GardenDecoration[]) => void;
  onSaveTrees?: (trees: TreeData[]) => void;
  onShareGarden?: () => void;
  onCollectSpringWater?: () => void;
  onHarvestTreeCoins?: (treeId: TreeId) => void;
}

const GRID_SIZE = HAND_PAINTED_25D_TOKENS.isometric.gardenGridSize;
const TILE_HALF_W = HAND_PAINTED_25D_TOKENS.isometric.gardenTileHalfWidth;
const TILE_HALF_H = HAND_PAINTED_25D_TOKENS.isometric.gardenTileHalfHeight;
const GRID_TOP_X = HAND_PAINTED_25D_TOKENS.isometric.gardenOriginTop.x;
const GRID_TOP_Y = HAND_PAINTED_25D_TOKENS.isometric.gardenOriginTop.y;

// Exact 2.5D isometric screen coordinates on the 900x720 stage for any (col, row) tile in 0..4
// Top diamond corner: (450, 135), Right corner: (870, 345), Bottom corner: (450, 555), Left corner: (30, 345)
function getTileIsoCenter(col: number, row: number): { x: number; y: number } {
  const x = GRID_TOP_X + (col - row) * TILE_HALF_W;
  const y = GRID_TOP_Y + (col + row + 1) * TILE_HALF_H;
  return { x, y };
}

function getTilePolygonPoints(col: number, row: number, inset: number = 0): string {
  const w = TILE_HALF_W - inset * 2;
  const h = TILE_HALF_H - inset;
  const cx = GRID_TOP_X + (col - row) * TILE_HALF_W;
  const cy = GRID_TOP_Y + (col + row + 1) * TILE_HALF_H;
  return `${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`;
}

// Helper to interpolate points along an isometric edge for continuous perimeter hedges & pillars
function lerpPoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number
): { x: number; y: number } {
  return {
    x: x1 + (x2 - x1) * t,
    y: y1 + (y2 - y1) * t,
  };
}

// Memoized freeze wrapper for purely static 2.5D terrain SVG layers (skips reconciling 1000+ static SVG nodes on state changes)
const StaticTerrainFreeze = React.memo<{ children: React.ReactNode }>(
  ({ children }) => <>{children}</>,
  () => true
);

function formatCompactDurationFa(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours.toLocaleString('fa-IR')}س ${minutes.toLocaleString('fa-IR')}د`;
  }
  if (hours > 0) {
    return `${hours.toLocaleString('fa-IR')} ساعت`;
  }
  return `${minutes.toLocaleString('fa-IR')} دقیقه`;
}

// Self-contained Spring Shrine node so daily reset countdown ticks never re-render the 36-tile garden
const GardenSpringShrineNode = React.memo<{
  readOnly: boolean;
  lastCollectedDate?: string;
  floatingText?: string | null;
  onCollect?: () => void;
}>(({ readOnly, lastCollectedDate, floatingText, onCollect }) => {
  const [tickNow, setTickNow] = useState<number>(() => Date.now());
  const currentToday = getTodayDateString(new Date(tickNow));
  const springReady = canCollectSpringToday(lastCollectedDate, currentToday);
  const msUntilMidnight = getMsUntilNextLocalMidnight(new Date(tickNow));

  useEffect(() => {
    if (springReady) return;
    const timer = window.setInterval(() => {
      setTickNow(Date.now());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [springReady]);

  const handleClick = () => {
    if (readOnly || !springReady) return;
    sound.playWater();
    confetti({ particleCount: 45, spread: 50, origin: { y: 0.4 } });
    onCollect?.();
  };

  return (
    <div
      style={{ left: '935px', top: '165px' }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
    >
      {floatingText && (
        <div className="absolute -top-9 z-40 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 text-slate-950 font-black text-xs px-3 py-0.5 rounded-full border-2 border-white shadow-[0_4px_12px_rgba(15,23,42,0.2)] animate-bounce whitespace-nowrap pointer-events-none">
          {floatingText}
        </div>
      )}

      {!readOnly ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={!springReady}
          aria-label={
            springReady
              ? `دریافت ${SPRING_DAILY_COIN_REWARD} سکه روزانه چشمه حیات`
              : `چشمه حیات امروز دریافت شده؛ آماده در ${formatCompactDurationFa(msUntilMidnight)}`
          }
          title={
            springReady
              ? `چشمه حیات: دریافت ${SPRING_DAILY_COIN_REWARD.toLocaleString('fa-IR')} سکه روزانه`
              : `امروز دریافت شد · نوبت بعدی تا ${formatCompactDurationFa(msUntilMidnight)} دیگر`
          }
          className={`flex flex-col items-center focus:outline-none ${
            springReady ? 'cursor-pointer group' : 'cursor-default opacity-95'
          }`}
        >
          {springReady ? (
            <div className="mb-1 animate-float bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-md border border-white flex items-center gap-1 whitespace-nowrap">
              <span>🪙</span>
              <span>دریافت (+۲۰ سکه)</span>
            </div>
          ) : (
            <div className="mb-1 bg-[#0a1d17]/95 text-sky-100 font-bold text-[9px] px-2.5 py-0.5 rounded-full border border-sky-300/60 shadow-sm whitespace-nowrap">
              ✓ امروز دریافت شد · ⏳ {formatCompactDurationFa(msUntilMidnight)}
            </div>
          )}
          <GardenSpringShrine25D className="w-24 h-18 group-hover:scale-105 transition-transform" />
          <span className="text-[10px] font-black text-sky-100 bg-[#0a1d17]/95 px-2 py-0.5 rounded-md border border-sky-300/60 shadow-sm whitespace-nowrap">
            چشمه آب حیات
          </span>
        </button>
      ) : (
        <div className="flex flex-col items-center cursor-default">
          <GardenSpringShrine25D className="w-24 h-18" />
          <span className="text-[10px] font-black text-sky-100 bg-[#0a1d17]/95 px-2 py-0.5 rounded-md border border-sky-300/60 shadow-sm whitespace-nowrap">
            چشمه آب حیات
          </span>
        </div>
      )}
    </div>
  );
});

// Precomputed ornate perimeter hedge tufts & golden fence posts along all 4 sides of the 6x6 garden
// Outer rim vertices: Top (540, 98), Right (1088, 372), Bottom (540, 646), Left (-8, 372)
const GARDEN_BACK_PERIMETER_NODES: Array<{ x: number; y: number; isPost: boolean; c: string }> = [];
const GARDEN_FRONT_PERIMETER_NODES: Array<{ x: number; y: number; isPost: boolean; c: string }> = [];
(() => {
  const colors = ['#f472b6', '#fde047', '#38bdf8', '#a78bfa'];
  for (let i = 1; i <= 18; i++) {
    const t = i / 19;
    if (t <= 0.91) {
      const pt = lerpPoint(-8, 372, 540, 98, t);
      GARDEN_BACK_PERIMETER_NODES.push({ x: pt.x, y: pt.y, isPost: i % 3 === 0, c: colors[i % colors.length] });
    }
  }
  for (let i = 1; i <= 18; i++) {
    const t = i / 19;
    if (t >= 0.09) {
      const pt = lerpPoint(540, 98, 1088, 372, t);
      GARDEN_BACK_PERIMETER_NODES.push({ x: pt.x, y: pt.y, isPost: i % 3 === 0, c: colors[(i + 1) % colors.length] });
    }
  }
  for (let i = 1; i <= 18; i++) {
    const t = i / 19;
    if (t <= 0.89) {
      const pt = lerpPoint(-8, 372, 540, 646, t);
      GARDEN_FRONT_PERIMETER_NODES.push({ x: pt.x, y: pt.y, isPost: i % 3 === 0, c: colors[(i + 2) % colors.length] });
    }
  }
  for (let i = 1; i <= 18; i++) {
    const t = i / 19;
    if (t <= 0.89) {
      const pt = lerpPoint(1088, 372, 540, 646, t);
      GARDEN_FRONT_PERIMETER_NODES.push({ x: pt.x, y: pt.y, isPost: i % 3 === 0, c: colors[(i + 3) % colors.length] });
    }
  }
})();

export const Garden2DView: React.FC<Garden2DViewProps> = ({
  trees,
  decorations,
  profile,
  readOnly = false,
  onSelectTree,
  onUnlockTree,
  onBuyDecoration,
  onOpenShop,
  onSaveDecorations,
  onSaveTrees,
  onCollectSpringWater,
  onHarvestTreeCoins,
}) => {
  const today = getTodayDateString();
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (readOnly) return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [readOnly]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isBuildMode, setIsBuildMode] = useState(false);
  const [selectedBuildPlot, setSelectedBuildPlot] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [buildModalTab, setBuildModalTab] = useState<'trees' | 'decorations'>(
    'trees'
  );
  const [pendingUnlockTree, setPendingUnlockTree] = useState<TreeData | null>(null);
  const [selectedItemToMove, setSelectedItemToMove] = useState<{
    kind: 'tree' | 'deco';
    id: string;
  } | null>(null);

  const [floatingReward, setFloatingReward] = useState<{
    treeId: string;
    text: string;
  } | null>(null);

  // Visual feedback states for selecting, watering, and reaching growth milestones
  const [selectedTreePulseId, setSelectedTreePulseId] = useState<string | null>(null);
  const [wateringEffectTreeId, setWateringEffectTreeId] = useState<string | null>(null);
  const [milestoneEffect, setMilestoneEffect] = useState<{
    treeId: string;
    stageTitle: string;
    stageNum: number;
  } | null>(null);
  const prevTreesSnapshotRef = useRef<
    Record<string, { wateredDaysCount: number; stage: number }>
  >({});

  useEffect(() => {
    if (readOnly) return;
    const prevMap = prevTreesSnapshotRef.current;
    const hasPrev = Object.keys(prevMap).length > 0;

    if (hasPrev) {
      for (const t of trees) {
        const prev = prevMap[t.id];
        const currentStage = getGrowthStage(t.wateredDaysCount);
        if (prev && t.wateredDaysCount > prev.wateredDaysCount) {
          setWateringEffectTreeId(t.id);
          setFloatingReward({
            treeId: t.id,
            text: '💧 آبیاری انجام شد (+۵ سکه)',
          });
          setTimeout(() => setWateringEffectTreeId(null), 2600);
          setTimeout(() => setFloatingReward(null), 2400);

          if (currentStage > prev.stage) {
            setMilestoneEffect({
              treeId: t.id,
              stageTitle: getStageTitle(currentStage),
              stageNum: currentStage + 1,
            });
            setTimeout(() => setMilestoneEffect(null), 3600);
          }
        }
      }
    }

    const nextMap: Record<string, { wateredDaysCount: number; stage: number }> = {};
    for (const t of trees) {
      nextMap[t.id] = {
        wateredDaysCount: t.wateredDaysCount,
        stage: getGrowthStage(t.wateredDaysCount),
      };
    }
    prevTreesSnapshotRef.current = nextMap;
  }, [trees]);

  // Interactive Angled 2.5D Camera, Pan & Pinch-Zoom State
  const getResponsiveDefaultZoom = () => {
    if (typeof window === 'undefined') return 0.9;
    if (window.innerWidth < 350) return 0.44;
    if (window.innerWidth < 480) return 0.52;
    if (window.innerWidth < 768) return 0.72;
    return 0.9;
  };

  const [zoom, setZoom] = useState<number>(getResponsiveDefaultZoom);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 8 });
  const [cameraAngle, setCameraAngle] = useState<'isometric' | 'elevated' | 'angled'>(
    'isometric'
  );

  // High-frequency GPU-composited camera refs (zero React re-renders during drag/pinch/wheel)
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 8 });
  const zoomRef = useRef<number>(zoom);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 8 });
  const hasMovedRef = useRef<boolean>(false);
  const pinchDistanceRef = useRef<number | null>(null);
  const pinchInitialZoomRef = useRef<number>(zoom);
  const rafIdRef = useRef<number | null>(null);
  const wheelSyncTimerRef = useRef<number | null>(null);

  const scheduleStageTransform = () => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const el = stageWrapperRef.current;
      if (!el) return;
      const { x, y } = panRef.current;
      const z = zoomRef.current;
      el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${z})`;
    });
  };

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (wheelSyncTimerRef.current !== null) window.clearTimeout(wheelSyncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const nextZoom = getResponsiveDefaultZoom();
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
      scheduleStageTransform();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setGrabbingCursor = (grabbing: boolean) => {
    const vp = viewportRef.current;
    if (!vp) return;
    if (grabbing) {
      vp.classList.remove('cursor-grab');
      vp.classList.add('cursor-grabbing');
    } else {
      vp.classList.remove('cursor-grabbing');
      vp.classList.add('cursor-grab');
    }
  };

  // Desktop & Single-Finger Pointer Panning (RAF DOM transform, zero re-render per frame)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    hasMovedRef.current = false;
    if ((e.target as HTMLElement).closest('button')) return;
    if (pinchDistanceRef.current !== null) return;
    isDraggingRef.current = true;
    if (stageWrapperRef.current) {
      stageWrapperRef.current.style.transition = 'none';
    }
    setGrabbingCursor(true);
    panStartRef.current = { ...panRef.current };
    dragStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || pinchDistanceRef.current !== null) return;
    const nextX = Math.max(-620, Math.min(620, e.clientX - dragStartRef.current.x));
    const nextY = Math.max(-440, Math.min(440, e.clientY - dragStartRef.current.y));
    if (
      !hasMovedRef.current &&
      (Math.abs(nextX - panStartRef.current.x) > 6 || Math.abs(nextY - panStartRef.current.y) > 6)
    ) {
      hasMovedRef.current = true;
    }
    panRef.current = { x: nextX, y: nextY };
    scheduleStageTransform();
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (stageWrapperRef.current) {
      stageWrapperRef.current.style.transition = '';
    }
    setGrabbingCursor(false);
    if (hasMovedRef.current) {
      setPan({ ...panRef.current });
    }
  };

  // Mobile Two-Finger Pinch-to-Zoom Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      isDraggingRef.current = false;
      setGrabbingCursor(false);
      if (stageWrapperRef.current) {
        stageWrapperRef.current.style.transition = 'none';
      }
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistanceRef.current = Math.hypot(dx, dy);
      pinchInitialZoomRef.current = zoomRef.current;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (pinchDistanceRef.current > 10) {
        const scaleFactor = dist / pinchDistanceRef.current;
        const nextZoom = Math.min(
          1.45,
          Math.max(0.45, Number((pinchInitialZoomRef.current * scaleFactor).toFixed(2)))
        );
        zoomRef.current = nextZoom;
        scheduleStageTransform();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2 && pinchDistanceRef.current !== null) {
      pinchDistanceRef.current = null;
      if (stageWrapperRef.current) {
        stageWrapperRef.current.style.transition = '';
      }
      setZoom(zoomRef.current);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const nextZoom = Math.min(1.45, Math.max(0.45, Number((zoomRef.current + delta).toFixed(2))));
    zoomRef.current = nextZoom;
    scheduleStageTransform();
    if (wheelSyncTimerRef.current !== null) window.clearTimeout(wheelSyncTimerRef.current);
    wheelSyncTimerRef.current = window.setTimeout(() => {
      setZoom(zoomRef.current);
    }, 90);
  };

  const handleZoomIn = () => {
    sound.playClick();
    const nextZoom = Math.min(1.45, Number((zoomRef.current + 0.12).toFixed(2)));
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    scheduleStageTransform();
  };

  const handleZoomOut = () => {
    sound.playClick();
    const nextZoom = Math.max(0.45, Number((zoomRef.current - 0.12).toFixed(2)));
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    scheduleStageTransform();
  };

  const handleResetCamera = () => {
    sound.playClick();
    const nextZoom = getResponsiveDefaultZoom();
    zoomRef.current = nextZoom;
    panRef.current = { x: 0, y: 8 };
    setZoom(nextZoom);
    setPan({ x: 0, y: 8 });
    setCameraAngle('isometric');
    scheduleStageTransform();
  };

  const handleCycleCameraAngle = () => {
    sound.playClick();
    setCameraAngle((prev) =>
      prev === 'isometric' ? 'elevated' : prev === 'elevated' ? 'angled' : 'isometric'
    );
  };

  const handleCollectSpring = useCallback(() => {
    setFloatingReward({
      treeId: 'spring',
      text: `+${SPRING_DAILY_COIN_REWARD.toLocaleString('fa-IR')} سکه طلا 🪙`,
    });
    setTimeout(() => setFloatingReward(null), 2400);
    if (onCollectSpringWater) onCollectSpringWater();
  }, [onCollectSpringWater]);

  const getEffectiveTreePosition = (tree: TreeData) => {
    // Avoid top corner (0,0) so trees never overlap the top Sanctuary Pavilion
    if (tree.position.x === 0 && tree.position.y === 0) {
      return { x: 1, y: 1 };
    }
    return tree.position;
  };

  const { treeByCoord, decoByCoord } = useMemo(() => {
    const tMap = new Map<string, TreeData>();
    for (const t of trees) {
      const pos =
        t.position.x === 0 && t.position.y === 0 ? { x: 1, y: 1 } : t.position;
      tMap.set(`${pos.x},${pos.y}`, t);
    }
    const dMap = new Map<string, GardenDecoration>();
    for (const d of decorations) {
      dMap.set(`${d.x},${d.y}`, d);
    }
    return { treeByCoord: tMap, decoByCoord: dMap };
  }, [trees, decorations]);

  const handleCellClick = (x: number, y: number) => {
    if (readOnly || hasMovedRef.current) return;
    const treeAtCell = trees.find((t) => {
      const pos = getEffectiveTreePosition(t);
      return pos.x === x && pos.y === y;
    });
    const decoAtCell = decorations.find((d) => d.x === x && d.y === y);

    if (isEditMode) {
      if (selectedItemToMove) {
        if (!treeAtCell && !decoAtCell) {
          sound.playClick();
          if (selectedItemToMove.kind === 'deco' && onSaveDecorations) {
            const updated = decorations.map((d) =>
              d.id === selectedItemToMove.id ? { ...d, x, y } : d
            );
            onSaveDecorations(updated);
          } else if (selectedItemToMove.kind === 'tree' && onSaveTrees) {
            const updatedTrees = trees.map((t) =>
              t.id === selectedItemToMove.id ? { ...t, position: { x, y } } : t
            );
            onSaveTrees(updatedTrees);
          }
          setSelectedItemToMove(null);
        } else if (
          selectedItemToMove.kind === 'tree' &&
          treeAtCell &&
          treeAtCell.id !== selectedItemToMove.id &&
          onSaveTrees
        ) {
          // Swap positions between the selected tree and the clicked tree
          sound.playClick();
          const sourceTree = trees.find((t) => t.id === selectedItemToMove.id);
          if (sourceTree) {
            const srcPos = getEffectiveTreePosition(sourceTree);
            const updatedTrees = trees.map((t) => {
              if (t.id === sourceTree.id) return { ...t, position: { x, y } };
              if (t.id === treeAtCell.id) return { ...t, position: { x: srcPos.x, y: srcPos.y } };
              return t;
            });
            onSaveTrees(updatedTrees);
          }
          setSelectedItemToMove(null);
        } else {
          if (decoAtCell) {
            setSelectedItemToMove({ kind: 'deco', id: decoAtCell.id });
          } else if (treeAtCell) {
            setSelectedItemToMove({ kind: 'tree', id: treeAtCell.id });
          }
        }
      } else {
        if (decoAtCell) {
          sound.playClick();
          setSelectedItemToMove({ kind: 'deco', id: decoAtCell.id });
        } else if (treeAtCell) {
          sound.playClick();
          setSelectedItemToMove({ kind: 'tree', id: treeAtCell.id });
        }
      }
      return;
    }

    if (treeAtCell) {
      if (treeAtCell.unlocked) {
        sound.playWater();
        setSelectedTreePulseId(treeAtCell.id);
        setTimeout(() => setSelectedTreePulseId(null), 900);
        setFloatingReward({ treeId: treeAtCell.id, text: 'شروع تمرین رشد ✨' });
        setTimeout(() => setFloatingReward(null), 1600);
        onSelectTree?.(treeAtCell);
      } else {
        sound.playClick();
        if (onUnlockTree) {
          setPendingUnlockTree(treeAtCell);
        } else {
          onOpenShop?.();
        }
      }
      return;
    }

    // Empty Plot Clicked -> Open Tile-by-Tile Garden Plot Builder (`ساخت و کاشت در این قطعه باغ`)
    if (!treeAtCell && !decoAtCell) {
      sound.playClick();
      const hasLockedTrees = trees.some((t) => !t.unlocked);
      setBuildModalTab(hasLockedTrees ? 'trees' : 'decorations');
      setSelectedBuildPlot({ x, y });
    }
  };

  // Consistent Angled 2.5D Camera Projection Presets (Never Flat Top-Down)
  const stageTransformStyle =
    cameraAngle === 'elevated'
      ? 'scaleY(1.06) rotate(-1.5deg)'
      : cameraAngle === 'angled'
      ? 'rotate(-4.5deg) scaleY(0.93) skewX(-2deg)'
      : 'scaleY(0.97)';

  const cameraAngleLabel =
    cameraAngle === 'isometric'
      ? '۲.۵ بعدی کلاسیک'
      : cameraAngle === 'elevated'
      ? '۲.۵ بعدی مرتفع'
      : '۲.۵ بعدی مورب';

  const backPerimeterNodes = GARDEN_BACK_PERIMETER_NODES;
  const frontPerimeterNodes = GARDEN_FRONT_PERIMETER_NODES;

  return (
    <div
      ref={viewportRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="relative w-full h-screen overflow-hidden select-none cursor-grab"
      style={{
        background:
          'radial-gradient(ellipse at 42% 35%, #2d7a53 0%, #236443 38%, #1a4d34 72%, #123826 100%)',
        touchAction: 'none',
      }}
    >
      {/* Soothing Botanical Vignette Overlay (Reduces screen glare, deepens figure-ground contrast) */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background:
            'radial-gradient(circle at 45% 40%, rgba(45, 122, 83, 0.05) 0%, rgba(18, 56, 38, 0.18) 58%, rgba(6, 20, 15, 0.36) 100%)',
        }}
      />

      {/* =========================================================================
          RIGHT EDGE FLOATING GARDEN TOOLS (Build Plot-by-Plot + Layout)
         ========================================================================= */}
      {!readOnly && (
        <div className="fixed top-[110px] sm:top-[132px] right-1.5 sm:right-3.5 z-30 flex flex-col gap-1.5 sm:gap-2 pointer-events-auto">
          <button
            onClick={() => {
              sound.playClick();
              setIsBuildMode(!isBuildMode);
              setIsEditMode(false);
              setSelectedItemToMove(null);
            }}
            aria-label="ساخت در باغ"
            className={`group min-w-[44px] min-h-[44px] w-11 h-11 sm:w-13 sm:h-13 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer active:translate-y-[2px] ${
              isBuildMode
                ? 'bg-gradient-to-b from-[#d9f99d] via-[#bef264] to-[#84cc16] text-slate-950 border-white shadow-[0_3px_0_#365314,0_8px_16px_rgba(4,24,16,0.45)] scale-105'
                : 'bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 hover:brightness-110 text-lime-200 border-[#a3e635]/90 shadow-[0_3px_0_#14532d,0_6px_12px_rgba(4,24,16,0.4)]'
            }`}
            title="ساخت و کاشت قطعه به قطعه در باغ"
          >
            {isBuildMode ? (
              <Check className="w-4 h-4 stroke-[3]" />
            ) : (
              <Plus className="w-5 h-5 stroke-[2.8] group-hover:scale-110 transition-transform" />
            )}
            <span className="text-[8px] font-black mt-0.5 leading-none">
              {isBuildMode ? 'اتمام' : 'ساخت باغ'}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setIsEditMode(!isEditMode);
              setIsBuildMode(false);
              setSelectedItemToMove(null);
            }}
            aria-label="چیدمان باغ"
            className={`group min-w-[44px] min-h-[44px] w-11 h-11 sm:w-13 sm:h-13 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer active:translate-y-[2px] ${
              isEditMode
                ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-white shadow-[0_3px_0_#78350f,0_8px_16px_rgba(4,24,16,0.45)] scale-105'
                : 'bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 hover:brightness-110 text-amber-200 border-[#f59e0b]/90 shadow-[0_3px_0_#78350f,0_6px_12px_rgba(4,24,16,0.4)]'
            }`}
            title="جابه‌جایی درختان و تزئینات"
          >
            {isEditMode ? (
              <Check className="w-4 h-4 stroke-[3]" />
            ) : (
              <HudLayoutCrateIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-[8px] font-black mt-0.5 leading-none">
              {isEditMode ? 'ثبت' : 'چیدمان'}
            </span>
          </button>
        </div>
      )}

      {/* =========================================================================
          CAMERA & ZOOM CONTROLS (Bottom-Right Edge Pod - Deep Forest Obsidian)
         ========================================================================= */}
      <div className="fixed bottom-20 right-1.5 sm:right-3.5 z-30 flex flex-col gap-1 bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 border-2 border-[#f59e0b]/90 p-1 rounded-2xl shadow-[0_3px_0_#78350f,0_8px_18px_rgba(4,24,16,0.45)] pointer-events-auto">
        <button
          onClick={handleZoomIn}
          aria-label="بزرگ‌نمایی (Zoom In)"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#183b2e] to-[#0f261e] hover:brightness-115 border border-emerald-300/35 text-slate-50 flex items-center justify-center cursor-pointer active:translate-y-[1px] transition-all"
          title="بزرگ‌نمایی (Zoom In)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div
          onClick={handleResetCamera}
          className="text-[9px] font-black text-amber-200 tabular-nums text-center py-0.5 cursor-pointer"
          title="بازنشانی زوم"
        >
          {Math.round(zoom * 100)}%
        </div>

        <button
          onClick={handleZoomOut}
          aria-label="کوچک‌نمایی (Zoom Out)"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#183b2e] to-[#0f261e] hover:brightness-115 border border-emerald-300/35 text-slate-50 flex items-center justify-center cursor-pointer active:translate-y-[1px] transition-all"
          title="کوچک‌نمایی (Zoom Out)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="h-px bg-emerald-300/25 my-0.5" />

        <button
          onClick={handleCycleCameraAngle}
          aria-label="تغییر زاویه دید دوربین"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#183b2e] to-[#0f261e] hover:brightness-115 border border-amber-400/60 text-amber-200 flex items-center justify-center cursor-pointer active:translate-y-[1px] transition-all"
          title={`زاویه دوربین: ${cameraAngleLabel}`}
        >
          <Compass className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetCamera}
          aria-label="مرکز دوربین"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#183b2e] to-[#0f261e] hover:brightness-115 border border-emerald-300/35 text-slate-50 flex items-center justify-center cursor-pointer active:translate-y-[1px] transition-all"
          title="بازگشت به مرکز باغ"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mode Status Banner */}
      {!readOnly && (isEditMode || isBuildMode) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 max-w-[92vw] truncate bg-[#0a1d17]/95 border-2 border-amber-400 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-black text-amber-100 shadow-lg pointer-events-none whitespace-nowrap">
          {isBuildMode
            ? '🌱 حالت ساخت باغ: روی هر قطعه خالی کلیک کنید تا در آن نهال بکارید یا فواره و باغچه بسازید'
            : selectedItemToMove
            ? 'حالا روی یک قطعه خالی یا درخت دیگر کلیک کنید تا جابه‌جا شود'
            : 'روی درخت یا تزئین مورد نظر کلیک کنید تا جابه‌جا شود'}
        </div>
      )}

      {/* =========================================================================
          HAND-PAINTED ISOMETRIC 2.5D FOREST SANCTUARY STAGE (6x6 Enlarged 1080x840)
         ========================================================================= */}
      <div
        ref={stageWrapperRef}
        className="absolute left-1/2 top-1/2 w-[1080px] h-[840px] shrink-0 transition-transform duration-200 ease-out"
        style={{
          transform: `translate3d(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px), 0) scale(${zoom})`,
          transformOrigin: 'center center',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      >
        <div
          className="relative w-full h-full transition-transform duration-300"
          style={{ transform: stageTransformStyle }}
        >
          {/* SVG Hand-Painted 2400x1650 2.5D Terrain, Multi-Tiered 6x6 Plateau, River, Shadows & Natural Ground Details */}
          <StaticTerrainFreeze>
          <svg
            viewBox="-660 -380 2400 1650"
            width="2400"
            height="1650"
            shapeRendering="optimizeSpeed"
            style={{ left: '-660px', top: '-380px' }}
            className="absolute w-[2400px] h-[1650px] pointer-events-none overflow-visible"
          >
            <defs>
              {/* Hand-Painted Gouache Meadow Base Gradient (Calibrated Natural Sage-Moss Grass - Low Glare) */}
              <radialGradient id="meadowGlow" cx="44%" cy="42%" r="58%">
                <stop offset="0%" stopColor="#2d7a53" stopOpacity="1" />
                <stop offset="40%" stopColor="#236443" stopOpacity="0.98" />
                <stop offset="76%" stopColor="#1a4d34" stopOpacity="0.98" />
                <stop offset="100%" stopColor="#123826" stopOpacity="1" />
              </radialGradient>

              {/* Soft Botanical Clearing Halo */}
              <radialGradient id="sunlitClearing" cx="46%" cy="44%" r="44%">
                <stop offset="0%" stopColor="#459d70" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#2d7a53" stopOpacity="0.1" />
                <stop offset="78%" stopColor="#236443" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#1a4d34" stopOpacity="0" />
              </radialGradient>

              {/* Painterly Crystal River Depth Gradient */}
              <linearGradient id="riverStream" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
                <stop offset="35%" stopColor="#0ea5e9" stopOpacity="0.95" />
                <stop offset="75%" stopColor="#0284c7" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.95" />
              </linearGradient>

              {/* Hand-Painted Sanctuary Turf Gradient (Natural Botanical Meadow) */}
              <linearGradient id="sanctuaryPlatform" x1="15%" y1="10%" x2="85%" y2="90%">
                <stop offset="0%" stopColor="#398e62" />
                <stop offset="32%" stopColor="#2d7a53" />
                <stop offset="72%" stopColor="#236443" />
                <stop offset="100%" stopColor="#1a4d34" />
              </linearGradient>

              {/* Even Tile & Odd Tile Gradients for Green Grass Plot Variation */}
              <linearGradient id="paintedTileSunlit" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#459d70" stopOpacity="0.34" />
                <stop offset="55%" stopColor="#2d7a53" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#236443" stopOpacity="0.24" />
              </linearGradient>
              <linearGradient id="paintedTileMoss" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2d7a53" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#236443" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#1a4d34" stopOpacity="0.26" />
              </linearGradient>

              {/* Soft Recessed Soil/Moss Basin Shadow Under Each Tree Plot */}
              <radialGradient id="plotBasinShadow" cx="50%" cy="52%" r="50%">
                <stop offset="0%" stopColor="#062c1e" stopOpacity="0.3" />
                <stop offset="65%" stopColor="#1a4d34" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#2d7a53" stopOpacity="0" />
              </radialGradient>

              {/* Hand-Painted Marble & Limestone Terrace Walkway (Muted Natural Stone) */}
              <linearGradient id="terraceWalkway" x1="10%" y1="5%" x2="90%" y2="95%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="45%" stopColor="#cbd5e1" />
                <stop offset="80%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>

              {/* 2.5D Extruded Stone Masonry Left Face */}
              <linearGradient id="stoneWallLeft" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="35%" stopColor="#94a3b8" />
                <stop offset="80%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              {/* 2.5D Extruded Stone Masonry Right Face */}
              <linearGradient id="stoneWallRight" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="40%" stopColor="#64748b" />
                <stop offset="85%" stopColor="#475569" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* Lower 2.5D Earthen Cliff & Root Foundation Gradients */}
              <linearGradient id="earthCliffLeft" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#9a6b3e" />
                <stop offset="45%" stopColor="#7c522b" />
                <stop offset="100%" stopColor="#5c3a1d" />
              </linearGradient>
              <linearGradient id="earthCliffRight" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7c522b" />
                <stop offset="50%" stopColor="#5c3a1d" />
                <stop offset="100%" stopColor="#3f2611" />
              </linearGradient>

              {/* Subtle Green-Tinted Sunbeam Gradient (Low Glare) */}
              <linearGradient id="goldenSunbeam" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#86efac" stopOpacity="0.08" />
                <stop offset="50%" stopColor="#4ade80" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
              </linearGradient>

              {/* Hand-Painted Brushstroke Grass, Clover & Wildflower Texture Pattern */}
              <pattern
                id="lushGrassPattern"
                width="96"
                height="72"
                patternUnits="userSpaceOnUse"
              >
                {/* Soft Gouache Green Brushstroke Swatches */}
                <ellipse cx="26" cy="20" rx="20" ry="8" fill="#4ade80" opacity="0.16" />
                <ellipse cx="70" cy="52" rx="22" ry="9" fill="#22c55e" opacity="0.18" />
                <ellipse cx="48" cy="36" rx="16" ry="6" fill="#15803d" opacity="0.18" />
                {/* Painted Grass Blade Clusters */}
                <path
                  d="M16,24 q-2,-5 -4,-7 M19,24 q0,-6 1,-8 M22,24 q2,-5 4,-6 M58,54 q-2,-5 -4,-6 M61,54 q1,-6 2,-8 M64,54 q3,-4 4,-6 M40,40 q-2,-4 -3,-6 M43,40 q2,-5 3,-7 M76,18 q-2,-4 -3,-6 M79,18 q2,-4 3,-6"
                  stroke="#86efac"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.45"
                />
                {/* Tiny Painted Clover & Buttercup Dots */}
                <circle cx="30" cy="48" r="1.6" fill="#86efac" opacity="0.45" />
                <circle cx="72" cy="26" r="1.5" fill="#fde047" opacity="0.45" />
                <circle cx="14" cy="58" r="1.5" fill="#4ade80" opacity="0.45" />
                <circle cx="84" cy="60" r="1.4" fill="#f472b6" opacity="0.45" />
              </pattern>

              {/* Instanced Forest Trees & Perimeter Hedge Symbols */}
              <AmbientForestDefs />
              <g id="hp-back-tuft">
                <ellipse cx="3" cy="6" rx="16" ry="8" fill="#16a34a" opacity="0.24" />
                <path
                  d="M -14,3 C -18,-3 -13,-10 -6,-11 C -1,-17 7,-17 11,-10 C 17,-8 19,-1 14,4 C 10,8 -10,8 -14,3 Z"
                  fill="#22c55e"
                />
                <path
                  d="M -12,1 C -15,-4 -10,-10 -4,-10 C 1,-15 8,-14 10,-9 C 14,-7 14,-1 10,2 C 5,5 -8,5 -12,1 Z"
                  fill="#4ade80"
                />
                <path
                  d="M -8,-3 C -10,-7 -6,-11 -1,-11 C 3,-13 7,-11 7,-8 C 5,-5 -5,-2 -8,-3 Z"
                  fill="#bbf7d0"
                  opacity="0.94"
                />
              </g>
              <g id="hp-back-post" transform="translate(0, -14)">
                <rect
                  x="-3.5"
                  y="-4"
                  width="7"
                  height="13"
                  rx="1.5"
                  fill="#b45309"
                  stroke="#451a03"
                  strokeWidth="1"
                />
                <rect x="-2" y="-3" width="2.5" height="11" fill="#f59e0b" />
                <circle
                  cx="0"
                  cy="-6"
                  r="4.5"
                  fill="#fbbf24"
                  stroke="#fef08a"
                  strokeWidth="1.2"
                />
              </g>
              <g id="hp-front-tuft">
                <ellipse cx="3" cy="5" rx="14" ry="7" fill="#16a34a" opacity="0.22" />
                <path
                  d="M -12,2 C -15,-3 -11,-8 -5,-9 C -1,-14 6,-14 9,-8 C 14,-7 16,-1 12,3 C 8,6 -8,6 -12,2 Z"
                  fill="#22c55e"
                />
                <path
                  d="M -10,0 C -12,-4 -8,-8 -3,-8 C 1,-12 6,-11 8,-7 C 11,-5 11,-1 8,1 C 4,4 -6,4 -10,0 Z"
                  fill="#4ade80"
                />
                <path
                  d="M -6,-3 C -8,-6 -5,-9 -1,-9 C 2,-10 5,-9 5,-6 C 4,-4 -4,-1 -6,-3 Z"
                  fill="#bbf7d0"
                  opacity="0.94"
                />
              </g>
              <g id="hp-front-post" transform="translate(0, -10)">
                <rect
                  x="-3"
                  y="-3"
                  width="6"
                  height="10"
                  rx="1.5"
                  fill="#b45309"
                  stroke="#451a03"
                  strokeWidth="1"
                />
                <circle
                  cx="0"
                  cy="-5"
                  r="4"
                  fill="#fbbf24"
                  stroke="#fef08a"
                  strokeWidth="1"
                />
              </g>
            </defs>

            {/* =====================================================================
                1. HAND-PAINTED LAYERED MEADOW HILLS & NATURAL TERRAIN VARIATION
               ===================================================================== */}
            <rect x="-660" y="-380" width="2400" height="1650" fill="url(#meadowGlow)" />

            {/* Rolling Painterly Hill Contours & Green Meadow Banks */}
            <ellipse cx="-260" cy="110" rx="460" ry="260" fill="#15803d" opacity="0.48" />
            <ellipse cx="1340" cy="150" rx="480" ry="280" fill="#166534" opacity="0.48" />
            <ellipse cx="-220" cy="720" rx="500" ry="290" fill="#15803d" opacity="0.48" />
            <ellipse cx="1320" cy="745" rx="520" ry="300" fill="#166534" opacity="0.46" />
            <ellipse cx="540" cy="-150" rx="680" ry="220" fill="#16a34a" opacity="0.48" />
            <ellipse cx="540" cy="940" rx="740" ry="260" fill="#15803d" opacity="0.48" />

            {/* Subtle Green Meadow Ridges (Organic Brushstroke Shapes) */}
            <path
              d="M -180 300 Q 150 110, 540 80 Q 930 110, 1180 310 Q 980 630, 540 760 Q 100 630, -180 300 Z"
              fill="#16a34a"
              opacity="0.42"
            />
            <path
              d="M -80 355 Q 210 150, 540 115 Q 870 150, 1120 360 Q 900 610, 540 715 Q 180 610, -80 355 Z"
              fill="#22c55e"
              opacity="0.38"
            />

            {/* Tiled Hand-Painted Grass & Clover Overlay */}
            <rect x="-660" y="-380" width="2400" height="1650" fill="url(#lushGrassPattern)" />

            {/* Sunlit Inner Meadow Clearing Halo */}
            <ellipse cx="540" cy="375" rx="900" ry="580" fill="url(#sunlitClearing)" />

            {/* =====================================================================
                2. PAINTERLY CRYSTAL RIVER (Outside Eastern Perimeter with Pebbles & Banks)
               ===================================================================== */}
            {/* Soft River Valley Depression Shadow */}
            <path
              d="M 930 -280 Q 1120 -80, 1195 120 Q 1275 260, 1275 380 Q 1275 530, 1175 685 Q 1030 850, 910 1080"
              fill="none"
              stroke="#22c55e"
              strokeWidth="82"
              strokeLinecap="round"
              opacity="0.28"
            />
            {/* Earth & Moss Riverbank */}
            <path
              d="M 930 -280 Q 1120 -80, 1195 120 Q 1275 260, 1275 380 Q 1275 530, 1175 685 Q 1030 850, 910 1080"
              fill="none"
              stroke="#4ade80"
              strokeWidth="68"
              strokeLinecap="round"
              opacity="0.58"
            />
            {/* Sunlit Sandy/Pebble Shoreline */}
            <path
              d="M 930 -280 Q 1120 -80, 1195 120 Q 1275 260, 1275 380 Q 1275 530, 1175 685 Q 1030 850, 910 1080"
              fill="none"
              stroke="#ecfccb"
              strokeWidth="52"
              strokeLinecap="round"
              opacity="0.45"
            />
            {/* Main Hand-Painted Crystal Water Channel */}
            <path
              d="M 930 -280 Q 1120 -80, 1195 120 Q 1275 260, 1275 380 Q 1275 530, 1175 685 Q 1030 850, 910 1080"
              fill="none"
              stroke="url(#riverStream)"
              strokeWidth="42"
              strokeLinecap="round"
            />
            {/* Shallow Turquoise Inner Water Highlight */}
            <path
              d="M 930 -280 Q 1120 -80, 1195 120 Q 1275 260, 1275 380 Q 1275 530, 1175 685 Q 1030 850, 910 1080"
              fill="none"
              stroke="#7dd3fc"
              strokeWidth="18"
              strokeLinecap="round"
              opacity="0.35"
            />
            {/* Sparkling Painterly Water Current Ripples */}
            <path
              d="M 930 -280 Q 1120 -80, 1195 120 Q 1275 260, 1275 380 Q 1275 530, 1175 685 Q 1030 850, 910 1080"
              fill="none"
              stroke="#e0f2fe"
              strokeWidth="3"
              strokeDasharray="16 20"
              strokeLinecap="round"
              opacity="0.7"
            />

            {/* Tributary Streamlet from Spring of Living Water (935, 195) into Main River (1205, 155) */}
            <path
              d="M 935 195 Q 1070 185, 1205 155"
              fill="none"
              stroke="#16a34a"
              strokeWidth="24"
              strokeLinecap="round"
              opacity="0.45"
            />
            <path
              d="M 935 195 Q 1070 185, 1205 155"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="16"
              strokeLinecap="round"
            />
            <path
              d="M 935 195 Q 1070 185, 1205 155"
              fill="none"
              stroke="#e0f2fe"
              strokeWidth="3"
              strokeDasharray="8 10"
              strokeLinecap="round"
            />

            {/* Natural Riverbank Pebbles & Reeds */}
            {[
              { x: 1165, y: 130 },
              { x: 1235, y: 225 },
              { x: 1240, y: 345 },
              { x: 1305, y: 315 },
              { x: 1235, y: 450 },
              { x: 1145, y: 630 },
              { x: 1050, y: 765 },
            ].map((peb, idx) => (
              <g key={`pebble-${idx}`} transform={`translate(${peb.x}, ${peb.y})`}>
                <ellipse cx="0" cy="2" rx="7" ry="4" fill="#64748b" />
                <ellipse cx="-1" cy="1" rx="5" ry="2.5" fill="#94a3b8" />
                <ellipse cx="7" cy="4" rx="4.5" ry="2.5" fill="#475569" />
              </g>
            ))}

            {/* Northern Rocky Waterfall Headwaters */}
            <g transform="translate(1015, -160)">
              <ellipse
                cx="0"
                cy="14"
                rx="52"
                ry="24"
                fill="#0284c7"
                stroke="#7dd3fc"
                strokeWidth="2.5"
              />
              <path
                d="M-42,2 Q-38,-24 -12,-28 Q18,-32 40,-12 Q48,4 32,12 Z"
                fill="#475569"
              />
              <path
                d="M-30,-8 Q-10,-24 20,-18 Q28,-8 22,-2 Z"
                fill="#22c55e"
                opacity="0.85"
              />
              <path
                d="M-10,-14 Q0,2 6,18 M6,-14 Q14,2 18,18"
                stroke="#e0f2fe"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <circle cx="2" cy="18" r="5.5" fill="#e0f2fe" opacity="0.85" />
              <circle cx="15" cy="17" r="4.5" fill="#e0f2fe" opacity="0.8" />
            </g>

            {/* Water Lily Pads, Cattails & Ripples Along the River */}
            {[
              { x: 935, y: -20 },
              { x: 1030, y: 155 },
              { x: 1085, y: 280 },
              { x: 1090, y: 395 },
              { x: 1015, y: 585 },
              { x: 900, y: 735 },
              { x: 805, y: 875 },
            ].map((lily, idx) => (
              <g key={`lily-${idx}`} transform={`translate(${lily.x}, ${lily.y})`}>
                <ellipse
                  cx="0"
                  cy="0"
                  rx="10"
                  ry="6"
                  fill="#16a34a"
                  stroke="#86efac"
                  strokeWidth="1.2"
                />
                {idx % 2 === 0 && <circle cx="1" cy="-1" r="3.5" fill="#f472b6" />}
              </g>
            ))}

            {/* Tranquil South-West Koi & Lotus Pond (برکه نیلوفر و ماهی کوی) */}
            <g transform="translate(85, 590)">
              <ellipse cx="2" cy="8" rx="74" ry="38" fill="#22c55e" opacity="0.24" />
              <ellipse
                cx="0"
                cy="4"
                rx="68"
                ry="34"
                fill="#4ade80"
                stroke="#ecfccb"
                strokeWidth="2"
                opacity="0.92"
              />
              <ellipse
                cx="0"
                cy="2"
                rx="58"
                ry="28"
                fill="url(#riverStream)"
                stroke="#bae6fd"
                strokeWidth="2"
              />
              <circle cx="-48" cy="-10" r="10" fill="#64748b" />
              <circle cx="-38" cy="-16" r="7" fill="#94a3b8" />
              <circle cx="46" cy="14" r="9" fill="#64748b" />
              <ellipse cx="-18" cy="6" rx="9" ry="5" fill="#22c55e" />
              <circle cx="-18" cy="5" r="3.5" fill="#f472b6" />
              <ellipse cx="22" cy="-6" rx="8" ry="4.5" fill="#22c55e" />
              <circle cx="22" cy="-7" r="3" fill="#fef08a" />
              <path d="M-4,-6 Q4,-10 10,-4 Q4,0 -4,-6 Z" fill="#fb923c" />
              <path d="M6,10 Q-2,14 -8,8 Q-2,4 6,10 Z" fill="#f97316" />
            </g>

            {/* =====================================================================
                3. HAND-PAINTED 2.5D STONE PATHWAYS, WOODEN FENCES & FOOTBRIDGE
               ===================================================================== */}
            {/* South Main Royal Cobblestone Avenue (Recessed Bed + Sculpted 2.5D Flagstones) */}
            <path
              d="M 540 650 Q 540 815, 522 1060"
              stroke="#4ade80"
              strokeWidth="54"
              strokeLinecap="round"
              fill="none"
              opacity="0.32"
            />
            <path
              d="M 540 650 Q 540 815, 522 1060"
              stroke="#64748b"
              strokeWidth="44"
              strokeLinecap="round"
              fill="none"
              opacity="0.75"
            />
            {[
              { x: 540, y: 690, rx: 16, ry: 7.5 },
              { x: 536, y: 718, rx: 14, ry: 6.5 },
              { x: 543, y: 748, rx: 16, ry: 7.5 },
              { x: 535, y: 778, rx: 15, ry: 7 },
              { x: 538, y: 810, rx: 16, ry: 7.5 },
              { x: 532, y: 842, rx: 15, ry: 7 },
              { x: 534, y: 876, rx: 16, ry: 7.5 },
              { x: 528, y: 910, rx: 15, ry: 7 },
              { x: 529, y: 944, rx: 16, ry: 7.5 },
              { x: 525, y: 980, rx: 15, ry: 7 },
            ].map((st, idx) => (
              <g key={`south-stone-${idx}`} transform={`translate(${st.x}, ${st.y})`}>
                {/* 2.5D Stone Contact Shadow & Extruded Lip */}
                <ellipse cx="1" cy="3.5" rx={st.rx + 1} ry={st.ry + 1} fill="#0f172a" opacity="0.75" />
                <ellipse cx="0" cy="2" rx={st.rx} ry={st.ry} fill="#64748b" />
                {/* Sunlit Top Limestone Face */}
                <ellipse
                  cx="0"
                  cy="0"
                  rx={st.rx}
                  ry={st.ry}
                  fill={idx % 2 === 0 ? '#e2e8f0' : '#cbd5e1'}
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
                {/* Warm Ochre/Moss Accent */}
                <circle cx={idx % 2 === 0 ? -st.rx + 3 : st.rx - 3} cy="1" r="2.2" fill="#22c55e" opacity="0.85" />
              </g>
            ))}

            {/* West Greenhouse Stepping-Stone Trail */}
            <path
              d="M -14 372 Q -150 435, -320 515"
              stroke="#4ade80"
              strokeWidth="34"
              strokeLinecap="round"
              fill="none"
              opacity="0.28"
            />
            {[0.12, 0.25, 0.38, 0.52, 0.66, 0.8, 0.94].map((t, idx) => {
              const pt = lerpPoint(-14, 372, -300, 505, t);
              return (
                <g key={`west-stone-${idx}`} transform={`translate(${pt.x}, ${pt.y}) rotate(-24)`}>
                  <ellipse cx="1" cy="3" rx="13" ry="6.5" fill="#1e293b" opacity="0.4" />
                  <ellipse cx="0" cy="1.8" rx="12" ry="6" fill="#94a3b8" />
                  <ellipse
                    cx="0"
                    cy="0"
                    rx="12"
                    ry="5.8"
                    fill={idx % 2 === 0 ? '#f8fafc' : '#e2e8f0'}
                    stroke="#cbd5e1"
                    strokeWidth="0.9"
                  />
                </g>
              );
            })}

            {/* East Path from East Gate (1088, 372) Across the Wooden Bridge (1232, 488) */}
            <path
              d="M 1088 372 Q 1165 435, 1355 565"
              stroke="#4ade80"
              strokeWidth="36"
              strokeLinecap="round"
              fill="none"
              opacity="0.28"
            />
            {[0.12, 0.26, 0.4, 0.78, 0.92].map((t, idx) => {
              const pt = lerpPoint(1088, 372, 1345, 558, t);
              return (
                <g key={`east-stone-${idx}`} transform={`translate(${pt.x}, ${pt.y}) rotate(26)`}>
                  <ellipse cx="1" cy="3" rx="13" ry="6.5" fill="#0f172a" opacity="0.7" />
                  <ellipse cx="0" cy="1.8" rx="12" ry="6" fill="#64748b" />
                  <ellipse
                    cx="0"
                    cy="0"
                    rx="12"
                    ry="5.8"
                    fill={idx % 2 === 0 ? '#e2e8f0' : '#cbd5e1'}
                    stroke="#94a3b8"
                    strokeWidth="0.9"
                  />
                </g>
              );
            })}

            {/* Cozy 2.5D Isometric Wooden Split-Rail Fences Framing Paths & Apiary */}
            <HandPaintedWoodenFenceSection25D x1={-48} y1={355} x2={-155} y2={408} />
            <HandPaintedWoodenFenceSection25D x1={-25} y1={408} x2={-130} y2={460} />
            <HandPaintedWoodenFenceSection25D x1={1105} y1={358} x2={1185} y2={422} />
            <HandPaintedWoodenFenceSection25D x1={482} y1={685} x2={476} y2={790} />
            <HandPaintedWoodenFenceSection25D x1={596} y1={685} x2={590} y2={790} />

            {/* 2.5D Isometric Wooden Arched Footbridge Crossing the External Crystal River at (1232, 488) */}
            <g transform="translate(1232, 488) rotate(28)">
              <ellipse cx="3" cy="13" rx="48" ry="23" fill="#064e3b" opacity="0.35" />
              {/* Extruded 2.5D Bridge Timber Side Beam */}
              <rect
                x="-42"
                y="-15"
                width="84"
                height="36"
                rx="7"
                fill="#451a03"
              />
              {/* Sunlit Cedar Bridge Deck */}
              <rect
                x="-42"
                y="-19"
                width="84"
                height="35"
                rx="7"
                fill="#92400e"
                stroke="#fbbf24"
                strokeWidth="2"
              />
              {[-30, -18, -6, 6, 18, 30].map((bx) => (
                <g key={bx}>
                  <line
                    x1={bx}
                    y1="-17"
                    x2={bx}
                    y2="14"
                    stroke="#451a03"
                    strokeWidth="2.6"
                  />
                  <line
                    x1={bx + 2}
                    y1="-17"
                    x2={bx + 2}
                    y2="14"
                    stroke="#d97706"
                    strokeWidth="1"
                  />
                </g>
              ))}
              {/* Carved Wooden Handrails & Golden Lantern Finials */}
              <rect x="-42" y="-21" width="84" height="5.5" rx="2.5" fill="#b45309" stroke="#451a03" strokeWidth="1" />
              <rect x="-42" y="13" width="84" height="5.5" rx="2.5" fill="#b45309" stroke="#451a03" strokeWidth="1" />
              <circle cx="-37" cy="-18.5" r="4.2" fill="#fde047" stroke="#78350f" strokeWidth="1" />
              <circle cx="37" cy="-18.5" r="4.2" fill="#fde047" stroke="#78350f" strokeWidth="1" />
              <circle cx="-37" cy="16" r="4.2" fill="#fde047" stroke="#78350f" strokeWidth="1" />
              <circle cx="37" cy="16" r="4.2" fill="#fde047" stroke="#78350f" strokeWidth="1" />
            </g>

            {/* =====================================================================
                4. MULTI-TIERED 2.5D SCULPTED 6x6 SANCTUARY PLATEAU & HAND-PAINTED TILES
                Gives unmistakable angled 2.5D spatial elevation above the valley floor!
               ===================================================================== */}

            {/* Soft Ambient Occlusion Shadow Beneath the Entire 2.5D 6x6 Plateau */}
            <polygon
              points="-28,396 540,728 1108,396 540,110"
              fill="#22c55e"
              opacity="0.18"
            />

            {/* TIER 1: Lower 2.5D Sculpted Earthen & Mossy Cliff Base */}
            <polygon
              points="-8,404 540,680 540,714 -8,434"
              fill="url(#earthCliffLeft)"
              stroke="#784c2c"
              strokeWidth="1.5"
            />
            <polygon
              points="540,680 1088,404 1088,434 540,714"
              fill="url(#earthCliffRight)"
              stroke="#5c3920"
              strokeWidth="1.5"
            />
            {/* Hanging Moss & Root Tendrils Along the Lower Earthen Cliff */}
            {[0.15, 0.32, 0.5, 0.68, 0.82].map((t, idx) => {
              const pL = lerpPoint(-8, 404, 540, 680, t);
              const pR = lerpPoint(540, 680, 1088, 404, t);
              return (
                <g key={`cliff-moss-${idx}`}>
                  <path
                    d={`M ${pL.x - 14} ${pL.y - 2} Q ${pL.x} ${pL.y + 18}, ${pL.x + 14} ${pL.y + 6}`}
                    fill="#4ade80"
                    opacity="0.85"
                  />
                  <path
                    d={`M ${pR.x - 14} ${pR.y + 6} Q ${pR.x} ${pR.y + 18}, ${pR.x + 14} ${pR.y - 2}`}
                    fill="#22c55e"
                    opacity="0.8"
                  />
                </g>
              );
            })}

            {/* TIER 2: Extruded 2.5D Carved Stone Masonry Retaining Wall */}
            {/* South-West Sunlit Stone Wall */}
            <polygon
              points="-8,372 540,646 540,682 -8,406"
              fill="url(#stoneWallLeft)"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {/* South-East Shaded Stone Wall */}
            <polygon
              points="540,646 1088,372 1088,406 540,682"
              fill="url(#stoneWallRight)"
              stroke="#e2e8f0"
              strokeWidth="1.5"
            />

            {/* Hand-Painted Stone Arches & Golden Filigree Panels on SW & SE Walls */}
            {[0.1, 0.25, 0.4, 0.55, 0.7, 0.82].map((t, idx) => {
              const p1 = lerpPoint(-8, 372, 540, 646, t);
              const p2 = lerpPoint(-8, 372, 540, 646, t + 0.09);
              return (
                <polygon
                  key={`sw-panel-${idx}`}
                  points={`${p1.x},${p1.y + 6} ${p2.x},${p2.y + 6} ${p2.x},${p2.y + 26} ${p1.x},${p1.y + 26}`}
                  fill="#cbd5e1"
                  stroke="#fbbf24"
                  strokeWidth="1.2"
                  opacity="0.92"
                />
              );
            })}
            {[0.12, 0.27, 0.42, 0.57, 0.72, 0.84].map((t, idx) => {
              const p1 = lerpPoint(540, 646, 1088, 372, t);
              const p2 = lerpPoint(540, 646, 1088, 372, t + 0.09);
              return (
                <polygon
                  key={`se-panel-${idx}`}
                  points={`${p1.x},${p1.y + 6} ${p2.x},${p2.y + 6} ${p2.x},${p2.y + 26} ${p1.x},${p1.y + 26}`}
                  fill="#94a3b8"
                  stroke="#f59e0b"
                  strokeWidth="1.2"
                  opacity="0.92"
                />
              );
            })}

            {/* Outer Ornate Stone & Marble Perimeter Rim (دورچین سنگی دور تا دور باغ ۶×۶) */}
            <polygon
              points="540,98 1088,372 540,646 -8,372"
              fill="url(#terraceWalkway)"
              stroke="#fbbf24"
              strokeWidth="3.5"
            />
            {/* Hand-Painted Flagstone Seams & Golden Inner Inlay on the Stone Rim */}
            <polygon
              points="540,109 1066,372 540,635 14,372"
              fill="none"
              stroke="#d97706"
              strokeWidth="1.8"
              strokeDasharray="14 7"
            />

            {/* Inner Recessed 2.5D Stone Curb Framing the 6x6 Lawn */}
            <polygon
              points="540,116 1050,372 540,628 30,372"
              fill="#15803d"
              stroke="#86efac"
              strokeWidth="1.5"
              strokeOpacity="0.65"
            />

            {/* Main Enlarged 6x6 Hand-Painted Vibrant Green Garden Lawn Surface (1008x504) */}
            <polygon
              points="540,120 1044,372 540,624 36,372"
              fill="url(#sanctuaryPlatform)"
              stroke="#86efac"
              strokeWidth="2.5"
            />

            {/* TIER 3: 36 Individual Hand-Painted 2.5D Isometric Garden Plots (0..5 x 0..5) */}
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
              const col = idx % GRID_SIZE;
              const row = Math.floor(idx / GRID_SIZE);
              const isCheckerEven = (col + row) % 2 === 0;
              const center = getTileIsoCenter(col, row);
              const isCenterCross = col === 2 || col === 3 || row === 2 || row === 3;
              const outerPts = getTilePolygonPoints(col, row, 0);
              const innerPts = getTilePolygonPoints(col, row, 3.5);

              return (
                <g key={`tile-poly-${col}-${row}`}>
                  {/* Base Isometric Diamond with Green Grass Variation */}
                  <polygon
                    points={outerPts}
                    fill={
                      isCheckerEven
                        ? 'url(#paintedTileSunlit)'
                        : 'url(#paintedTileMoss)'
                    }
                    stroke="#15803d"
                    strokeWidth="1.2"
                    strokeOpacity="0.4"
                  />

                  {/* 2.5D Sunlit Top-Left Bevel Edge on Each Plot */}
                  <polyline
                    points={`${center.x - TILE_HALF_W + 3},${center.y} ${center.x},${center.y - TILE_HALF_H + 1.5} ${center.x + TILE_HALF_W - 3},${center.y}`}
                    fill="none"
                    stroke="#86efac"
                    strokeWidth="1.4"
                    strokeOpacity={isCheckerEven ? '0.52' : '0.36'}
                  />

                  {/* 2.5D Shaded Bottom-Right Lip on Each Plot */}
                  <polyline
                    points={`${center.x - TILE_HALF_W + 3},${center.y} ${center.x},${center.y + TILE_HALF_H - 1.5} ${center.x + TILE_HALF_W - 3},${center.y}`}
                    fill="none"
                    stroke="#14532d"
                    strokeWidth="1.3"
                    strokeOpacity="0.28"
                  />

                  {/* Inner Botanical Frame */}
                  <polygon
                    points={innerPts}
                    fill="none"
                    stroke="#86efac"
                    strokeWidth="0.9"
                    strokeDasharray="6 5"
                    strokeOpacity="0.38"
                  />

                  {/* Soft 2.5D Recessed Planting Basin Shadow in Plot Center */}
                  <ellipse
                    cx={center.x}
                    cy={center.y + 4}
                    rx="32"
                    ry="15"
                    fill="url(#plotBasinShadow)"
                  />

                  {/* Hand-Painted Flagstone Stepping Stones on Central Axis Tiles */}
                  {isCenterCross && (
                    <g opacity="0.42">
                      <ellipse
                        cx={center.x - 14}
                        cy={center.y - 5}
                        rx="8"
                        ry="4"
                        fill="#475569"
                      />
                      <ellipse
                        cx={center.x - 14}
                        cy={center.y - 6}
                        rx="7"
                        ry="3.2"
                        fill="#cbd5e1"
                      />
                      <ellipse
                        cx={center.x + 12}
                        cy={center.y + 6}
                        rx="7"
                        ry="3.5"
                        fill="#475569"
                      />
                      <ellipse
                        cx={center.x + 12}
                        cy={center.y + 5}
                        rx="6"
                        ry="2.8"
                        fill="#e2e8f0"
                      />
                    </g>
                  )}

                  {/* Hand-Painted Grass Tufts, Clover & Tiny Wildflowers per Plot */}
                  <path
                    d={`M ${center.x - 28} ${center.y + 10} q -2 -5 -4 -7 M ${center.x - 25} ${center.y + 10} q 1 -6 3 -7 M ${center.x + 24} ${center.y - 8} q -2 -5 -3 -6 M ${center.x + 27} ${center.y - 8} q 2 -4 4 -6`}
                    stroke="#86efac"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.52"
                  />
                  {isCheckerEven ? (
                    <>
                      <circle
                        cx={center.x - 32}
                        cy={center.y - 5}
                        r="2"
                        fill="#fef08a"
                        opacity="0.82"
                      />
                      <circle
                        cx={center.x + 30}
                        cy={center.y + 7}
                        r="1.6"
                        fill="#fbcfe8"
                        opacity="0.72"
                      />
                    </>
                  ) : (
                    <circle
                      cx={center.x + 28}
                      cy={center.y + 8}
                      r="1.8"
                      fill="#ecfccb"
                      opacity="0.72"
                    />
                  )}
                </g>
              );
            })}

            {/* =====================================================================
                5. CONTINUOUS 2.5D PERIMETER HEDGE, GOLDEN BALUSTRADE & 4 CORNER GAZEBO PILLARS
               ===================================================================== */}

            {/* Back Edges Continuous Hedge Base (NW & NE) */}
            <polyline
              points="-8,372 540,98 1088,372"
              fill="none"
              stroke="#22c55e"
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="-8,372 540,98 1088,372"
              fill="none"
              stroke="#86efac"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Back Perimeter Sculpted Topiary Tufts, Rose Blossoms & Wooden/Gold Finials */}
            {backPerimeterNodes.map((node, idx) => (
              <g key={`back-perim-${idx}`} transform={`translate(${node.x}, ${node.y})`}>
                <use href="#hp-back-tuft" />
                <circle cx="-5" cy="-4" r="2.4" fill={node.c} />
                <circle cx="-5" cy="-4" r="0.9" fill="#fef08a" />
                <circle cx="5" cy="-5" r="2.4" fill={node.c} />
                <circle cx="5" cy="-5" r="0.9" fill="#fef08a" />
                {node.isPost && <use href="#hp-back-post" />}
              </g>
            ))}

            {/* Front Edges Continuous Low Boxwood Hedge & Carved Wood/Gold Balustrade (SW & SE) */}
            {frontPerimeterNodes.map((node, idx) => (
              <g key={`front-perim-${idx}`} transform={`translate(${node.x}, ${node.y})`}>
                <use href="#hp-front-tuft" />
                <circle cx="-4" cy="-2" r="2.2" fill={node.c} />
                <circle cx="4" cy="-3" r="2.2" fill="#fef08a" />
                {node.isPost && <use href="#hp-front-post" />}
              </g>
            ))}

            {/* 4 Corner 2.5D Stone Lantern Turrets (West, East, North-West & North-East Gateways) */}
            {[
              { x: -8, y: 372, label: 'west' },
              { x: 1088, y: 372, label: 'east' },
              { x: 485, y: 125, label: 'nw_crown' },
              { x: 595, y: 125, label: 'ne_crown' },
            ].map((pillar) => (
              <g
                key={pillar.label}
                transform={`translate(${pillar.x}, ${pillar.y})`}
              >
                <ellipse cx="3" cy="9" rx="19" ry="9" fill="#064e3b" opacity="0.34" />
                <polygon
                  points="-12,4 0,10 12,4 12,-18 0,-12 -12,-18"
                  fill="#e2e8f0"
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <polygon
                  points="0,10 12,4 12,-18 0,-12"
                  fill="#94a3b8"
                  stroke="#475569"
                  strokeWidth="1"
                />
                <polygon
                  points="0,-24 14,-18 0,-12 -14,-18"
                  fill="#f8fafc"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                />
                <rect
                  x="-6"
                  y="-36"
                  width="12"
                  height="12"
                  rx="2"
                  fill="#fef08a"
                  stroke="#d97706"
                  strokeWidth="1.5"
                />
                <polygon
                  points="0,-45 11,-36 -11,-36"
                  fill="#047857"
                  stroke="#fbbf24"
                  strokeWidth="1.2"
                />
                <circle cx="0" cy="-46" r="3" fill="#fbbf24" />
              </g>
            ))}

            {/* Grand Southern Entrance Marble Stairway & Twin Gate Pillars at (540, 646) */}
            <g transform="translate(540, 646)">
              <polygon
                points="-46,-8 46,-8 54,6 -54,6"
                fill="#f8fafc"
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
              <polygon
                points="-50,4 50,4 58,18 -58,18"
                fill="#e2e8f0"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              <polygon
                points="-54,16 54,16 62,30 -62,30"
                fill="#cbd5e1"
                stroke="#475569"
                strokeWidth="1.5"
              />
              <polygon
                points="-58,28 58,28 66,42 -66,42"
                fill="#94a3b8"
                stroke="#334155"
                strokeWidth="1.5"
              />
              <polygon
                points="-18,-8 18,-8 24,42 -24,42"
                fill="#10b981"
                stroke="#fbbf24"
                strokeWidth="2"
              />
              {[-56, 56].map((px, i) => (
                <g key={`south-gate-pillar-${i}`} transform={`translate(${px}, 4)`}>
                  <ellipse cx="3" cy="9" rx="17" ry="8" fill="#064e3b" opacity="0.34" />
                  <rect
                    x="-10"
                    y="-24"
                    width="20"
                    height="28"
                    rx="3"
                    fill="#f8fafc"
                    stroke="#fbbf24"
                    strokeWidth="2"
                  />
                  <polygon
                    points="0,-36 14,-24 -14,-24"
                    fill="#10b981"
                    stroke="#fde047"
                    strokeWidth="1.5"
                  />
                  <circle cx="0" cy="-38" r="4.5" fill="#fbbf24" />
                </g>
              ))}
            </g>

            {/* =====================================================================
                6. NATURAL GROUND DETAILS, SOFT DIRECTIONAL SHADOWS & WARM SUNBEAMS
               ===================================================================== */}

            {/* 2.5D Isometric Wooden Garden Benches Along the Outer Terrace */}
            <g transform="translate(260, 560) rotate(26)">
              <ellipse cx="2" cy="8" rx="24" ry="8" fill="#14532d" opacity="0.32" />
              <rect
                x="-22"
                y="-6"
                width="44"
                height="12"
                rx="3"
                fill="#92400e"
                stroke="#fbbf24"
                strokeWidth="1.2"
              />
              <rect x="-22" y="-12" width="44" height="5" rx="2" fill="#78350f" />
              <rect x="-18" y="6" width="5" height="6" fill="#451a03" />
              <rect x="13" y="6" width="5" height="6" fill="#451a03" />
            </g>
            <g transform="translate(820, 560) rotate(-26)">
              <ellipse cx="2" cy="8" rx="24" ry="8" fill="#14532d" opacity="0.32" />
              <rect
                x="-22"
                y="-6"
                width="44"
                height="12"
                rx="3"
                fill="#92400e"
                stroke="#fbbf24"
                strokeWidth="1.2"
              />
              <rect x="-22" y="-12" width="44" height="5" rx="2" fill="#78350f" />
              <rect x="-18" y="6" width="5" height="6" fill="#451a03" />
              <rect x="13" y="6" width="5" height="6" fill="#451a03" />
            </g>

            {/* Golden Apiary Beehives Near the West Greenhouse */}
            {[
              { x: -75, y: 245 },
              { x: -45, y: 265 },
            ].map((hive, idx) => (
              <g key={`hive-${idx}`} transform={`translate(${hive.x}, ${hive.y})`}>
                <ellipse cx="3" cy="10" rx="15" ry="6.5" fill="#14532d" opacity="0.32" />
                <rect x="-8" y="2" width="16" height="8" fill="#78350f" />
                <ellipse
                  cx="0"
                  cy="0"
                  rx="12"
                  ry="6"
                  fill="#f59e0b"
                  stroke="#fef08a"
                  strokeWidth="1"
                />
                <ellipse
                  cx="0"
                  cy="-6"
                  rx="10"
                  ry="5"
                  fill="#fbbf24"
                  stroke="#fef08a"
                  strokeWidth="1"
                />
                <ellipse cx="0" cy="-12" rx="7" ry="4" fill="#fde047" />
                <circle cx="0" cy="-2" r="2.5" fill="#451a03" />
              </g>
            ))}

            {/* Marble Birdbath Fountain Near the East Terrace */}
            <g transform="translate(1115, 295)">
              <ellipse cx="3" cy="12" rx="17" ry="7.5" fill="#14532d" opacity="0.32" />
              <rect
                x="-4"
                y="-4"
                width="8"
                height="16"
                rx="2"
                fill="#e2e8f0"
                stroke="#94a3b8"
                strokeWidth="1"
              />
              <ellipse
                cx="0"
                cy="-6"
                rx="16"
                ry="7"
                fill="#f8fafc"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <ellipse cx="0" cy="-6" rx="12" ry="5" fill="#38bdf8" />
              <circle cx="0" cy="-9" r="3" fill="#e0f2fe" />
            </g>

            {/* Lush Hand-Painted 2.5D Flowering Bushes & Hedge Shrubs with Contact Shadows */}
            {[
              { x: -65, y: 315, c: '#f472b6' },
              { x: 115, y: 215, c: '#fde047' },
              { x: 285, y: 130, c: '#f472b6' },
              { x: 615, y: 130, c: '#38bdf8' },
              { x: 825, y: 225, c: '#fde047' },
              { x: 955, y: 390, c: '#f472b6' },
              { x: 755, y: 505, c: '#a78bfa' },
              { x: 565, y: 625, c: '#fde047' },
              { x: 335, y: 625, c: '#f472b6' },
              { x: 175, y: 515, c: '#38bdf8' },
              { x: -35, y: 415, c: '#fde047' },
              { x: 375, y: 695, c: '#f472b6' },
              { x: 525, y: 695, c: '#fde047' },
              { x: 365, y: 795, c: '#38bdf8' },
              { x: 515, y: 795, c: '#f472b6' },
              { x: 350, y: 45, c: '#fde047' },
              { x: 550, y: 45, c: '#f472b6' },
            ].map((bush, idx) => (
              <HandPaintedBush25D
                key={`bush-${idx}`}
                x={bush.x}
                y={bush.y}
                flowerColor={bush.c}
              />
            ))}

            {/* Hand-Painted 2.5D Wildflower, Fern & Brushstroke Grass Patches Across the Meadow */}
            {[
              { x: -95, y: 280, c: '#f472b6' },
              { x: -85, y: 390, c: '#fbbf24' },
              { x: -15, y: 485, c: '#38bdf8' },
              { x: 215, y: 615, c: '#f472b6' },
              { x: 325, y: 665, c: '#fde047' },
              { x: 575, y: 665, c: '#a78bfa' },
              { x: 715, y: 575, c: '#fbbf24' },
              { x: 885, y: 455, c: '#f472b6' },
              { x: 975, y: 335, c: '#38bdf8' },
              { x: 915, y: 235, c: '#fde047' },
              { x: 675, y: 115, c: '#f472b6' },
              { x: 245, y: 115, c: '#38bdf8' },
              { x: 45, y: 215, c: '#fbbf24' },
              { x: -145, y: 210, c: '#a78bfa' },
              { x: -185, y: 350, c: '#f472b6' },
              { x: -120, y: 510, c: '#fde047' },
              { x: 65, y: 655, c: '#38bdf8' },
              { x: 265, y: 715, c: '#f472b6' },
              { x: 635, y: 710, c: '#fbbf24' },
              { x: 865, y: 610, c: '#a78bfa' },
              { x: 1155, y: 410, c: '#f472b6' },
              { x: 1145, y: 230, c: '#fde047' },
              { x: 895, y: 95, c: '#38bdf8' },
              { x: 135, y: 85, c: '#f472b6' },
              { x: -35, y: 135, c: '#fbbf24' },
              { x: -235, y: 280, c: '#38bdf8' },
              { x: -210, y: 440, c: '#f472b6' },
              { x: 1170, y: 310, c: '#fde047' },
              { x: 375, y: 735, c: '#a78bfa' },
              { x: 525, y: 745, c: '#f472b6' },
              { x: 260, y: -25, c: '#fde047' },
              { x: 440, y: -45, c: '#f472b6' },
              { x: 645, y: -25, c: '#38bdf8' },
              { x: 295, y: 845, c: '#fde047' },
              { x: 515, y: 855, c: '#f472b6' },
              { x: 660, y: 835, c: '#a78bfa' },
            ].map((patch, idx) => (
              <HandPaintedFlowerPatch25D
                key={`flora-${idx}`}
                x={patch.x}
                y={patch.y}
                color={patch.c}
              />
            ))}

            {/* Sculpted 2.5D Mossy Forest Boulders & Ferns Framing the Outer Clearing */}
            {[
              { x: -85, y: 335, s: 1.0 },
              { x: 235, y: 645, s: 1.1 },
              { x: 665, y: 635, s: 0.95 },
              { x: 965, y: 225, s: 1.05 },
              { x: 645, y: 85, s: 0.9 },
              { x: 255, y: 90, s: 0.95 },
              { x: -135, y: 430, s: 1.2 },
              { x: 945, y: 530, s: 1.15 },
              { x: 130, y: 685, s: 1.1 },
              { x: 790, y: 670, s: 1.1 },
              { x: 385, y: -75, s: 1.05 },
              { x: 635, y: -80, s: 1.1 },
              { x: 330, y: 825, s: 1.15 },
              { x: 610, y: 830, s: 1.1 },
            ].map((rock, idx) => (
              <HandPaintedRock25D
                key={`rock-${idx}`}
                x={rock.x}
                y={rock.y}
                scale={rock.s}
              />
            ))}

            {/* 7. Multi-Layered Hand-Painted 2.5D Forest Trees Surrounding the Clearing */}
            {[
              { x: 100, y: -210, s: 1.25, kind: 'pine' },
              { x: 240, y: -195, s: 1.2, kind: 'oak' },
              { x: 375, y: -185, s: 1.15, kind: 'pine' },
              { x: 480, y: -205, s: 1.15, kind: 'cypress' },
              { x: 680, y: -190, s: 1.2, kind: 'oak' },
              { x: 920, y: -195, s: 1.25, kind: 'pine' },

              { x: -340, y: -90, s: 1.25, kind: 'oak' },
              { x: -200, y: -120, s: 1.15, kind: 'pine' },
              { x: -60, y: -100, s: 1.2, kind: 'oak' },
              { x: 75, y: -85, s: 1.1, kind: 'pine' },
              { x: 205, y: -70, s: 1.15, kind: 'oak' },
              { x: 330, y: -55, s: 1.0, kind: 'pine' },
              { x: 585, y: -55, s: 1.05, kind: 'oak' },
              { x: 720, y: -75, s: 1.15, kind: 'pine' },
              { x: 960, y: -85, s: 1.2, kind: 'oak' },
              { x: 1100, y: -95, s: 1.15, kind: 'pine' },
              { x: 1240, y: -65, s: 1.25, kind: 'oak' },

              { x: -370, y: 70, s: 1.2, kind: 'pine' },
              { x: -240, y: 55, s: 1.15, kind: 'oak' },
              { x: -115, y: 65, s: 1.05, kind: 'cypress' },
              { x: 10, y: 70, s: 1.1, kind: 'oak' },
              { x: 250, y: 65, s: 0.95, kind: 'pine' },
              { x: -310, y: 205, s: 1.25, kind: 'oak' },
              { x: -175, y: 185, s: 1.1, kind: 'pine' },
              { x: -340, y: 360, s: 1.2, kind: 'pine' },
              { x: -215, y: 340, s: 1.15, kind: 'oak' },
              { x: -125, y: 365, s: 1.08, kind: 'cypress' },

              { x: 655, y: 65, s: 0.95, kind: 'pine' },
              { x: 895, y: 55, s: 1.05, kind: 'oak' },
              { x: 1135, y: 75, s: 1.15, kind: 'pine' },
              { x: 1255, y: 110, s: 1.2, kind: 'oak' },
              { x: 1175, y: 225, s: 1.15, kind: 'oak' },
              { x: 1285, y: 260, s: 1.2, kind: 'pine' },
              { x: 1185, y: 375, s: 1.18, kind: 'oak' },
              { x: 1290, y: 420, s: 1.22, kind: 'cypress' },

              { x: -310, y: 525, s: 1.25, kind: 'oak' },
              { x: -175, y: 515, s: 1.15, kind: 'pine' },
              { x: -45, y: 535, s: 1.05, kind: 'oak' },
              { x: 195, y: 655, s: 1.05, kind: 'oak' },
              { x: 325, y: 685, s: 1.0, kind: 'cypress' },
              { x: 575, y: 685, s: 1.02, kind: 'pine' },
              { x: 715, y: 645, s: 1.08, kind: 'oak' },
              { x: 875, y: 575, s: 1.05, kind: 'pine' },
              { x: 1145, y: 575, s: 1.15, kind: 'oak' },
              { x: 1260, y: 565, s: 1.25, kind: 'pine' },

              { x: -240, y: 690, s: 1.3, kind: 'pine' },
              { x: -85, y: 685, s: 1.2, kind: 'oak' },
              { x: 65, y: 715, s: 1.15, kind: 'cypress' },
              { x: 215, y: 755, s: 1.2, kind: 'oak' },
              { x: 355, y: 785, s: 1.12, kind: 'pine' },
              { x: 535, y: 785, s: 1.12, kind: 'cypress' },
              { x: 675, y: 755, s: 1.2, kind: 'oak' },
              { x: 835, y: 725, s: 1.18, kind: 'pine' },
              { x: 1035, y: 715, s: 1.25, kind: 'oak' },
              { x: 1180, y: 700, s: 1.3, kind: 'pine' },

              { x: 130, y: 865, s: 1.25, kind: 'pine' },
              { x: 270, y: 880, s: 1.2, kind: 'oak' },
              { x: 375, y: 895, s: 1.15, kind: 'cypress' },
              { x: 505, y: 890, s: 1.2, kind: 'oak' },
              { x: 655, y: 875, s: 1.25, kind: 'pine' },
              { x: 830, y: 860, s: 1.2, kind: 'oak' },
            ].map((tree, idx) => (
              <AmbientForestTree25D
                key={`forest-tree-${idx}`}
                x={tree.x}
                y={tree.y}
                scale={tree.s}
                kind={tree.kind as 'oak' | 'pine' | 'cypress'}
              />
            ))}

            {/* 8. Warm Top-Left Golden Sunbeams Filtering Across the Sanctuary */}
            <polygon
              points="-350,-280 120,-280 620,560 150,560"
              fill="url(#goldenSunbeam)"
            />
            <polygon
              points="180,-280 520,-280 960,480 620,480"
              fill="url(#goldenSunbeam)"
            />
          </svg>
          </StaticTerrainFreeze>

          {/* =========================================================================
              LIGHTWEIGHT GPU-COMPOSITED AMBIENT ANIMATION OVERLAYS
              (Isolated outside the 2000x1400 static terrain SVG for 60fps mobile battery efficiency)
             ========================================================================= */}

          {/* 1. Soft Water Movement Ripples (Koi Pond, Spring Streamlet & Eastern River) */}
          <svg
            viewBox="-50 -25 100 50"
            style={{ left: '85px', top: '590px' }}
            className="absolute w-[100px] h-[50px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 overflow-visible"
          >
            <ellipse
              cx="0"
              cy="2"
              rx="36"
              ry="16"
              fill="none"
              stroke="#e0f2fe"
              strokeWidth="1.3"
              className="hp-pond-ripple"
            />
          </svg>

          <svg
            viewBox="0 0 260 70"
            style={{ left: '925px', top: '135px' }}
            className="absolute w-[260px] h-[70px] pointer-events-none z-10 overflow-visible"
          >
            <path
              d="M 10 60 Q 130 50, 250 10"
              fill="none"
              stroke="#f0f9ff"
              strokeWidth="2.8"
              strokeDasharray="8 10"
              strokeLinecap="round"
              className="hp-streamlet-flow"
            />
          </svg>

          <svg
            viewBox="0 0 180 340"
            style={{ left: '1135px', top: '140px' }}
            className="absolute w-[180px] h-[340px] pointer-events-none z-10 overflow-visible"
          >
            <path
              d="M 60 10 Q 130 110, 130 210 Q 130 285, 65 330"
              fill="none"
              stroke="#f0f9ff"
              strokeWidth="3.2"
              strokeDasharray="16 22"
              strokeLinecap="round"
              opacity="0.8"
              className="hp-water-flow"
            />
          </svg>

          {/* 2. Three Hand-Painted 2.5D Butterflies (Isolated 36x36 Sprites) */}
          {[
            {
              x: 205,
              y: 235,
              wingPrimary: '#fbbf24',
              wingAccent: '#fef08a',
              cls: 'hp-butterfly-glide-a',
              delay: '0s',
            },
            {
              x: 685,
              y: 255,
              wingPrimary: '#38bdf8',
              wingAccent: '#bae6fd',
              cls: 'hp-butterfly-glide-b',
              delay: '1.8s',
            },
            {
              x: 315,
              y: 535,
              wingPrimary: '#f472b6',
              wingAccent: '#fbcfe8',
              cls: 'hp-butterfly-glide-a',
              delay: '3.2s',
            },
          ].map((bf, idx) => (
            <div
              key={`butterfly-${idx}`}
              style={{ left: `${bf.x}px`, top: `${bf.y}px`, animationDelay: bf.delay }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-25 ${bf.cls}`}
            >
              <svg viewBox="-18 -14 36 32" className="w-8 h-7 overflow-visible">
                <ellipse cx="2" cy="12" rx="5" ry="2.2" fill="#02140a" opacity="0.32" />
                <g className="hp-butterfly-wings">
                  <path
                    d="M 0,0 C -8,-9 -14,-5 -10,2 C -12,6 -6,9 0,3 Z"
                    fill={bf.wingPrimary}
                    stroke="#451a03"
                    strokeWidth="0.8"
                  />
                  <path
                    d="M 0,0 C 8,-9 14,-5 10,2 C 12,6 6,9 0,3 Z"
                    fill={bf.wingPrimary}
                    stroke="#451a03"
                    strokeWidth="0.8"
                  />
                  <circle cx="-5.5" cy="-2" r="1.8" fill={bf.wingAccent} />
                  <circle cx="5.5" cy="-2" r="1.8" fill={bf.wingAccent} />
                  <line
                    x1="0"
                    y1="-3.5"
                    x2="0"
                    y2="4.5"
                    stroke="#291506"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </g>
              </svg>
            </div>
          ))}

          {/* 3. Occasional Ambient Sunbeam Particles (6 Lightweight Drifting Motes) */}
          {[
            { x: 145, y: 175, c: '#fef08a', d: '0s' },
            { x: 310, y: 240, c: '#a7f3d0', d: '1.2s' },
            { x: 465, y: 195, c: '#fef08a', d: '2.4s' },
            { x: 590, y: 310, c: '#6ee7b7', d: '0.8s' },
            { x: 265, y: 390, c: '#fef08a', d: '3.1s' },
            { x: 525, y: 420, c: '#bae6fd', d: '1.9s' },
          ].map((mote, idx) => (
            <div
              key={`sun-mote-${idx}`}
              style={{
                left: `${mote.x}px`,
                top: `${mote.y}px`,
                backgroundColor: mote.c,
                animationDelay: mote.d,
              }}
              className="absolute w-1.5 h-1.5 rounded-full pointer-events-none z-25 shadow-[0_0_6px_rgba(254,240,138,0.85)] hp-sun-mote"
            />
          ))}

          {/* =========================================================================
              PERIMETER 2.5D ARCHITECTURAL STRUCTURES (Positioned Around Enlarged Garden)
             ========================================================================= */}

          {/* 1. Top-Center Main Sanctuary Pavilion (عمارت باغبان) */}
          <div
            style={{ left: '540px', top: '64px' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-default"
          >
            <div className="mb-1 px-2.5 py-0.5 rounded-full bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 text-slate-950 font-black text-[10px] shadow-md flex items-center gap-1 border border-white whitespace-nowrap">
              <span>🏛️ عمارت باغبان</span>
              <span className="bg-slate-950 text-amber-200 px-1.5 rounded-full text-[9px]">
                سطح {Math.max(1, Math.floor(profile.streakDays / 3) + 1)}
              </span>
            </div>
            <GardenSanctuaryPavilion25D className="w-28 h-22" />
          </div>

          {/* 2. North-East Side: Spring of Living Water (چشمه آب حیات) */}
          <GardenSpringShrineNode
            readOnly={readOnly}
            lastCollectedDate={profile.lastSpringCollectedDate}
            floatingText={
              floatingReward?.treeId === 'spring' ? floatingReward.text : null
            }
            onCollect={handleCollectSpring}
          />

          {/* 3. North-West Side: Seedlings Greenhouse (گلخانه نهال‌ها و فروشگاه) */}
          <div
            onClick={
              readOnly
                ? undefined
                : () => {
                    sound.playClick();
                    onOpenShop?.();
                  }
            }
            style={{ left: '145px', top: '165px' }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center ${
              readOnly ? 'cursor-default' : 'cursor-pointer group'
            }`}
          >
            {!readOnly && (
              <div className="mb-1 bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-md border border-white flex items-center gap-1 whitespace-nowrap">
                <span>🌱</span>
                <span>گلخانه نهال‌ها</span>
              </div>
            )}
            <GardenGreenhouse25D className="w-24 h-18 group-hover:scale-105 transition-transform" />
            <span className="text-[10px] font-black text-slate-50 bg-[#0a1d17]/95 px-2 py-0.5 rounded-md border border-emerald-300/55 shadow-sm whitespace-nowrap">
              بازارچه و نهالستان
            </span>
          </div>

          {/* Player's Custom Full-Body Avatar Walking Inside the Garden */}
          <CompanionGardenersLayer
            trees={trees}
            decorations={decorations}
            gender={profile.gender}
            avatarConfig={profile.avatarConfig}
          />

          {/* =========================================================================
              INTERACTIVE 5x5 ENLARGED ISOMETRIC GARDEN OBJECTS (Exact Hitboxes Preserved)
             ========================================================================= */}
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
            const col = index % GRID_SIZE;
            const row = Math.floor(index / GRID_SIZE);
            const center = getTileIsoCenter(col, row);
            const cellKey = `${col},${row}`;
            const treeAtCell = treeByCoord.get(cellKey);
            const decoAtCell = decoByCoord.get(cellKey);

            return (
              <div
                key={`cell-${col}-${row}`}
                onClick={readOnly ? undefined : () => handleCellClick(col, row)}
                style={{
                  left: `${center.x}px`,
                  top: `${center.y}px`,
                  zIndex: (decoAtCell && !treeAtCell ? 22 : 25) + col + row,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-28 h-24 flex items-center justify-center ${
                  readOnly ? 'cursor-default' : 'cursor-pointer group'
                }`}
              >
                {/* Edit Mode Target Highlight */}
                {!readOnly && isEditMode && !treeAtCell && !decoAtCell && (
                  <div className="w-10 h-5 rounded-full border border-dashed border-amber-300/80 bg-amber-400/15 group-hover:bg-amber-400/35 transition-colors" />
                )}

                {/* Interactive Buildable Soil Plot Marker (Visible in Build Mode or on Hover) */}
                {!readOnly && !isEditMode && !treeAtCell && !decoAtCell && (
                  <div
                    className={`flex flex-col items-center justify-center transition-all duration-200 pointer-events-none ${
                      isBuildMode
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
                    }`}
                  >
                    <div className="px-2 py-0.5 rounded-full bg-[#0a1d17]/95 border border-lime-300/80 text-lime-200 text-[9px] font-black shadow-md flex items-center gap-0.5 whitespace-nowrap">
                      <span>+</span>
                      <span>کاشت / ساخت</span>
                    </div>
                    <div className="mt-0.5 w-11 h-5 rounded-full border-2 border-dashed border-lime-300/80 bg-lime-400/15" />
                  </div>
                )}

                {/* Hand-Painted 2.5D Garden Decoration Item */}
                {decoAtCell && !treeAtCell && (
                  <div className="flex flex-col items-center -mt-3 pointer-events-none">
                    <GardenDecorationGraphic
                      decoration={decoAtCell}
                      size={88}
                      isSelected={
                        !readOnly &&
                        selectedItemToMove?.kind === 'deco' &&
                        selectedItemToMove?.id === decoAtCell.id
                      }
                    />
                  </div>
                )}

                {/* Unlocked Skill Tree */}
                {treeAtCell && treeAtCell.unlocked && (
                  <div className="absolute bottom-[22px] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                    {(() => {
                      const stage = getGrowthStage(treeAtCell.wateredDaysCount);
                      const withered =
                        treeAtCell.isWithered ||
                        isTreeWithered(treeAtCell.daysWithoutWater);
                      const wateredToday = treeAtCell.lastWateredDate === today;
                      const coinStatus = getTreeCoinStatus(treeAtCell, nowMs);

                      return (
                        <>
                          {/* Pure Larger 2.5D Water Droplet Icon Above Tree (Hidden Once Watered Today or in Read-Only Visitor Mode) */}
                          {!readOnly && !wateredToday && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellClick(col, row);
                              }}
                              aria-label={`آبیاری و تمرین ${treeAtCell.name}`}
                              title={
                                withered
                                  ? `احیا و آبیاری ${treeAtCell.name}`
                                  : `آبیاری ${treeAtCell.name} (+۵ سکه و شروع تولید سکه هر ۴ ساعت)`
                              }
                              className="-mb-2 z-30 pointer-events-auto flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-transform hover:scale-115 active:scale-95 cursor-pointer animate-float"
                            >
                              <svg
                                viewBox="0 0 36 36"
                                className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-[0_4px_8px_rgba(2,132,199,0.55)] overflow-visible"
                              >
                                <defs>
                                  <linearGradient
                                    id={`dropletGrad-${treeAtCell.id}`}
                                    x1="0%"
                                    y1="0%"
                                    x2="0%"
                                    y2="100%"
                                  >
                                    <stop
                                      offset="0%"
                                      stopColor={withered ? '#fde047' : '#7dd3fc'}
                                    />
                                    <stop
                                      offset="55%"
                                      stopColor={withered ? '#f59e0b' : '#0ea5e9'}
                                    />
                                    <stop
                                      offset="100%"
                                      stopColor={withered ? '#b45309' : '#0369a1'}
                                    />
                                  </linearGradient>
                                </defs>
                                <path
                                  d="M18 3 C18 3 6 16.5 6 23.5 C6 30.1 11.4 34 18 34 C24.6 34 30 30.1 30 23.5 C30 16.5 18 3 18 3 Z"
                                  fill={`url(#dropletGrad-${treeAtCell.id})`}
                                  stroke="#ffffff"
                                  strokeWidth="2.2"
                                />
                                {/* Specular Highlight */}
                                <path
                                  d="M12.5 20 C11.5 23.5 13 27.5 16 28.8"
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  opacity="0.85"
                                />
                                <circle cx="14.5" cy="14.5" r="1.8" fill="#ffffff" opacity="0.9" />
                              </svg>
                            </button>
                          )}

                          {/* 2.5D Tree Graphic */}
                          <div className="group-hover:scale-105 transition-transform">
                            <TreeGraphic
                              tree={treeAtCell}
                              size={126}
                              isSelected={
                                selectedTreePulseId === treeAtCell.id ||
                                (selectedItemToMove?.kind === 'tree' &&
                                  selectedItemToMove?.id === treeAtCell.id)
                              }
                              isWateringActive={wateringEffectTreeId === treeAtCell.id}
                              isMilestoneActive={milestoneEffect?.treeId === treeAtCell.id}
                            />
                          </div>

                          {/* Floating Reward Popup (positioned cleanly near tree center/base) */}
                          {floatingReward?.treeId === treeAtCell.id && (
                            <div className="absolute bottom-14 z-40 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 text-slate-950 font-black text-xs px-3 py-0.5 rounded-full border-2 border-white shadow-[0_4px_12px_rgba(15,23,42,0.2)] animate-bounce whitespace-nowrap">
                              {floatingReward.text}
                            </div>
                          )}

                          {/* Growth Milestone Celebration Banner */}
                          {milestoneEffect?.treeId === treeAtCell.id && (
                            <div className="absolute -top-12 z-50 bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400 text-slate-950 font-black text-[11px] px-3 py-1 rounded-2xl border-2 border-white shadow-[0_6px_18px_rgba(15,23,42,0.25)] animate-bounce whitespace-nowrap">
                              🌟 ارتقای رشد: {milestoneEffect.stageTitle} (سطح {milestoneEffect.stageNum}) ✨
                            </div>
                          )}

                          {/* Clickable Accumulated Coin Harvest Bubble (Anchored at trunk base, never collides with upper pavilion) */}
                          {!readOnly && coinStatus.readyCoins > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                sound.playCoin();
                                confetti({
                                  particleCount: 35,
                                  spread: 45,
                                  origin: { y: 0.55 },
                                });
                                setFloatingReward({
                                  treeId: treeAtCell.id,
                                  text: `+${coinStatus.readyCoins.toLocaleString('fa-IR')} سکه 🪙`,
                                });
                                setTimeout(() => setFloatingReward(null), 2200);
                                onHarvestTreeCoins?.(treeAtCell.id);
                              }}
                              aria-label={`برداشت ${coinStatus.readyCoins} سکه از ${treeAtCell.name}`}
                              title={`برداشت ${coinStatus.readyCoins.toLocaleString('fa-IR')} سکه ذخیره شده (حداکثر روزانه: ${coinStatus.maxStorageCoins.toLocaleString('fa-IR')} سکه)`}
                              className="-mt-7 mb-1 relative z-30 pointer-events-auto bg-gradient-to-b from-amber-200 via-amber-400 to-amber-500 hover:brightness-105 hover:scale-105 transition-transform text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full border-2 border-white shadow-[0_3px_0_#78350f,0_6px_14px_rgba(245,158,11,0.45)] flex items-center gap-1 whitespace-nowrap cursor-pointer active:translate-y-[1px]"
                            >
                              <span>🪙</span>
                              <span>+{coinStatus.readyCoins.toLocaleString('fa-IR')}</span>
                              {coinStatus.isFull && (
                                <span className="text-[8.5px] bg-amber-950 text-amber-200 px-1 rounded-full">
                                  پر
                                </span>
                              )}
                            </button>
                          )}

                          {/* Clean Single-Line Tree Nameplate */}
                          <div
                            className={`${
                              !readOnly && coinStatus.readyCoins > 0 ? 'mt-0' : '-mt-3.5'
                            } relative z-20 bg-[#0a1d17]/95 border border-emerald-300/55 px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1.5 whitespace-nowrap`}
                          >
                            <span className="text-[10px] font-black text-slate-50">
                              {treeAtCell.id === 'brain_math'
                                ? 'درخت مغز'
                                : treeAtCell.name.replace('درخت ', '')}
                            </span>
                            <span className="text-[9px] font-black text-amber-200 bg-[#143026] px-1.5 rounded-full">
                              سطح {stage + 1}
                            </span>
                          </div>

                          {/* Compact 4-Hour Coin Production & 24h Storage Status Pill */}
                          {!readOnly && (
                            <div
                              className={`mt-0.5 relative z-20 px-2 py-0.5 rounded-full text-[8.5px] font-bold border shadow-sm whitespace-nowrap ${
                                coinStatus.isFull
                                  ? 'bg-amber-300 text-slate-950 border-white font-black'
                                  : coinStatus.isActiveWindow
                                  ? 'bg-[#0a1d17]/95 text-amber-200 border-amber-300/50'
                                  : 'bg-[#0a1d17]/92 text-slate-100 border-emerald-300/40'
                              }`}
                            >
                              {coinStatus.isFull
                                ? `🪙 ذخیره یک‌روزه پر (${coinStatus.readyCoins.toLocaleString('fa-IR')}/${coinStatus.maxStorageCoins.toLocaleString('fa-IR')})`
                                : coinStatus.isActiveWindow && coinStatus.msUntilNextCoin !== null
                                ? `🪙 ${coinStatus.coinsPerInterval.toLocaleString('fa-IR')}/۴س · ⏳ ${formatCompactDurationFa(coinStatus.msUntilNextCoin)}`
                                : `🪙 ${coinStatus.coinsPerInterval.toLocaleString('fa-IR')}/۴س (تا ${coinStatus.maxStorageCoins.toLocaleString('fa-IR')}/روز)`}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Locked Tree Plot (2.5D Dormant Seedling to Unlock Directly - Hidden in Read-Only Visitor Mode) */}
                {!readOnly && treeAtCell && !treeAtCell.unlocked && (
                  <div className="flex flex-col items-center -mt-1 pointer-events-none group-hover:scale-105 transition-transform">
                    <span className="-mb-2 relative z-10 bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 border border-white text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
                      <span>🌱</span>
                      <span>کاشت ({treeAtCell.cost} سکه)</span>
                    </span>
                    <DormantSeedlingGraphic size={50} />
                    <span className="-mt-1.5 relative z-10 text-[9px] font-black text-slate-50 bg-[#0a1d17]/95 border border-emerald-300/55 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                      {treeAtCell.name}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          DIRECT IN-GARDEN SEEDLING PLANTING POPUP (No need to navigate Shop tabs)
         ========================================================================= */}
      {!readOnly && pendingUnlockTree && (
        <div
          dir="rtl"
          onClick={() => setPendingUnlockTree(null)}
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/90 p-5 text-slate-50 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-center space-y-3.5"
          >
            <button
              type="button"
              onClick={() => setPendingUnlockTree(null)}
              aria-label="بستن"
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-[#143026] hover:bg-[#1c4436] border border-emerald-300/30 text-slate-100 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#143026] border-2 border-amber-400/60 flex items-center justify-center shadow-inner">
              <TreeGraphic
                tree={{ ...pendingUnlockTree, unlocked: true, wateredDaysCount: 1 }}
                size={84}
                showShadow={false}
              />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black text-amber-200">
                کاشت «{pendingUnlockTree.name}»
              </h3>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                {pendingUnlockTree.description}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-black bg-[#143026] border border-emerald-300/25 py-2 px-3 rounded-2xl">
              <span className="text-slate-200">هزینه کاشت نهال:</span>
              <span className="text-amber-300">🪙 {pendingUnlockTree.cost} سکه</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-100">موجودی شما: {profile.coins} سکه</span>
            </div>

            {canPurchaseItem(profile.coins, pendingUnlockTree.cost, {
              alreadyOwned: pendingUnlockTree.unlocked,
            }) ? (
              <button
                type="button"
                onClick={() => {
                  if (!onUnlockTree) return;
                  sound.playCoin();
                  confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
                  onUnlockTree(pendingUnlockTree.id, pendingUnlockTree.cost);
                  setFloatingReward({
                    treeId: pendingUnlockTree.id,
                    text: '🌱 نهال جدید کاشته شد!',
                  });
                  setTimeout(() => setFloatingReward(null), 2200);
                  setPendingUnlockTree(null);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:brightness-105 text-slate-950 font-black text-sm border-2 border-white shadow-[0_4px_0_#78350f] active:translate-y-[2px] cursor-pointer transition-all"
              >
                🌱 کاشت مستقیم نهال ({pendingUnlockTree.cost} سکه)
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-200 bg-amber-500/15 border border-amber-400/45 rounded-xl py-2 px-3">
                  برای کاشت این نهال به {pendingUnlockTree.cost} سکه نیاز دارید. با چشمه حیات (+۲۰ سکه روزانه)، آبیاری درختان و برداشت سکه هر ۴ ساعت سکه جمع کنید!
                </p>
                <button
                  type="button"
                  onClick={() => setPendingUnlockTree(null)}
                  className="w-full py-2.5 rounded-2xl bg-[#143026] hover:bg-[#1c4436] border border-emerald-300/30 text-slate-50 font-bold text-xs cursor-pointer"
                >
                  متوجه شدم
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TILE-BY-TILE GARDEN PLOT BUILDER MODAL (`ساخت و کاشت در قطعه انتخاب‌شده باغ`)
         ========================================================================= */}
      {!readOnly && selectedBuildPlot && (
        <div
          dir="rtl"
          onClick={() => setSelectedBuildPlot(null)}
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/82 backdrop-blur-sm animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/90 p-4 sm:p-5 text-slate-50 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-emerald-300/20">
              <div>
                <h3 className="text-sm sm:text-base font-black text-amber-200 flex items-center gap-1.5">
                  <span>🌱</span>
                  <span>
                    ساخت و کاشت در قطعه ({selectedBuildPlot.x + 1}، {selectedBuildPlot.y + 1}) باغ
                  </span>
                </h3>
                <p className="text-[11px] text-slate-200 mt-0.5">
                  یک نهال مهارتی یا یکی از اجزای باغ را مستقیماً در همین قطعه بسازید
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-xl bg-[#143026] border border-amber-400/60 text-xs font-black text-amber-200 whitespace-nowrap">
                  🪙 {profile.coins} سکه
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBuildPlot(null)}
                  aria-label="بستن"
                  className="w-8 h-8 rounded-full bg-[#143026] hover:bg-[#1c4436] border border-emerald-300/30 text-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Switcher: Plant Seedling | Build Garden Structure */}
            <div className="grid grid-cols-2 gap-2 my-3">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setBuildModalTab('trees');
                }}
                className={`py-2 px-3 rounded-2xl text-xs font-black border-2 transition-all cursor-pointer ${
                  buildModalTab === 'trees'
                    ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-white shadow-[0_3px_0_#78350f]'
                    : 'bg-[#143026] text-slate-100 border-emerald-300/25 hover:border-amber-400/60'
                }`}
              >
                🌳 کاشت نهال مهارتی ({trees.filter((t) => !t.unlocked).length})
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setBuildModalTab('decorations');
                }}
                className={`py-2 px-3 rounded-2xl text-xs font-black border-2 transition-all cursor-pointer ${
                  buildModalTab === 'decorations'
                    ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-white shadow-[0_3px_0_#78350f]'
                    : 'bg-[#143026] text-slate-100 border-emerald-300/25 hover:border-amber-400/60'
                }`}
              >
                ⛲ ساخت اجزای باغ ({AVAILABLE_DECORATIONS.length})
              </button>
            </div>

            {/* Scrollable Options List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
              {buildModalTab === 'trees' ? (
                trees.filter((t) => !t.unlocked).length > 0 ? (
                  trees
                    .filter((t) => !t.unlocked)
                    .map((tree) => {
                      const canAfford = canPurchaseItem(profile.coins, tree.cost, {
                        alreadyOwned: tree.unlocked,
                      });
                      return (
                        <div
                          key={tree.id}
                          className="p-3 rounded-2xl bg-[#143026] border border-emerald-300/25 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 h-14 rounded-xl bg-[#0a1d17] border border-amber-400/40 flex items-center justify-center shrink-0">
                              <TreeGraphic
                                tree={{ ...tree, unlocked: true, wateredDaysCount: 1 }}
                                size={64}
                                showShadow={false}
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-black text-amber-200 truncate">
                                {tree.name}
                              </h4>
                              <p className="text-[11px] text-slate-200 line-clamp-2 mt-0.5">
                                {tree.description}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => {
                              if (!onUnlockTree || !canAfford) return;
                              sound.playCoin();
                              confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
                              onUnlockTree(tree.id, tree.cost, selectedBuildPlot);
                              setFloatingReward({
                                treeId: tree.id,
                                text: '🌱 نهال در این قطعه کاشته شد!',
                              });
                              setTimeout(() => setFloatingReward(null), 2200);
                              setSelectedBuildPlot(null);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-black border shrink-0 transition-all ${
                              canAfford
                                ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-white shadow-[0_3px_0_#78350f] active:translate-y-[1px] cursor-pointer'
                                : 'bg-slate-800/90 text-slate-300 border-slate-600/80 cursor-not-allowed'
                            }`}
                          >
                            کاشت (🪙 {tree.cost})
                          </button>
                        </div>
                      );
                    })
                ) : (
                  <div className="p-5 rounded-2xl bg-[#143026] border border-emerald-300/25 text-center space-y-2">
                    <p className="text-xs sm:text-sm font-black text-amber-200">
                      🌳 تمام نهال‌های مهارتی در باغ شما کاشته شده‌اند!
                    </p>
                    <button
                      type="button"
                      onClick={() => setBuildModalTab('decorations')}
                      className="px-4 py-2 rounded-xl bg-amber-300 text-slate-950 font-black text-xs cursor-pointer"
                    >
                      مشاهده اجزای قابل ساخت در باغ ⛲
                    </button>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_DECORATIONS.map((deco, idx) => {
                    const canAfford = canPurchaseItem(profile.coins, deco.cost);
                    return (
                      <div
                        key={`${deco.type}-${idx}`}
                        className="p-3 rounded-2xl bg-[#143026] border border-emerald-300/25 flex flex-col justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-13 h-13 rounded-xl bg-[#0a1d17] border border-emerald-300/30 flex items-center justify-center shrink-0">
                            <GardenDecorationGraphic
                              decoration={{ ...deco, id: 'preview', x: 0, y: 0 }}
                              size={54}
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-amber-200 truncate">
                              {deco.name}
                            </h4>
                            <span className="text-[11px] font-bold text-slate-200">
                              🪙 {deco.cost} سکه
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            if (!canAfford) return;
                            if (onBuyDecoration) {
                              sound.playCoin();
                              confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
                              onBuyDecoration(deco, selectedBuildPlot);
                              setSelectedBuildPlot(null);
                            } else {
                              onOpenShop?.();
                            }
                          }}
                          className={`w-full py-2 rounded-xl text-xs font-black border transition-all ${
                            canAfford
                              ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 border-white shadow-[0_3px_0_#78350f] active:translate-y-[1px] cursor-pointer'
                              : 'bg-slate-800/90 text-slate-300 border-slate-600/80 cursor-not-allowed'
                          }`}
                        >
                          🔨 ساخت در این قطعه (🪙 {deco.cost})
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
