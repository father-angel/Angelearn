/**
 * AngelLearn - Persistence & State Manager
 * Handles local offline cache + ready for cloud synchronization
 */

import {
  UserProfile,
  TreeData,
  GardenDecoration,
  GratitudeEntry,
  VisitorGarden,
  CourseData,
  QuestItem,
  MailItem,
  InventoryItem,
  ExerciseCompletionReport,
} from '../types/game';
import {
  isTreeWithered,
  formatLocalDateString,
  getYesterdayLocalDateString,
  getCalendarDaysDifference,
} from '../game/rules';
import {
  RESEARCH_STORAGE_KEYS,
  createBaselineResearchProfile,
  createBaselineResearchTrees,
  getActiveResearchSession,
  isResearchModeActive,
} from '../research';

const STORAGE_KEYS = {
  PROFILE: 'angellearn_profile_v1',
  TUTORIAL_DONE: 'angellearn_tutorial_done_v1',
  TREES: 'angellearn_trees_v1',
  DECORATIONS: 'angellearn_decorations_v1',
  GRATITUDE: 'angellearn_gratitude_v1',
  QUESTS: 'angellearn_quests_v1',
  MAILS: 'angellearn_mails_v1',
  EXERCISE_LOGS: 'angellearn_exercise_logs_v1',
};

export const INITIAL_TREES: TreeData[] = [
  {
    id: 'speed_reading',
    name: 'درخت تندخوانی',
    description: 'تمرین واژه‌خوانی و گفت‌وگو با فرشته انجلرن برای گسترش دید و ذهن',
    cost: 0,
    unlocked: true,
    wateredDaysCount: 1,
    lastWateredDate: undefined,
    daysWithoutWater: 0,
    isWithered: false,
    position: { x: 0, y: 1 },
  },
  {
    id: 'gratitude',
    name: 'درخت شکرگزاری',
    description: 'نوشتن سپاسگزاری روزانه و ارسال آن با بال‌های گنجشک آرامش',
    cost: 0,
    unlocked: true,
    wateredDaysCount: 1,
    lastWateredDate: undefined,
    daysWithoutWater: 0,
    isWithered: false,
    position: { x: 4, y: 1 },
  },
  {
    id: 'deep_breathing',
    name: 'درخت تنفس عمیق',
    description: 'مربع نورانی هماهنگ ۵ ثانیه دم و ۵ ثانیه بازدم همراه با صوت آرامش‌بخش',
    cost: 5,
    unlocked: false,
    wateredDaysCount: 0,
    lastWateredDate: undefined,
    daysWithoutWater: 0,
    isWithered: false,
    position: { x: 2, y: 2 },
  },
  {
    id: 'bina_balls',
    name: 'درخت بینا',
    description: 'بازی ۱۰ توپ؛ چالش ردیابی دیداری و تمرکز حرکتی برای هوشیاری ذهن',
    cost: 5,
    unlocked: false,
    wateredDaysCount: 0,
    lastWateredDate: undefined,
    daysWithoutWater: 0,
    isWithered: false,
    position: { x: 1, y: 4 },
  },
  {
    id: 'memory_cards',
    name: 'درخت حافظه',
    description: 'کارت‌های کهن؛ تقویت حافظه کوتاه‌مدت با یافتن نشانه‌های یکسان طبیعت',
    cost: 5,
    unlocked: false,
    wateredDaysCount: 0,
    lastWateredDate: undefined,
    daysWithoutWater: 0,
    isWithered: false,
    position: { x: 3, y: 4 },
  },
  {
    id: 'brain_math',
    name: 'درخت مغز',
    description: 'چالش ریاضی ۱۰ سطحی؛ تقویت سرعت محاسبات جمع و تفریق در ۱۰ پرسش زمان‌دار',
    cost: 0,
    unlocked: true,
    wateredDaysCount: 1,
    lastWateredDate: undefined,
    daysWithoutWater: 0,
    isWithered: false,
    position: { x: 4, y: 3 },
  },
  {
    id: 'poetry',
    name: 'درخت شعر',
    description: 'گلستان ادب پارسی؛ هم‌نشینی با ۱۰ شاعر نامدار ایرانی و خوانش ابیات ناب',
    cost: 0,
    unlocked: true,
    wateredDaysCount: 1,
    lastWateredDate: undefined,
    daysWithoutWater: 0,
    isWithered: false,
    position: { x: 0, y: 3 },
  },
];

export const AVAILABLE_DECORATIONS: Omit<GardenDecoration, 'id' | 'x' | 'y'>[] = [
  { type: 'fence', name: 'حصار چوبی جنگلی', cost: 3, icon: '🪵' },
  { type: 'bench', name: 'نیمکت چوبی خلوت', cost: 4, icon: '🪑' },
  { type: 'lantern', name: 'فانوس شب‌تاب باغ', cost: 5, icon: '🏮' },
  { type: 'pot', name: 'گلدان سفالی عتیق', cost: 2, icon: '🏺' },
  { type: 'flower', name: 'باغچه گل‌های بنفش', cost: 3, icon: '🌸' },
  { type: 'path', name: 'سنگفرش کوهستانی', cost: 2, icon: '🪨' },
  { type: 'fountain', name: 'فواره بلورین آب', cost: 8, icon: '⛲' },
];

export const SAMPLE_VISITOR_GARDENS: VisitorGarden[] = [
  {
    id: 'vis_1',
    ownerName: 'رها محمدی',
    gender: 'girl',
    avatarConfig: {
      skinTone: 'warm_ivory',
      hairStyle: 'long_braids',
      hairColor: 'chestnut',
      faceExpression: 'happy_smile',
      outfit: 'gardener_tunic',
      pants: 'forest_trousers',
      accessory: 'leaf_sprout',
      bgAura: 'emerald_mist',
    },
    bio: 'هر روز یک سانتیمتر بهتر از دیروز ✨',
    level: 'باغبان شکوفا',
    coins: 35,
    streakDays: 14,
    trees: [
      { ...INITIAL_TREES[0], unlocked: true, wateredDaysCount: 16, isWithered: false },
      { ...INITIAL_TREES[1], unlocked: true, wateredDaysCount: 14, isWithered: false },
      { ...INITIAL_TREES[2], unlocked: true, wateredDaysCount: 9, isWithered: false },
    ],
    decorations: [
      { id: 'd1', type: 'lantern', name: 'فانوس شب‌تاب باغ', cost: 5, icon: '🏮', x: 0, y: 1 },
      { id: 'd2', type: 'bench', name: 'نیمکت چوبی خلوت', cost: 4, icon: '🪑', x: 4, y: 2 },
      { id: 'd3', type: 'fountain', name: 'فواره بلورین آب', cost: 8, icon: '⛲', x: 2, y: 0 },
    ],
  },
  {
    id: 'vis_2',
    ownerName: 'آریا کیانی',
    gender: 'boy',
    avatarConfig: {
      skinTone: 'warm_ivory',
      hairStyle: 'modern_quiff',
      hairColor: 'chestnut',
      faceExpression: 'wise_thinker',
      outfit: 'academy_robe',
      pants: 'scholar_slacks',
      accessory: 'round_glasses',
      bgAura: 'starry_night',
    },
    bio: 'تمرکز روی تندخوانی و نفس‌های آگاهانه',
    level: 'استاد تندخوانی',
    coins: 60,
    streakDays: 22,
    trees: [
      { ...INITIAL_TREES[0], unlocked: true, wateredDaysCount: 22, isWithered: false },
      { ...INITIAL_TREES[1], unlocked: true, wateredDaysCount: 20, isWithered: false },
      { ...INITIAL_TREES[2], unlocked: true, wateredDaysCount: 18, isWithered: false },
      { ...INITIAL_TREES[3], unlocked: true, wateredDaysCount: 12, isWithered: false },
      { ...INITIAL_TREES[4], unlocked: true, wateredDaysCount: 8, isWithered: false },
    ],
    decorations: [
      { id: 'd4', type: 'flower', name: 'باغچه گل‌های بنفش', cost: 3, icon: '🌸', x: 1, y: 0 },
      { id: 'd5', type: 'lantern', name: 'فانوس شب‌تاب باغ', cost: 5, icon: '🏮', x: 3, y: 0 },
      { id: 'd6', type: 'fence', name: 'حصار چوبی جنگلی', cost: 3, icon: '🪵', x: 0, y: 4 },
    ],
  },
];

export const CITY_COURSES: CourseData[] = [
  {
    id: 'c_school_1',
    building: 'school',
    title: 'اصول یادگیری کوانتومی و نقشه ذهنی',
    subtitle: 'پایه‌های یادگیری فوق سریع',
    description: 'در این دوره با تکنیک‌های کدگذاری اطلاعات در حافظه بلندمدت و طراحی ساختارهای ذهنی آشنا می‌شوید.',
    modulesCount: 6,
    estimatedHours: '۴ ساعت',
    status: 'available',
    assessmentType: 'multiple_choice',
    passScore: 80,
    badgeName: 'مدال ذهن پویا',
  },
  {
    id: 'c_school_2',
    building: 'school',
    title: 'تندخوانی پیشرفته و تمرکز لیزری',
    subtitle: 'افزایش سرعت درک مطلب و حذف حواس‌پرتی',
    description: 'آموزش گام‌به‌گام گسترش دید محیطی، هدایت چشمی و مطالعه عمیق متون علمی با تمرکز صددرصدی.',
    modulesCount: 5,
    estimatedHours: '۳.۵ ساعت',
    status: 'available',
    assessmentType: 'multiple_choice',
    passScore: 80,
    badgeName: 'مدال چشم عقاب',
  },
  {
    id: 'c_school_3',
    building: 'school',
    title: 'منطق ریاضی، حل مسئله و تفکر تحلیلی',
    subtitle: 'ساختمان مهارت‌های استدلال و تصمیم‌گیری',
    description: 'تقویت استدلال استقرایی و قیاسی، تجزیه مسائل پیچیده به اجزای ساده و مدل‌سازی ذهنی.',
    modulesCount: 8,
    estimatedHours: '۵ ساعت',
    status: 'available',
    assessmentType: 'multiple_choice',
    passScore: 80,
    badgeName: 'مدال معمار منطق',
  },
  {
    id: 'c_school_4',
    building: 'school',
    title: 'فن بیان، نگارش خلاق و ارتباط مؤثر',
    subtitle: 'ساختمان مهارت‌های کلامی و انتقال اندیشه',
    description: 'آشنایی با ساختار روایت‌گری، اقناع مخاطب، خلاصه‌نویسی علمی و گفتگوهای سازنده.',
    modulesCount: 5,
    estimatedHours: '۳ ساعت',
    status: 'available',
    assessmentType: 'multiple_choice',
    passScore: 75,
    badgeName: 'مدال سخنور طلایی',
  },
  {
    id: 'c_uni_1',
    building: 'university',
    title: 'فلسفه ذهن، تمرکز عمیق و جریان فکری (Flow)',
    subtitle: 'دانشگاه تخصصی علوم شناختی',
    description: 'بررسی عصب‌پژوهی تمرکز بدون وقفه در عصر حواس‌پرتی‌های دیجیتال همراه با آزمون‌های جامع تحلیلی.',
    modulesCount: 10,
    estimatedHours: '۸ ساعت',
    status: 'available',
    assessmentType: 'practical',
    passScore: 85,
    badgeName: 'نشان دانشمند تمرکز',
  },
  {
    id: 'c_workshop_1',
    building: 'workshop',
    title: 'کارگاه تولید عادت‌های اتمی و ردیابی فردی',
    subtitle: 'مهندسی رفتار و روتین پایدار',
    description: 'تمرین‌های عملی برای طراحی حلقه‌های عادت پایدار، پایش سیستماتیک و افزایش ۱٪ بازدهی هر روز.',
    modulesCount: 4,
    estimatedHours: '۳ ساعت',
    status: 'available',
    assessmentType: 'multiple_choice',
    passScore: 75,
    badgeName: 'مدال معمار اراده',
  },
  {
    id: 'c_workshop_2',
    building: 'workshop',
    title: 'کارگاه مدیریت زمان، انرژی و برنامه‌ریزی عمیق',
    subtitle: 'معماری روزانه و بلوک‌بندی زمان',
    description: 'طراحی تقویم انرژی، تکنیک‌های پومودوروی پیشرفته و اولویت‌بندی کارهای استراتژیک با ماتریس آیزنهاور.',
    modulesCount: 5,
    estimatedHours: '۴ ساعت',
    status: 'available',
    assessmentType: 'multiple_choice',
    passScore: 75,
    badgeName: 'مدال استاد زمان',
  },
  {
    id: 'c_workshop_3',
    building: 'workshop',
    title: 'کارگاه تفکر طراحی و ایده‌پردازی عملی',
    subtitle: 'حل خلاقانه چالش‌های واقعی',
    description: 'کارگاه پروژه‌محور از مرحله همدلی و تعریف مسئله تا ساخت پروتوتایپ سریع و آزمون راه‌حل‌ها.',
    modulesCount: 6,
    estimatedHours: '۴.۵ ساعت',
    status: 'available',
    assessmentType: 'practical',
    passScore: 80,
    badgeName: 'مدال خالق نوآوری',
  },
];

export const SAMPLE_QUESTS: QuestItem[] = [
  {
    id: 'q_breath',
    title: 'تنفس عمیق با فرکانس ۴۳۲Hz',
    target: 1,
    current: 0,
    rewardCoins: 10,
    rewardGems: 0,
    completed: false,
    claimed: false,
    category: 'daily',
  },
  {
    id: 'q_speed',
    title: 'مطالعه یک بخش از کتابخانه تندخوانی',
    target: 1,
    current: 1,
    rewardCoins: 10,
    rewardGems: 0,
    completed: true,
    claimed: false,
    category: 'daily',
  },
  {
    id: 'q_gratitude',
    title: 'ثبت سپاسگزاری در دفترچه بال‌های آرامش',
    target: 1,
    current: 0,
    rewardCoins: 10,
    rewardGems: 0,
    completed: false,
    claimed: false,
    category: 'daily',
  },
  {
    id: 'q_water_3',
    title: 'آبیاری منظم ۳ درخت در باغستان',
    target: 3,
    current: 2,
    rewardCoins: 15,
    rewardGems: 0,
    completed: false,
    claimed: false,
    category: 'main',
  },
  {
    id: 'q_headquarters',
    title: 'ارتقای عمارت باغبان به سطح ۲۱',
    target: 21,
    current: 20,
    rewardCoins: 50,
    rewardGems: 0,
    completed: false,
    claimed: false,
    category: 'growth',
  },
];

export const SAMPLE_MAILS: MailItem[] = [
  {
    id: 'm_1',
    title: 'پیام فرشته دانا: خوش‌آمد به جهان مجمع‌الجزایر انجلرن',
    sender: 'فرشته خرد',
    date: 'امروز',
    content: 'همسفر گرامی، پایگاه سبز و عمارت باشکوه شما در مختصات (۱۷۶, ۱۷۱) شکوفا شد. هر روز با آبیاری درختان و تقویت ذهن، توان خود را افزایش دهید.',
    rewardCoins: 20,
    rewardGems: 0,
    isRead: false,
    isClaimed: false,
  },
  {
    id: 'm_2',
    title: 'پاداش وفاداری و استمرار حضور پیوسته',
    sender: 'انجمن باغبانان',
    date: 'دیروز',
    content: 'به پاس استمرار حضور و همت شما در رشد روزانه یک سانتیمتر، این سکه‌های طلا تقدیم شما باد.',
    rewardCoins: 10,
    rewardGems: 0,
    isRead: true,
    isClaimed: true,
  },
];

export const SAMPLE_INVENTORY: InventoryItem[] = [
  {
    id: 'inv_water_can',
    name: 'کوزه آب مقدس چشمه حیات',
    icon: '🏺',
    count: 3,
    description: 'آبیاری فوری یک درخت بدون انتظار زمان خنک‌سازی',
    category: 'water',
  },
  {
    id: 'inv_dew_vial',
    name: 'شیشه شبنم بلورین',
    icon: '🧪',
    count: 14,
    description: 'شبنم تغلیظ شده برای سرعت بخشیدن به رشد برگ‌ها',
    category: 'booster',
  },
  {
    id: 'inv_seed_pack',
    name: 'بذر نایاب درخت آرامش',
    icon: '🌰',
    count: 2,
    description: 'امکان کاشت نهال در قطعه‌های آزاد باغ',
    category: 'seed',
  },
  {
    id: 'inv_scroll',
    name: 'تومار تکنیک‌های کوانتومی تندخوانی',
    icon: '📜',
    count: 5,
    description: 'افزایش ماندگاری کلمات در حافظه تصویری',
    category: 'scroll',
  },
];

export function getTodayDateString(now: Date = new Date()): string {
  return formatLocalDateString(now);
}

export { getYesterdayLocalDateString, getCalendarDaysDifference };

export function loadProfile(): UserProfile {
  const researchSession = getActiveResearchSession();
  if (researchSession) {
    try {
      const raw = localStorage.getItem(RESEARCH_STORAGE_KEYS.PROFILE);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...parsed,
          id: researchSession.participantId,
          gems: parsed.gems ?? 0,
          vipLevel: parsed.vipLevel ?? 0,
        };
      }
    } catch {
      // fallback to clean baseline
    }
    const baseline = createBaselineResearchProfile(researchSession.participantId);
    saveProfile(baseline);
    return baseline;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure new War Master strategy attributes are populated
      return {
        ...parsed,
        gems: parsed.gems ?? 350,
        energy: parsed.energy ?? 94,
        maxEnergy: parsed.maxEnergy ?? 100,
        mindPower: parsed.mindPower ?? 3260000,
        headquartersLevel: parsed.headquartersLevel ?? 20,
        vipLevel: parsed.vipLevel ?? 10,
        coords: parsed.coords ?? { x: 176, y: 171 },
      };
    }
  } catch {
    // fallback
  }

  const initialProfile: UserProfile = {
    id: 'guest_' + Math.random().toString(36).substring(2, 9),
    name: 'همسفر نور',
    gender: 'girl',
    age: 22,
    bio: 'هر روز یک سانتیمتر بهتر شو...',
    coins: 45,
    gems: 350,
    energy: 94,
    maxEnergy: 100,
    mindPower: 3260000,
    headquartersLevel: 20,
    vipLevel: 10,
    coords: { x: 176, y: 171 },
    isGuest: true,
    googleConnected: false,
    createdAt: getTodayDateString(),
    lastActiveDate: getTodayDateString(),
    streakDays: 1,
    privacy: {
      showAge: false,
      showGratitude: false,
      showStats: true,
    },
  };
  saveProfile(initialProfile);
  return initialProfile;
}

export function saveProfile(profile: UserProfile): void {
  try {
    const key = isResearchModeActive()
      ? RESEARCH_STORAGE_KEYS.PROFILE
      : STORAGE_KEYS.PROFILE;
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save profile', err);
  }
}

export function hasCompletedOnboarding(): boolean {
  if (isResearchModeActive()) return true;
  try {
    return localStorage.getItem(STORAGE_KEYS.TUTORIAL_DONE) === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingCompleted(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TUTORIAL_DONE, 'true');
  } catch {
    // ignore storage errors
  }
}

export function loadTrees(): TreeData[] {
  const inResearch = isResearchModeActive();
  const storageKey = inResearch ? RESEARCH_STORAGE_KEYS.TREES : STORAGE_KEYS.TREES;
  const defaultTrees = inResearch
    ? createBaselineResearchTrees(INITIAL_TREES)
    : INITIAL_TREES;

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed: TreeData[] = JSON.parse(raw);
      const today = getTodayDateString();
      const nowMs = Date.now();
      // Ensure all trees exist in state and upgrade cramped positions
      const merged = defaultTrees.map((initTree) => {
        const found = parsed.find((t) => t.id === initTree.id);
        if (found) {
          let normalized = found;
          if (
            (found.id === 'speed_reading' && found.position.x === 1 && found.position.y === 1) ||
            (found.id === 'gratitude' && found.position.x === 3 && found.position.y === 1) ||
            (found.id === 'bina_balls' && found.position.x === 1 && found.position.y === 3) ||
            (found.id === 'memory_cards' && found.position.x === 3 && found.position.y === 3)
          ) {
            normalized = { ...normalized, position: initTree.position };
          }
          if (
            normalized.unlocked &&
            normalized.lastWateredDate === today &&
            !normalized.isWithered &&
            typeof normalized.lastWateredAtMs !== 'number'
          ) {
            normalized = {
              ...normalized,
              lastWateredAtMs: nowMs,
              lastCoinTickAtMs: nowMs,
            };
          }
          return normalized;
        }
        return initTree;
      });
      const checked = checkWithering(merged);
      saveTrees(checked);
      return checked;
    }
  } catch {
    // fallback
  }
  saveTrees(defaultTrees);
  return defaultTrees;
}

export function saveTrees(trees: TreeData[]): void {
  try {
    const key = isResearchModeActive()
      ? RESEARCH_STORAGE_KEYS.TREES
      : STORAGE_KEYS.TREES;
    localStorage.setItem(key, JSON.stringify(trees));
  } catch (err) {
    console.error('Failed to save trees', err);
  }
}

function checkWithering(trees: TreeData[]): TreeData[] {
  const today = getTodayDateString();
  return trees.map((tree) => {
    if (!tree.unlocked) return tree;
    if (!tree.lastWateredDate) return tree;

    const diffDays = getCalendarDaysDifference(tree.lastWateredDate, today);

    const daysWithoutWater = Math.max(0, diffDays);
    const withered = isTreeWithered(daysWithoutWater);

    return {
      ...tree,
      daysWithoutWater,
      isWithered: withered,
    };
  });
}

export function loadDecorations(): GardenDecoration[] {
  const inResearch = isResearchModeActive();
  const key = inResearch
    ? RESEARCH_STORAGE_KEYS.DECORATIONS
    : STORAGE_KEYS.DECORATIONS;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  if (inResearch) {
    saveDecorations([]);
    return [];
  }
  const defaults: GardenDecoration[] = [
    { id: 'init_f', type: 'fence', name: 'حصار چوبی جنگلی', cost: 3, icon: '🪵', x: 0, y: 0 },
    { id: 'init_l', type: 'lantern', name: 'فانوس شب‌تاب باغ', cost: 5, icon: '🏮', x: 4, y: 0 },
  ];
  saveDecorations(defaults);
  return defaults;
}

export function saveDecorations(decorations: GardenDecoration[]): void {
  try {
    const key = isResearchModeActive()
      ? RESEARCH_STORAGE_KEYS.DECORATIONS
      : STORAGE_KEYS.DECORATIONS;
    localStorage.setItem(key, JSON.stringify(decorations));
  } catch (err) {
    console.error('Failed to save decorations', err);
  }
}

export function loadGratitudeNotes(): GratitudeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GRATITUDE);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  const defaultNote: GratitudeEntry = {
    id: 'note_1',
    text: 'شکرگزار این لحظه تازه و فرصت رشد یک سانتیمتری امروز هستم.',
    date: getTodayDateString(),
    timestamp: Date.now(),
  };
  saveGratitudeNotes([defaultNote]);
  return [defaultNote];
}

export function saveGratitudeNotes(notes: GratitudeEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GRATITUDE, JSON.stringify(notes));
  } catch (err) {
    console.error('Failed to save gratitude', err);
  }
}

export function loadQuests(): QuestItem[] {
  const inResearch = isResearchModeActive();
  const key = inResearch ? RESEARCH_STORAGE_KEYS.QUESTS : STORAGE_KEYS.QUESTS;
  const baseQuests = inResearch
    ? SAMPLE_QUESTS.map((q) => ({
        ...q,
        current: 0,
        completed: false,
        claimed: false,
        rewardCoins: 0,
        rewardGems: 0,
      }))
    : SAMPLE_QUESTS;

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return baseQuests.map((sample) => {
          const saved = parsed.find((q: QuestItem) => q.id === sample.id);
          return saved
            ? {
                ...sample,
                current: typeof saved.current === 'number' ? saved.current : sample.current,
                completed: Boolean(saved.completed),
                claimed: Boolean(saved.claimed),
              }
            : sample;
        });
      }
    }
  } catch {
    // fallback
  }
  saveQuests(baseQuests);
  return baseQuests;
}

export function saveQuests(quests: QuestItem[]): void {
  try {
    const key = isResearchModeActive()
      ? RESEARCH_STORAGE_KEYS.QUESTS
      : STORAGE_KEYS.QUESTS;
    localStorage.setItem(key, JSON.stringify(quests));
  } catch (err) {
    console.error('Failed to save quests', err);
  }
}

export function loadMails(): MailItem[] {
  const inResearch = isResearchModeActive();
  const key = inResearch ? RESEARCH_STORAGE_KEYS.MAILS : STORAGE_KEYS.MAILS;
  const baseMails = inResearch
    ? SAMPLE_MAILS.map((m) => ({
        ...m,
        isRead: true,
        isClaimed: true,
        rewardCoins: 0,
        rewardGems: 0,
      }))
    : SAMPLE_MAILS;

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return baseMails.map((sample) => {
          const saved = parsed.find((m: MailItem) => m.id === sample.id);
          return saved
            ? {
                ...sample,
                isRead: Boolean(saved.isRead),
                isClaimed: Boolean(saved.isClaimed),
              }
            : sample;
        });
      }
    }
  } catch {
    // fallback
  }
  saveMails(baseMails);
  return baseMails;
}

export function saveMails(mails: MailItem[]): void {
  try {
    const key = isResearchModeActive()
      ? RESEARCH_STORAGE_KEYS.MAILS
      : STORAGE_KEYS.MAILS;
    localStorage.setItem(key, JSON.stringify(mails));
  } catch (err) {
    console.error('Failed to save mails', err);
  }
}

export function loadExerciseLogs(): ExerciseCompletionReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXERCISE_LOGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

export function saveExerciseLog(report: ExerciseCompletionReport): void {
  try {
    const existing = loadExerciseLogs();
    const updated = [report, ...existing].slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.EXERCISE_LOGS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save exercise log', err);
  }
}
