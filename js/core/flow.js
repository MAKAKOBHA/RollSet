// Конечный автомат сценария. Чистая логика: никакого DOM, никакой случайности внутри.
// Случайный выбор «судьбы» приходит в действии FATE_ROLLED уже готовым.

export const PHASES = Object.freeze({
  INTRO: 'intro', // приветствие: читать механику или пропустить
  RULES: 'rules', // описание механики
  NAME: 'name', // ввод имени
  CHOOSE: 'choose', // выбор трёх карт
  FATE: 'fate', // судьба выбрала, ждём «Принять судьбу» или «Выберу сам»
  CONFIRM: 'confirm', // окончательное подтверждение ручного выбора
  REVEAL: 'reveal', // карты зафиксированы, переворачиваются по одной
  TALLY: 'tally', // суммируются модификаторы
  RESULT: 'result', // лист готов
});

export const ACTIONS = Object.freeze({
  READ_RULES: 'READ_RULES',
  SKIP_RULES: 'SKIP_RULES',
  RULES_DONE: 'RULES_DONE',
  SET_NAME: 'SET_NAME',
  SUBMIT_NAME: 'SUBMIT_NAME',
  EDIT_NAME: 'EDIT_NAME',
  TOGGLE_CARD: 'TOGGLE_CARD',
  FATE_ROLLED: 'FATE_ROLLED',
  ACCEPT_FATE: 'ACCEPT_FATE',
  DECLINE_FATE: 'DECLINE_FATE',
  REQUEST_CONFIRM: 'REQUEST_CONFIRM',
  CANCEL_CONFIRM: 'CANCEL_CONFIRM',
  CONFIRM: 'CONFIRM',
  REVEAL_STEP: 'REVEAL_STEP',
  START_TALLY: 'START_TALLY',
  FINISH_TALLY: 'FINISH_TALLY',
  RESET: 'RESET',
});

export function createInitialState() {
  return {
    phase: PHASES.INTRO,
    nameDraft: '', // то, что сейчас набрано в поле
    name: '', // подтверждённое имя
    nameError: null, // 'empty' | 'too_long' | null
    selected: [], // id выбранных карт в порядке выбора
    source: null, // 'manual' | 'fate' | null
    fateUsed: false,
    manualBackup: [], // ручной выбор, который был до броска судьбы
    locked: false, // после true карты менять нельзя
    lockedIds: [], // итоговые карты
    revealed: 0, // сколько карт уже перевёрнуто лицом вверх
  };
}

/** Схлопывает пробелы, убирает управляющие символы. */
export function normalizeName(raw) {
  return String(raw ?? '')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Возвращает { ok, value, error }, error: 'empty' | 'too_long' | null. Длина считается в символах Unicode. */
export function validateName(raw, { min = 1, max = 32 } = {}) {
  const value = normalizeName(raw);
  const length = [...value].length;
  if (length < min) return { ok: false, value, error: 'empty' };
  if (length > max) return { ok: false, value, error: 'too_long' };
  return { ok: true, value, error: null };
}

export function isSelectionComplete(state, pickCount) {
  return state.selected.length === pickCount;
}

export function canRollFate(state, fate) {
  if (state.phase !== PHASES.CHOOSE || state.locked) return false;
  return !(fate.oncePerSession && state.fateUsed);
}

/**
 * ctx: { cardIds, pickCount, name: {min, max}, fate: {oncePerSession, keepPicksOnDecline} }
 * Любое действие, не подходящее текущей фазе, возвращает прежний state (ничего не меняется).
 */
export function createReducer(ctx) {
  const { pickCount, name: nameRules, fate } = ctx;
  const known = new Set(ctx.cardIds);
  const P = PHASES;
  const A = ACTIONS;

  const lock = (state) => ({
    ...state,
    phase: P.REVEAL,
    locked: true,
    lockedIds: [...state.selected],
    revealed: 0,
    manualBackup: [],
  });

  return function reduce(state, action) {
    switch (action.type) {
      case A.READ_RULES:
        return state.phase === P.INTRO ? { ...state, phase: P.RULES } : state;

      case A.SKIP_RULES:
        return state.phase === P.INTRO ? { ...state, phase: P.NAME } : state;

      case A.RULES_DONE:
        return state.phase === P.RULES ? { ...state, phase: P.NAME } : state;

      case A.SET_NAME:
        if (state.phase !== P.NAME) return state;
        return { ...state, nameDraft: String(action.name ?? ''), nameError: null };

      case A.SUBMIT_NAME: {
        if (state.phase !== P.NAME) return state;
        const result = validateName(state.nameDraft, nameRules);
        if (!result.ok) return { ...state, nameError: result.error };
        return { ...state, name: result.value, nameDraft: result.value, nameError: null, phase: P.CHOOSE };
      }

      case A.EDIT_NAME:
        if (state.phase !== P.CHOOSE || state.locked) return state;
        return { ...state, phase: P.NAME, nameDraft: state.name, nameError: null };

      case A.TOGGLE_CARD: {
        if (state.phase !== P.CHOOSE || state.locked || !known.has(action.id)) return state;
        if (state.selected.includes(action.id)) {
          return { ...state, selected: state.selected.filter((id) => id !== action.id), source: 'manual' };
        }
        if (state.selected.length >= pickCount) return state;
        return { ...state, selected: [...state.selected, action.id], source: 'manual' };
      }

      case A.FATE_ROLLED: {
        if (!canRollFate(state, fate)) return state;
        const picks = action.picks;
        const valid =
          Array.isArray(picks) &&
          picks.length === pickCount &&
          new Set(picks).size === pickCount &&
          picks.every((id) => known.has(id));
        if (!valid) return state;
        return {
          ...state,
          phase: P.FATE,
          selected: [...picks],
          source: 'fate',
          fateUsed: true,
          manualBackup: state.selected,
        };
      }

      case A.ACCEPT_FATE:
        return state.phase === P.FATE ? lock(state) : state;

      case A.DECLINE_FATE: {
        if (state.phase !== P.FATE) return state;
        return {
          ...state,
          phase: P.CHOOSE,
          selected: fate.keepPicksOnDecline ? state.selected : state.manualBackup,
          source: 'manual',
          manualBackup: [],
        };
      }

      case A.REQUEST_CONFIRM:
        if (state.phase !== P.CHOOSE || state.locked || state.selected.length !== pickCount) return state;
        return { ...state, phase: P.CONFIRM };

      case A.CANCEL_CONFIRM:
        return state.phase === P.CONFIRM ? { ...state, phase: P.CHOOSE } : state;

      case A.CONFIRM:
        if (state.phase !== P.CONFIRM || state.selected.length !== pickCount) return state;
        return lock(state);

      case A.REVEAL_STEP:
        if (state.phase !== P.REVEAL || state.revealed >= pickCount) return state;
        return { ...state, revealed: state.revealed + 1 };

      case A.START_TALLY:
        return state.phase === P.REVEAL && state.revealed === pickCount ? { ...state, phase: P.TALLY } : state;

      case A.FINISH_TALLY:
        return state.phase === P.TALLY ? { ...state, phase: P.RESULT } : state;

      case A.RESET:
        return createInitialState();

      default:
        return state;
    }
  };
}
