import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDeterministicWorldCoords,
  resolveNonOverlappingWorldCoords,
  clampWorldCoords,
  resolveGroupWorldPositions,
} from './worldPlacement';

test('getDeterministicWorldCoords ignores guest/legacy coords and stays inside meadow bounds', () => {
  const a = getDeterministicWorldCoords('uid_alice_gmail_1', { x: 176, y: 171 });
  const b = getDeterministicWorldCoords('uid_bob_gmail_2', { x: 512, y: 512 });

  assert.equal(a.worldX >= 280 && a.worldX <= 2520, true);
  assert.equal(a.worldY >= 240 && a.worldY <= 1600, true);
  assert.equal(b.worldX >= 280 && b.worldX <= 2520, true);
  assert.equal(b.worldY >= 240 && b.worldY <= 1600, true);

  // Deterministic for the same UID
  assert.deepEqual(
    getDeterministicWorldCoords('uid_alice_gmail_1', { x: 176, y: 171 }),
    a
  );
});

test('getDeterministicWorldCoords preserves valid custom relocated world coordinates', () => {
  const custom = getDeterministicWorldCoords('uid_alice_gmail_1', {
    x: 1450,
    y: 920,
  });
  assert.deepEqual(custom, { worldX: 1450, worldY: 920 });
});

test('resolveNonOverlappingWorldCoords separates colliding neighbor gardens and avoids player/campus overlap', () => {
  const playerCoords = { x: 1320, y: 860 };
  const neighbors = [
    { uid: 'u1', worldX: 1320, worldY: 860 }, // exact collision with player
    { uid: 'u2', worldX: 1080, worldY: 1020 },
    { uid: 'u3', worldX: 1080, worldY: 1020 }, // exact collision with u2
  ];

  const resolved = resolveNonOverlappingWorldCoords(neighbors, playerCoords);
  assert.equal(resolved.length, 3);

  // None should overlap the player's own garden
  for (const n of resolved) {
    const distToPlayer = Math.hypot(
      n.worldX - playerCoords.x,
      n.worldY - playerCoords.y
    );
    assert.equal(
      distToPlayer >= 190,
      true,
      `Neighbor ${n.uid} too close to player: ${distToPlayer}`
    );
  }

  // Neighbors should not overlap each other
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      const dist = Math.hypot(
        resolved[i].worldX - resolved[j].worldX,
        resolved[i].worldY - resolved[j].worldY
      );
      assert.equal(
        dist >= 190,
        true,
        `Neighbors ${resolved[i].uid} and ${resolved[j].uid} too close: ${dist}`
      );
    }
  }
});

test('clampWorldCoords bounds group tent coordinates inside safe world meadow limits', () => {
  assert.deepEqual(clampWorldCoords(10, 50), { x: 280, y: 220 });
  assert.deepEqual(clampWorldCoords(2999, 1950), { x: 2520, y: 1620 });
  assert.deepEqual(clampWorldCoords(1425.7, 905.2), { x: 1426, y: 905 });
});

test('resolveGroupWorldPositions preserves leader custom coordinates and applies drag override cleanly', () => {
  const groups = [
    { id: 'grp_1', worldX: 1410, worldY: 880 },
    { id: 'grp_2', worldX: 1410, worldY: 880 },
  ];
  const resolved = resolveGroupWorldPositions(groups, {
    grp_1: { x: 1290, y: 760 },
  });
  assert.equal(resolved[0].worldX, 1290);
  assert.equal(resolved[0].worldY, 760);
  assert.equal(resolved[1].worldX, 1410);
  assert.equal(resolved[1].worldY, 880);
});

