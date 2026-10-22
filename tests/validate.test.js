import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCards, validateLayout } from '../js/core/validate.js';
import { CARDS } from '../js/data/cards.js';
import { SKILLS } from '../js/data/skills.js';
import { LAYOUT, SHEET } from '../js/data/sheet-layout.js';
import { CONFIG } from '../js/config.js';

const clone = (value) => structuredClone(value);

test('данные проекта проходят проверку: 27 карт, 9 навыков, раскладка', () => {
  assert.deepEqual(validateCards(CARDS, SKILLS, { expectedCount: CONFIG.cardCount }), []);
  assert.deepEqual(validateLayout(LAYOUT, SHEET, SKILLS, CONFIG.pickCount), []);
});

test('в игре девять навыков с нужными названиями', () => {
  assert.deepEqual(
    SKILLS.map((s) => s.name),
    ['Физиология', 'Моторика', 'Внимание', 'Интуиция', 'Эмпатия', 'Разум', 'Авторитет', 'Запугивание', 'Манипуляция'],
  );
  assert.equal(new Set(SKILLS.map((s) => s.id)).size, 9);
});

test('у карт разные id, номера и названия', () => {
  assert.equal(new Set(CARDS.map((c) => c.id)).size, 27);
  assert.equal(new Set(CARDS.map((c) => c.number)).size, 27);
  assert.equal(new Set(CARDS.map((c) => c.name)).size, 27);
});

test('validateCards ловит неверное количество, дубликаты и нецелые модификаторы', () => {
  assert.match(validateCards(CARDS.slice(0, 26), SKILLS, { expectedCount: 27 }).join('\n'), /27/);

  const dup = clone(CARDS);
  dup[1].id = dup[0].id;
  assert.match(validateCards(dup, SKILLS).join('\n'), /повторяется/);

  const dupNumber = clone(CARDS);
  dupNumber[2].number = 1;
  assert.match(validateCards(dupNumber, SKILLS).join('\n'), /number 1 повторяется/);

  const bad = clone(CARDS);
  bad[3].modifiers.mind = 1.5;
  delete bad[4].modifiers.empathy;
  const errors = validateCards(bad, SKILLS);
  assert.equal(errors.length, 2);
  assert.match(errors.join('\n'), /Разум/);
  assert.match(errors.join('\n'), /Эмпатия/);

  const noName = clone(CARDS);
  noName[0].name = '  ';
  assert.match(validateCards(noName, SKILLS).join('\n'), /название/);
});

test('validateLayout ловит поля за пределами листа и пропущенные навыки', () => {
  const outside = clone(LAYOUT);
  outside.name.x = 2400;
  assert.match(validateLayout(outside, SHEET, SKILLS, 3).join('\n'), /выходит за границы/);

  const missing = clone(LAYOUT);
  delete missing.skills.mind;
  assert.match(validateLayout(missing, SHEET, SKILLS, 3).join('\n'), /Разум/);

  const two = clone(LAYOUT);
  two.archetypes.pop();
  assert.match(validateLayout(two, SHEET, SKILLS, 3).join('\n'), /ровно 3/);

  const badFont = clone(LAYOUT);
  badFont.name.minFont = 500;
  assert.match(validateLayout(badFont, SHEET, SKILLS, 3).join('\n'), /minFont/);

  const badAlign = clone(LAYOUT);
  badAlign.name.align = 'middle';
  assert.match(validateLayout(badAlign, SHEET, SKILLS, 3).join('\n'), /align/);
});

test('поля раскладки не пересекаются между собой (тестовая разметка)', () => {
  const boxes = [LAYOUT.name, ...LAYOUT.archetypes, ...Object.values(LAYOUT.skills)];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assert.equal(overlap, false, `поля ${i} и ${j} пересекаются`);
    }
  }
});

import { DERIVED } from '../js/data/derived.js';

test('раскладка с полями Хитов и Психики валидна; вне листа — ошибка; без них — тоже допустимо', () => {
  assert.deepEqual(validateLayout(LAYOUT, SHEET, SKILLS, CONFIG.pickCount, DERIVED), []);
  const bad = structuredClone(LAYOUT);
  bad.derived.hp.x = 99999;
  assert.match(validateLayout(bad, SHEET, SKILLS, CONFIG.pickCount, DERIVED).join('\n'), /Хиты/);
  const old = structuredClone(LAYOUT);
  delete old.derived;
  assert.deepEqual(validateLayout(old, SHEET, SKILLS, CONFIG.pickCount, DERIVED), []);
});
