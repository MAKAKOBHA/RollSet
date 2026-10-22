// Фоновая подгрузка лицевых сторон карт в кэш браузера. Картинки нигде не отображаются и в DOM
// не добавляются: когда карта переворачивается (финал или пасхалка), файл уже скачан.

import { runPool } from '../core/pool.js';

export function preloadImages(urls, { concurrency = 2, startDelayMs = 1500 } = {}) {
  if (navigator.connection?.saveData) return; // режим экономии трафика
  const tasks = urls.map((url) => () =>
    new Promise((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'low'; // не мешаем рубашкам и интерфейсу
      image.onload = image.onerror = () => resolve();
      image.src = url;
    }),
  );
  setTimeout(() => runPool(tasks, concurrency), startDelayMs);
}
