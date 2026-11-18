import React, { useEffect, useState } from 'react';
import {
  GroupChallengeScore,
  GroupGameChallenge,
} from '../types/game';
import { subscribeToChallengeScores } from '../firebase';
import { getGroupChallengeGameMeta } from '../game/groupChallenges';
import { formatChatTimestamp } from '../game/chat';
import { CharacterAvatar } from './CharacterAvatar';
import { sound } from '../utils/audio';
import {
  ChevronDown,
  ChevronUp,
  Crown,
  Play,
  Swords,
  Trash2,
  Trophy,
} from 'lucide-react';

interface GroupChallengeCardProps {
  challenge: GroupGameChallenge;
  currentUid?: string | null;
  isGroupLeader: boolean;
  onPlayChallenge: (
    challenge: GroupGameChallenge,
    personalBestScore: number | null
  ) => void;
  onDeleteChallenge?: (challengeId: string) => void;
}

export const GroupChallengeCard: React.FC<GroupChallengeCardProps> = ({
  challenge,
  currentUid,
  isGroupLeader,
  onPlayChallenge,
  onDeleteChallenge,
}) => {
  const [scores, setScores] = useState<GroupChallengeScore[]>([]);
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToChallengeScores(
      challenge.groupId,
      challenge.id,
      (list) => {
        setScores(list);
      }
    );
    return () => unsub();
  }, [challenge.groupId, challenge.id]);

  const meta = getGroupChallengeGameMeta(challenge.gameId);
  const myRecord = currentUid
    ? scores.find((s) => s.playerUid === currentUid) ?? null
    : null;
  const canDelete = Boolean(
    onDeleteChallenge &&
      currentUid &&
      (challenge.creatorUid === currentUid || isGroupLeader)
  );
  const visibleScores = expanded ? scores : scores.slice(0, 4);

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#143026] via-[#0e231c] to-[#091813] border-2 border-[#f59e0b]/75 p-3.5 shadow-[0_8px_22px_rgba(0,0,0,0.45)] space-y-2.5">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/70 flex items-center justify-center text-xl shrink-0 shadow-inner">
            {meta.emoji}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-300 text-slate-950 flex items-center gap-1">
                <Swords className="w-3 h-3" />
                <span>{meta.treeTitle}</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#071611] text-lime-200 border border-emerald-300/30">
                {meta.badgeText}
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-black text-white mt-1 truncate">
              {challenge.title}
            </h4>
            <p className="text-[10px] text-slate-300 truncate">
              ارسال‌شده توسط {challenge.creatorName} ·{' '}
              <span className="tabular-nums">
                {formatChatTimestamp(challenge.createdAtMs)}
              </span>
            </p>
          </div>
        </div>

        {canDelete && (
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onDeleteChallenge?.(challenge.id);
            }}
            title="حذف رقابت"
            aria-label={`حذف رقابت ${challenge.title}`}
            className="p-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-400/60 text-rose-100 cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-200 leading-relaxed">
        {meta.description}
      </p>

      {/* Play Action + Personal Best */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onPlayChallenge(challenge, myRecord ? myRecord.bestScore : null);
          }}
          className="flex-1 min-w-[165px] py-2 px-3 rounded-xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:brightness-105 active:translate-y-[1px] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_3px_0_#78350f] cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-slate-950" />
          <span>
            {myRecord
              ? 'تلاش دوباره برای شکستن رکورد'
              : 'شروع رقابت و ثبت رکورد'}
          </span>
        </button>

        {myRecord && (
          <div className="px-2.5 py-1.5 rounded-xl bg-[#071611] border border-lime-400/50 text-[11px] font-black text-lime-200 tabular-nums shrink-0">
            رکورد شما: {myRecord.bestScore}
          </div>
        )}
      </div>

      {/* Live High-Score Leaderboard Underneath the Game */}
      <div className="rounded-xl bg-[#071611] border border-emerald-300/25 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-black text-amber-200 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>رکوردهای اعضای گروه (فقط بالاترین امتیاز)</span>
          </span>
          <span className="text-slate-300 tabular-nums font-bold">
            {scores.length} بازیکن
          </span>
        </div>

        {scores.length === 0 ? (
          <p className="text-[11px] text-slate-300 text-center py-1.5">
            هنوز کسی رکورد نزده؛ اولین رکورد این چالش را ثبت کنید!
          </p>
        ) : (
          <div className="space-y-1">
            {visibleScores.map((entry, idx) => {
              const isMe = Boolean(currentUid && entry.playerUid === currentUid);
              const rankBadge =
                idx === 0
                  ? '🥇'
                  : idx === 1
                  ? '🥈'
                  : idx === 2
                  ? '🥉'
                  : `${idx + 1}`;
              return (
                <div
                  key={entry.playerUid}
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border text-xs ${
                    isMe
                      ? 'bg-[#1a3e31] border-amber-300/80 text-white'
                      : 'bg-[#0d211a] border-emerald-300/20 text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-center font-black tabular-nums shrink-0">
                      {rankBadge}
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-[#143026] border border-emerald-300/35 overflow-hidden flex items-center justify-center shrink-0">
                      <CharacterAvatar
                        gender={entry.playerGender}
                        config={entry.playerAvatar}
                        variant="full"
                        showBackdrop={false}
                        size={22}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-[11px] truncate flex items-center gap-1">
                        <span>{isMe ? `${entry.playerName} (شما)` : entry.playerName}</span>
                        {idx === 0 && (
                          <Crown className="w-3 h-3 text-amber-300 shrink-0" />
                        )}
                      </div>
                      {entry.bestDetail && (
                        <div className="text-[10px] text-slate-300 truncate">
                          {entry.bestDetail}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <div className="font-black text-xs text-amber-300 tabular-nums">
                      {entry.bestScore} امتیاز
                    </div>
                  </div>
                </div>
              );
            })}

            {scores.length > 4 && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setExpanded((prev) => !prev);
                }}
                className="w-full py-1 text-[10px] font-black text-slate-200 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>نمایش خلاصه رده‌بندی</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>مشاهده همه رکوردها ({scores.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
