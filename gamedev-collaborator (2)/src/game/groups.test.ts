import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROUP_CREATE_COST,
  GROUP_MAX_LEVEL,
  applyGroupContribution,
  canCreateGroupName,
  getGroupTierMeta,
  getNextGroupUpgradeCost,
  makeGroupId,
  makeGroupInviteId,
  sanitizeGroupMotto,
  sanitizeGroupName,
} from './groups';

test('GROUP_CREATE_COST is 250 and tier progression has 5 escalating levels', () => {
  assert.equal(GROUP_CREATE_COST, 250);
  assert.equal(getGroupTierMeta(1).title, 'چادر کهنه همسفران');
  assert.equal(getNextGroupUpgradeCost(1), 400);
  assert.equal(getNextGroupUpgradeCost(2), 1000);
  assert.equal(getNextGroupUpgradeCost(3), 2200);
  assert.equal(getNextGroupUpgradeCost(4), 4500);
  assert.equal(getNextGroupUpgradeCost(5), null);
});

test('applyGroupContribution accumulates partial donations before leveling up', () => {
  const res = applyGroupContribution(1, 150, 100);
  assert.equal(res.nextLevel, 1);
  assert.equal(res.nextTreasuryCoins, 250);
  assert.equal(res.leveledUp, false);
  assert.equal(res.maxReached, false);
});

test('applyGroupContribution levels up and carries remainder to next level', () => {
  const res = applyGroupContribution(1, 350, 150);
  assert.equal(res.nextLevel, 2);
  assert.equal(res.nextTreasuryCoins, 100);
  assert.equal(res.leveledUp, true);
  assert.equal(res.levelsGained, 1);
});

test('applyGroupContribution handles multi-level donation and caps treasury at max level 5', () => {
  const res = applyGroupContribution(4, 4000, 900);
  assert.equal(res.nextLevel, GROUP_MAX_LEVEL);
  assert.equal(res.nextTreasuryCoins, 0);
  assert.equal(res.leveledUp, true);
  assert.equal(res.maxReached, true);
});

test('group name & motto sanitization and deterministic invite IDs', () => {
  assert.equal(sanitizeGroupName('   کاروان   دانش   '), 'کاروان دانش');
  assert.equal(canCreateGroupName('ا'), false);
  assert.equal(canCreateGroupName('نور'), true);
  assert.equal(sanitizeGroupMotto('  همدلی   و   تلاش ').length > 0, true);

  const gid = makeGroupId('user_abc123', 1700000000000);
  assert.match(gid, /^[a-zA-Z0-9_-]{8,128}$/);
  assert.equal(makeGroupInviteId('grp_1', 'uid_2'), 'grp_1__uid_2');
});
