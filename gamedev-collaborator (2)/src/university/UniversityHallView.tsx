import React, { useState } from 'react';
import { UserProfile } from '../types/game';
import {
  FillInBlankContent,
  GameSessionRecord,
  GameTemplateType,
  MatchConceptsContent,
  OrderProcessContent,
  ReadAndAnswerContent,
  ScientificMemoryContent,
  SpeedReadingContent,
  UniversityContentPackage,
  UniversityCourse,
  UniversityLesson,
  UniversityRewardType,
} from './types';
import { TEMPLATE_METADATA } from './engine';
import { universityAdapter } from './persistence';
import {
  resolveUniversityTemplateActivityId,
  submitUnifiedActivityResult,
} from '../activities';
import { isResearchModeActive } from '../research';
import { ContentImporterModal } from './ContentImporterModal';
import { ReadAndAnswerGame } from './templates/ReadAndAnswerGame';
import { FillInTheBlankGame } from './templates/FillInTheBlankGame';
import { MatchConceptsGame } from './templates/MatchConceptsGame';
import { OrderProcessGame } from './templates/OrderProcessGame';
import { SpeedReadingUniGame } from './templates/SpeedReadingUniGame';
import { ScientificMemoryGame } from './templates/ScientificMemoryGame';
import { sound } from '../utils/audio';
import {
  GraduationCap,
  Award,
  BookOpen,
  Play,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  Trophy,
  Compass,
} from 'lucide-react';

export type UniversityNavigationStep =
  | 'entrance_courses'   // ۱. ورودی دانشگاه و انتخاب درس
  | 'course_overview'    // ۲. نمای کلی درس (شروع آموزش یا ورود مستقیم به آزمون)
  | 'template_selection' // ۳. انتخاب یکی از ۶ قالب بازی آموزشی
  | 'game_session'       // ۴. اجرای جلسه بازی یا آزمون
  | 'session_results';   // ۵. صفحه نتایج، تحلیل دقت و بررسی نشان علمی

type NavigationStep = UniversityNavigationStep;

interface UniversityHallViewProps {
  profile: UserProfile;
  onBackToWorld: () => void;
  onRewardCoins?: (coins: number) => void;
  initialCourseIndex?: number;
  initialLessonIndex?: number;
  initialNavStep?: UniversityNavigationStep;
  initialSessionMode?: 'practice' | 'exam';
}

const ALL_TEMPLATE_TYPES: GameTemplateType[] = [
  'read_and_answer',
  'fill_in_blank',
  'match_concepts',
  'order_process',
  'speed_reading',
  'scientific_memory',
];

export const UniversityHallView: React.FC<UniversityHallViewProps> = ({
  profile,
  onBackToWorld,
  onRewardCoins,
  initialCourseIndex = 0,
  initialLessonIndex = 0,
  initialNavStep = 'entrance_courses',
  initialSessionMode = 'practice',
}) => {
  const [courses, setCourses] = useState<UniversityCourse[]>(() =>
    universityAdapter.listCourses()
  );
  const [selectedCourse, setSelectedCourse] = useState<UniversityCourse>(() => {
    const list = universityAdapter.listCourses();
    return list[initialCourseIndex] || list[0];
  });
  const [selectedLesson, setSelectedLesson] = useState<UniversityLesson>(() => {
    const list = universityAdapter.listCourses();
    const course = list[initialCourseIndex] || list[0];
    return course.lessons[initialLessonIndex] || course.lessons[0];
  });

  const [navStep, setNavStep] = useState<NavigationStep>(initialNavStep);
  const [sessionMode, setSessionMode] = useState<'practice' | 'exam'>(
    initialSessionMode
  );
  const [activeTemplate, setActiveTemplate] =
    useState<GameTemplateType>('read_and_answer');
  const [activeSession, setActiveSession] =
    useState<GameSessionRecord | null>(null);

  const [lastResult, setLastResult] = useState<{
    accuracyPercent: number;
    durationSeconds: number;
    passed: boolean;
    medalMessage: string;
    awardedMedalTitle?: string;
    rewardMessage: string;
    rewardType: UniversityRewardType;
    coinsAwarded: number;
    demoPointsAwarded: number;
  } | null>(null);

  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const playerMedals = universityAdapter.getPlayerMedals(profile.id);

  const abandonActiveSessionIfAny = () => {
    if (activeSession && activeSession.status === 'in_progress') {
      const abandonedRecord =
        universityAdapter.abandonSession(activeSession) || activeSession;
      const unifiedActivityId = resolveUniversityTemplateActivityId(
        activeSession.templateType
      );
      if (unifiedActivityId) {
        const contentObj = universityAdapter.getGameContent(
          activeSession.courseId,
          activeSession.lessonId,
          activeSession.templateType
        );
        submitUnifiedActivityResult({
          sessionId: abandonedRecord.sessionId,
          playerId: profile.id,
          activityId: unifiedActivityId,
          contentId:
            contentObj?.id ||
            `${activeSession.lessonId}_${activeSession.templateType}`,
          courseId: activeSession.courseId,
          lessonId: activeSession.lessonId,
          templateType: activeSession.templateType,
          sessionMode: activeSession.mode,
          isDemoContent: abandonedRecord.isDemoSession,
          isReviewedResearchContent: !abandonedRecord.isDemoSession,
          startedAt: new Date(abandonedRecord.startedAt).toISOString(),
          completedAt: abandonedRecord.abandonedAt
            ? new Date(abandonedRecord.abandonedAt).toISOString()
            : new Date().toISOString(),
          status: 'abandoned',
          durationSeconds: abandonedRecord.durationSeconds,
          scorePercent: 0,
          interactionCompleted: false,
          assessmentPassed: false,
        });
      }
      setActiveSession(null);
    }
  };

  const handleExitGameSession = (targetStep: NavigationStep = 'template_selection') => {
    sound.playClick();
    abandonActiveSessionIfAny();
    setNavStep(targetStep);
  };

  const handleSelectCourse = (course: UniversityCourse) => {
    sound.playClick();
    abandonActiveSessionIfAny();
    setSelectedCourse(course);
    if (course.lessons.length > 0) {
      setSelectedLesson(course.lessons[0]);
    }
    setNavStep('course_overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Start Learning (Practice Mode) -> Opens 6 Game Templates Selector
  const handleStartLearning = () => {
    sound.playClick();
    abandonActiveSessionIfAny();
    setSessionMode('practice');
    setNavStep('template_selection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Enter Exam Directly (Skip tutorial if player already knows material)
  const handleEnterExamDirectly = () => {
    sound.playClick();
    abandonActiveSessionIfAny();
    setSessionMode('exam');
    setNavStep('template_selection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLaunchTemplate = (tplType: GameTemplateType) => {
    sound.playClick();
    abandonActiveSessionIfAny();
    setActiveTemplate(tplType);

    const contentObj = universityAdapter.getGameContent(
      selectedCourse.id,
      selectedLesson.id,
      tplType
    );

    if (contentObj) {
      const isDemo = Boolean(
        contentObj.isDemo ||
          selectedLesson.isDemo ||
          selectedCourse.isDemoCourse ||
          selectedCourse.sourceStatus === 'demo_sandbox'
      );
      const started = universityAdapter.startSession(
        profile.id,
        selectedCourse.id,
        selectedLesson.id,
        tplType,
        sessionMode,
        isDemo
      );
      setActiveSession(started);
    } else {
      setActiveSession(null);
    }

    setNavStep('game_session');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSessionFinished = (
    accuracyPercent: number,
    durationSeconds: number
  ) => {
    const contentObj = universityAdapter.getGameContent(
      selectedCourse.id,
      selectedLesson.id,
      activeTemplate
    );
    const isDemo = Boolean(
      contentObj?.isDemo ||
        selectedLesson.isDemo ||
        selectedCourse.isDemoCourse ||
        selectedCourse.sourceStatus === 'demo_sandbox'
    );

    const sessionToComplete =
      activeSession &&
      activeSession.courseId === selectedCourse.id &&
      activeSession.lessonId === selectedLesson.id &&
      activeSession.templateType === activeTemplate
        ? activeSession
        : universityAdapter.startSession(
            profile.id,
            selectedCourse.id,
            selectedLesson.id,
            activeTemplate,
            sessionMode,
            isDemo
          );

    const { completedSession, updatedDifficulty, rewardEvaluation } =
      universityAdapter.completeSession(
        sessionToComplete,
        accuracyPercent,
        durationSeconds,
        selectedCourse.passingScore || 80
      );
    setActiveSession(null);

    // Stage 3 & Stage 4: Emit unified ActivityResult and evaluate reward via shared progression engine
    const unifiedActivityId = resolveUniversityTemplateActivityId(activeTemplate);
    const unifiedOutput = unifiedActivityId
      ? submitUnifiedActivityResult({
          sessionId: completedSession.sessionId,
          playerId: profile.id,
          activityId: unifiedActivityId,
          contentId: contentObj?.id || `${selectedLesson.id}_${activeTemplate}`,
          courseId: selectedCourse.id,
          lessonId: selectedLesson.id,
          templateType: activeTemplate,
          sessionMode,
          isDemoContent: isDemo,
          isReviewedResearchContent: !isDemo,
          startedAt: new Date(completedSession.startedAt).toISOString(),
          completedAt: completedSession.completedAt
            ? new Date(completedSession.completedAt).toISOString()
            : new Date().toISOString(),
          status: 'completed',
          durationSeconds: completedSession.durationSeconds,
          scorePercent: accuracyPercent,
          interactionCompleted: true,
          assessmentPassed:
            accuracyPercent >= (selectedCourse.passingScore || 80),
          metadata: {
            difficultyAfter: updatedDifficulty.currentDifficulty,
            sourceStatus: selectedCourse.sourceStatus,
          },
        })
      : null;

    const inResearch = isResearchModeActive();
    const effectiveCoinsAwarded =
      inResearch && unifiedOutput
        ? unifiedOutput.reward.coinsAwarded
        : rewardEvaluation.coinsAwarded;
    const effectiveDemoPoints =
      inResearch && unifiedOutput
        ? unifiedOutput.reward.demoPointsAwarded
        : rewardEvaluation.demoPointsAwarded;
    const effectiveRewardMessage =
      inResearch && unifiedOutput
        ? unifiedOutput.reward.reasonPersian
        : rewardEvaluation.reasonPersian;
    const effectiveRewardType: UniversityRewardType =
      inResearch && unifiedOutput
        ? unifiedOutput.reward.rewardType === 'demo_practice'
          ? 'demo_practice'
          : effectiveCoinsAwarded > 0
          ? 'official_research'
          : 'none'
        : rewardEvaluation.rewardType;

    let medalMessage =
      'این جلسه در حالت «تمرین و یادگیری» به پایان رسید. برای کسب نشان علمی، پس از بارگذاری منبع رسمی وارد «آزمون مستقیم» شوید.';
    let awardedMedalTitle: string | undefined;

    if (sessionMode === 'exam') {
      const examOutcome = universityAdapter.recordExamAttempt({
        playerId: profile.id,
        course: selectedCourse,
        lessonId: selectedLesson.id,
        templateType: activeTemplate,
        scorePercent: accuracyPercent,
        isDemoAttempt: isDemo,
        rewardType: effectiveRewardType,
        coinsAwarded: effectiveCoinsAwarded,
        demoPointsAwarded: effectiveDemoPoints,
      });
      medalMessage = examOutcome.medalCheck.reasonPersian;
      if (examOutcome.awardedMedal) {
        awardedMedalTitle = examOutcome.awardedMedal.courseTitle;
      }
    }

    if (effectiveCoinsAwarded > 0 && !isDemo && onRewardCoins) {
      onRewardCoins(effectiveCoinsAwarded);
    }

    setLastResult({
      accuracyPercent,
      durationSeconds,
      passed: accuracyPercent >= (selectedCourse.passingScore || 80),
      medalMessage,
      awardedMedalTitle,
      rewardMessage: effectiveRewardMessage,
      rewardType: effectiveRewardType,
      coinsAwarded: effectiveCoinsAwarded,
      demoPointsAwarded: effectiveDemoPoints,
    });
    setRefreshTick((t) => t + 1);
    setNavStep('session_results');
  };

  const handleImportCoursePackage = (pkg: UniversityContentPackage) => {
    const mergedCourse = universityAdapter.importCoursePackage(pkg);
    const updatedList = universityAdapter.listCourses();
    setCourses(updatedList);
    const matched =
      updatedList.find((c) => c.id === mergedCourse.id) ||
      mergedCourse ||
      updatedList[0];
    setSelectedCourse(matched);
    if (matched.lessons.length > 0) {
      const importedLessonId = pkg.course.lessons[0]?.id;
      const targetLesson =
        (importedLessonId &&
          matched.lessons.find((l) => l.id === importedLessonId)) ||
        matched.lessons.find((l) => l.id === selectedLesson?.id) ||
        matched.lessons[0];
      setSelectedLesson(targetLesson);
    }
    setRefreshTick((t) => t + 1);
  };

  const handleFixedBack = () => {
    if (navStep === 'game_session' || navStep === 'session_results') {
      handleExitGameSession('template_selection');
    } else if (navStep === 'template_selection') {
      handleExitGameSession('course_overview');
    } else if (navStep === 'course_overview') {
      handleExitGameSession('entrance_courses');
    } else {
      sound.playClick();
      abandonActiveSessionIfAny();
      onBackToWorld();
    }
  };

  return (
    <div
      lang="fa"
      dir="rtl"
      data-refresh={refreshTick}
      className="w-full min-h-full pb-28 pt-2 px-2.5 sm:px-6 text-slate-100 select-none"
    >
      <div className="max-w-4xl mx-auto space-y-4">
        {/* =========================================================================
            STICKY & CLEAN UNIVERSITY TOP BAR
           ========================================================================= */}
        <div className="sticky top-2 z-40 rounded-3xl border-2 border-[#f59e0b]/90 bg-gradient-to-b from-[#143026] via-[#0e231c] to-[#081712] backdrop-blur-md px-4 py-3 shadow-[0_8px_22px_rgba(0,0,0,0.45),0_3px_0_#451a03] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/Neon-Lime_Winged_Book_Emblem_9f21e0f4.png"
              alt="لوگوی دانشگاه انجلرن"
              className="w-10 h-10 rounded-full object-cover border-2 border-lime-400/80 shadow-sm shrink-0"
            />
            <div>
              <h1 className="text-base sm:text-lg font-black text-amber-200 leading-tight">
                {navStep === 'entrance_courses'
                  ? 'دانشگاه انجلرن'
                  : selectedCourse.title}
              </h1>
              {navStep !== 'entrance_courses' && (
                <span className="text-[11px] font-bold text-slate-200 block">
                  {selectedLesson.title}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#071611] border border-[#f59e0b]/70 px-3 py-1.5 rounded-xl text-amber-200 text-xs font-black">
              <Award className="w-4 h-4 text-amber-300" />
              <span>{playerMedals.length} نشان</span>
            </div>

            {navStep !== 'entrance_courses' && (
              <button
                onClick={handleFixedBack}
                className="px-3.5 py-2 rounded-xl bg-[#0a1e16] hover:bg-[#193b2e] border border-emerald-500/50 text-slate-100 font-black text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>بازگشت</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => {
                sound.playClick();
                abandonActiveSessionIfAny();
                onBackToWorld();
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-[#fef08a] via-[#fbbf24] to-[#f59e0b] hover:brightness-105 text-slate-950 font-black text-xs flex items-center gap-1.5 border border-amber-200 shadow-[0_2px_0_#78350f] cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>نقشه جهان</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            FIXED PERSISTENT BACK BUTTON (Always visible in bottom-left corner)
           ========================================================================= */}
        <div className="fixed bottom-3 sm:bottom-4 left-3 sm:left-5 z-[80] pointer-events-auto">
          <button
            type="button"
            onClick={handleFixedBack}
            aria-label={navStep === 'entrance_courses' ? 'بازگشت به صفحه جهان' : 'بازگشت به منوی قبلی'}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:brightness-105 active:translate-y-[2px] text-slate-950 font-black text-xs sm:text-sm border-2 border-[#fef08a] shadow-[0_5px_0_#451a03,0_12px_24px_rgba(0,0,0,0.85)] cursor-pointer transition-all"
          >
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.6]" />
            <span>{navStep === 'entrance_courses' ? 'بازگشت به جهان' : 'بازگشت به قبل'}</span>
          </button>
        </div>

        {/* =========================================================================
            STEP 1: SIMPLE & CLEAN COURSE SELECTION
           ========================================================================= */}
        {navStep === 'entrance_courses' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => {
              const hasMedal = playerMedals.some((m) => m.courseId === course.id);

              return (
                <div
                  key={course.id}
                  className="rounded-3xl bg-gradient-to-b from-[#143026] via-[#0e231c] to-[#081712] border-2 border-[#f59e0b]/85 hover:border-amber-300 p-5 shadow-[0_10px_24px_rgba(0,0,0,0.45),0_3px_0_#451a03] flex flex-col justify-between gap-4 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] p-0.5 shadow-sm shrink-0">
                          <div className="w-full h-full rounded-[14px] bg-[#071611] flex items-center justify-center text-2xl">
                            {course.coverIcon}
                          </div>
                        </div>
                        <div>
                          <h2 className="text-base sm:text-lg font-black text-amber-200">
                            {course.title}
                          </h2>
                          <p className="text-xs text-slate-200 font-bold mt-0.5">
                            {course.lessons.length} لکچر · ۶ بازی تعاملی
                          </p>
                        </div>
                      </div>

                      {hasMedal && (
                        <span className="text-2xl" title={course.medalConfig.title}>
                          {course.medalConfig.artworkIcon}
                        </span>
                      )}
                    </div>

                    {/* Quick Lesson Buttons */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {course.lessons.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setSelectedCourse(course);
                            setSelectedLesson(l);
                            setNavStep('course_overview');
                          }}
                          className="text-xs font-bold bg-[#071611] hover:bg-[#193b2e] border border-emerald-500/50 text-slate-100 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                        >
                          {l.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectCourse(course)}
                    className="w-full py-3 rounded-2xl bg-gradient-to-b from-[#fef08a] via-[#fbbf24] to-[#f59e0b] hover:brightness-105 text-slate-950 font-black text-xs sm:text-sm border-2 border-amber-200 shadow-[0_3px_0_#78350f] active:translate-y-0.5 cursor-pointer transition-all"
                  >
                    ورود به درس ←
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================================================================
            STEP 2: CLEAN LESSON SELECTION & MODE LAUNCH
           ========================================================================= */}
        {navStep === 'course_overview' && (
          <div className="rounded-3xl bg-gradient-to-b from-[#143026] via-[#0e231c] to-[#081712] border-2 border-[#f59e0b]/90 p-4 sm:p-6 shadow-[0_12px_30px_rgba(0,0,0,0.45),0_3px_0_#451a03] space-y-5">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-amber-200 mb-2.5">
                ۱. لکچر مورد نظر را انتخاب کنید:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedCourse.lessons.map((lesson) => {
                  const isSelected = selectedLesson.id === lesson.id;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setSelectedLesson(lesson);
                      }}
                      className={`p-4 rounded-2xl border-2 text-right flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#193b2e] border-amber-300 shadow-sm'
                          : 'bg-[#071611] hover:bg-[#112920] border-emerald-500/45'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-amber-200">
                          {lesson.title}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                        {lesson.summary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clean Dual Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleStartLearning}
                className="py-3.5 px-4 rounded-2xl bg-gradient-to-b from-emerald-200 via-emerald-300 to-teal-300 hover:brightness-105 text-slate-950 font-black text-sm flex items-center justify-center gap-2 border-2 border-emerald-100 shadow-[0_3px_0_#0f766e] active:translate-y-0.5 cursor-pointer transition-all"
              >
                <BookOpen className="w-5 h-5 shrink-0" />
                <span>شروع تمرین و بازی</span>
              </button>

              <button
                onClick={handleEnterExamDirectly}
                className="py-3.5 px-4 rounded-2xl bg-gradient-to-b from-[#fef08a] via-[#fbbf24] to-[#f59e0b] hover:brightness-105 text-slate-950 font-black text-sm flex items-center justify-center gap-2 border-2 border-amber-200 shadow-[0_3px_0_#78350f] active:translate-y-0.5 cursor-pointer transition-all"
              >
                <Play className="w-5 h-5 fill-slate-950 shrink-0" />
                <span>ورود به آزمون</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 3: CLEAN 6 GAME TEMPLATES GRID
           ========================================================================= */}
        {navStep === 'template_selection' && (
          <div className="space-y-4">
            {/* Compact Mode & Lecture Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#081712] border-2 border-[#f59e0b]/85 px-4 py-3 rounded-2xl shadow-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedCourse.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedLesson(lesson);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      selectedLesson.id === lesson.id
                        ? 'bg-gradient-to-b from-[#fde68a] to-[#f59e0b] text-slate-950 border border-amber-200'
                        : 'bg-[#143026] hover:bg-[#193b2e] text-slate-100 border border-emerald-500/45'
                    }`}
                  >
                    {lesson.title}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setSessionMode((m) => (m === 'practice' ? 'exam' : 'practice'));
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                  sessionMode === 'exam'
                    ? 'bg-amber-950/90 border-amber-400 text-amber-200'
                    : 'bg-[#143026] border-emerald-400 text-emerald-100'
                }`}
              >
                {sessionMode === 'exam' ? '🎯 حالت آزمون' : '🌱 حالت تمرین'}
              </button>
            </div>

            {/* 6 Clean Game Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {ALL_TEMPLATE_TYPES.map((tplType) => {
                const meta = TEMPLATE_METADATA[tplType];

                return (
                  <button
                    key={tplType}
                    type="button"
                    onClick={() => handleLaunchTemplate(tplType)}
                    className="rounded-3xl bg-gradient-to-b from-[#143026] via-[#0e231c] to-[#081712] border-2 border-[#f59e0b]/85 hover:border-amber-300 p-4 shadow-[0_8px_18px_rgba(0,0,0,0.45),0_3px_0_#451a03] flex flex-col justify-between text-right cursor-pointer group transition-all hover:scale-[1.01]"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${meta.themeColor} border border-white/60 flex items-center justify-center text-2xl shadow group-hover:scale-110 transition-transform shrink-0`}
                        >
                          {meta.icon}
                        </div>
                        <h3 className="text-sm sm:text-base font-black text-amber-200">
                          {meta.persianName}
                        </h3>
                      </div>

                      <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                        {meta.shortDesc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-emerald-600/40 flex items-center justify-end">
                      <span className="px-3.5 py-1 rounded-xl bg-gradient-to-b from-[#fef08a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs border border-amber-200">
                        شروع ←
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 4: ACTIVE GAME TEMPLATE SESSION
           ========================================================================= */}
        {navStep === 'game_session' && (() => {
          const currentContent = universityAdapter.getGameContent(
            selectedCourse.id,
            selectedLesson.id,
            activeTemplate
          );

          if (!currentContent) {
            return (
              <div className="max-w-xl mx-auto rounded-[28px] bg-gradient-to-b from-[#143026] to-[#081712] border-2 border-[#f59e0b] p-6 sm:p-8 shadow-2xl text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-950/80 border border-amber-400/60 flex items-center justify-center text-amber-300">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-amber-200">
                  محتوای این فعالیت موجود نیست
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  برای درس «{selectedCourse.title}»، سرفصل «{selectedLesson.title}» و قالب «{TEMPLATE_METADATA[activeTemplate].persianName}» هنوز محتوای معتبری ثبت نشده است.
                </p>
                <button
                  onClick={() => handleExitGameSession('template_selection')}
                  className="min-h-[46px] px-6 py-2.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs sm:text-sm border-2 border-[#fef08a] shadow-[0_3px_0_#78350f] cursor-pointer"
                >
                  بازگشت به انتخاب قالب بازی ←
                </button>
              </div>
            );
          }

          return (
            <div>
              {activeTemplate === 'read_and_answer' && (
                <ReadAndAnswerGame
                  content={currentContent as ReadAndAnswerContent}
                  mode={sessionMode}
                  onFinish={handleSessionFinished}
                  onBack={() => handleExitGameSession('template_selection')}
                />
              )}

              {activeTemplate === 'fill_in_blank' && (
                <FillInTheBlankGame
                  content={currentContent as FillInBlankContent}
                  mode={sessionMode}
                  onFinish={handleSessionFinished}
                  onBack={() => handleExitGameSession('template_selection')}
                />
              )}

              {activeTemplate === 'match_concepts' && (
                <MatchConceptsGame
                  content={currentContent as MatchConceptsContent}
                  mode={sessionMode}
                  onFinish={handleSessionFinished}
                  onBack={() => handleExitGameSession('template_selection')}
                />
              )}

              {activeTemplate === 'order_process' && (
                <OrderProcessGame
                  content={currentContent as OrderProcessContent}
                  mode={sessionMode}
                  onFinish={handleSessionFinished}
                  onBack={() => handleExitGameSession('template_selection')}
                />
              )}

              {activeTemplate === 'speed_reading' && (
                <SpeedReadingUniGame
                  content={currentContent as SpeedReadingContent}
                  mode={sessionMode}
                  onFinish={handleSessionFinished}
                  onBack={() => handleExitGameSession('template_selection')}
                />
              )}

              {activeTemplate === 'scientific_memory' && (
                <ScientificMemoryGame
                  content={currentContent as ScientificMemoryContent}
                  difficulty={
                    universityAdapter.getTemplateDifficulty(
                      profile.id,
                      selectedCourse.id,
                      'scientific_memory'
                    ).currentDifficulty
                  }
                  mode={sessionMode}
                  onFinish={handleSessionFinished}
                  onBack={() => handleExitGameSession('template_selection')}
                />
              )}
            </div>
          );
        })()}

        {/* =========================================================================
            STEP 5: SESSION RESULTS & MEDAL STATUS SUMMARY
           ========================================================================= */}
        {navStep === 'session_results' && lastResult && (
          <div className="max-w-2xl mx-auto rounded-[28px] bg-gradient-to-b from-[#143026] via-[#0e231c] to-[#081712] border-2 border-[#f59e0b] p-5 sm:p-7 shadow-[0_14px_34px_rgba(0,0,0,0.45),0_4px_0_#451a03] text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-b from-[#fde68a] to-[#f59e0b] text-slate-950 flex items-center justify-center text-4xl border-2 border-[#fef08a] shadow-[0_4px_0_#78350f]">
              <Trophy className="w-8 h-8" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-amber-200">
              نتیجه نهایی جلسه «{TEMPLATE_METADATA[activeTemplate].persianName}»
            </h3>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-[#071611] border-2 border-emerald-500/45">
                <span className="text-slate-200 block mb-0.5">نمره و دقت</span>
                <strong className="text-base text-amber-300 font-black">
                  {lastResult.accuracyPercent}٪
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-[#071611] border-2 border-emerald-500/45">
                <span className="text-slate-200 block mb-0.5">زمان صرف‌شده</span>
                <strong className="text-base text-slate-50 font-black">
                  {lastResult.durationSeconds} ثانیه
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-[#071611] border-2 border-emerald-500/45">
                <span className="text-slate-200 block mb-0.5">وضعیت حدنصاب</span>
                <strong
                  className={`text-base font-black ${
                    lastResult.passed ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {lastResult.passed ? 'قبول (≥۸۰٪)' : 'نیازمند تمرین'}
                </strong>
              </div>
            </div>

            {/* Reward Status Banner */}
            <div
              className={`p-3.5 rounded-2xl border-2 text-xs font-black leading-relaxed ${
                lastResult.rewardType === 'official_research'
                  ? 'bg-[#0a1e16] border-emerald-400/60 text-emerald-100'
                  : lastResult.rewardType === 'demo_practice'
                  ? 'bg-[#0c2233] border-sky-400/60 text-sky-100'
                  : 'bg-[#071611] border-emerald-500/45 text-slate-100'
              }`}
            >
              {lastResult.rewardMessage}
            </div>

            {/* Medal Evaluation Notice */}
            <div className="p-3.5 rounded-2xl bg-[#071611] border-2 border-amber-400/55 text-xs text-amber-100 leading-relaxed">
              {lastResult.medalMessage}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={() => handleLaunchTemplate(activeTemplate)}
                className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-gradient-to-b from-emerald-200 to-teal-300 hover:brightness-105 border-2 border-emerald-100 text-slate-950 font-black text-xs shadow-[0_3px_0_#0f766e] cursor-pointer"
              >
                تکرار همین قالب بازی
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setNavStep('template_selection');
                }}
                className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-gradient-to-b from-[#fef08a] via-[#fbbf24] to-[#f59e0b] text-slate-950 font-black text-xs border-2 border-amber-200 shadow-[0_3px_0_#78350f] cursor-pointer"
              >
                انتخاب سایر قالب‌های بازی (۶ قالب)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Schema Importer & Validator Modal */}
      {isImporterOpen && (
        <ContentImporterModal
          onImportSuccess={handleImportCoursePackage}
          onClose={() => setIsImporterOpen(false)}
        />
      )}
    </div>
  );
};
