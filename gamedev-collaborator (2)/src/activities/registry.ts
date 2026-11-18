/**
 * AngelLearn Unified Activity Registry
 * Stage 3 & Stage 4: Unified Activity Registry across all 3 official categories
 *
 * Categories:
 * - 'learning': فعالیت‌های یادگیری و تمرین دانش یا مهارت
 * - 'personal_development': فعالیت‌های رشد فردی
 * - 'recreational': فعالیت‌های صرفاً سرگرمی‌محور
 */

import { TreeId } from '../types/game';
import { GameTemplateType } from '../university/types';
import { ActivityCategory, ActivityDefinition } from './types';

export const OFFICIAL_ACTIVITY_CATEGORIES: readonly ActivityCategory[] = [
  'learning',
  'personal_development',
  'recreational',
] as const;

export const INITIAL_ACTIVITY_DEFINITIONS: ActivityDefinition[] = [
  // =========================================================================
  // 1. LEARNING ACTIVITIES («فعالیت‌های یادگیری و تمرین دانش یا مهارت»)
  // =========================================================================
  {
    activityId: 'uni_read_and_answer',
    category: 'learning',
    title: 'مطالعه و آزمون دانشگاهی (Read & Answer)',
    contentId: 'content_npd_l1_read_1',
    completionRule: {
      minDurationSeconds: 1,
      minScorePercent: 80,
      requiresAssessmentPass: true,
      canProveLearning: true,
      descriptionPersian:
        'مطالعه متن علمی و کسب حداقل ۸۰٪ نمره در پرسش‌های چهارگزینه‌ای مستند به منبع درسی.',
    },
    assessmentType: 'objective_quiz',
    repeatability: 'one_time_mastery_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 10,
      demoPracticePoints: 5,
      requiresVerifiedOutcome: true,
    },
    interpretationNotePersian:
      'در صورت استفاده از محتوای بررسی‌شده پژوهشی و کسب حدنصاب ۸۰٪، به عنوان «اثبات یادگیری» (proven_learning) ثبت می‌شود؛ در محتوای آزمایشی (Demo) صرفاً «اتمام معتبر فعالیت» تمرین آزمایشگاهی است.',
  },
  {
    activityId: 'uni_fill_in_blank',
    category: 'learning',
    title: 'جای خالی چهارگزینه‌ای دانشگاهی',
    contentId: 'content_npd_l1_blank_1',
    completionRule: {
      minDurationSeconds: 1,
      minScorePercent: 80,
      requiresAssessmentPass: true,
      canProveLearning: true,
      descriptionPersian: 'تکمیل جملات علمی و کسب حداقل ۸۰٪ نمره صحیح.',
    },
    assessmentType: 'objective_quiz',
    repeatability: 'one_time_mastery_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 10,
      demoPracticePoints: 5,
      requiresVerifiedOutcome: true,
    },
    interpretationNotePersian:
      'ارزیابی عینی درک مفاهیم تخصصی بر پایه منبع درسی بررسی‌شده.',
  },
  {
    activityId: 'uni_match_concepts',
    category: 'learning',
    title: 'اتصال مفاهیم دانشگاهی',
    contentId: 'content_npd_l1_match_1',
    completionRule: {
      minDurationSeconds: 1,
      minScorePercent: 80,
      requiresAssessmentPass: true,
      canProveLearning: true,
      descriptionPersian: 'اتصال صحیح اصطلاحات علمی به تعاریف مرجع با حداقل دقت ۸۰٪.',
    },
    assessmentType: 'objective_quiz',
    repeatability: 'one_time_mastery_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 10,
      demoPracticePoints: 5,
      requiresVerifiedOutcome: true,
    },
    interpretationNotePersian:
      'سنجش تسلط مفهومی بر ارتباط میان اصطلاحات و تعاریف علمی.',
  },
  {
    activityId: 'uni_order_process',
    category: 'learning',
    title: 'مرتب‌سازی مراحل فرآیند دانشگاهی',
    contentId: 'content_npd_l1_order_1',
    completionRule: {
      minDurationSeconds: 1,
      minScorePercent: 80,
      requiresAssessmentPass: true,
      canProveLearning: true,
      descriptionPersian: 'چینش صحیح مراحل فرآیند علمی با حداقل دقت ۸۰٪.',
    },
    assessmentType: 'objective_quiz',
    repeatability: 'one_time_mastery_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 10,
      demoPracticePoints: 5,
      requiresVerifiedOutcome: true,
    },
    interpretationNotePersian:
      'سنجش درک توالی منطقی و فرآیندی در محتوای بررسی‌شده دانشگاهی.',
  },
  {
    activityId: 'uni_speed_reading',
    category: 'learning',
    title: 'تندخوانی و درک مطلب دانشگاهی',
    contentId: 'content_npd_l1_speed_1',
    completionRule: {
      minDurationSeconds: 1,
      minScorePercent: 80,
      requiresAssessmentPass: true,
      canProveLearning: true,
      descriptionPersian: 'تکمیل تندخوانی متن علمی و پاسخ صحیح به پرسش‌های درک مطلب (حداقل ۸۰٪).',
    },
    assessmentType: 'objective_quiz',
    repeatability: 'one_time_mastery_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 10,
      demoPracticePoints: 5,
      requiresVerifiedOutcome: true,
    },
    interpretationNotePersian:
      'سنجش هم‌زمان سرعت مطالعه و درک مطلب عینی بر اساس منبع درسی.',
  },
  {
    activityId: 'uni_scientific_memory',
    category: 'learning',
    title: 'حافظه علمی دانشگاهی',
    contentId: 'content_npd_l1_memory_1',
    completionRule: {
      minDurationSeconds: 1,
      minScorePercent: 80,
      requiresAssessmentPass: true,
      canProveLearning: true,
      descriptionPersian: 'جفت‌سازی صحیح کارت‌های مفهوم و تعریف علمی با حداقل امتیاز ۸۰٪.',
    },
    assessmentType: 'objective_quiz',
    repeatability: 'one_time_mastery_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 10,
      demoPracticePoints: 5,
      requiresVerifiedOutcome: true,
    },
    interpretationNotePersian:
      'تقویت و سنجش یادآوری مفاهیم علمی و تعاریف متناظر.',
  },
  {
    activityId: 'garden_speed_reading',
    category: 'learning',
    title: 'تمرین تندخوانی و درک مطلب (درخت تندخوانی)',
    contentId: 'garden_speed_reading_daily_v1',
    completionRule: {
      minDurationSeconds: 1,
      minScorePercent: 100,
      requiresAssessmentPass: true,
      canProveLearning: false,
      descriptionPersian:
        'خواندن کامل متن روزانه و پاسخ صحیح به پرسش چهارگزینه‌ای درک مطلب.',
    },
    assessmentType: 'skill_drill',
    repeatability: 'daily_reward_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 5,
      demoPracticePoints: 0,
      requiresVerifiedOutcome: true,
      linkedTreeId: 'speed_reading',
    },
    interpretationNotePersian:
      'تمرین مهارتی تندخوانی همراه با پرسش درک مطلب؛ اتمام معتبر فعالیت مهارتی محسوب می‌شود.',
  },
  {
    activityId: 'garden_brain_math',
    category: 'learning',
    title: 'چالش محاسبات ذهنی (درخت مغز)',
    contentId: 'garden_brain_math_10_v1',
    completionRule: {
      minDurationSeconds: 1,
      minScorePercent: 70,
      requiresAssessmentPass: true,
      canProveLearning: false,
      descriptionPersian: 'پاسخ‌گویی به ۱۰ پرسش جمع و تفریق با حداقل دقت ۷۰٪.',
    },
    assessmentType: 'skill_drill',
    repeatability: 'daily_reward_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 5,
      demoPracticePoints: 0,
      requiresVerifiedOutcome: true,
      linkedTreeId: 'brain_math',
    },
    interpretationNotePersian:
      'تمرین مهارتی محاسبات ذهنی با سنجش دقت و زمان پاسخ‌گویی.',
  },

  // =========================================================================
  // 2. PERSONAL DEVELOPMENT ACTIVITIES («فعالیت‌های رشد فردی»)
  // =========================================================================
  {
    activityId: 'garden_gratitude',
    category: 'personal_development',
    title: 'تمرین شکرگزاری روزانه (درخت شکرگزاری)',
    contentId: 'habit_gratitude_daily_v1',
    completionRule: {
      minDurationSeconds: 1,
      minScorePercent: null,
      requiresAssessmentPass: false,
      canProveLearning: false,
      descriptionPersian:
        'ثبت یک یادداشت شکرگزاری شخصی و ارسال آن با گنجشک (صرفاً ثبت انجام فعالیت رشد فردی بدون نمره‌دهی علمی).',
    },
    assessmentType: 'self_expression_non_assessed',
    repeatability: 'daily_reward_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 5,
      demoPracticePoints: 0,
      requiresVerifiedOutcome: false,
      linkedTreeId: 'gratitude',
    },
    interpretationNotePersian:
      'این فعالیت صرفاً «انجام فعالیت» (activity_performed) در دسته رشد فردی است و نباید به صورت خودکار به عنوان بهبود سلامت روان یا یادگیری اثبات‌شده گزارش شود. متن خصوصی کاربر هرگز در لاگ پژوهشی ذخیره نمی‌شود.',
  },
  {
    activityId: 'garden_deep_breathing',
    category: 'personal_development',
    title: 'تمرین تنفس عمیق (درخت تنفس عمیق)',
    contentId: 'habit_deep_breathing_v1',
    completionRule: {
      minDurationSeconds: 10,
      minScorePercent: null,
      requiresAssessmentPass: false,
      canProveLearning: false,
      descriptionPersian: 'انجام حداقل ۱۰ ثانیه چرخه تنفس هدایت‌شده (۵ ثانیه دم و ۵ ثانیه بازدم).',
    },
    assessmentType: 'self_expression_non_assessed',
    repeatability: 'daily_reward_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 5,
      demoPracticePoints: 0,
      requiresVerifiedOutcome: false,
      linkedTreeId: 'deep_breathing',
    },
    interpretationNotePersian:
      'ثبت انجام تمرین تنفس روزانه در دسته رشد فردی؛ به تنهایی ادعای بالینی سلامت روان محسوب نمی‌شود.',
  },
  {
    activityId: 'garden_poetry',
    category: 'personal_development',
    title: 'خوانش و تأمل در شعر پارسی (درخت شعر)',
    contentId: 'habit_persian_poetry_10_poets_v1',
    completionRule: {
      minDurationSeconds: 10,
      minScorePercent: null,
      requiresAssessmentPass: false,
      canProveLearning: false,
      descriptionPersian:
        'انتخاب یکی از ۱۰ شاعر نامدار ایرانی و حداقل ۱۰ ثانیه حضور و تأمل در صفحه شعر شاعر.',
    },
    assessmentType: 'self_expression_non_assessed',
    repeatability: 'daily_reward_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 5,
      demoPracticePoints: 0,
      requiresVerifiedOutcome: false,
      linkedTreeId: 'poetry',
    },
    interpretationNotePersian:
      'ثبت انجام فعالیت فرهنگی و رشد فردی (حداقل ۱۰ ثانیه تأمل در شعر) بدون نمره‌دهی آزمونی.',
  },

  // =========================================================================
  // 3. RECREATIONAL ACTIVITIES («فعالیت‌های صرفاً سرگرمی‌محور»)
  // =========================================================================
  {
    activityId: 'garden_bina_balls',
    category: 'recreational',
    title: 'چالش ردیابی توپ‌های بینا (درخت بینا)',
    contentId: 'recreation_bina_balls_10_v1',
    completionRule: {
      minDurationSeconds: 5,
      minScorePercent: 100,
      requiresAssessmentPass: true,
      canProveLearning: false,
      descriptionPersian:
        'مشاهده توپ هدف، تعقیب حرکت توپ‌ها و انتخاب صحیح توپ هدف در پایان مرحله (اتمام معتبر فعالیت سرگرمی‌محور، بدون ادعای اثبات یادگیری علمی یا درمان بینایی).',
    },
    assessmentType: 'perceptual_challenge',
    repeatability: 'daily_reward_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 5,
      demoPracticePoints: 0,
      requiresVerifiedOutcome: true,
      linkedTreeId: 'bina_balls',
    },
    interpretationNotePersian:
      'این فعالیت در دسته سرگرمی‌محور (recreational) قرار دارد؛ موفقیت در آن «اتمام معتبر فعالیت» (verified_completion) محسوب می‌شود اما «اثبات یادگیری علمی» یا سنجش بالینی بینایی نیست.',
  },
  {
    activityId: 'garden_memory_cards',
    category: 'recreational',
    title: 'بازی کارت‌های حافظه طبیعت (درخت حافظه)',
    contentId: 'recreation_memory_cards_v1',
    completionRule: {
      minDurationSeconds: 3,
      minScorePercent: 100,
      requiresAssessmentPass: true,
      canProveLearning: false,
      descriptionPersian: 'پیدا کردن تمام جفت کارت‌های همسان طبیعت در صفحه بازی.',
    },
    assessmentType: 'perceptual_challenge',
    repeatability: 'daily_reward_unlimited_practice',
    rewardEligibility: {
      eligibleForMainCoins: true,
      baseCoins: 5,
      demoPracticePoints: 0,
      requiresVerifiedOutcome: true,
      linkedTreeId: 'memory_cards',
    },
    interpretationNotePersian:
      'بازی سرگرمی‌محور جفت‌سازی تصاویر؛ اتمام معتبر فعالیت تفریحی بدون ادعای اثبات یادگیری دانشگاهی.',
  },
];

const activityRegistryMap = new Map<string, ActivityDefinition>(
  INITIAL_ACTIVITY_DEFINITIONS.map((def) => [def.activityId, def])
);

export function registerActivity(definition: ActivityDefinition): void {
  if (!definition.activityId || !definition.title) {
    throw new Error('Invalid ActivityDefinition: activityId and title are required.');
  }
  activityRegistryMap.set(definition.activityId, definition);
}

export function getActivityDefinition(
  activityId: string
): ActivityDefinition | undefined {
  return activityRegistryMap.get(activityId);
}

export function listRegisteredActivities(): ActivityDefinition[] {
  return Array.from(activityRegistryMap.values());
}

export function listActivitiesByCategory(
  category: ActivityCategory
): ActivityDefinition[] {
  return listRegisteredActivities().filter((def) => def.category === category);
}

/**
 * Maps a Garden TreeId to its registered unified activityId
 */
export function resolveGardenTreeActivityId(treeId: TreeId): string | undefined {
  const map: Record<TreeId, string> = {
    speed_reading: 'garden_speed_reading',
    gratitude: 'garden_gratitude',
    deep_breathing: 'garden_deep_breathing',
    bina_balls: 'garden_bina_balls',
    memory_cards: 'garden_memory_cards',
    brain_math: 'garden_brain_math',
    poetry: 'garden_poetry',
  };
  return map[treeId];
}

/**
 * Maps a University GameTemplateType to its registered unified activityId
 */
export function resolveUniversityTemplateActivityId(
  templateType: GameTemplateType
): string | undefined {
  const map: Record<GameTemplateType, string> = {
    read_and_answer: 'uni_read_and_answer',
    fill_in_blank: 'uni_fill_in_blank',
    match_concepts: 'uni_match_concepts',
    order_process: 'uni_order_process',
    speed_reading: 'uni_speed_reading',
    scientific_memory: 'uni_scientific_memory',
  };
  return map[templateType];
}
