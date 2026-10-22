import test from 'node:test';
import assert from 'node:assert/strict';
import { createShakeDetector } from '../js/core/shake.js';

/** Имитация тряски: n взмахов амплитудой amp каждые gap мс; возвращает, сработал ли детектор. */
function shake({ swings, amp = 60, gap = 120, required = 27, axis = 'x' }) {
  const d = createShakeDetector({ required });
  let t = 0;
  let pos = 0;
  let dir = 1;
  let fired = false;
  for (let i = 0; i < swings; i += 1) {
    for (let step = 1; step <= 4; step += 1) {
      t += gap / 4;
      const p = pos + (dir * amp * step) / 4;
      fired = (axis === 'x' ? d.feed(p, 0, t) : d.feed(0, p, t)) || fired;
    }
    pos += dir * amp;
    dir = -dir;
  }
  return fired;
}

test('27 резких взмахов подряд срабатывают, по любой оси', () => {
  assert.equal(shake({ swings: 32 }), true);
  assert.equal(shake({ swings: 32, axis: 'y' }), true);
});

test('мало взмахов — не срабатывает', () => {
  assert.equal(shake({ swings: 15 }), false);
});

test('вялая тряска (долгие взмахи) и мелкая дрожь не считаются', () => {
  assert.equal(shake({ swings: 60, gap: 900 }), false);
  assert.equal(shake({ swings: 60, amp: 10 }), false);
});

test('пауза посреди тряски обнуляет счёт', () => {
  const d = createShakeDetector({ required: 10 });
  let t = 0;
  let fired = false;
  const wave = (n) => {
    for (let i = 0; i < n; i += 1) {
      t += 100;
      fired = d.feed(i % 2 === 0 ? 0 : 80, 0, t) || fired;
    }
  };
  wave(8);
  t += 2000; // пауза
  d.feed(0, 0, t);
  wave(8);
  assert.equal(fired, false);
  wave(20);
  assert.equal(fired, true);
});

test('reset сбрасывает счёт', () => {
  const d = createShakeDetector({ required: 5 });
  for (let i = 0; i < 4; i += 1) d.feed(i % 2 ? 0 : 80, 0, i * 100);
  d.reset();
  assert.equal(d.count, 0);
});
