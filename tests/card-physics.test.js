import test from 'node:test';
import assert from 'node:assert/strict';
import { clampAngle, createBody, isSettled, MAX_TILT, SPRINGS, stepBody, tiltTarget } from '../js/core/card-physics.js';

const springs = (pos) => ({ pos, tilt: SPRINGS.tilt });

test('наклон ограничен ±30° при любой скорости', () => {
  assert.equal(tiltTarget(100000), MAX_TILT);
  assert.equal(tiltTarget(-100000), -MAX_TILT);
  assert.equal(clampAngle(45), 30);
  assert.ok(Math.abs(tiltTarget(400)) < MAX_TILT);
});

test('наклон направлен по движению и зависит от скорости', () => {
  assert.ok(tiltTarget(500) > 0);
  assert.ok(tiltTarget(-500) < 0);
  assert.equal(tiltTarget(0), 0);
});

test('отпущенная карта возвращается на место и успокаивается', () => {
  const body = { ...createBody(), x: 300, y: -200, vx: 900, vy: 100, a: 25, w: 40 };
  const goal = { x: 0, y: 0, a: 0 };
  let frames = 0;
  while (!isSettled(body, goal) && frames < 600) {
    stepBody(body, goal, springs(SPRINGS.settle), 1 / 60);
    frames += 1;
    assert.ok(Math.abs(body.a) <= MAX_TILT + 1e-9);
  }
  assert.ok(frames < 600, 'за 10 секунд не успокоилась');
  assert.ok(Math.abs(body.x) < 0.5 && Math.abs(body.y) < 0.5);
});

test('при перетаскивании карта догоняет цель, а быстрый рывок наклоняет, не выходя за 30°', () => {
  const body = createBody();
  let maxAngle = 0;
  for (let i = 0; i < 90; i += 1) {
    const goal = { x: i * 25, y: 0, a: 0 };
    goal.a = tiltTarget(body.vx);
    stepBody(body, goal, springs(SPRINGS.follow), 1 / 60);
    maxAngle = Math.max(maxAngle, Math.abs(body.a));
  }
  assert.ok(maxAngle > 5, 'карта должна заметно наклоняться');
  assert.ok(maxAngle <= MAX_TILT);
  assert.ok(Math.abs(body.x - 89 * 25) < 120, 'карта идёт за курсором');
});

test('большой шаг времени не «взрывает» симуляцию', () => {
  const body = { ...createBody(), x: 500 };
  stepBody(body, { x: 0, y: 0, a: 0 }, springs(SPRINGS.settle), 0.5);
  assert.ok(Number.isFinite(body.x) && Math.abs(body.x) < 1000);
});
