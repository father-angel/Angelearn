import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  CourseData,
  UserProfile,
  VisitorGarden,
  TreeData,
  WorldGroup,
  AvatarConfig,
  AvatarGender,
  ChatTargetUser,
} from '../types/game';
import { CITY_COURSES } from '../utils/storage';
import {
  Sparkles,
  Eye,
  HeartHandshake,
  GraduationCap,
  Shield,
  X,
  Navigation,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  School,
  CheckCircle2,
  Play,
  ArrowRight,
  Move,
  Check,
  Users,
  MessageCircle,
  UserPlus,
} from 'lucide-react';
import { sound } from '../utils/audio';
import {
  UniversityMainBuilding25D,
  SchoolWorkshopMainBuilding25D,
  ResourceShrinePavilion25D,
  GardenSpringShrine25D,
  GardenGreenhouse25D,
  WorldGardenPlot25D,
  GroupBuilding25D,
} from './BuildingGraphic25D';
import { AmbientForestTree25D, AmbientForestDefs } from './TreeGraphic';
import {
  HandPaintedBush25D,
  HandPaintedFlowerPatch25D,
  HandPaintedRock25D,
} from './GardenDecorationGraphic';
import type { UniversityNavigationStep } from '../university/UniversityHallView';

const UniversityHallView = React.lazy(() =>
  import('../university/UniversityHallView').then((m) => ({
    default: m.UniversityHallView,
  }))
);
import {
  WorldCitizensLayer,
  LiveWorldPlayerWalker,
} from './WorldCitizens25D';
import {
  subscribeToPublicWorldGardens,
  subscribeToPublicGroups,
  LiveCloudNeighborGarden,
} from '../firebase';
import {
  getDeterministicWorldCoords,
  resolveNonOverlappingWorldCoords,
  clampWorldCoords,
  resolveGroupWorldPositions,
} from '../game/worldPlacement';
import { getGroupTierMeta } from '../game/groups';
import { HudGroupTentIcon } from './HudIcons25D';
import { CharacterAvatar } from './CharacterAvatar';


const GARDEN_WORLD_POS_STORAGE_PREFIX = 'angellearn_world_garden_pos_v2_';
const DEFAULT_GARDEN_WORLD_POS = { x: 1320, y: 860 };

function loadSavedGardenWorldPos(
  profileId?: string,
  profileCoords?: { x: number; y: number }
): {
  x: number;
  y: number;
} {
  if (
    profileCoords &&
    typeof profileCoords.x === 'number' &&
    typeof profileCoords.y === 'number' &&
    profileCoords.x >= 240 &&
    profileCoords.x <= 2560 &&
    profileCoords.y >= 200 &&
    profileCoords.y <= 1650
  ) {
    return { x: Math.round(profileCoords.x), y: Math.round(profileCoords.y) };
  }
  if (typeof window !== 'undefined' && profileId) {
    try {
      const raw = window.localStorage.getItem(
        `${GARDEN_WORLD_POS_STORAGE_PREFIX}${profileId}`
      );
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          typeof parsed?.x === 'number' &&
          typeof parsed?.y === 'number' &&
          parsed.x >= 240 &&
          parsed.x <= 2560 &&
          parsed.y >= 200 &&
          parsed.y <= 1650
        ) {
          return { x: Math.round(parsed.x), y: Math.round(parsed.y) };
        }
      }
    } catch {
      // ignore storage errors
    }
  }
  if (profileId && !profileId.startsWith('guest_')) {
    const det = getDeterministicWorldCoords(profileId);
    return { x: det.worldX, y: det.worldY };
  }
  return DEFAULT_GARDEN_WORLD_POS;
}

export interface WorldMapViewProps {
  profile: UserProfile;
  trees?: TreeData[];
  onEnterGarden: () => void;
  onEnterCity?: (initialWing?: 'university' | 'school_workshop') => void;
  onVisitGarden: (garden: VisitorGarden) => void;
  onHelpNeighbor: (gardenName: string) => void;
  onStartChatWithPlayer?: (target: ChatTargetUser) => void;
  onOpenGroupModal?: (groupId?: string) => void;
  myLeaderGroup?: WorldGroup | null;
  onInviteToGroup?: (target: ChatTargetUser) => Promise<void> | void;
  focusedGroup?: WorldGroup | null;
  onRewardCoins?: (coinsAdded: number) => void;
  onUpdateGardenCoords?: (coords: { x: number; y: number }) => void;
  onRelocateGroupCoords?: (
    group: WorldGroup,
    coords: { x: number; y: number }
  ) => Promise<void> | void;
  relocateGroupTrigger?: number;
  initialFocus?: 'overview' | 'university' | 'school' | 'workshop';
}

type CameraAnglePreset = 'isometric_25d' | 'elevated_25d' | 'cinematic_low';

const CAMERA_PRESETS: Record<
  CameraAnglePreset,
  { label: string; stageTransform: string }
> = {
  isometric_25d: {
    label: 'ایزومتریک ۲.۵بعدی',
    stageTransform: 'scaleY(0.97)',
  },
  elevated_25d: {
    label: 'نمای مرتفع ۲.۵بعدی',
    stageTransform: 'scaleY(1.04) rotate(-1.5deg)',
  },
  cinematic_low: {
    label: 'نمای نزدیک ۲.۵بعدی',
    stageTransform: 'rotate(-3.5deg) scaleY(0.93) skewX(-1.5deg)',
  },
};

interface MapTerritoryNode {
  id: string;
  type:
    | 'player_base'
    | 'university_campus'
    | 'school_campus'
    | 'workshop_campus'
    | 'neighbor_base'
    | 'group_hq'
    | 'resource_node';
  landmarkKind?: 'shrine' | 'spring' | 'greenhouse';
  title: string;
  subtitle: string;
  coords: string;
  level: number;
  power: number;
  x: number;
  y: number;
  neighborData?: VisitorGarden;
  groupData?: WorldGroup;
  isLiveCloudPlayer?: boolean;
  cloudUid?: string;
  cloudAvatarConfig?: AvatarConfig;
  cloudGender?: AvatarGender;
}

// Organically scattered (non-symmetrical) Hand-Painted 2.5D Forest Trees across the enlarged 2800x1850 World
const WORLD_FOREST_TREES: {
  x: number;
  y: number;
  scale: number;
  kind: 'pine' | 'oak' | 'cypress';
}[] = [
  // Northern & North-West Woodland
  { x: 260, y: 155, scale: 1.24, kind: 'pine' },
  { x: 430, y: 125, scale: 1.18, kind: 'oak' },
  { x: 640, y: 175, scale: 1.12, kind: 'cypress' },
  { x: 850, y: 135, scale: 1.2, kind: 'pine' },
  { x: 1090, y: 150, scale: 1.16, kind: 'oak' },
  { x: 1360, y: 120, scale: 1.22, kind: 'pine' },
  { x: 1640, y: 145, scale: 1.15, kind: 'cypress' },
  { x: 1940, y: 135, scale: 1.25, kind: 'oak' },
  { x: 2220, y: 150, scale: 1.2, kind: 'pine' },
  { x: 2480, y: 130, scale: 1.24, kind: 'oak' },

  // Western Valley Woods (Asymmetric cluster)
  { x: 215, y: 320, scale: 1.22, kind: 'oak' },
  { x: 330, y: 450, scale: 1.14, kind: 'pine' },
  { x: 205, y: 610, scale: 1.2, kind: 'cypress' },
  { x: 295, y: 780, scale: 1.16, kind: 'oak' },
  { x: 235, y: 960, scale: 1.24, kind: 'pine' },
  { x: 325, y: 1150, scale: 1.18, kind: 'oak' },
  { x: 245, y: 1340, scale: 1.22, kind: 'pine' },
  { x: 315, y: 1520, scale: 1.2, kind: 'cypress' },

  // Eastern Riverbank & Highland Woods
  { x: 2490, y: 295, scale: 1.24, kind: 'pine' },
  { x: 2390, y: 485, scale: 1.15, kind: 'oak' },
  { x: 2540, y: 670, scale: 1.22, kind: 'cypress' },
  { x: 2450, y: 870, scale: 1.16, kind: 'pine' },
  { x: 2560, y: 1080, scale: 1.24, kind: 'oak' },
  { x: 2440, y: 1290, scale: 1.18, kind: 'cypress' },
  { x: 2530, y: 1490, scale: 1.22, kind: 'pine' },

  // Scattered Meadow Groves (Organic, non-symmetrical)
  { x: 1090, y: 585, scale: 0.94, kind: 'cypress' },
  { x: 1545, y: 465, scale: 0.92, kind: 'oak' },
  { x: 1645, y: 815, scale: 0.9, kind: 'pine' },
  { x: 990, y: 975, scale: 0.95, kind: 'oak' },
  { x: 1435, y: 1185, scale: 0.92, kind: 'cypress' },
  { x: 690, y: 1060, scale: 0.96, kind: 'pine' },
  { x: 2040, y: 740, scale: 0.95, kind: 'oak' },

  // Southern Horizon Woods
  { x: 480, y: 1640, scale: 1.22, kind: 'pine' },
  { x: 740, y: 1690, scale: 1.18, kind: 'oak' },
  { x: 1080, y: 1675, scale: 1.15, kind: 'cypress' },
  { x: 1440, y: 1700, scale: 1.2, kind: 'oak' },
  { x: 1790, y: 1665, scale: 1.16, kind: 'pine' },
  { x: 2110, y: 1690, scale: 1.24, kind: 'oak' },
  { x: 2380, y: 1650, scale: 1.2, kind: 'pine' },
];

// Memoized freeze wrapper for purely static terrain layers
const StaticWorldTerrainFreeze = React.memo<{ children: React.ReactNode }>(
  ({ children }) => <>{children}</>,
  () => true
);

export const WorldMapView: React.FC<WorldMapViewProps> = ({
  profile,
  trees = [],
  onEnterGarden,
  onVisitGarden,
  onHelpNeighbor,
  onStartChatWithPlayer,
  onOpenGroupModal,
  myLeaderGroup = null,
  onInviteToGroup,
  focusedGroup = null,
  onRewardCoins,
  onUpdateGardenCoords,
  onRelocateGroupCoords,
  relocateGroupTrigger = 0,
  initialFocus = 'overview',
}) => {
  const playerUnlockedTreeCount = Math.max(
    1,
    trees.filter((t) => t.unlocked).length || 3
  );
  const [selectedNode, setSelectedNode] = useState<MapTerritoryNode | null>(
    null
  );
  const [cameraAngle] = useState<CameraAnglePreset>('isometric_25d');

  // Player's Movable Garden Coordinates on the World Map
  const [gardenWorldPos, setGardenWorldPos] = useState<{ x: number; y: number }>(
    () => loadSavedGardenWorldPos(profile.id, profile.coords)
  );
  const [isRelocatingGarden, setIsRelocatingGarden] = useState<boolean>(false);
  const [isDraggingGardenNode, setIsDraggingGardenNode] =
    useState<boolean>(false);
  const [isRelocatingGroupTent, setIsRelocatingGroupTent] =
    useState<boolean>(false);
  const [isDraggingGroupTent, setIsDraggingGroupTent] =
    useState<boolean>(false);
  const [optimisticGroupPosById, setOptimisticGroupPosById] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [relocateToast, setRelocateToast] = useState<string | null>(null);
  const [cloudNeighbors, setCloudNeighbors] = useState<
    LiveCloudNeighborGarden[]
  >([]);
  const [worldGroups, setWorldGroups] = useState<WorldGroup[]>([]);
  const [invitedUids, setInvitedUids] = useState<Record<string, boolean>>({});
  const [isNeighborDrawerOpen, setIsNeighborDrawerOpen] =
    useState<boolean>(false);

  useEffect(() => {
    setGardenWorldPos(loadSavedGardenWorldPos(profile.id, profile.coords));
  }, [profile.id, profile.coords?.x, profile.coords?.y]);

  useEffect(() => {
    const unsubscribe = subscribeToPublicWorldGardens(
      profile.id,
      (liveGardens) => {
        setCloudNeighbors(liveGardens);
      }
    );
    return () => unsubscribe();
  }, [profile.id]);

  useEffect(() => {
    const unsubscribe = subscribeToPublicGroups((groups) => {
      setWorldGroups(groups);
    });
    return () => unsubscribe();
  }, []);

  const placedWorldGroups = React.useMemo(() => {
    const resolved = resolveGroupWorldPositions(
      worldGroups,
      optimisticGroupPosById
    );
    return resolved.map((g) => ({
      uid: g.id,
      worldX: g.worldX,
      worldY: g.worldY,
      group: g,
    }));
  }, [worldGroups, optimisticGroupPosById]);

  const placedCloudNeighbors = React.useMemo(
    () =>
      resolveNonOverlappingWorldCoords(
        cloudNeighbors,
        gardenWorldPos,
        placedWorldGroups.map((pg) => ({ x: pg.worldX, y: pg.worldY }))
      ),
    [cloudNeighbors, gardenWorldPos.x, gardenWorldPos.y, placedWorldGroups]
  );

  // Interactive Overlay States within the Unified 2.5D World
  const [uniModalState, setUniModalState] = useState<{
    isOpen: boolean;
    courseIndex: number;
    lessonIndex: number;
    navStep: UniversityNavigationStep;
    sessionMode: 'practice' | 'exam';
  }>({
    isOpen: false,
    courseIndex: 0,
    lessonIndex: 0,
    navStep: 'entrance_courses',
    sessionMode: 'practice',
  });

  const [activeCityCourse, setActiveCityCourse] = useState<CourseData | null>(
    null
  );
  const [cityCourseOrigin, setCityCourseOrigin] = useState<
    'school' | 'workshop' | null
  >(null);
  const [activeDistrictCatalog, setActiveDistrictCatalog] = useState<
    'school' | 'workshop' | null
  >(null);
  const [completedCourseIds, setCompletedCourseIds] = useState<string[]>([]);
  const [quizSelection, setQuizSelection] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);

  // Camera Pan & Zoom State
  const getInitialZoom = () => {
    if (typeof window === 'undefined') return 0.85;
    if (window.innerWidth < 420) return 0.54;
    if (window.innerWidth < 640) return 0.64;
    if (window.innerWidth < 1024) return 0.76;
    return 0.88;
  };

  // Asymmetric building coordinates across the enlarged 2800x1850 World:
  // University: (1920, 520), School: (820, 710), Workshop: (1760, 1140)
  const getFocusPan = (
    focus: 'overview' | 'university' | 'school' | 'workshop'
  ) => {
    if (focus === 'university') return { x: -460, y: 340 };
    if (focus === 'school') return { x: 520, y: 190 };
    if (focus === 'workshop') return { x: -320, y: -195 };
    return { x: 0, y: 20 };
  };

  const [zoom, setZoom] = useState<number>(getInitialZoom);
  const [pan, setPan] = useState<{ x: number; y: number }>(() =>
    getFocusPan(initialFocus)
  );

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const innerStageRef = useRef<HTMLDivElement | null>(null);
  const latestDraggedGardenPosRef = useRef<{ x: number; y: number } | null>(null);
  const latestDraggedGroupPosRef = useRef<{ x: number; y: number } | null>(null);
  const panRef = useRef<{ x: number; y: number }>(getFocusPan(initialFocus));
  const zoomRef = useRef<number>(zoom);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>(panRef.current);
  const hasMovedRef = useRef<boolean>(false);
  const pinchDistanceRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const wheelSyncTimerRef = useRef<number | null>(null);

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
      if (wheelSyncTimerRef.current !== null)
        window.clearTimeout(wheelSyncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const nextPan = getFocusPan(initialFocus);
    panRef.current = nextPan;
    setPan(nextPan);
    scheduleStageTransform();
  }, [initialFocus]);

  useEffect(() => {
    if (!focusedGroup) return;
    const placed = placedWorldGroups.find((pg) => pg.group.id === focusedGroup.id);
    const tx = placed ? placed.worldX : focusedGroup.worldX;
    const ty = placed ? placed.worldY : focusedGroup.worldY;
    const nextPan = {
      x: Math.max(-1050, Math.min(1050, 1400 - tx)),
      y: Math.max(-760, Math.min(760, 925 - ty)),
    };
    panRef.current = nextPan;
    setPan(nextPan);
    scheduleStageTransform();
  }, [focusedGroup?.id]);

  useEffect(() => {
    if (!relocateGroupTrigger || !myLeaderGroup) return;
    setIsRelocatingGarden(false);
    setIsRelocatingGroupTent(true);
    setSelectedNode(null);
    const placed = placedWorldGroups.find((pg) => pg.group.id === myLeaderGroup.id);
    const tx = placed ? placed.worldX : myLeaderGroup.worldX;
    const ty = placed ? placed.worldY : myLeaderGroup.worldY;
    const nextPan = {
      x: Math.max(-1050, Math.min(1050, 1400 - tx)),
      y: Math.max(-760, Math.min(760, 925 - ty)),
    };
    panRef.current = nextPan;
    setPan(nextPan);
    scheduleStageTransform();
  }, [relocateGroupTrigger]);

  useEffect(() => {
    const handleResize = () => {
      const nextZoom = getInitialZoom();
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
      scheduleStageTransform();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const schoolAndWorkshopCourses = CITY_COURSES.filter(
    (c) => c.building === 'school' || c.building === 'workshop'
  );

  const saveNewGardenPosition = (
    nextPos: { x: number; y: number },
    syncToCloud: boolean = true
  ) => {
    const clamped = {
      x: Math.max(280, Math.min(2520, Math.round(nextPos.x))),
      y: Math.max(220, Math.min(1620, Math.round(nextPos.y))),
    };
    latestDraggedGardenPosRef.current = clamped;
    setGardenWorldPos(clamped);
    if (!syncToCloud) return;
    try {
      window.localStorage.setItem(
        `${GARDEN_WORLD_POS_STORAGE_PREFIX}${profile.id}`,
        JSON.stringify(clamped)
      );
    } catch {
      // ignore storage errors
    }
    if (onUpdateGardenCoords) {
      onUpdateGardenCoords(clamped);
    }
  };

  const saveNewGroupTentPosition = (
    nextPos: { x: number; y: number },
    syncToCloud: boolean = true
  ) => {
    if (!myLeaderGroup) return;
    const clamped = clampWorldCoords(nextPos.x, nextPos.y);
    latestDraggedGroupPosRef.current = clamped;
    setOptimisticGroupPosById((prev) => ({
      ...prev,
      [myLeaderGroup.id]: clamped,
    }));
    if (!syncToCloud || !onRelocateGroupCoords) return;
    Promise.resolve(onRelocateGroupCoords(myLeaderGroup, clamped)).catch(() => {
      setRelocateToast('خطا در ذخیره مکان چادر گروه. اتصال را بررسی کنید.');
      setTimeout(() => setRelocateToast(null), 2600);
    });
  };

  const clientPointToStageCoords = (
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null => {
    const el = innerStageRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = ((clientX - rect.left) / rect.width) * 2800;
    const y = ((clientY - rect.top) / rect.height) * 1850;
    return {
      x: Math.max(280, Math.min(2520, Math.round(x))),
      y: Math.max(220, Math.min(1620, Math.round(y))),
    };
  };

  // Asymmetric, Single-Building World & City Territories (No course sub-houses, no symmetry)
  const territories: MapTerritoryNode[] = useMemo(
    () => [
      {
        id: 'player_sanctuary',
        type: 'player_base',
        title: `باغ ${profile.name}`,
        subtitle: 'عمارت و قلمرو سرسبز درختان مهارت شما',
        coords: `X:${gardenWorldPos.x} Y:${gardenWorldPos.y}`,
        level: 20,
        power: 12450 + (profile.coins || 0) * 15,
        x: gardenWorldPos.x,
        y: gardenWorldPos.y,
      },
      {
        id: 'university_campus_compound',
        type: 'university_campus',
        title: 'دانشگاه انجلرن',
        subtitle: 'تالار آموزش عالی و ۶ قالب بازی علمی',
        coords: 'X:1920 Y:520',
        level: 30,
        power: 85000,
        x: 1920,
        y: 520,
      },
      {
        id: 'school_campus_compound',
        type: 'school_campus',
        title: 'مدرسه مهارت‌ها',
        subtitle: 'آموزش تندخوانی، تمرکز، عادت‌سازی و مهارت‌های عملی',
        coords: 'X:820 Y:710',
        level: 26,
        power: 64000,
        x: 820,
        y: 710,
      },
      ...placedCloudNeighbors.map((cn) => ({
        id: cn.visitorGarden.id,
        type: 'neighbor_base' as const,
        title: `باغ ${cn.visitorGarden.ownerName}`,
        subtitle: `بازیکن آنلاین • ${cn.unlockedTreeCount} درخت شکوفا • ${cn.visitorGarden.streakDays} روز پیوستگی`,
        coords: `X:${cn.worldX} Y:${cn.worldY}`,
        level: Math.max(1, cn.visitorGarden.streakDays + cn.unlockedTreeCount),
        power: 5000 + cn.unlockedTreeCount * 1500 + cn.visitorGarden.streakDays * 250,
        x: cn.worldX,
        y: cn.worldY,
        neighborData: cn.visitorGarden,
        isLiveCloudPlayer: true,
        cloudUid: cn.uid,
        cloudAvatarConfig: cn.avatarConfig,
        cloudGender: cn.visitorGarden.gender,
      })),
      ...placedWorldGroups.map(({ worldX, worldY, group }) => {
        const tier = getGroupTierMeta(group.buildingLevel);
        return {
          id: `group_${group.id}`,
          type: 'group_hq' as const,
          title: group.name,
          subtitle: `${tier.title} (سطح ${group.buildingLevel}) • ${group.memberCount} عضو`,
          coords: `X:${worldX} Y:${worldY}`,
          level: group.buildingLevel,
          power: group.totalContributedCoins,
          x: worldX,
          y: worldY,
          groupData: group,
        };
      }),
    ],
    [
      profile.name,
      profile.coins,
      gardenWorldPos.x,
      gardenWorldPos.y,
      placedCloudNeighbors,
      placedWorldGroups,
    ]
  );

  const handleCompleteCityCourse = (courseId: string) => {
    if (quizSelection !== 1) {
      sound.playClick();
      setQuizFeedback(
        'پاسخ نادرست است! لطفاً مفهوم کلیدی درس را دوباره بررسی کنید.'
      );
      return;
    }
    sound.playCoin();
    if (!completedCourseIds.includes(courseId)) {
      setCompletedCourseIds((prev) => [...prev, courseId]);
      if (onRewardCoins) {
        onRewardCoins(10);
      }
    }
    setQuizFeedback(null);
    setQuizSelection(null);
    setActiveCityCourse(null);
  };

  // Focus camera smoothly on a specific district and open it directly
  const handleFocusDistrict = (
    target: 'overview' | 'university' | 'school' | 'workshop' | 'sanctuary'
  ) => {
    sound.playClick();
    setSelectedNode(null);
    let nextPan = { x: 0, y: 20 };
    if (target === 'university') {
      nextPan = { x: -460, y: 340 };
      setUniModalState({
        isOpen: true,
        courseIndex: 0,
        lessonIndex: 0,
        navStep: 'entrance_courses',
        sessionMode: 'practice',
      });
    } else if (target === 'school' || target === 'workshop') {
      nextPan = { x: 520, y: 190 };
      setActiveDistrictCatalog('school');
    } else if (target === 'sanctuary') {
      nextPan = {
        x: Math.max(-1050, Math.min(1050, 1400 - gardenWorldPos.x)),
        y: Math.max(-760, Math.min(760, 925 - gardenWorldPos.y)),
      };
    }
    panRef.current = nextPan;
    setPan(nextPan);
    scheduleStageTransform();
  };

  // Mouse & Touch Camera Controls (plus Garden & Group Tent Relocation Mode support)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    hasMovedRef.current = false;
    if (isDraggingGardenNode || isDraggingGroupTent) return;
    isDraggingRef.current = true;
    if (stageWrapperRef.current) {
      stageWrapperRef.current.style.transition = 'none';
    }
    setGrabbingCursor(true);
    panStartRef.current = { ...panRef.current };
    dragStartRef.current = {
      x: e.clientX - panRef.current.x,
      y: e.clientY - panRef.current.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingGardenNode) {
      hasMovedRef.current = true;
      const coords = clientPointToStageCoords(e.clientX, e.clientY);
      if (coords) {
        saveNewGardenPosition(coords, false);
      }
      return;
    }
    if (isDraggingGroupTent) {
      hasMovedRef.current = true;
      const coords = clientPointToStageCoords(e.clientX, e.clientY);
      if (coords) {
        saveNewGroupTentPosition(coords, false);
      }
      return;
    }
    if (!isDraggingRef.current) return;
    const dx = Math.max(-1050, Math.min(1050, e.clientX - dragStartRef.current.x));
    const dy = Math.max(-760, Math.min(760, e.clientY - dragStartRef.current.y));
    if (
      Math.abs(dx - panStartRef.current.x) > 5 ||
      Math.abs(dy - panStartRef.current.y) > 5
    ) {
      hasMovedRef.current = true;
    }
    panRef.current = { x: dx, y: dy };
    scheduleStageTransform();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingGardenNode) {
      setIsDraggingGardenNode(false);
      if (latestDraggedGardenPosRef.current) {
        saveNewGardenPosition(latestDraggedGardenPosRef.current, true);
      }
      sound.playCoin();
      setRelocateToast('مکان جدید باغ ذخیره شد ✨');
      setTimeout(() => setRelocateToast(null), 2200);
      return;
    }
    if (isDraggingGroupTent) {
      setIsDraggingGroupTent(false);
      if (latestDraggedGroupPosRef.current) {
        saveNewGroupTentPosition(latestDraggedGroupPosRef.current, true);
      }
      sound.playCoin();
      setRelocateToast('مکان جدید چادر گروه ذخیره شد ⛺✨');
      setTimeout(() => setRelocateToast(null), 2200);
      return;
    }

    const wasDraggingCamera = isDraggingRef.current;
    const didMoveCamera = hasMovedRef.current;

    if (wasDraggingCamera) {
      isDraggingRef.current = false;
      if (stageWrapperRef.current) {
        stageWrapperRef.current.style.transition = '';
      }
      setGrabbingCursor(false);
      if (didMoveCamera) {
        setPan({ ...panRef.current });
      }
    }

    // If user is in Group Tent Relocate Mode and clicked/tapped on the map without panning
    if (
      isRelocatingGroupTent &&
      myLeaderGroup &&
      !didMoveCamera &&
      !(e.target as HTMLElement).closest('button')
    ) {
      const coords = clientPointToStageCoords(e.clientX, e.clientY);
      if (coords) {
        sound.playCoin();
        saveNewGroupTentPosition(coords, true);
        setRelocateToast('چادر گروه به مکان جدید منتقل شد ⛺✨');
        setTimeout(() => setRelocateToast(null), 2200);
      }
      return;
    }

    // If user is in Garden Relocate Mode and clicked/tapped on the map without panning
    if (
      isRelocatingGarden &&
      !didMoveCamera &&
      !(e.target as HTMLElement).closest('button')
    ) {
      const coords = clientPointToStageCoords(e.clientX, e.clientY);
      if (coords) {
        sound.playCoin();
        saveNewGardenPosition(coords, true);
        setRelocateToast('باغ شما به مکان جدید منتقل شد ✨');
        setTimeout(() => setRelocateToast(null), 2200);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    hasMovedRef.current = false;
    if (isDraggingGardenNode || isDraggingGroupTent) return;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistanceRef.current = Math.hypot(dx, dy);
      isDraggingRef.current = false;
      setGrabbingCursor(false);
      if (stageWrapperRef.current) {
        stageWrapperRef.current.style.transition = 'none';
      }
      return;
    }
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      if (stageWrapperRef.current) {
        stageWrapperRef.current.style.transition = 'none';
      }
      setGrabbingCursor(true);
      panStartRef.current = { ...panRef.current };
      dragStartRef.current = {
        x: e.touches[0].clientX - panRef.current.x,
        y: e.touches[0].clientY - panRef.current.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDraggingGardenNode && e.touches.length === 1) {
      hasMovedRef.current = true;
      const coords = clientPointToStageCoords(
        e.touches[0].clientX,
        e.touches[0].clientY
      );
      if (coords) {
        saveNewGardenPosition(coords, false);
      }
      return;
    }
    if (isDraggingGroupTent && e.touches.length === 1) {
      hasMovedRef.current = true;
      const coords = clientPointToStageCoords(
        e.touches[0].clientX,
        e.touches[0].clientY
      );
      if (coords) {
        saveNewGroupTentPosition(coords, false);
      }
      return;
    }
    if (e.touches.length === 2 && pinchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = (dist - pinchDistanceRef.current) * 0.003;
      pinchDistanceRef.current = dist;
      const nextZoom = Math.max(
        0.45,
        Math.min(1.45, Number((zoomRef.current + delta).toFixed(2)))
      );
      zoomRef.current = nextZoom;
      scheduleStageTransform();
      return;
    }
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = Math.max(
      -1050,
      Math.min(1050, e.touches[0].clientX - dragStartRef.current.x)
    );
    const dy = Math.max(
      -760,
      Math.min(760, e.touches[0].clientY - dragStartRef.current.y)
    );
    if (
      Math.abs(dx - panStartRef.current.x) > 5 ||
      Math.abs(dy - panStartRef.current.y) > 5
    ) {
      hasMovedRef.current = true;
    }
    panRef.current = { x: dx, y: dy };
    scheduleStageTransform();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDraggingGardenNode) {
      setIsDraggingGardenNode(false);
      if (latestDraggedGardenPosRef.current) {
        saveNewGardenPosition(latestDraggedGardenPosRef.current, true);
      }
      sound.playCoin();
      setRelocateToast('مکان جدید باغ ذخیره شد ✨');
      setTimeout(() => setRelocateToast(null), 2200);
      return;
    }
    if (isDraggingGroupTent) {
      setIsDraggingGroupTent(false);
      if (latestDraggedGroupPosRef.current) {
        saveNewGroupTentPosition(latestDraggedGroupPosRef.current, true);
      }
      sound.playCoin();
      setRelocateToast('مکان جدید چادر گروه ذخیره شد ⛺✨');
      setTimeout(() => setRelocateToast(null), 2200);
      return;
    }
    const wasPinching = pinchDistanceRef.current !== null;
    const didMoveCamera = hasMovedRef.current;
    pinchDistanceRef.current = null;
    if (isDraggingRef.current || wasPinching) {
      isDraggingRef.current = false;
      if (stageWrapperRef.current) {
        stageWrapperRef.current.style.transition = '';
      }
      setGrabbingCursor(false);
      if (didMoveCamera) {
        setPan({ ...panRef.current });
      }
      if (wasPinching) setZoom(zoomRef.current);
    }

    if (
      isRelocatingGroupTent &&
      myLeaderGroup &&
      !didMoveCamera &&
      !wasPinching &&
      e.changedTouches.length === 1 &&
      !(e.target as HTMLElement).closest('button')
    ) {
      const touch = e.changedTouches[0];
      const coords = clientPointToStageCoords(touch.clientX, touch.clientY);
      if (coords) {
        sound.playCoin();
        saveNewGroupTentPosition(coords, true);
        setRelocateToast('چادر گروه به مکان جدید منتقل شد ⛺✨');
        setTimeout(() => setRelocateToast(null), 2200);
      }
      return;
    }

    if (
      isRelocatingGarden &&
      !didMoveCamera &&
      !wasPinching &&
      e.changedTouches.length === 1 &&
      !(e.target as HTMLElement).closest('button')
    ) {
      const touch = e.changedTouches[0];
      const coords = clientPointToStageCoords(touch.clientX, touch.clientY);
      if (coords) {
        sound.playCoin();
        saveNewGardenPosition(coords);
        setRelocateToast('باغ شما به مکان جدید منتقل شد ✨');
        setTimeout(() => setRelocateToast(null), 2200);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const nextZoom = Math.max(
      0.45,
      Math.min(1.45, Number((zoomRef.current + delta).toFixed(2)))
    );
    zoomRef.current = nextZoom;
    scheduleStageTransform();
    if (wheelSyncTimerRef.current !== null)
      window.clearTimeout(wheelSyncTimerRef.current);
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
    const nextZoom = getInitialZoom();
    panRef.current = { x: 0, y: 20 };
    zoomRef.current = nextZoom;
    setPan({ x: 0, y: 20 });
    setZoom(nextZoom);
    scheduleStageTransform();
  };

  const territoriesRef = useRef<MapTerritoryNode[]>(territories);
  territoriesRef.current = territories;

  const handleSelectWalker = useCallback(
    (walker: LiveWorldPlayerWalker) => {
      if (hasMovedRef.current) return;
      sound.playClick();
      if (walker.isSelf) {
        onEnterGarden();
        return;
      }
      if (walker.neighborData) {
        const matchedNode = territoriesRef.current.find(
          (t) => t.id === walker.neighborData!.id
        );
        if (matchedNode) {
          setSelectedNode(matchedNode);
        } else {
          onVisitGarden(walker.neighborData);
        }
      }
    },
    [onEnterGarden, onVisitGarden]
  );

  const stageTransformStyle = CAMERA_PRESETS[cameraAngle].stageTransform;

  return (
    <div
      ref={viewportRef}
      className={`relative w-full h-[100dvh] overflow-hidden select-none bg-[#123826] ${
        isRelocatingGarden || isRelocatingGroupTent
          ? 'cursor-crosshair'
          : 'cursor-grab'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Soothing Botanical Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_45%_35%,rgba(45,122,83,0.06)_0%,rgba(18,56,38,0.18)_55%,rgba(6,20,15,0.36)_100%)]" />

      {/* Top Banner when Garden or Group Tent Relocation Mode is active or toast notification */}
      {(isRelocatingGarden || isRelocatingGroupTent || relocateToast) && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#0a1d17]/96 border-2 border-amber-400 px-3.5 sm:px-5 py-2 rounded-2xl text-xs sm:text-sm font-black text-amber-100 shadow-[0_8px_24px_rgba(0,0,0,0.5)] pointer-events-auto"
        >
          <span>
            {relocateToast ||
              (isRelocatingGroupTent
                ? `حالت جابه‌جایی چادر گروه «${myLeaderGroup?.name || ''}»: روی زمین کلیک کنید یا چادر را بکشید`
                : 'حالت جابه‌جایی باغ: روی هر نقطه از زمین کلیک کنید یا باغ را بکشید')}
          </span>
          {(isRelocatingGarden || isRelocatingGroupTent) && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setIsRelocatingGarden(false);
                setIsRelocatingGroupTent(false);
              }}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-b from-[#fde68a] to-[#fbbf24] text-slate-950 text-[11px] font-black cursor-pointer shrink-0"
            >
              {isRelocatingGroupTent ? 'ثبت مکان چادر ✓' : 'ثبت مکان ✓'}
            </button>
          )}
        </div>
      )}

      {/* =========================================================================
          RIGHT EDGE WORLD & CITY DISTRICT NAVIGATOR (Shifted 1 slot down below Avatar & Quests)
         ========================================================================= */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="fixed top-[110px] sm:top-[132px] right-1.5 sm:right-3.5 z-30 flex flex-col gap-1.5 sm:gap-2 pointer-events-auto"
      >
        <button
          onClick={() => handleFocusDistrict('university')}
          className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:translate-y-[2px] ${
            selectedNode?.type === 'university_campus'
              ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] border-white text-slate-950 shadow-[0_3px_0_#78350f] scale-105'
              : 'bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 border-[#f59e0b]/90 text-amber-200 shadow-[0_3px_0_#78350f,0_6px_12px_rgba(4,24,16,0.4)]'
          }`}
          title="دانشگاه"
        >
          <GraduationCap className={`w-4 h-4 sm:w-5 sm:h-5 ${selectedNode?.type === 'university_campus' ? 'text-slate-950' : 'text-amber-300'}`} />
          <span className="text-[8.5px] sm:text-[9px] font-black leading-none">
            دانشگاه
          </span>
        </button>

        <button
          onClick={() => handleFocusDistrict('school')}
          className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:translate-y-[2px] ${
            selectedNode?.type === 'school_campus'
              ? 'bg-gradient-to-b from-[#bae6fd] via-[#7dd3fc] to-[#38bdf8] border-white text-slate-950 shadow-[0_3px_0_#0369a1] scale-105'
              : 'bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 border-[#38bdf8]/90 text-sky-100 shadow-[0_3px_0_#0369a1,0_6px_12px_rgba(4,24,16,0.4)]'
          }`}
          title="مدرسه مهارت‌ها"
        >
          <School className={`w-4 h-4 sm:w-5 sm:h-5 ${selectedNode?.type === 'school_campus' ? 'text-slate-950' : 'text-sky-300'}`} />
          <span className="text-[8.5px] sm:text-[9px] font-black leading-none">
            مدرسه
          </span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setIsNeighborDrawerOpen((prev) => !prev);
          }}
          className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:translate-y-[2px] ${
            isNeighborDrawerOpen
              ? 'bg-gradient-to-b from-[#d9f99d] via-[#bef264] to-[#84cc16] border-white text-slate-950 shadow-[0_3px_0_#365314] scale-105'
              : 'bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 border-lime-400/90 text-lime-200 shadow-[0_3px_0_#365314,0_6px_12px_rgba(4,24,16,0.4)]'
          }`}
          title="باغ کاربران ثبت‌نام‌شده در جهان"
        >
          <Users className={`w-4 h-4 sm:w-5 sm:h-5 ${isNeighborDrawerOpen ? 'text-slate-950' : 'text-lime-300'}`} />
          <span className="text-[8.5px] sm:text-[9px] font-black leading-none">
            همسایه‌ها
          </span>
          {placedCloudNeighbors.length > 0 && (
            <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-lime-300 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-950 shadow">
              {placedCloudNeighbors.length}
            </span>
          )}
        </button>

        {onOpenGroupModal && (
          <button
            onClick={() => {
              sound.playClick();
              onOpenGroupModal();
            }}
            className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-2xl border-2 bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 border-amber-400/90 text-amber-200 shadow-[0_3px_0_#78350f,0_6px_12px_rgba(4,24,16,0.4)] flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:translate-y-[2px]"
            title="گروه‌های جهان و ساخت یا ارتقای ساختمان گروه"
          >
            <HudGroupTentIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[8.5px] sm:text-[9px] font-black leading-none">
              گروه‌ها
            </span>
            {placedWorldGroups.length > 0 && (
              <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-300 text-slate-950 text-[10px] font-black flex items-center justify-center border border-slate-950 shadow">
                {placedWorldGroups.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* =========================================================================
          QUICK DRAWER FOR REGISTERED PLAYERS' GARDENS ON THE WORLD MAP
         ========================================================================= */}
      {isNeighborDrawerOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed top-[110px] sm:top-[132px] right-14 sm:right-20 z-40 w-64 sm:w-72 rounded-3xl bg-gradient-to-b from-[#0f241d]/98 via-[#0a1a15]/98 to-[#06110d]/99 border-2 border-lime-400/85 p-3 shadow-[0_14px_34px_rgba(0,0,0,0.7)] text-slate-50 animate-fadeIn pointer-events-auto"
        >
          <div className="flex items-center justify-between border-b border-emerald-300/20 pb-2 mb-2">
            <span className="text-xs font-black text-lime-200 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-lime-300" />
              <span>باغ بازیکنان در جهان ({placedCloudNeighbors.length})</span>
            </span>
            <button
              type="button"
              onClick={() => setIsNeighborDrawerOpen(false)}
              className="p-1 rounded-lg bg-[#143026] hover:bg-[#1c4436] text-slate-100 cursor-pointer"
              aria-label="بستن لیست همسایه‌ها"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {placedCloudNeighbors.length === 0 ? (
            <p className="text-[11px] text-slate-200 leading-relaxed py-2 text-center">
              هنوز بازیکن دیگری با حساب گوگل وارد جهان نشده است. به محض ورود هر حساب جیمیل جدید، باغ و آواتارش اینجا نمایش داده می‌شود.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
              {placedCloudNeighbors.map((cn) => {
                const targetNode = territories.find(
                  (t) => t.id === cn.visitorGarden.id
                );
                return (
                  <button
                    key={cn.uid}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      const nextPan = {
                        x: Math.max(-1050, Math.min(1050, 1400 - cn.worldX)),
                        y: Math.max(-760, Math.min(760, 925 - cn.worldY)),
                      };
                      panRef.current = nextPan;
                      setPan(nextPan);
                      scheduleStageTransform();
                      if (targetNode) setSelectedNode(targetNode);
                      setIsNeighborDrawerOpen(false);
                    }}
                    className="w-full p-2 rounded-2xl bg-[#143026] hover:bg-[#1b4033] border border-emerald-300/25 hover:border-lime-300 flex items-center justify-between gap-2 text-right cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CharacterAvatar
                        gender={cn.visitorGarden.gender}
                        config={cn.avatarConfig}
                        variant="full"
                        showBackdrop={false}
                        size={30}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">
                          باغ {cn.visitorGarden.ownerName}
                        </div>
                        <div className="text-[10px] text-lime-200 font-bold">
                          {cn.unlockedTreeCount} درخت • {cn.visitorGarden.streakDays} روز استمرار
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-lime-400/20 text-lime-200 border border-lime-400/50 px-2 py-0.5 rounded-xl shrink-0">
                      مشاهده
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          BOTTOM OF SCREEN: RELOCATE PLAYER GARDEN & LEADER GROUP TENT BUTTONS
         ========================================================================= */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 pointer-events-auto"
      >
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setIsRelocatingGroupTent(false);
            setIsRelocatingGarden((prev) => !prev);
            setSelectedNode(null);
          }}
          className={`px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer active:translate-y-[2px] font-black text-[11px] sm:text-sm whitespace-nowrap ${
            isRelocatingGarden
              ? 'bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] border-white text-slate-950 shadow-[0_4px_0_#78350f,0_8px_18px_rgba(0,0,0,0.4)] scale-105'
              : 'bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 border-[#f59e0b]/90 text-amber-200 shadow-[0_4px_0_#78350f,0_8px_18px_rgba(4,24,16,0.45)]'
          }`}
          title="جابه‌جایی مکان باغ در جهان"
        >
          {isRelocatingGarden ? (
            <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.8]" />
          ) : (
            <Move className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
          )}
          <span>
            {isRelocatingGarden ? 'ثبت مکان باغ' : 'جابه‌جایی باغ'}
          </span>
        </button>

        {myLeaderGroup && (
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsRelocatingGarden(false);
              setIsRelocatingGroupTent((prev) => !prev);
              setSelectedNode(null);
            }}
            className={`px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer active:translate-y-[2px] font-black text-[11px] sm:text-sm whitespace-nowrap ${
              isRelocatingGroupTent
                ? 'bg-gradient-to-b from-[#bae6fd] via-[#7dd3fc] to-[#38bdf8] border-white text-slate-950 shadow-[0_4px_0_#0369a1,0_8px_18px_rgba(0,0,0,0.4)] scale-105'
                : 'bg-gradient-to-b from-[#102636]/96 via-[#0a1b27]/97 to-[#06111a]/98 border-[#38bdf8]/90 text-sky-100 shadow-[0_4px_0_#0369a1,0_8px_18px_rgba(4,24,16,0.45)]'
            }`}
            title="جابه‌جایی چادر گروه در نقشه جهان (ویژه مدیر گروه)"
          >
            {isRelocatingGroupTent ? (
              <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.8]" />
            ) : (
              <HudGroupTentIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span>
              {isRelocatingGroupTent ? 'ثبت مکان چادر گروه' : 'جابه‌جایی چادر گروه'}
            </span>
          </button>
        )}
      </div>

      {/* =========================================================================
          RIGHT-BOTTOM EDGE ZOOM CONTROLS (Deep Forest Obsidian Frame)
         ========================================================================= */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="fixed bottom-6 right-1.5 sm:right-3.5 z-45 flex flex-col gap-1 bg-gradient-to-b from-[#112c23]/96 via-[#0b1f18]/97 to-[#06140f]/98 border-2 border-[#f59e0b]/90 p-1 rounded-2xl shadow-[0_3px_0_#78350f,0_8px_18px_rgba(4,24,16,0.45)] pointer-events-auto"
      >
        <button
          onClick={handleZoomIn}
          aria-label="بزرگ‌نمایی"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#183b2e] to-[#0f261e] hover:brightness-115 border border-emerald-300/35 text-slate-50 flex items-center justify-center cursor-pointer active:translate-y-[1px] transition-all"
          title="بزرگ‌نمایی"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={handleZoomOut}
          aria-label="کوچک‌نمایی"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#183b2e] to-[#0f261e] hover:brightness-115 border border-emerald-300/35 text-slate-50 flex items-center justify-center cursor-pointer active:translate-y-[1px] transition-all"
          title="کوچک‌نمایی"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetCamera}
          aria-label="مرکز دوربین"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#183b2e] to-[#0f261e] hover:brightness-115 border border-emerald-300/35 text-slate-50 flex items-center justify-center cursor-pointer active:translate-y-[1px] transition-all"
          title="نمای کلی"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* =========================================================================
          UNIFIED HAND-PAINTED ISOMETRIC 2.5D WORLD & CITY STAGE (ENLARGED 2800x1850)
         ========================================================================= */}
      <div
        ref={stageWrapperRef}
        className="absolute left-1/2 top-1/2 w-[2800px] h-[1850px] shrink-0 transition-transform duration-200 ease-out"
        style={{
          transform: `translate3d(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px), 0) scale(${zoom})`,
          transformOrigin: 'center center',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      >
        <div
          ref={innerStageRef}
          className="relative w-full h-full transition-transform duration-300"
          style={{ transform: stageTransformStyle }}
        >
          {/* =====================================================================
              1. STATIC 2800x1850 HAND-PAINTED ISOMETRIC 2.5D TERRAIN (NO ROADS, ASYMMETRIC)
             ===================================================================== */}
          <StaticWorldTerrainFreeze>
            <svg
              viewBox="0 0 2800 1850"
              width="2800"
              height="1850"
              shapeRendering="optimizeSpeed"
              className="w-full h-full pointer-events-none"
            >
              <defs>
                <AmbientForestDefs />
                {/* Hand-Painted Gouache Meadow Base Gradient (Calibrated Natural Sage-Moss Grass) */}
                <radialGradient id="worldMeadowGlow" cx="46%" cy="44%" r="58%">
                  <stop offset="0%" stopColor="#2d7a53" stopOpacity="1" />
                  <stop offset="40%" stopColor="#236443" stopOpacity="0.98" />
                  <stop offset="76%" stopColor="#1a4d34" stopOpacity="0.98" />
                  <stop offset="100%" stopColor="#123826" stopOpacity="1" />
                </radialGradient>

                {/* Soft Botanical Clearing Halo */}
                <radialGradient id="worldSunlitClearing" cx="48%" cy="45%" r="44%">
                  <stop offset="0%" stopColor="#459d70" stopOpacity="0.18" />
                  <stop offset="50%" stopColor="#2d7a53" stopOpacity="0.09" />
                  <stop offset="100%" stopColor="#1a4d34" stopOpacity="0" />
                </radialGradient>

                {/* Painterly Crystal River Depth Gradient */}
                <linearGradient
                  id="worldRiverStream"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
                  <stop offset="35%" stopColor="#0ea5e9" stopOpacity="0.95" />
                  <stop offset="75%" stopColor="#0284c7" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0.95" />
                </linearGradient>

                {/* Hand-Painted Sanctuary Turf Gradient */}
                <linearGradient
                  id="worldSanctuaryPlatform"
                  x1="15%"
                  y1="10%"
                  x2="85%"
                  y2="90%"
                >
                  <stop offset="0%" stopColor="#398e62" />
                  <stop offset="36%" stopColor="#2d7a53" />
                  <stop offset="76%" stopColor="#236443" />
                  <stop offset="100%" stopColor="#1a4d34" />
                </linearGradient>

                {/* Hand-Painted Marble & Limestone Terrace Rim */}
                <linearGradient
                  id="worldTerraceWalkway"
                  x1="10%"
                  y1="5%"
                  x2="90%"
                  y2="95%"
                >
                  <stop offset="0%" stopColor="#e2e8f0" />
                  <stop offset="50%" stopColor="#cbd5e1" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>

                {/* 2.5D Extruded Stone Masonry Left & Right Faces */}
                <linearGradient
                  id="worldStoneWallLeft"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#cbd5e1" />
                  <stop offset="45%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#64748b" />
                </linearGradient>
                <linearGradient
                  id="worldStoneWallRight"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="50%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                {/* Lower 2.5D Earthen Cliff Faces */}
                <linearGradient
                  id="worldEarthCliffLeft"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#9a6b3e" />
                  <stop offset="50%" stopColor="#7c522b" />
                  <stop offset="100%" stopColor="#5c3a1d" />
                </linearGradient>
                <linearGradient
                  id="worldEarthCliffRight"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#7c522b" />
                  <stop offset="50%" stopColor="#5c3a1d" />
                  <stop offset="100%" stopColor="#3f2611" />
                </linearGradient>

                {/* Subtle Green-Tinted Sunbeam Gradient */}
                <linearGradient
                  id="worldGoldenSunbeam"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#86efac" stopOpacity="0.08" />
                  <stop offset="50%" stopColor="#4ade80" stopOpacity="0.03" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>

                {/* Hand-Painted Brushstroke Grass, Clover & Wildflower Texture Pattern */}
                <pattern
                  id="worldLushGrassPattern"
                  width="96"
                  height="72"
                  patternUnits="userSpaceOnUse"
                >
                  <ellipse
                    cx="26"
                    cy="20"
                    rx="20"
                    ry="8"
                    fill="#4ade80"
                    opacity="0.16"
                  />
                  <ellipse
                    cx="70"
                    cy="52"
                    rx="22"
                    ry="9"
                    fill="#22c55e"
                    opacity="0.18"
                  />
                  <ellipse
                    cx="48"
                    cy="36"
                    rx="16"
                    ry="6"
                    fill="#15803d"
                    opacity="0.18"
                  />
                  <path
                    d="M16,24 q-2,-5 -4,-7 M19,24 q0,-6 1,-8 M22,24 q2,-5 4,-6 M58,54 q-2,-5 -4,-6 M61,54 q1,-6 2,-8 M40,40 q-2,-4 -3,-6 M76,18 q-2,-4 -3,-6"
                    stroke="#86efac"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.45"
                  />
                  <circle cx="30" cy="48" r="1.6" fill="#86efac" opacity="0.45" />
                  <circle cx="72" cy="26" r="1.5" fill="#fde047" opacity="0.45" />
                  <circle cx="84" cy="60" r="1.4" fill="#f472b6" opacity="0.45" />
                </pattern>
              </defs>

              {/* 1. Organic Asymmetric Meadow & Rolling Hill Contours Across 2800x1850 */}
              <rect width="2800" height="1850" fill="url(#worldMeadowGlow)" />
              <ellipse
                cx="490"
                cy="390"
                rx="580"
                ry="290"
                fill="#15803d"
                opacity="0.46"
              />
              <ellipse
                cx="2320"
                cy="530"
                rx="530"
                ry="320"
                fill="#166534"
                opacity="0.46"
              />
              <ellipse
                cx="610"
                cy="1420"
                rx="640"
                ry="310"
                fill="#15803d"
                opacity="0.45"
              />
              <ellipse
                cx="2240"
                cy="1460"
                rx="560"
                ry="300"
                fill="#166534"
                opacity="0.44"
              />
              <rect
                width="2800"
                height="1850"
                fill="url(#worldLushGrassPattern)"
              />
              <ellipse
                cx="1360"
                cy="880"
                rx="1080"
                ry="650"
                fill="url(#worldSunlitClearing)"
              />

              {/* 2. Natural Winding Eastern River (Single Organic Stream Across Expanded World) */}
              <g>
                <path
                  d="M 1760 95 Q 2180 310, 2320 710 Q 2460 1120, 2290 1770"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="68"
                  strokeLinecap="round"
                  opacity="0.26"
                />
                <path
                  d="M 1760 95 Q 2180 310, 2320 710 Q 2460 1120, 2290 1770"
                  fill="none"
                  stroke="#4ade80"
                  strokeWidth="52"
                  strokeLinecap="round"
                  opacity="0.52"
                />
                <path
                  d="M 1760 95 Q 2180 310, 2320 710 Q 2460 1120, 2290 1770"
                  fill="none"
                  stroke="url(#worldRiverStream)"
                  strokeWidth="36"
                  strokeLinecap="round"
                />
                <path
                  d="M 1760 95 Q 2180 310, 2320 710 Q 2460 1120, 2290 1770"
                  fill="none"
                  stroke="#bae6fd"
                  strokeWidth="12"
                  strokeLinecap="round"
                  opacity="0.38"
                />
                <path
                  d="M 1760 95 Q 2180 310, 2320 710 Q 2460 1120, 2290 1770"
                  fill="none"
                  stroke="#e0f2fe"
                  strokeWidth="2.5"
                  strokeDasharray="16 22"
                  strokeLinecap="round"
                  opacity="0.7"
                />
              </g>

              {/* Northern Rocky Waterfall Headwaters at (1760, 95) */}
              <g transform="translate(1760, 95)">
                <ellipse
                  cx="0"
                  cy="14"
                  rx="58"
                  ry="26"
                  fill="#0284c7"
                  stroke="#7dd3fc"
                  strokeWidth="2.5"
                />
                <path
                  d="M-46,2 Q-38,-26 -12,-30 Q18,-34 44,-12 Q52,4 34,14 Z"
                  fill="#475569"
                />
                <path
                  d="M-32,-10 Q-10,-26 22,-18 Q30,-10 24,-2 Z"
                  fill="#22c55e"
                  opacity="0.85"
                />
                <path
                  d="M-10,-15 Q0,4 6,18 M8,-15 Q15,4 18,18"
                  stroke="#e0f2fe"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </g>

              {/* 3. Pure Meadow Terrain (No Building Background Platforms or Green Hedge Borders) */}

              {/* 4. Organically Scattered Bushes, Wildflower Patches & Mossy Rocks */}
              {[
                { x: 1020, y: 585, c: '#fde047' },
                { x: 1540, y: 635, c: '#f472b6' },
                { x: 960, y: 940, c: '#38bdf8' },
                { x: 1515, y: 1010, c: '#fde047' },
                { x: 590, y: 895, c: '#f472b6' },
                { x: 2010, y: 1090, c: '#fde047' },
                { x: 1235, y: 1310, c: '#a78bfa' },
                { x: 680, y: 460, c: '#fde047' },
                { x: 2140, y: 620, c: '#f472b6' },
                { x: 1780, y: 1420, c: '#38bdf8' },
              ].map((b, idx) => (
                <HandPaintedBush25D
                  key={`world-bush-${idx}`}
                  x={b.x}
                  y={b.y}
                  flowerColor={b.c}
                />
              ))}

              {[
                { x: 940, y: 490, c: '#fde047' },
                { x: 1680, y: 690, c: '#f472b6' },
                { x: 1160, y: 1090, c: '#38bdf8' },
                { x: 1610, y: 910, c: '#fde047' },
                { x: 820, y: 1295, c: '#f472b6' },
                { x: 1870, y: 1380, c: '#a78bfa' },
                { x: 540, y: 680, c: '#fde047' },
                { x: 2180, y: 940, c: '#f472b6' },
                { x: 1340, y: 420, c: '#38bdf8' },
              ].map((fl, idx) => (
                <HandPaintedFlowerPatch25D
                  key={`world-flower-${idx}`}
                  x={fl.x}
                  y={fl.y}
                  color={fl.c}
                />
              ))}

              {[
                { x: 545, y: 535, s: 1.05 },
                { x: 2215, y: 655, s: 1.05 },
                { x: 520, y: 1220, s: 1.1 },
                { x: 2260, y: 1140, s: 1.08 },
                { x: 1360, y: 330, s: 0.95 },
                { x: 890, y: 1520, s: 1.05 },
                { x: 1920, y: 1540, s: 1.08 },
              ].map((rk, idx) => (
                <HandPaintedRock25D
                  key={`world-rock-${idx}`}
                  x={rk.x}
                  y={rk.y}
                  scale={rk.s}
                />
              ))}

              {/* 5. Hand-Painted 2.5D Volumetric Forest Trees */}
              {WORLD_FOREST_TREES.map((tree, idx) => (
                <AmbientForestTree25D
                  key={`world-tree-${idx}`}
                  x={tree.x}
                  y={tree.y}
                  scale={tree.scale}
                  kind={tree.kind}
                />
              ))}

              {/* 6. Soft Sunbeam Wash */}
              <polygon
                points="160,0 820,0 1640,1260 980,1260"
                fill="url(#worldGoldenSunbeam)"
              />
            </svg>
          </StaticWorldTerrainFreeze>

          {/* =====================================================================
              1B. DYNAMIC RELOCATION INDICATOR (Garden & Leader Group Tent)
             ===================================================================== */}
          {(isRelocatingGarden || (isRelocatingGroupTent && myLeaderGroup)) && (
            <svg
              viewBox="0 0 2800 1850"
              width="2800"
              height="1850"
              className="absolute inset-0 w-full h-full pointer-events-none z-15"
            >
              {isRelocatingGarden && (
                <ellipse
                  cx={gardenWorldPos.x}
                  cy={gardenWorldPos.y}
                  rx={145}
                  ry={84}
                  fill="none"
                  stroke="#fde047"
                  strokeWidth="3.5"
                  strokeDasharray="12 8"
                />
              )}
              {isRelocatingGroupTent &&
                myLeaderGroup &&
                (() => {
                  const placedTent = placedWorldGroups.find(
                    (pg) => pg.group.id === myLeaderGroup.id
                  );
                  const tx = placedTent ? placedTent.worldX : myLeaderGroup.worldX;
                  const ty = placedTent ? placedTent.worldY : myLeaderGroup.worldY;
                  return (
                    <ellipse
                      cx={tx}
                      cy={ty}
                      rx={145}
                      ry={84}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="4"
                      strokeDasharray="12 8"
                    />
                  );
                })()}
            </svg>
          )}

          {/* =====================================================================
              2. LIGHTWEIGHT AMBIENT BUTTERFLIES
             ===================================================================== */}
          {[
            {
              x: 965,
              y: 590,
              wingPrimary: '#fbbf24',
              wingAccent: '#fef08a',
              cls: 'hp-butterfly-glide-a',
              delay: '0s',
            },
            {
              x: 1320,
              y: 540,
              wingPrimary: '#38bdf8',
              wingAccent: '#bae6fd',
              cls: 'hp-butterfly-glide-b',
              delay: '1.6s',
            },
            {
              x: 785,
              y: 630,
              wingPrimary: '#f472b6',
              wingAccent: '#fbcfe8',
              cls: 'hp-butterfly-glide-a',
              delay: '2.9s',
            },
          ].map((bf, idx) => (
            <div
              key={`world-bf-${idx}`}
              style={{
                left: `${bf.x}px`,
                top: `${bf.y}px`,
                animationDelay: bf.delay,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-25 ${bf.cls}`}
            >
              <svg viewBox="-18 -14 36 32" className="w-8 h-7 overflow-visible">
                <ellipse
                  cx="2"
                  cy="12"
                  rx="5"
                  ry="2.2"
                  fill="#02140a"
                  opacity="0.32"
                />
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

          {/* =====================================================================
              2B. REAL PLAYERS & CURRENT USER WALKING INSIDE THE WORLD
             ===================================================================== */}
          <WorldCitizensLayer
            gardenWorldPos={gardenWorldPos}
            profile={profile}
            liveCloudPlayers={placedCloudNeighbors}
            worldGroups={placedWorldGroups}
            onSelectWalker={handleSelectWalker}
          />

          {/* =====================================================================
              3. SINGLE LARGE 2.5D MONUMENT BUILDINGS (No Sub-Houses, Movable Player Garden)
             ===================================================================== */}
          {territories.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isPlayerGarden = node.type === 'player_base';
            const isMyLeaderGroupTent = Boolean(
              node.type === 'group_hq' &&
                myLeaderGroup &&
                node.groupData?.id === myLeaderGroup.id
            );

            return (
              <div
                key={node.id}
                style={{ left: `${node.x}px`, top: `${node.y}px` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
              >
                <div className="relative z-20 flex flex-col items-center pointer-events-auto">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      if (isPlayerGarden && isRelocatingGarden) {
                        e.stopPropagation();
                        setIsDraggingGardenNode(true);
                      } else if (isMyLeaderGroupTent && isRelocatingGroupTent) {
                        e.stopPropagation();
                        setIsDraggingGroupTent(true);
                      }
                    }}
                    onTouchStart={(e) => {
                      if (isPlayerGarden && isRelocatingGarden) {
                        e.stopPropagation();
                        setIsDraggingGardenNode(true);
                      } else if (isMyLeaderGroupTent && isRelocatingGroupTent) {
                        e.stopPropagation();
                        setIsDraggingGroupTent(true);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasMovedRef.current) return;
                      if (isRelocatingGarden && isPlayerGarden) {
                        return;
                      }
                      if (isRelocatingGroupTent && isMyLeaderGroupTent) {
                        return;
                      }
                      sound.playClick();
                      if (node.type === 'university_campus') {
                        setSelectedNode(null);
                        setUniModalState({
                          isOpen: true,
                          courseIndex: 0,
                          lessonIndex: 0,
                          navStep: 'entrance_courses',
                          sessionMode: 'practice',
                        });
                      } else if (node.type === 'school_campus') {
                        setSelectedNode(null);
                        setActiveDistrictCatalog('school');
                      } else if (node.type === 'workshop_campus') {
                        setSelectedNode(null);
                        setActiveDistrictCatalog('workshop');
                      } else if (node.type === 'player_base') {
                        onEnterGarden();
                      } else {
                        setSelectedNode(node);
                      }
                    }}
                    className={`group relative flex flex-col items-center focus:outline-none ${
                      (isPlayerGarden && isRelocatingGarden) ||
                      (isMyLeaderGroupTent && isRelocatingGroupTent)
                        ? 'cursor-move'
                        : 'cursor-pointer'
                    }`}
                  >
                    {(isSelected ||
                      (isPlayerGarden && isRelocatingGarden) ||
                      (isMyLeaderGroupTent && isRelocatingGroupTent)) && (
                      <div
                        className={`absolute -inset-4 rounded-3xl border-4 animate-pulse pointer-events-none ${
                          isMyLeaderGroupTent && isRelocatingGroupTent
                            ? 'border-sky-300/95'
                            : 'border-amber-300/90'
                        }`}
                      />
                    )}

                    <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                      {node.type === 'player_base' && (
                        <WorldGardenPlot25D
                          unlockedTreeCount={playerUnlockedTreeCount}
                          variant="player"
                          className="w-52 h-42"
                        />
                      )}

                      {node.type === 'university_campus' && (
                        <UniversityMainBuilding25D className="w-52 h-44" />
                      )}

                      {node.type === 'school_campus' && (
                        <SchoolWorkshopMainBuilding25D
                          variant="school"
                          className="w-48 h-40"
                        />
                      )}

                      {node.type === 'workshop_campus' && (
                        <SchoolWorkshopMainBuilding25D
                          variant="workshop"
                          className="w-46 h-38"
                        />
                      )}

                      {node.type === 'neighbor_base' && (
                        <WorldGardenPlot25D
                          unlockedTreeCount={
                            node.neighborData?.trees.filter((t) => t.unlocked)
                              .length || 3
                          }
                          variant="neighbor"
                          className="w-42 h-34"
                        />
                      )}

                      {node.type === 'resource_node' &&
                        node.landmarkKind === 'spring' && (
                          <GardenSpringShrine25D className="w-28 h-26" />
                        )}

                      {node.type === 'resource_node' &&
                        node.landmarkKind === 'greenhouse' && (
                          <GardenGreenhouse25D className="w-30 h-26" />
                        )}

                      {node.type === 'resource_node' &&
                        (!node.landmarkKind ||
                          node.landmarkKind === 'shrine') && (
                          <ResourceShrinePavilion25D className="w-30 h-26" />
                        )}

                      {node.type === 'group_hq' && node.groupData && (
                        <GroupBuilding25D
                          level={node.groupData.buildingLevel}
                          className="w-44 h-36"
                        />
                      )}
                    </div>

                    {/* Clean Single Name Banner */}
                    <div
                      className={`-mt-2 flex items-center gap-1.5 px-3.5 py-1 rounded-xl border-2 shadow-md whitespace-nowrap ${
                        node.type === 'group_hq'
                          ? 'bg-[#1a1408]/96 border-amber-300'
                          : node.isLiveCloudPlayer
                          ? 'bg-[#0a1d17]/96 border-lime-300'
                          : 'bg-[#0a1d17]/95 border-amber-400/90'
                      }`}
                    >
                      {node.isLiveCloudPlayer && (
                        <span
                          className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_8px_#a3e635] animate-pulse shrink-0"
                          title="بازیکن آنلاین"
                        />
                      )}
                      {node.type === 'group_hq' && node.groupData && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-200 text-[10px] font-black border border-amber-400/50">
                          سطح {node.groupData.buildingLevel}
                        </span>
                      )}
                      <span className="text-xs sm:text-sm font-black text-slate-50">
                        {node.title}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SIMPLE POPUP FOR NEIGHBOR GARDENS & RESOURCE NODES
         ========================================================================= */}
      {selectedNode && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed bottom-20 left-2 right-12 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 sm:w-[92%] max-w-md animate-fadeIn"
        >
          <div className="rounded-3xl bg-gradient-to-b from-[#0f241d]/98 via-[#0a1a15]/98 to-[#06110d]/99 border-2 border-[#f59e0b]/90 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.65)] text-slate-50">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-200 shrink-0">
                  {selectedNode.type === 'group_hq' ? (
                    <HudGroupTentIcon className="w-6 h-6" />
                  ) : selectedNode.type === 'neighbor_base' ? (
                    <Shield className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {selectedNode.title}
                  </h3>
                  <p className="text-xs text-slate-200 font-medium">
                    {selectedNode.subtitle}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="p-1.5 rounded-xl bg-[#143026] hover:bg-[#1c4436] border border-emerald-300/25 text-slate-100 cursor-pointer"
                aria-label="بستن"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedNode.type === 'neighbor_base' &&
                selectedNode.neighborData && (
                  <>
                    <button
                      onClick={() => {
                        sound.playClick();
                        onVisitGarden(selectedNode.neighborData!);
                        setSelectedNode(null);
                      }}
                      className="flex-1 min-w-[100px] py-2.5 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>بازدید از باغ</span>
                    </button>
                    <button
                      onClick={() => {
                        sound.playCoin();
                        onHelpNeighbor(selectedNode.neighborData!.ownerName);
                        setSelectedNode(null);
                      }}
                      className="flex-1 min-w-[95px] py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/60 text-amber-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <HeartHandshake className="w-4 h-4" />
                      <span>کمک (+۵ سکه)</span>
                    </button>
                    {selectedNode.isLiveCloudPlayer &&
                      selectedNode.cloudUid &&
                      onStartChatWithPlayer && (
                        <button
                          onClick={() => {
                            sound.playClick();
                            onStartChatWithPlayer({
                              uid: selectedNode.cloudUid!,
                              name: selectedNode.neighborData!.ownerName,
                              gender: selectedNode.neighborData!.gender,
                              avatarConfig: selectedNode.cloudAvatarConfig,
                            });
                            setSelectedNode(null);
                          }}
                          className="flex-1 min-w-[72px] py-2.5 rounded-xl bg-gradient-to-b from-[#fde68a] to-[#fbbf24] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>چت</span>
                        </button>
                      )}
                    {selectedNode.isLiveCloudPlayer &&
                      selectedNode.cloudUid &&
                      myLeaderGroup &&
                      selectedNode.cloudUid !== myLeaderGroup.leaderUid &&
                      onInviteToGroup && (
                        <button
                          type="button"
                          disabled={Boolean(invitedUids[selectedNode.cloudUid])}
                          onClick={async () => {
                            const targetUid = selectedNode.cloudUid!;
                            sound.playClick();
                            try {
                              await onInviteToGroup({
                                uid: targetUid,
                                name: selectedNode.neighborData!.ownerName,
                                gender: selectedNode.neighborData!.gender,
                                avatarConfig: selectedNode.cloudAvatarConfig,
                              });
                              sound.playCoin();
                              setInvitedUids((prev) => ({
                                ...prev,
                                [targetUid]: true,
                              }));
                            } catch {
                              // ignore transient
                            }
                          }}
                          className={`w-full py-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 ${
                            invitedUids[selectedNode.cloudUid]
                              ? 'bg-emerald-950 border-lime-400 text-lime-300 cursor-default'
                              : 'bg-sky-500/20 hover:bg-sky-500/30 border-sky-400/60 text-sky-100 cursor-pointer'
                          }`}
                        >
                          {invitedUids[selectedNode.cloudUid] ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>دعوت‌نامه گروه «{myLeaderGroup.name}» ارسال شد</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              <span>دعوت به گروه «{myLeaderGroup.name}»</span>
                            </>
                          )}
                        </button>
                      )}
                  </>
                )}

              {selectedNode.type === 'group_hq' && selectedNode.groupData && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      const gid = selectedNode.groupData!.id;
                      setSelectedNode(null);
                      onOpenGroupModal?.(gid);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    <span>مشاهده، ارتقای ساختمان و درخواست عضویت</span>
                  </button>
                  {myLeaderGroup &&
                    myLeaderGroup.id === selectedNode.groupData.id && (
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setSelectedNode(null);
                          setIsRelocatingGarden(false);
                          setIsRelocatingGroupTent(true);
                        }}
                        className="w-full py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/70 text-sky-100 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Move className="w-4 h-4 text-sky-300" />
                        <span>جابه‌جایی چادر گروه (مدیر گروه)</span>
                      </button>
                    )}
                </>
              )}

              {selectedNode.type === 'resource_node' && (
                <button
                  onClick={() => {
                    sound.playCoin();
                    onHelpNeighbor(selectedNode.title);
                    setSelectedNode(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>دریافت پاداش (+۵ سکه)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE UNIVERSITY HALL GAME OVERLAY (Green Alpha Surface)
         ========================================================================= */}
      {uniModalState.isOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[60] bg-gradient-to-b from-[#0d221b] via-[#091813] to-[#050e0b] overflow-y-auto pt-2 sm:pt-4 pb-24 animate-fadeIn"
        >
          <React.Suspense fallback={null}>
            <UniversityHallView
              profile={profile}
              initialCourseIndex={uniModalState.courseIndex}
              initialLessonIndex={uniModalState.lessonIndex}
              initialNavStep={uniModalState.navStep}
              initialSessionMode={uniModalState.sessionMode}
              onBackToWorld={() =>
                setUniModalState((prev) => ({ ...prev, isOpen: false }))
              }
              onRewardCoins={onRewardCoins}
            />
          </React.Suspense>
        </div>
      )}

      {/* =========================================================================
          CLEAN SCHOOL / WORKSHOP MODAL (Deep Forest Obsidian Surface)
         ========================================================================= */}
      {activeDistrictCatalog && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => setActiveDistrictCatalog(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 pb-20 bg-black/82 backdrop-blur-sm animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[80dvh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/90 p-4 sm:p-5 text-slate-50 shadow-[0_24px_60px_rgba(0,0,0,0.8)] space-y-4"
          >
            <div className="sticky top-0 z-10 bg-[#0d211a] -mx-4 sm:-mx-5 -mt-4 sm:-mt-5 px-4 sm:px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-emerald-300/20">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-10 shrink-0 flex items-center justify-center">
                  <SchoolWorkshopMainBuilding25D
                    variant="school"
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-200">
                    🏫 مدرسه مهارت‌ها
                  </h3>
                  <p className="text-[11px] text-slate-200 font-bold">
                    دوره‌های مهارت‌های شناختی، تندخوانی، تمرکز و کارگاه‌های عملی (+۱۰ سکه برای هر درس)
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveDistrictCatalog(null);
                }}
                className="p-2 rounded-full bg-[#143026] hover:bg-[#1c4436] border border-emerald-300/25 text-slate-100 cursor-pointer"
                aria-label="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {schoolAndWorkshopCourses.map((course) => {
                const isCompleted = completedCourseIds.includes(course.id);
                return (
                  <div
                    key={course.id}
                    className="rounded-2xl bg-[#143026] border border-emerald-300/25 hover:border-amber-400 p-3.5 shadow-sm flex flex-col justify-between gap-3 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-white">
                          {course.title}
                        </h4>
                        {isCompleted && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-200 mt-1 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        sound.playClick();
                        setCityCourseOrigin(activeDistrictCatalog);
                        setActiveDistrictCatalog(null);
                        setQuizSelection(null);
                        setQuizFeedback(null);
                        setActiveCityCourse(course);
                      }}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-300 hover:brightness-105 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>{isCompleted ? 'مرور درس' : 'شروع یادگیری'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fixed Persistent Back Button to World Map */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-3 sm:bottom-4 left-3 sm:left-5 z-[80] pointer-events-auto"
          >
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveDistrictCatalog(null);
              }}
              aria-label="بازگشت به صفحه جهان"
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:brightness-105 active:translate-y-[2px] text-slate-950 font-black text-xs sm:text-sm border-2 border-white shadow-[0_4px_0_#78350f,0_10px_20px_rgba(0,0,0,0.65)] cursor-pointer transition-all"
            >
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.6]" />
              <span>بازگشت به جهان</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          COURSE INTERACTIVE LESSON & QUIZ MODAL (For School & Workshop Buildings)
         ========================================================================= */}
      {activeCityCourse && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[65] flex items-center justify-center p-4 pb-20 bg-black/82 backdrop-blur-sm animate-fadeIn"
          onClick={() => {
            setActiveCityCourse(null);
            setCityCourseOrigin(null);
          }}
        >
          <div
            className="w-full max-w-lg max-h-[82dvh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/90 p-6 text-slate-50 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-emerald-300/20 pb-3">
              <div>
                <span className="text-xs text-amber-300 font-bold">
                  {activeCityCourse.subtitle}
                </span>
                <h3 className="text-lg font-black text-white">
                  🏢 {activeCityCourse.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveCityCourse(null);
                  setCityCourseOrigin(null);
                }}
                className="p-2 rounded-full bg-[#143026] hover:bg-[#1c4436] border border-emerald-300/25 text-slate-100 cursor-pointer"
                aria-label="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#143026] border border-emerald-300/25 text-xs sm:text-sm leading-relaxed text-slate-100 space-y-2">
              <p className="font-bold text-amber-200">خلاصه پودمان کلیدی:</p>
              <p>{activeCityCourse.description}</p>
              <p className="text-emerald-200 font-medium">
                نکته طلایی: مغز انسان با تکرار فاصله‌دار (Spaced Repetition) و
                تمرکز عمیق ۲۵ دقیقه‌ای (پومودورو) اتصالات سیناپسی پایدار می‌سازد.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#143026] border border-amber-400/40 text-xs space-y-2">
              <p className="font-bold text-amber-200">پرسش ارزیابی پایانی:</p>
              <p className="text-white font-semibold">
                کدام روش بیشترین تاثیر را در تثبیت یادگیری بلندمدت دارد؟
              </p>
              <div className="space-y-1.5 pt-1">
                {[
                  'مطالعه فشرده در یک شب بدون استراحت',
                  'تکرار فاصله‌دار همراه با بازیابی فعال و تمرکز عمیق',
                  'خواندن سطحی بدون یادداشت‌برداری',
                ].map((opt, idx) => (
                  <label
                    key={idx}
                    onClick={() => {
                      setQuizSelection(idx);
                      setQuizFeedback(null);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      quizSelection === idx
                        ? 'bg-[#1c4536] border-amber-400 text-white font-bold'
                        : 'bg-[#0c2019] border-emerald-300/25 hover:border-amber-400 text-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="quiz"
                      checked={quizSelection === idx}
                      onChange={() => {
                        setQuizSelection(idx);
                        setQuizFeedback(null);
                      }}
                      className="accent-amber-400"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              {quizFeedback && (
                <p className="text-rose-200 font-bold pt-1">{quizFeedback}</p>
              )}
            </div>

            <button
              onClick={() => handleCompleteCityCourse(activeCityCourse.id)}
              className="w-full py-3 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-sm shadow-lg cursor-pointer"
            >
              ثبت آزمون و دریافت «{activeCityCourse.badgeName}» (+۱۰ سکه 🪙)
            </button>
          </div>

          {/* Fixed Persistent Back Button */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-3 sm:bottom-4 left-3 sm:left-5 z-[80] pointer-events-auto"
          >
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                const returnTo = cityCourseOrigin;
                setActiveCityCourse(null);
                setCityCourseOrigin(null);
                if (returnTo) {
                  setActiveDistrictCatalog(returnTo);
                }
              }}
              aria-label={
                cityCourseOrigin ? 'بازگشت به منوی قبلی' : 'بازگشت به صفحه جهان'
              }
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:brightness-105 active:translate-y-[2px] text-slate-950 font-black text-xs sm:text-sm border-2 border-[#fef08a] shadow-[0_5px_0_#78350f,0_12px_24px_rgba(0,0,0,0.85)] cursor-pointer transition-all"
            >
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.6]" />
              <span>
                {cityCourseOrigin ? 'بازگشت به قبل' : 'بازگشت به جهان'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
