// Отрисовка карт: закрытая плитка выбора и переворачиваемая карта.
// Лицевая сторона создаётся только после фиксации выбора (stage-view), поэтому до подтверждения
// ни картинки лиц, ни модификаторы в DOM не попадают.

import { CONFIG } from '../config.js';
import { cardImagePath } from '../core/paths.js';
import { formatModifier, signClass } from '../core/skills.js';
import { SKILLS } from '../data/skills.js';
import { el } from './dom.js';

let ratioAdopted = false;

/** Подставляет реальные пропорции карты (по первой загруженной рубашке). */
function adoptRatio(image) {
  if (ratioAdopted || !image.naturalWidth || !image.naturalHeight) return;
  ratioAdopted = true;
  const root = document.documentElement.style;
  root.setProperty('--card-ratio', `${image.naturalWidth} / ${image.naturalHeight}`);
  root.setProperty('--card-num', String(image.naturalWidth / image.naturalHeight));
}

function createArt(url, fallback, { adopt = false } = {}) {
  const image = el('img', { alt: '', decoding: 'async', draggable: 'false' });
  const art = el('div', { class: 'art is-loading' }, image, fallback);

  const ready = new Promise((resolve) => {
    image.addEventListener(
      'load',
      () => {
        art.classList.remove('is-loading');
        if (adopt) adoptRatio(image);
        resolve(true);
      },
      { once: true },
    );
    image.addEventListener(
      'error',
      () => {
        art.classList.remove('is-loading');
        art.classList.add('is-missing');
        resolve(false);
      },
      { once: true },
    );
  });

  image.src = url;
  return { art, ready };
}

export function createBackArt(card) {
  const fallback = el(
    'div',
    { class: 'art-fallback art-fallback-back', 'aria-hidden': 'true' },
    el('span', { class: 'art-number' }, String(card.number).padStart(2, '0')),
  );
  return createArt(cardImagePath(CONFIG, 'back', card), fallback, { adopt: true });
}

export function createFaceArt(card) {
  const mods = el(
    'ul',
    { class: 'mods' },
    SKILLS.map((skill) => {
      const value = card.modifiers[skill.id];
      return el('li', {}, el('span', {}, skill.name), el('b', { class: signClass(value) }, formatModifier(value, { minus: '−' })));
    }),
  );
  const fallback = el('div', { class: 'art-fallback art-fallback-face' }, el('strong', { class: 'art-title' }, card.name), mods);
  return createArt(cardImagePath(CONFIG, 'face', card), fallback);
}

/**
 * Закрытая карта: только рубашка (название уже напечатано на самой карте).
 * Название остаётся в aria-label для скринридеров. interactive=false — для окон (без кнопки).
 */
export function createTile(card, { interactive = true } = {}) {
  const { art } = createBackArt(card);
  return interactive
    ? el('button', { type: 'button', class: 'tile', dataset: { id: card.id }, 'aria-pressed': 'false', 'aria-label': card.name }, art)
    : el('div', { class: 'tile is-static', role: 'img', 'aria-label': card.name }, art);
}

/** Карта, которая переворачивается рубашкой вниз → лицом вверх. ready — когда обе картинки загружены. */
export function createFlipCard(card) {
  const back = createBackArt(card);
  const face = createFaceArt(card);

  const root = el(
    'div',
    { class: 'flip', dataset: { id: card.id }, role: 'img', 'aria-label': card.name },
    el(
      'div',
      { class: 'flip-inner' },
      el('div', { class: 'flip-face flip-back' }, back.art),
      el('div', { class: 'flip-face flip-front' }, face.art),
    ),
  );

  return { root, ready: Promise.all([back.ready, face.ready]) };
}
