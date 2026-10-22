// Физика «живой» карты: пружины для положения и наклона. Чистая математика, без DOM.
// Карта тянется за курсором с лёгким запаздыванием, а её наклон зависит от скорости по горизонтали
// и качается, как маятник. Отпущенная карта пружинит обратно на своё место.

export const MAX_TILT = 30; // градусов в каждую сторону

export const SPRINGS = Object.freeze({
  follow: Object.freeze({ k: 420, c: 34 }), // за курсором: быстро, почти без колебаний
  settle: Object.freeze({ k: 150, c: 15 }), // возврат на место: небольшой «отскок»
  tilt: Object.freeze({ k: 130, c: 9 }), // наклон: качается после рывка
});

const TILT_PER_SPEED = 0.035; // градусов на (пиксель/сек): 850 px/с ≈ 30°

export const clampAngle = (angle, max = MAX_TILT) => Math.max(-max, Math.min(max, angle));

export const tiltTarget = (vx) => clampAngle(vx * TILT_PER_SPEED);

export const createBody = () => ({ x: 0, y: 0, vx: 0, vy: 0, a: 0, w: 0 });

/**
 * Один шаг симуляции (полунеявный Эйлер, с подшагами для устойчивости).
 * @param body  { x, y, vx, vy, a, w } — положение (px), скорость, угол (°), угловая скорость
 * @param goal  { x, y, a } — куда тянет
 * @param springs { pos: {k,c}, tilt: {k,c} }
 * @param dt секунды
 */
export function stepBody(body, goal, springs, dt) {
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = Math.min(dt, 0.1) / steps;
  for (let i = 0; i < steps; i += 1) {
    body.vx += (springs.pos.k * (goal.x - body.x) - springs.pos.c * body.vx) * h;
    body.vy += (springs.pos.k * (goal.y - body.y) - springs.pos.c * body.vy) * h;
    body.x += body.vx * h;
    body.y += body.vy * h;
    body.w += (springs.tilt.k * (goal.a - body.a) - springs.tilt.c * body.w) * h;
    body.a += body.w * h;
    if (Math.abs(body.a) > MAX_TILT) {
      body.a = Math.sign(body.a) * MAX_TILT;
      body.w = 0;
    }
  }
  return body;
}

/** Карта почти остановилась у цели. */
export function isSettled(body, goal) {
  return (
    Math.abs(goal.x - body.x) < 0.4 &&
    Math.abs(goal.y - body.y) < 0.4 &&
    Math.abs(body.vx) < 6 &&
    Math.abs(body.vy) < 6 &&
    Math.abs(goal.a - body.a) < 0.25 &&
    Math.abs(body.w) < 2
  );
}
