import test from 'node:test';
import assert from 'node:assert/strict';
import { A4_PT, buildPdf } from '../js/core/pdf.js';

const FAKE_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 0xff, 0xd9]);
const latin1 = (bytes) => Buffer.from(bytes).toString('latin1');

function build(extra = {}) {
  return buildPdf({
    jpeg: FAKE_JPEG,
    imageWidth: 2480,
    imageHeight: 3508,
    creationDate: new Date(Date.UTC(2026, 9, 21, 12, 0, 0)),
    ...extra,
  });
}

test('PDF начинается с заголовка и заканчивается %%EOF', () => {
  const text = latin1(build());
  assert.ok(text.startsWith('%PDF-1.4\n'));
  assert.ok(text.endsWith('%%EOF\n'));
});

test('страница — A4 (595.276 × 841.89 pt)', () => {
  const text = latin1(build());
  assert.match(text, /\/MediaBox \[0 0 595\.276 841\.89\]/);
  assert.equal(A4_PT.width, 595.276);
});

test('лист 2480×3508 занимает почти всю страницу A4', () => {
  const text = latin1(build());
  const m = text.match(/q ([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm \/Im0 Do Q/);
  assert.ok(m, 'не найдена команда рисования картинки');
  const [w, h, x, y] = m.slice(1).map(Number);
  assert.ok(w <= A4_PT.width + 0.01 && h <= A4_PT.height + 0.01);
  assert.ok(w / A4_PT.width > 0.99 && h / A4_PT.height > 0.99, 'картинка должна заполнять страницу');
  assert.ok(x >= 0 && y >= 0);
});

test('картинка с другими пропорциями вписывается по центру без искажений', () => {
  const text = latin1(build({ imageWidth: 1000, imageHeight: 1000 }));
  const [w, h, x, y] = text.match(/q ([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm/).slice(1).map(Number);
  assert.ok(Math.abs(w - h) < 0.01, 'квадрат остаётся квадратом');
  assert.ok(Math.abs(x - (A4_PT.width - w) / 2) < 0.01);
  assert.ok(Math.abs(y - (A4_PT.height - h) / 2) < 0.01);
});

test('JPEG-данные вшиты без изменений', () => {
  const bytes = build();
  const text = latin1(bytes);
  const start = text.indexOf('stream\n', text.indexOf('/Subtype /Image')) + 'stream\n'.length;
  assert.deepEqual([...bytes.slice(start, start + FAKE_JPEG.length)], [...FAKE_JPEG]);
  assert.match(text, new RegExp(`/Length ${FAKE_JPEG.length} >>`));
});

test('таблица xref указывает на реальные объекты, а startxref — на таблицу', () => {
  const bytes = build();
  const text = latin1(bytes);

  const startxref = Number(text.match(/startxref\n(\d+)\n%%EOF/)[1]);
  assert.equal(text.slice(startxref, startxref + 4), 'xref');

  const table = text.slice(startxref).split('\n');
  assert.equal(table[1], '0 7');
  for (let n = 1; n <= 6; n += 1) {
    const entry = table[2 + n];
    assert.equal(entry.length, 19, 'запись xref (без \\n) занимает 19 символов + пробел');
    const offset = Number(entry.slice(0, 10));
    assert.equal(text.slice(offset, offset + `${n} 0 obj`.length), `${n} 0 obj`);
  }
});

test('заголовок кодируется UTF-16BE и сохраняет кириллицу', () => {
  const text = latin1(build({ title: 'Лисса' }));
  assert.match(text, /\/Title <FEFF041B0438044104410430>/);
});

test('дата создания в формате PDF', () => {
  assert.match(latin1(build()), /\/CreationDate \(D:20261021120000Z\)/);
});

test('некорректные аргументы отклоняются', () => {
  assert.throws(() => buildPdf({ jpeg: [1, 2, 3], imageWidth: 10, imageHeight: 10 }), TypeError);
  assert.throws(() => buildPdf({ jpeg: FAKE_JPEG, imageWidth: 0, imageHeight: 10 }), RangeError);
});
