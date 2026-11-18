/**
 * AngelLearn University Module - Shared Game & Assessment Engine
 * Pure, deterministic, unit-testable functions
 */

import {
  AnyTemplateContent,
  DifficultyLevel,
  GameTemplateType,
  ProcessStepItem,
  SchemaValidationIssue,
  SchemaValidationResult,
  UniversityContentPackage,
  UniversityCourse,
  UniversityRewardType,
} from './types';

export const TEMPLATE_METADATA: Record<
  GameTemplateType,
  {
    persianName: string;
    englishName: string;
    gamificationPercent: number;
    icon: string;
    shortDesc: string;
    themeColor: string;
  }
> = {
  read_and_answer: {
    persianName: 'مطالعه و آزمون',
    englishName: 'Read & Answer',
    gamificationPercent: 15,
    icon: '📖',
    shortDesc: 'مطالعه متن علمی از کتاب جادویی و پاسخ به پرسش‌های چهارگزینه‌ای',
    themeColor: 'from-amber-500 to-orange-600',
  },
  fill_in_blank: {
    persianName: 'جای خالی',
    englishName: 'Fill in the Blank',
    gamificationPercent: 25,
    icon: '✍️',
    shortDesc: 'بازسازی جملات تخصصی با انتخاب واژه کلیدی صحیح از بین ۴ گزینه',
    themeColor: 'from-emerald-500 to-teal-600',
  },
  match_concepts: {
    persianName: 'اتصال مفاهیم',
    englishName: 'Match Concepts',
    gamificationPercent: 35,
    icon: '🔗',
    shortDesc: 'پیوند دادن اصطلاحات علمی، نظریه‌پردازان و تعاریف با لمس دوگانه',
    themeColor: 'from-sky-500 to-blue-600',
  },
  order_process: {
    persianName: 'مرتب‌سازی مراحل',
    englishName: 'Order the Process',
    gamificationPercent: 40,
    icon: '🪜',
    shortDesc: 'چیدمان گام‌به‌گام فرآیندهای نوآوری، تفکر طراحی و توسعه محصول',
    themeColor: 'from-purple-500 to-indigo-600',
  },
  speed_reading: {
    persianName: 'تندخوانی و درک مطلب',
    englishName: 'Speed Reading & Comprehension',
    gamificationPercent: 45,
    icon: '⚡',
    shortDesc: 'نمایش کلمه‌به‌کلمه متمرکز (۱۵۰ تا ۳۵۰ کلمه بر دقیقه) همراه با سنجش درک مطلب',
    themeColor: 'from-cyan-500 to-teal-500',
  },
  scientific_memory: {
    persianName: 'حافظه علمی',
    englishName: 'Scientific Memory Matching',
    gamificationPercent: 55,
    icon: '🃏',
    shortDesc: 'یافتن جفت‌کارت‌های مرتبط علمی (مفهوم و کاربرد / دانشمند و نظریه)',
    themeColor: 'from-rose-500 to-pink-600',
  },
};

/**
 * Evaluates a 4-option multiple choice or fill-in-the-blank response.
 */
export function evaluateChoiceAnswer(
  selectedOptionId: string,
  correctOptionId: string
): boolean {
  return selectedOptionId.trim() === correctOptionId.trim();
}

/**
 * Evaluates an ordered sequence of process steps against their true stepNumber (1..N).
 */
export function evaluateSequenceOrder(userSteps: ProcessStepItem[]): {
  isAllCorrect: boolean;
  correctCount: number;
  totalCount: number;
  accuracyPercent: number;
  misplacedStepIds: string[];
} {
  const totalCount = userSteps.length;
  if (totalCount === 0) {
    return {
      isAllCorrect: true,
      correctCount: 0,
      totalCount: 0,
      accuracyPercent: 100,
      misplacedStepIds: [],
    };
  }

  let correctCount = 0;
  const misplacedStepIds: string[] = [];

  userSteps.forEach((step, idx) => {
    const expectedStepNumber = idx + 1;
    if (step.stepNumber === expectedStepNumber) {
      correctCount++;
    } else {
      misplacedStepIds.push(step.id);
    }
  });

  const accuracyPercent = Math.round((correctCount / totalCount) * 100);
  return {
    isAllCorrect: correctCount === totalCount,
    correctCount,
    totalCount,
    accuracyPercent,
    misplacedStepIds,
  };
}

/**
 * Computes adaptive difficulty bounded between 1 and 5.
 * Never increases without limit.
 */
export function computeNextDifficulty(
  currentDifficulty: DifficultyLevel,
  accuracyPercent: number
): DifficultyLevel {
  if (accuracyPercent >= 85 && currentDifficulty < 5) {
    return (currentDifficulty + 1) as DifficultyLevel;
  }
  if (accuracyPercent < 50 && currentDifficulty > 1) {
    return (currentDifficulty - 1) as DifficultyLevel;
  }
  return currentDifficulty;
}

/**
 * Computes instantaneous WPM during progressive speed-reading session,
 * clamped between startWpm and maxCeilingWpm (600).
 */
export function computeProgressiveWpm(
  progressRatio: number, // 0.0 to 1.0
  startWpm = 150,
  targetEndWpm = 350,
  maxCeilingWpm = 600
): number {
  const clampedRatio = Math.max(0, Math.min(1, progressRatio));
  const raw = startWpm + (targetEndWpm - startWpm) * clampedRatio;
  return Math.min(maxCeilingWpm, Math.max(80, Math.round(raw)));
}

/**
 * Computes adaptive pair count for Scientific Memory based on difficulty (1..5).
 * Starts with 2 pairs at level 1, up to 6 pairs at level 5.
 */
export function getMemoryPairCountForDifficulty(
  difficulty: DifficultyLevel,
  maxAvailablePairs: number
): { pairCount: number; previewSeconds: number } {
  const targetPairs = Math.min(maxAvailablePairs, difficulty + 1); // Lv1->2, Lv2->3, Lv3->4, Lv4->5, Lv5->6
  const previewSeconds = Math.max(2, 6 - difficulty); // Lv1->5s, Lv2->4s, Lv3->3s, Lv4->2s, Lv5->2s
  return {
    pairCount: Math.max(2, targetPairs),
    previewSeconds,
  };
}

/**
 * Strictly finds game content matching courseId, lessonId, and templateType.
 * NEVER falls back to another lesson's or another course's content.
 */
export function findMatchingGameContent<T extends AnyTemplateContent>(
  contents: AnyTemplateContent[],
  courseId: string,
  lessonId: string,
  templateType: GameTemplateType
): T | undefined {
  if (!courseId || !lessonId || !templateType) return undefined;
  const exact = contents.find(
    (c) =>
      c.courseId === courseId &&
      c.lessonId === lessonId &&
      c.templateType === templateType
  );
  return exact as T | undefined;
}

/**
 * Evaluates University activity/exam coin reward eligibility:
 * - Prevents infinite coin farming by rejecting repeated passes of the same activity.
 * - Distinguishes Demo practice rewards from valid research/educational course rewards.
 */
export function evaluateUniversityReward(params: {
  accuracyPercent: number;
  passingScore?: number;
  isDemoContent: boolean;
  alreadyRewardedForActivity: boolean;
}): {
  eligibleForMainCoins: boolean;
  coinsAwarded: number;
  demoPointsAwarded: number;
  rewardType: UniversityRewardType;
  reasonPersian: string;
} {
  const threshold = params.passingScore || 80;
  const roundedScore = Math.round(params.accuracyPercent);

  if (roundedScore < threshold) {
    return {
      eligibleForMainCoins: false,
      coinsAwarded: 0,
      demoPointsAwarded: 0,
      rewardType: 'none',
      reasonPersian: `برای دریافت پاداش، کسب حداقل ${threshold}٪ نمره الزامی است (نمره فعلی: ${roundedScore}٪).`,
    };
  }

  if (params.alreadyRewardedForActivity) {
    return {
      eligibleForMainCoins: false,
      coinsAwarded: 0,
      demoPointsAwarded: 0,
      rewardType: 'none',
      reasonPersian:
        'پاداش این فعالیت/آزمون قبلاً یک‌بار دریافت شده است؛ تکرار مجدد همان فعالیت سکه اضافی ایجاد نمی‌کند.',
    };
  }

  if (params.isDemoContent) {
    return {
      eligibleForMainCoins: false,
      coinsAwarded: 0,
      demoPointsAwarded: 5,
      rewardType: 'demo_practice',
      reasonPersian:
        'این فعالیت از نوع آزمایشی (Demo) است؛ ۵ امتیاز تمرینی آزمایشی ثبت شد (مجزا از سکه و پاداش فعالیت معتبر پژوهشی).',
    };
  }

  return {
    eligibleForMainCoins: true,
    coinsAwarded: 10,
    demoPointsAwarded: 0,
    rewardType: 'official_research',
    reasonPersian:
      'پاداش فعالیت معتبر آموزشی دانشگاه: ۱۰+ سکه طلا برای نخستین قبولی در این درس اعطا شد.',
  };
}

/**
 * Strict Medal Eligibility Rule:
 * - Official medals are ONLY awarded in 'exam' mode
 * - Score must meet or exceed course passingScore (default 80%)
 * - NEVER awarded for demo/sandbox courses or courses with 'pending_source' status
 * - Never awarded merely for completing a speed-reading practice session
 */
export function canAwardOfficialMedal(params: {
  course: UniversityCourse;
  mode: 'practice' | 'exam';
  scorePercent: number;
  isDemoContent: boolean;
}): { eligible: boolean; reasonPersian: string } {
  const { course, mode, scorePercent, isDemoContent } = params;

  if (mode !== 'exam') {
    return {
      eligible: false,
      reasonPersian: 'مدال علمی تنها در حالت «آزمون رسمی» اعطا می‌شود، نه در حالت تمرین.',
    };
  }

  const hasDemoLessons = Array.isArray(course.lessons) && course.lessons.some((l) => l.isDemo);

  if (
    course.isDemoCourse ||
    isDemoContent ||
    hasDemoLessons ||
    course.sourceStatus === 'pending_source' ||
    course.sourceStatus === 'demo_sandbox' ||
    course.sourceStatus !== 'approved_ready'
  ) {
    return {
      eligible: false,
      reasonPersian:
        'سوالات آزمایشی (Demo) مدال رسمی اعطا نمی‌کنند. مدال اصلی درس «مدیریت نوآوری» پس از بارگذاری و تایید منبع رسمی (PDF/PPTX) فعال می‌شود.',
    };
  }

  const threshold = course.passingScore || 80;
  if (scorePercent < threshold) {
    return {
      eligible: false,
      reasonPersian: `برای دریافت نشان «${course.medalConfig.title}» کسب حداقل ${threshold}٪ نمره الزامی است (نمره شما: ${scorePercent}٪).`,
    };
  }

  return {
    eligible: true,
    reasonPersian: `تبریک! شما با کسب نمره ${scorePercent}٪ موفق به دریافت نشان علمی «${course.medalConfig.title}» شدید.`,
  };
}

/**
 * Runtime JSON Schema Validator for importing future University course packages.
 */
export function validateUniversityContentPackage(
  rawJsonString: string
): SchemaValidationResult {
  const issues: SchemaValidationIssue[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJsonString);
  } catch {
    return {
      valid: false,
      issues: [
        {
          field: 'root',
          message: 'ساختار فایل JSON معتبر نیست (خطای نحوی در پارس کردن JSON).',
        },
      ],
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'root', message: 'ریشه داده باید یک شیء JSON باشد.' }],
    };
  }

  const pkg = parsed as Record<string, unknown>;

  if (pkg.schemaVersion !== '1.0.0') {
    issues.push({
      field: 'schemaVersion',
      message: 'فیلد schemaVersion باید برابر با "1.0.0" باشد.',
    });
  }

  if (!pkg.course || typeof pkg.course !== 'object') {
    issues.push({
      field: 'course',
      message: 'اطلاعات درس (فیلد course) در فایل یافت نشد.',
    });
  } else {
    const course = pkg.course as Record<string, unknown>;
    if (!course.id || typeof course.id !== 'string') {
      issues.push({ field: 'course.id', message: 'شناسه یکتای درس (course.id) الزامی است.' });
    }
    if (!course.title || typeof course.title !== 'string') {
      issues.push({ field: 'course.title', message: 'عنوان فارسی درس (course.title) الزامی است.' });
    }
    if (!Array.isArray(course.lessons) || course.lessons.length === 0) {
      issues.push({
        field: 'course.lessons',
        message: 'درس باید حداقل دارای یک سرفصل یا جلسه (course.lessons) باشد.',
      });
    }
  }

  if (!Array.isArray(pkg.contents) || pkg.contents.length === 0) {
    issues.push({
      field: 'contents',
      message: 'آرایه محتوای بازی‌های آموزشی (contents) نباید خالی باشد.',
    });
  } else {
    const validTemplates: GameTemplateType[] = [
      'read_and_answer',
      'fill_in_blank',
      'match_concepts',
      'order_process',
      'speed_reading',
      'scientific_memory',
    ];

    pkg.contents.forEach((item: unknown, idx: number) => {
      if (!item || typeof item !== 'object') {
        issues.push({
          field: `contents[${idx}]`,
          message: `آیتم شماره ${idx + 1} یک شیء معتبر نیست.`,
        });
        return;
      }
      const c = item as Record<string, unknown>;
      if (!c.id || typeof c.id !== 'string') {
        issues.push({
          field: `contents[${idx}].id`,
          message: `شناسه محتوا در آیتم ${idx + 1} الزامی است.`,
        });
      }
      if (
        !c.templateType ||
        !validTemplates.includes(c.templateType as GameTemplateType)
      ) {
        issues.push({
          field: `contents[${idx}].templateType`,
          message: `نوع قالب بازی (${String(c.templateType)}) در آیتم ${idx + 1} معتبر نیست.`,
        });
      }
      if (c.templateType === 'read_and_answer') {
        if (!Array.isArray(c.questions) || c.questions.length === 0) {
          issues.push({
            field: `contents[${idx}].questions`,
            message: 'قالب «مطالعه و آزمون» باید حداقل یک سوال چهارگزینه‌ای داشته باشد.',
          });
        } else {
          c.questions.forEach((q: unknown, qIdx: number) => {
            const qObj = q as Record<string, unknown>;
            if (!Array.isArray(qObj.options) || qObj.options.length !== 4) {
              issues.push({
                field: `contents[${idx}].questions[${qIdx}].options`,
                message: `هر سوال چهارگزینه‌ای باید دقیقاً ۴ گزینه داشته باشد (سوال ${qIdx + 1}).`,
              });
            }
          });
        }
      }
      if (c.templateType === 'fill_in_blank') {
        if (!Array.isArray(c.items) || c.items.length === 0) {
          issues.push({
            field: `contents[${idx}].items`,
            message: 'قالب «جای خالی» باید حداقل یک جمله سوالی داشته باشد.',
          });
        } else {
          c.items.forEach((b: unknown, bIdx: number) => {
            const bObj = b as Record<string, unknown>;
            if (!Array.isArray(bObj.options) || bObj.options.length !== 4) {
              issues.push({
                field: `contents[${idx}].items[${bIdx}].options`,
                message: `هر سوال جای خالی باید دقیقاً ۴ گزینه داشته باشد (مورد ${bIdx + 1}).`,
              });
            }
          });
        }
      }
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    parsedPackage:
      issues.length === 0 ? (parsed as UniversityContentPackage) : undefined,
  };
}
