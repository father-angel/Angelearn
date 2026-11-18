import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRealPlayerWorldWaypoints,
  getPlayerWalkerSpeed,
} from './worldWalkers.ts';

test('buildRealPlayerWorldWaypoints returns 4 bounded stops starting near the player garden', () => {
  const waypoints = buildRealPlayerWorldWaypoints({
    uid: 'user_abc_123',
    displayName: 'اهورا',
    gardenPos: { x: 1320, y: 860 },
    isSelf: true,
  });

  assert.equal(waypoints.length, 4);
  for (const wp of waypoints) {
    assert.ok(wp.x >= 300 && wp.x <= 2500, `x=${wp.x} out of bounds`);
    assert.ok(wp.y >= 260 && wp.y <= 1580, `y=${wp.y} out of bounds`);
    assert.ok(wp.dwellMs >= 2500);
    assert.ok(wp.statusText.length > 0);
  }
  assert.ok(waypoints[0].statusText.includes('باغ شما'));
});

test('buildRealPlayerWorldWaypoints includes group HQ stop when player belongs to a group', () => {
  const waypoints = buildRealPlayerWorldWaypoints({
    uid: 'user_group_99',
    displayName: 'سارا',
    gardenPos: { x: 1100, y: 950 },
    groupPos: { x: 1510, y: 540, groupName: 'کاروان دانش' },
    isSelf: false,
  });

  assert.equal(waypoints.length, 4);
  assert.ok(waypoints.some((wp) => wp.statusText.includes('کاروان دانش')));
  assert.ok(waypoints[0].statusText.includes('سارا'));
});

test('getPlayerWalkerSpeed returns natural bounded speed per UID', () => {
  const s1 = getPlayerWalkerSpeed('user_1');
  const s2 = getPlayerWalkerSpeed('user_2');
  assert.ok(s1 >= 56 && s1 <= 73);
  assert.ok(s2 >= 56 && s2 <= 73);
});
