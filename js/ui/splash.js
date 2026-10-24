// Вступительная заставка: чёрный фон, картинка проявляется и увеличивается.
// Картинка: Assets/Intro/intro.webp (см. CONFIG.intro). Нет файла — показывается слово «Glufonde Fracture».
// Клик, Enter, Пробел или Esc пропускают заставку.

import { assetUrl } from '../core/paths.js';

const waitFor = (image, ms) =>
  new Promise((resolve) => {
    const finish = (ok) => resolve(ok);
    if (image.complete && image.naturalWidth > 0) return finish(true);
    image.addEventListener('load', () => finish(true), { once: true });
    image.addEventListener('error', () => finish(false), { once: true });
    setTimeout(() => finish(false), ms);
  });

export function runSplash(config, { reduceMotion = false } = {}) {
  const root = document.getElementById('splash');
  const html = document.documentElement;
  if (!root || !html.classList.contains('has-splash')) {
    html.classList.add('splash-done');
    return Promise.resolve();
  }

  const { durationMs, fadeOutMs, file, loadTimeoutMs } = config.intro;
  const total = reduceMotion ? Math.min(durationMs, 1500) : durationMs;
  const image = document.getElementById('splash-img');

  root.style.setProperty('--splash-ms', `${total}ms`);
  root.style.setProperty('--splash-out-ms', `${fadeOutMs}ms`);
  image.src = assetUrl(config, file);

  return new Promise((resolve) => {
    let finished = false;
    const timers = [];

    const finish = (quick = false) => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      document.removeEventListener('keydown', onKey);
      if (quick) root.style.setProperty('--splash-out-ms', '250ms');
      root.classList.add('is-leaving');
      html.classList.add('splash-done');
      setTimeout(() => {
        root.classList.add('is-done');
        resolve();
      }, quick ? 260 : fadeOutMs);
    };

    const onKey = (event) => {
      if (['Enter', ' ', 'Escape'].includes(event.key)) {
        event.preventDefault();
        finish(true);
      }
    };
    root.addEventListener('click', () => finish(true));
    document.addEventListener('keydown', onKey);

    // Часы запускаем, когда картинка загружена, чтобы анимация не прошла впустую.
    waitFor(image, loadTimeoutMs).then((ok) => {
      if (finished) return;
      if (!ok) root.classList.add('is-missing');
      root.classList.add('is-playing');
      timers.push(setTimeout(() => finish(false), total - fadeOutMs));
    });
  });
}
