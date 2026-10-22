import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFileName, slugifyName } from '../js/core/filename.js';
import { cardImagePath, sheetPath } from '../js/core/paths.js';
import { readPngSize } from '../js/core/png.js';
import { CONFIG } from '../js/config.js';
import { CARDS } from '../js/data/cards.js';

test('имя файла сохраняет кириллицу и убирает лишнее', () => {
  assert.equal(slugifyName('Лисса Тёмная'), 'лисса_тёмная');
  assert.equal(slugifyName('  Бор/ис: *№1* '), 'бор_ис_1');
  assert.equal(slugifyName('///'), 'character');
  assert.equal(slugifyName(''), 'character');
  assert.equal(makeFileName('Лисса', 'png'), 'rollset_лисса.png');
  assert.ok([...slugifyName('а'.repeat(100))].length <= 40);
});

test('пути к картинкам: Assets/Backs/NN.png и Assets/Faces/NN.png', () => {
  assert.equal(cardImagePath(CONFIG, 'back', CARDS[0]), 'Assets/Backs/01.png');
  assert.equal(cardImagePath(CONFIG, 'face', CARDS[26]), 'Assets/Faces/27.png');
  assert.equal(sheetPath(CONFIG), 'Assets/Sheet/character-sheet.png');
});

test('в путях можно переопределить имя файла, пробелы и кириллица кодируются', () => {
  const card = { ...CARDS[0], faceFile: 'Моя карта.png' };
  assert.equal(cardImagePath(CONFIG, 'face', card), `Assets/Faces/${encodeURIComponent('Моя карта.png')}`);
  assert.throws(() => cardImagePath(CONFIG, 'side', CARDS[0]), RangeError);
});

test('readPngSize читает ширину и высоту из заголовка', () => {
  const header = new Uint8Array(33);
  header.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(header.buffer);
  view.setUint32(8, 13);
  header.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, 2480);
  view.setUint32(20, 3508);
  assert.deepEqual(readPngSize(header), { width: 2480, height: 3508 });
  assert.equal(readPngSize(new Uint8Array(10)), null);
  assert.equal(readPngSize(new Uint8Array(40)), null);
});

test('в проекте нет запрещённых хранилищ', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const banned = /\b(localStorage|sessionStorage|indexedDB)\b/;
  const files = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(js|html)$/.test(entry.name)) files.push(full);
    }
  };
  const root = new URL('../js/', import.meta.url).pathname;
  await walk(root);
  files.push(new URL('../index.html', import.meta.url).pathname);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    // комментарии допустимы, поэтому ищем только в коде без строк-комментариев
    const code = source.split('\n').filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*')).join('\n');
    assert.doesNotMatch(code, banned, `${file}: найдено обращение к запрещённому хранилищу`);
  }
});
