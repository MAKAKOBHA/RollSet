import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS as A,
  PHASES as P,
  canRollFate,
  createInitialState,
  createReducer,
  normalizeName,
  validateName,
} from '../js/core/flow.js';
import { CARDS } from '../js/data/cards.js';

const ids = CARDS.map((c) => c.id);
const baseCtx = {
  cardIds: ids,
  pickCount: 3,
  name: { min: 1, max: 32 },
  fate: { oncePerSession: true, keepPicksOnDecline: false },
};

const make = (overrides = {}) => createReducer({ ...baseCtx, ...overrides });
const run = (reduce, state, ...actions) => actions.reduce((s, a) => reduce(s, a), state);

/** Состояние на экране выбора карт с именем «Тест». */
function atChoose(reduce) {
  return run(
    reduce,
    createInitialState(),
    { type: A.SKIP_RULES },
    { type: A.SET_NAME, name: '  Тест  ' },
    { type: A.SUBMIT_NAME },
  );
}

test('начальное состояние: интро, ничего не выбрано, не зафиксировано', () => {
  const s = createInitialState();
  assert.equal(s.phase, P.INTRO);
  assert.deepEqual(s.selected, []);
  assert.equal(s.locked, false);
});

test('механику можно прочитать или пропустить — оба пути ведут к вводу имени', () => {
  const reduce = make();
  const read = run(reduce, createInitialState(), { type: A.READ_RULES });
  assert.equal(read.phase, P.RULES);
  assert.equal(run(reduce, read, { type: A.RULES_DONE }).phase, P.NAME);
  assert.equal(run(reduce, createInitialState(), { type: A.SKIP_RULES }).phase, P.NAME);
});

test('действия не по фазе игнорируются (тот же объект состояния)', () => {
  const reduce = make();
  const s = createInitialState();
  assert.equal(reduce(s, { type: A.TOGGLE_CARD, id: ids[0] }), s);
  assert.equal(reduce(s, { type: A.CONFIRM }), s);
  assert.equal(reduce(s, { type: A.ACCEPT_FATE }), s);
  assert.equal(reduce(s, { type: 'НЕИЗВЕСТНОЕ' }), s);
});

test('имя нормализуется; пустое и слишком длинное не принимаются', () => {
  assert.equal(normalizeName('  Анна   Мария \n'), 'Анна Мария');
  assert.deepEqual(validateName('   '), { ok: false, value: '', error: 'empty' });
  assert.equal(validateName('я'.repeat(33), { min: 1, max: 32 }).error, 'too_long');
  assert.equal(validateName('я'.repeat(32), { min: 1, max: 32 }).ok, true);
  // эмодзи считается одним символом
  assert.equal(validateName('😀'.repeat(32), { min: 1, max: 32 }).ok, true);

  const reduce = make();
  const typed = run(reduce, createInitialState(), { type: A.SKIP_RULES }, { type: A.SET_NAME, name: '   ' });
  const rejected = reduce(typed, { type: A.SUBMIT_NAME });
  assert.equal(rejected.phase, P.NAME);
  assert.equal(rejected.nameError, 'empty');
});

test('после ввода имени открывается выбор карт, имя сохраняется очищенным', () => {
  const s = atChoose(make());
  assert.equal(s.phase, P.CHOOSE);
  assert.equal(s.name, 'Тест');
});

test('выбор: уникальные карты, максимум три, повторный клик снимает выбор', () => {
  const reduce = make();
  let s = atChoose(reduce);
  s = run(reduce, s, { type: A.TOGGLE_CARD, id: ids[0] }, { type: A.TOGGLE_CARD, id: ids[1] }, { type: A.TOGGLE_CARD, id: ids[2] });
  assert.deepEqual(s.selected, [ids[0], ids[1], ids[2]]);

  const fourth = reduce(s, { type: A.TOGGLE_CARD, id: ids[3] });
  assert.equal(fourth, s, 'четвёртую карту выбрать нельзя');

  const removed = reduce(s, { type: A.TOGGLE_CARD, id: ids[1] });
  assert.deepEqual(removed.selected, [ids[0], ids[2]]);

  assert.equal(reduce(atChoose(reduce), { type: A.TOGGLE_CARD, id: 'нет-такой' }).selected.length, 0);
});

test('подтверждение возможно только при трёх картах', () => {
  const reduce = make();
  let s = run(reduce, atChoose(reduce), { type: A.TOGGLE_CARD, id: ids[0] }, { type: A.TOGGLE_CARD, id: ids[1] });
  assert.equal(reduce(s, { type: A.REQUEST_CONFIRM }), s);
  s = reduce(s, { type: A.TOGGLE_CARD, id: ids[2] });
  const confirming = reduce(s, { type: A.REQUEST_CONFIRM });
  assert.equal(confirming.phase, P.CONFIRM);
  assert.equal(reduce(confirming, { type: A.CANCEL_CONFIRM }).phase, P.CHOOSE);
});

test('окончательное подтверждение фиксирует карты и запускает переворот', () => {
  const reduce = make();
  const s = run(
    reduce,
    atChoose(reduce),
    { type: A.TOGGLE_CARD, id: ids[4] },
    { type: A.TOGGLE_CARD, id: ids[5] },
    { type: A.TOGGLE_CARD, id: ids[6] },
    { type: A.REQUEST_CONFIRM },
    { type: A.CONFIRM },
  );
  assert.equal(s.phase, P.REVEAL);
  assert.equal(s.locked, true);
  assert.deepEqual(s.lockedIds, [ids[4], ids[5], ids[6]]);
  assert.equal(s.revealed, 0);
});

test('после фиксации архетипы изменить нельзя ни одним действием', () => {
  const reduce = make();
  const locked = run(
    reduce,
    atChoose(reduce),
    { type: A.TOGGLE_CARD, id: ids[0] },
    { type: A.TOGGLE_CARD, id: ids[1] },
    { type: A.TOGGLE_CARD, id: ids[2] },
    { type: A.REQUEST_CONFIRM },
    { type: A.CONFIRM },
  );
  const attempts = [
    { type: A.TOGGLE_CARD, id: ids[9] },
    { type: A.TOGGLE_CARD, id: ids[0] },
    { type: A.FATE_ROLLED, picks: [ids[7], ids[8], ids[9]] },
    { type: A.DECLINE_FATE },
    { type: A.EDIT_NAME },
    { type: A.REQUEST_CONFIRM },
    { type: A.CANCEL_CONFIRM },
    { type: A.SET_NAME, name: 'Другой' },
  ];
  for (const action of attempts) {
    const next = reduce(locked, action);
    assert.deepEqual(next.lockedIds, locked.lockedIds, `${action.type} не должен менять карты`);
    assert.equal(next.phase, P.REVEAL);
  }
  // и в поздних фазах тоже
  let late = run(reduce, locked, { type: A.REVEAL_STEP }, { type: A.REVEAL_STEP }, { type: A.REVEAL_STEP }, { type: A.START_TALLY });
  assert.equal(reduce(late, { type: A.TOGGLE_CARD, id: ids[9] }), late);
  late = reduce(late, { type: A.FINISH_TALLY });
  assert.equal(late.phase, P.RESULT);
  assert.equal(reduce(late, { type: A.TOGGLE_CARD, id: ids[9] }), late);
  assert.equal(reduce(late, { type: A.FATE_ROLLED, picks: [ids[7], ids[8], ids[9]] }), late);
});

test('судьба: три уникальные карты, источник «fate», ждёт решения игрока', () => {
  const reduce = make();
  const s = reduce(atChoose(reduce), { type: A.FATE_ROLLED, picks: [ids[3], ids[10], ids[20]] });
  assert.equal(s.phase, P.FATE);
  assert.equal(s.source, 'fate');
  assert.deepEqual(s.selected, [ids[3], ids[10], ids[20]]);
  assert.equal(s.locked, false);
});

test('судьба отвергает неверные наборы: дубликаты, чужие id, не три карты', () => {
  const reduce = make();
  const s = atChoose(reduce);
  assert.equal(reduce(s, { type: A.FATE_ROLLED, picks: [ids[0], ids[0], ids[1]] }), s);
  assert.equal(reduce(s, { type: A.FATE_ROLLED, picks: [ids[0], ids[1], 'левая'] }), s);
  assert.equal(reduce(s, { type: A.FATE_ROLLED, picks: [ids[0], ids[1]] }), s);
  assert.equal(reduce(s, { type: A.FATE_ROLLED }), s);
});

test('«Принять судьбу» фиксирует выпавшие карты', () => {
  const reduce = make();
  const s = run(reduce, atChoose(reduce), { type: A.FATE_ROLLED, picks: [ids[3], ids[10], ids[20]] }, { type: A.ACCEPT_FATE });
  assert.equal(s.phase, P.REVEAL);
  assert.equal(s.locked, true);
  assert.deepEqual(s.lockedIds, [ids[3], ids[10], ids[20]]);
});

test('«Выберу сам» возвращает к ручному выбору без нового рандома', () => {
  const reduce = make();
  const s = run(reduce, atChoose(reduce), { type: A.FATE_ROLLED, picks: [ids[3], ids[10], ids[20]] }, { type: A.DECLINE_FATE });
  assert.equal(s.phase, P.CHOOSE);
  assert.equal(s.source, 'manual');
  assert.equal(s.locked, false);
  assert.deepEqual(s.selected, [], 'карты судьбы сняты');
  assert.equal(s.fateUsed, true);
  assert.equal(canRollFate(s, baseCtx.fate), false, 'повторный бросок недоступен');
  assert.equal(reduce(s, { type: A.FATE_ROLLED, picks: [ids[0], ids[1], ids[2]] }), s);
});

test('«Выберу сам» возвращает прежний ручной выбор, если он был до броска', () => {
  const reduce = make();
  const s = run(
    reduce,
    atChoose(reduce),
    { type: A.TOGGLE_CARD, id: ids[0] },
    { type: A.TOGGLE_CARD, id: ids[1] },
    { type: A.FATE_ROLLED, picks: [ids[3], ids[10], ids[20]] },
    { type: A.DECLINE_FATE },
  );
  assert.deepEqual(s.selected, [ids[0], ids[1]]);
});

test('настройка keepPicksOnDecline оставляет карты судьбы отмеченными', () => {
  const reduce = make({ fate: { oncePerSession: true, keepPicksOnDecline: true } });
  const s = run(reduce, atChoose(reduce), { type: A.FATE_ROLLED, picks: [ids[3], ids[10], ids[20]] }, { type: A.DECLINE_FATE });
  assert.deepEqual(s.selected, [ids[3], ids[10], ids[20]]);
  assert.equal(s.locked, false);
  const changed = reduce(s, { type: A.TOGGLE_CARD, id: ids[3] });
  assert.equal(changed.selected.length, 2, 'после отказа выбор снова ручной');
});

test('настройка oncePerSession: false разрешает повторный бросок', () => {
  const reduce = make({ fate: { oncePerSession: false, keepPicksOnDecline: false } });
  const declined = run(reduce, atChoose(reduce), { type: A.FATE_ROLLED, picks: [ids[3], ids[10], ids[20]] }, { type: A.DECLINE_FATE });
  assert.equal(canRollFate(declined, { oncePerSession: false }), true);
  const again = reduce(declined, { type: A.FATE_ROLLED, picks: [ids[1], ids[2], ids[4]] });
  assert.equal(again.phase, P.FATE);
});

test('имя можно изменить до фиксации, выбор карт сохраняется', () => {
  const reduce = make();
  let s = run(reduce, atChoose(reduce), { type: A.TOGGLE_CARD, id: ids[0] }, { type: A.EDIT_NAME });
  assert.equal(s.phase, P.NAME);
  assert.equal(s.nameDraft, 'Тест');
  s = run(reduce, s, { type: A.SET_NAME, name: 'Новое имя' }, { type: A.SUBMIT_NAME });
  assert.equal(s.phase, P.CHOOSE);
  assert.equal(s.name, 'Новое имя');
  assert.deepEqual(s.selected, [ids[0]]);
});

test('переворот идёт по одной карте, подсчёт — только после третьей', () => {
  const reduce = make();
  let s = run(
    reduce,
    atChoose(reduce),
    { type: A.FATE_ROLLED, picks: [ids[0], ids[1], ids[2]] },
    { type: A.ACCEPT_FATE },
  );
  assert.equal(reduce(s, { type: A.START_TALLY }), s, 'рано считать');
  s = reduce(s, { type: A.REVEAL_STEP });
  assert.equal(s.revealed, 1);
  s = run(reduce, s, { type: A.REVEAL_STEP }, { type: A.REVEAL_STEP }, { type: A.REVEAL_STEP });
  assert.equal(s.revealed, 3, 'больше трёх перевернуть нельзя');
  s = reduce(s, { type: A.START_TALLY });
  assert.equal(s.phase, P.TALLY);
  assert.equal(reduce(s, { type: A.FINISH_TALLY }).phase, P.RESULT);
});

test('RESET начинает с чистого состояния', () => {
  const reduce = make();
  const s = run(reduce, atChoose(reduce), { type: A.FATE_ROLLED, picks: [ids[0], ids[1], ids[2]] }, { type: A.ACCEPT_FATE });
  assert.deepEqual(reduce(s, { type: A.RESET }), createInitialState());
});
