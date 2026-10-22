// Модальные окна: «Судьба выбрала», подтверждение выбора, «Создать нового героя».
// Открытость первых двух определяется фазой автомата. Закрытие любым способом (Esc и т. д.)
// сводится к действию «Выберу сам» / «Вернуться», так что окно и состояние не расходятся.

import { PHASES as P } from '../../core/flow.js';
import { createTile } from '../card-view.js';
import { makeDraggable } from '../draggable.js';
import { $ } from '../dom.js';

const openDialog = (dialog) => {
  if (dialog.open) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
};

const closeDialog = (dialog) => {
  if (!dialog.open) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
};

export function createDialogs({ cards, controller, config, reduceMotion }) {
  const fate = $('#dlg-fate');
  const confirm = $('#dlg-confirm');
  const reset = $('#dlg-reset');
  const byId = new Map(cards.map((card) => [card.id, card]));

  $('#fate-note').hidden = !config.fate.oncePerSession;

  fate.addEventListener('close', () => {
    if (controller.getState().phase === P.FATE) controller.declineFate();
  });
  confirm.addEventListener('close', () => {
    if (controller.getState().phase === P.CONFIRM) controller.cancelConfirm();
  });

  // Три карты в окне: одинаково для «Судьба выбрала» и «Такой твой персонаж?», без подписей.
  function fillCards(container, state, { fate }) {
    container.replaceChildren(
      ...state.selected.map((id, i) => {
        const tile = createTile(byId.get(id), { interactive: false });
        tile.classList.add('deal', 'is-selected');
        if (fate) tile.classList.add('is-fate');
        tile.style.setProperty('--i', String(i));
        makeDraggable(tile, { reduceMotion });
        return tile;
      }),
    );
  }

  const fillFate = (state) => fillCards($('#fate-cards'), state, { fate: true });
  const fillConfirm = (state) => fillCards($('#confirm-cards'), state, { fate: false });

  return {
    sync(state, prev) {
      if (state.phase === P.FATE && prev?.phase !== P.FATE) fillFate(state);
      if (state.phase === P.CONFIRM && prev?.phase !== P.CONFIRM) fillConfirm(state);

      if (state.phase === P.FATE) openDialog(fate);
      else closeDialog(fate);

      if (state.phase === P.CONFIRM) openDialog(confirm);
      else closeDialog(confirm);
    },
    openReset: () => openDialog(reset),
    closeReset: () => closeDialog(reset),
  };
}
