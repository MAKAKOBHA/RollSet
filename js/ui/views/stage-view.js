// Финальный экран: карты по очереди переворачиваются, затем считаются навыки,
// затем собирается лист и появляются кнопки скачивания.

import { PHASES as P } from '../../core/flow.js';
import { buildBreakdown, buildCharacter, computeDerived, formatModifier, signClass } from '../../core/skills.js';
import { exportPdf, exportPng } from '../../render/export.js';
import { createFlipCard } from '../card-view.js';
import { makeDraggable } from '../draggable.js';
import { $, el, sleep } from '../dom.js';
import { STR } from '../strings.js';

const MINUS = '−'; // в интерфейсе — настоящий минус; на листе — знак из SHEET_STYLE

export function createStageView({ root, cards, skills, controller, sheetService, config, reduceMotion, sound, derived }) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const title = $('#stage-title', root);
  const cardsBox = $('#reveal-cards', root);
  const tally = $('#tally', root);
  const thead = $('#tally-head', root);
  const tbody = $('#tally-body', root);
  const result = $('#result', root);
  const preview = $('#sheet-preview', root);
  const status = $('#export-status', root);
  const { anim } = config;

  let flips = [];
  let rows = [];
  let current = null; // { name, chosen }
  let runId = 0;

  /** При «уменьшении движения» паузы сокращаются: CSS-переходы в этом режиме и так мгновенные. */
  const t = (ms) => (reduceMotion() ? Math.round(ms * 0.2) : ms);

  function build(state) {
    const chosen = state.lockedIds.map((id) => byId.get(id));
    current = { name: state.name, chosen };
    title.textContent = state.name;

    flips = chosen.map((card, i) => createFlipCard(card));
    flips.forEach((flip) => makeDraggable(flip.root, { reduceMotion }));
    cardsBox.replaceChildren(...flips.map((flip) => flip.root));

    thead.replaceChildren(
      el(
        'tr',
        {},
        el('th', { scope: 'col' }, 'Навык'),
        ...chosen.map((card, i) => el('th', { scope: 'col', title: card.name }, el('span', { class: 'num-badge', 'aria-label': `Карта ${i + 1}: ${card.name}` }, String(i + 1)))),
        el('th', { scope: 'col' }, 'Итого'),
      ),
    );

    rows = buildBreakdown(chosen, skills).map((row) => {
      const totalCell = el('td', { class: 'cell-total zero' }, '0');
      const tr = el(
        'tr',
        {},
        el('th', { scope: 'row' }, row.skill.name),
        ...row.perCard.map((value) => el('td', { class: `cell-mod ${signClass(value)}` }, formatModifier(value, { minus: MINUS }))),
        totalCell,
      );
      return { row, tr, totalCell };
    });

    // Хиты и Психика: итоговая строка с пояснением формулы
    const skillTotals = Object.fromEntries(rows.map((r) => [r.row.skill.id, r.row.total]));
    const derivedValues = computeDerived(derived, skillTotals);
    const nameOf = (id) => skills.find((s) => s.id === id)?.name ?? id;
    const derivedRows = derived.map((def) => {
      const totalCell = el('td', { class: 'cell-total zero' }, '0');
      const tr = el(
        'tr',
        { class: 'derived-row' },
        el('th', { scope: 'row' }, def.name),
        el('td', { class: 'cell-formula', colspan: String(chosen.length) }, `${def.base} + ${def.from.map(nameOf).join(' + ')}`),
        totalCell,
      );
      return { row: { total: derivedValues[def.id] }, tr, totalCell, plain: true };
    });
    rows = [...rows, ...derivedRows];
    tbody.replaceChildren(...rows.map((r) => r.tr));

    preview.replaceChildren();
    status.textContent = '';
  }

  function countTo(cell, target, ms, plain = false) {
    const apply = (value) => {
      cell.textContent = plain ? (value < 0 ? `${MINUS}${Math.abs(value)}` : String(value)) : formatModifier(value, { minus: MINUS });
      cell.className = `cell-total ${plain ? 'derived' : signClass(value)}`;
    };
    if ((target === 0 && !plain) || ms <= 0) {
      apply(target);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min(1, (now - start) / ms);
        apply(Math.round(target * (1 - (1 - progress) ** 3)));
        if (progress < 1) requestAnimationFrame(step);
        else {
          apply(target);
          cell.classList.add('pop');
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  async function play(state, screenShown = Promise.resolve()) {
    const run = ++runId;
    const alive = () => run === runId;
    build(state);

    // Ждём, пока финальный экран плавно проявится, картинки лиц (но не дольше 8 секунд) и паузу.
    await screenShown;
    await Promise.all([Promise.race([Promise.all(flips.map((f) => f.ready)), sleep(8000)]), sleep(t(anim.introPauseMs))]);

    for (let i = 0; i < flips.length; i += 1) {
      if (!alive()) return;
      controller.revealStep();
      sound.play('flip');
      await sleep(t(anim.flipMs + anim.revealGapMs));
    }
    if (!alive()) return;

    controller.startTally();
    await sleep(t(300));

    let lastCount = Promise.resolve();
    for (const r of rows) {
      if (!alive()) return;
      r.tr.classList.add('is-in');
      lastCount = countTo(r.totalCell, r.row.total, t(anim.countUpMs), r.plain);
      await sleep(t(anim.tallyRowMs));
    }
    await lastCount;
    if (!alive()) return;

    try {
      const character = buildCharacter({ name: current.name, cards: current.chosen, skills, derived });
      const canvas = await sheetService.render(character);
      if (!alive()) return;
      preview.replaceChildren(canvas);
    } catch (error) {
      status.textContent = STR.renderFailed(error?.message ?? error);
    }
    if (alive()) {
      sound.play('sheetReady');
      controller.finishTally();
    }
  }

  async function doExport(kind, button) {
    const canvas = sheetService.getCanvas();
    if (!canvas || !current) return;

    button.classList.add('is-busy');
    button.disabled = true;
    status.textContent = STR.exporting;
    try {
      await sleep(40); // даём браузеру показать индикатор до тяжёлой работы
      const filename =
        kind === 'png' ? await exportPng(canvas, current.name) : await exportPdf(canvas, current.name, config.pdf);
      status.textContent = STR.exported(filename);
    } catch (error) {
      status.textContent = STR.exportFailed(error?.message ?? error);
    } finally {
      button.classList.remove('is-busy');
      button.disabled = false;
    }
  }

  return {
    sync(state, prev, screenShown) {
      const inStage = state.phase === P.REVEAL || state.phase === P.TALLY || state.phase === P.RESULT;
      const wasInStage = prev && (prev.phase === P.REVEAL || prev.phase === P.TALLY || prev.phase === P.RESULT);

      if (!inStage) {
        if (wasInStage) {
          runId += 1; // отменяем идущую анимацию после «начать заново»
          sheetService.clear();
          flips = [];
          rows = [];
          current = null;
          cardsBox.replaceChildren();
          preview.replaceChildren();
        }
        return;
      }

      if (state.phase === P.REVEAL && prev?.phase !== P.REVEAL) play(state, screenShown);

      flips.forEach((flip, i) => flip.root.classList.toggle('is-flipped', i < state.revealed));
      tally.hidden = !(state.phase === P.TALLY || state.phase === P.RESULT);
      result.hidden = state.phase !== P.RESULT;
    },
    export: doExport,
  };
}
