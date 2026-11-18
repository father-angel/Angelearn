import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AvatarConfig,
  AvatarGender,
  UserProfile,
  VisitorGarden,
  WorldGroup,
} from '../types/game';
import { CharacterAvatar, getDefaultAvatarConfig } from './CharacterAvatar';
import {
  WorldWalkerAction,
  WorldWalkerWaypoint,
  buildRealPlayerWorldWaypoints,
  getPlayerWalkerSpeed,
} from '../game/worldWalkers';

export interface LiveWorldPlayerWalker {
  uid: string;
  name: string;
  gender: AvatarGender;
  avatarConfig: AvatarConfig;
  gardenPos: { x: number; y: number };
  groupPos?: { x: number; y: number; groupName?: string } | null;
  isSelf: boolean;
  neighborData?: VisitorGarden;
}

export interface WorldCitizensLayerProps {
  gardenWorldPos: { x: number; y: number };
  profile: UserProfile;
  liveCloudPlayers: Array<{
    uid: string;
    worldX: number;
    worldY: number;
    avatarConfig: AvatarConfig;
    visitorGarden: VisitorGarden;
  }>;
  worldGroups?: Array<{
    worldX: number;
    worldY: number;
    group: WorldGroup;
  }>;
  onSelectWalker?: (walker: LiveWorldPlayerWalker) => void;
}

/**
 * Single Real Player Character smoothly moving across the 2800x1850 World Map
 * using their own customized CharacterAvatar.
 */
const RealPlayerWorldWalker: React.FC<{
  walker: LiveWorldPlayerWalker;
  waypoints: WorldWalkerWaypoint[];
  speedPxPerSec: number;
  initialWaypointIndex?: number;
  onSelectWalker?: (walker: LiveWorldPlayerWalker) => void;
}> = React.memo(({
  walker,
  waypoints,
  speedPxPerSec,
  initialWaypointIndex = 0,
  onSelectWalker,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startWp =
    waypoints[initialWaypointIndex % Math.max(1, waypoints.length)];

  const [visualState, setVisualState] = useState<{
    action: WorldWalkerAction;
    statusText: string;
    facingRight: boolean;
  }>(() => ({
    action: 'walking',
    statusText: startWp?.statusText || 'در حال گشت‌وگذار در جهان...',
    facingRight: true,
  }));

  useEffect(() => {
    if (waypoints.length < 2) return;

    let currentIdx = initialWaypointIndex % waypoints.length;
    let phase: 'walking' | 'dwelling' = 'walking';
    let dwellTimerId: number | null = null;
    let rafId: number | null = null;
    let lastZIndex = -1;
    let isDisposed = false;

    const setDomPosition = (x: number, y: number) => {
      const el = containerRef.current;
      if (!el) return;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate3d(-50%, -100%, 0)`;
      const depthZ = Math.min(26, Math.max(19, Math.round(19 + (y / 1850) * 7)));
      if (depthZ !== lastZIndex) {
        lastZIndex = depthZ;
        el.style.zIndex = `${depthZ}`;
      }
    };

    const startWalkingSegment = (fromIndex: number) => {
      if (isDisposed) return;
      phase = 'walking';
      const fromWp = waypoints[fromIndex % waypoints.length];
      const toIndex = (fromIndex + 1) % waypoints.length;
      const toWp = waypoints[toIndex];

      const dx = toWp.x - fromWp.x;
      const dy = toWp.y - fromWp.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const durationSec = Math.max(1.8, dist / speedPxPerSec);
      const nextFacingRight = dx >= 0;

      setVisualState((prev) => {
        if (
          prev.action === 'walking' &&
          prev.statusText === toWp.statusText &&
          prev.facingRight === nextFacingRight
        ) {
          return prev;
        }
        return {
          action: 'walking',
          statusText: toWp.statusText,
          facingRight: nextFacingRight,
        };
      });

      let elapsedSec = 0;
      let lastTime = performance.now();

      const step = (now: number) => {
        if (isDisposed || phase !== 'walking') return;
        if (document.hidden) {
          lastTime = now;
          rafId = requestAnimationFrame(step);
          return;
        }
        const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
        lastTime = now;
        elapsedSec += dt;

        const t = Math.min(1, elapsedSec / durationSec);
        const curveOffset = Math.sin(t * Math.PI) * 18;
        const perpX = (-dy / dist) * curveOffset;
        const perpY = (dx / dist) * curveOffset * 0.55;

        const curX = fromWp.x + dx * t + perpX;
        const curY = fromWp.y + dy * t + perpY;
        setDomPosition(curX, curY);

        if (t >= 1) {
          currentIdx = toIndex;
          startDwellingAtWaypoint(currentIdx);
          return;
        }

        rafId = requestAnimationFrame(step);
      };

      rafId = requestAnimationFrame(step);
    };

    const startDwellingAtWaypoint = (idx: number) => {
      if (isDisposed) return;
      phase = 'dwelling';
      const wp = waypoints[idx % waypoints.length];
      setDomPosition(wp.x, wp.y);
      setVisualState((prev) => {
        if (prev.action === wp.action && prev.statusText === wp.statusText) {
          return prev;
        }
        return {
          action: wp.action,
          statusText: wp.statusText,
          facingRight: prev.facingRight,
        };
      });

      dwellTimerId = window.setTimeout(() => {
        startWalkingSegment(idx);
      }, wp.dwellMs);
    };

    setDomPosition(startWp.x, startWp.y);
    startWalkingSegment(currentIdx);

    return () => {
      isDisposed = true;
      phase = 'dwelling';
      if (dwellTimerId !== null) window.clearTimeout(dwellTimerId);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [waypoints, speedPxPerSec, initialWaypointIndex, startWp?.x, startWp?.y]);

  const isWalking = visualState.action === 'walking';
  const initX = startWp?.x ?? walker.gardenPos.x;
  const initY = startWp?.y ?? walker.gardenPos.y;

  return (
    <div
      ref={containerRef}
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${initX}px, ${initY}px, 0) translate3d(-50%, -100%, 0)`,
        zIndex: 23,
        willChange: 'transform',
      }}
      className="absolute pointer-events-auto"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectWalker?.(walker);
        }}
        title={walker.isSelf ? `شما (${walker.name})` : `کاراکتر ${walker.name}`}
        className="group relative flex flex-col items-center select-none cursor-pointer focus:outline-none"
      >
        {/* Ground Shadow & Subtle Ring */}
        <div
          className="relative flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
          style={{
            transform: visualState.facingRight ? 'scaleX(1)' : 'scaleX(-1)',
          }}
        >
          <div
            className="absolute -bottom-0.5 w-10 h-3 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(2,18,10,0.6) 0%, rgba(2,18,10,0) 75%)',
            }}
          />
          {walker.isSelf && (
            <div
              className="absolute -bottom-1 w-12 h-4 rounded-full border border-amber-300/80 pointer-events-none"
              style={{ boxShadow: '0 0 8px rgba(251,191,36,0.45)' }}
            />
          )}
          <CharacterAvatar
            gender={walker.gender}
            config={walker.avatarConfig}
            variant="full"
            showBackdrop={false}
            isWalking={isWalking}
            size={walker.isSelf ? 64 : 58}
          />
        </div>

        {/* Name & Live Activity Pill */}
        <div
          className={`-mt-1.5 z-20 px-2.5 py-0.5 rounded-full border shadow-[0_2px_8px_rgba(0,0,0,0.55)] flex items-center gap-1 whitespace-nowrap ${
            walker.isSelf
              ? 'bg-[#0a1d17]/95 border-amber-300'
              : 'bg-[#091913]/95 border-lime-300/80'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              walker.isSelf ? 'bg-amber-300' : 'bg-lime-400'
            }`}
          />
          <span
            className={`text-[9px] font-black ${
              walker.isSelf ? 'text-amber-200' : 'text-lime-200'
            }`}
          >
            {walker.isSelf ? `شما · ${walker.name}` : walker.name}
          </span>
          <span className="text-[7.5px] font-medium text-slate-200 border-r border-emerald-300/30 pr-1">
            {visualState.statusText}
          </span>
        </div>
      </button>
    </div>
  );
});

/**
 * Layer of Real Registered Players & the Current Player walking inside the 2800x1850 World Map
 * using each player's own customized avatar (zero fake NPCs).
 */
export const WorldCitizensLayer: React.FC<WorldCitizensLayerProps> = React.memo(
  ({
    gardenWorldPos,
    profile,
    liveCloudPlayers,
    worldGroups = [],
    onSelectWalker,
  }) => {
    const walkerEntries = useMemo(() => {
      const myGroupPlaced = profile.groupId
        ? worldGroups.find((pg) => pg.group.id === profile.groupId)
        : undefined;

      const list: Array<{
        walker: LiveWorldPlayerWalker;
        waypoints: WorldWalkerWaypoint[];
        speed: number;
      }> = [];

      // 1. Always render the active player's own character roaming the World
      const selfWalker: LiveWorldPlayerWalker = {
        uid: profile.id,
        name: profile.name || 'همسفر نور',
        gender: profile.gender,
        avatarConfig:
          profile.avatarConfig || getDefaultAvatarConfig(profile.gender),
        gardenPos: gardenWorldPos,
        groupPos: myGroupPlaced
          ? {
              x: myGroupPlaced.worldX,
              y: myGroupPlaced.worldY,
              groupName: myGroupPlaced.group.name,
            }
          : null,
        isSelf: true,
      };
      list.push({
        walker: selfWalker,
        waypoints: buildRealPlayerWorldWaypoints({
          uid: selfWalker.uid,
          displayName: selfWalker.name,
          gardenPos: selfWalker.gardenPos,
          groupPos: selfWalker.groupPos,
          isSelf: true,
        }),
        speed: getPlayerWalkerSpeed(selfWalker.uid),
      });

      // 2. Render every other registered live player from Cloud Firestore
      const seenUids = new Set<string>([profile.id]);
      liveCloudPlayers.forEach((cn) => {
        if (!cn.uid || seenUids.has(cn.uid)) return;
        seenUids.add(cn.uid);

        const gender = cn.visitorGarden.gender;
        const walker: LiveWorldPlayerWalker = {
          uid: cn.uid,
          name: cn.visitorGarden.ownerName,
          gender,
          avatarConfig: cn.avatarConfig || getDefaultAvatarConfig(gender),
          gardenPos: { x: cn.worldX, y: cn.worldY },
          groupPos: null,
          isSelf: false,
          neighborData: cn.visitorGarden,
        };
        list.push({
          walker,
          waypoints: buildRealPlayerWorldWaypoints({
            uid: walker.uid,
            displayName: walker.name,
            gardenPos: walker.gardenPos,
            isSelf: false,
          }),
          speed: getPlayerWalkerSpeed(walker.uid),
        });
      });

      return list;
    }, [
      gardenWorldPos.x,
      gardenWorldPos.y,
      profile.id,
      profile.name,
      profile.gender,
      profile.groupId,
      profile.avatarConfig,
      liveCloudPlayers,
      worldGroups,
    ]);

    return (
      <>
        {walkerEntries.map(({ walker, waypoints, speed }, idx) => (
          <RealPlayerWorldWalker
            key={walker.uid}
            walker={walker}
            waypoints={waypoints}
            speedPxPerSec={speed}
            initialWaypointIndex={idx}
            onSelectWalker={onSelectWalker}
          />
        ))}
      </>
    );
  }
);
