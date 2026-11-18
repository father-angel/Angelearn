/**
 * AngelLearn University Module - Initial Course & Sandbox Demo Content
 *
 * IMPORTANT:
 * - «مدیریت نوآوری» is marked as «در انتظار دریافت منبع درسی» (pending_source).
 * - All sample game contents below are explicitly marked as `isDemo: true`
 *   and labeled "[نمونه آزمایشی — Demo]" for testing the 6 game templates.
 * - Demo sessions NEVER award official course medals.
 */

import {
  AnyTemplateContent,
  UniversityContentPackage,
  UniversityCourse,
} from './types';
import {
  NPD_ALL_LECTURE_CONTENTS,
  NPD_COURSE_LESSONS,
} from './npdLecturesData';

export const INITIAL_UNIVERSITY_COURSES: UniversityCourse[] = [
  {
    id: 'course_new_product_development',
    title: 'توسعه محصول',
    englishTitle: 'New Product Development',
    subtitle: 'دو لکچر نخست: مبانی و مدل‌های توسعه محصول جدید',
    description:
      'درس توسعه محصول، بر پایه دو مجموعه اسلاید «مبانی توسعه محصول جدید» (۴۲ صفحه) و «مدل‌های توسعه محصول جدید» (۵۳ صفحه)؛ ارائه مدرس اسماعیل جعفرپناه، دانشکدگان مدیریت دانشگاه تهران. محتوا در مرحله بازبینی آموزشی است و لکچرهای سوم تا پنجم پس از دریافت منبع اضافه می‌شوند.',
    faculty: 'دانشکدگان مدیریت دانشگاه تهران',
    coverIcon: '💡',
    sourceStatus: 'pending_source',
    statusLabelPersian: 'منبع دریافت شده؛ محتوای پیش‌نویس در انتظار بازبینی',
    isDemoCourse: false,
    passingScore: 80,
    medalConfig: {
      medalId: 'medal_new_product_development',
      title: 'نشان علمی توسعه محصول',
      description:
        'پس از بازبینی علمی همه لکچرها و راه‌اندازی آزمون معتبر، نشان درون‌بازی فعال خواهد شد. اکنون با محتوای پیش‌نویس نشان صادر نمی‌شود.',
      artworkIcon: '🏅',
      requiredPassingScore: 80,
    },
    lessons: [...NPD_COURSE_LESSONS],
  },
  {
    id: 'course_demo_sandbox',
    title: 'آزمایشگاه نمونه بازی‌های دانشگاه (Sandbox)',
    englishTitle: 'University Game Engine Sandbox',
    subtitle: 'محیط تست تعاملی هر ۶ قالب بازی و موتور آزمون',
    description:
      'این محیط صرفاً یک سندباکس آزمایشی (Demo) برای بررسی عملکرد ۶ قالب بازی («مطالعه و آزمون»، «جای خالی»، «اتصال مفاهیم»، «مرتب‌سازی مراحل»، «تندخوانی و درک مطلب» و «حافظه علمی») در موبایل و دسکتاپ است.',
    faculty: 'آزمایشگاه فناوری آموزشی انجلرن',
    coverIcon: '🧪',
    sourceStatus: 'demo_sandbox',
    statusLabelPersian: 'محیط آزمایشی (Demo / Sandbox)',
    isDemoCourse: true,
    passingScore: 80,
    medalConfig: {
      medalId: 'medal_sandbox_preview',
      title: 'نشان آزمایشی سندباکس (غیرقابل اعطا در حالت دمو)',
      description:
        'در حالت آزمایشی (Demo)، مدال رسمی اعطا نمی‌شود تا اعتبار مدال‌های علمی حفظ شود.',
      artworkIcon: '🔒',
      requiredPassingScore: 80,
    },
    lessons: [
      {
        id: 'lesson_innov_sandbox_1',
        courseId: 'course_demo_sandbox',
        order: 1,
        title: 'فصل نمونه (Demo): تمرین و تست هر ۶ قالب بازی',
        summary:
          'سوالات نمونه آزمایشی با برچسب شفاف [Demo] برای آزمودن رابط کاربری لمسی، بازخورد فوری و حالت آزمون.',
        estimatedMinutes: 12,
        status: 'draft',
        isDemo: true,
        availableTemplates: [
          'read_and_answer',
          'fill_in_blank',
          'match_concepts',
          'order_process',
          'speed_reading',
          'scientific_memory',
        ],
      },
    ],
  },
];

export const INITIAL_TEMPLATE_CONTENTS: AnyTemplateContent[] = [
  ...NPD_ALL_LECTURE_CONTENTS,
  // =========================================================================
  // 1. TEMPLATE 1 — READ AND ANSWER («مطالعه و آزمون»)
  // =========================================================================
  {
    id: 'content_demo_read_1',
    courseId: 'course_demo_sandbox',
    lessonId: 'lesson_innov_sandbox_1',
    templateType: 'read_and_answer',
    title: 'مطالعه و آزمون (نمونه آزمایشی Demo)',
    instructions:
      'ابتدا متن نمونه زیر را با آرامش مطالعه کنید و سپس به پرسش‌های چهارگزینه‌ای پاسخ دهید. در حالت تمرین، توضیح پاسخ بلافاصله نمایش داده می‌شود.',
    difficulty: 1,
    passageTitle: '[متن نمونه آزمایشی] تفاوت ایده خام و نوآوری ارزش‌آفرین',
    passageParagraphs: [
      'توجه: این متن یک نمونه آزمایشی (Demo) برای تست قالب بازی «مطالعه و آزمون» است و جایگزین منبع درسی اصلی مدیریت نوآوری نیست.',
      'در ادبیات عمومی کارآفرینی، «خلاقیت» به معنای تولید ایده‌های نو در ذهن است، اما «نوآوری» زمانی رخ می‌دهد که یک ایده به محصول، خدمت یا فرآیندی کاربردی و ارزش‌آفرین در دنیای واقعی تبدیل شود.',
      'بنابراین هر پروژه‌ای که صرفاً روی کاغذ باقی بماند، هنوز به مرحله نوآوری کامل نرسیده است و نیازمند اعتبارسنجی، پیاده‌سازی و پذیرش توسط کاربران است.',
    ],
    questions: [
      {
        id: 'q_read_1',
        question: '[سوال نمونه ۱] بر اساس متن نمونه بالا، چه زمانی یک ایده به «نوآوری» تبدیل می‌شود؟',
        options: [
          { id: 'opt_1', text: 'زمانی که صرفاً در ذهن طراح شکل بگیرد' },
          {
            id: 'opt_2',
            text: 'زمانی که به محصول، خدمت یا فرآیندی کاربردی و ارزش‌آفرین تبدیل شود',
          },
          { id: 'opt_3', text: 'زمانی که بدون آزمایش کنار گذاشته شود' },
          { id: 'opt_4', text: 'زمانی که هیچ کاربری از آن استفاده نکند' },
        ],
        correctOptionId: 'opt_2',
        explanation:
          'توضیح نمونه: طبق پاراگراف دوم متن آزمایشی، نوآوری مستلزم تبدیل شدن ایده به یک خروجی کاربردی و ارزش‌آفرین در دنیای واقعی است.',
        sourceRef: {
          sourceDocumentId: 'demo_sandbox_doc',
          fileName: 'محتوای آزمایشی (Demo Sandbox)',
          fileType: 'demo',
          pageOrSlide: 'متن نمونه ۱',
        },
      },
      {
        id: 'q_read_2',
        question:
          '[سوال نمونه ۲] ایده‌ای که تنها روی کاغذ باقی بماند و پیاده‌سازی نشود، در چه وضعیتی قرار دارد؟',
        options: [
          { id: 'opt_a', text: 'به مرحله نوآوری کامل نرسیده و نیازمند پیاده‌سازی است' },
          { id: 'opt_b', text: 'یک محصول نهایی پرفروش محسوب می‌شود' },
          { id: 'opt_c', text: 'نیازی به اعتبارسنجی کاربران ندارد' },
          { id: 'opt_d', text: 'تمامی مراحل تجاری‌سازی را طی کرده است' },
        ],
        correctOptionId: 'opt_a',
        explanation:
          'توضیح نمونه: بر اساس پاراگراف سوم، ایده روی کاغذ پیش از اعتبارسنجی و اجرا هنوز نوآوری کامل محسوب نمی‌شود.',
        sourceRef: {
          sourceDocumentId: 'demo_sandbox_doc',
          fileName: 'محتوای آزمایشی (Demo Sandbox)',
          fileType: 'demo',
          pageOrSlide: 'متن نمونه ۱',
        },
      },
    ],
    points: 20,
    passingScore: 80,
    status: 'draft',
    isDemo: true,
  },

  // =========================================================================
  // 2. TEMPLATE 2 — FILL IN THE BLANK («جای خالی»)
  // =========================================================================
  {
    id: 'content_demo_blank_1',
    courseId: 'course_demo_sandbox',
    lessonId: 'lesson_innov_sandbox_1',
    templateType: 'fill_in_blank',
    title: 'جای خالی چهارگزینه‌ای (نمونه آزمایشی Demo)',
    instructions:
      'واژه مناسب را از میان چهار گزینه لمس کنید تا در جای خالی جمله قرار گیرد و جمله کامل شود.',
    difficulty: 1,
    items: [
      {
        id: 'blank_1',
        sentenceBeforeBlank: '[نمونه Demo] ساخت نسخه اولیه ساده از یک محصول برای دریافت بازخورد سریع کاربران،',
        sentenceAfterBlank: 'نامیده می‌شود.',
        options: [
          { id: 'b1_1', text: 'نمونه‌سازی اولیه (Prototyping)' },
          { id: 'b1_2', text: 'بایگانی راکد' },
          { id: 'b1_3', text: 'توقف پروژه' },
          { id: 'b1_4', text: 'حذف بازخورد' },
        ],
        correctOptionId: 'b1_1',
        explanation:
          'توضیح نمونه: نمونه‌سازی اولیه (Prototyping) به تیم کمک می‌کند پیش از سرمایه‌گذاری سنگین، فرضیات را با کاربر واقعی بیازماید.',
      },
      {
        id: 'blank_2',
        sentenceBeforeBlank: '[نمونه Demo] در رویکرد طراحی انسان‌محور، شناخت عمیق نیازهای کاربر از طریق',
        sentenceAfterBlank: 'آغاز می‌گردد.',
        options: [
          { id: 'b2_1', text: 'همدلی و مشاهده (Empathy)' },
          { id: 'b2_2', text: 'حدس بدون تحقیق' },
          { id: 'b2_3', text: 'کپی‌برداری کورکورانه' },
          { id: 'b2_4', text: 'نادیده گرفتن مخاطب' },
        ],
        correctOptionId: 'b2_1',
        explanation:
          'توضیح نمونه: گام نخست در فرآیندهای طراحی انسان‌محور، همدلی و درک مسأله از زاویه دید کاربر است.',
      },
    ],
    points: 20,
    passingScore: 80,
    status: 'draft',
    isDemo: true,
  },

  // =========================================================================
  // 3. TEMPLATE 3 — MATCH CONCEPTS («اتصال مفاهیم»)
  // =========================================================================
  {
    id: 'content_demo_match_1',
    courseId: 'course_demo_sandbox',
    lessonId: 'lesson_innov_sandbox_1',
    templateType: 'match_concepts',
    title: 'اتصال مفاهیم (نمونه آزمایشی Demo)',
    instructions:
      'ابتدا روی یک اصطلاح در ستون راست ضربه بزنید و سپس تعریف مرتبط با آن را در ستون چپ لمس کنید (نیازی به کشیدن و رها کردن نیست).',
    difficulty: 1,
    rounds: [
      {
        id: 'match_round_1',
        roundTitle: 'بخش ۱ (نمونه آزمایشی): اصطلاحات پایه یادگیری و نوآوری',
        pairs: [
          {
            id: 'pair_1',
            term: 'ایده (Idea)',
            definition: 'تصور یا راه‌حل اولیه‌ای که در ذهن شکل می‌گیرد',
          },
          {
            id: 'pair_2',
            term: 'نمونه اولیه (Prototype)',
            definition: 'مدل آزمایشی اولیه برای سنجش کارکرد و دریافت بازخورد',
          },
          {
            id: 'pair_3',
            term: 'بازخورد کاربر (User Feedback)',
            definition: 'نظرات و تجربه واقعی استفاده‌کنندگان برای بهبود محصول',
          },
          {
            id: 'pair_4',
            term: 'بهبود مستمر (Iteration)',
            definition: 'چرخه تکرارشونده اصلاح و ارتقای گام‌به‌گام محصول',
          },
        ],
      },
    ],
    points: 25,
    passingScore: 80,
    status: 'draft',
    isDemo: true,
  },

  // =========================================================================
  // 4. TEMPLATE 4 — ORDER THE PROCESS («مرتب‌سازی مراحل»)
  // =========================================================================
  {
    id: 'content_demo_order_1',
    courseId: 'course_demo_sandbox',
    lessonId: 'lesson_innov_sandbox_1',
    templateType: 'order_process',
    title: 'مرتب‌سازی مراحل فرآیند (نمونه آزمایشی Demo)',
    instructions:
      'مراحل به‌هم‌ریخته زیر را به ترتیب صحیح بچینید. می‌توانید روی هر کارت ضربه بزنید تا در اولین جایگاه خالی قرار گیرد یا با دکمه‌های بالا/پایین جای آن‌ها را تغییر دهید.',
    difficulty: 1,
    exercises: [
      {
        id: 'order_ex_1',
        processTitle: '[فرآیند نمونه Demo] چرخه ۵ مرحله‌ای تفکر طراحی (Design Thinking)',
        processCategory: 'تفکر طراحی (نمونه آزمایشی جهت تست قالب)',
        description:
          'مراحل حل مسأله انسان‌محور را از شناخت نیاز کاربر تا آزمون نمونه اولیه به ترتیب صحیح ۱ تا ۵ مرتب کنید.',
        orderedSteps: [
          {
            id: 'step_1',
            stepNumber: 1,
            title: 'همدلی و شناخت کاربر (Empathize)',
            detail: 'مشاهده و گفت‌وگو با کاربران برای درک عمیق نیازها',
          },
          {
            id: 'step_2',
            stepNumber: 2,
            title: 'تعریف دقیق مسأله (Define)',
            detail: 'تحلیل یافته‌ها و صورت‌بندی شفاف چالش اصلی',
          },
          {
            id: 'step_3',
            stepNumber: 3,
            title: 'ایده‌پردازی خلاق (Ideate)',
            detail: 'بارش فکری و تولید راه‌حل‌های متنوع برای مسأله تعریف‌شده',
          },
          {
            id: 'step_4',
            stepNumber: 4,
            title: 'ساخت نمونه اولیه (Prototype)',
            detail: 'تبدیل بهترین ایده‌ها به یک نسخه ملموس و کم‌هزینه',
          },
          {
            id: 'step_5',
            stepNumber: 5,
            title: 'آزمون و دریافت بازخورد (Test)',
            detail: 'ارزیابی نمونه اولیه با کاربران واقعی و اصلاح آن',
          },
        ],
        explanation:
          'توضیح نمونه: در الگوی متداول تفکر طراحی، ابتدا همدلی با کاربر شکل می‌گیرد، سپس مسأله تعریف می‌شود، ایده‌پردازی صورت می‌گیرد، نمونه اولیه ساخته می‌شود و در نهایت مورد آزمون قرار می‌گیرد.',
        sourceRef: {
          sourceDocumentId: 'demo_sandbox_doc',
          fileName: 'محتوای آزمایشی موتور بازی (Demo Sandbox)',
          fileType: 'demo',
          pageOrSlide: 'نمونه فرآیند آزمایشی (بدون منبع PDF بارگذاری‌شده)',
        },
      },
    ],
    points: 30,
    passingScore: 80,
    status: 'draft',
    isDemo: true,
  },

  // =========================================================================
  // 5. TEMPLATE 5 — SPEED READING & COMPREHENSION («تندخوانی و درک مطلب»)
  // =========================================================================
  {
    id: 'content_demo_speed_1',
    courseId: 'course_demo_sandbox',
    lessonId: 'lesson_innov_sandbox_1',
    templateType: 'speed_reading',
    title: 'تندخوانی و درک مطلب (نمونه آزمایشی Demo)',
    instructions:
      'واژگان متن علمی نمونه در کانون دید شما نمایش داده می‌شوند. در حالت تمرین می‌توانید سرعت مطالعه را بین ۱۵۰ تا ۳۵۰ کلمه بر دقیقه تنظیم یا متوقف کنید. پس از پایان متن، به پرسش‌های درک مطلب پاسخ دهید.',
    difficulty: 1,
    passageTitle: '[متن نمونه آزمایشی] یادگیری فعال و حل مسأله در محیط‌های دانشگاهی',
    passageText:
      'این متن یک نمونه آزمایشی برای آزمودن قالب تندخوانی و درک مطلب در دانشگاه انجلرن است. مطالعه متمرکز به مغز کمک می‌کند تا به جای سرگردانی چشم روی سطرهای طولانی، هر عبارت کلیدی را در کانون توجه پردازش نماید. در آموزش دانشگاهی، سرعت خواندن زمانی ارزشمند است که با درک عمیق مفاهیم و توانایی تحلیل ارتباط میان اجزای یک نظریه همراه شود. به همین دلیل در موتور آموزشی دانشگاه انجلرن، سرعت مطالعه به تدریج از صد و پنجاه کلمه بر دقیقه آغاز شده و متناسب با میزان درک مطلب بازیکن تنظیم می‌گردد. هنگامی که دانشجو مفاهیم کلیدی یک فرآیند علمی را با تمرکز بالا مرور می‌کند، شبکه‌های معنایی در حافظه کاری فعال‌تر شده و بازیابی اطلاعات در هنگام حل مسائل واقعی و آزمون‌های تحلیلی با دقت بسیار بیشتری انجام خواهد پذیرفت.',
    startWpm: 150,
    targetEndWpm: 350,
    maxCeilingWpm: 600,
    questions: [
      {
        id: 'sr_q_1',
        question:
          '[سوال درک مطلب ۱ - نمونه Demo] بر اساس متن خوانده‌شده، سرعت مطالعه در آموزش دانشگاهی چه زمانی ارزشمند است؟',
        options: [
          { id: 'sr_1_a', text: 'زمانی که بدون درک معنا فقط صفحات ورق زده شوند' },
          {
            id: 'sr_1_b',
            text: 'زمانی که با درک عمیق مفاهیم و توانایی تحلیل ارتباط اجزا همراه شود',
          },
          { id: 'sr_1_c', text: 'زمانی که تمام کلمات کلیدی نادیده گرفته شوند' },
          { id: 'sr_1_d', text: 'زمانی که سرعت از مرز خوانایی خارج شود' },
        ],
        correctOptionId: 'sr_1_b',
        explanation:
          'توضیح نمونه: در تندخوانی علمی، هدف اصلی درک مطلب و تحلیل مفاهیم است نه صرفاً افزایش عدد سرعت.',
      },
      {
        id: 'sr_q_2',
        question:
          '[سوال درک مطلب ۲ - نمونه Demo] سرعت آغازین پیش‌فرض در این تمرین چند کلمه بر دقیقه عنوان شد؟',
        options: [
          { id: 'sr_2_a', text: '۱۵۰ کلمه بر دقیقه' },
          { id: 'sr_2_b', text: '۹۰۰ کلمه بر دقیقه' },
          { id: 'sr_2_c', text: '۲۰ کلمه بر دقیقه' },
          { id: 'sr_2_d', text: '۱۰۰۰ کلمه بر دقیقه' },
        ],
        correctOptionId: 'sr_2_a',
        explanation:
          'توضیح نمونه: سرعت پایه تمرین از ۱۵۰ کلمه بر دقیقه آغاز می‌شود و به صورت تدریجی و سازگار با درک مطلب افزایش می‌یابد.',
      },
    ],
    points: 25,
    passingScore: 80,
    status: 'draft',
    isDemo: true,
  },

  // =========================================================================
  // 6. TEMPLATE 6 — SCIENTIFIC MEMORY MATCHING («حافظه علمی»)
  // =========================================================================
  {
    id: 'content_demo_memory_1',
    courseId: 'course_demo_sandbox',
    lessonId: 'lesson_innov_sandbox_1',
    templateType: 'scientific_memory',
    title: 'حافظه علمی (نمونه آزمایشی Demo)',
    instructions:
      'در ابتدای بازی، کارت‌های علمی برای چند ثانیه نمایش داده می‌شوند و سپس برمی‌گردند. با ضربه زدن روی کارت‌ها، هر مفهوم را با کاربرد یا تعریف همتای آن جفت کنید.',
    difficulty: 1,
    previewSeconds: 4,
    pairs: [
      {
        id: 'mem_1',
        cardA: 'بارش فکری (Brainstorming)',
        cardB: 'تولید ایده‌های پرشمار بدون قضاوت اولیه',
        relationLabel: 'روش ↔ کاربرد',
      },
      {
        id: 'mem_2',
        cardA: 'کمینه محصول پذیرفتنی (MVP)',
        cardB: 'نسخه اولیه با امکانات پایه برای سنجش بازار',
        relationLabel: 'اصطلاح ↔ تعریف',
      },
      {
        id: 'mem_3',
        cardA: 'مزیت رقابتی',
        cardB: 'ارزش متمایزی که تقلید از آن برای رقبا دشوار است',
        relationLabel: 'مفهوم ↔ ویژگی',
      },
      {
        id: 'mem_4',
        cardA: 'تحقیق و توسعه (R&D)',
        cardB: 'کاوش سیستماتیک برای خلق دانش و فناوری جدید',
        relationLabel: 'واحد ↔ ماموریت',
      },
      {
        id: 'mem_5',
        cardA: 'نقشه سفر مشتری',
        cardB: 'ترسیم گام‌به‌گام تجربه کاربر در تعامل با خدمت',
        relationLabel: 'ابزار ↔ کارکرد',
      },
    ],
    points: 30,
    passingScore: 80,
    status: 'draft',
    isDemo: true,
  },
];

export const SAMPLE_IMPORTABLE_COURSE_PACKAGE: UniversityContentPackage = {
  schemaVersion: '1.0.0',
  exportedAt: '2026-11-10T08:00:00.000Z',
  course: INITIAL_UNIVERSITY_COURSES[0],
  contents: INITIAL_TEMPLATE_CONTENTS,
};
