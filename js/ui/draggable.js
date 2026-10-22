// Карту можно взять (зажать левую кнопку мыши или удерживать палец) и поводить по экрану:
// она тянется за курсором, наклоняется до ±30° и при отпускании пружинит на своё место.
// Смещение и наклон задаются свойствами translate / rotate, поэтому они складываются
// с transform карты (увеличение, анимации, переворот) и ничего не ломают.

import { createBody, isSettled, SPRINGS, stepBody, tiltTarget } from '../core/card-physics.js';

const DRAG_START_PX = 6; // сдвиг мыши, после которого клик превращается в перетаскивание
const TOUCH_HOLD_MS = 260; // палец нужно придержать, иначе это обычная прокрутка страницы
const TOUCH_CANCEL_PX = 10;

/**
 * @param {{reduceMotion?: () => boolean, shake?: {detector: object, onShake: () => void, onRelease: () => void}}} options
 *   shake — необязательная «пасхалка»: если карту сильно трясти, вызывается onShake,
 *   а при отпускании — onRelease.
 */
export function makeDraggable(node, { reduceMotion = () => false, shake = null } = {}) {
  const body = createBody();
  const goal = { x: 0, y: 0, a: 0 };
  let pointerId = null;
  let pending = false; // кнопка нажата, но порога ещё нет
  let dragging = false;
  let active = false; // идёт анимация (перетаскивание или возврат)
  let suppressClick = false;
  let shaken = false;
  let holdTimer = 0;
  let raf = 0;
  let last = 0;
  let down = { x: 0, y: 0, bx: 0, by: 0 };

  const springsFor = () => ({ pos: dragging ? SPRINGS.follow : SPRINGS.settle, tilt: SPRINGS.tilt });

  function apply() {
    node.style.translate = `${body.x.toFixed(2)}px ${body.y.toFixed(2)}px`;
    node.style.rotate = `${body.a.toFixed(2)}deg`;
  }

  function finish() {
    active = false;
    cancelAnimationFrame(raf);
    Object.assign(body, createBody());
    node.style.removeProperty('translate');
    node.style.removeProperty('rotate');
    node.classList.remove('is-dragging');
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    if (dragging) goal.a = tiltTarget(body.vx);
    else goal.a = 0;
    stepBody(body, goal, springsFor(), dt);
    apply();
    if (!dragging && isSettled(body, goal)) {
      finish();
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function run() {
    if (active) return;
    active = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function begin() {
    dragging = true;
    pending = false;
    suppressClick = true;
    shaken = false;
    shake?.detector.reset();
    node.classList.add('is-dragging');
    try {
      node.setPointerCapture(pointerId);
    } catch {
      /* указатель уже отпущен */
    }
    run();
  }

  function release() {
    clearTimeout(holdTimer);
    const wasDragging = dragging;
    if (shaken) {
      shaken = false;
      shake.onRelease();
    }
    pending = false;
    dragging = false;
    if (pointerId !== null) {
      try {
        node.releasePointerCapture(pointerId);
      } catch {
        /* уже снят */
      }
    }
    pointerId = null;
    if (wasDragging) {
      goal.x = 0;
      goal.y = 0;
      if (reduceMotion()) finish();
      else run();
      setTimeout(() => {
        suppressClick = false; // клик после перетаскивания уже прошёл (и был погашен)
      }, 0);
    }
  }

  node.addEventListener('pointerdown', (event) => {
    if (pointerId !== null) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerId = event.pointerId;
    pending = true;
    down = { x: event.clientX, y: event.clientY, bx: body.x, by: body.y };
    if (event.pointerType === 'touch') {
      holdTimer = setTimeout(() => {
        if (pending) begin();
      }, TOUCH_HOLD_MS);
    }
  });

  node.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;

    if (pending) {
      const moved = Math.hypot(dx, dy);
      if (event.pointerType === 'touch') {
        if (moved > TOUCH_CANCEL_PX) {
          // палец поехал до удержания: это прокрутка страницы
          clearTimeout(holdTimer);
          pending = false;
          pointerId = null;
        }
        return;
      }
      if (moved < DRAG_START_PX) return;
      begin();
    }
    if (!dragging) return;

    // карта не покидает экран: ограничиваем положение курсора окном
    const px = Math.min(window.innerWidth, Math.max(0, event.clientX));
    const py = Math.min(window.innerHeight, Math.max(0, event.clientY));
    goal.x = down.bx + (px - down.x);
    goal.y = down.by + (py - down.y);

    if (shake && !shaken && shake.detector.feed(px, py, event.timeStamp)) {
      shaken = true;
      shake.onShake();
    }
  });

  node.addEventListener('pointerup', (event) => {
    if (event.pointerId === pointerId) release();
  });
  node.addEventListener('pointercancel', (event) => {
    if (event.pointerId === pointerId) release();
  });
  node.addEventListener('lostpointercapture', () => {
    if (dragging) release();
  });

  // после перетаскивания «клик» не должен выбирать карту
  node.addEventListener(
    'click',
    (event) => {
      if (suppressClick) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true,
  );

  // удерживаемый палец не должен прокручивать страницу или вызывать меню
  node.addEventListener(
    'touchmove',
    (event) => {
      if (dragging) event.preventDefault();
    },
    { passive: false },
  );
  node.addEventListener('contextmenu', (event) => {
    if (dragging || pending) event.preventDefault();
  });

  return { destroy: finish };
}
