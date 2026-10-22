// Пути к картинкам. Всё относительное, поэтому сайт одинаково работает и на
// https://user.github.io/rollset/, и локально, и на своём домене.

const pad2 = (n) => String(n).padStart(2, '0');

const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

export function assetUrl(config, ...parts) {
  return encodePath([config.assetsRoot, ...parts].join('/'));
}

/** kind: 'back' | 'face'. Файл по умолчанию — NN.png; можно переопределить полями backFile / faceFile. */
export function cardImagePath(config, kind, card) {
  if (kind !== 'back' && kind !== 'face') throw new RangeError(`Неизвестный вид картинки: ${kind}`);
  const dir = kind === 'back' ? config.backsDir : config.facesDir;
  const override = kind === 'back' ? card.backFile : card.faceFile;
  return assetUrl(config, dir, override ?? `${pad2(card.number)}.${config.cardFileExt}`);
}

export function sheetPath(config) {
  return assetUrl(config, config.sheetFile);
}
