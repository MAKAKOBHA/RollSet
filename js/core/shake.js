// Детектор «тряски» курсора. Считает частые резкие смены направления: каждая смена — это
// взмах не короче minSwingPx, следующий за предыдущим не позже maxGapMs. Пауза или вялое
// движение обнуляют счёт. Следит за осями x и y отдельно, берёт большее значение.

function createAxis({ minSwingPx, maxGapMs }) {
  let started = false;
  let dir = 0;
  let extreme = 0;
  let lastTurn = 0;
  let count = 0;

  return {
    get count() {
      return count;
    },
    reset() {
      started = false;
      dir = 0;
      count = 0;
    },
    feed(pos, t) {
      if (!started) {
        started = true;
        extreme = pos;
        dir = 0;
        count = 0;
        return;
      }
      if (dir === 0) {
        if (Math.abs(pos - extreme) >= minSwingPx) {
          dir = Math.sign(pos - extreme);
          extreme = pos;
          lastTurn = t;
        }
        return;
      }
      if (t - lastTurn > maxGapMs) count = 0; // слишком вяло или была пауза
      if ((pos - extreme) * dir > 0) {
        extreme = pos; // движение продолжается в ту же сторону
      } else if (Math.abs(pos - extreme) >= minSwingPx) {
        count = t - lastTurn <= maxGapMs ? count + 1 : 1;
        lastTurn = t;
        dir = -dir;
        extreme = pos;
      }
    },
  };
}

/**
 * @param {{required?: number, minSwingPx?: number, maxGapMs?: number}} options
 * @returns {{feed(x:number, y:number, t:number): boolean, reset(): void, count: number}}
 */
export function createShakeDetector({ required = 27, minSwingPx = 35, maxGapMs = 420 } = {}) {
  const x = createAxis({ minSwingPx, maxGapMs });
  const y = createAxis({ minSwingPx, maxGapMs });
  return {
    /** true, когда набралось нужное число взмахов. */
    feed(px, py, t) {
      x.feed(px, t);
      y.feed(py, t);
      return Math.max(x.count, y.count) >= required;
    },
    reset() {
      x.reset();
      y.reset();
    },
    get count() {
      return Math.max(x.count, y.count);
    },
  };
}
