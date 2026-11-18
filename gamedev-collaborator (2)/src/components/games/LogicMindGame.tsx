import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Brain,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  LOGIC_MIND_ROUND_SECONDS,
  LOGIC_MIND_TOTAL_QUESTIONS,
  LogicMindDifficulty,
  LogicMindQuestion,
  LogicMindRoundSummary,
  evaluateLogicMindAnswer,
  generateLogicMindChallengeQuestions,
  summarizeLogicMindRound,
} from '../../game/groupChallenges';
import { sound } from '../../utils/audio';

export interface LogicMindChallengeConfig {
  challengeId: string;
  title: string;
  personalBestScore: number | null;
}

export interface LogicMindGameProps {
  challengeConfig: LogicMindChallengeConfig;
  onChallengeComplete: (result: {
    score: number;
    detailLabel: string;
  }) => Promise<{ isNewRecord: boolean; bestScore: number } | void>;
  onClose: () => void;
}

type RoundPhase = 'ready' | 'playing' | 'summary';

interface AnswerFeedbackState {
  selectedIdx: number;
  correctIdx: number;
  isCorrect: boolean;
  scoreDelta: number;
  speedBonus: number;
  comboBonus: number;
  ruleExplanation: string;
}

function getDifficultyBadgeClasses(difficulty: LogicMindDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50';
    case 'medium':
      return 'bg-amber-500/20 text-amber-200 border-amber-400/50';
    case 'hard':
      return 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/50';
  }
}

export const LogicMindGame: React.FC<LogicMindGameProps> = ({
  challengeConfig,
  onChallengeComplete,
  onClose,
}) => {
  // Deterministic 10-question set shared identically across all group members for this challengeId
  const questions = useMemo<ReadonlyArray<LogicMindQuestion>>(
    () => generateLogicMindChallengeQuestions(challengeConfig.challengeId),
    [challengeConfig.challengeId]
  );

  const [phase, setPhase] = useState<RoundPhase>('ready');
  const [timeLeftSec, setTimeLeftSec] = useState<number>(LOGIC_MIND_ROUND_SECONDS);
  const [currentIdx, setCurrentIdx] = useState<number>(0);

  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);

  const [feedback, setFeedback] = useState<AnswerFeedbackState | null>(null);
  const [summary, setSummary] = useState<LogicMindRoundSummary | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<{
    isNewRecord: boolean;
    bestScore: number;
  } | null>(null);

  const roundActiveRef = useRef<boolean>(false);
  const questionStartMsRef = useRef<number>(Date.now());
  const nextQuestionTimeoutRef = useRef<number | null>(null);

  const scoreRef = useRef<number>(0);
  const streakRef = useRef<number>(0);
  const bestStreakRef = useRef<number>(0);
  const correctCountRef = useRef<number>(0);
  const wrongCountRef = useRef<number>(0);

  const clearPendingTimeout = useCallback(() => {
    if (nextQuestionTimeoutRef.current !== null) {
      window.clearTimeout(nextQuestionTimeoutRef.current);
      nextQuestionTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearPendingTimeout();
    };
  }, [clearPendingTimeout]);

  const finishRound = useCallback(async () => {
    if (!roundActiveRef.current) return;
    roundActiveRef.current = false;
    clearPendingTimeout();

    const finalSummary = summarizeLogicMindRound({
      finalScore: scoreRef.current,
      correctCount: correctCountRef.current,
      wrongCount: wrongCountRef.current,
      bestStreak: bestStreakRef.current,
      previousBestScore: challengeConfig.personalBestScore,
    });

    setSummary(finalSummary);
    setPhase('summary');
    sound.playCoin();

    const detailLabel = `${finalSummary.correctCount} از ${finalSummary.totalQuestions} صحیح · دقت ${finalSummary.accuracyPercent}٪ · زنجیره ${finalSummary.bestStreak}`;

    setSubmitting(true);
    try {
      const res = await onChallengeComplete({
        score: finalSummary.finalScore,
        detailLabel,
      });
      if (res && typeof res.bestScore === 'number') {
        setSubmitResult({
          isNewRecord: res.isNewRecord,
          bestScore: res.bestScore,
        });
      }
    } catch {
      // Handled by parent banner
    } finally {
      setSubmitting(false);
    }
  }, [challengeConfig.personalBestScore, clearPendingTimeout, onChallengeComplete]);

  const startRound = useCallback(() => {
    sound.playClick();
    clearPendingTimeout();

    scoreRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    correctCountRef.current = 0;
    wrongCountRef.current = 0;

    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setWrongCount(0);
    setCurrentIdx(0);
    setFeedback(null);
    setSummary(null);
    setSubmitResult(null);
    setTimeLeftSec(LOGIC_MIND_ROUND_SECONDS);

    questionStartMsRef.current = Date.now();
    roundActiveRef.current = true;
    setPhase('playing');
  }, [clearPendingTimeout]);

  // 90-second match countdown
  useEffect(() => {
    if (phase !== 'playing') return;
    const intervalId = window.setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          void finishRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [phase, finishRound]);

  const currentQuestion: LogicMindQuestion = questions[currentIdx] ?? questions[0];

  const handleSelectOption = useCallback(
    (optionIdx: number) => {
      if (phase !== 'playing' || !roundActiveRef.current || feedback !== null) {
        return;
      }

      const now = Date.now();
      const responseTimeMs = Math.max(250, now - questionStartMsRef.current);
      const isCorrect = optionIdx === currentQuestion.correctIndex;

      if (isCorrect) {
        sound.playCardMatch();
      } else {
        sound.playClick();
      }

      const evalResult = evaluateLogicMindAnswer({
        questionIndex: currentIdx,
        isCorrect,
        responseTimeMs,
        currentScore: scoreRef.current,
        currentStreak: streakRef.current,
        bestStreak: bestStreakRef.current,
      });

      scoreRef.current = evalResult.nextScore;
      streakRef.current = evalResult.nextStreak;
      bestStreakRef.current = evalResult.nextBestStreak;

      setScore(evalResult.nextScore);
      setStreak(evalResult.nextStreak);
      setBestStreak(evalResult.nextBestStreak);

      if (isCorrect) {
        correctCountRef.current += 1;
        setCorrectCount(correctCountRef.current);
      } else {
        wrongCountRef.current += 1;
        setWrongCount(wrongCountRef.current);
      }

      setFeedback({
        selectedIdx: optionIdx,
        correctIdx: currentQuestion.correctIndex,
        isCorrect,
        scoreDelta: evalResult.scoreDelta,
        speedBonus: evalResult.speedBonus,
        comboBonus: evalResult.comboBonus,
        ruleExplanation: currentQuestion.ruleExplanation,
      });

      const isLastQuestion = currentIdx + 1 >= LOGIC_MIND_TOTAL_QUESTIONS;
      nextQuestionTimeoutRef.current = window.setTimeout(() => {
        nextQuestionTimeoutRef.current = null;
        if (!roundActiveRef.current) return;
        if (isLastQuestion) {
          void finishRound();
        } else {
          setFeedback(null);
          setCurrentIdx((prev) => prev + 1);
          questionStartMsRef.current = Date.now();
        }
      }, isCorrect ? 650 : 950);
    },
    [currentIdx, currentQuestion, feedback, finishRound, phase]
  );

  const displayedBestRecord =
    submitResult?.bestScore ??
    summary?.bestRecordScore ??
    challengeConfig.personalBestScore ??
    0;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[10060] bg-[#04110d]/95 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-gradient-to-b from-[#0b271e] via-[#081d16] to-[#05130e] border-2 border-emerald-400/35 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#061812] border-b border-emerald-400/25 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-amber-300 p-0.5 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#061812] flex items-center justify-center text-lg">
                🧩
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-white truncate">
                  ذهن منطقی
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-cyan-400/20 text-cyan-200 border border-cyan-300/40 shrink-0">
                  رقابت گروهی
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {challengeConfig.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              roundActiveRef.current = false;
              clearPendingTimeout();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-rose-500/25 text-slate-200 hover:text-rose-200 border border-slate-600/60 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="بستن بازی ذهن منطقی"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PHASE 1: READY / INTRO SCREEN */}
        {phase === 'ready' && (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            <div className="rounded-2xl bg-[#0c2d22] border border-emerald-300/30 p-4 text-center space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-400/15 border border-cyan-300/35 text-cyan-200 text-xs font-black">
                <Brain className="w-3.5 h-3.5" />
                <span>۱۰ سؤال چهارگزینه‌ای · ۹۰ ثانیه زمان کل</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                الگو را کشف کن و گزینه یکتا را انتخاب کن!
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                در هر مسابقه <span className="text-amber-300 font-black">۱۰ سؤال چهارگزینه‌ای</span> از{' '}
                <span className="text-cyan-200 font-black">
                  دنباله اعداد، الگوهای هندسی، ترتیب منطقی و الگوهای ترکیبی
                </span>{' '}
                نمایش داده می‌شود. مجموعه سؤالات و ترتیب سختی این چالش برای{' '}
                <span className="text-lime-300 font-black">تمام اعضای گروه کاملاً یکسان</span> است!
              </p>
            </div>

            {/* Difficulty & Scoring Tiers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-2xl bg-[#092119] border border-emerald-400/25 p-3 space-y-1.5">
                <div className="font-black text-lime-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>افزایش سختی در ۱۰ سؤال</span>
                </div>
                <ul className="space-y-1 text-slate-200 text-[11px] leading-relaxed">
                  <li>• سؤالات ۱ تا ۳: <span className="text-emerald-300 font-bold">آسان (تک‌قانونی)</span></li>
                  <li>• سؤالات ۴ تا ۷: <span className="text-amber-300 font-bold">متوسط (دو قانون همزمان)</span></li>
                  <li>• سؤالات ۸ تا ۱۰: <span className="text-fuchsia-300 font-bold">دشوار (الگوی ترکیبی)</span></li>
                </ul>
              </div>

              <div className="rounded-2xl bg-[#092119] border border-emerald-400/25 p-3 space-y-1.5">
                <div className="font-black text-amber-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>قوانین امتیازدهی</span>
                </div>
                <ul className="space-y-1 text-slate-200 text-[11px] leading-relaxed">
                  <li>• پاسخ صحیح آسان: <span className="text-lime-300 font-bold">+۱۰۰</span> | متوسط: <span className="text-amber-300 font-bold">+۱۵۰</span> | دشوار: <span className="text-fuchsia-300 font-bold">+۲۰۰</span></li>
                  <li>• پاداش سرعت: حداکثر <span className="text-cyan-300 font-bold">+۲۰ امتیاز</span> برای هر پاسخ</li>
                  <li>• هر ۳ پاسخ صحیح متوالی: <span className="text-amber-300 font-bold">+۱۰ امتیاز ترکیبی</span> (حداکثر ۳۰)</li>
                  <li>• پاسخ اشتباه: <span className="text-slate-300 font-bold">بدون امتیاز منفی (۰ امتیاز)</span></li>
                </ul>
              </div>
            </div>

            {challengeConfig.personalBestScore !== null && (
              <div className="rounded-xl bg-amber-400/15 border border-amber-300/40 px-3.5 py-2.5 flex items-center justify-between text-xs">
                <span className="text-amber-100 font-bold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>بالاترین رکورد فعلی شما در این چالش:</span>
                </span>
                <span className="text-sm font-black text-amber-300 tabular-nums">
                  {challengeConfig.personalBestScore} امتیاز
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={startRound}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:brightness-105 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Swords className="w-5 h-5" />
              <span>شروع مسابقه ۹۰ ثانیه‌ای (۱۰ سؤال)</span>
            </button>
          </div>
        )}

        {/* PHASE 2: ACTIVE 10-QUESTION / 90S MATCH */}
        {phase === 'playing' && (
          <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between gap-3.5 overflow-y-auto">
            {/* Top HUD: Timer, Score, Streak & 10-Question Progress Bar */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-[#071913] border border-emerald-400/30 px-2.5 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-300" />
                    <span>زمان</span>
                  </span>
                  <span
                    className={`text-sm sm:text-base font-black tabular-nums ${
                      timeLeftSec <= 15 ? 'text-rose-300 animate-pulse' : 'text-white'
                    }`}
                  >
                    {timeLeftSec}s
                  </span>
                </div>

                <div className="rounded-xl bg-[#071913] border border-amber-400/35 px-2.5 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-300" />
                    <span>امتیاز</span>
                  </span>
                  <span className="text-sm sm:text-base font-black text-amber-300 tabular-nums">
                    {score}
                  </span>
                </div>

                <div className="rounded-xl bg-[#071913] border border-emerald-400/30 px-2.5 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>زنجیره</span>
                  </span>
                  <span className="text-sm sm:text-base font-black text-lime-300 tabular-nums">
                    {streak}×
                  </span>
                </div>
              </div>

              {/* 10-Question Step Segments */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-black text-white">
                    سؤال {currentQuestion.questionNumber} از {LOGIC_MIND_TOTAL_QUESTIONS}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold">
                      {currentQuestion.categoryLabel}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md border font-black ${getDifficultyBadgeClasses(
                        currentQuestion.difficulty
                      )}`}
                    >
                      {currentQuestion.difficultyTitle} ({currentQuestion.ruleBadge} · +{currentQuestion.basePoints})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-10 gap-1 pt-0.5">
                  {questions.map((q, idx) => {
                    const isDone = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    const tierColor =
                      q.difficulty === 'easy'
                        ? 'bg-emerald-400'
                        : q.difficulty === 'medium'
                        ? 'bg-amber-400'
                        : 'bg-fuchsia-400';
                    return (
                      <div
                        key={q.id}
                        className={`h-2 rounded-sm transition-all ${
                          isCurrent
                            ? `${tierColor} ring-2 ring-white`
                            : isDone
                            ? `${tierColor} opacity-80`
                            : 'bg-slate-800'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Center Puzzle Sequence & Question Prompt Card */}
            <div className="rounded-2xl bg-gradient-to-b from-[#0d2f24] to-[#082018] border-2 border-emerald-300/35 p-3.5 sm:p-4 space-y-3.5 shadow-inner">
              {/* Visual Sequence Tiles */}
              <div
                dir="ltr"
                className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 bg-[#051510] border border-emerald-400/25 rounded-2xl p-3"
              >
                {currentQuestion.sequenceItems.map((tile, tIdx) => {
                  const isMystery = tile.includes('؟');
                  return (
                    <React.Fragment key={`${currentQuestion.id}_tile_${tIdx}`}>
                      <div
                        dir="rtl"
                        className={`px-3 py-2 rounded-xl font-black text-xs sm:text-sm border shadow-sm transition-all ${
                          isMystery
                            ? 'bg-amber-400/20 border-amber-300 text-amber-200 ring-2 ring-amber-300/30'
                            : 'bg-[#0e3226] border-emerald-300/35 text-white'
                        }`}
                      >
                        {tile}
                      </div>
                      {tIdx < currentQuestion.sequenceItems.length - 1 && (
                        <span className="text-emerald-400/70 font-black text-xs select-none">
                          →
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Unambiguous Question Prompt */}
              <p className="text-xs sm:text-sm font-black text-white text-center leading-relaxed">
                {currentQuestion.promptText}
              </p>

              {/* Instant Answer & Rule Explanation Feedback Banner */}
              {feedback && (
                <div
                  className={`rounded-xl px-3 py-2 border text-xs space-y-1 transition-all ${
                    feedback.isCorrect
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                      : 'bg-rose-500/20 border-rose-400 text-rose-100'
                  }`}
                >
                  <div className="flex items-center justify-between font-black">
                    <span className="flex items-center gap-1.5">
                      {feedback.isCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-lime-300 shrink-0" />
                          <span>پاسخ صحیح!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-300 shrink-0" />
                          <span>پاسخ اشتباه (۰ امتیاز · زنجیره صفر شد)</span>
                        </>
                      )}
                    </span>
                    {feedback.isCorrect && (
                      <span className="text-lime-300 tabular-nums">
                        +{feedback.scoreDelta} امتیاز
                        {feedback.speedBonus > 0 ? ` (سرعت +${feedback.speedBonus})` : ''}
                        {feedback.comboBonus > 0 ? ` (زنجیره +${feedback.comboBonus})` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed">
                    {feedback.ruleExplanation}
                  </p>
                </div>
              )}
            </div>

            {/* 4 Multiple-Choice Option Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              {currentQuestion.options.map((opt, optIdx) => {
                const isSelected = feedback?.selectedIdx === optIdx;
                const isCorrectOption = feedback !== null && optIdx === feedback.correctIdx;
                const isWrongSelected =
                  feedback !== null && isSelected && !feedback.isCorrect;

                let btnStyle =
                  'bg-gradient-to-b from-[#133c2e] to-[#0c271e] hover:from-[#194d3b] hover:to-[#103528] border-emerald-300/40 text-white';
                if (isCorrectOption) {
                  btnStyle =
                    'bg-gradient-to-b from-emerald-400 to-emerald-600 border-white text-slate-950 ring-2 ring-lime-300';
                } else if (isWrongSelected) {
                  btnStyle =
                    'bg-gradient-to-b from-rose-500 to-rose-700 border-rose-200 text-white';
                }

                return (
                  <button
                    key={`${currentQuestion.id}_opt_${optIdx}`}
                    type="button"
                    disabled={feedback !== null}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`min-h-[58px] sm:min-h-[64px] px-3 py-2.5 rounded-2xl border-2 font-black text-xs sm:text-sm flex items-center justify-between gap-2 shadow-md transition-transform active:scale-95 cursor-pointer disabled:cursor-default ${btnStyle}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-black/25 border border-white/20 flex items-center justify-center text-[11px] font-black shrink-0">
                      {optIdx + 1}
                    </span>
                    <span className="flex-1 text-center leading-snug break-words">
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PHASE 3: END-OF-ROUND SUMMARY SCREEN */}
        {phase === 'summary' && summary && (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            <div className="rounded-2xl bg-gradient-to-b from-[#11382b] to-[#092219] border-2 border-amber-300/50 p-4 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>پایان مسابقه ذهن منطقی</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-amber-300 tabular-nums">
                {summary.finalScore}
              </div>
              <div className="text-xs font-bold text-slate-200">امتیاز نهایی مسابقه</div>

              {submitting ? (
                <div className="text-xs text-cyan-200 font-bold pt-1">
                  در حال ثبت رکورد در جدول رقابت گروه...
                </div>
              ) : submitResult ? (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${
                    submitResult.isNewRecord
                      ? 'bg-lime-400/20 border border-lime-300 text-lime-200'
                      : 'bg-slate-800/90 border border-slate-600 text-slate-200'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {submitResult.isNewRecord
                      ? `رکورد جدید شما در گروه ثبت شد: ${submitResult.bestScore} امتیاز!`
                      : `بهترین رکورد ثبت‌شده شما در گروه: ${submitResult.bestScore} امتیاز`}
                  </span>
                </div>
              ) : null}
            </div>

            {/* 4 Key End-of-Round Metrics Requested by Spec */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-[#092119] border border-emerald-400/30 p-3 text-center">
                <div className="text-[11px] text-slate-300 font-bold">
                  تعداد پاسخ صحیح
                </div>
                <div className="text-lg sm:text-xl font-black text-lime-300 tabular-nums mt-0.5">
                  {summary.correctCount} از {summary.totalQuestions}
                </div>
              </div>

              <div className="rounded-2xl bg-[#092119] border border-emerald-400/30 p-3 text-center">
                <div className="text-[11px] text-slate-300 font-bold">دقت پاسخ‌گویی</div>
                <div className="text-lg sm:text-xl font-black text-cyan-300 tabular-nums mt-0.5">
                  {summary.accuracyPercent}٪
                </div>
              </div>

              <div className="rounded-2xl bg-[#092119] border border-amber-400/35 p-3 text-center">
                <div className="text-[11px] text-slate-300 font-bold">امتیاز این دست</div>
                <div className="text-lg sm:text-xl font-black text-amber-300 tabular-nums mt-0.5">
                  {summary.finalScore}
                </div>
              </div>

              <div className="rounded-2xl bg-[#092119] border border-amber-400/35 p-3 text-center">
                <div className="text-[11px] text-slate-300 font-bold">بهترین رکورد شما</div>
                <div className="text-lg sm:text-xl font-black text-amber-200 tabular-nums mt-0.5">
                  {displayedBestRecord}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#071a14] border border-emerald-400/25 px-3.5 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-300" />
                <span>بهترین زنجیره پاسخ صحیح متوالی:</span>
              </span>
              <span className="font-black text-lime-300 tabular-nums">
                {summary.bestStreak} پاسخ
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={startRound}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-b from-[#d9f99d] via-[#bef264] to-[#84cc16] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تلاش دوباره برای ارتقای رکورد</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-black text-xs sm:text-sm cursor-pointer"
              >
                بازگشت به گروه
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
