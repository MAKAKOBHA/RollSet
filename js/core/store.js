// Минимальный стор: состояние неизменяемое, подписчики получают (новое, прежнее, действие).

export function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    dispatch(action) {
      const next = reducer(state, action);
      if (next !== state) {
        const prev = state;
        state = next;
        for (const listener of [...listeners]) listener(state, prev, action);
      }
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
