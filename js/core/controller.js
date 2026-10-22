// Команды приложения. Тонкая прослойка между интерфейсом и редьюсером:
// единственное место, где вызывается случайность.

import { ACTIONS, PHASES, canRollFate } from './flow.js';
import { pickUnique } from './rng.js';

export function createController({ store, cardIds, random, pickCount, fate }) {
  const send = (type, extra = {}) => store.dispatch({ type, ...extra });

  return {
    getState: store.getState,

    readRules: () => send(ACTIONS.READ_RULES),
    skipRules: () => send(ACTIONS.SKIP_RULES),
    rulesDone: () => send(ACTIONS.RULES_DONE),

    setName: (name) => send(ACTIONS.SET_NAME, { name }),
    submitName: () => send(ACTIONS.SUBMIT_NAME),
    editName: () => send(ACTIONS.EDIT_NAME),

    toggleCard: (id) => send(ACTIONS.TOGGLE_CARD, { id }),

    /** Бросок судьбы. Возвращает true, если судьба выбрала карты. */
    rollFate() {
      if (!canRollFate(store.getState(), fate)) return false;
      const picks = pickUnique(cardIds, pickCount, random);
      send(ACTIONS.FATE_ROLLED, { picks });
      return store.getState().phase === PHASES.FATE;
    },
    acceptFate: () => send(ACTIONS.ACCEPT_FATE),
    declineFate: () => send(ACTIONS.DECLINE_FATE),

    requestConfirm: () => send(ACTIONS.REQUEST_CONFIRM),
    cancelConfirm: () => send(ACTIONS.CANCEL_CONFIRM),
    confirm: () => send(ACTIONS.CONFIRM),

    revealStep: () => send(ACTIONS.REVEAL_STEP),
    startTally: () => send(ACTIONS.START_TALLY),
    finishTally: () => send(ACTIONS.FINISH_TALLY),

    reset: () => send(ACTIONS.RESET),
  };
}
