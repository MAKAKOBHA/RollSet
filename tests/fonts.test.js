import test from 'node:test';
import assert from 'node:assert/strict';
import { FONT_ROLES, normalizeFontEntries, rolesOfFile } from '../js/core/fonts.js';

test('запись только с file подключает шрифт ко всем трём ролям', () => {
  const { faces, problems } = normalizeFontEntries([{ file: 'Fonts/My.ttf' }]);
  assert.deepEqual(problems, []);
  assert.deepEqual(faces.map((f) => f.family).sort(), Object.values(FONT_ROLES).sort());
  assert.ok(faces.every((f) => f.file === 'Fonts/My.ttf' && f.weight === '100 900' && f.style === 'normal'));
});

test('roles ограничивают роли, повторы убираются', () => {
  const { faces } = normalizeFontEntries([{ file: 'Fonts/A.woff2', roles: ['sheet', 'sheet', 'display'] }]);
  assert.deepEqual(faces.map((f) => f.family).sort(), ['RollSet Display', 'RollSet Sheet']);
  assert.deepEqual(rolesOfFile(faces, 'Fonts/A.woff2').sort(), ['display', 'sheet']);
});

test('прежний формат с family из трёх допустимых имён работает', () => {
  const { faces, problems } = normalizeFontEntries([{ family: 'RollSet Body', file: 'Fonts/B.woff2', weight: '400' }]);
  assert.deepEqual(problems, []);
  assert.deepEqual(faces, [{ family: 'RollSet Body', file: 'Fonts/B.woff2', weight: '400', style: 'normal' }]);
});

test('своё имя family — это ошибка с понятным пояснением (шрифт иначе молча не применился бы)', () => {
  const { faces, problems } = normalizeFontEntries([{ family: 'MyFont', file: 'Fonts/My.ttf' }]);
  assert.equal(faces.length, 0);
  assert.match(problems[0], /MyFont/);
  assert.match(problems[0], /roles/);
});

test('лишний «Assets/» и обратные слэши в пути исправляются', () => {
  assert.equal(normalizeFontEntries([{ file: 'Assets/Fonts/X.ttf' }]).faces[0].file, 'Fonts/X.ttf');
  assert.equal(normalizeFontEntries([{ file: 'assets\\Fonts\\X.ttf' }]).faces[0].file, 'Fonts/X.ttf');
  assert.equal(normalizeFontEntries([{ file: './Fonts/Шрифт 1.otf' }]).faces[0].file, './Fonts/Шрифт 1.otf'.replace(/^\.\//, './'));
});

test('ошибки: нет file, не тот формат, неизвестная роль', () => {
  assert.match(normalizeFontEntries([{}]).problems[0], /file/);
  assert.match(normalizeFontEntries([{ file: 'Fonts/x.exe' }]).problems[0], /woff2/);
  assert.match(normalizeFontEntries([{ file: 'Fonts/x.ttf', roles: ['title'] }]).problems[0], /display, body, sheet/);
  assert.deepEqual(normalizeFontEntries([]).faces, []);
  assert.deepEqual(normalizeFontEntries(undefined).problems, []);
});

test('weight и style передаются как указаны', () => {
  const [face] = normalizeFontEntries([{ file: 'Fonts/x.ttf', roles: ['body'], weight: '700', style: 'italic' }]).faces;
  assert.equal(face.weight, '700');
  assert.equal(face.style, 'italic');
});
