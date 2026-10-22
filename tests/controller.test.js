import test from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../js/core/controller.js';
import { PHASES as P, createInitialState, createReducer } from '../js/core/flow.js';
import { createStore } from '../js/core/store.js';
import { sumModifiers } from '../js/core/skills.js';
import { CARDS } from '../js/data/cards.js';
import { SKILLS } from '../js/data/skills.js';
import { CONFIG } from '../js/config.js';

const cardIds = CARDS.map((c) => c.id);

function setup({ random = () => 0, fate = CONFIG.fate } = {}) {
  const reducer = createReducer({ cardIds, pickCount: 3, name: CONFIG.name, fate });
  const store = createStore(reducer, createInitialState());
  const controller = createController({ store, cardIds, random, pickCount: 3, fate });
  return { store, controller };
}

test('путь «судьба»: имя → бросок → принять → переворот → подсчёт → результат', () => {
  const { store, controller } = setup({ random: () => 0 });
  controller.skipRules();
  controller.setName('Лисса');
  controller.submitName();
  assert.equal(controller.rollFate(), true);
  assert.equal(store.getState().phase, P.FATE);
  assert.deepEqual(store.getState().selected, ['card-01', 'card-02', 'card-03']);

  controller.acceptFate();
  assert.equal(store.getState().phase, P.REVEAL);
  controller.revealStep();
  controller.revealStep();
  controller.revealStep();
  controller.startTally();
  controller.finishTally();
  assert.equal(store.getState().phase, P.RESULT);
  assert.deepEqual(store.getState().lockedIds, ['card-01', 'card-02', 'card-03']);
});

test('путь «вручную» с чтением механики', () => {
  const { store, controller } = setup();
  controller.readRules();
  controller.rulesDone();
  controller.setName('Борис');
  controller.submitName();
  ['card-05', 'card-09', 'card-14'].forEach((id) => controller.toggleCard(id));
  controller.requestConfirm();
  assert.equal(store.getState().phase, P.CONFIRM);
  controller.confirm();
  assert.equal(store.getState().phase, P.REVEAL);
  assert.deepEqual(store.getState().lockedIds, ['card-05', 'card-09', 'card-14']);
});

test('«Выберу сам» после броска не вызывает random повторно, а повторный бросок отклоняется', () => {
  let calls = 0;
  const random = () => {
    calls += 1;
    return 0.5;
  };
  const { store, controller } = setup({ random });
  controller.skipRules();
  controller.setName('Тест');
  controller.submitName();

  controller.rollFate();
  const callsAfterRoll = calls;
  assert.ok(callsAfterRoll > 0);

  controller.declineFate();
  assert.equal(calls, callsAfterRoll, 'random не вызывался при отказе');
  assert.equal(controller.rollFate(), false);
  assert.equal(calls, callsAfterRoll, 'и при попытке повторного броска');
  assert.equal(store.getState().phase, P.CHOOSE);
});

test('все выпавшие судьбой тройки уникальны при настоящем random', () => {
  for (let i = 0; i < 300; i += 1) {
    const { store, controller } = setup({ random: Math.random });
    controller.skipRules();
    controller.setName('Тест');
    controller.submitName();
    controller.rollFate();
    assert.equal(new Set(store.getState().selected).size, 3);
  }
});

test('подписчики стора получают новое и прежнее состояние', () => {
  const { store, controller } = setup();
  const seen = [];
  store.subscribe((state, prev) => seen.push([prev.phase, state.phase]));
  controller.skipRules();
  controller.skipRules(); // повтор ничего не меняет
  assert.deepEqual(seen, [[P.INTRO, P.NAME]]);
});

test('итоговые навыки считаются по зафиксированным картам', () => {
  const { store, controller } = setup({ random: () => 0 });
  controller.skipRules();
  controller.setName('Тест');
  controller.submitName();
  controller.rollFate();
  controller.acceptFate();
  const chosen = store.getState().lockedIds.map((id) => CARDS.find((c) => c.id === id));
  assert.equal(chosen.length, 3);
  const totals = sumModifiers(chosen, SKILLS);
  // независимый пересчёт «в лоб» по данным карт
  for (const skill of SKILLS) {
    let expected = 0;
    for (const card of chosen) expected += card.modifiers[skill.id];
    assert.equal(totals[skill.id], expected, skill.name);
  }
});
