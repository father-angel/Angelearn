import test from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeTreesSnapshot,
  serializeDecorationsSnapshot,
  hydrateVisitorTrees,
  hydrateVisitorDecorations,
  buildVisitorOwnerProfile,
} from './gardenSnapshot';
import { INITIAL_TREES } from '../utils/storage';
import { GardenDecoration, TreeData, VisitorGarden } from '../types/game';

test('serializeTreesSnapshot preserves unlock status, growth days, and grid coordinates clamped to 0..5', () => {
  const customTrees: TreeData[] = INITIAL_TREES.map((t, idx) =>
    idx === 0
      ? { ...t, unlocked: true, wateredDaysCount: 18, position: { x: 5, y: 4 } }
      : idx === 2
      ? { ...t, unlocked: true, wateredDaysCount: 7, position: { x: 9, y: -2 } }
      : t
  );

  const snapshot = serializeTreesSnapshot(customTrees);
  assert.equal(snapshot.length, INITIAL_TREES.length);
  assert.deepEqual(snapshot[0], {
    id: 'speed_reading',
    unlocked: true,
    wateredDaysCount: 18,
    x: 5,
    y: 4,
  });
  assert.equal(snapshot[2].x, 5);
  assert.equal(snapshot[2].y, 0);
});

test('hydrateVisitorTrees restores exact owner layout and never copies local lastWateredDate', () => {
  const snap = [
    { id: 'speed_reading', unlocked: true, wateredDaysCount: 12, x: 3, y: 2 },
    { id: 'gratitude', unlocked: false, wateredDaysCount: 0, x: 4, y: 1 },
    { id: 'memory_cards', unlocked: true, wateredDaysCount: 9, x: 1, y: 5 },
  ];

  const hydrated = hydrateVisitorTrees(INITIAL_TREES, snap);
  const speed = hydrated.find((t) => t.id === 'speed_reading');
  const gratitude = hydrated.find((t) => t.id === 'gratitude');
  const memory = hydrated.find((t) => t.id === 'memory_cards');

  assert.equal(speed?.unlocked, true);
  assert.equal(speed?.wateredDaysCount, 12);
  assert.deepEqual(speed?.position, { x: 3, y: 2 });
  assert.equal(speed?.lastWateredDate, undefined);

  assert.equal(gratitude?.unlocked, false);
  assert.equal(memory?.unlocked, true);
  assert.equal(memory?.wateredDaysCount, 9);
  assert.deepEqual(memory?.position, { x: 1, y: 5 });
});

test('hydrateVisitorTrees falls back gracefully for legacy worldGardens docs without treesSnapshot', () => {
  const hydrated = hydrateVisitorTrees(INITIAL_TREES, undefined, 3, 10);
  const unlockedCount = hydrated.filter((t) => t.unlocked).length;
  assert.equal(unlockedCount, 3);
  assert.equal(hydrated[0].wateredDaysCount, 10);
  assert.equal(hydrated[3].unlocked, false);
});

test('serializeDecorationsSnapshot & hydrateVisitorDecorations preserve valid garden decorations', () => {
  const decos: GardenDecoration[] = [
    { id: 'd1', type: 'fountain', name: 'فواره بلورین آب', cost: 8, icon: '⛲', x: 2, y: 3 },
    { id: 'd2', type: 'lantern', name: 'فانوس شب‌تاب', cost: 5, icon: '🏮', x: 5, y: 0 },
  ];

  const serialized = serializeDecorationsSnapshot(decos);
  assert.equal(serialized.length, 2);

  const hydrated = hydrateVisitorDecorations(serialized);
  assert.equal(hydrated.length, 2);
  assert.equal(hydrated[0].type, 'fountain');
  assert.equal(hydrated[0].x, 2);
  assert.equal(hydrated[0].y, 3);
  assert.equal(hydrated[1].icon, '🏮');
});

test('buildVisitorOwnerProfile propagates custom avatarConfig of the garden owner', () => {
  const garden: VisitorGarden = {
    id: 'cloud_garden_user2',
    ownerName: 'سارا',
    gender: 'girl',
    bio: 'مسیر سبز دانایی',
    level: 'باغبان شکوفا',
    coins: 120,
    streakDays: 9,
    trees: [],
    decorations: [],
    avatarConfig: {
      skinTone: '#e8b896',
      hairStyle: 'girl_hijab_emerald',
      hairColor: '#1e293b',
      faceExpression: 'wise_calm',
      outfit: 'crimson_robe',
      pants: 'obsidian_slacks',
      accessory: 'crown_gold',
      bgAura: 'gold',
    },
  };

  const ownerProfile = buildVisitorOwnerProfile(garden);
  assert.equal(ownerProfile.name, 'سارا');
  assert.equal(ownerProfile.gender, 'girl');
  assert.equal(ownerProfile.avatarConfig?.hairStyle, 'girl_hijab_emerald');
  assert.equal(ownerProfile.avatarConfig?.outfit, 'crimson_robe');
  assert.equal(ownerProfile.avatarConfig?.pants, 'obsidian_slacks');
  assert.equal(ownerProfile.avatarConfig?.accessory, 'crown_gold');
});
