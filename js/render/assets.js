// Загрузка картинок. Никогда не отклоняется: если файла нет, возвращает null,
// а интерфейс показывает временную заглушку.

export function loadImage(url, { timeoutMs = 20000 } = {}) {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';

    const finish = (value) => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);

    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = url;
  });
}
