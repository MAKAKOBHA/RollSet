import test from 'node:test';
import assert from 'node:assert/strict';
import { createRandom, pickUnique } from '../js/core/rng.js';

const range = (n) => Array.from({ length: n }, (_, i) => i);

test('pickUnique возвращает нужное число разных элементов из набора', () => {
  const items = range(27);
  for (let run = 0; run < 500; run += 1) {
    const picks = pickUnique(items, 3, Math.random);
    assert.equal(picks.length, 3);
    assert.equal(new Set(picks).size, 3);
    assert.ok(picks.every((p) => items.includes(p)));
  }
});

test('pickUnique не меняет исходный массив', () => {
  const items = range(10);
  const copy = [...items];
  pickUnique(items, 4, Math.random);
  assert.deepEqual(items, copy);
});

test('pickUnique детерминирован при заданном random', () => {
  const seq = [0, 0, 0];
  let i = 0;
  const random = () => seq[i++ % seq.length];
  assert.deepEqual(pickUnique(range(27), 3, random), [0, 1, 2]);
});

test('pickUnique выдерживает random, равный почти 1', () => {
  const picks = pickUnique(range(27), 3, () => 0.9999999999);
  assert.equal(new Set(picks).size, 3);
  assert.ok(picks.every((p) => p >= 0 && p < 27));
});

test('pickUnique за много запусков достаёт каждую карту', () => {
  const seen = new Set();
  for (let run = 0; run < 2000; run += 1) pickUnique(range(27), 3, Math.random).forEach((p) => seen.add(p));
  assert.equal(seen.size, 27);
});

test('pickUnique можно выбрать все элементы, но не больше', () => {
  assert.equal(pickUnique(range(3), 3, Math.random).length, 3);
  assert.throws(() => pickUnique(range(2), 3, Math.random), RangeError);
  assert.throws(() => pickUnique(range(5), -1, Math.random), RangeError);
  assert.throws(() => pickUnique(range(5), 1.5, Math.random), RangeError);
});

test('createRandom даёт числа из [0, 1)', () => {
  const random = createRandom();
  for (let i = 0; i < 1000; i += 1) {
    const value = random();
    assert.ok(value >= 0 && value < 1);
  }
});
