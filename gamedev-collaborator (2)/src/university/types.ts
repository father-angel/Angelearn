/**
 * AngelLearn University Module - Content-Driven TypeScript Definitions
 * Schema Version: 1.0.0
 */

export type ContentApprovalStatus = 'draft' | 'reviewed' | 'published';

export type CourseSourceStatus =
  | 'pending_source' // «در انتظار دریافت منبع درسی»
  | 'demo_sandbox'   // «نسخه آزمایشی / سندباکس نمونه»
  | 'approved_ready'; // منبع تاییدشده و آماده اعطای مدال رسمی

export type GameTemplateType =
  | 'read_and_answer'     // ۱. مطالعه و آزمون (15% Gamification)
  | 'fill_in_blank'       // ۲. جای خالی چهارگزینه‌ای (25% Gamification)
  | 'match_concepts'      // ۳. اتصال مفاهیم (35% Gamification)
  | 'order_process'       // ۴. مرتب‌سازی مراحل (40% Gamification)
  | 'speed_reading'       // ۵. تندخوانی و درک مطلب (45% Gamification)
  | 'scientific_memory';  // ۶. حافظه علمی (55% Gamification)

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface SourceReference {
  sourceDocumentId: string;
  fileName: string;
  fileType: 'pdf' | 'pptx' | 'demo';
  pageOrSlide: string; // e.g., "صفحه ۱۴" or "اسلاید ۸" or "نمونه آزمایشی"
  sectionTitle?: string;
}

export interface AnswerOption {
  id: string;
  text: string;
}

// ============================================================================
// TEMPLATE 1: READ AND ANSWER («مطالعه و آزمون»)
// ============================================================================
export interface ReadAndAnswerQuestion {
  id: string;
  question: string;
  options: [AnswerOption, AnswerOption, AnswerOption, AnswerOption]; // Exactly 4 options
  correctOptionId: string;
  explanation: string;
  sourceRef?: SourceReference;
}

export interface ReadAndAnswerContent {
  id: string;
  courseId: string;
  lessonId: string;
  templateType: 'read_and_answer';
  title: string;
  instructions: string;
  difficulty: DifficultyLevel;
  passageTitle: string;
  passageParagraphs: string[];
  questions: ReadAndAnswerQuestion[];
  points: number;
  passingScore: number; // default 80
  status: ContentApprovalStatus;
  isDemo: boolean;
  sourceRef?: SourceReference;
}

// ============================================================================
// TEMPLATE 2: MULTIPLE-CHOICE FILL IN THE BLANK («جای خالی»)
// ============================================================================
export interface FillInBlankQuestion {
  id: string;
  sentenceBeforeBlank: string;
  sentenceAfterBlank: string;
  options: [AnswerOption, AnswerOption, AnswerOption, AnswerOption]; // Exactly 4 options
  correctOptionId: string;
  explanation: string;
  sourceRef?: SourceReference;
}

export interface FillInBlankContent {
  id: string;
  courseId: string;
  lessonId: string;
  templateType: 'fill_in_blank';
  title: string;
  instructions: string;
  difficulty: DifficultyLevel;
  items: FillInBlankQuestion[];
  points: number;
  passingScore: number;
  status: ContentApprovalStatus;
  isDemo: boolean;
}

// ============================================================================
// TEMPLATE 3: MATCH CONCEPTS («اتصال مفاهیم»)
// ============================================================================
export interface MatchingPairItem {
  id: string;
  term: string;
  definition: string;
  explanation?: string;
}

export interface MatchConceptsRound {
  id: string;
  roundTitle: string;
  pairs: MatchingPairItem[];
  sourceRef?: SourceReference;
}

export interface MatchConceptsContent {
  id: string;
  courseId: string;
  lessonId: string;
  templateType: 'match_concepts';
  title: string;
  instructions: string;
  difficulty: DifficultyLevel;
  rounds: MatchConceptsRound[];
  points: number;
  passingScore: number;
  status: ContentApprovalStatus;
  isDemo: boolean;
}

// ============================================================================
// TEMPLATE 4: ORDER THE PROCESS («مرتب‌سازی مراحل»)
// ============================================================================
export interface ProcessStepItem {
  id: string;
  stepNumber: number; // 1-indexed true order
  title: string;
  detail: string;
}

export interface OrderProcessExercise {
  id: string;
  processTitle: string;
  processCategory: string;
  description: string;
  orderedSteps: ProcessStepItem[];
  explanation: string;
  sourceRef: SourceReference;
}

export interface OrderProcessContent {
  id: string;
  courseId: string;
  lessonId: string;
  templateType: 'order_process';
  title: string;
  instructions: string;
  difficulty: DifficultyLevel;
  exercises: OrderProcessExercise[];
  points: number;
  passingScore: number;
  status: ContentApprovalStatus;
  isDemo: boolean;
}

// ============================================================================
// TEMPLATE 5: SPEED READING & COMPREHENSION («تندخوانی و درک مطلب»)
// ============================================================================
export interface SpeedReadingContent {
  id: string;
  courseId: string;
  lessonId: string;
  templateType: 'speed_reading';
  title: string;
  instructions: string;
  difficulty: DifficultyLevel;
  passageTitle: string;
  passageText: string;
  startWpm: number; // default 150
  targetEndWpm: number; // default 350
  maxCeilingWpm: number; // 600
  questions: ReadAndAnswerQuestion[];
  points: number;
  passingScore: number;
  status: ContentApprovalStatus;
  isDemo: boolean;
  sourceRef?: SourceReference;
}

// ============================================================================
// TEMPLATE 6: SCIENTIFIC MEMORY MATCHING («حافظه علمی»)
// ============================================================================
export interface MemoryPairItem {
  id: string;
  cardA: string; // e.g., Term or Scholar
  cardB: string; // e.g., Definition or Theory
  relationLabel: string;
}

export interface ScientificMemoryContent {
  id: string;
  courseId: string;
  lessonId: string;
  templateType: 'scientific_memory';
  title: string;
  instructions: string;
  difficulty: DifficultyLevel;
  previewSeconds: number;
  pairs: MemoryPairItem[];
  points: number;
  passingScore: number;
  status: ContentApprovalStatus;
  isDemo: boolean;
  sourceRef?: SourceReference;
}

export type AnyTemplateContent =
  | ReadAndAnswerContent
  | FillInBlankContent
  | MatchConceptsContent
  | OrderProcessContent
  | SpeedReadingContent
  | ScientificMemoryContent;

// ============================================================================
// UNIVERSITY, COURSE, LESSON, EXAM & MEDAL ENTITIES
// ============================================================================
export interface UniversityLesson {
  id: string;
  courseId: string;
  order: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  status: ContentApprovalStatus;
  isDemo: boolean;
  availableTemplates: GameTemplateType[];
  sourceRef?: SourceReference;
}

export interface CourseMedalConfig {
  medalId: string;
  title: string;
  description: string;
  artworkIcon: string;
  requiredPassingScore: number; // default 80
}

export interface UniversityCourse {
  id: string;
  title: string;
  englishTitle: string;
  subtitle: string;
  description: string;
  faculty: string;
  coverIcon: string;
  sourceStatus: CourseSourceStatus;
  statusLabelPersian: string; // e.g., «در انتظار دریافت منبع درسی»
  isDemoCourse: boolean;
  passingScore: number; // 80
  medalConfig: CourseMedalConfig;
  lessons: UniversityLesson[];
}

export interface TemplateDifficultyRecord {
  playerId: string;
  courseId: string;
  templateType: GameTemplateType;
  currentDifficulty: DifficultyLevel;
  attempts: number;
  bestAccuracy: number;
  lastAccuracy: number;
  bestTimeSeconds: number;
  lastPlayedAt: string;
}

export type SessionLifecycleStatus = 'in_progress' | 'completed' | 'abandoned';

export type UniversityRewardType = 'none' | 'demo_practice' | 'official_research';

export interface GameSessionRecord {
  sessionId: string;
  playerId: string;
  courseId: string;
  lessonId: string;
  templateType: GameTemplateType;
  mode: 'practice' | 'exam';
  status?: SessionLifecycleStatus;
  startedAt: number;
  completedAt?: number;
  abandonedAt?: number;
  endedAt?: number;
  durationSeconds: number;
  accuracyPercent: number;
  scoreEarned: number;
  passed: boolean;
  isDemoSession: boolean;
  rewardType?: UniversityRewardType;
  coinsAwarded?: number;
  demoPointsAwarded?: number;
}

export interface ExamAttemptRecord {
  examAttemptId: string;
  playerId: string;
  courseId: string;
  lessonId?: string;
  templateType?: GameTemplateType;
  date: string;
  scorePercent: number;
  passingThreshold: number;
  passed: boolean;
  isDemoAttempt: boolean;
  awardedMedalId?: string;
  rewardType?: UniversityRewardType;
  coinsAwarded?: number;
  demoPointsAwarded?: number;
}

export interface AwardedMedalRecord {
  medalId: string;
  courseId: string;
  courseTitle: string;
  playerId: string;
  awardDate: string;
  scorePercent: number;
  artworkIcon: string;
  criteriaText: string;
}

export interface UniversityContentPackage {
  schemaVersion: '1.0.0';
  exportedAt: string;
  course: UniversityCourse;
  contents: AnyTemplateContent[];
}

export interface SchemaValidationIssue {
  field: string;
  message: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  issues: SchemaValidationIssue[];
  parsedPackage?: UniversityContentPackage;
}
