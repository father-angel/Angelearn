export const MAX_CHAT_MESSAGE_LENGTH = 500;
const REVERSE_EPOCH_BASE = 9999999999999; // 13 digits (valid until year 2286)
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export function isValidFirestoreId(id: string): boolean {
  return typeof id === 'string' && SAFE_ID_REGEX.test(id);
}

/**
 * Returns lexicographically sorted distinct participant UIDs for deterministic 1-on-1 DM threads.
 */
export function getSortedParticipants(
  uidA: string,
  uidB: string
): [string, string] {
  const a = (uidA || '').trim();
  const b = (uidB || '').trim();
  if (!isValidFirestoreId(a) || !isValidFirestoreId(b)) {
    throw new Error('Invalid participant UID');
  }
  if (a === b) {
    throw new Error('Cannot create direct chat thread with yourself');
  }
  return a < b ? [a, b] : [b, a];
}

/**
 * Produces a deterministic thread document ID for two distinct users (`uidMin__uidMax`).
 * Always matches `^[a-zA-Z0-9_-]{1,128}$` when UIDs are standard Firebase UIDs.
 */
export function makeDmThreadId(uidA: string, uidB: string): string {
  const [first, second] = getSortedParticipants(uidA, uidB);
  const combined = `${first}__${second}`;
  if (combined.length > 128) {
    throw new Error('DM thread ID exceeds maximum Firestore rule bound');
  }
  return combined;
}

/**
 * Generates a reverse-chronological document ID so single-where Firestore queries
 * (ordered implicitly by `__name__ ASC`) return the newest messages without needing composite indexes.
 */
export function makeChronoDocId(
  uidSuffix = 'anon',
  nowMs = Date.now(),
  randomPart = Math.random().toString(36).slice(2, 8)
): string {
  const clampedNow = Math.max(0, Math.min(REVERSE_EPOCH_BASE, Math.floor(nowMs)));
  const reversePrefix = String(REVERSE_EPOCH_BASE - clampedNow).padStart(
    13,
    '0'
  );
  const safeUid = (uidSuffix || 'anon')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 8) || 'anon';
  const safeRand = (randomPart || '0000')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 8) || 'rand';
  return `${reversePrefix}_${safeUid}_${safeRand}`;
}

/**
 * Cleans control characters, trims whitespace, and enforces max chat message length.
 */
export function sanitizeChatText(
  raw: string,
  maxLen: number = MAX_CHAT_MESSAGE_LENGTH
): string {
  if (typeof raw !== 'string') return '';
  const withoutControl = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  const collapsedSpaces = withoutControl.replace(/\r\n/g, '\n').trim();
  if (collapsedSpaces.length <= maxLen) return collapsedSpaces;
  return collapsedSpaces.slice(0, maxLen).trim();
}

export function canSendChatMessage(raw: string): boolean {
  return sanitizeChatText(raw).length > 0;
}

/**
 * Formats a epoch-ms timestamp cleanly in Persian (`HH:MM` or `هم‌اکنون`).
 */
export function formatChatTimestamp(tsMs: number, nowMs = Date.now()): string {
  if (!Number.isFinite(tsMs) || tsMs <= 0) return 'هم‌اکنون';
  const diffSec = Math.floor((nowMs - tsMs) / 1000);
  if (diffSec >= 0 && diffSec < 45) {
    return 'هم‌اکنون';
  }
  try {
    return new Date(tsMs).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'هم‌اکنون';
  }
}

/**
 * Returns the peer UID given a 2-participant DM thread.
 */
export function getPeerUidFromParticipants(
  participants: string[],
  myUid: string
): string | null {
  if (!Array.isArray(participants) || participants.length !== 2) return null;
  if (participants[0] === myUid) return participants[1];
  if (participants[1] === myUid) return participants[0];
  return null;
}
