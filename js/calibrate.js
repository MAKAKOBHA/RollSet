// Страница калибровки: перетаскиваемые рамки поверх листа, пробный текст, готовый код для sheet-layout.js.

import { CONFIG } from './config.js';
import { sheetPath } from './core/paths.js';
import { LAYOUT, SHEET, SHEET_STYLE } from './data/sheet-layout.js';
import { DERIVED } from './data/derived.js';
import { SKILLS } from './data/skills.js';
import { FONT_FILES, FONT_STACKS, FONT_TEST_TEXT } from './data/fonts.js';
import { loadImage } from './render/assets.js';
import { loadFonts } from './render/fonts.js';
import { drawSheet } from './render/sheet-renderer.js';
import { $, el } from './ui/dom.js';

const layout = structuredClone(LAYOUT);

/** В старой раскладке полей Хитов и Психики может не быть: добавляем их, чтобы их можно было расставить. */
function ensureDerived(target) {
  target.derived ??= {};
  DERIVED.forEach((def, i) => {
    target.derived[def.id] ??= { x: 240 + i * 870, y: 3000, w: 260, h: 180, align: 'center', maxFont: 120, minFont: 50, maxLines: 1 };
  });
}
ensureDerived(layout);
delete layout.isTestLayout;

const canvas = $('#cal-canvas');
const wrap = $('#wrap');
const boxesLayer = $('#boxes');
const status = $('#cal-status');
const out = $('#out');
const fields = ['x', 'y', 'w', 'h', 'maxFont', 'minFont', 'maxLines'];

let sheetImage = null;
let selected = 'name';
let scale = 1;
let redrawTimer = 0;

/** Все поля раскладки как плоский список: { key, label, box, kind }. */
function allBoxes() {
  return [
    { key: 'name', label: 'Имя', box: layout.name, kind: 'name' },
    ...layout.archetypes.map((box, i) => ({ key: `arch${i}`, label: `Архетип ${i + 1}`, box, kind: 'arch' })),
    ...SKILLS.map((skill) => ({ key: `skill:${skill.id}`, label: skill.name, box: layout.skills[skill.id], kind: 'skill' })),
    ...DERIVED.map((def) => ({ key: `derived:${def.id}`, label: def.name, box: layout.derived[def.id], kind: 'derived' })),
  ];
}

const find = (key) => allBoxes().find((item) => item.key === key);

function character() {
  const arch = $('#t-arch').value;
  const value = Number($('#t-num').value);
  return {
    name: $('#t-name').value,
    archetypes: [arch, arch, arch],
    skills: Object.fromEntries(SKILLS.map((skill) => [skill.id, value])),
    derived: Object.fromEntries(DERIVED.map((def) => [def.id, 10 + value])),
  };
}

function redraw() {
  canvas.width = SHEET.width * 0.3;
  canvas.height = SHEET.height * 0.3;
  drawSheet(canvas.getContext('2d'), {
    sheetImage,
    sheet: SHEET,
    layout,
    style: SHEET_STYLE,
    skills: SKILLS,
    derived: DERIVED,
    fontStack: FONT_STACKS.sheet,
    character: character(),
    scale: 0.3,
  });
}

function scheduleRedraw() {
  cancelAnimationFrame(redrawTimer);
  redrawTimer = requestAnimationFrame(() => {
    redraw();
    renderOutput();
  });
}

function round(box) {
  for (const key of ['x', 'y', 'w', 'h']) box[key] = Math.round(box[key]);
}

function clamp(box) {
  box.w = Math.max(10, Math.min(box.w, SHEET.width));
  box.h = Math.max(10, Math.min(box.h, SHEET.height));
  box.x = Math.max(0, Math.min(box.x, SHEET.width - box.w));
  box.y = Math.max(0, Math.min(box.y, SHEET.height - box.h));
  round(box);
}

function place(node, box) {
  node.style.left = `${(box.x / SHEET.width) * 100}%`;
  node.style.top = `${(box.y / SHEET.height) * 100}%`;
  node.style.width = `${(box.w / SHEET.width) * 100}%`;
  node.style.height = `${(box.h / SHEET.height) * 100}%`;
}

function buildBoxes() {
  boxesLayer.replaceChildren();
  for (const item of allBoxes()) {
    const handle = el('span', { class: 'box-handle', dataset: { role: 'resize' } });
    const node = el(
      'div',
      { class: `box is-${item.kind}`, dataset: { key: item.key }, tabindex: '0', role: 'button', 'aria-label': item.label },
      el('span', { class: 'box-label' }, item.label),
      handle,
    );
    place(node, item.box);
    boxesLayer.append(node);
  }
  markSelected();
}

function markSelected() {
  for (const node of boxesLayer.children) node.classList.toggle('is-selected', node.dataset.key === selected);
  const item = find(selected);
  $('#p-title').textContent = item ? item.label : 'Поле не выбрано';
  if (!item) return;
  for (const f of fields) $(`#p-${f}`).value = item.box[f];
  $('#p-align').value = item.box.align;
}

function syncNode(key) {
  const node = boxesLayer.querySelector(`[data-key="${CSS.escape(key)}"]`);
  const item = find(key);
  if (node && item) place(node, item.box);
}

function select(key) {
  selected = key;
  markSelected();
}

// --- Перетаскивание ---

let drag = null;

boxesLayer.addEventListener('pointerdown', (event) => {
  const node = event.target.closest('.box');
  if (!node) return;
  const item = find(node.dataset.key);
  select(node.dataset.key);
  drag = {
    key: node.dataset.key,
    mode: event.target.dataset.role === 'resize' ? 'resize' : 'move',
    startX: event.clientX,
    startY: event.clientY,
    origin: { ...item.box },
  };
  node.setPointerCapture(event.pointerId);
  event.preventDefault();
});

boxesLayer.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const item = find(drag.key);
  const rect = wrap.getBoundingClientRect();
  scale = rect.width / SHEET.width;
  const dx = (event.clientX - drag.startX) / scale;
  const dy = (event.clientY - drag.startY) / scale;
  if (drag.mode === 'move') {
    item.box.x = drag.origin.x + dx;
    item.box.y = drag.origin.y + dy;
  } else {
    item.box.w = drag.origin.w + dx;
    item.box.h = drag.origin.h + dy;
  }
  clamp(item.box);
  syncNode(drag.key);
  markSelected();
  scheduleRedraw();
});

const endDrag = () => {
  drag = null;
};
boxesLayer.addEventListener('pointerup', endDrag);
boxesLayer.addEventListener('pointercancel', endDrag);

// --- Клавиатура ---

document.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '')) return;
  const item = find(selected);
  if (!item) return;
  const step = event.shiftKey ? 10 : 1;
  if (event.key === 'ArrowLeft') item.box.x -= step;
  if (event.key === 'ArrowRight') item.box.x += step;
  if (event.key === 'ArrowUp') item.box.y -= step;
  if (event.key === 'ArrowDown') item.box.y += step;
  clamp(item.box);
  syncNode(selected);
  markSelected();
  scheduleRedraw();
  event.preventDefault();
});

// --- Числовые поля ---

for (const f of fields) {
  $(`#p-${f}`).addEventListener('input', (event) => {
    const item = find(selected);
    const value = Number(event.target.value);
    if (!item || !Number.isFinite(value)) return;
    item.box[f] = value;
    if (['x', 'y', 'w', 'h'].includes(f)) clamp(item.box);
    syncNode(selected);
    scheduleRedraw();
  });
}

$('#p-align').addEventListener('change', (event) => {
  const item = find(selected);
  if (!item) return;
  item.box.align = event.target.value;
  scheduleRedraw();
});

for (const id of ['#t-name', '#t-arch', '#t-num']) $(id).addEventListener('input', scheduleRedraw);

// --- Код для вставки ---

const q = (value) => JSON.stringify(value);

function boxLine(box, indent) {
  const props = ['x', 'y', 'w', 'h'].map((k) => `${k}: ${box[k]}`);
  props.push(`align: ${q(box.align)}`, `maxFont: ${box.maxFont}`, `minFont: ${box.minFont}`, `maxLines: ${box.maxLines}`);
  return `${indent}{ ${props.join(', ')} }`;
}

function renderOutput() {
  const lines = ['export const LAYOUT = {'];
  lines.push(`  name: ${boxLine(layout.name, '').trim()},`);
  lines.push('  archetypes: [');
  layout.archetypes.forEach((box) => lines.push(`${boxLine(box, '    ')},`));
  lines.push('  ],');
  lines.push('  skills: {');
  for (const skill of SKILLS) lines.push(`    ${skill.id}: ${boxLine(layout.skills[skill.id], '').trim()},`);
  lines.push('  },');
  lines.push('  derived: {');
  for (const def of DERIVED) lines.push(`    ${def.id}: ${boxLine(layout.derived[def.id], '').trim()},`);
  lines.push('  },');
  lines.push('};');
  out.value = lines.join('\n');
}

$('#copy').addEventListener('click', async () => {
  const note = $('#copy-status');
  try {
    await navigator.clipboard.writeText(out.value);
    note.textContent = 'Скопировано. Вставьте в js/data/sheet-layout.js вместо прежнего LAYOUT.';
  } catch {
    out.select();
    note.textContent = 'Выделено — нажмите Ctrl+C.';
  }
});

$('#reset').addEventListener('click', () => {
  const fresh = structuredClone(LAYOUT);
  layout.name = fresh.name;
  layout.archetypes = fresh.archetypes;
  layout.skills = fresh.skills;
  ensureDerived(fresh);
  layout.derived = fresh.derived;
  buildBoxes();
  scheduleRedraw();
});

// --- Запуск ---

async function init() {
  $('#font-test').textContent = FONT_TEST_TEXT;
  $('#font-test').style.fontFamily = FONT_STACKS.sheet;

  const [fontReport, image] = await Promise.all([loadFonts(FONT_FILES, CONFIG), loadImage(sheetPath(CONFIG), { timeoutMs: 60000 })]);
  sheetImage = image;

  const parts = [];
  if (!image) parts.push('Файл листа не найден — показан временный макет.');
  else if (image.naturalWidth !== SHEET.width || image.naturalHeight !== SHEET.height) {
    parts.push(`Размер листа ${image.naturalWidth}×${image.naturalHeight}, а ожидается ${SHEET.width}×${SHEET.height}.`);
  } else parts.push(`Лист загружен: ${SHEET.width}×${SHEET.height}.`);
  for (const problem of fontReport.problems) parts.push(problem);
  if (fontReport.failed.length) parts.push(`Шрифт не загрузился: ${fontReport.failed.map((f) => f.file).join(', ')}.`);
  for (const file of fontReport.noCyrillic) parts.push(`В шрифте Assets/${file} нет русских букв.`);
  for (const f of fontReport.loaded) parts.push(`Шрифт подключён: Assets/${f.file} (${f.roles.join(', ')}).`);
  status.textContent = parts.join(' ');

  buildBoxes();
  redraw();
  renderOutput();
}

init();
