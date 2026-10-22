import test from 'node:test';
import assert from 'node:assert/strict';
import { ellipsize, fitText, wrapWords } from '../js/core/text-fit.js';

// Моноширинная «измерялка»: каждая буква — 0.5 от размера шрифта.
const measureAt = (size) => (text) => [...text].length * size * 0.5;

test('wrapWords переносит по словам и не теряет слова', () => {
  const measure = (s) => s.length * 10;
  assert.deepEqual(wrapWords(measure, 'раз два три четыре', 80), ['раз два', 'три', 'четыре']);
  assert.deepEqual(wrapWords(measure, 'привет', 10), ['привет'], 'слишком длинное слово остаётся целым');
  assert.deepEqual(wrapWords(measure, '   ', 100), []);
});

test('ellipsize обрезает строку и ставит многоточие', () => {
  const measure = (s) => s.length * 10;
  assert.equal(ellipsize(measure, 'коротко', 100), 'коротко');
  const cut = ellipsize(measure, 'очень длинное название', 100);
  assert.ok(cut.endsWith('…'));
  assert.ok(measure(cut) <= 100);
});

test('fitText берёт максимальный шрифт, если текст помещается', () => {
  const r = fitText({ measureAt, text: 'Лис', width: 400, height: 100, maxFont: 60, minFont: 20 });
  assert.equal(r.fontSize, 60);
  assert.deepEqual(r.lines, ['Лис']);
  assert.equal(r.truncated, false);
});

test('fitText уменьшает шрифт, чтобы длинное имя влезло в одну строку', () => {
  const text = 'Александр Македонский'; // 21 символ
  const r = fitText({ measureAt, text, width: 400, height: 100, maxFont: 60, minFont: 20 });
  assert.ok(r.fontSize < 60);
  assert.equal(r.lines.length, 1);
  assert.ok(measureAt(r.fontSize)(r.lines[0]) <= 400);
  // и это максимально возможный размер
  assert.ok(measureAt(r.fontSize + 1)(r.lines[0]) > 400);
});

test('fitText использует несколько строк, когда они разрешены', () => {
  const r = fitText({ measureAt, text: 'Хранитель забытых дорог', width: 300, height: 200, maxFont: 40, minFont: 16, maxLines: 2 });
  assert.ok(r.lines.length <= 2);
  assert.equal(r.lines.join(' '), 'Хранитель забытых дорог');
  assert.equal(r.truncated, false);
});

test('fitText учитывает высоту рамки', () => {
  const r = fitText({ measureAt, text: 'раз два три четыре', width: 100, height: 60, maxFont: 40, minFont: 10, maxLines: 4 });
  assert.ok(r.lines.length * r.fontSize * 1.15 <= 60 || r.truncated);
});

test('fitText обрезает с многоточием, если не помещается даже на минимальном шрифте', () => {
  const text = 'Невероятно длинное имя которое никуда не поместится';
  const r = fitText({ measureAt, text, width: 100, height: 30, maxFont: 30, minFont: 20, maxLines: 1 });
  assert.equal(r.truncated, true);
  assert.equal(r.fontSize, 20);
  assert.equal(r.lines.length, 1);
  assert.ok(r.lines[0].endsWith('…'));
  assert.ok(measureAt(20)(r.lines[0]) <= 100);
});

test('fitText с пустым текстом возвращает пустой результат', () => {
  const r = fitText({ measureAt, text: '   ', width: 100, height: 30, maxFont: 30, minFont: 10 });
  assert.deepEqual(r.lines, []);
});
