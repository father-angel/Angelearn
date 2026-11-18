import React from 'react';

/**
 * Hand-Painted Isometric 2.5D Architectural Building System
 * Provides lightweight, mobile-optimized SVG artwork for all AngelLearn Garden & World buildings
 * with visible sunlit front-left & shaded front-right faces, layered roof tiles, arched windows,
 * timber/marble doors, corner quoins, and soft directional ground shadows.
 */


/**
 * 2. University Main Building (`UniversityMainBuilding25D`)
 * Hand-Painted Isometric 2.5D Grand Academic Hall with Ribbed Persian Turquoise Dome,
 * Colonnaded Wings, Arched Library Windows, and Marble Staircase (Pure Standalone Building — No Outer Terrace).
 */
export const UniversityMainBuilding25D: React.FC<{ className?: string }> = React.memo(({
  className = 'w-40 h-34',
}) => (
  <svg
    viewBox="0 0 190 160"
    className={`${className} overflow-visible`}
  >
    {/* Soft Directional Contact Shadow Directly Under Building Walls */}
    <ellipse cx="96" cy="120" rx="66" ry="20" fill="#02130a" opacity="0.55" />

    {/* Left Academic Wing Wall (Warm Sunlit Ivory Limestone) */}
    <polygon
      points="28,58 95,90 95,138 28,106"
      fill="#fffbeb"
      stroke="#0f766e"
      strokeWidth="2"
    />
    {/* Right Academic Wing Wall (Cool Shaded Limestone) */}
    <polygon
      points="95,90 162,58 162,106 95,138"
      fill="#e2e8f0"
      stroke="#115e59"
      strokeWidth="2"
    />

    {/* Under-Eave Shadow Band */}
    <polygon points="28,58 95,90 95,96 28,64" fill="#042f2e" opacity="0.28" />
    <polygon points="95,90 162,58 162,64 95,96" fill="#042f2e" opacity="0.4" />

    {/* Left Wing Sculpted Marble Columns & Arched Stained-Glass Windows */}
    {[
      { x: 38, y: 69 },
      { x: 56, y: 78 },
      { x: 74, y: 86 },
    ].map((col, i) => (
      <g key={`uni-left-col-${i}`}>
        <polygon
          points={`${col.x},${col.y} ${col.x + 11},${col.y + 5} ${col.x + 11},${col.y + 24} ${col.x},${col.y + 19}`}
          fill="#fef08a"
          stroke="#0d9488"
          strokeWidth="1.4"
        />
        <polygon
          points={`${col.x + 1},${col.y + 1} ${col.x + 10},${col.y + 5} ${col.x + 10},${col.y + 12} ${col.x + 1},${col.y + 8}`}
          fill="#38bdf8"
          opacity="0.75"
        />
        <polygon
          points={`${col.x - 3},${col.y - 2} ${col.x},${col.y} ${col.x},${col.y + 28} ${col.x - 3},${col.y + 26}`}
          fill="#f1f5f9"
        />
      </g>
    ))}

    {/* Right Wing Grand Turquoise-Gold Iwan Portal & Arched Windows */}
    <polygon
      points="102,94 124,83.5 124,124 102,134.5"
      fill="#042f2e"
      stroke="#fbbf24"
      strokeWidth="2.2"
    />
    <polygon
      points="106,98 120,91 120,124 106,131"
      fill="#78350f"
      stroke="#fde047"
      strokeWidth="1.2"
    />
    {/* Grand Marble Entrance Staircase */}
    <polygon
      points="101,134.5 125,123 135,128 111,139.5"
      fill="#f8fafc"
      stroke="#94a3b8"
      strokeWidth="1.2"
    />
    <polygon
      points="105,138 129,126.5 139,131.5 115,143"
      fill="#cbd5e1"
      stroke="#64748b"
      strokeWidth="1.2"
    />

    {/* Right Wing Library Windows */}
    {[
      { x: 130, y: 80 },
      { x: 145, y: 73 },
    ].map((w, i) => (
      <polygon
        key={`uni-rw-${i}`}
        points={`${w.x},${w.y} ${w.x + 10},${w.y - 5} ${w.x + 10},${w.y + 12} ${w.x},${w.y + 17}`}
        fill="#38bdf8"
        stroke="#0f766e"
        strokeWidth="1.4"
      />
    ))}

    {/* 2.5D Isometric Tiled Wing Roofs (Left Sunlit Teal + Right Shaded Teal) */}
    <polygon
      points="20,58 95,24 95,90"
      fill="#14b8a6"
      stroke="#fde047"
      strokeWidth="2.2"
    />
    <line x1="38" y1="50" x2="95" y2="76" stroke="#99f6e4" strokeWidth="1.3" opacity="0.5" />
    <polygon
      points="95,24 170,58 95,90"
      fill="#0f766e"
      stroke="#fbbf24"
      strokeWidth="2.2"
    />
    <line x1="95" y1="76" x2="152" y2="50" stroke="#042f2e" strokeWidth="1.3" opacity="0.4" />

    {/* Grand Central 2.5D Octagonal Drum & Ribbed Turquoise-Gold Dome */}
    <ellipse
      cx="95"
      cy="52"
      rx="37"
      ry="15"
      fill="#fef3c7"
      stroke="#d97706"
      strokeWidth="2"
    />
    {/* Main Dome Body */}
    <path
      d="M 60,50 C 60,8 130,8 130,50 C 114,57 76,57 60,50 Z"
      fill="#0d9488"
      stroke="#fbbf24"
      strokeWidth="2.5"
    />
    {/* Top-Left Sunlit Dome Highlight */}
    <path
      d="M 63,48 C 63,14 95,12 95,12 C 82,22 76,36 76,52 C 69,51 65,50 63,48 Z"
      fill="#5eead4"
      opacity="0.7"
    />
    {/* Bottom-Right Dome Shadow */}
    <path
      d="M 95,12 C 116,14 128,28 129,49 C 120,54 106,55 95,55 Z"
      fill="#115e59"
      opacity="0.65"
    />
    {/* Golden Dome Ribs */}
    <path
      d="M 95,12 Q 78,30 76,53 M 95,12 L 95,55 M 95,12 Q 112,30 114,53"
      stroke="#fde047"
      strokeWidth="1.4"
      fill="none"
      opacity="0.85"
    />
    {/* Spire Finial */}
    <circle cx="95" cy="10" r="5" fill="#fde047" stroke="#b45309" strokeWidth="1.4" />
    <circle cx="95" cy="3" r="2.5" fill="#ffffff" />
  </svg>
));

/**
 * 3. School & Workshop Main Building (`SchoolWorkshopMainBuilding25D`)
 * Hand-Painted Isometric 2.5D Academy Hall (Pure Standalone Building — No Outer Terrace).
 */
export const SchoolWorkshopMainBuilding25D: React.FC<{
  variant?: 'school' | 'workshop';
  className?: string;
}> = React.memo(({ variant = 'school', className = 'w-40 h-34' }) => {
  const isWorkshop = variant === 'workshop';
  const roofLight = isWorkshop ? '#ea580c' : '#0284c7';
  const roofDark = isWorkshop ? '#9a3412' : '#0369a1';

  return (
    <svg
      viewBox="0 0 190 160"
      className={`${className} overflow-visible`}
    >
      {/* Soft Directional Contact Shadow Directly Under Building Walls */}
      <ellipse cx="96" cy="120" rx="66" ry="20" fill="#02130a" opacity="0.55" />

      {/* Left Isometric Wall (Warm Sunlit Cream & Timber Framing) */}
      <polygon
        points="28,58 95,90 95,138 28,106"
        fill="#fefce8"
        stroke="#b45309"
        strokeWidth="2"
      />
      {/* Right Isometric Wall (Shaded Warm Ochre Stone) */}
      <polygon
        points="95,90 162,58 162,106 95,138"
        fill="#fde68a"
        stroke="#92400e"
        strokeWidth="2"
      />

      {/* Half-Timbered Vertical Beams & Under-Eave Shadow */}
      <polygon points="28,58 95,90 95,96 28,64" fill="#451a03" opacity="0.28" />
      <polygon points="95,90 162,58 162,64 95,96" fill="#451a03" opacity="0.38" />
      <line x1="58" y1="73" x2="58" y2="120" stroke="#92400e" strokeWidth="2.2" />
      <line x1="130" y1="73" x2="130" y2="120" stroke="#78350f" strokeWidth="2.2" />

      {/* Left Wall Glowing Arched Classroom / Atelier Windows */}
      {[
        { x1: 36, y1: 70, x2: 52, y2: 78 },
        { x1: 65, y1: 84, x2: 81, y2: 92 },
      ].map((w, i) => (
        <g key={`sch-lw-${i}`}>
          <polygon
            points={`${w.x1},${w.y1} ${w.x2},${w.y2} ${w.x2},${w.y2 + 18} ${w.x1},${w.y1 + 18}`}
            fill="#fef08a"
            stroke="#78350f"
            strokeWidth="1.6"
          />
          <polygon
            points={`${w.x1 + 1.5},${w.y1 + 1.5} ${w.x2 - 1.5},${w.y2 + 1.5} ${w.x2 - 1.5},${w.y2 + 9} ${w.x1 + 1.5},${w.y1 + 9}`}
            fill="#38bdf8"
            opacity="0.75"
          />
        </g>
      ))}

      {/* Right Wall Grand Double Timber Entrance & Steps */}
      <polygon
        points="103,95 123,85.5 123,124.5 103,134"
        fill="#78350f"
        stroke="#fbbf24"
        strokeWidth="2"
      />
      <line x1="113" y1="90.5" x2="113" y2="129" stroke="#451a03" strokeWidth="1.5" />
      <polygon
        points="102,134 124,123.5 134,128.5 112,139"
        fill="#f8fafc"
        stroke="#64748b"
        strokeWidth="1.2"
      />

      {/* Right Wall Window */}
      <polygon
        points="136,78 154,69.5 154,87.5 136,96"
        fill="#38bdf8"
        stroke="#78350f"
        strokeWidth="1.6"
      />

      {/* 2.5D Pitched Ceramic Tile Roof Slopes */}
      <polygon
        points="20,58 95,24 95,90"
        fill={roofLight}
        stroke="#fde047"
        strokeWidth="2.2"
      />
      <line x1="38" y1="50" x2="95" y2="75" stroke="#ffffff" strokeWidth="1.3" opacity="0.35" />
      <line x1="56" y1="42" x2="95" y2="59" stroke="#ffffff" strokeWidth="1.3" opacity="0.35" />

      <polygon
        points="95,24 170,58 95,90"
        fill={roofDark}
        stroke="#fbbf24"
        strokeWidth="2.2"
      />
      <line x1="95" y1="75" x2="152" y2="50" stroke="#0f172a" strokeWidth="1.3" opacity="0.3" />

      {/* Central 2.5D Clocktower (School) or Artisan Observatory Tower (Workshop) */}
      <polygon
        points="73,26 95,37 95,66 73,55"
        fill="#fffbeb"
        stroke="#d97706"
        strokeWidth="1.8"
      />
      <polygon
        points="95,37 117,26 117,55 95,66"
        fill="#fde68a"
        stroke="#b45309"
        strokeWidth="1.8"
      />
      <polygon
        points="68,26 95,6 95,37"
        fill="#f59e0b"
        stroke="#fef08a"
        strokeWidth="2"
      />
      <polygon
        points="95,6 122,26 95,37"
        fill="#b45309"
        stroke="#fef08a"
        strokeWidth="2"
      />

      {/* Tower Dial: Clock Face for School / Golden Gear Emblem for Workshop */}
      <circle
        cx="84"
        cy="45"
        r="6.5"
        fill={isWorkshop ? '#78350f' : '#0f172a'}
        stroke="#fbbf24"
        strokeWidth="2"
      />
      <path d="M 84,41 L 84,45 L 87,46" stroke="#fde047" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <circle cx="95" cy="5" r="4.5" fill="#fde047" stroke="#78350f" strokeWidth="1.2" />
    </svg>
  );
});


/**
 * 5. Garden Sanctuary Pavilion (`GardenSanctuaryPavilion25D` — عمارت باغبان)
 * Positioned at the northern crown of the personal garden.
 */
export const GardenSanctuaryPavilion25D: React.FC<{ className?: string }> = React.memo(({
  className = 'w-28 h-24',
}) => (
  <svg
    viewBox="0 0 140 115"
    className={`${className} overflow-visible`}
  >
    {/* Soft Directional Contact Shadow */}
    <ellipse cx="72" cy="86" rx="46" ry="14" fill="#02140b" opacity="0.55" />

    {/* Front-Left Sunlit Wall */}
    <polygon
      points="30,42 70,60 70,92 30,74"
      fill="#fffbeb"
      stroke="#94a3b8"
      strokeWidth="1.6"
    />
    {/* Front-Right Shaded Wall */}
    <polygon
      points="70,60 110,42 110,74 70,92"
      fill="#e2e8f0"
      stroke="#64748b"
      strokeWidth="1.6"
    />
    {/* Under-Eave Shadow */}
    <polygon points="30,42 70,60 70,65 30,47" fill="#064e3b" opacity="0.28" />
    <polygon points="70,60 110,42 110,47 70,65" fill="#064e3b" opacity="0.38" />

    {/* Left Wall Arched Warm Lantern Windows */}
    <polygon points="37,51 48,56 48,70 37,65" fill="#fef08a" stroke="#d97706" strokeWidth="1.4" />
    <polygon points="53,58 64,63 64,77 53,72" fill="#fef08a" stroke="#d97706" strokeWidth="1.4" />

    {/* Right Wall Carved Sanctuary Doorway & Window */}
    <polygon points="76,66 89,60 89,83 76,89" fill="#78350f" stroke="#fbbf24" strokeWidth="1.6" />
    <polygon points="94,55 104,50.5 104,63.5 94,68" fill="#fbbf24" stroke="#b45309" strokeWidth="1.4" />

    {/* Two-Tier Hand-Painted Emerald & Gold Pagoda Roof */}
    <polygon
      points="20,43 70,18 70,62"
      fill="#10b981"
      stroke="#fde68a"
      strokeWidth="2"
    />
    <polygon
      points="70,18 120,43 70,62"
      fill="#047857"
      stroke="#fde68a"
      strokeWidth="2"
    />
    {/* Upper Roof Tier */}
    <polygon
      points="38,27 70,9 70,38"
      fill="#34d399"
      stroke="#fef08a"
      strokeWidth="1.8"
    />
    <polygon
      points="70,9 102,27 70,38"
      fill="#059669"
      stroke="#fef08a"
      strokeWidth="1.8"
    />
    <circle cx="70" cy="7" r="5" fill="#fbbf24" stroke="#78350f" strokeWidth="1.2" />
  </svg>
));

/**
 * 6. Garden Spring of Living Water (`GardenSpringShrine25D` — چشمه آب حیات)
 * Sculpted 2.5D Marble Archway & Crystal Turquoise Cascading Fountain Basin.
 */
export const GardenSpringShrine25D: React.FC<{ className?: string }> = React.memo(({
  className = 'w-24 h-20',
}) => (
  <svg
    viewBox="0 0 110 90"
    className={`${className} overflow-visible`}
  >
    {/* Soft Contact Shadow */}
    <ellipse cx="57" cy="66" rx="44" ry="18" fill="#02140b" opacity="0.68" />

    {/* 2.5D Sculpted Marble Basin Rim */}
    <ellipse
      cx="55"
      cy="62"
      rx="40"
      ry="16"
      fill="#94a3b8"
      stroke="#475569"
      strokeWidth="1.5"
    />
    <ellipse
      cx="55"
      cy="58"
      rx="40"
      ry="15"
      fill="#f8fafc"
      stroke="#bae6fd"
      strokeWidth="2"
    />

    {/* Shimmering Turquoise Water Pool */}
    <ellipse cx="55" cy="58" rx="33" ry="11.5" fill="#0284c7" />
    <ellipse cx="53" cy="57" rx="25" ry="8.5" fill="#38bdf8" />

    {/* 2.5D Carved Stone Shrine Pillars & Upper Bowl */}
    <polygon points="36,28 44,31 44,54 36,51" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.2" />
    <polygon points="66,31 74,28 74,51 66,54" fill="#cbd5e1" stroke="#475569" strokeWidth="1.2" />
    <path
      d="M 34,29 C 34,12 76,12 76,29 L 68,31 C 68,20 42,20 42,31 Z"
      fill="#f8fafc"
      stroke="#fbbf24"
      strokeWidth="1.6"
    />

    {/* Central Cascading Crystal Water Plume */}
    <path
      d="M 55,22 Q 44,36 40,56 L 70,56 Q 66,36 55,22 Z"
      fill="#e0f2fe"
      opacity="0.88"
    />
    <path
      d="M 55,20 Q 50,36 48,55 M 55,20 Q 60,36 62,55"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="55" cy="14" r="4.5" fill="#fde047" stroke="#b45309" strokeWidth="1" />
  </svg>
));

/**
 * 7. Garden Seedlings Greenhouse (`GardenGreenhouse25D` — گلخانه نهال‌ها)
 * Hand-Painted 2.5D Isometric Glass & Brass Botanical Conservatory with Visible Saplings Inside.
 */
export const GardenGreenhouse25D: React.FC<{ className?: string }> = React.memo(({
  className = 'w-24 h-20',
}) => (
  <svg
    viewBox="0 0 115 95"
    className={`${className} overflow-visible`}
  >
    {/* Soft Directional Contact Shadow */}
    <ellipse cx="60" cy="70" rx="40" ry="15" fill="#02140b" opacity="0.55" />

    {/* Visible Lush Potted Saplings Inside the Glass Conservatory */}
    <g transform="translate(44, 58)">
      <ellipse cx="0" cy="4" rx="7" ry="3.5" fill="#92400e" />
      <path d="M -6,1 C -8,-5 -2,-10 2,-6 C 6,-9 9,-3 5,2 Z" fill="#22c55e" />
      <circle cx="0" cy="-5" r="2" fill="#fde047" />
    </g>
    <g transform="translate(68, 56)">
      <ellipse cx="0" cy="4" rx="7" ry="3.5" fill="#92400e" />
      <path d="M -5,1 C -7,-5 -1,-9 3,-5 C 7,-8 8,-2 4,2 Z" fill="#4ade80" />
      <circle cx="1" cy="-4" r="2" fill="#f472b6" />
    </g>

    {/* 2.5D Isometric Glass Walls (Left Sunlit Glass + Right Shaded Glass) */}
    <polygon
      points="20,38 57,55 57,82 20,65"
      fill="#6ee7b7"
      fillOpacity="0.38"
      stroke="#fde68a"
      strokeWidth="1.8"
    />
    <polygon
      points="57,55 94,38 94,65 57,82"
      fill="#0d9488"
      fillOpacity="0.42"
      stroke="#fbbf24"
      strokeWidth="1.8"
    />

    {/* Right Wall Arched Conservatory Door Frame */}
    <polygon
      points="66,60 79,54 79,74 66,80"
      fill="#064e3b"
      fillOpacity="0.65"
      stroke="#fde047"
      strokeWidth="1.6"
    />

    {/* 2.5D Pitched Glass Roof Slopes with Brass Mullion Ribs & Specular Glint */}
    <polygon
      points="20,38 57,14 57,55"
      fill="#a7f3d0"
      fillOpacity="0.5"
      stroke="#fef08a"
      strokeWidth="2"
    />
    <line x1="38" y1="26" x2="38" y2="46" stroke="#fef08a" strokeWidth="1.2" opacity="0.8" />
    {/* White Diagonal Glass Reflection */}
    <polygon points="28,36 36,31 42,42 34,45" fill="#ffffff" opacity="0.45" />

    <polygon
      points="57,14 94,38 57,55"
      fill="#14b8a6"
      fillOpacity="0.48"
      stroke="#fbbf24"
      strokeWidth="2"
    />
    <line x1="76" y1="26" x2="76" y2="46" stroke="#fde047" strokeWidth="1.2" opacity="0.75" />
    <circle cx="57" cy="12" r="4" fill="#fde047" stroke="#92400e" strokeWidth="1" />
  </svg>
));

/**
 * 8. Resource Shrine Pavilion (`ResourceShrinePavilion25D`)
 */
export const ResourceShrinePavilion25D: React.FC<{ className?: string }> = React.memo(({
  className = 'w-28 h-24',
}) => (
  <svg
    viewBox="0 0 130 115"
    className={`${className} overflow-visible`}
  >
    <ellipse cx="67" cy="92" rx="48" ry="17" fill="#02130a" opacity="0.7" />
    <rect x="33" y="46" width="6" height="30" rx="2" fill="#f1f5f9" stroke="#64748b" strokeWidth="1" />
    <rect x="62" y="58" width="6" height="32" rx="2" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
    <rect x="91" y="46" width="6" height="30" rx="2" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
    <polygon
      points="65,34 51,60 65,76 79,60"
      fill="#38bdf8"
      stroke="#e0f2fe"
      strokeWidth="2"
    />
    <polygon points="65,34 65,76 79,60" fill="#0284c7" opacity="0.8" />
    <polygon points="24,46 65,20 65,58" fill="#14b8a6" stroke="#fde047" strokeWidth="2" />
    <polygon points="65,20 106,46 65,58" fill="#0f766e" stroke="#fbbf24" strokeWidth="2" />
    <circle cx="65" cy="18" r="4.5" fill="#fde047" stroke="#92400e" strokeWidth="1.2" />
  </svg>
));

/**
 * 9. Living 2.5D World Garden Plot (`WorldGardenPlot25D`)
 * Used on the World Map for `باغ من` (`player_base`) and `باغ همسفران` (`neighbor_base`).
 * Unlike University and School (which are buildings/houses), a Garden is rendered as an
 * organic 2.5D cultivated grove of growing skill trees, tilled soil beds, crystal pond,
 * and wooden garden trellis arch — dynamically reflecting `unlockedTreeCount`!
 */
export const WorldGardenPlot25D: React.FC<{
  unlockedTreeCount?: number;
  variant?: 'player' | 'neighbor';
  className?: string;
}> = React.memo(({
  unlockedTreeCount = 3,
  variant = 'player',
  className = 'w-48 h-40',
}) => {
  const isPlayer = variant === 'player';
  const clampedTrees = Math.max(1, Math.min(7, unlockedTreeCount));

  // Positions of miniature trees inside the 2.5D garden plot (back-to-front painter's order)
  const treeSlots = [
    { x: 95, y: 52, scale: 1.05, canopy: '#22c55e', highlight: '#86efac', fruit: '#fde047' },
    { x: 56, y: 70, scale: 0.96, canopy: '#10b981', highlight: '#6ee7b7', fruit: '#f472b6' },
    { x: 134, y: 70, scale: 0.96, canopy: '#16a34a', highlight: '#4ade80', fruit: '#38bdf8' },
    { x: 76, y: 90, scale: 0.92, canopy: '#22c55e', highlight: '#a7f3d0', fruit: '#fb923c' },
    { x: 116, y: 90, scale: 0.92, canopy: '#059669', highlight: '#6ee7b7', fruit: '#fde047' },
    { x: 42, y: 94, scale: 0.84, canopy: '#16a34a', highlight: '#86efac', fruit: '#c084fc' },
    { x: 148, y: 94, scale: 0.84, canopy: '#10b981', highlight: '#a7f3d0', fruit: '#f472b6' },
  ];

  return (
    <svg
      viewBox="0 0 190 155"
      className={`${className} overflow-visible`}
    >
      {/* Soft Organic Ground Shadow Under Trees & Soil Beds (No Stone Platform or Green Fence) */}
      <ellipse cx="95" cy="102" rx="72" ry="32" fill="#052e16" opacity="0.38" />

      {/* Cultivated Organic Tilled Soil Beds (Rich Warm Loam Patches Directly on the Meadow) */}
      {[
        { cx: 95, cy: 62, rx: 22, ry: 10 },
        { cx: 56, cy: 80, rx: 20, ry: 9 },
        { cx: 134, cy: 80, rx: 20, ry: 9 },
        { cx: 76, cy: 100, rx: 19, ry: 8.5 },
        { cx: 116, cy: 100, rx: 19, ry: 8.5 },
      ].map((bed, idx) => (
        <g key={`soil-bed-${idx}`}>
          <ellipse
            cx={bed.cx}
            cy={bed.cy + 2}
            rx={bed.rx}
            ry={bed.ry}
            fill="#451a03"
            opacity="0.65"
          />
          <ellipse
            cx={bed.cx}
            cy={bed.cy}
            rx={bed.rx - 1.5}
            ry={bed.ry - 1}
            fill="#78350f"
            stroke="#92400e"
            strokeWidth="1.2"
          />
        </g>
      ))}

      {/* Shimmering Natural Garden Spring Pool in Front-Center */}
      <g transform="translate(95, 115)">
        <ellipse cx="0" cy="2" rx="24" ry="10.5" fill="#0369a1" stroke="#7dd3fc" strokeWidth="1.5" />
        <ellipse cx="-2" cy="1" rx="17" ry="7" fill="#38bdf8" opacity="0.85" />
        <circle cx="-16" cy="-4" r="3.5" fill="#94a3b8" />
        <circle cx="17" cy="4" r="3" fill="#64748b" />
        <ellipse cx="6" cy="1" rx="4.5" ry="2.2" fill="#22c55e" />
        <circle cx="6" cy="0.5" r="1.8" fill="#f472b6" />
      </g>

      {/* Growing 2.5D Skill Trees (Unlocked Trees Rendered in Lush Bloom, Remaining Slots as Sprouts) */}
      {treeSlots.map((slot, idx) => {
        const isPlanted = idx < clampedTrees;
        if (!isPlanted) {
          // Dormant Seedling Sprout on Unplanted Soil Plot
          return (
            <g key={`garden-sprout-${idx}`} transform={`translate(${slot.x}, ${slot.y + 8})`}>
              <ellipse cx="0" cy="3" rx="8" ry="3.5" fill="#78350f" opacity="0.85" />
              <path d="M 0,2 L 0,-6" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
              <path d="M 0,-3 C -5,-7 -8,-4 -4,0 Z" fill="#86efac" />
              <path d="M 0,-5 C 5,-9 8,-5 4,-1 Z" fill="#4ade80" />
            </g>
          );
        }

        return (
          <g
            key={`garden-tree-${idx}`}
            transform={`translate(${slot.x}, ${slot.y}) scale(${slot.scale})`}
          >
            {/* Tree Shadow */}
            <ellipse cx="1" cy="12" rx="14" ry="5.5" fill="#02140b" opacity="0.55" />
            {/* Sculpted Wooden Trunk & Roots */}
            <path
              d="M -3.5,11 C -2.5,3 -2,-4 -1.5,-10 L 2,-10 C 2.5,-4 3,3 4.5,11 Z"
              fill="#78350f"
              stroke="#451a03"
              strokeWidth="1"
            />
            <path d="M -2,10 L -2,-8 L 0,-8 L 0,10 Z" fill="#b45309" opacity="0.75" />
            {/* Layered 2.5D Painterly Canopy */}
            <ellipse cx="0" cy="-12" rx="16" ry="12" fill="#14532d" />
            <ellipse cx="0" cy="-15" rx="15" ry="11.5" fill={slot.canopy} />
            <ellipse cx="-4" cy="-19" rx="10" ry="7.5" fill={slot.highlight} opacity="0.88" />
            {/* Glowing Blossoms / Fruits */}
            <circle cx="-7" cy="-15" r="2.3" fill={slot.fruit} />
            <circle cx="6" cy="-13" r="2.2" fill={slot.fruit} />
            <circle cx="0" cy="-22" r="2.4" fill="#fef08a" />
          </g>
        );
      })}

      {/* Rustic Wooden Garden Trellis Archway at Front Entrance (Distinguishes Garden from Houses) */}
      <g transform="translate(95, 130)">
        {/* Left & Right Timber Posts */}
        <rect x="-24" y="-22" width="4.5" height="24" rx="1.5" fill="#78350f" stroke="#451a03" strokeWidth="1" />
        <rect x="19.5" y="-22" width="4.5" height="24" rx="1.5" fill="#78350f" stroke="#451a03" strokeWidth="1" />
        {/* Arched Wooden Pergola Beam */}
        <path
          d="M -28,-20 Q 0,-34 28,-20"
          fill="none"
          stroke={isPlayer ? '#fbbf24' : '#a7f3d0'}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M -26,-20 Q 0,-32 26,-20"
          fill="none"
          stroke="#92400e"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Climbing Ivy & Flowers on Arch */}
        <circle cx="-14" cy="-24" r="3" fill="#22c55e" />
        <circle cx="-12" cy="-25" r="1.8" fill="#f472b6" />
        <circle cx="14" cy="-24" r="3" fill="#22c55e" />
        <circle cx="12" cy="-25" r="1.8" fill="#fde047" />
        <circle cx="0" cy="-27" r="3.2" fill="#4ade80" />
        <circle cx="0" cy="-27" r="1.8" fill="#ffffff" />
      </g>
    </svg>
  );
});

/**
 * 10. Collaborative Group Headquarters (`GroupBuilding25D`)
 * Evolves across 5 distinct 2.5D architectural stages as members pool coins together:
 *  - Level 1: چادر کهنه و فرسوده (Old Patched Canvas Tent + Wooden Stakes + Small Campfire)
 *  - Level 2: خیمه بزرگ پرچم‌دار (Sturdy Pavilion Tent + Wooden Beams + Hanging Lantern + Banner)
 *  - Level 3: تالار چوبی و سنگی (Stone & Timber Guild Lodge + Tiled Roof + Warm Chimney)
 *  - Level 4: عمارت باشکوه دانش (Ornate Dual-Tower Emerald & Gold Guild Manor)
 *  - Level 5: دژ زرین جاویدان (Monumental Golden Citadel with Turquoise Persian Dome & Spires)
 */
export const GroupBuilding25D: React.FC<{
  level?: number;
  className?: string;
}> = React.memo(({ level = 1, className = 'w-44 h-36' }) => {
  const tier = Math.max(1, Math.min(5, Math.floor(Number(level) || 1)));

  if (tier === 1) {
    return (
      <svg viewBox="0 0 180 145" className={`${className} overflow-visible`}>
        {/* Soft earthen campsite shadow */}
        <ellipse cx="90" cy="112" rx="64" ry="24" fill="#052e16" opacity="0.48" />
        <ellipse cx="90" cy="108" rx="52" ry="18" fill="#78350f" opacity="0.55" />

        {/* Wooden guy-ropes & pegs */}
        <line x1="46" y1="68" x2="26" y2="108" stroke="#a16207" strokeWidth="1.8" strokeDasharray="3 2" />
        <line x1="134" y1="68" x2="154" y2="108" stroke="#a16207" strokeWidth="1.8" strokeDasharray="3 2" />
        <rect x="23" y="103" width="4" height="10" rx="1" fill="#78350f" stroke="#451a03" strokeWidth="1" />
        <rect x="153" y="103" width="4" height="10" rx="1" fill="#78350f" stroke="#451a03" strokeWidth="1" />

        {/* Main Old Patched Canvas Tent Body (Weathered Linen & Burlap) */}
        <polygon
          points="90,34 38,98 88,114"
          fill="#d6c29f"
          stroke="#573b1a"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <polygon
          points="90,34 142,98 88,114"
          fill="#b59b72"
          stroke="#573b1a"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Stitched Canvas Patches on Old Tent */}
        <polygon points="56,74 72,68 74,82 58,88" fill="#a18257" stroke="#6b4f2a" strokeWidth="1.2" />
        <line x1="57" y1="76" x2="73" y2="79" stroke="#78350f" strokeWidth="1" strokeDasharray="2 2" />
        <polygon points="108,68 124,78 119,92 103,84" fill="#9a7d52" stroke="#6b4f2a" strokeWidth="1.2" />

        {/* Dark Open Tent Entrance Flap & Tied Curtain */}
        <polygon points="88,68 73,109 103,109" fill="#291709" stroke="#573b1a" strokeWidth="1.6" />
        <polygon points="88,68 73,109 80,109" fill="#8c724b" />
        <polygon points="88,68 103,109 96,109" fill="#8c724b" />

        {/* Crooked Ridge Wooden Pole Top */}
        <line x1="90" y1="26" x2="90" y2="38" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
        <circle cx="90" cy="26" r="2.8" fill="#b45309" />

        {/* Small Warm Campfire Beside Tent */}
        <g transform="translate(136, 110)">
          <ellipse cx="0" cy="4" rx="11" ry="4.5" fill="#451a03" />
          <line x1="-8" y1="3" x2="8" y2="-1" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="-7" y1="-1" x2="7" y2="4" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M -5,2 C -6,-8 0,-14 1,-16 C 3,-11 7,-7 5,2 Z" fill="#f97316" />
          <path d="M -2,2 C -2,-5 0,-9 1,-10 C 3,-6 4,-3 2,2 Z" fill="#fde047" />
        </g>
      </svg>
    );
  }

  if (tier === 2) {
    return (
      <svg viewBox="0 0 180 145" className={`${className} overflow-visible`}>
        <ellipse cx="90" cy="115" rx="68" ry="25" fill="#052e16" opacity="0.5" />
        {/* Wooden Timber Platform */}
        <polygon points="90,82 152,106 90,130 28,106" fill="#92400e" stroke="#451a03" strokeWidth="2" />
        <polygon points="28,106 90,130 90,136 28,112" fill="#78350f" />
        <polygon points="152,106 90,130 90,136 152,112" fill="#451a03" />

        {/* Striped Pavilion Tent Lower Walls */}
        <polygon points="42,72 90,94 90,120 42,98" fill="#fef3c7" stroke="#78350f" strokeWidth="2" />
        <polygon points="138,72 90,94 90,120 138,98" fill="#e2d4b7" stroke="#78350f" strokeWidth="2" />
        {/* Emerald Heraldic Trim Stripes */}
        <polygon points="56,79 68,85 68,109 56,103" fill="#059669" />
        <polygon points="112,85 124,79 124,103 112,109" fill="#047857" />

        {/* Arched Wooden Entrance & Warm Lantern */}
        <path d="M 78,115 L 78,94 Q 90,84 102,94 L 102,115 Z" fill="#291709" stroke="#fbbf24" strokeWidth="1.8" />
        <circle cx="90" cy="95" r="3" fill="#fde047" />

        {/* Conical Festive Roof Canopy */}
        <polygon points="90,26 32,74 90,96" fill="#10b981" stroke="#064e3b" strokeWidth="2" strokeLinejoin="round" />
        <polygon points="90,26 148,74 90,96" fill="#059669" stroke="#064e3b" strokeWidth="2" strokeLinejoin="round" />
        <polygon points="90,26 62,84 90,96" fill="#fef3c7" opacity="0.88" />
        <polygon points="90,26 118,84 90,96" fill="#fde68a" opacity="0.85" />

        {/* Pennant Flag Pole */}
        <line x1="90" y1="8" x2="90" y2="28" stroke="#fbbf24" strokeWidth="2.8" />
        <polygon points="90,9 116,15 90,21" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
        <circle cx="90" cy="7" r="3" fill="#fef08a" />
      </svg>
    );
  }

  if (tier === 3) {
    return (
      <svg viewBox="0 0 185 150" className={`${className} overflow-visible`}>
        <ellipse cx="92" cy="118" rx="74" ry="26" fill="#041d11" opacity="0.55" />
        {/* Stone Foundation */}
        <polygon points="92,84 158,108 92,134 26,108" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
        <polygon points="26,108 92,134 92,141 26,115" fill="#64748b" />
        <polygon points="158,108 92,134 92,141 158,115" fill="#475569" />

        {/* Timber & Stone Lodge Walls */}
        <polygon points="40,62 92,84 92,126 40,104" fill="#fef3c7" stroke="#78350f" strokeWidth="2" />
        <polygon points="144,62 92,84 92,126 144,104" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
        {/* Timber Framing Beams */}
        <line x1="65" y1="73" x2="65" y2="115" stroke="#78350f" strokeWidth="3.5" />
        <line x1="118" y1="73" x2="118" y2="115" stroke="#573b1a" strokeWidth="3.5" />

        {/* Warm Glowing Windows & Heavy Oak Door */}
        <polygon points="48,78 58,82 58,95 48,91" fill="#fbbf24" stroke="#78350f" strokeWidth="1.2" />
        <polygon points="126,82 136,78 136,91 126,95" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
        <path d="M 78,121 L 78,94 Q 92,84 106,94 L 106,121 Z" fill="#78350f" stroke="#fbbf24" strokeWidth="1.8" />

        {/* Warm Chimney */}
        <rect x="118" y="28" width="12" height="24" rx="2" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
        <circle cx="124" cy="21" r="4" fill="#e2e8f0" opacity="0.65" />
        <circle cx="128" cy="14" r="5" fill="#f8fafc" opacity="0.45" />

        {/* Steep Shingled Guild Roof */}
        <polygon points="92,26 30,66 92,90" fill="#b45309" stroke="#fde047" strokeWidth="2" strokeLinejoin="round" />
        <polygon points="92,26 154,66 92,90" fill="#92400e" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
        {/* Roof Banner Emblem */}
        <circle cx="92" cy="58" r="8" fill="#059669" stroke="#fde047" strokeWidth="1.8" />
        <polygon points="92,52 94,57 98,58 94,60 92,64 90,60 86,58 90,57" fill="#fef08a" />
      </svg>
    );
  }

  if (tier === 4) {
    return (
      <svg viewBox="0 0 190 155" className={`${className} overflow-visible`}>
        <ellipse cx="95" cy="122" rx="78" ry="27" fill="#02140b" opacity="0.6" />
        {/* Marble Plaza Terrace */}
        <polygon points="95,86 168,112 95,140 22,112" fill="#e2e8f0" stroke="#fbbf24" strokeWidth="2.2" />
        <polygon points="22,112 95,140 95,147 22,119" fill="#94a3b8" />
        <polygon points="168,112 95,140 95,147 168,119" fill="#64748b" />

        {/* Left & Right Flanking Guild Towers */}
        <rect x="34" y="42" width="24" height="62" rx="3" fill="#065f46" stroke="#fbbf24" strokeWidth="1.8" />
        <polygon points="30,44 46,20 62,44" fill="#0ea5e9" stroke="#fef08a" strokeWidth="1.8" />
        <rect x="132" y="42" width="24" height="62" rx="3" fill="#064e3b" stroke="#f59e0b" strokeWidth="1.8" />
        <polygon points="128,44 144,20 160,44" fill="#0284c7" stroke="#fbbf24" strokeWidth="1.8" />

        {/* Central Manor Hall */}
        <polygon points="50,58 95,78 95,126 50,106" fill="#fef3c7" stroke="#92400e" strokeWidth="2" />
        <polygon points="140,58 95,78 95,126 140,106" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />

        {/* Illuminated Arched Windows & Golden Portal */}
        <polygon points="60,72 72,77 72,94 60,89" fill="#38bdf8" stroke="#fef08a" strokeWidth="1.2" />
        <polygon points="118,77 130,72 130,89 118,94" fill="#0284c7" stroke="#fbbf24" strokeWidth="1.2" />
        <path d="M 80,121 L 80,92 Q 95,80 110,92 L 110,121 Z" fill="#065f46" stroke="#fde047" strokeWidth="2" />
        <circle cx="95" cy="98" r="4" fill="#fef08a" />

        {/* Emerald & Gold Mansard Roof */}
        <polygon points="95,24 44,58 95,78" fill="#10b981" stroke="#fef08a" strokeWidth="2" />
        <polygon points="95,24 146,58 95,78" fill="#047857" stroke="#fbbf24" strokeWidth="2" />
        <circle cx="95" cy="20" r="5" fill="#fde047" stroke="#78350f" strokeWidth="1.2" />
      </svg>
    );
  }

  // Tier 5: دژ زرین جاویدان (Monumental Citadel with Turquoise Persian Dome & Golden Spires)
  return (
    <svg viewBox="0 0 200 165" className={`${className} overflow-visible`}>
      <ellipse cx="100" cy="130" rx="84" ry="29" fill="#02140b" opacity="0.65" />
      {/* Grand Golden-Trimmed Citadel Courtyard */}
      <polygon points="100,90 180,120 100,152 20,120" fill="#fef3c7" stroke="#fbbf24" strokeWidth="2.5" />
      <polygon points="20,120 100,152 100,160 20,128" fill="#d97706" />
      <polygon points="180,120 100,152 100,160 180,128" fill="#92400e" />

      {/* Dual Golden-Roofed Minarets / Citadel Spires */}
      <rect x="30" y="36" width="22" height="78" rx="4" fill="#065f46" stroke="#fde047" strokeWidth="2" />
      <polygon points="26,38 41,10 56,38" fill="#fbbf24" stroke="#fef08a" strokeWidth="1.8" />
      <circle cx="41" cy="8" r="3.5" fill="#fef08a" />

      <rect x="148" y="36" width="22" height="78" rx="4" fill="#064e3b" stroke="#fbbf24" strokeWidth="2" />
      <polygon points="144,38 159,10 174,38" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.8" />
      <circle cx="159" cy="8" r="3.5" fill="#fef08a" />

      {/* Main Palatial Wings */}
      <polygon points="48,58 100,82 100,136 48,112" fill="#fffbeb" stroke="#d97706" strokeWidth="2.2" />
      <polygon points="152,58 100,82 100,136 152,112" fill="#fde68a" stroke="#b45309" strokeWidth="2.2" />

      {/* Azure & Gold Arch Windows */}
      <polygon points="58,74 72,80 72,102 58,96" fill="#06b6d4" stroke="#f59e0b" strokeWidth="1.4" />
      <polygon points="128,80 142,74 142,96 128,102" fill="#0891b2" stroke="#d97706" strokeWidth="1.4" />

      {/* Radiant Royal Gate */}
      <path d="M 82,130 L 82,96 Q 100,80 118,96 L 118,130 Z" fill="#047857" stroke="#fde047" strokeWidth="2.5" />
      <polygon points="100,98 104,107 112,108 106,114 108,122 100,118 92,122 94,114 88,108 96,107" fill="#fef08a" />

      {/* Turquoise Persian Dome & Golden Crown Finial */}
      <polygon points="100,40 44,60 100,82 156,60" fill="#059669" stroke="#fef08a" strokeWidth="2" />
      <path d="M 62,56 C 62,12 138,12 138,56 Z" fill="#06b6d4" stroke="#fde047" strokeWidth="2.2" />
      <path d="M 74,52 C 78,22 98,18 98,18" fill="none" stroke="#cffafe" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="100" y1="6" x2="100" y2="20" stroke="#fde047" strokeWidth="3" />
      <circle cx="100" cy="6" r="4.5" fill="#fef08a" stroke="#b45309" strokeWidth="1.2" />
    </svg>
  );
});
