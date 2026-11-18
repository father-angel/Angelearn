import React from 'react';
import { AvatarConfig, AvatarGender } from '../types/game';

export type AvatarCategory =
  | 'hairStyle'
  | 'faceExpression'
  | 'outfit'
  | 'pants'
  | 'accessory'
  | 'hairColor'
  | 'skinTone'
  | 'bgAura';

export interface AvatarCatalogItem {
  id: string;
  category: AvatarCategory;
  name: string;
  cost: number; // 0 = Free, >0 = Coins
  genderFilter?: 'boy' | 'girl' | 'all';
  previewColor?: string;
  badgeText?: string;
}

export interface AvatarPresetTemplate {
  id: string;
  name: string;
  subtitle: string;
  gender: AvatarGender;
  config: AvatarConfig;
}

export const DEFAULT_GIRL_AVATAR: AvatarConfig = {
  skinTone: 'warm_ivory',
  hairStyle: 'silk_shawl',
  hairColor: 'espresso',
  faceExpression: 'happy_smile',
  outfit: 'gardener_tunic',
  pants: 'forest_trousers',
  accessory: 'leaf_sprout',
  bgAura: 'emerald_mist',
};

export const DEFAULT_BOY_AVATAR: AvatarConfig = {
  skinTone: 'wheat_glow',
  hairStyle: 'classic_waves',
  hairColor: 'espresso',
  faceExpression: 'happy_smile',
  outfit: 'gardener_tunic',
  pants: 'classic_denim',
  accessory: 'leaf_sprout',
  bgAura: 'emerald_mist',
};

export function getDefaultAvatarConfig(gender: AvatarGender): AvatarConfig {
  return gender === 'girl'
    ? { ...DEFAULT_GIRL_AVATAR }
    : { ...DEFAULT_BOY_AVATAR };
}

// Ready-made templates that users can pick with one click
export const AVATAR_PRESET_TEMPLATES: AvatarPresetTemplate[] = [
  {
    id: 'tpl_girl_gardener',
    name: 'باغبان شکوفا',
    subtitle: 'قالب رایگان طبیعت',
    gender: 'girl',
    config: {
      skinTone: 'warm_ivory',
      hairStyle: 'silk_shawl',
      hairColor: 'espresso',
      faceExpression: 'happy_smile',
      outfit: 'gardener_tunic',
      pants: 'forest_trousers',
      accessory: 'leaf_sprout',
      bgAura: 'emerald_mist',
    },
  },
  {
    id: 'tpl_girl_traveler',
    name: 'همسفر نسیم',
    subtitle: 'قالب رایگان سیاحت',
    gender: 'girl',
    config: {
      skinTone: 'wheat_glow',
      hairStyle: 'long_braids',
      hairColor: 'chestnut',
      faceExpression: 'wink_cheerful',
      outfit: 'traveler_cloak',
      pants: 'cargo_explorer',
      accessory: 'none',
      bgAura: 'sunset_amber',
    },
  },
  {
    id: 'tpl_girl_scholar',
    name: 'پژوهشگر شهر مهارت',
    subtitle: 'استایل دانش‌پژوه',
    gender: 'girl',
    config: {
      skinTone: 'warm_ivory',
      hairStyle: 'ponytail_breeze',
      hairColor: 'golden_amber',
      faceExpression: 'cool_confident',
      outfit: 'academy_robe',
      pants: 'scholar_slacks',
      accessory: 'round_glasses',
      bgAura: 'starry_night',
    },
  },
  {
    id: 'tpl_girl_angel',
    name: 'فرشته نگهبان باغ',
    subtitle: 'استایل ویژه انجلرن',
    gender: 'girl',
    config: {
      skinTone: 'warm_ivory',
      hairStyle: 'royal_crown_bun',
      hairColor: 'forest_emerald',
      faceExpression: 'peaceful_zen',
      outfit: 'golden_angel_vestment',
      pants: 'royal_white_pants',
      accessory: 'angel_halo',
      bgAura: 'crystal_spring',
    },
  },
  {
    id: 'tpl_boy_gardener',
    name: 'باغبان سرسبز',
    subtitle: 'قالب رایگان طبیعت',
    gender: 'boy',
    config: {
      skinTone: 'wheat_glow',
      hairStyle: 'classic_waves',
      hairColor: 'espresso',
      faceExpression: 'happy_smile',
      outfit: 'gardener_tunic',
      pants: 'classic_denim',
      accessory: 'leaf_sprout',
      bgAura: 'emerald_mist',
    },
  },
  {
    id: 'tpl_boy_traveler',
    name: 'همسفر راه ابریشم',
    subtitle: 'قالب رایگان سیاحت',
    gender: 'boy',
    config: {
      skinTone: 'olive_sun',
      hairStyle: 'curly_bush',
      hairColor: 'jet_black',
      faceExpression: 'cool_confident',
      outfit: 'traveler_cloak',
      pants: 'cargo_explorer',
      accessory: 'none',
      bgAura: 'sunset_amber',
    },
  },
  {
    id: 'tpl_boy_scholar',
    name: 'حکیم تندخوان',
    subtitle: 'استایل دانش‌پژوه',
    gender: 'boy',
    config: {
      skinTone: 'warm_ivory',
      hairStyle: 'modern_quiff',
      hairColor: 'chestnut',
      faceExpression: 'wise_thinker',
      outfit: 'academy_robe',
      pants: 'scholar_slacks',
      accessory: 'round_glasses',
      bgAura: 'starry_night',
    },
  },
  {
    id: 'tpl_boy_angel',
    name: 'قهرمان روشنایی',
    subtitle: 'استایل ویژه انجلرن',
    gender: 'boy',
    config: {
      skinTone: 'wheat_glow',
      hairStyle: 'sage_long',
      hairColor: 'silver_moon',
      faceExpression: 'excited_laugh',
      outfit: 'golden_angel_vestment',
      pants: 'royal_white_pants',
      accessory: 'angel_halo',
      bgAura: 'crystal_spring',
    },
  },
];

export const AVATAR_CATALOG: AvatarCatalogItem[] = [
  // ======================== 1. HAIRSTYLES (مدل مو) ========================
  {
    id: 'silk_shawl',
    category: 'hairStyle',
    name: 'شال حریر و طره مو',
    cost: 0,
    genderFilter: 'girl',
    badgeText: 'رایگان',
  },
  {
    id: 'long_braids',
    category: 'hairStyle',
    name: 'گیسوان بافته جنگلی',
    cost: 0,
    genderFilter: 'girl',
    badgeText: 'رایگان',
  },
  {
    id: 'ponytail_breeze',
    category: 'hairStyle',
    name: 'دم‌اسبی پرانرژی',
    cost: 10,
    genderFilter: 'girl',
  },
  {
    id: 'royal_crown_bun',
    category: 'hairStyle',
    name: 'موی جمع اشرافی',
    cost: 15,
    genderFilter: 'girl',
  },
  {
    id: 'classic_waves',
    category: 'hairStyle',
    name: 'موی موج‌دار کلاسیک',
    cost: 0,
    genderFilter: 'all',
    badgeText: 'رایگان',
  },
  {
    id: 'curly_bush',
    category: 'hairStyle',
    name: 'موی فرفری پرپشت',
    cost: 0,
    genderFilter: 'all',
    badgeText: 'رایگان',
  },
  {
    id: 'modern_quiff',
    category: 'hairStyle',
    name: 'مدل خامه‌ای مدرن',
    cost: 10,
    genderFilter: 'boy',
  },
  {
    id: 'sage_long',
    category: 'hairStyle',
    name: 'موی بلند حکیمان',
    cost: 15,
    genderFilter: 'all',
  },

  // ======================== 2. FACIAL EXPRESSIONS (حالت صورت) ========================
  {
    id: 'happy_smile',
    category: 'faceExpression',
    name: 'لبخند شاد و صمیمی',
    cost: 0,
    genderFilter: 'all',
    badgeText: 'رایگان',
  },
  {
    id: 'cool_confident',
    category: 'faceExpression',
    name: 'مصمم و بااراده',
    cost: 0,
    genderFilter: 'all',
    badgeText: 'رایگان',
  },
  {
    id: 'wink_cheerful',
    category: 'faceExpression',
    name: 'چشمک پرانرژی',
    cost: 0,
    genderFilter: 'all',
    badgeText: 'رایگان',
  },
  {
    id: 'excited_laugh',
    category: 'faceExpression',
    name: 'شوق و خنده پرنشاط',
    cost: 5,
    genderFilter: 'all',
  },
  {
    id: 'peaceful_zen',
    category: 'faceExpression',
    name: 'آرامش و تمرکز ذن',
    cost: 5,
    genderFilter: 'all',
  },
  {
    id: 'wise_thinker',
    category: 'faceExpression',
    name: 'نگاه متفکر و تیزبین',
    cost: 10,
    genderFilter: 'all',
  },

  // ======================== 3. OUTFITS / TOPS (لباس بالاتنه) ========================
  {
    id: 'gardener_tunic',
    category: 'outfit',
    name: 'تونیک کتان باغبان',
    cost: 0,
    genderFilter: 'all',
    badgeText: 'رایگان',
  },
  {
    id: 'traveler_cloak',
    category: 'outfit',
    name: 'شنل و ژاکت همسفر',
    cost: 0,
    genderFilter: 'all',
    badgeText: 'رایگان',
  },
  {
    id: 'casual_hoodie',
    category: 'outfit',
    name: 'هودی سبز طبیعت‌گردی',
    cost: 0,
    genderFilter: 'all',
    badgeText: 'رایگان',
  },
  {
    id: 'academy_robe',
    category: 'outfit',
    name: 'کت رسمی دانشگاه مهارت',
    cost: 10,
    genderFilter: 'all',
  },
  {
    id: 'emerald_guardian',
    category: 'outfit',
    name: 'جلیقه زمردین نگهبان',
    cost: 20,
    genderFilter: 'all',
  },
  {
    id: 'golden_angel_vestment',
    category: 'outfit',
    name: 'ردای بال‌دار فرشته نور',
    cost: 30,
    genderFilter: 'all',
  },

  // ======================== 4. PANTS / TROUSERS (شلوار) ========================
  {
    id: 'forest_trousers',
    category: 'pants',
    name: 'شلوار کتان جنگلی',
    cost: 0,
    genderFilter: 'all',
    previewColor: '#3f6212',
    badgeText: 'رایگان',
  },
  {
    id: 'classic_denim',
    category: 'pants',
    name: 'شلوار جین آبی کلاسیک',
    cost: 0,
    genderFilter: 'all',
    previewColor: '#1d4ed8',
    badgeText: 'رایگان',
  },
  {
    id: 'cargo_explorer',
    category: 'pants',
    name: 'شلوار جیب‌دار کوهستان',
    cost: 0,
    genderFilter: 'all',
    previewColor: '#92400e',
    badgeText: 'رایگان',
  },
  {
    id: 'scholar_slacks',
    category: 'pants',
    name: 'شلوار رسمی سرمه‌ای دانشگاه',
    cost: 10,
    genderFilter: 'all',
    previewColor: '#1e293b',
  },
  {
    id: 'emerald_combat',
    category: 'pants',
    name: 'شلوار چابک زمردین',
    cost: 15,
    genderFilter: 'all',
    previewColor: '#065f46',
  },
  {
    id: 'royal_white_pants',
    category: 'pants',
    name: 'شلوار سفید با نوار طلایی',
    cost: 20,
    genderFilter: 'all',
    previewColor: '#f8fafc',
  },

  // ======================== 5. ACCESSORIES & PROPS (وسایل و اکسسوری) ========================
  {
    id: 'none',
    category: 'accessory',
    name: 'ساده (بدون وسیله)',
    cost: 0,
    genderFilter: 'all',
    badgeText: 'رایگان',
  },
  {
    id: 'leaf_sprout',
    category: 'accessory',
    name: 'جوانه سبز شکوفایی',
    cost: 0,
    genderFilter: 'all',
    badgeText: 'رایگان',
  },
  {
    id: 'round_glasses',
    category: 'accessory',
    name: 'عینک طلایی تندخوانی',
    cost: 10,
    genderFilter: 'all',
  },
  {
    id: 'straw_hat',
    category: 'accessory',
    name: 'کلاه حصیری آفتابی',
    cost: 15,
    genderFilter: 'all',
  },
  {
    id: 'wisdom_book',
    category: 'accessory',
    name: 'کتاب زرین دانایی (در دست)',
    cost: 15,
    genderFilter: 'all',
  },
  {
    id: 'starlight_lantern',
    category: 'accessory',
    name: 'فانوس شب‌تاب (در دست)',
    cost: 20,
    genderFilter: 'all',
  },
  {
    id: 'flower_crown',
    category: 'accessory',
    name: 'تاج گل و برگ بهاری',
    cost: 20,
    genderFilter: 'all',
  },
  {
    id: 'angel_halo',
    category: 'accessory',
    name: 'هاله نورانی فرشته',
    cost: 25,
    genderFilter: 'all',
  },

  // ======================== 6. HAIR COLORS (رنگ مو) ========================
  {
    id: 'espresso',
    category: 'hairColor',
    name: 'قهوه‌ای اسپرسو',
    cost: 0,
    previewColor: '#3b2314',
    badgeText: 'رایگان',
  },
  {
    id: 'jet_black',
    category: 'hairColor',
    name: 'مشکی پرکلاغی',
    cost: 0,
    previewColor: '#18181b',
    badgeText: 'رایگان',
  },
  {
    id: 'chestnut',
    category: 'hairColor',
    name: 'بلوطی گرم',
    cost: 0,
    previewColor: '#7c2d12',
    badgeText: 'رایگان',
  },
  {
    id: 'golden_amber',
    category: 'hairColor',
    name: 'طلایی کهربایی',
    cost: 10,
    previewColor: '#d97706',
  },
  {
    id: 'forest_emerald',
    category: 'hairColor',
    name: 'سبز جادویی جنگل',
    cost: 15,
    previewColor: '#059669',
  },
  {
    id: 'silver_moon',
    category: 'hairColor',
    name: 'نقره‌ای مهتابی',
    cost: 15,
    previewColor: '#94a3b8',
  },

  // ======================== 7. SKIN TONES (رنگ پوست) ========================
  {
    id: 'warm_ivory',
    category: 'skinTone',
    name: 'روشن گرم',
    cost: 0,
    previewColor: '#fde2c8',
    badgeText: 'رایگان',
  },
  {
    id: 'wheat_glow',
    category: 'skinTone',
    name: 'گندمی روشن',
    cost: 0,
    previewColor: '#f3c69f',
    badgeText: 'رایگان',
  },
  {
    id: 'olive_sun',
    category: 'skinTone',
    name: 'سبزه زیتونی',
    cost: 0,
    previewColor: '#d9a173',
    badgeText: 'رایگان',
  },
  {
    id: 'bronze_earth',
    category: 'skinTone',
    name: 'برنزه گرم',
    cost: 0,
    previewColor: '#a66e46',
    badgeText: 'رایگان',
  },

  // ======================== 8. BACKGROUND AURAS (پس‌زمینه) ========================
  {
    id: 'emerald_mist',
    category: 'bgAura',
    name: 'مه زمردین جنگل',
    cost: 0,
    previewColor: '#10b981',
    badgeText: 'رایگان',
  },
  {
    id: 'sunset_amber',
    category: 'bgAura',
    name: 'شفق طلایی',
    cost: 0,
    previewColor: '#f59e0b',
    badgeText: 'رایگان',
  },
  {
    id: 'starry_night',
    category: 'bgAura',
    name: 'شب پرستاره آگاهی',
    cost: 10,
    previewColor: '#3b82f6',
  },
  {
    id: 'crystal_spring',
    category: 'bgAura',
    name: 'چشمه بلورین نور',
    cost: 15,
    previewColor: '#06b6d4',
  },
];

export function isAvatarItemUnlocked(
  itemId: string,
  unlockedList?: string[]
): boolean {
  const item = AVATAR_CATALOG.find((i) => i.id === itemId);
  if (!item || item.cost === 0) return true;
  return Boolean(unlockedList && unlockedList.includes(itemId));
}

const SKIN_COLORS: Record<string, { base: string; shadow: string; blush: string }> = {
  warm_ivory: { base: '#fde2c8', shadow: '#eab892', blush: '#fda4af' },
  wheat_glow: { base: '#f3c69f', shadow: '#d69e72', blush: '#fb7185' },
  olive_sun: { base: '#d9a173', shadow: '#b87d4f', blush: '#f43f5e' },
  bronze_earth: { base: '#a66e46', shadow: '#84522f', blush: '#e11d48' },
};

const HAIR_COLORS: Record<string, { main: string; highlight: string }> = {
  espresso: { main: '#3b2314', highlight: '#5c3822' },
  jet_black: { main: '#18181b', highlight: '#3f3f46' },
  chestnut: { main: '#7c2d12', highlight: '#9a3412' },
  golden_amber: { main: '#d97706', highlight: '#fbbf24' },
  forest_emerald: { main: '#047857', highlight: '#10b981' },
  silver_moon: { main: '#94a3b8', highlight: '#e2e8f0' },
};

const BG_AURAS: Record<string, { from: string; to: string; ring: string }> = {
  emerald_mist: { from: '#064e3b', to: '#10b981', ring: '#34d399' },
  sunset_amber: { from: '#78350f', to: '#f59e0b', ring: '#fde047' },
  starry_night: { from: '#1e1b4b', to: '#2563eb', ring: '#60a5fa' },
  crystal_spring: { from: '#083344', to: '#06b6d4', ring: '#67e8f9' },
};

const PANTS_STYLES: Record<
  string,
  { main: string; shadow: string; trim: string; belt: string; boot: string }
> = {
  forest_trousers: {
    main: '#3f6212',
    shadow: '#365314',
    trim: '#84cc16',
    belt: '#78350f',
    boot: '#451a03',
  },
  classic_denim: {
    main: '#1d4ed8',
    shadow: '#1e3a8a',
    trim: '#93c5fd',
    belt: '#451a03',
    boot: '#334155',
  },
  cargo_explorer: {
    main: '#a16207',
    shadow: '#713f12',
    trim: '#fde047',
    belt: '#451a03',
    boot: '#451a03',
  },
  scholar_slacks: {
    main: '#1e293b',
    shadow: '#0f172a',
    trim: '#fbbf24',
    belt: '#0f172a',
    boot: '#1e1b4b',
  },
  emerald_combat: {
    main: '#065f46',
    shadow: '#064e3b',
    trim: '#34d399',
    belt: '#b45309',
    boot: '#022c22',
  },
  royal_white_pants: {
    main: '#f8fafc',
    shadow: '#cbd5e1',
    trim: '#fbbf24',
    belt: '#d97706',
    boot: '#b45309',
  },
};

interface CharacterAvatarProps {
  gender: AvatarGender;
  config?: AvatarConfig;
  size?: number;
  variant?: 'portrait' | 'full';
  showBackdrop?: boolean;
  isWalking?: boolean;
  className?: string;
}

export const CharacterAvatar: React.FC<CharacterAvatarProps> = React.memo(({
  gender,
  config,
  size = 96,
  variant = 'portrait',
  showBackdrop = true,
  isWalking = false,
  className = '',
}) => {
  const defaults = getDefaultAvatarConfig(gender);
  const effective: AvatarConfig = {
    ...defaults,
    ...config,
    faceExpression: config?.faceExpression || defaults.faceExpression || 'happy_smile',
    pants: config?.pants || defaults.pants || 'forest_trousers',
  };

  const skin = SKIN_COLORS[effective.skinTone] || SKIN_COLORS.warm_ivory;
  const hair = HAIR_COLORS[effective.hairColor] || HAIR_COLORS.espresso;
  const bg = BG_AURAS[effective.bgAura] || BG_AURAS.emerald_mist;
  const pantsStyle =
    PANTS_STYLES[effective.pants || 'forest_trousers'] ||
    PANTS_STYLES.forest_trousers;

  const uid = React.useId().replace(/:/g, '');
  const isFull = variant === 'full';
  const svgWidth = size;
  const svgHeight = isFull ? Math.round(size * 1.42) : size;

  const renderFacialFeatures = () => {
    const expr = effective.faceExpression || 'happy_smile';
    const mouthColor = gender === 'girl' ? '#e11d48' : '#7c2d12';

    return (
      <>
        {/* Rosy Cheeks */}
        <ellipse
          cx="44"
          cy="60"
          rx="4.5"
          ry="2.5"
          fill={skin.blush}
          opacity={expr === 'excited_laugh' ? 0.65 : 0.45}
        />
        <ellipse
          cx="76"
          cy="60"
          rx="4.5"
          ry="2.5"
          fill={skin.blush}
          opacity={expr === 'excited_laugh' ? 0.65 : 0.45}
        />

        {/* Eyebrows */}
        {expr === 'cool_confident' ? (
          <>
            <path
              d="M 41 44 L 53 47"
              fill="none"
              stroke={hair.main}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M 79 44 L 67 47"
              fill="none"
              stroke={hair.main}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </>
        ) : expr === 'wise_thinker' ? (
          <>
            <path
              d="M 41 43 Q 47 39 53 44"
              fill="none"
              stroke={hair.main}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 67 46 L 79 45"
              fill="none"
              stroke={hair.main}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path
              d="M 42 46 Q 47 43 52 46"
              fill="none"
              stroke={hair.main}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M 68 46 Q 73 43 78 46"
              fill="none"
              stroke={hair.main}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Eyes */}
        {expr === 'peaceful_zen' ? (
          <>
            <path
              d="M 42 52 Q 47 56 52 52"
              fill="none"
              stroke="#1e293b"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M 68 52 Q 73 56 78 52"
              fill="none"
              stroke="#1e293b"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </>
        ) : expr === 'wink_cheerful' ? (
          <>
            <circle cx="47" cy="52" r="3.8" fill="#1e293b" />
            <circle cx="48.2" cy="50.8" r="1.3" fill="#ffffff" />
            <path
              d="M 68 52 Q 73 48 78 52"
              fill="none"
              stroke="#1e293b"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <circle cx="47" cy="52" r="3.8" fill="#1e293b" />
            <circle cx="73" cy="52" r="3.8" fill="#1e293b" />
            <circle cx="48.2" cy="50.8" r="1.3" fill="#ffffff" />
            <circle cx="74.2" cy="50.8" r="1.3" fill="#ffffff" />
            {gender === 'girl' && (
              <g stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round">
                <line x1="43" y1="50" x2="41" y2="48" />
                <line x1="77" y1="50" x2="79" y2="48" />
              </g>
            )}
          </>
        )}

        {/* Nose */}
        <path
          d="M 60 53 Q 58 58 61 59"
          fill="none"
          stroke={skin.shadow}
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Mouth / Expression */}
        {expr === 'excited_laugh' ? (
          <g>
            <path
              d="M 50 63 Q 60 74 70 63 Z"
              fill="#be123c"
              stroke={mouthColor}
              strokeWidth="1.6"
            />
            <path d="M 53 64 L 67 64" stroke="#ffffff" strokeWidth="2" />
          </g>
        ) : expr === 'cool_confident' ? (
          <path
            d="M 52 66 Q 61 68 69 63"
            fill="none"
            stroke={mouthColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : expr === 'wise_thinker' ? (
          <path
            d="M 54 66 Q 60 67 66 65"
            fill="none"
            stroke={mouthColor}
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M 52 65 Q 60 71 68 65"
            fill="none"
            stroke={mouthColor}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        )}
      </>
    );
  };

  return (
    <svg
      viewBox={isFull ? '0 0 120 185' : '0 0 120 120'}
      width={svgWidth}
      height={svgHeight}
      className={`select-none ${
        showBackdrop
          ? `overflow-hidden ${isFull ? 'rounded-3xl' : 'rounded-full'}`
          : 'overflow-visible'
      } ${className}`}
    >
      {showBackdrop && (
        <defs>
          <linearGradient id={`bg-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={bg.from} />
            <stop offset="100%" stopColor={bg.to} />
          </linearGradient>
          <clipPath id={`clip-${uid}`}>
            {isFull ? (
              <rect x="2" y="2" width="116" height="181" rx="22" />
            ) : (
              <circle cx="60" cy="60" r="58" />
            )}
          </clipPath>
        </defs>
      )}

      <g clipPath={showBackdrop ? `url(#clip-${uid})` : undefined}>
        {/* 1. Background Aura or Ground Contact Shadow */}
        {showBackdrop ? (
          <>
            {isFull ? (
              <>
                <rect x="0" y="0" width="120" height="185" fill={`url(#bg-${uid})`} />
                {/* Standing Pedestal under Feet */}
                <ellipse
                  cx="60"
                  cy="172"
                  rx="38"
                  ry="9"
                  fill="#02120a"
                  opacity="0.45"
                />
                <ellipse
                  cx="60"
                  cy="171"
                  rx="32"
                  ry="6.5"
                  fill="none"
                  stroke={bg.ring}
                  strokeWidth="1.5"
                  opacity="0.65"
                />
              </>
            ) : (
              <circle cx="60" cy="60" r="58" fill={`url(#bg-${uid})`} />
            )}

            <circle
              cx="60"
              cy="56"
              r="48"
              fill="none"
              stroke={bg.ring}
              strokeWidth="1.2"
              strokeDasharray="4 4"
              opacity="0.4"
            />
            {/* Ambient Sparkles */}
            <circle cx="22" cy="28" r="1.8" fill="#fff" opacity="0.7" />
            <circle cx="98" cy="26" r="2.2" fill="#fde047" opacity="0.8" />
            <circle cx="18" cy="76" r="1.5" fill="#a7f3d0" opacity="0.6" />
          </>
        ) : (
          isFull && (
            <ellipse
              cx="60"
              cy="171"
              rx="28"
              ry="8"
              fill="#02120a"
              opacity="0.42"
            />
          )
        )}

        {/* Animated Character Body Group (GPU CSS Walk Bobbing / Idle Breathing) */}
        <g
          className={
            !showBackdrop
              ? isWalking
                ? 'hp-avatar-walk-bob'
                : 'hp-avatar-idle-bob'
              : undefined
          }
        >

          {/* 2. Optional Angel Wings behind Shoulders */}
          {(effective.outfit === 'golden_angel_vestment' ||
            effective.accessory === 'angel_halo') && (
            <g opacity="0.92">
              <path
                d="M 32 84 Q 6 62 12 38 Q 26 46 36 68 Z"
                fill="#fef9c3"
                stroke="#fbbf24"
                strokeWidth="1.5"
              />
              <path
                d="M 88 84 Q 114 62 108 38 Q 94 46 84 68 Z"
                fill="#fef9c3"
                stroke="#fbbf24"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* 3. Back Hair Layer */}
          {effective.hairStyle === 'silk_shawl' && (
            <path
              d="M 28 52 Q 22 80 28 104 L 92 104 Q 98 80 92 52 Z"
              fill="#047857"
            />
          )}
          {effective.hairStyle === 'long_braids' && (
            <g fill={hair.main}>
              <path d="M 30 48 Q 20 78 24 108 L 38 108 L 38 56 Z" />
              <path d="M 90 48 Q 100 78 96 108 L 82 108 L 82 56 Z" />
              <circle cx="28" cy="96" r="5.5" fill={hair.highlight} />
              <circle cx="92" cy="96" r="5.5" fill={hair.highlight} />
            </g>
          )}
          {effective.hairStyle === 'ponytail_breeze' && (
            <path
              d="M 78 38 Q 106 42 102 74 Q 90 72 82 54 Z"
              fill={hair.main}
            />
          )}
          {effective.hairStyle === 'royal_crown_bun' && (
            <g>
              <circle cx="60" cy="20" r="14" fill={hair.main} />
              <path
                d="M 48 24 Q 60 16 72 24"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          )}
          {effective.hairStyle === 'sage_long' && (
            <path
              d="M 30 46 Q 22 80 28 108 L 92 108 Q 98 80 90 46 Z"
              fill={hair.main}
            />
          )}

          {/* =================================================================
              4. FULL-BODY LOWER BODY: PANTS, BELT, LEGS & BOOTS
             ================================================================= */}
          {isFull && (
            <g>
              {/* Hip / Waist Bridge */}
              <rect
                x="40"
                y="113"
                width="40"
                height="10"
                rx="3"
                fill={pantsStyle.main}
              />

              {/* Left Leg, Cuff & Boot Group */}
              <g className={!showBackdrop && isWalking ? 'hp-leg-stride-left' : undefined}>
                <path
                  d="M 41 118 L 58 118 L 56 158 L 42 158 Z"
                  fill={pantsStyle.main}
                  stroke={pantsStyle.shadow}
                  strokeWidth="1.2"
                />
                {effective.pants === 'cargo_explorer' && (
                  <rect
                    x="39"
                    y="130"
                    width="6"
                    height="11"
                    rx="1.5"
                    fill={pantsStyle.shadow}
                    stroke={pantsStyle.trim}
                    strokeWidth="0.9"
                  />
                )}
                <line
                  x1="43"
                  y1="120"
                  x2="44"
                  y2="156"
                  stroke={pantsStyle.trim}
                  strokeWidth="1.4"
                  opacity="0.75"
                />
                <rect
                  x="41"
                  y="153"
                  width="16"
                  height="4"
                  rx="1.5"
                  fill={pantsStyle.trim}
                  opacity="0.85"
                />
                <path
                  d="M 41 157 L 56 157 L 57 169 C 57 172 37 172 38 167 Z"
                  fill={pantsStyle.boot}
                  stroke="#fde047"
                  strokeWidth="0.9"
                />
              </g>

              {/* Right Leg, Cuff & Boot Group */}
              <g className={!showBackdrop && isWalking ? 'hp-leg-stride-right' : undefined}>
                <path
                  d="M 62 118 L 79 118 L 78 158 L 64 158 Z"
                  fill={pantsStyle.main}
                  stroke={pantsStyle.shadow}
                  strokeWidth="1.2"
                />
                {effective.pants === 'cargo_explorer' && (
                  <rect
                    x="75"
                    y="130"
                    width="6"
                    height="11"
                    rx="1.5"
                    fill={pantsStyle.shadow}
                    stroke={pantsStyle.trim}
                    strokeWidth="0.9"
                  />
                )}
                <line
                  x1="77"
                  y1="120"
                  x2="76"
                  y2="156"
                  stroke={pantsStyle.trim}
                  strokeWidth="1.4"
                  opacity="0.75"
                />
                <rect
                  x="63"
                  y="153"
                  width="16"
                  height="4"
                  rx="1.5"
                  fill={pantsStyle.trim}
                  opacity="0.85"
                />
                <path
                  d="M 64 157 L 79 157 L 82 167 C 83 172 63 172 63 169 Z"
                  fill={pantsStyle.boot}
                  stroke="#fde047"
                  strokeWidth="0.9"
                />
              </g>
            </g>
          )}

        {/* 5. Neck & Shoulders Base */}
        <rect x="50" y="70" width="20" height="18" rx="6" fill={skin.shadow} />
        <path d="M 50 72 Q 60 80 70 72 L 70 84 L 50 84 Z" fill={skin.base} />

        {/* =================================================================
            6. OUTFIT / SHIRT / TOP & ARMS LAYER
           ================================================================= */}
        {effective.outfit === 'gardener_tunic' && (
          <g>
            <path
              d="M 25 119 Q 27 83 48 81 L 72 81 Q 93 83 95 119 Z"
              fill="#15803d"
            />
            <polygon points="48,81 60,97 72,81" fill="#dcfce7" />
            <path
              d="M 39 83 L 42 119 M 81 83 L 78 119"
              stroke="#78350f"
              strokeWidth="3.8"
            />
            <circle cx="60" cy="97" r="4.8" fill="#fbbf24" />
            <path
              d="M 58 97 Q 60 92 63 97"
              stroke="#15803d"
              strokeWidth="1.5"
              fill="none"
            />
          </g>
        )}

        {effective.outfit === 'traveler_cloak' && (
          <g>
            <path
              d="M 24 119 Q 26 82 48 80 L 72 80 Q 94 82 96 119 Z"
              fill="#0f766e"
            />
            <path
              d="M 32 82 Q 60 104 88 82 L 92 119 L 28 119 Z"
              fill="#115e59"
              stroke="#5eead4"
              strokeWidth="1.5"
            />
            <polygon points="60,88 65,95 60,102 55,95" fill="#fbbf24" />
          </g>
        )}

        {effective.outfit === 'casual_hoodie' && (
          <g>
            <path
              d="M 24 119 Q 26 82 48 80 L 72 80 Q 94 82 96 119 Z"
              fill="#16a34a"
              stroke="#86efac"
              strokeWidth="1.2"
            />
            {/* Hoodie Collar & Drawstrings */}
            <path
              d="M 44 80 Q 60 92 76 80"
              fill="#14532d"
              stroke="#dcfce7"
              strokeWidth="1.5"
            />
            <line
              x1="54"
              y1="86"
              x2="54"
              y2="101"
              stroke="#fef08a"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="66"
              y1="86"
              x2="66"
              y2="101"
              stroke="#fef047"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Front Pocket */}
            <path
              d="M 43 105 L 77 105 L 80 117 L 40 117 Z"
              fill="#15803d"
              stroke="#4ade80"
              strokeWidth="1"
            />
          </g>
        )}

        {effective.outfit === 'academy_robe' && (
          <g>
            <path
              d="M 24 119 Q 26 82 48 80 L 72 80 Q 94 82 96 119 Z"
              fill="#1e3a8a"
            />
            <path
              d="M 44 80 L 60 116 L 76 80"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3.8"
            />
            <polygon points="50,80 60,94 70,80" fill="#f8fafc" />
            <circle cx="60" cy="96" r="4" fill="#ef4444" />
          </g>
        )}

        {effective.outfit === 'emerald_guardian' && (
          <g>
            <path
              d="M 22 119 Q 24 80 48 78 L 72 78 Q 96 80 98 119 Z"
              fill="#065f46"
              stroke="#34d399"
              strokeWidth="2"
            />
            <ellipse
              cx="30"
              cy="91"
              rx="11"
              ry="6.5"
              fill="#10b981"
              stroke="#fde047"
              strokeWidth="1.8"
            />
            <ellipse
              cx="90"
              cy="91"
              rx="11"
              ry="6.5"
              fill="#10b981"
              stroke="#fde047"
              strokeWidth="1.8"
            />
            <polygon
              points="60,84 68,96 60,108 52,96"
              fill="#34d399"
              stroke="#fef08a"
              strokeWidth="1.5"
            />
          </g>
        )}

        {effective.outfit === 'golden_angel_vestment' && (
          <g>
            <path
              d="M 22 119 Q 24 80 48 78 L 72 78 Q 96 80 98 119 Z"
              fill="#fefce8"
              stroke="#fbbf24"
              strokeWidth="2.2"
            />
            <path
              d="M 42 78 L 60 118 L 78 78"
              fill="#f59e0b"
              opacity="0.85"
            />
            <circle
              cx="60"
              cy="92"
              r="5.8"
              fill="#38bdf8"
              stroke="#fff"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* Waist Belt & Hands in Full-Body Mode */}
        {isFull && (
          <g>
            <rect
              x="36"
              y="114"
              width="48"
              height="5.5"
              rx="2.5"
              fill={pantsStyle.belt}
            />
            <rect
              x="55"
              y="113"
              width="10"
              height="7.5"
              rx="2"
              fill="#fbbf24"
              stroke="#78350f"
              strokeWidth="0.9"
            />
            {/* Left & Right Hands */}
            <circle
              cx="27"
              cy="121"
              r="5.2"
              fill={skin.base}
              stroke={skin.shadow}
              strokeWidth="1"
            />
            <circle
              cx="93"
              cy="121"
              r="5.2"
              fill={skin.base}
              stroke={skin.shadow}
              strokeWidth="1"
            />
          </g>
        )}

        {/* 7. Ears & Head Shape */}
        <circle cx="34" cy="56" r="6" fill={skin.shadow} />
        <circle cx="86" cy="56" r="6" fill={skin.shadow} />
        <rect x="35" y="28" width="50" height="50" rx="24" fill={skin.base} />

        {/* 8. Facial Expression Layer */}
        {renderFacialFeatures()}

        {/* 9. Front Hair / Headscarf Layer */}
        {effective.hairStyle === 'silk_shawl' && (
          <g>
            <path
              d="M 35 42 Q 48 26 60 32 Q 74 26 85 42 Q 72 34 60 36 Q 48 34 35 42 Z"
              fill={hair.main}
            />
            <path
              d="M 30 56 Q 30 20 60 20 Q 90 20 90 56 Q 86 34 60 30 Q 34 34 30 56 Z"
              fill="#059669"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            <path
              d="M 32 54 Q 32 82 60 86 Q 88 82 88 54 L 84 68 Q 60 80 36 68 Z"
              fill="#047857"
            />
          </g>
        )}

        {(effective.hairStyle === 'classic_waves' ||
          effective.hairStyle === 'long_braids' ||
          effective.hairStyle === 'ponytail_breeze' ||
          effective.hairStyle === 'royal_crown_bun' ||
          effective.hairStyle === 'sage_long') && (
          <path
            d="M 33 48 Q 32 22 60 22 Q 88 22 87 48 Q 76 34 60 38 Q 44 34 33 48 Z"
            fill={hair.main}
          />
        )}

        {effective.hairStyle === 'curly_bush' && (
          <g fill={hair.main}>
            <circle cx="40" cy="34" r="10" />
            <circle cx="52" cy="28" r="11" />
            <circle cx="68" cy="28" r="11" />
            <circle cx="80" cy="34" r="10" />
            <circle cx="34" cy="44" r="8" />
            <circle cx="86" cy="44" r="8" />
          </g>
        )}

        {effective.hairStyle === 'modern_quiff' && (
          <path
            d="M 34 44 Q 34 20 64 18 Q 88 18 86 42 Q 72 30 50 36 Z"
            fill={hair.main}
          />
        )}

        {/* 10. Accessories & Held Items */}
        {effective.accessory === 'round_glasses' && (
          <g
            stroke="#fbbf24"
            strokeWidth="2.2"
            fill="#38bdf8"
            fillOpacity="0.18"
          >
            <circle cx="47" cy="52" r="7.5" />
            <circle cx="73" cy="52" r="7.5" />
            <line x1="54.5" y1="52" x2="65.5" y2="52" />
          </g>
        )}

        {effective.accessory === 'leaf_sprout' && (
          <g transform="translate(60, 19)">
            <path
              d="M 0 6 Q 0 -4 2 -8"
              stroke="#15803d"
              strokeWidth="2.2"
              fill="none"
            />
            <path d="M 2 -8 Q 12 -12 10 -2 Q 4 0 2 -8 Z" fill="#4ade80" />
            <path d="M 1 -5 Q -9 -10 -8 -1 Q -2 1 1 -5 Z" fill="#22c55e" />
          </g>
        )}

        {effective.accessory === 'straw_hat' && (
          <g>
            <ellipse
              cx="60"
              cy="26"
              rx="38"
              ry="8"
              fill="#fcd34d"
              stroke="#d97706"
              strokeWidth="2"
            />
            <path
              d="M 38 26 Q 42 10 60 10 Q 78 10 82 26 Z"
              fill="#fde68a"
              stroke="#d97706"
              strokeWidth="2"
            />
            <path
              d="M 39 24 Q 60 27 81 24"
              stroke="#10b981"
              strokeWidth="3.5"
              fill="none"
            />
          </g>
        )}

        {effective.accessory === 'flower_crown' && (
          <g>
            <path
              d="M 34 32 Q 60 24 86 32"
              stroke="#15803d"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="42" cy="30" r="4.5" fill="#f43f5e" />
            <circle cx="54" cy="28" r="5" fill="#fbbf24" />
            <circle cx="66" cy="28" r="5" fill="#ec4899" />
            <circle cx="78" cy="30" r="4.5" fill="#38bdf8" />
          </g>
        )}

        {effective.accessory === 'angel_halo' && (
          <ellipse
            cx="60"
            cy="12"
            rx="22"
            ry="5"
            fill="none"
            stroke="#fde047"
            strokeWidth="3.5"
          />
        )}

        {effective.accessory === 'wisdom_book' && (
          <g transform={isFull ? 'translate(88, 108)' : 'translate(86, 94)'}>
            <rect
              x="-12"
              y="-10"
              width="22"
              height="18"
              rx="2.5"
              fill="#b45309"
              stroke="#fef08a"
              strokeWidth="1.5"
            />
            <rect
              x="-9"
              y="-7"
              width="16"
              height="12"
              rx="1"
              fill="#fef9c3"
            />
            <line
              x1="-1"
              y1="-7"
              x2="-1"
              y2="5"
              stroke="#d97706"
              strokeWidth="1.5"
            />
            <circle cx="4" cy="-1" r="2.2" fill="#10b981" />
          </g>
        )}

        {effective.accessory === 'starlight_lantern' && (
          <g transform={isFull ? 'translate(28, 122)' : 'translate(28, 96)'}>
            <line
              x1="0"
              y1="-8"
              x2="0"
              y2="-2"
              stroke="#fde047"
              strokeWidth="2"
            />
            <ellipse
              cx="0"
              cy="6"
              rx="8.5"
              ry="10"
              fill="#fde047"
              stroke="#b45309"
              strokeWidth="1.6"
            />
            <circle cx="0" cy="6" r="4.5" fill="#ffffff" opacity="0.9" />
          </g>
        )}
        </g>
      </g>

      {/* Outer Frame Border */}
      {showBackdrop &&
        (isFull ? (
          <rect
            x="2"
            y="2"
            width="116"
            height="181"
            rx="22"
            fill="none"
            stroke={bg.ring}
            strokeWidth="3"
          />
        ) : (
          <circle
            cx="60"
            cy="60"
            r="58"
            fill="none"
            stroke={bg.ring}
            strokeWidth="3"
          />
        ))}
    </svg>
  );
}, (prev, next) =>
  prev.gender === next.gender &&
  prev.size === next.size &&
  prev.className === next.className &&
  prev.showBackdrop === next.showBackdrop &&
  prev.variant === next.variant &&
  prev.isWalking === next.isWalking &&
  prev.config?.hairStyle === next.config?.hairStyle &&
  prev.config?.hairColor === next.config?.hairColor &&
  prev.config?.skinTone === next.config?.skinTone &&
  prev.config?.faceExpression === next.config?.faceExpression &&
  prev.config?.outfit === next.config?.outfit &&
  prev.config?.pants === next.config?.pants &&
  prev.config?.accessory === next.config?.accessory &&
  prev.config?.bgAura === next.config?.bgAura
);
