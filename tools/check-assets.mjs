// Проверка папки Assets: все ли картинки на месте и подходит ли размер листа.
// Запуск: node tools/check-assets.mjs   (или npm run check-assets)

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../js/config.js';
import { CARDS } from '../js/data/cards.js';
import { SHEET } from '../js/data/sheet-layout.js';
import { FONT_FILES } from '../js/data/fonts.js';
import { readPngSize } from '../js/core/png.js';

const root = join(fileURLToPath(new URL('..', import.meta.url)), CONFIG.assetsRoot);
const pad2 = (n) => String(n).padStart(2, '0');

async function listDir(dir) {
  try {
    return new Set(await readdir(join(root, dir)));
  } catch {
    return null;
  }
}

let problems = 0;
const say = (mark, text) => console.log(`${mark} ${text}`);
const bad = (text) => {
  problems += 1;
  say('✗', text);
};

for (const [kind, dir, pick] of [
  ['рубашки', CONFIG.backsDir, (c) => c.backFile],
  ['лицевые стороны', CONFIG.facesDir, (c) => c.faceFile],
]) {
  const files = await listDir(dir);
  if (!files) {
    bad(`Нет папки Assets/${dir}`);
    continue;
  }
  const missing = CARDS.filter((c) => !files.has(pick(c) ?? `${pad2(c.number)}.${CONFIG.cardFileExt}`)).map(
    (c) => pick(c) ?? `${pad2(c.number)}.${CONFIG.cardFileExt}`,
  );
  if (missing.length === 0) say('✓', `${kind}: найдены все ${CARDS.length}`);
  else bad(`${kind}: не хватает ${missing.length} из ${CARDS.length}: ${missing.join(', ')}`);
}

try {
  const bytes = new Uint8Array(await readFile(join(root, CONFIG.sheetFile)));
  const size = readPngSize(bytes);
  if (!size) bad(`Assets/${CONFIG.sheetFile}: это не PNG`);
  else if (size.width !== SHEET.width || size.height !== SHEET.height) {
    bad(`Assets/${CONFIG.sheetFile}: размер ${size.width}×${size.height}, ожидалось ${SHEET.width}×${SHEET.height}`);
  } else say('✓', `лист персонажа: ${size.width}×${size.height}`);
} catch {
  bad(`Нет файла Assets/${CONFIG.sheetFile}`);
}

for (const font of FONT_FILES) {
  try {
    await readFile(join(root, font.file));
    say('✓', `шрифт: ${font.file}`);
  } catch {
    bad(`Нет файла шрифта Assets/${font.file}`);
  }
}
if (FONT_FILES.length === 0) say('·', 'шрифты не подключены (js/data/fonts.js) — используются запасные');

console.log(problems === 0 ? '\nВсё на месте.' : `\nПроблем: ${problems}`);
process.exit(problems === 0 ? 0 : 1);
