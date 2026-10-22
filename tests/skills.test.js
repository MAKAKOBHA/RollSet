import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBreakdown, formatModifier, signClass, sumModifiers } from '../js/core/skills.js';

const skills = [
  { id: 'a', name: 'Первый' },
  { id: 'b', name: 'Второй' },
];

const cards = [
  { name: 'К1', modifiers: { a: 2, b: -1 } },
  { name: 'К2', modifiers: { a: -3, b: -1 } },
  { name: 'К3', modifiers: { a: 1, b: 0 } },
];

test('sumModifiers складывает модификаторы трёх карт по каждому навыку', () => {
  assert.deepEqual(sumModifiers(cards, skills), { a: 0, b: -2 });
});

test('buildBreakdown показывает вклад каждой карты в порядке выбора', () => {
  const rows = buildBreakdown(cards, skills);
  assert.deepEqual(rows[0].perCard, [2, -3, 1]);
  assert.equal(rows[0].total, 0);
  assert.deepEqual(rows[1].perCard, [-1, -1, 0]);
  assert.equal(rows[1].total, -2);
  assert.equal(rows[0].skill, skills[0]);
});

test('отсутствующий или нечисловой модификатор — ошибка, а не тихий ноль', () => {
  assert.throws(() => sumModifiers([{ name: 'Плохая', modifiers: { a: 1 } }], skills), /Плохая/);
  assert.throws(() => sumModifiers([{ name: 'Строка', modifiers: { a: 1, b: '2' } }], skills), TypeError);
});

test('formatModifier', () => {
  assert.equal(formatModifier(3), '+3');
  assert.equal(formatModifier(-2), '-2');
  assert.equal(formatModifier(0), '0');
  assert.equal(formatModifier(-2, { minus: '−' }), '−2');
  assert.equal(formatModifier(5, { plus: '' }), '5');
});

test('signClass', () => {
  assert.equal(signClass(1), 'pos');
  assert.equal(signClass(-1), 'neg');
  assert.equal(signClass(0), 'zero');
});

import { buildCharacter, computeDerived } from '../js/core/skills.js';
import { DERIVED } from '../js/data/derived.js';
import { SKILLS } from '../js/data/skills.js';

test('Хиты = 10 + Моторика, Психика = 10 + Запугивание + Разум + Авторитет', () => {
  const totals = Object.fromEntries(SKILLS.map((s) => [s.id, 0]));
  assert.deepEqual(computeDerived(DERIVED, totals), { hp: 10, psyche: 10 });
  assert.deepEqual(computeDerived(DERIVED, { ...totals, motorics: 3, intimidation: 2, mind: -1, authority: 4 }), { hp: 13, psyche: 15 });
});

test('показатели уменьшаются при отрицательных навыках и могут уйти ниже нуля', () => {
  const totals = Object.fromEntries(SKILLS.map((s) => [s.id, 0]));
  assert.deepEqual(computeDerived(DERIVED, { ...totals, motorics: -2, intimidation: -5, mind: -4, authority: -3 }), { hp: 8, psyche: -2 });
});

test('buildCharacter включает производные показатели; навыки остаются суммой карт', () => {
  const mod = (v) => Object.fromEntries(SKILLS.map((s) => [s.id, v]));
  const cards3 = [1, 2, 3].map((n) => ({ name: `К${n}`, modifiers: mod(1) }));
  const ch = buildCharacter({ name: 'X', cards: cards3, skills: SKILLS, derived: DERIVED });
  assert.equal(ch.skills.motorics, 3);
  assert.deepEqual(ch.derived, { hp: 13, psyche: 19 });
  assert.deepEqual(buildCharacter({ name: 'X', cards: cards3, skills: SKILLS }).derived, {});
});
