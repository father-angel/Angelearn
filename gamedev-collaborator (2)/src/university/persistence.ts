/**
 * AngelLearn University Module - Data Persistence & Integration Adapter
 * Connects the University Module to AngelLearn's UserProfile & LocalStorage
 */

import { UserProfile } from '../types/game';
import { loadProfile, getTodayDateString } from '../utils/storage';
import {
  AnyTemplateContent,
  AwardedMedalRecord,
  DifficultyLevel,
  ExamAttemptRecord,
  GameSessionRecord,
  GameTemplateType,
  SessionLifecycleStatus,
  TemplateDifficultyRecord,
  UniversityContentPackage,
  UniversityCourse,
  UniversityLesson,
  UniversityRewardType,
} from './types';
import {
  INITIAL_TEMPLATE_CONTENTS,
  INITIAL_UNIVERSITY_COURSES,
} from './demoData';
import { NPD_COURSE_LESSONS } from './npdLecturesData';
import {
  canAwardOfficialMedal,
  computeNextDifficulty,
  evaluateUniversityReward,
  findMatchingGameContent,
} from './engine';

export const CANONICAL_NPD_COURSE_ID = 'course_new_product_development';
export const LEGACY_NPD_COURSE_ID = 'course_innovation_mgmt';
export const CANONICAL_NPD_COURSE_TITLE = 'توسعه محصول';

const UNI_STORAGE_KEYS = {
  COURSES: 'angellearn_uni_courses_v2',
  CONTENTS: 'angellearn_uni_contents_v2',
  DIFFICULTY: 'angellearn_uni_difficulty_v1',
  SESSIONS: 'angellearn_uni_sessions_v1',
  EXAMS: 'angellearn_uni_exams_v1',
  MEDALS: 'angellearn_uni_medals_v1',
  REWARDED_ACTIVITIES: 'angellearn_uni_rewarded_activities_v1',
  DEMO_POINTS: 'angellearn_uni_demo_points_v1',
};

/**
 * Maps legacy 'course_innovation_mgmt' to the canonical 'course_new_product_development' ID.
 * Leaves all unrelated course IDs untouched.
 */
export function normalizeUniversityCourseId(courseId: string): string {
  if (!courseId) return courseId;
  const trimmed = courseId.trim();
  if (trimmed === LEGACY_NPD_COURSE_ID || trimmed === CANONICAL_NPD_COURSE_ID) {
    return CANONICAL_NPD_COURSE_ID;
  }
  return trimmed;
}

/**
 * Non-destructively merges existing and incoming lessons for a course by lesson.id.
 * Preserves existing lessons (e.g., Lecture 1 when Lecture 2 is imported), updates matching lessons,
 * normalizes courseId, and sorts by lesson.order ascending.
 */
export function mergeCourseLessons(
  existingLessons: UniversityLesson[],
  incomingLessons: UniversityLesson[],
  targetCourseId: string
): UniversityLesson[] {
  const normalizedCourseId = normalizeUniversityCourseId(targetCourseId);
  const byId = new Map<string, UniversityLesson>();

  for (const lesson of existingLessons) {
    if (!lesson || !lesson.id) continue;
    byId.set(lesson.id, {
      ...lesson,
      courseId: normalizedCourseId,
    });
  }

  for (const lesson of incomingLessons) {
    if (!lesson || !lesson.id) continue;
    const prev = byId.get(lesson.id);
    byId.set(lesson.id, {
      ...prev,
      ...lesson,
      courseId: normalizedCourseId,
    });
  }

  return Array.from(byId.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Non-destructively merges incoming template contents into existing contents.
 * Normalizes legacy NPD courseId to 'course_new_product_development', updates matching
 * (courseId, lessonId, templateType) or content.id items, and preserves all other lessons/courses.
 */
export function mergeCourseContents(
  existingContents: AnyTemplateContent[],
  incomingContents: AnyTemplateContent[]
): AnyTemplateContent[] {
  const normalizeItem = (item: AnyTemplateContent): AnyTemplateContent => {
    if (item.lessonId === 'lesson_innov_sandbox_1') {
      return { ...item, courseId: 'course_demo_sandbox' };
    }
    if (
      item.courseId === LEGACY_NPD_COURSE_ID ||
      item.courseId === CANONICAL_NPD_COURSE_ID ||
      item.lessonId?.startsWith('lesson_npd_')
    ) {
      return { ...item, courseId: CANONICAL_NPD_COURSE_ID };
    }
    return {
      ...item,
      courseId: normalizeUniversityCourseId(item.courseId),
    };
  };

  const normalizedExisting = existingContents.map(normalizeItem);
  const normalizedIncoming = incomingContents.map(normalizeItem);

  const incomingIds = new Set(normalizedIncoming.map((c) => c.id));
  const incomingCompositeKeys = new Set(
    normalizedIncoming.map((c) => `${c.courseId}::${c.lessonId}::${c.templateType}`)
  );

  // Deduplicate normalizedIncoming itself in case the package had duplicates
  const deduplicatedIncoming: AnyTemplateContent[] = [];
  const seenIncomingKeys = new Set<string>();
  for (const item of normalizedIncoming) {
    const compKey = `${item.courseId}::${item.lessonId}::${item.templateType}`;
    if (seenIncomingKeys.has(item.id) || seenIncomingKeys.has(compKey)) continue;
    seenIncomingKeys.add(item.id);
    seenIncomingKeys.add(compKey);
    deduplicatedIncoming.push(item);
  }

  // Keep existing items that are not replaced by incoming id or (courseId, lessonId, templateType)
  const preservedExisting: AnyTemplateContent[] = [];
  const seenExistingKeys = new Set<string>();
  for (const item of normalizedExisting) {
    const compKey = `${item.courseId}::${item.lessonId}::${item.templateType}`;
    if (incomingIds.has(item.id) || incomingCompositeKeys.has(compKey)) {
      continue;
    }
    if (seenExistingKeys.has(item.id) || seenExistingKeys.has(compKey)) {
      continue;
    }
    seenExistingKeys.add(item.id);
    seenExistingKeys.add(compKey);
    preservedExisting.push(item);
  }

  return [...deduplicatedIncoming, ...preservedExisting];
}

function makeActivityRewardKey(
  playerId: string,
  courseId: string,
  lessonId: string,
  templateType: GameTemplateType,
  mode: 'practice' | 'exam'
): string {
  const canonicalCourseId = normalizeUniversityCourseId(courseId);
  return `${playerId}::${canonicalCourseId}::${lessonId}::${templateType}::${mode}`;
}

/**
 * Safely migrates any legacy 'course_innovation_mgmt' courses, lessons, contents, and user progress
 * in localStorage to the canonical 'course_new_product_development' course («توسعه محصول»)
 * without deleting user progress or affecting unrelated courses.
 */
export function migrateUniversityStorage(): void {
  try {
    // 1. Migrate & deduplicate courses
    const rawCourses = localStorage.getItem(UNI_STORAGE_KEYS.COURSES);
    if (rawCourses) {
      const parsedCourses = JSON.parse(rawCourses) as UniversityCourse[];
      if (Array.isArray(parsedCourses) && parsedCourses.length > 0) {
        const canonicalNpdBase = INITIAL_UNIVERSITY_COURSES[0];
        let mergedNpdCourse: UniversityCourse | null = null;
        const unrelatedCourses: UniversityCourse[] = [];

        for (const c of parsedCourses) {
          if (!c || !c.id) continue;
          const normId = normalizeUniversityCourseId(c.id);
          if (normId === CANONICAL_NPD_COURSE_ID) {
            const baseCourse: UniversityCourse = mergedNpdCourse ?? canonicalNpdBase;
            const baseLessons: UniversityLesson[] = mergedNpdCourse
              ? mergedNpdCourse.lessons
              : NPD_COURSE_LESSONS;
            mergedNpdCourse = {
              ...baseCourse,
              ...c,
              id: CANONICAL_NPD_COURSE_ID,
              title: CANONICAL_NPD_COURSE_TITLE,
              englishTitle: c.englishTitle || baseCourse.englishTitle,
              medalConfig: {
                ...baseCourse.medalConfig,
                ...(c.medalConfig ? c.medalConfig : {}),
                medalId: 'medal_new_product_development',
                title: 'نشان علمی توسعه محصول',
              },
              lessons: mergeCourseLessons(
                baseLessons,
                Array.isArray(c.lessons) ? c.lessons : [],
                CANONICAL_NPD_COURSE_ID
              ),
            };
          } else {
            // Preserve unrelated courses (e.g. course_demo_sandbox or other imported courses)
            if (!unrelatedCourses.some((u) => u.id === c.id)) {
              unrelatedCourses.push(c);
            }
          }
        }

        const finalCourses: UniversityCourse[] = [
          mergedNpdCourse || canonicalNpdBase,
          ...unrelatedCourses,
        ];
        // Ensure sandbox course is still present if it was in initial courses
        if (!finalCourses.some((c) => c.id === 'course_demo_sandbox')) {
          finalCourses.push(INITIAL_UNIVERSITY_COURSES[1]);
        }
        localStorage.setItem(UNI_STORAGE_KEYS.COURSES, JSON.stringify(finalCourses));
      }
    }

    // 2. Migrate & ensure complete template contents (Lecture 1 + Lecture 2 + custom imports)
    const rawContents = localStorage.getItem(UNI_STORAGE_KEYS.CONTENTS);
    if (rawContents) {
      const parsedContents = JSON.parse(rawContents) as AnyTemplateContent[];
      if (Array.isArray(parsedContents) && parsedContents.length > 0) {
        // Start with baseline contents (Lecture 1 + Lecture 2 + Demo Sandbox) and overlay stored contents
        // so stored custom/updated contents win, while any missing Lecture 1/2 content is restored.
        const migratedContents = mergeCourseContents(
          INITIAL_TEMPLATE_CONTENTS,
          parsedContents
        );
        localStorage.setItem(
          UNI_STORAGE_KEYS.CONTENTS,
          JSON.stringify(migratedContents)
        );
      }
    }

    // 3. Migrate difficulty records
    const rawDiff = localStorage.getItem(UNI_STORAGE_KEYS.DIFFICULTY);
    if (rawDiff) {
      const parsedDiff = JSON.parse(rawDiff) as TemplateDifficultyRecord[];
      if (Array.isArray(parsedDiff)) {
        const diffMap = new Map<string, TemplateDifficultyRecord>();
        for (const r of parsedDiff) {
          if (!r || typeof r !== 'object') continue;
          const normCourseId = normalizeUniversityCourseId(r.courseId);
          const key = `${r.playerId}::${normCourseId}::${r.templateType}`;
          const existing = diffMap.get(key);
          if (!existing) {
            diffMap.set(key, { ...r, courseId: normCourseId });
          } else {
            diffMap.set(key, {
              playerId: r.playerId,
              courseId: normCourseId,
              templateType: r.templateType,
              currentDifficulty: Math.max(
                existing.currentDifficulty,
                r.currentDifficulty
              ) as DifficultyLevel,
              attempts: Math.max(existing.attempts, r.attempts),
              bestAccuracy: Math.max(existing.bestAccuracy, r.bestAccuracy),
              lastAccuracy:
                (r.lastPlayedAt || '') >= (existing.lastPlayedAt || '')
                  ? r.lastAccuracy
                  : existing.lastAccuracy,
              bestTimeSeconds:
                existing.bestTimeSeconds === 0
                  ? r.bestTimeSeconds
                  : r.bestTimeSeconds === 0
                  ? existing.bestTimeSeconds
                  : Math.min(existing.bestTimeSeconds, r.bestTimeSeconds),
              lastPlayedAt:
                (r.lastPlayedAt || '') >= (existing.lastPlayedAt || '')
                  ? r.lastPlayedAt
                  : existing.lastPlayedAt,
            });
          }
        }
        localStorage.setItem(
          UNI_STORAGE_KEYS.DIFFICULTY,
          JSON.stringify(Array.from(diffMap.values()))
        );
      }
    }

    // 4. Migrate sessions
    const rawSessions = localStorage.getItem(UNI_STORAGE_KEYS.SESSIONS);
    if (rawSessions) {
      const parsedSessions = JSON.parse(rawSessions) as GameSessionRecord[];
      if (Array.isArray(parsedSessions)) {
        const migratedSessions = parsedSessions.map((s) => ({
          ...s,
          courseId: normalizeUniversityCourseId(s.courseId),
        }));
        localStorage.setItem(
          UNI_STORAGE_KEYS.SESSIONS,
          JSON.stringify(migratedSessions)
        );
      }
    }

    // 5. Migrate exams
    const rawExams = localStorage.getItem(UNI_STORAGE_KEYS.EXAMS);
    if (rawExams) {
      const parsedExams = JSON.parse(rawExams) as ExamAttemptRecord[];
      if (Array.isArray(parsedExams)) {
        const migratedExams = parsedExams.map((e) => ({
          ...e,
          courseId: normalizeUniversityCourseId(e.courseId),
        }));
        localStorage.setItem(UNI_STORAGE_KEYS.EXAMS, JSON.stringify(migratedExams));
      }
    }

    // 6. Migrate medals
    const rawMedals = localStorage.getItem(UNI_STORAGE_KEYS.MEDALS);
    if (rawMedals) {
      const parsedMedals = JSON.parse(rawMedals) as AwardedMedalRecord[];
      if (Array.isArray(parsedMedals)) {
        const medalMap = new Map<string, AwardedMedalRecord>();
        for (const m of parsedMedals) {
          if (!m || typeof m !== 'object') continue;
          const normCourseId = normalizeUniversityCourseId(m.courseId);
          const key = `${m.playerId}::${normCourseId}`;
          if (!medalMap.has(key)) {
            medalMap.set(key, {
              ...m,
              courseId: normCourseId,
              courseTitle:
                normCourseId === CANONICAL_NPD_COURSE_ID
                  ? CANONICAL_NPD_COURSE_TITLE
                  : m.courseTitle,
            });
          }
        }
        localStorage.setItem(
          UNI_STORAGE_KEYS.MEDALS,
          JSON.stringify(Array.from(medalMap.values()))
        );
      }
    }

    // 7. Migrate rewarded activity keys
    const rawRewards = localStorage.getItem(UNI_STORAGE_KEYS.REWARDED_ACTIVITIES);
    if (rawRewards) {
      const parsedKeys = JSON.parse(rawRewards) as string[];
      if (Array.isArray(parsedKeys)) {
        const migratedKeys = Array.from(
          new Set(
            parsedKeys.map((k) =>
              typeof k === 'string'
                ? k.replace(
                    `::${LEGACY_NPD_COURSE_ID}::`,
                    `::${CANONICAL_NPD_COURSE_ID}::`
                  )
                : k
            )
          )
        );
        localStorage.setItem(
          UNI_STORAGE_KEYS.REWARDED_ACTIVITIES,
          JSON.stringify(migratedKeys)
        );
      }
    }
  } catch {
    // Ignore storage parse/quota issues
  }
}

export const universityAdapter = {
  getCurrentPlayer(): UserProfile {
    return loadProfile();
  },

  listCourses(): UniversityCourse[] {
    migrateUniversityStorage();
    try {
      const raw = localStorage.getItem(UNI_STORAGE_KEYS.COURSES);
      if (raw) {
        const parsed = JSON.parse(raw) as UniversityCourse[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to initial courses
    }
    return INITIAL_UNIVERSITY_COURSES;
  },

  getCourse(courseId: string): UniversityCourse | undefined {
    const normalizedId = normalizeUniversityCourseId(courseId);
    const courses = this.listCourses();
    return courses.find((c) => c.id === normalizedId);
  },

  getLessons(courseId: string): UniversityLesson[] {
    const course = this.getCourse(courseId);
    return course ? course.lessons : [];
  },

  listAllContents(): AnyTemplateContent[] {
    migrateUniversityStorage();
    try {
      const raw = localStorage.getItem(UNI_STORAGE_KEYS.CONTENTS);
      if (raw) {
        const parsed = JSON.parse(raw) as AnyTemplateContent[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeCourseContents(INITIAL_TEMPLATE_CONTENTS, parsed);
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_TEMPLATE_CONTENTS;
  },

  /**
   * Strictly retrieves content matching courseId, lessonId, and templateType.
   * NEVER falls back to another lesson's or course's content.
   */
  getGameContent<T extends AnyTemplateContent>(
    courseIdOrLessonId: string,
    lessonIdOrTemplate: string,
    maybeTemplateType?: GameTemplateType
  ): T | undefined {
    const all = this.listAllContents();
    if (maybeTemplateType) {
      const normalizedCourseId = normalizeUniversityCourseId(courseIdOrLessonId);
      return findMatchingGameContent<T>(
        all,
        normalizedCourseId,
        lessonIdOrTemplate,
        maybeTemplateType
      );
    }
    // 2-argument call compatibility: still strictly requires matching lessonId + templateType (never falls back to another lesson)
    const lessonId = courseIdOrLessonId;
    const templateType = lessonIdOrTemplate as GameTemplateType;
    const exactLessonMatch = all.find(
      (c) => c.lessonId === lessonId && c.templateType === templateType
    );
    return exactLessonMatch as T | undefined;
  },

  getTemplateDifficulty(
    playerId: string,
    courseId: string,
    templateType: GameTemplateType
  ): TemplateDifficultyRecord {
    const normalizedCourseId = normalizeUniversityCourseId(courseId);
    const all = this.listDifficultyRecords();
    const found = all.find(
      (r) =>
        r.playerId === playerId &&
        r.courseId === normalizedCourseId &&
        r.templateType === templateType
    );
    if (found) return found;
    return {
      playerId,
      courseId: normalizedCourseId,
      templateType,
      currentDifficulty: 1,
      attempts: 0,
      bestAccuracy: 0,
      lastAccuracy: 0,
      bestTimeSeconds: 0,
      lastPlayedAt: '',
    };
  },

  listDifficultyRecords(): TemplateDifficultyRecord[] {
    migrateUniversityStorage();
    try {
      const raw = localStorage.getItem(UNI_STORAGE_KEYS.DIFFICULTY);
      return raw ? (JSON.parse(raw) as TemplateDifficultyRecord[]) : [];
    } catch {
      return [];
    }
  },

  listSessions(
    playerId?: string,
    statusFilter?: SessionLifecycleStatus
  ): GameSessionRecord[] {
    migrateUniversityStorage();
    try {
      const raw = localStorage.getItem(UNI_STORAGE_KEYS.SESSIONS);
      const list: GameSessionRecord[] = raw ? JSON.parse(raw) : [];
      return list.filter(
        (s) =>
          (!playerId || s.playerId === playerId) &&
          (!statusFilter || s.status === statusFilter)
      );
    } catch {
      return [];
    }
  },

  /**
   * Called at the actual start of a learning/exam activity.
   * Immediately records an 'in_progress' session in storage with startedAt timestamp.
   */
  startSession(
    playerId: string,
    courseId: string,
    lessonId: string,
    templateType: GameTemplateType,
    mode: 'practice' | 'exam',
    isDemoSession: boolean
  ): GameSessionRecord {
    const normalizedCourseId = normalizeUniversityCourseId(courseId);
    const newSession: GameSessionRecord = {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      playerId,
      courseId: normalizedCourseId,
      lessonId,
      templateType,
      mode,
      status: 'in_progress',
      startedAt: Date.now(),
      durationSeconds: 0,
      accuracyPercent: 0,
      scoreEarned: 0,
      passed: false,
      isDemoSession,
      rewardType: 'none',
      coinsAwarded: 0,
      demoPointsAwarded: 0,
    };

    try {
      const existingRaw = localStorage.getItem(UNI_STORAGE_KEYS.SESSIONS);
      const list: GameSessionRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
      list.unshift(newSession);
      localStorage.setItem(
        UNI_STORAGE_KEYS.SESSIONS,
        JSON.stringify(list.slice(0, 80))
      );
    } catch {
      // Ignore storage quota issues
    }

    return newSession;
  },

  /**
   * Marks an active in-progress session as abandoned when the user leaves mid-activity.
   * Records abandonedAt, endedAt, and elapsed durationSeconds.
   */
  abandonSession(
    sessionOrId: GameSessionRecord | string,
    explicitDurationSeconds?: number
  ): GameSessionRecord | undefined {
    const sessionId =
      typeof sessionOrId === 'string' ? sessionOrId : sessionOrId.sessionId;
    const endedAt = Date.now();

    try {
      const existingRaw = localStorage.getItem(UNI_STORAGE_KEYS.SESSIONS);
      const list: GameSessionRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
      const idx = list.findIndex((s) => s.sessionId === sessionId);
      const baseSession =
        idx >= 0
          ? list[idx]
          : typeof sessionOrId === 'object'
          ? sessionOrId
          : undefined;

      if (!baseSession) return undefined;
      if (baseSession.status === 'completed') return baseSession;

      const computedDuration =
        explicitDurationSeconds !== undefined
          ? Math.max(0, Math.round(explicitDurationSeconds))
          : Math.max(0, Math.round((endedAt - baseSession.startedAt) / 1000));

      const abandonedSession: GameSessionRecord = {
        ...baseSession,
        courseId: normalizeUniversityCourseId(baseSession.courseId),
        status: 'abandoned',
        abandonedAt: endedAt,
        endedAt,
        durationSeconds: computedDuration,
        passed: false,
      };

      if (idx >= 0) {
        list[idx] = abandonedSession;
      } else {
        list.unshift(abandonedSession);
      }

      localStorage.setItem(
        UNI_STORAGE_KEYS.SESSIONS,
        JSON.stringify(list.slice(0, 80))
      );
      return abandonedSession;
    } catch {
      return undefined;
    }
  },

  hasClaimedActivityReward(
    playerId: string,
    courseId: string,
    lessonId: string,
    templateType: GameTemplateType,
    mode: 'practice' | 'exam'
  ): boolean {
    const normalizedCourseId = normalizeUniversityCourseId(courseId);
    const key = makeActivityRewardKey(
      playerId,
      normalizedCourseId,
      lessonId,
      templateType,
      mode
    );
    try {
      const raw = localStorage.getItem(UNI_STORAGE_KEYS.REWARDED_ACTIVITIES);
      const keys: string[] = raw ? JSON.parse(raw) : [];
      if (keys.includes(key)) return true;
    } catch {
      // ignore
    }
    // Also check completed session history
    const completedBefore = this.listSessions(playerId, 'completed').some(
      (s) =>
        normalizeUniversityCourseId(s.courseId) === normalizedCourseId &&
        s.lessonId === lessonId &&
        s.templateType === templateType &&
        s.mode === mode &&
        s.passed
    );
    return completedBefore;
  },

  markActivityRewardClaimed(
    playerId: string,
    courseId: string,
    lessonId: string,
    templateType: GameTemplateType,
    mode: 'practice' | 'exam'
  ): void {
    const normalizedCourseId = normalizeUniversityCourseId(courseId);
    const key = makeActivityRewardKey(
      playerId,
      normalizedCourseId,
      lessonId,
      templateType,
      mode
    );
    try {
      const raw = localStorage.getItem(UNI_STORAGE_KEYS.REWARDED_ACTIVITIES);
      const keys: string[] = raw ? JSON.parse(raw) : [];
      if (!keys.includes(key)) {
        keys.push(key);
        localStorage.setItem(
          UNI_STORAGE_KEYS.REWARDED_ACTIVITIES,
          JSON.stringify(keys)
        );
      }
    } catch {
      // ignore
    }
  },

  getDemoPoints(playerId: string): number {
    try {
      const raw = localStorage.getItem(UNI_STORAGE_KEYS.DEMO_POINTS);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      return map[playerId] || 0;
    } catch {
      return 0;
    }
  },

  addDemoPoints(playerId: string, points: number): number {
    if (points <= 0) return this.getDemoPoints(playerId);
    try {
      const raw = localStorage.getItem(UNI_STORAGE_KEYS.DEMO_POINTS);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      const next = (map[playerId] || 0) + points;
      map[playerId] = next;
      localStorage.setItem(UNI_STORAGE_KEYS.DEMO_POINTS, JSON.stringify(map));
      return next;
    } catch {
      return 0;
    }
  },

  completeSession(
    session: GameSessionRecord,
    accuracyPercent: number,
    durationSeconds: number,
    passingScore = 80
  ): {
    completedSession: GameSessionRecord;
    updatedDifficulty: TemplateDifficultyRecord;
    rewardEvaluation: {
      eligibleForMainCoins: boolean;
      coinsAwarded: number;
      demoPointsAwarded: number;
      rewardType: UniversityRewardType;
      reasonPersian: string;
    };
  } {
    const normalizedCourseId = normalizeUniversityCourseId(session.courseId);
    const endedAt = Date.now();
    const passed = Math.round(accuracyPercent) >= passingScore;
    const alreadyRewarded = this.hasClaimedActivityReward(
      session.playerId,
      normalizedCourseId,
      session.lessonId,
      session.templateType,
      session.mode
    );

    const rewardEvaluation = evaluateUniversityReward({
      accuracyPercent,
      passingScore,
      isDemoContent: session.isDemoSession,
      alreadyRewardedForActivity: alreadyRewarded,
    });

    if (passed && !alreadyRewarded) {
      this.markActivityRewardClaimed(
        session.playerId,
        normalizedCourseId,
        session.lessonId,
        session.templateType,
        session.mode
      );
      if (rewardEvaluation.demoPointsAwarded > 0) {
        this.addDemoPoints(session.playerId, rewardEvaluation.demoPointsAwarded);
      }
    }

    const effectiveDuration =
      durationSeconds > 0
        ? Math.max(1, Math.round(durationSeconds))
        : Math.max(1, Math.round((endedAt - session.startedAt) / 1000));

    const completedSession: GameSessionRecord = {
      ...session,
      courseId: normalizedCourseId,
      status: 'completed',
      completedAt: endedAt,
      endedAt,
      durationSeconds: effectiveDuration,
      accuracyPercent: Math.round(accuracyPercent),
      scoreEarned: Math.round(accuracyPercent),
      passed,
      rewardType: rewardEvaluation.rewardType,
      coinsAwarded: rewardEvaluation.coinsAwarded,
      demoPointsAwarded: rewardEvaluation.demoPointsAwarded,
    };

    // Update or insert session in storage
    try {
      const existingRaw = localStorage.getItem(UNI_STORAGE_KEYS.SESSIONS);
      const list: GameSessionRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
      const existingIdx = list.findIndex((s) => s.sessionId === session.sessionId);
      if (existingIdx >= 0) {
        list[existingIdx] = completedSession;
      } else {
        list.unshift(completedSession);
      }
      localStorage.setItem(
        UNI_STORAGE_KEYS.SESSIONS,
        JSON.stringify(list.slice(0, 80))
      );
    } catch {
      // Ignore storage quota issues
    }

    // Update adaptive difficulty per player + course + template
    const currentDiff = this.getTemplateDifficulty(
      session.playerId,
      normalizedCourseId,
      session.templateType
    );
    const nextLevel: DifficultyLevel = computeNextDifficulty(
      currentDiff.currentDifficulty,
      accuracyPercent
    );
    const updatedDifficulty: TemplateDifficultyRecord = {
      ...currentDiff,
      courseId: normalizedCourseId,
      currentDifficulty: nextLevel,
      attempts: currentDiff.attempts + 1,
      bestAccuracy: Math.max(currentDiff.bestAccuracy, Math.round(accuracyPercent)),
      lastAccuracy: Math.round(accuracyPercent),
      bestTimeSeconds:
        currentDiff.bestTimeSeconds === 0
          ? completedSession.durationSeconds
          : Math.min(currentDiff.bestTimeSeconds, completedSession.durationSeconds),
      lastPlayedAt: new Date().toISOString(),
    };

    try {
      const allDiffs = this.listDifficultyRecords().filter(
        (r) =>
          !(
            r.playerId === session.playerId &&
            normalizeUniversityCourseId(r.courseId) === normalizedCourseId &&
            r.templateType === session.templateType
          )
      );
      allDiffs.push(updatedDifficulty);
      localStorage.setItem(UNI_STORAGE_KEYS.DIFFICULTY, JSON.stringify(allDiffs));
    } catch {
      // Ignore
    }

    return { completedSession, updatedDifficulty, rewardEvaluation };
  },

  recordExamAttempt(params: {
    playerId: string;
    course: UniversityCourse;
    lessonId?: string;
    templateType?: GameTemplateType;
    scorePercent: number;
    isDemoAttempt: boolean;
    rewardType?: UniversityRewardType;
    coinsAwarded?: number;
    demoPointsAwarded?: number;
  }): {
    attempt: ExamAttemptRecord;
    medalCheck: { eligible: boolean; reasonPersian: string };
    awardedMedal?: AwardedMedalRecord;
  } {
    const {
      playerId,
      course,
      lessonId,
      templateType,
      scorePercent,
      isDemoAttempt,
      rewardType = 'none',
      coinsAwarded = 0,
      demoPointsAwarded = 0,
    } = params;
    const normalizedCourseId = normalizeUniversityCourseId(course.id);
    const roundedScore = Math.round(scorePercent);
    const passed = roundedScore >= (course.passingScore || 80);

    const medalCheck = canAwardOfficialMedal({
      course,
      mode: 'exam',
      scorePercent: roundedScore,
      isDemoContent: isDemoAttempt,
    });

    let awardedMedal: AwardedMedalRecord | undefined;
    if (medalCheck.eligible && !isDemoAttempt) {
      awardedMedal = this.awardMedal(playerId, course, roundedScore);
    }

    const attempt: ExamAttemptRecord = {
      examAttemptId: `exam_${Date.now()}`,
      playerId,
      courseId: normalizedCourseId,
      lessonId,
      templateType,
      date: getTodayDateString(),
      scorePercent: roundedScore,
      passingThreshold: course.passingScore || 80,
      passed,
      isDemoAttempt,
      awardedMedalId: awardedMedal?.medalId,
      rewardType,
      coinsAwarded,
      demoPointsAwarded,
    };

    try {
      const raw = localStorage.getItem(UNI_STORAGE_KEYS.EXAMS);
      const list: ExamAttemptRecord[] = raw ? JSON.parse(raw) : [];
      list.unshift(attempt);
      localStorage.setItem(UNI_STORAGE_KEYS.EXAMS, JSON.stringify(list.slice(0, 40)));
    } catch {
      // Ignore
    }

    return { attempt, medalCheck, awardedMedal };
  },

  getExamResults(playerId: string, courseId?: string): ExamAttemptRecord[] {
    migrateUniversityStorage();
    const normalizedCourseId = courseId
      ? normalizeUniversityCourseId(courseId)
      : undefined;
    try {
      const raw = localStorage.getItem(UNI_STORAGE_KEYS.EXAMS);
      const list: ExamAttemptRecord[] = raw ? JSON.parse(raw) : [];
      return list.filter(
        (e) =>
          e.playerId === playerId &&
          (!normalizedCourseId ||
            normalizeUniversityCourseId(e.courseId) === normalizedCourseId)
      );
    } catch {
      return [];
    }
  },

  getPlayerMedals(playerId: string): AwardedMedalRecord[] {
    migrateUniversityStorage();
    try {
      const raw = localStorage.getItem(UNI_STORAGE_KEYS.MEDALS);
      const list: AwardedMedalRecord[] = raw ? JSON.parse(raw) : [];
      return list.filter((m) => m.playerId === playerId);
    } catch {
      return [];
    }
  },

  awardMedal(
    playerId: string,
    course: UniversityCourse,
    scorePercent: number
  ): AwardedMedalRecord | undefined {
    // Hard guard: Demo or non-approved courses NEVER receive official medals
    if (
      course.isDemoCourse ||
      course.sourceStatus === 'demo_sandbox' ||
      course.sourceStatus === 'pending_source' ||
      course.sourceStatus !== 'approved_ready'
    ) {
      return undefined;
    }

    const normalizedCourseId = normalizeUniversityCourseId(course.id);
    const existing = this.getPlayerMedals(playerId);
    const alreadyHas = existing.find(
      (m) => normalizeUniversityCourseId(m.courseId) === normalizedCourseId
    );
    if (alreadyHas) return alreadyHas;

    const newMedal: AwardedMedalRecord = {
      medalId: course.medalConfig.medalId,
      courseId: normalizedCourseId,
      courseTitle:
        normalizedCourseId === CANONICAL_NPD_COURSE_ID
          ? CANONICAL_NPD_COURSE_TITLE
          : course.title,
      playerId,
      awardDate: getTodayDateString(),
      scorePercent,
      artworkIcon: course.medalConfig.artworkIcon,
      criteriaText: `کسب نمره ${scorePercent}٪ در آزمون رسمی درس ${
        normalizedCourseId === CANONICAL_NPD_COURSE_ID
          ? CANONICAL_NPD_COURSE_TITLE
          : course.title
      }`,
    };

    try {
      const raw = localStorage.getItem(UNI_STORAGE_KEYS.MEDALS);
      const list: AwardedMedalRecord[] = raw ? JSON.parse(raw) : [];
      list.push(newMedal);
      localStorage.setItem(UNI_STORAGE_KEYS.MEDALS, JSON.stringify(list));
    } catch {
      // Ignore
    }

    return newMedal;
  },

  /**
   * Imports a UniversityContentPackage non-destructively:
   * - Normalizes 'course_innovation_mgmt' and 'course_new_product_development' to canonical
   *   'course_new_product_development' titled «توسعه محصول».
   * - Merges incoming lessons with any existing lessons on the same course (so importing
   *   Lecture 2 NEVER deletes Lecture 1, and vice versa).
   * - Merges incoming template contents by (courseId, lessonId, templateType) and content.id
   *   without deleting contents of other lessons or unrelated courses.
   */
  importCoursePackage(pkg: UniversityContentPackage): UniversityCourse {
    const targetCourseId = normalizeUniversityCourseId(pkg.course.id);
    const isNpdCourse = targetCourseId === CANONICAL_NPD_COURSE_ID;

    const courses = this.listCourses();
    const existingCourse = courses.find(
      (c) => normalizeUniversityCourseId(c.id) === targetCourseId
    );

    const incomingLessons = Array.isArray(pkg.course.lessons)
      ? pkg.course.lessons.map((l) => ({
          ...l,
          courseId: targetCourseId,
        }))
      : [];

    const mergedLessons = existingCourse
      ? mergeCourseLessons(existingCourse.lessons, incomingLessons, targetCourseId)
      : mergeCourseLessons(
          isNpdCourse ? NPD_COURSE_LESSONS : [],
          incomingLessons,
          targetCourseId
        );

    const mergedCourse: UniversityCourse = {
      ...(existingCourse || {}),
      ...pkg.course,
      id: targetCourseId,
      title: isNpdCourse ? CANONICAL_NPD_COURSE_TITLE : pkg.course.title,
      englishTitle:
        pkg.course.englishTitle ||
        existingCourse?.englishTitle ||
        (isNpdCourse ? 'New Product Development' : ''),
      lessons: mergedLessons,
    };

    const otherCourses = courses.filter(
      (c) => normalizeUniversityCourseId(c.id) !== targetCourseId
    );
    const updatedCourses = [mergedCourse, ...otherCourses];

    const normalizedIncomingContents: AnyTemplateContent[] = (
      pkg.contents || []
    ).map((c) =>
      c.lessonId === 'lesson_innov_sandbox_1'
        ? { ...c, courseId: 'course_demo_sandbox' }
        : {
            ...c,
            courseId:
              normalizeUniversityCourseId(c.courseId) === CANONICAL_NPD_COURSE_ID ||
              isNpdCourse
                ? targetCourseId
                : normalizeUniversityCourseId(c.courseId),
          }
    );

    const existingContents = this.listAllContents();
    const updatedContents = mergeCourseContents(
      existingContents,
      normalizedIncomingContents
    );

    try {
      localStorage.setItem(UNI_STORAGE_KEYS.COURSES, JSON.stringify(updatedCourses));
      localStorage.setItem(
        UNI_STORAGE_KEYS.CONTENTS,
        JSON.stringify(updatedContents)
      );
    } catch {
      // Ignore
    }

    return mergedCourse;
  },

  exportCoursePackage(courseId: string): UniversityContentPackage | null {
    const normalizedCourseId = normalizeUniversityCourseId(courseId);
    const course = this.getCourse(normalizedCourseId);
    if (!course) return null;
    const contents = this.listAllContents().filter(
      (c) => normalizeUniversityCourseId(c.courseId) === normalizedCourseId
    );
    return {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      course,
      contents,
    };
  },
};

