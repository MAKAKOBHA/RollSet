// Наложение данных персонажа на лист. Работает с любым 2D-контекстом (canvas в браузере).
// Координаты берутся из js/data/sheet-layout.js и задаются в пикселях исходного листа;
// параметр scale позволяет рисовать уменьшенную копию (для калибровки) без пересчёта координат.

import { fitText } from '../core/text-fit.js';
import { formatModifier } from '../core/skills.js';
import { drawPlaceholderSheet } from './placeholder-sheet.js';

const PLACEHOLDER_NOTE = 'временный макет: файл листа не найден в Assets/Sheet/';

function drawBoxText(ctx, box, text, { fontStack, weight, color, lineHeight }) {
  const measureAt = (size) => {
    const font = `${weight} ${size}px ${fontStack}`;
    return (value) => {
      ctx.font = font;
      return ctx.measureText(value).width;
    };
  };

  const { fontSize, lines } = fitText({
    measureAt,
    text,
    width: box.w,
    height: box.h,
    maxFont: box.maxFont,
    minFont: box.minFont,
    maxLines: box.maxLines,
    lineHeight,
  });
  if (lines.length === 0) return;

  ctx.font = `${weight} ${fontSize}px ${fontStack}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = box.align;

  const x = box.align === 'left' ? box.x : box.align === 'right' ? box.x + box.w : box.x + box.w / 2;
  const lineH = fontSize * lineHeight;
  const top = box.y + (box.h - lineH * lines.length) / 2;
  lines.forEach((line, i) => ctx.fillText(line, x, top + lineH * (i + 0.5)));
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} p
 * @param {CanvasImageSource|null} p.sheetImage  оригинальный PNG листа или null (тогда рисуется макет)
 * @param {{width:number,height:number}} p.sheet
 * @param {object} p.layout   js/data/sheet-layout.js → LAYOUT
 * @param {object} p.style    js/data/sheet-layout.js → SHEET_STYLE
 * @param {{id:string,name:string}[]} p.skills
 * @param {{id:string,name:string}[]} [p.derived]  Хиты и Психика (js/data/derived.js)
 * @param {string} p.fontStack  CSS-строка font-family
 * @param {{name:string, archetypes:string[], skills:Record<string,number>}} p.character
 * @param {number} [p.scale=1]
 */
export function drawSheet(ctx, { sheetImage, sheet, layout, style, skills, derived = [], fontStack, character, scale = 1 }) {
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Белая подложка: JPEG для PDF не поддерживает прозрачность.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sheet.width, sheet.height);

  if (sheetImage) {
    ctx.drawImage(sheetImage, 0, 0, sheet.width, sheet.height);
  } else {
    drawPlaceholderSheet(ctx, { sheet, layout, skills, derived, fontStack, note: PLACEHOLDER_NOTE });
  }

  const common = { fontStack, color: style.color, lineHeight: style.lineHeight };

  drawBoxText(ctx, layout.name, character.name, { ...common, weight: style.nameWeight });

  layout.archetypes.forEach((box, i) => {
    drawBoxText(ctx, box, character.archetypes[i] ?? '', { ...common, weight: style.archetypeWeight });
  });

  for (const skill of skills) {
    const value = character.skills[skill.id];
    if (!Number.isFinite(value)) continue;
    const text = formatModifier(value, { plus: style.plus, minus: style.minus });
    drawBoxText(ctx, layout.skills[skill.id], text, { ...common, weight: style.skillWeight });
  }

  // Хиты и Психика: просто число (отрицательное — с минусом)
  for (const def of derived) {
    const value = character.derived?.[def.id];
    const box = layout.derived?.[def.id];
    if (!Number.isFinite(value) || !box) continue;
    drawBoxText(ctx, box, value < 0 ? `${style.minus}${Math.abs(value)}` : String(value), { ...common, weight: style.skillWeight });
  }

  ctx.restore();
}
