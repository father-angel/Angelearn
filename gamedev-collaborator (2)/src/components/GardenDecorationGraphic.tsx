import React from 'react';
import { GardenDecoration } from '../types/game';

interface GardenDecorationGraphicProps {
  decoration: GardenDecoration;
  size?: number;
  isSelected?: boolean;
}

/**
 * Hand-Painted Isometric 2.5D Interactive Garden Decoration Sprites
 * Replaces flat emoji icons on the 5x5 garden grid with volumetric 2.5D artwork,
 * coherent wood/stone/ceramic materials, and soft directional contact shadows.
 */
export const GardenDecorationGraphic: React.FC<GardenDecorationGraphicProps> = React.memo(({
  decoration,
  size = 86,
  isSelected = false,
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none pointer-events-none transition-transform duration-300 group-hover:scale-105 ${
        isSelected ? 'scale-110 ring-2 ring-amber-300 rounded-full bg-amber-400/15' : ''
      }`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        {/* ===================================================================
            1. FENCE (حصار چوبی جنگلی) — 2.5D Isometric Cedar Post-and-Rail Fence
           =================================================================== */}
        {decoration.type === 'fence' && (
          <g transform="translate(50, 58)">
            {/* Soft Contact Shadow */}
            <ellipse cx="3" cy="14" rx="36" ry="13" fill="#02140b" opacity="0.65" />
            <ellipse cx="0" cy="12" rx="28" ry="9" fill="#062c19" opacity="0.5" />

            {/* Back Moss & Grass Cushion */}
            <path
              d="M -30,10 C -24,4 -12,5 0,7 C 12,5 24,4 30,10 C 22,15 -22,15 -30,10 Z"
              fill="#15803d"
            />

            {/* Lower & Upper Isometric Wooden Rails (Angled along isometric axis) */}
            <polygon
              points="-28,-4 26,-16 26,-9 -28,3"
              fill="#92400e"
              stroke="#451a03"
              strokeWidth="1.2"
            />
            <polygon points="-28,-4 26,-16 26,-13 -28,-1" fill="#d97706" />

            <polygon
              points="-28,-18 26,-30 26,-23 -28,-11"
              fill="#92400e"
              stroke="#451a03"
              strokeWidth="1.2"
            />
            <polygon points="-28,-18 26,-30 26,-27 -28,-15" fill="#f59e0b" />

            {/* 3 Sculpted 2.5D Vertical Timber Posts (Left, Center, Right) */}
            {[
              { x: -22, y: 8 },
              { x: 0, y: 3 },
              { x: 22, y: -2 },
            ].map((post, i) => (
              <g key={`fence-post-${i}`} transform={`translate(${post.x}, ${post.y})`}>
                {/* Left Sunlit Timber Face */}
                <polygon
                  points="-5,4 0,6 0,-26 -5,-28"
                  fill="#b45309"
                  stroke="#451a03"
                  strokeWidth="1"
                />
                {/* Right Shaded Timber Face */}
                <polygon
                  points="0,6 5,4 5,-28 0,-26"
                  fill="#78350f"
                  stroke="#451a03"
                  strokeWidth="1"
                />
                {/* Beveled Pyramid Post Cap */}
                <polygon
                  points="0,-32 6,-28 0,-25 -6,-28"
                  fill="#fbbf24"
                  stroke="#78350f"
                  strokeWidth="1"
                />
              </g>
            ))}

            {/* Cozy Wildflowers & Ivy at Fence Base */}
            <path
              d="M -24,10 C -28,6 -22,1 -16,5 C -12,2 -6,5 -10,10 Z"
              fill="#22c55e"
            />
            <path
              d="M 14,5 C 10,1 18,-3 24,1 C 28,-1 31,4 25,7 Z"
              fill="#4ade80"
            />
            <circle cx="-18" cy="6" r="2.6" fill="#f472b6" />
            <circle cx="-18" cy="6" r="1" fill="#fef08a" />
            <circle cx="21" cy="2" r="2.5" fill="#fde047" />
          </g>
        )}

        {/* ===================================================================
            2. BENCH (نیمکت چوبی خلوت) — 2.5D Isometric Carved Oak Garden Bench
           =================================================================== */}
        {decoration.type === 'bench' && (
          <g transform="translate(50, 58)">
            {/* Soft Contact Shadow */}
            <ellipse cx="4" cy="14" rx="35" ry="14" fill="#02140b" opacity="0.68" />

            {/* Stone Base Pad Under Bench */}
            <polygon
              points="0,0 32,12 0,24 -32,12"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="1.2"
            />
            <polygon points="0,2 28,12 0,22 -28,12" fill="#cbd5e1" opacity="0.85" />

            {/* Back & Front Cast-Iron / Bronze Legs */}
            <path d="M -22,6 L -22,15 M 18,-4 L 18,6" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M -12,12 L -12,20 M 26,2 L 26,11" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" />

            {/* 2.5D Isometric Wooden Seat Slats */}
            <polygon
              points="-24,4 16,-8 28,-2 -12,10"
              fill="#b45309"
              stroke="#451a03"
              strokeWidth="1.2"
            />
            <polygon
              points="-24,4 16,-8 22,-5 -18,7"
              fill="#f59e0b"
            />
            <line x1="-18" y1="7" x2="22" y2="-5" stroke="#78350f" strokeWidth="1" />

            {/* 2.5D Isometric Slanted Wooden Backrest */}
            <polygon
              points="-26,-12 14,-24 16,-10 -24,2"
              fill="#92400e"
              stroke="#451a03"
              strokeWidth="1.2"
            />
            <polygon
              points="-26,-12 14,-24 15,-18 -25,-6"
              fill="#d97706"
            />
            <line x1="-25" y1="-5" x2="15" y2="-17" stroke="#451a03" strokeWidth="1" />

            {/* Ornate Golden Scroll Armrests */}
            <path
              d="M -24,3 Q -26,-5 -14,-1 Q -12,4 -12,10"
              stroke="#fbbf24"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 16,-9 Q 15,-16 26,-12 Q 28,-7 27,-2"
              stroke="#f59e0b"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* ===================================================================
            3. LANTERN (فانوس شب‌تاب باغ) — 2.5D Isometric Glowing Garden Lantern
           =================================================================== */}
        {decoration.type === 'lantern' && (
          <g transform="translate(50, 62)">
            {/* Warm Golden Ground Light Pool + Contact Shadow */}
            <ellipse cx="0" cy="8" rx="34" ry="15" fill="#fde047" opacity="0.22" />
            <ellipse cx="3" cy="10" rx="22" ry="9" fill="#02140b" opacity="0.68" />

            {/* Sculpted Stone Pedestal Base */}
            <polygon
              points="-12,4 0,9 12,4 9,-4 0,0 -9,-4"
              fill="#cbd5e1"
              stroke="#475569"
              strokeWidth="1.2"
            />
            <polygon points="0,9 12,4 9,-4 0,0" fill="#64748b" />

            {/* Tapered Cedar Timber Post */}
            <polygon
              points="-3.5,2 0,3 0,-42 -3,-43"
              fill="#b45309"
              stroke="#451a03"
              strokeWidth="1"
            />
            <polygon
              points="0,3 3.5,2 3,-43 0,-42"
              fill="#78350f"
              stroke="#451a03"
              strokeWidth="1"
            />

            {/* Curved Wooden Cross-Arm & Golden Chain */}
            <path
              d="M -4,-38 Q 8,-44 18,-38"
              stroke="#92400e"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M -4,-39 Q 8,-45 18,-39"
              stroke="#fbbf24"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
            <line x1="16" y1="-38" x2="16" y2="-31" stroke="#fde047" strokeWidth="1.5" />

            {/* Hanging Warm Illuminated Lantern Body */}
            <g transform="translate(16, -22)">
              {/* Outer Warm Glow Halo */}
              <circle cx="0" cy="0" r="16" fill="#fef08a" opacity="0.32" />
              {/* Lantern Chamber */}
              <path
                d="M -7,-7 C -9,-2 -9,4 -6,8 L 6,8 C 9,4 9,-2 7,-7 Z"
                fill="#fef08a"
                stroke="#d97706"
                strokeWidth="1.4"
              />
              <path
                d="M -4,-6 C -5,-1 -5,3 -3,7 L 3,7 C 5,3 5,-1 4,-6 Z"
                fill="#ffffff"
                opacity="0.75"
              />
              {/* Pagoda Roof Cap & Bottom Tassel */}
              <polygon
                points="0,-12 11,-6 -11,-6"
                fill="#047857"
                stroke="#fbbf24"
                strokeWidth="1.2"
              />
              <rect x="-5" y="8" width="10" height="2.5" rx="1" fill="#78350f" />
              <line x1="0" y1="10.5" x2="0" y2="15" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          </g>
        )}

        {/* ===================================================================
            4. POT (گلدان سفالی عتیق) — 2.5D Terra-Cotta & Turquoise Amphora
           =================================================================== */}
        {decoration.type === 'pot' && (
          <g transform="translate(50, 62)">
            {/* Soft Contact Shadow */}
            <ellipse cx="4" cy="10" rx="25" ry="10" fill="#02140b" opacity="0.68" />

            {/* Sculpted 2.5D Terra-Cotta Amphora Body */}
            <path
              d="M -14,-12
                 C -21,-4 -20,8 -10,12
                 C -4,14 4,14 10,12
                 C 20,8 21,-4 14,-12 Z"
              fill="#c2410c"
              stroke="#7c2d12"
              strokeWidth="1.4"
            />
            {/* Top-Left Sunlit Glaze Belly */}
            <path
              d="M -12,-10 C -17,-3 -16,6 -8,10 C -2,11 2,6 0,-2 C -2,-8 -8,-10 -12,-10 Z"
              fill="#fb923c"
              opacity="0.78"
            />
            {/* Persian Turquoise Decorative Band */}
            <path
              d="M -17,-2 Q 0,4 17,-2 Q 18,2 16,4 Q 0,10 -16,4 Z"
              fill="#0d9488"
              stroke="#fde047"
              strokeWidth="0.9"
            />
            {/* Rolled Ceramic Rim */}
            <ellipse
              cx="0"
              cy="-13"
              rx="15"
              ry="5.5"
              fill="#ea580c"
              stroke="#fed7aa"
              strokeWidth="1.2"
            />
            <ellipse cx="0" cy="-13" rx="11" ry="3.5" fill="#3b2311" />

            {/* Lush Overflowing Foliage & Blossoms */}
            <path
              d="M -14,-14 C -20,-22 -12,-30 -4,-26 C 0,-34 12,-32 14,-23 C 22,-20 18,-11 10,-12 Z"
              fill="#15803d"
            />
            <path
              d="M -10,-16 C -14,-23 -7,-28 0,-24 C 5,-29 12,-25 10,-17 Z"
              fill="#22c55e"
            />
            {/* Trailing Ivy Tendril */}
            <path
              d="M -12,-10 Q -20,-2 -16,6"
              stroke="#4ade80"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="-6" cy="-24" r="4" fill="#f472b6" />
            <circle cx="-6" cy="-24" r="1.5" fill="#fef08a" />
            <circle cx="6" cy="-22" r="4" fill="#fbbf24" />
            <circle cx="6" cy="-22" r="1.5" fill="#ffffff" />
            <circle cx="0" cy="-17" r="3.5" fill="#a78bfa" />
          </g>
        )}

        {/* ===================================================================
            5. FLOWER (باغچه گل‌های بنفش) — 2.5D Isometric Stone-Bordered Flowerbed
           =================================================================== */}
        {decoration.type === 'flower' && (
          <g transform="translate(50, 58)">
            {/* Soft Contact Shadow */}
            <ellipse cx="3" cy="12" rx="38" ry="15" fill="#02140b" opacity="0.65" />

            {/* 2.5D Isometric Raised Stone Border */}
            <polygon
              points="0,-10 34,6 0,22 -34,6"
              fill="#cbd5e1"
              stroke="#475569"
              strokeWidth="1.4"
            />
            <polygon
              points="-34,6 0,22 0,28 -34,12"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="1.2"
            />
            <polygon
              points="0,22 34,6 34,12 0,28"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.2"
            />

            {/* Rich Dark Mulch & Soil Bed */}
            <polygon points="0,-6 28,6 0,18 -28,6" fill="#422006" />

            {/* Layered Scalloped Cushion Foliage */}
            <path
              d="M -22,6 C -26,-2 -16,-10 -6,-7 C 0,-14 12,-12 16,-5 C 25,-3 24,7 14,11 C 4,15 -14,14 -22,6 Z"
              fill="#15803d"
            />
            <path
              d="M -16,4 C -20,-3 -11,-9 -3,-6 C 3,-11 12,-9 14,-2 C 18,3 10,9 0,9 C -9,10 -14,7 -16,4 Z"
              fill="#22c55e"
            />

            {/* Hand-Painted Violet, Rose & Golden Blossoms */}
            {[
              { x: -12, y: 0, c: '#a855f7' },
              { x: 0, y: -5, c: '#ec4899' },
              { x: 11, y: 1, c: '#8b5cf6' },
              { x: -4, y: 6, c: '#f472b6' },
              { x: 6, y: 7, c: '#c084fc' },
            ].map((b, i) => (
              <g key={`bed-fl-${i}`} transform={`translate(${b.x}, ${b.y})`}>
                <circle cx="0" cy="-2.2" r="2.4" fill={b.c} />
                <circle cx="2.2" cy="0" r="2.4" fill={b.c} />
                <circle cx="0" cy="2.2" r="2.4" fill={b.c} />
                <circle cx="-2.2" cy="0" r="2.4" fill={b.c} />
                <circle cx="0" cy="0" r="1.6" fill="#fef08a" />
              </g>
            ))}
          </g>
        )}

        {/* ===================================================================
            6. PATH (سنگفرش کوهستانی) — 2.5D Isometric Mossy Flagstone Cluster
           =================================================================== */}
        {decoration.type === 'path' && (
          <g transform="translate(50, 58)">
            {/* Soft Contact Shadow */}
            <ellipse cx="2" cy="8" rx="38" ry="16" fill="#031a0e" opacity="0.58" />

            {/* Mossy Turf Cushion */}
            <path
              d="M -32,4 C -26,-6 26,-6 32,4 C 26,14 -26,14 -32,4 Z"
              fill="#15803d"
              opacity="0.85"
            />

            {/* 3 Interlocking 2.5D Sculpted Mountain Flagstones */}
            {[
              { x: -12, y: 2, rx: 14, ry: 7, top: '#e2e8f0', side: '#64748b' },
              { x: 13, y: -2, rx: 12, ry: 6, top: '#cbd5e1', side: '#475569' },
              { x: 3, y: 9, rx: 11, ry: 5.5, top: '#f1f5f9', side: '#64748b' },
            ].map((st, i) => (
              <g key={`path-st-${i}`} transform={`translate(${st.x}, ${st.y})`}>
                {/* 2.5D Extruded Stone Side Lip */}
                <ellipse cx="0" cy="3" rx={st.rx} ry={st.ry} fill={st.side} />
                {/* Sunlit Top Stone Surface */}
                <ellipse
                  cx="0"
                  cy="0"
                  rx={st.rx}
                  ry={st.ry}
                  fill={st.top}
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
              </g>
            ))}

            {/* Tiny Crevice Moss & Buttercups */}
            <circle cx="-2" cy="3" r="2.2" fill="#4ade80" />
            <circle cx="18" cy="5" r="2" fill="#fde047" />
          </g>
        )}

        {/* ===================================================================
            7. FOUNTAIN (فواره بلورین آب) — 2.5D Isometric Two-Tier Marble Fountain
           =================================================================== */}
        {decoration.type === 'fountain' && (
          <g transform="translate(50, 58)">
            {/* Soft Contact Shadow */}
            <ellipse cx="4" cy="14" rx="38" ry="15" fill="#02140b" opacity="0.7" />

            {/* Outer Sculpted Marble Basin Rim (2.5D Extruded) */}
            <ellipse
              cx="0"
              cy="10"
              rx="34"
              ry="14"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="1.5"
            />
            <ellipse
              cx="0"
              cy="6"
              rx="34"
              ry="13"
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />

            {/* Crystal Turquoise Water Pool */}
            <ellipse cx="0" cy="6" rx="28" ry="10" fill="#0284c7" />
            <ellipse cx="-2" cy="5" rx="22" ry="7.5" fill="#38bdf8" />

            {/* Central Carved Pedestal & Upper Tier Bowl */}
            <rect x="-5" y="-12" width="10" height="18" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
            <ellipse
              cx="0"
              cy="-12"
              rx="16"
              ry="6.5"
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth="1.2"
            />
            <ellipse cx="0" cy="-12" rx="12" ry="4.5" fill="#38bdf8" />

            {/* Sparkling Cascading Water Arcs & Crown Jet */}
            <path
              d="M 0,-26 Q -12,-18 -14,-12 M 0,-26 Q 12,-18 14,-12 M -12,-10 Q -20,-2 -18,6 M 12,-10 Q 20,-2 18,6"
              stroke="#e0f2fe"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
            <circle cx="0" cy="-27" r="3.5" fill="#ffffff" />
            <circle cx="-16" cy="6" r="2" fill="#bae6fd" />
            <circle cx="16" cy="6" r="2" fill="#bae6fd" />
          </g>
        )}
      </svg>
    </div>
  );
});

/**
 * Reusable Hand-Painted 2.5D Flowering Bush with Scalloped Foliage & Contact Shadow
 */
export const HandPaintedBush25D: React.FC<{
  x: number;
  y: number;
  flowerColor: string;
  scale?: number;
}> = React.memo(({ x, y, flowerColor, scale = 1 }) => {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Soft Directional Contact Shadow */}
      <ellipse cx="4" cy="8" rx="22" ry="9.5" fill="#16a34a" opacity="0.24" />
      <ellipse cx="0" cy="6" rx="15" ry="6.5" fill="#22c55e" opacity="0.22" />

      {/* Deep Shaded Back-Right Foliage Volume */}
      <path
        d="M -18,5 C -23,-2 -18,-11 -9,-12 C -3,-19 8,-19 14,-11 C 22,-9 25,0 19,6 C 14,11 -12,11 -18,5 Z"
        fill="#22c55e"
        transform="translate(2, 2)"
      />

      {/* Mid-Tone Gouache Bush Body */}
      <path
        d="M -19,4 C -24,-3 -18,-12 -9,-13 C -3,-20 8,-20 14,-12 C 22,-10 24,-1 18,5 C 13,10 -13,10 -19,4 Z"
        fill="#4ade80"
      />

      {/* Sunlit Top-Left Scalloped Leaf Cluster */}
      <path
        d="M -15,0 C -19,-6 -14,-13 -6,-13 C -1,-19 8,-17 11,-11 C 16,-9 16,-2 11,1 C 5,4 -10,4 -15,0 Z"
        fill="#86efac"
      />
      <path
        d="M -11,-4 C -13,-8 -9,-13 -3,-13 C 1,-16 7,-14 8,-10 C 6,-6 -7,-2 -11,-4 Z"
        fill="#dcfce7"
        opacity="0.92"
      />

      {/* Hand-Painted Multi-Petal Blossoms */}
      {[
        { bx: -7, by: -3, s: 1 },
        { bx: 6, by: -5, s: 0.95 },
        { bx: 1, by: 2, s: 0.9 },
      ].map((fl, i) => (
        <g key={`bush-fl-${i}`} transform={`translate(${fl.bx}, ${fl.by}) scale(${fl.s})`}>
          <path
            d="M 0,-3.5 C 2,-3.5 3.5,-2 3.5,0 C 3.5,2 2,3.5 0,3.5 C -2,3.5 -3.5,2 -3.5,0 C -3.5,-2 -2,-3.5 0,-3.5 Z"
            fill={flowerColor}
          />
          <circle cx="0" cy="0" r="1.4" fill="#fef08a" />
        </g>
      ))}
    </g>
  );
});

/**
 * Reusable Hand-Painted 2.5D Sculpted Mossy Boulder & Pebble Cluster
 */
export const HandPaintedRock25D: React.FC<{
  x: number;
  y: number;
  scale?: number;
}> = React.memo(({ x, y, scale = 1 }) => {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Soft Directional Contact Shadow */}
      <ellipse cx="5" cy="9" rx="25" ry="10.5" fill="#02150b" opacity="0.68" />

      {/* Main Sculpted 2.5D Boulder Base (Shaded Slate Body) */}
      <path
        d="M -20,6
           C -22,-3 -16,-13 -5,-15
           C 6,-17 17,-11 21,-2
           C 23,4 18,9 10,10
           C 0,11 -15,10 -20,6 Z"
        fill="#475569"
        stroke="#334155"
        strokeWidth="1.2"
      />

      {/* Sunlit Top-Left Granite Plane */}
      <path
        d="M -18,4
           C -20,-4 -14,-12 -4,-14
           C 4,-15 11,-11 13,-5
           C 8,1 -6,5 -18,4 Z"
        fill="#94a3b8"
      />
      <path
        d="M -12,-3 C -10,-9 -3,-13 4,-12 C 8,-10 7,-6 2,-4 C -4,-2 -9,-1 -12,-3 Z"
        fill="#cbd5e1"
        opacity="0.85"
      />

      {/* Lush Velvet Moss Cushion Draped Over Boulder Crest */}
      <path
        d="M -14,-3
           C -10,-13 2,-15 11,-10
           C 16,-7 15,-1 9,0
           C 2,1 -4,-2 -9,1
           C -13,2 -15,0 -14,-3 Z"
        fill="#16a34a"
      />
      <path
        d="M -10,-6 C -6,-12 3,-13 8,-9 C 10,-6 6,-3 0,-4 C -5,-4 -8,-3 -10,-6 Z"
        fill="#4ade80"
        opacity="0.88"
      />

      {/* Companion Foreground Pebble & Fern */}
      <path
        d="M -19,7 C -20,3 -14,1 -10,4 C -7,6 -9,10 -14,10 C -17,10 -19,9 -19,7 Z"
        fill="#64748b"
      />
      <path d="M 14,8 Q 19,2 23,4 M 15,9 Q 21,5 25,8" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </g>
  );
});

/**
 * Reusable Hand-Painted 2.5D Wildflower, Fern & Brushstroke Grass Patch
 */
export const HandPaintedFlowerPatch25D: React.FC<{
  x: number;
  y: number;
  color: string;
}> = React.memo(({ x, y, color }) => {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Soft Ground Contact Shadow */}
      <ellipse cx="2" cy="5" rx="18" ry="7.5" fill="#22c55e" opacity="0.22" />

      {/* Organic Basal Leaves */}
      <path
        d="M -12,4 Q -6,-1 0,3 Q 6,-1 12,4 Q 0,8 -12,4 Z"
        fill="#4ade80"
      />

      {/* Hand-Painted Curved Grass Blades */}
      <path
        d="M -9,4 Q -13,-7 -17,-11 M -3,4 Q -5,-9 -7,-14 M 3,4 Q 5,-9 8,-13 M 9,4 Q 13,-6 17,-10"
        stroke="#ecfccb"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />

      {/* Multi-Petal Blossoms */}
      <g transform="translate(-7, -7)">
        <circle cx="-1.8" cy="0" r="2.2" fill={color} />
        <circle cx="1.8" cy="0" r="2.2" fill={color} />
        <circle cx="0" cy="-1.8" r="2.2" fill={color} />
        <circle cx="0" cy="1.8" r="2.2" fill={color} />
        <circle cx="0" cy="0" r="1.4" fill="#fef08a" />
      </g>
      <g transform="translate(6, -8)">
        <circle cx="-1.8" cy="0" r="2.2" fill={color} />
        <circle cx="1.8" cy="0" r="2.2" fill={color} />
        <circle cx="0" cy="-1.8" r="2.2" fill={color} />
        <circle cx="0" cy="1.8" r="2.2" fill={color} />
        <circle cx="0" cy="0" r="1.4" fill="#fef08a" />
      </g>
      <circle cx="0" cy="-3" r="2.4" fill="#fef08a" />
    </g>
  );
});

/**
 * Reusable Hand-Painted 2.5D Isometric Wooden Fence Segment for Meadow Paths
 */
export const HandPaintedWoodenFenceSection25D: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}> = React.memo(({ x1, y1, x2, y2 }) => {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g>
      {/* Ground Contact Shadow Along Fence Line */}
      <line
        x1={x1 + 2}
        y1={y1 + 5}
        x2={x2 + 2}
        y2={y2 + 5}
        stroke="#02140b"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Lower & Upper Split Timber Rails */}
      <line
        x1={x1}
        y1={y1 - 6}
        x2={x2}
        y2={y2 - 6}
        stroke="#78350f"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <line
        x1={x1}
        y1={y1 - 7}
        x2={x2}
        y2={y2 - 7}
        stroke="#d97706"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      <line
        x1={x1}
        y1={y1 - 15}
        x2={x2}
        y2={y2 - 15}
        stroke="#78350f"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <line
        x1={x1}
        y1={y1 - 16}
        x2={x2}
        y2={y2 - 16}
        stroke="#f59e0b"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* 3 Sculpted Wooden Fence Posts */}
      {[
        { px: x1, py: y1 },
        { px: midX, py: midY },
        { px: x2, py: y2 },
      ].map((pt, i) => (
        <g key={`meadow-post-${i}`} transform={`translate(${pt.px}, ${pt.py})`}>
          <ellipse cx="1" cy="3" rx="6" ry="3" fill="#02140b" opacity="0.6" />
          <rect
            x="-3.5"
            y="-22"
            width="7"
            height="24"
            rx="1.5"
            fill="#92400e"
            stroke="#451a03"
            strokeWidth="1"
          />
          <rect x="-2.5" y="-21" width="2.5" height="22" fill="#d97706" />
          <polygon points="0,-25 4.5,-21 -4.5,-21" fill="#fbbf24" stroke="#78350f" strokeWidth="0.8" />
        </g>
      ))}
    </g>
  );
});
