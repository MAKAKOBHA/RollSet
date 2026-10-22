// Экран выбора трёх карт: сетка закрытых карт, счётчик, кнопки.

import { canRollFate, PHASES } from '../../core/flow.js';
import { createShakeDetector } from '../../core/shake.js';
import { createFaceArt, createTile } from '../card-view.js';
import { makeDraggable } from '../draggable.js';
import { $, el, replayClass } from '../dom.js';
import { STR } from '../strings.js';

export function createChooseView({ root, cards, controller, config, sound, reduceMotion }) {
  const grid = $('#card-grid', root);
  const counter = $('#counter', root);
  const fateHint = $('#fate-hint', root);
  const whoName = $('#who-name', root);
  const btnFate = $('#btn-fate', root);
  const btnConfirm = $('#btn-confirm', root);
  const { pickCount } = config;

  const tiles = new Map();

  /**
   * Пасхалка: если карту в руке сильно трясти (около 27 взмахов), она переворачивается лицом.
   * Стоит отпустить мышь — карта сразу переворачивается обратно и возвращается на место.
   */
  function easterEgg(tile, card) {
    const { shakeCount, minSwingPx, maxGapMs } = config.easter;
    let face = null;
    let cleanup = 0;
    return {
      detector: createShakeDetector({ required: shakeCount, minSwingPx, maxGapMs }),
      onShake() {
        clearTimeout(cleanup);
        if (!face) {
          face = el('div', { class: 'tile-face', 'aria-hidden': 'true' }, createFaceArt(card).art);
          tile.append(face);
        }
        void face.offsetWidth; // чтобы переход начался с исходного положения
        tile.classList.add('is-peek');
        sound?.play('flip');
      },
      onRelease() {
        tile.classList.remove('is-peek');
        sound?.play('flip');
        // лицо карты убираем из DOM, как только оно спряталось
        cleanup = setTimeout(() => {
          face?.remove();
          face = null;
        }, 500);
      },
    };
  }

  for (const card of cards) {
    const tile = createTile(card);
    tile.addEventListener('click', () => {
      const state = controller.getState();
      const isFullAndNew = state.selected.length >= pickCount && !state.selected.includes(card.id);
      controller.toggleCard(card.id);
      if (isFullAndNew) {
        replayClass(counter, 'shake');
      } else {
        sound.play(state.selected.includes(card.id) ? 'deselect' : 'select');
      }
    });
    makeDraggable(tile, { reduceMotion, shake: easterEgg(tile, card) });
    grid.append(tile);
    tiles.set(card.id, tile);
  }

  return {
    /** 27 карт по очереди «падают» сверху с небольшим поворотом. */
    dealIn() {
      const { dealMs, dealStepMs } = config.anim;
      let index = 0;
      for (const tile of tiles.values()) {
        tile.style.setProperty('--di', String(index));
        tile.style.setProperty('--dr', `${(Math.random() * 28 - 14).toFixed(1)}deg`);
        tile.style.setProperty('--dx', `${Math.round(Math.random() * 90 - 45)}px`);
        tile.style.setProperty('--deal-ms', `${dealMs}ms`);
        tile.style.setProperty('--deal-step', `${dealStepMs}ms`);
        tile.classList.remove('is-dealing');
        void tile.offsetWidth; // перезапуск анимации
        tile.classList.add('is-dealing');
        tile.addEventListener('animationend', () => tile.classList.remove('is-dealing'), { once: true });
        index += 1;
      }
    },
    sync(state) {
      const full = state.selected.length >= pickCount;

      for (const [id, tile] of tiles) {
        const index = state.selected.indexOf(id);
        const selected = index >= 0;
        tile.classList.toggle('is-selected', selected);
        tile.classList.toggle('is-fate', selected && state.source === 'fate');
        tile.classList.toggle('is-dim', !selected && full);
        tile.setAttribute('aria-pressed', String(selected));
      }

      counter.textContent = STR.counter(state.selected.length, pickCount);
      counter.classList.toggle('is-full', full);
      whoName.textContent = state.name;

      const interactive = state.phase === PHASES.CHOOSE;
      btnConfirm.disabled = !(interactive && full);

      const fateOk = canRollFate(state, config.fate);
      btnFate.disabled = !fateOk;
      const spent = config.fate.oncePerSession && state.fateUsed;
      btnFate.title = spent ? STR.fateUnavailableTitle : '';
      fateHint.textContent = spent ? STR.fateSpent : '';
    },
  };
}
