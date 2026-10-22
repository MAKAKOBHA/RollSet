import test from 'node:test';
import assert from 'node:assert/strict';
import { runPool } from '../js/core/pool.js';

test('пул выполняет все задачи, не больше limit одновременно, ошибки не мешают', async () => {
  let running = 0;
  let peak = 0;
  const done = [];
  const tasks = Array.from({ length: 7 }, (_, i) => async () => {
    running += 1;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5));
    running -= 1;
    if (i === 3) throw new Error('сбой');
    done.push(i);
  });
  await runPool(tasks, 2);
  assert.equal(peak, 2);
  assert.deepEqual(done.sort(), [0, 1, 2, 4, 5, 6]);
});

test('пустой список — не ошибка', async () => {
  await runPool([], 2);
});
