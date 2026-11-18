import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CHAT_MESSAGE_LENGTH,
  makeDmThreadId,
  getSortedParticipants,
  makeChronoDocId,
  sanitizeChatText,
  canSendChatMessage,
  formatChatTimestamp,
  getPeerUidFromParticipants,
} from './chat';

test('makeDmThreadId is deterministic regardless of participant argument order', () => {
  const idAB = makeDmThreadId('user_zeta', 'user_alpha');
  const idBA = makeDmThreadId('user_alpha', 'user_zeta');
  assert.equal(idAB, 'user_alpha__user_zeta');
  assert.equal(idAB, idBA);
});

test('getSortedParticipants rejects self-chat and invalid IDs', () => {
  assert.throws(() => makeDmThreadId('same_uid', 'same_uid'));
  assert.throws(() => getSortedParticipants('bad/id', 'valid_id'));
  assert.throws(() => getSortedParticipants('', 'valid_id'));
});

test('makeChronoDocId sorts newer timestamps earlier lexicographically', () => {
  const olderId = makeChronoDocId('u1', 1700000000000, 'aaaaaa');
  const newerId = makeChronoDocId('u1', 1700000005000, 'aaaaaa');
  assert.equal(newerId < olderId, true);
  assert.match(olderId, /^[0-9]{13}_[a-zA-Z0-9_-]+_[a-zA-Z0-9_-]+$/);
});

test('sanitizeChatText strips control characters, trims, and clamps to max length', () => {
  assert.equal(sanitizeChatText('  سلام\u0000 دوست من  '), 'سلام دوست من');
  const longText = 'ا'.repeat(MAX_CHAT_MESSAGE_LENGTH + 80);
  const clamped = sanitizeChatText(longText);
  assert.equal(clamped.length, MAX_CHAT_MESSAGE_LENGTH);
  assert.equal(canSendChatMessage('   \n\t  '), false);
  assert.equal(canSendChatMessage('سلام'), true);
});

test('formatChatTimestamp renders recent labels and time strings cleanly', () => {
  const now = 1750000000000;
  assert.equal(formatChatTimestamp(now - 10_000, now), 'هم‌اکنون');
  const older = formatChatTimestamp(now - 300_000, now);
  assert.equal(typeof older, 'string');
  assert.equal(older.length > 0, true);
});

test('getPeerUidFromParticipants identifies the other user in a DM thread', () => {
  assert.equal(getPeerUidFromParticipants(['uid_a', 'uid_b'], 'uid_a'), 'uid_b');
  assert.equal(getPeerUidFromParticipants(['uid_a', 'uid_b'], 'uid_b'), 'uid_a');
  assert.equal(getPeerUidFromParticipants(['uid_a', 'uid_b'], 'uid_c'), null);
});
