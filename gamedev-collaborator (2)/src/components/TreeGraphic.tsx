import React from 'react';
import { TreeData } from '../types/game';
import { getGrowthStage, isTreeWithered } from '../game/rules';

interface TreeGraphicProps {
  tree: TreeData;
  size?: number; // base size multiplier
  showShadow?: boolean;
  isSelected?: boolean;
  isWateringActive?: boolean;
  isMilestoneActive?: boolean;
}

interface TreePalette {
  trunkShadow: string;
  trunkMid: string;
  trunkSunlit: string;
  trunkHighlight: string;
  foliageDeepShadow: string;
  foliageShadow: string;
  foliageMid: string;
  foliageSunlit: string;
  foliageHighlight: string;
  rimLight: string;
  accentPrimary: string;
  accentSecondary: string;
  glowColor: string;
}

const WITHERED_PALETTE: TreePalette = {
  trunkShadow: '#2b1d12',
  trunkMid: '#473221',
  trunkSunlit: '#694b35',
  trunkHighlight: '#856349',
  foliageDeepShadow: '#3d2e1e',
  foliageShadow: '#59442d',
  foliageMid: '#785d40',
  foliageSunlit: '#997a58',
  foliageHighlight: '#b59775',
  rimLight: '#cbb294',
  accentPrimary: '#8c6d46',
  accentSecondary: '#a38662',
  glowColor: '#997a58',
};

function getTreePalette(treeId: string, withered: boolean): TreePalette {
  if (withered) return WITHERED_PALETTE;

  switch (treeId) {
    case 'speed_reading': // Emerald Jade & Sunlit Gold (درخت تندخوانی)
      return {
        trunkShadow: '#331606',
        trunkMid: '#59280e',
        trunkSunlit: '#85421a',
        trunkHighlight: '#a85d2d',
        foliageDeepShadow: '#033022',
        foliageShadow: '#065f46',
        foliageMid: '#059669',
        foliageSunlit: '#34d399',
        foliageHighlight: '#86efac',
        rimLight: '#d9f99d',
        accentPrimary: '#fde047',
        accentSecondary: '#f59e0b',
        glowColor: '#34d399',
      };
    case 'gratitude': // Sakura Rose, Crimson & Warm Ivory (درخت شکرگزاری)
      return {
        trunkShadow: '#2e1511',
        trunkMid: '#4f271e',
        trunkSunlit: '#784032',
        trunkHighlight: '#9c5949',
        foliageDeepShadow: '#500724',
        foliageShadow: '#831843',
        foliageMid: '#be185d',
        foliageSunlit: '#f472b6',
        foliageHighlight: '#fbcfe8',
        rimLight: '#fff1f2',
        accentPrimary: '#fef08a',
        accentSecondary: '#fda4af',
        glowColor: '#f472b6',
      };
    case 'deep_breathing': // Aquamarine, Seafoam & Zen Cyan (درخت تنفس عمیق)
      return {
        trunkShadow: '#172536',
        trunkMid: '#293f56',
        trunkSunlit: '#436180',
        trunkHighlight: '#6485a6',
        foliageDeepShadow: '#083344',
        foliageShadow: '#155e75',
        foliageMid: '#0891b2',
        foliageSunlit: '#38bdf8',
        foliageHighlight: '#bae6fd',
        rimLight: '#f0f9ff',
        accentPrimary: '#e0f2fe',
        accentSecondary: '#67e8f9',
        glowColor: '#38bdf8',
      };
    case 'bina_balls': // Royal Amethyst, Indigo & Starlight Lavender (درخت بینا)
      return {
        trunkShadow: '#230d38',
        trunkMid: '#3f1b5e',
        trunkSunlit: '#61308a',
        trunkHighlight: '#824cb0',
        foliageDeepShadow: '#2e1065',
        foliageShadow: '#4c1d95',
        foliageMid: '#6d28d9',
        foliageSunlit: '#a78bfa',
        foliageHighlight: '#ddd6fe',
        rimLight: '#f5f3ff',
        accentPrimary: '#fde047',
        accentSecondary: '#c084fc',
        glowColor: '#a78bfa',
      };
    case 'memory_cards': // Golden Ginkgo, Honey Amber & Warm Saffron (درخت حافظه)
      return {
        trunkShadow: '#361704',
        trunkMid: '#5c2809',
        trunkSunlit: '#874115',
        trunkHighlight: '#ab5924',
        foliageDeepShadow: '#451a03',
        foliageShadow: '#78350f',
        foliageMid: '#d97706',
        foliageSunlit: '#fbbf24',
        foliageHighlight: '#fde68a',
        rimLight: '#fef9c3',
        accentPrimary: '#ffffff',
        accentSecondary: '#38bdf8',
        glowColor: '#fbbf24',
      };
    case 'brain_math': // Bioluminescent Orchid, Plum & Electric Gold (درخت مغز)
      return {
        trunkShadow: '#2b0938',
        trunkMid: '#4c145e',
        trunkSunlit: '#73268a',
        trunkHighlight: '#963eb0',
        foliageDeepShadow: '#4a044e',
        foliageShadow: '#701a75',
        foliageMid: '#a21caf',
        foliageSunlit: '#e879f9',
        foliageHighlight: '#f5d0fe',
        rimLight: '#fef08a',
        accentPrimary: '#fde047',
        accentSecondary: '#38bdf8',
        glowColor: '#e879f9',
      };
    case 'poetry': // Persian Turquoise, Lapis Jade & Shiraz Rose (درخت شعر)
      return {
        trunkShadow: '#2d180a',
        trunkMid: '#4f2c14',
        trunkSunlit: '#784725',
        trunkHighlight: '#9c6239',
        foliageDeepShadow: '#042f2e',
        foliageShadow: '#115e59',
        foliageMid: '#0d9488',
        foliageSunlit: '#2dd4bf',
        foliageHighlight: '#99f6e4',
        rimLight: '#fef08a',
        accentPrimary: '#fb7185',
        accentSecondary: '#fde047',
        glowColor: '#2dd4bf',
      };
    default:
      return {
        trunkShadow: '#331606',
        trunkMid: '#59280e',
        trunkSunlit: '#85421a',
        trunkHighlight: '#a85d2d',
        foliageDeepShadow: '#033022',
        foliageShadow: '#065f46',
        foliageMid: '#059669',
        foliageSunlit: '#34d399',
        foliageHighlight: '#86efac',
        rimLight: '#d9f99d',
        accentPrimary: '#fde047',
        accentSecondary: '#f59e0b',
        glowColor: '#34d399',
      };
  }
}

/**
 * Hand-Painted Scalloped Foliage Cluster Helper:
 * Renders a volumetric 2.5D leaf cloud using organic Bézier lobes (zero flat circles),
 * complete with under-canopy ambient occlusion, mid-tone gouache body, top-left sunlit crown,
 * and delicate individual painted leaf tips.
 */
interface FoliageClusterProps {
  cx: number;
  cy: number;
  scale?: number;
  rotation?: number;
  palette: TreePalette;
  gradientId: string;
  variant?: 'crown' | 'leftBough' | 'rightBough' | 'lowerBough';
}

const HandPaintedFoliageCluster: React.FC<FoliageClusterProps> = ({
  cx,
  cy,
  scale = 1,
  rotation = 0,
  palette,
  gradientId,
  variant = 'crown',
}) => {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale}) rotate(${rotation})`}>
      {/* 1. Bottom-Right Deep Under-Canopy Shadow Volume */}
      <path
        d="M -26,6
           C -32,-2 -28,-14 -16,-17
           C -10,-25 6,-26 15,-18
           C 27,-15 33,-3 27,7
           C 23,16 10,20 0,18
           C -11,20 -22,15 -26,6 Z"
        fill={palette.foliageDeepShadow}
        transform="translate(2.5, 4.5)"
      />

      {/* 2. Shaded Lower-Right Leaf Lobes */}
      <path
        d="M -25,4
           C -31,-4 -26,-16 -14,-18
           C -8,-26 8,-26 16,-17
           C 28,-14 32,-2 25,7
           C 20,15 8,18 -1,16
           C -12,18 -21,12 -25,4 Z"
        fill={palette.foliageShadow}
        transform="translate(1, 2)"
      />

      {/* 3. Main Volumetric Gouache Canopy Body (Multi-lobed organic silhouette) */}
      <path
        d="M -26,2
           C -32,-6 -26,-18 -15,-19
           C -9,-28 7,-28 15,-19
           C 26,-17 31,-5 24,4
           C 19,12 8,15 -1,13
           C -12,15 -22,10 -26,2 Z"
        fill={`url(#${gradientId})`}
      />

      {/* 4. Mid-Upper Sunlit Scalloped Leaf Layer (Shifted toward top-left sun) */}
      <path
        d="M -22,-2
           C -26,-9 -20,-18 -11,-19
           C -5,-26 8,-25 13,-17
           C 21,-15 24,-6 18,1
           C 12,6 4,4 -2,6
           C -9,8 -18,4 -22,-2 Z"
        fill={palette.foliageSunlit}
        opacity="0.9"
      />

      {/* 5. Top-Left Crown Sunlit Highlight & Individual Leaf Strokes */}
      {variant !== 'lowerBough' && (
        <path
          d="M -16,-7
             C -19,-13 -14,-20 -6,-20
             C -1,-25 8,-23 11,-16
             C 15,-13 14,-7 9,-4
             C 4,-2 -2,-4 -7,-2
             C -12,-1 -15,-4 -16,-7 Z"
          fill={palette.foliageHighlight}
          opacity="0.88"
        />
      )}

      {/* 6. Crisp Hand-Painted Individual Leaf Tips & Rim-Light Accents */}
      <path
        d="M -12,-18 Q -6,-24 2,-21 Q -4,-16 -12,-18 Z"
        fill={palette.rimLight}
        opacity="0.85"
      />
      <path
        d="M -21,-6 Q -26,-12 -18,-16 Q -15,-10 -21,-6 Z"
        fill={palette.foliageHighlight}
        opacity="0.8"
      />
      <path
        d="M 8,6 Q 16,10 21,3 Q 13,0 8,6 Z"
        fill={palette.foliageShadow}
        opacity="0.75"
      />
    </g>
  );
};

export const TreeGraphic: React.FC<TreeGraphicProps> = React.memo(({
  tree,
  size = 180,
  showShadow = true,
  isSelected = false,
  isWateringActive = false,
  isMilestoneActive = false,
}) => {
  const stage = getGrowthStage(tree.wateredDaysCount);
  const isWithered = tree.isWithered || isTreeWithered(tree.daysWithoutWater);
  const p = getTreePalette(tree.id, isWithered);

  // Progressive sizes across Stages 0..5: Level 1 is a compact seedling (نهال), growing noticeably at every level
  const stageHeights = [84, 124, 156, 188, 222, 256];
  const stageWidths = [82, 112, 140, 168, 198, 226];

  const currentHeight = Math.round((stageHeights[stage] * size) / 180);
  const currentWidth = Math.round((stageWidths[stage] * size) / 180);

  // Scale internal canopy & trunk richness progressively across stages (0..5)
  const canopyScale = [0.68, 0.95, 0.98, 1.04, 1.12, 1.22][stage] || 0.98;
  const trunkScale = [0.76, 0.84, 0.92, 1.0, 1.1, 1.2][stage] || 0.92;

  const uid = `${tree.id}-st${stage}-${isWithered ? 'w' : 'h'}`;
  const breezeDelay = `${((tree.id.length * 7) % 5) * 0.45}s`;

  return (
    <div
      className={`relative flex flex-col items-center justify-end select-none pointer-events-none group ${
        isSelected ? 'hp-tree-select-pop' : ''
      }`}
      style={{ width: currentWidth, height: currentHeight }}
    >
      {/* Believable 2.5D Isometric Ground Cast Shadow (Angled Bottom-Right from Top-Left Sun) */}
      {showShadow && (
        <div
          className="absolute -bottom-1.5 left-1/2 w-[82%] h-7 -translate-x-[42%] rounded-[100%] pointer-events-none transition-all duration-500"
          style={{
            background:
              'radial-gradient(ellipse at 45% 50%, rgba(2, 18, 10, 0.78) 0%, rgba(4, 28, 16, 0.48) 58%, rgba(4, 28, 16, 0) 100%)',
            transform: 'translateX(-38%) rotate(11deg) skewX(-24deg)',
          }}
        />
      )}

      {/* Hand-Painted 2.5D Volumetric Tree SVG */}
      <svg
        viewBox={stage === 0 ? '0 34 160 140' : stage === 1 ? '0 22 160 153' : '0 0 160 175'}
        className={`w-full h-full overflow-visible transition-transform duration-500 ${
          isWithered ? 'opacity-95 saturate-75' : ''
        }`}
        style={{ transformOrigin: '80px 158px' }}
      >
        <defs>
          {/* 3D-Shaded Wooden Trunk Gradient (Lit from Top-Left) */}
          <linearGradient id={`trunk-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="15%">
            <stop offset="0%" stopColor={p.trunkHighlight} />
            <stop offset="28%" stopColor={p.trunkSunlit} />
            <stop offset="65%" stopColor={p.trunkMid} />
            <stop offset="100%" stopColor={p.trunkShadow} />
          </linearGradient>

          {/* Volumetric Canopy Radial Gradient (Top-Left Sunlit to Bottom-Right Shadow) */}
          <radialGradient id={`canopy-grad-${uid}`} cx="34%" cy="28%" r="68%">
            <stop offset="0%" stopColor={p.foliageHighlight} />
            <stop offset="32%" stopColor={p.foliageSunlit} />
            <stop offset="68%" stopColor={p.foliageMid} />
            <stop offset="100%" stopColor={p.foliageShadow} />
          </radialGradient>

          {/* Soft Magical Aura Halo for Mature Stages */}
          <radialGradient id={`aura-grad-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p.glowColor} stopOpacity={isWithered ? 0.04 : 0.36} />
            <stop offset="65%" stopColor={p.accentPrimary} stopOpacity={isWithered ? 0.01 : 0.12} />
            <stop offset="100%" stopColor={p.glowColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Subtle Luminous Halo for Stages 2+ */}
        {!isWithered && stage >= 2 && (
          <ellipse
            cx="80"
            cy="72"
            rx={54 * canopyScale}
            ry={48 * canopyScale}
            fill={`url(#aura-grad-${uid})`}
          />
        )}

        {/* =========================================================================
            1. ISOMETRIC 2.5D PLANTING MOUND, MOSS & ROOT FLARES
           ========================================================================= */}
        <g transform="translate(80, 154)">
          {/* Soft Ambient Occlusion Ring on Soil */}
          <ellipse cx="4" cy="4" rx={32 * trunkScale} ry={13 * trunkScale} fill="#03170d" opacity="0.65" />

          {/* Interactive 2.5D Ground Selection / Watering / Milestone Rings */}
          {(isSelected || isWateringActive || isMilestoneActive) && (
            <g>
              <ellipse
                cx="0"
                cy="2"
                rx={36 * trunkScale}
                ry={15 * trunkScale}
                fill="none"
                stroke={
                  isMilestoneActive
                    ? '#fde047'
                    : isWateringActive
                    ? '#38bdf8'
                    : '#6ee7b7'
                }
                strokeWidth="2.4"
                className="hp-ground-ring"
              />
              <ellipse
                cx="0"
                cy="2"
                rx={31 * trunkScale}
                ry={12.5 * trunkScale}
                fill="none"
                stroke={isMilestoneActive ? '#fbbf24' : '#7dd3fc'}
                strokeWidth="1.5"
                strokeDasharray="6 4"
                opacity="0.88"
              />
            </g>
          )}

          {/* Sculpted Earth & Moss Mound (Organic path, not flat circle) */}
          <path
            d="M -28,2
               C -30,-4 -18,-9 0,-9
               C 18,-9 30,-4 28,2
               C 25,8 12,11 0,11
               C -12,11 -25,8 -28,2 Z"
            fill="#3b2311"
            transform={`scale(${trunkScale})`}
          />
          <path
            d="M -23,0
               C -24,-4 -14,-7 0,-7
               C 14,-7 24,-4 23,0
               C 20,5 10,7 0,7
               C -10,7 -20,5 -23,0 Z"
            fill="#59371c"
            transform={`scale(${trunkScale})`}
          />

          {/* Painted Moss Tufts Around Root Base */}
          {!isWithered ? (
            <g transform={`scale(${trunkScale})`}>
              <path
                d="M -22,2 Q -16,-3 -9,1 Q -15,5 -22,2 Z"
                fill="#22c55e"
                opacity="0.85"
              />
              <path
                d="M 10,2 Q 17,-2 23,3 Q 16,6 10,2 Z"
                fill="#15803d"
                opacity="0.85"
              />
              <path
                d="M -6,5 Q 0,1 7,5 Q 0,8 -6,5 Z"
                fill="#4ade80"
                opacity="0.8"
              />
            </g>
          ) : (
            /* Fallen Withered Autumn Leaves on Ground */
            <g transform={`scale(${trunkScale})`}>
              <path d="M -18,3 Q -13,0 -9,4 Q -14,6 -18,3 Z" fill="#997a58" />
              <path d="M 11,4 Q 16,1 20,5 Q 15,7 11,4 Z" fill="#785d40" />
            </g>
          )}
        </g>

        {stage === 0 ? (
          /* =========================================================================
             STAGE 0 (سطح ۱): TENDER HAND-PAINTED 2.5D SEEDLING / SAPLING (نهال آغازین)
             ========================================================================= */
          <g transform="translate(80, 152)">
            {/* Delicate Ground Shadow Under Leaves */}
            <ellipse cx="3" cy="0" rx="22" ry="7" fill={p.foliageDeepShadow} opacity="0.35" />

            <g
              className={!isWithered ? 'hp-canopy-breeze' : undefined}
              style={!isWithered ? { animationDelay: breezeDelay, transformOrigin: '0px 0px' } : undefined}
            >
              {/* Small Tender Sprout Stem (Curved young stem, NOT a thick adult bark trunk) */}
              <path
                d={
                  isWithered
                    ? 'M -3,0 C -3,-22 -6,-46 6,-68 C 9,-72 13,-71 10,-65 C 0,-45 2,-22 3,0 Z'
                    : 'M -4,0 C -3,-26 -6,-56 0,-88 C 1,-92 5,-92 5,-87 C 1,-55 2,-26 4,0 Z'
                }
                fill={isWithered ? p.trunkMid : p.foliageShadow}
              />
              {/* Sunlit Left Highlight Along Tender Stem */}
              <path
                d={
                  isWithered
                    ? 'M -2,-2 C -2,-22 -4,-45 5,-66'
                    : 'M -2,-2 C -1,-26 -4,-55 1,-86'
                }
                stroke={isWithered ? p.trunkHighlight : p.foliageSunlit}
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />

              {/* Small Wooden Collar at Base of Shoot */}
              <path
                d="M -6,1 C -5,-6 -3,-14 0,-16 C 3,-14 5,-6 6,1 Z"
                fill={`url(#trunk-grad-${uid})`}
              />

              {/* Lower Left Broad Seedling Leaf */}
              <g transform={isWithered ? 'translate(-2, -32) rotate(26)' : 'translate(-2, -36) rotate(-14)'}>
                <path
                  d="M 0,0 C -18,-4 -36,-18 -40,-34 C -24,-36 -6,-24 0,0 Z"
                  fill={p.foliageShadow}
                  transform="translate(1.5, 3)"
                />
                <path
                  d="M 0,0 C -18,-4 -36,-18 -40,-34 C -24,-36 -6,-24 0,0 Z"
                  fill={`url(#canopy-grad-${uid})`}
                />
                <path
                  d="M -4,-5 C -18,-10 -30,-20 -35,-31 C -21,-31 -8,-21 -4,-5 Z"
                  fill={p.foliageHighlight}
                  opacity="0.65"
                />
                <path
                  d="M -2,-3 Q -18,-14 -33,-28"
                  stroke={p.rimLight}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.85"
                />
              </g>

              {/* Lower Right Broad Seedling Leaf */}
              <g transform={isWithered ? 'translate(3, -38) rotate(32)' : 'translate(2, -46) rotate(12)'}>
                <path
                  d="M 0,0 C 18,-3 36,-16 40,-32 C 24,-34 6,-22 0,0 Z"
                  fill={p.foliageShadow}
                  transform="translate(1.5, 3)"
                />
                <path
                  d="M 0,0 C 18,-3 36,-16 40,-32 C 24,-34 6,-22 0,0 Z"
                  fill={`url(#canopy-grad-${uid})`}
                />
                <path
                  d="M 4,-5 C 17,-9 29,-18 34,-29 C 21,-29 8,-19 4,-5 Z"
                  fill={p.foliageSunlit}
                  opacity="0.72"
                />
                <path
                  d="M 2,-3 Q 18,-13 32,-26"
                  stroke={p.rimLight}
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.78"
                />
              </g>

              {/* Upper Left Young Unfurling Leaf */}
              {!isWithered && (
                <g transform="translate(0, -68) rotate(-8)">
                  <path
                    d="M 0,0 C -14,-5 -25,-18 -26,-32 C -12,-30 -2,-18 0,0 Z"
                    fill={`url(#canopy-grad-${uid})`}
                  />
                  <path
                    d="M -3,-4 C -13,-10 -20,-19 -22,-29 C -11,-26 -4,-16 -3,-4 Z"
                    fill={p.foliageHighlight}
                    opacity="0.82"
                  />
                </g>
              )}

              {/* Apical Crown Bud / Twin Unfurling Tips */}
              <g transform={isWithered ? 'translate(9, -68) rotate(36)' : 'translate(2, -88)'}>
                <path
                  d="M 0,0 C -7,-10 -6,-23 2,-30 C 10,-23 9,-10 0,0 Z"
                  fill={p.foliageSunlit}
                  stroke={p.foliageShadow}
                  strokeWidth="1"
                />
                <path
                  d="M 0,-4 C -3,-12 -2,-21 2,-26 C 5,-20 4,-11 0,-4 Z"
                  fill={p.rimLight}
                  opacity="0.85"
                />
              </g>

              {/* Species-Specific Tiny Seedling Charm / Bud (keeps all 7 trees distinct at Level 1) */}
              {!isWithered && tree.id === 'speed_reading' && (
                <g transform="translate(-15, -52) rotate(-18)">
                  <path
                    d="M 0,6 C -3,0 -2,-7 4,-11 C 6,-6 5,1 0,6 Z"
                    fill="#fde047"
                    stroke="#b45309"
                    strokeWidth="0.9"
                  />
                  <circle cx="14" cy="-16" r="3.4" fill="#f59e0b" stroke="#fef08a" strokeWidth="1" />
                </g>
              )}
              {!isWithered && tree.id === 'gratitude' && (
                <g transform="translate(2, -96) scale(1.15)">
                  <path
                    d="M 0,-5 C 2,-5 3,-2 5,-2 C 6,0 4,3 3,5 C 1,6 -1,4 -3,5 C -5,3 -6,0 -4,-2 C -2,-2 -2,-5 0,-5 Z"
                    fill="#fce7f3"
                    stroke="#db2777"
                    strokeWidth="0.85"
                  />
                  <circle cx="0" cy="0" r="1.4" fill="#fde047" />
                </g>
              )}
              {!isWithered && tree.id === 'deep_breathing' && (
                <g transform="translate(14, -56)">
                  <path
                    d="M 0,-6 C 4,-3 6,1 0,6 C -6,1 -4,-3 0,-6 Z"
                    fill="#e0f2fe"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />
                </g>
              )}
              {!isWithered && tree.id === 'bina_balls' && (
                <g transform="translate(2, -98)">
                  <polygon
                    points="0,-6 5,0 0,6 -5,0"
                    fill="#fde047"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                </g>
              )}
              {!isWithered && tree.id === 'memory_cards' && (
                <g transform="translate(15, -58) rotate(14)">
                  <path
                    d="M 0,6 L -7,-4 C -5,-8 -1,-8 0,-4 C 1,-8 5,-8 7,-4 Z"
                    fill="#fef08a"
                    stroke="#b45309"
                    strokeWidth="0.9"
                  />
                </g>
              )}
              {!isWithered && tree.id === 'brain_math' && (
                <g transform="translate(2, -97)">
                  <circle cx="0" cy="0" r="5" fill="#fde047" stroke="#a21caf" strokeWidth="1.1" />
                  <path d="M -2.5,0 L 2.5,0 M 0,-2.5 L 0,2.5" stroke="#701a75" strokeWidth="1.2" />
                </g>
              )}
              {!isWithered && tree.id === 'poetry' && (
                <g transform="translate(2, -96) scale(1.1)">
                  <path
                    d="M -5,0 C -6,-4 -2,-6 1,-5 C 5,-6 6,-2 5,1 C 4,5 -1,6 -4,4 C -6,2 -5,0 -5,0 Z"
                    fill="#e11d48"
                    stroke="#881337"
                    strokeWidth="0.85"
                  />
                  <path d="M -2,-1 C -2,-3 1,-3 2,-1 C 3,1 0,3 -2,1" stroke="#fecdd3" strokeWidth="1" fill="none" />
                </g>
              )}
            </g>

            {/* Watering Droplets & Milestone Sparkles for Seedling */}
            {isWateringActive && (
              <g>
                {[
                  { x: -16, y: -112, d: '0s' },
                  { x: 2, y: -120, d: '0.25s' },
                  { x: 18, y: -110, d: '0.5s' },
                ].map((drop, idx) => (
                  <path
                    key={`seed-wdrop-${idx}`}
                    d={`M ${drop.x},${drop.y} C ${drop.x - 3},${drop.y + 5} ${drop.x - 3},${drop.y + 9} ${drop.x},${drop.y + 9} C ${drop.x + 3},${drop.y + 9} ${drop.x + 3},${drop.y + 5} ${drop.x},${drop.y} Z`}
                    fill="#38bdf8"
                    stroke="#e0f2fe"
                    strokeWidth="0.8"
                    className="hp-water-droplet"
                    style={{ animationDelay: drop.d }}
                  />
                ))}
              </g>
            )}

            {isMilestoneActive && (
              <g>
                {[
                  { x: -22, y: -74, d: '0s', c: '#fde047' },
                  { x: 22, y: -78, d: '0.3s', c: '#6ee7b7' },
                  { x: 0, y: -110, d: '0.6s', c: '#fef08a' },
                ].map((sp, idx) => (
                  <polygon
                    key={`seed-mspark-${idx}`}
                    points={`${sp.x},${sp.y - 5} ${sp.x + 2},${sp.y - 1.5} ${sp.x + 5},${sp.y} ${sp.x + 2},${sp.y + 1.5} ${sp.x},${sp.y + 5} ${sp.x - 2},${sp.y + 1.5} ${sp.x - 5},${sp.y} ${sp.x - 2},${sp.y - 1.5}`}
                    fill={sp.c}
                    stroke="#78350f"
                    strokeWidth="0.5"
                    className="hp-milestone-sparkle"
                    style={{ animationDelay: sp.d }}
                  />
                ))}
              </g>
            )}
          </g>
        ) : (
          <>
        {/* =========================================================================
            2. SCULPTED 2.5D WOODEN TRUNK, ROOT BUTTRESSES & VISIBLE BRANCHES
           ========================================================================= */}
        <g transform={`translate(80, 152) scale(${trunkScale})`}>
          {/* Back Shaded Branch (Right-Rear) */}
          <path
            d="M 2,-44 C 14,-54 26,-64 34,-74 C 30,-62 18,-48 5,-36 Z"
            fill={p.trunkShadow}
          />

          {/* Main Organic Tapered Trunk with Flared Roots */}
          <path
            d="M -18,4
               C -13,-2 -10,-14 -8,-30
               C -7,-44 -9,-58 -4,-74
               L 6,-74
               C 7,-58 6,-42 8,-28
               C 11,-12 15,-2 20,4
               C 13,6 6,3 2,5
               C -3,7 -11,6 -18,4 Z"
            fill={`url(#trunk-grad-${uid})`}
          />

          {/* Sunlit Left Bark Ridge & Root Buttress */}
          <path
            d="M -16,3
               C -11,-4 -8,-18 -6,-34
               C -5,-48 -6,-60 -2,-72
               C -3,-56 -3,-42 -4,-28
               C -6,-14 -10,-2 -16,3 Z"
            fill={p.trunkHighlight}
            opacity="0.72"
          />

          {/* Deep Right Bark Shadow & Under-Canopy Trunk Shadow */}
          <path
            d="M 3,-72
               C 5,-56 4,-40 6,-26
               C 8,-12 12,-2 18,3
               C 14,4 10,4 7,3
               C 4,-8 2,-24 1,-42
               C 0,-54 1,-64 3,-72 Z"
            fill={p.trunkShadow}
            opacity="0.78"
          />

          {/* Visible Left & Right Forked Boughs Supporting the Canopy */}
          <path
            d="M -4,-48
               C -16,-56 -26,-64 -34,-73
               L -28,-76
               C -20,-67 -11,-59 -2,-53 Z"
            fill={p.trunkSunlit}
          />
          <path
            d="M 3,-52
               C 15,-60 25,-68 32,-77
               L 26,-79
               C 19,-71 10,-63 1,-57 Z"
            fill={p.trunkMid}
          />

          {/* Extra Muscular Lower Limbs for Stages 2+ */}
          {stage >= 2 && (
            <>
              <path
                d="M -6,-38 C -22,-44 -34,-52 -42,-62 L -37,-65 C -29,-56 -18,-48 -4,-43 Z"
                fill={p.trunkSunlit}
              />
              <path
                d="M 5,-40 C 21,-46 33,-54 41,-64 L 36,-67 C 28,-58 17,-50 3,-45 Z"
                fill={p.trunkShadow}
              />
            </>
          )}

          {/* Hand-Painted Bark Grain Lines & Hollow Knot */}
          <path
            d="M -3,-10 Q -1,-28 -2,-46 M 2,-16 Q 4,-32 2,-50"
            stroke={p.trunkShadow}
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
          />
          <ellipse cx="1" cy="-26" rx="2.2" ry="3.2" fill={p.trunkShadow} opacity="0.8" />
        </g>

        {/* =========================================================================
            3. VOLUMETRIC LAYERED HAND-PAINTED 2.5D FOLIAGE CANOPY
               (Back-to-Front Painterly Clusters + Gentle Leaf Breeze)
           ========================================================================= */}
        <g transform={`translate(80, ${102 - stage * 3}) scale(${canopyScale})`}>
          {/* Cast Shadow of Canopy onto Upper Trunk */}
          <ellipse cx="0" cy="18" rx="18" ry="7" fill={p.foliageDeepShadow} opacity="0.85" />

          <g
            className={!isWithered ? 'hp-canopy-breeze' : undefined}
            style={!isWithered ? { animationDelay: breezeDelay } : undefined}
          >

          {/* LAYER A: Deep Background Bough Clusters (Stages 2+ only so Stage 1 stays a compact sapling) */}
          {stage >= 2 && (
            <>
              <HandPaintedFoliageCluster
                cx={-26}
                cy={4}
                scale={0.82}
                rotation={-12}
                palette={p}
                gradientId={`canopy-grad-${uid}`}
                variant="lowerBough"
              />
              <HandPaintedFoliageCluster
                cx={27}
                cy={5}
                scale={0.82}
                rotation={12}
                palette={p}
                gradientId={`canopy-grad-${uid}`}
                variant="lowerBough"
              />
            </>
          )}

          {/* Additional Wide Lower Boughs for Stages 3+ */}
          {stage >= 3 && (
            <>
              <HandPaintedFoliageCluster
                cx={-38}
                cy={-6}
                scale={0.78}
                rotation={-18}
                palette={p}
                gradientId={`canopy-grad-${uid}`}
                variant="leftBough"
              />
              <HandPaintedFoliageCluster
                cx={39}
                cy={-5}
                scale={0.78}
                rotation={16}
                palette={p}
                gradientId={`canopy-grad-${uid}`}
                variant="rightBough"
              />
            </>
          )}

          {/* Visible Mid-Canopy Wooden Branch Peeks (Breaks up foliage so tree looks organic) */}
          <path
            d="M -10,4 Q -22,-4 -30,-10 M 10,5 Q 22,-3 29,-9"
            stroke={p.trunkMid}
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M -10,3 Q -22,-5 -30,-11"
            stroke={p.trunkHighlight}
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* LAYER B: Mid-Tier Flanking Leaf Volumes */}
          <HandPaintedFoliageCluster
            cx={-22}
            cy={-14}
            scale={stage === 1 ? 0.9 : 0.92}
            rotation={-8}
            palette={p}
            gradientId={`canopy-grad-${uid}`}
            variant="leftBough"
          />
          <HandPaintedFoliageCluster
            cx={23}
            cy={-12}
            scale={stage === 1 ? 0.88 : 0.9}
            rotation={9}
            palette={p}
            gradientId={`canopy-grad-${uid}`}
            variant="rightBough"
          />

          {/* Extra Upper-Flank Clusters for Stages 2+ */}
          {stage >= 2 && (
            <>
              <HandPaintedFoliageCluster
                cx={-15}
                cy={-28}
                scale={0.86}
                rotation={-5}
                palette={p}
                gradientId={`canopy-grad-${uid}`}
                variant="crown"
              />
              <HandPaintedFoliageCluster
                cx={16}
                cy={-26}
                scale={0.84}
                rotation={6}
                palette={p}
                gradientId={`canopy-grad-${uid}`}
                variant="crown"
              />
            </>
          )}

          {/* Extra Majestic Tier for Stages 3, 4, 5 */}
          {stage >= 3 && (
            <>
              <HandPaintedFoliageCluster
                cx={-32}
                cy={-22}
                scale={0.76}
                rotation={-14}
                palette={p}
                gradientId={`canopy-grad-${uid}`}
                variant="leftBough"
              />
              <HandPaintedFoliageCluster
                cx={33}
                cy={-20}
                scale={0.76}
                rotation={14}
                palette={p}
                gradientId={`canopy-grad-${uid}`}
                variant="rightBough"
              />
            </>
          )}

          {/* LAYER C: Central Foreground Volume & Sunlit Crown Apex */}
          <HandPaintedFoliageCluster
            cx={0}
            cy={-8}
            scale={1.04}
            rotation={0}
            palette={p}
            gradientId={`canopy-grad-${uid}`}
            variant="crown"
          />
          <HandPaintedFoliageCluster
            cx={-2}
            cy={-26 - (stage >= 2 ? 6 : 0)}
            scale={0.95}
            rotation={-2}
            palette={p}
            gradientId={`canopy-grad-${uid}`}
            variant="crown"
          />

          {/* Stage 4 & 5 Sovereign Crown Crest */}
          {stage >= 4 && (
            <HandPaintedFoliageCluster
              cx={0}
              cy={-42}
              scale={0.78}
              rotation={0}
              palette={p}
              gradientId={`canopy-grad-${uid}`}
              variant="crown"
            />
          )}

          {/* =====================================================================
              4. TREE-SPECIFIC HAND-PAINTED BOTANICAL & LORE DETAILS
                 (Custom Vector Artwork per Tree Type — Preserving Every Identity)
             ===================================================================== */}

          {/* A. SPEED READING TREE (درخت تندخوانی): Golden Sunberries & Winged Light Feather */}
          {tree.id === 'speed_reading' && !isWithered && (
            <g>
              {[
                { x: -24, y: -12 },
                { x: 20, y: -16 },
                { x: -8, y: -30 },
                { x: 12, y: -4 },
              ].map((b, i) => (
                <g key={`sr-berry-${i}`} transform={`translate(${b.x}, ${b.y})`}>
                  <path
                    d="M 0,-4 C 3,-4 4,-1 3,2 C 2,4 -2,4 -3,2 C -4,-1 -3,-4 0,-4 Z"
                    fill="#f59e0b"
                  />
                  <path
                    d="M -1,-3 C 1,-3 2,-1 1,1 C 0,2 -2,1 -2,-1 C -2,-2 -2,-3 -1,-3 Z"
                    fill="#fef08a"
                  />
                </g>
              ))}
              {/* Hand-Painted Golden Angel Wing Feather Emblem */}
              <g transform="translate(-4, -14) rotate(-18)">
                <path
                  d="M 0,10 C -4,2 -3,-8 6,-14 C 9,-8 7,2 0,10 Z"
                  fill="#fde047"
                  stroke="#b45309"
                  strokeWidth="1"
                />
                <path
                  d="M 1,8 C -1,1 0,-6 5,-11"
                  stroke="#ffffff"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            </g>
          )}

          {/* B. GRATITUDE TREE (درخت شکرگزاری): Sakura Blossoms & Cozy Bird Nest with Dove */}
          {tree.id === 'gratitude' && !isWithered && (
            <g>
              {[
                { x: -22, y: -16, s: 1 },
                { x: 18, y: -22, s: 0.95 },
                { x: -6, y: -32, s: 1.05 },
                { x: -16, y: 2, s: 0.9 },
              ].map((fl, i) => (
                <g
                  key={`sakura-${i}`}
                  transform={`translate(${fl.x}, ${fl.y}) scale(${fl.s})`}
                >
                  <path
                    d="M 0,-5 C 2,-5 3,-2 5,-2 C 6,0 4,3 3,5 C 1,6 -1,4 -3,5 C -5,3 -6,0 -4,-2 C -2,-2 -2,-5 0,-5 Z"
                    fill="#fce7f3"
                    stroke="#db2777"
                    strokeWidth="0.8"
                  />
                  <path d="M -1,-1 L 1,-1 L 0,1 Z" fill="#fde047" />
                </g>
              ))}
              {/* Woven Nest & White Peace Bird on Right Bough */}
              <g transform="translate(22, 0)">
                <path
                  d="M -9,2 C -8,7 8,7 9,2 C 7,-1 -7,-1 -9,2 Z"
                  fill="#78350f"
                  stroke="#451a03"
                  strokeWidth="1"
                />
                <path
                  d="M -5,1 C -4,-4 2,-5 5,-1 C 7,-2 9,0 7,2 C 3,3 -3,3 -5,1 Z"
                  fill="#f8fafc"
                  stroke="#94a3b8"
                  strokeWidth="0.8"
                />
                <path d="M 6,-1 L 9,-2 L 7,1 Z" fill="#f59e0b" />
              </g>
            </g>
          )}

          {/* C. DEEP BREATHING TREE (درخت تنفس عمیق): Flowing Zen Air Ribbons & Aqua Lotus Pearls */}
          {tree.id === 'deep_breathing' && !isWithered && (
            <g>
              <path
                d="M -26,-6 Q -32,8 -28,18 M 26,-4 Q 32,10 28,20"
                stroke="#bae6fd"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
                opacity="0.85"
              />
              {[
                { x: -18, y: -14 },
                { x: 16, y: -18 },
                { x: 0, y: -28 },
              ].map((orb, i) => (
                <g key={`breath-pearl-${i}`} transform={`translate(${orb.x}, ${orb.y})`}>
                  <path
                    d="M 0,-5 C 3,-3 5,0 0,5 C -5,0 -3,-3 0,-5 Z"
                    fill="#e0f2fe"
                    stroke="#0284c7"
                    strokeWidth="0.9"
                  />
                </g>
              ))}
            </g>
          )}

          {/* D. BINA TREE (درخت بینا): Luminous Vision Crystals & Starlight Nodes */}
          {tree.id === 'bina_balls' && !isWithered && (
            <g>
              {[
                { x: -20, y: -14, c: '#fde047' },
                { x: 20, y: -12, c: '#38bdf8' },
                { x: 0, y: -28, c: '#f472b6' },
                { x: -8, y: -2, c: '#a78bfa' },
              ].map((gem, i) => (
                <g key={`bina-gem-${i}`} transform={`translate(${gem.x}, ${gem.y})`}>
                  <polygon
                    points="0,-5 4,0 0,5 -4,0"
                    fill={gem.c}
                    stroke="#ffffff"
                    strokeWidth="0.9"
                  />
                </g>
              ))}
            </g>
          )}

          {/* E. MEMORY TREE (درخت حافظه): Golden Ginkgo Fan Leaves & Wisdom Lanterns */}
          {tree.id === 'memory_cards' && !isWithered && (
            <g>
              {[
                { x: -20, y: -15, r: -15 },
                { x: 19, y: -14, r: 18 },
                { x: 0, y: -28, r: 0 },
              ].map((fan, i) => (
                <g
                  key={`ginkgo-${i}`}
                  transform={`translate(${fan.x}, ${fan.y}) rotate(${fan.r})`}
                >
                  <path
                    d="M 0,4 L -6,-3 C -4,-6 -1,-6 0,-3 C 1,-6 4,-6 6,-3 Z"
                    fill="#fef08a"
                    stroke="#b45309"
                    strokeWidth="0.8"
                  />
                </g>
              ))}
            </g>
          )}

          {/* F. BRAIN MATH TREE (درخت مغز): Golden Neural Pathways & Glowing Math Runes */}
          {tree.id === 'brain_math' && !isWithered && (
            <g>
              {/* Luminous Neural Synapse Filaments */}
              <path
                d="M -18,-10 Q 0,-22 18,-10 M -12,0 Q 0,-12 12,0"
                stroke="#fde047"
                strokeWidth="1.4"
                strokeDasharray="2 2"
                fill="none"
                opacity="0.9"
              />
              {/* Hand-Crafted Golden Neural Emblem in Center */}
              <g transform="translate(0, -14)">
                <path
                  d="M -7,0 C -9,-5 -4,-9 0,-7 C 4,-9 9,-5 7,0 C 9,4 4,8 0,6 C -4,8 -9,4 -7,0 Z"
                  fill="#fef08a"
                  stroke="#a21caf"
                  strokeWidth="1.2"
                />
                <path
                  d="M 0,-6 L 0,5 M -4,-2 Q 0,-4 4,-2 M -4,2 Q 0,4 4,2"
                  stroke="#701a75"
                  strokeWidth="1"
                  fill="none"
                />
              </g>
              <text
                x="-24"
                y="-14"
                fontSize="11"
                fontWeight="900"
                fill="#fde047"
                stroke="#4a044e"
                strokeWidth="0.6"
              >
                +
              </text>
              <text
                x="18"
                y="-14"
                fontSize="12"
                fontWeight="900"
                fill="#38bdf8"
                stroke="#4a044e"
                strokeWidth="0.6"
              >
                −
              </text>
            </g>
          )}

          {/* G. POETRY TREE (درخت شعر پارسی): Crimson Shiraz Roses & Golden Persian Scroll */}
          {tree.id === 'poetry' && !isWithered && (
            <g>
              {/* Hand-Painted Crimson Shiraz Roses Blooming in Turquoise Canopy */}
              {[
                { x: -20, y: -16, s: 1 },
                { x: 18, y: -18, s: 0.95 },
                { x: -4, y: -30, s: 1.05 },
              ].map((rose, i) => (
                <g
                  key={`shiraz-rose-${i}`}
                  transform={`translate(${rose.x}, ${rose.y}) scale(${rose.s})`}
                >
                  <path
                    d="M -5,0 C -6,-4 -2,-6 1,-5 C 5,-6 6,-2 5,1 C 4,5 -1,6 -4,4 C -6,2 -5,0 -5,0 Z"
                    fill="#e11d48"
                    stroke="#881337"
                    strokeWidth="0.8"
                  />
                  <path
                    d="M -2,-1 C -2,-3 1,-3 2,-1 C 3,1 0,3 -2,1"
                    stroke="#fecdd3"
                    strokeWidth="1"
                    fill="none"
                  />
                </g>
              ))}
              {/* Miniature Golden Persian Poetry Scroll Hanging from Lower Bough */}
              <g transform="translate(0, -5) rotate(-8)">
                <rect
                  x="-7"
                  y="-4"
                  width="14"
                  height="9"
                  rx="2"
                  fill="#fef3c7"
                  stroke="#b45309"
                  strokeWidth="1"
                />
                <line x1="-7" y1="-4" x2="-7" y2="5" stroke="#f59e0b" strokeWidth="2" />
                <line x1="7" y1="-4" x2="7" y2="5" stroke="#f59e0b" strokeWidth="2" />
                <line x1="-4" y1="-1" x2="4" y2="-1" stroke="#92400e" strokeWidth="0.9" />
                <line x1="-4" y1="2" x2="3" y2="2" stroke="#92400e" strokeWidth="0.9" />
              </g>
            </g>
          )}
          </g>

          {/* Subtle Floating Leaf / Dew Sparkle Accents when Watering or Milestone Reached */}
          {isWateringActive && (
            <g>
              {[
                { x: -18, y: -38, d: '0s' },
                { x: 0, y: -44, d: '0.25s' },
                { x: 18, y: -36, d: '0.5s' },
              ].map((drop, idx) => (
                <path
                  key={`wdrop-${idx}`}
                  d={`M ${drop.x},${drop.y} C ${drop.x - 3},${drop.y + 5} ${drop.x - 3},${drop.y + 9} ${drop.x},${drop.y + 9} C ${drop.x + 3},${drop.y + 9} ${drop.x + 3},${drop.y + 5} ${drop.x},${drop.y} Z`}
                  fill="#38bdf8"
                  stroke="#e0f2fe"
                  strokeWidth="0.8"
                  className="hp-water-droplet"
                  style={{ animationDelay: drop.d }}
                />
              ))}
            </g>
          )}

          {isMilestoneActive && (
            <g>
              {[
                { x: -24, y: -10, d: '0s', c: '#fde047' },
                { x: 24, y: -14, d: '0.3s', c: '#6ee7b7' },
                { x: 0, y: -34, d: '0.6s', c: '#fef08a' },
              ].map((sp, idx) => (
                <polygon
                  key={`mspark-${idx}`}
                  points={`${sp.x},${sp.y - 5} ${sp.x + 2},${sp.y - 1.5} ${sp.x + 5},${sp.y} ${sp.x + 2},${sp.y + 1.5} ${sp.x},${sp.y + 5} ${sp.x - 2},${sp.y + 1.5} ${sp.x - 5},${sp.y} ${sp.x - 2},${sp.y - 1.5}`}
                  fill={sp.c}
                  stroke="#78350f"
                  strokeWidth="0.5"
                  className="hp-milestone-sparkle"
                  style={{ animationDelay: sp.d }}
                />
              ))}
            </g>
          )}
        </g>
          </>
        )}
      </svg>
    </div>
  );
}, (prev, next) =>
  prev.tree.id === next.tree.id &&
  prev.tree.wateredDaysCount === next.tree.wateredDaysCount &&
  prev.tree.isWithered === next.tree.isWithered &&
  prev.tree.daysWithoutWater === next.tree.daysWithoutWater &&
  prev.size === next.size &&
  prev.showShadow === next.showShadow &&
  prev.isSelected === next.isSelected &&
  prev.isWateringActive === next.isWateringActive &&
  prev.isMilestoneActive === next.isMilestoneActive
);

/**
 * Hand-Painted 2.5D Dormant Seedling Planter for Locked Garden Plots
 */
export const DormantSeedlingGraphic: React.FC<{ size?: number }> = React.memo(({ size = 58 }) => {
  return (
    <svg
      viewBox="0 0 80 70"
      style={{ width: size, height: Math.round((size * 70) / 80) }}
      className="overflow-visible"
    >
      {/* Directional 2.5D Cast Shadow */}
      <ellipse cx="43" cy="54" rx="26" ry="10" fill="#03170d" opacity="0.65" />

      {/* 2.5D Sculpted Stone & Terra-Cotta Planter Rim */}
      <path
        d="M 16,46 C 14,38 26,33 40,33 C 54,33 66,38 64,46 C 62,54 52,58 40,58 C 28,58 18,54 16,46 Z"
        fill="#78350f"
        stroke="#fbbf24"
        strokeWidth="1.5"
      />
      {/* Rich Soil Basin */}
      <ellipse cx="40" cy="43" rx="20" ry="7.5" fill="#3b2311" />
      <ellipse cx="39" cy="42" rx="15" ry="5" fill="#59371c" />

      {/* Tender Hand-Painted Two-Leaf Sprout */}
      <path
        d="M 40,43 Q 39,31 41,23"
        stroke="#4ade80"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 40,29 C 32,27 27,21 31,17 C 36,16 40,22 40,29 Z"
        fill="#22c55e"
        stroke="#bbf7d0"
        strokeWidth="0.9"
      />
      <path
        d="M 41,26 C 49,24 54,18 50,14 C 45,13 41,19 41,26 Z"
        fill="#4ade80"
        stroke="#dcfce7"
        strokeWidth="0.9"
      />
    </svg>
  );
});

/**
 * Shared SVG <defs> symbols for AmbientForestTree25D ('oak' | 'pine' | 'cypress').
 * Defining the 3 forest tree geometries once in <defs> and instancing them via <use>
 * eliminates ~1,400 redundant SVG DOM nodes across Garden2DView (67 trees) and WorldMapView (39 trees).
 */
export const AmbientForestDefs: React.FC = React.memo(() => (
  <>
    <g id="hp-forest-oak">
      <ellipse cx="8" cy="27" rx="29" ry="12" fill="#16a34a" opacity="0.22" />
      <ellipse cx="2" cy="25" rx="16" ry="7" fill="#22c55e" opacity="0.22" />
      <path
        d="M -10,26 C -7,18 -5,6 -4,-8 L 5,-8 C 6,6 8,18 12,26 C 6,28 -4,28 -10,26 Z"
        fill="#6b3e1b"
      />
      <path
        d="M -8,25 C -5,17 -4,6 -3,-7 L 0,-7 C 0,6 -2,17 -4,25 Z"
        fill="#a1622e"
      />
      <path
        d="M -3,-2 Q -14,-10 -20,-16 M 3,-3 Q 14,-10 19,-15"
        stroke="#784620"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M -28,-8 C -34,-18 -26,-30 -14,-32 C -6,-42 10,-42 18,-31 C 30,-28 35,-15 27,-5 C 21,4 8,7 -1,5 C -12,7 -23,1 -28,-8 Z"
        fill="#22c55e"
        transform="translate(3, 4)"
      />
      <path
        d="M -28,-10 C -34,-20 -26,-32 -14,-34 C -6,-44 10,-44 18,-33 C 30,-30 35,-17 27,-7 C 21,2 8,5 -1,3 C -12,5 -23,-1 -28,-10 Z"
        fill="#4ade80"
      />
      <path
        d="M -24,-16 C -29,-25 -22,-36 -11,-37 C -4,-46 10,-45 16,-36 C 25,-33 28,-22 21,-14 C 15,-7 5,-6 -3,-7 C -12,-5 -20,-9 -24,-16 Z"
        fill="#86efac"
      />
      <path
        d="M -18,-24 C -22,-31 -16,-39 -7,-40 C -1,-46 9,-44 13,-37 C 18,-34 17,-26 11,-22 C 5,-19 -2,-21 -8,-19 C -14,-18 -17,-21 -18,-24 Z"
        fill="#bbf7d0"
        opacity="0.92"
      />
      <path
        d="M -12,-34 Q -5,-41 4,-38 Q -3,-32 -12,-34 Z"
        fill="#ecfccb"
        opacity="0.9"
      />
    </g>

    <g id="hp-forest-pine">
      <ellipse cx="8" cy="27" rx="29" ry="12" fill="#16a34a" opacity="0.22" />
      <ellipse cx="2" cy="25" rx="16" ry="7" fill="#22c55e" opacity="0.22" />
      <path
        d="M -7,26 C -5,16 -4,4 -3,-10 L 4,-10 C 5,4 6,16 8,26 Z"
        fill="#6b3e1b"
      />
      <path d="M -5,25 L -2,-8 L 1,-8 L -2,25 Z" fill="#a1622e" />
      <path
        d="M 0,-18 C -10,-6 -22,4 -30,10 C -22,14 -12,12 -6,15 C 0,18 8,17 14,14 C 21,15 27,13 30,9 C 22,2 10,-6 0,-18 Z"
        fill="#22c55e"
      />
      <path
        d="M 0,-18 C -10,-6 -21,3 -28,9 C -20,12 -11,10 -5,13 C 1,15 5,12 6,6 C 4,-4 2,-12 0,-18 Z"
        fill="#4ade80"
      />
      <path
        d="M 0,-36 C -9,-25 -19,-15 -25,-8 C -18,-5 -10,-6 -4,-4 C 2,-2 9,-3 14,-6 C 19,-5 23,-7 25,-9 C 18,-16 9,-25 0,-36 Z"
        fill="#22c55e"
      />
      <path
        d="M 0,-36 C -9,-25 -18,-16 -23,-9 C -16,-6 -9,-7 -3,-5 C 2,-4 5,-7 5,-14 C 3,-22 2,-30 0,-36 Z"
        fill="#86efac"
      />
      <path
        d="M 0,-52 C -7,-42 -15,-33 -19,-26 C -13,-23 -7,-24 -2,-22 C 3,-21 9,-22 13,-24 C 16,-24 18,-25 19,-27 C 14,-34 7,-42 0,-52 Z"
        fill="#4ade80"
      />
      <path
        d="M 0,-52 C -7,-42 -14,-34 -18,-27 C -12,-24 -6,-25 -2,-23 C 2,-22 4,-26 4,-32 C 2,-40 1,-47 0,-52 Z"
        fill="#bbf7d0"
      />
      <path
        d="M 0,-64 C -5,-56 -10,-48 -13,-42 C -8,-40 -3,-40 1,-39 C 6,-40 10,-41 13,-43 C 10,-49 5,-56 0,-64 Z"
        fill="#86efac"
      />
      <path
        d="M 0,-64 C -5,-56 -9,-49 -12,-43 C -7,-41 -2,-41 2,-42 C 2,-50 1,-58 0,-64 Z"
        fill="#dcfce7"
      />
    </g>

    <g id="hp-forest-cypress">
      <ellipse cx="8" cy="27" rx="29" ry="12" fill="#16a34a" opacity="0.22" />
      <ellipse cx="2" cy="25" rx="16" ry="7" fill="#22c55e" opacity="0.22" />
      <path
        d="M -6,26 C -4,17 -3,6 -2,-6 L 4,-6 C 5,6 6,17 7,26 Z"
        fill="#6b3e1b"
      />
      <path d="M -4,25 L -2,-5 L 1,-5 L -1,25 Z" fill="#a1622e" />
      <path
        d="M 0,-58 C -8,-46 -16,-30 -16,-14 C -16,-2 -9,4 0,4 C 9,4 16,-2 16,-14 C 16,-30 8,-46 0,-58 Z"
        fill="#22c55e"
      />
      <path
        d="M -1,-56 C -8,-45 -15,-30 -14,-15 C -14,-4 -7,2 1,2 C 7,2 11,-4 11,-15 C 11,-30 5,-45 -1,-56 Z"
        fill="#4ade80"
      />
      <path
        d="M -2,-53 C -7,-43 -12,-29 -11,-17 C -11,-8 -6,-3 0,-3 C 4,-3 6,-9 6,-18 C 6,-30 2,-43 -2,-53 Z"
        fill="#86efac"
      />
      <path
        d="M -3,-48 C -6,-39 -9,-28 -8,-19 C -8,-13 -5,-9 -2,-9 C 1,-9 2,-15 2,-22 C 2,-32 -1,-41 -3,-48 Z"
        fill="#dcfce7"
        opacity="0.92"
      />
    </g>
  </>
));

export const AmbientForestTree25D: React.FC<{
  x: number;
  y: number;
  scale?: number;
  kind: 'oak' | 'pine' | 'cypress';
}> = React.memo(({ x, y, scale = 1, kind }) => (
  <use
    href={`#hp-forest-${kind}`}
    transform={`translate(${x}, ${y}) scale(${scale})`}
  />
));
