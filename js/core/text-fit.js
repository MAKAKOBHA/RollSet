// Подбор размера шрифта и перенос строк. Не зависит от canvas: ширину текста
// измеряет переданная функция measureAt(size) → (строка) => ширина.

/** Жадный перенос по словам. Слово, не влезающее само по себе, остаётся на отдельной строке. */
export function wrapWords(measure, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || measure(candidate) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Обрезает строку до ширины maxWidth и добавляет «…». */
export function ellipsize(measure, text, maxWidth) {
  if (measure(text) <= maxWidth) return text;
  const chars = [...text];
  while (chars.length > 0 && measure(`${chars.join('').trimEnd()}…`) > maxWidth) chars.pop();
  return `${chars.join('').trimEnd()}…`;
}

/**
 * Ищет наибольший размер шрифта от maxFont до minFont, при котором текст помещается в рамку.
 * Если не помещается даже на minFont, текст обрезается с «…» (truncated: true).
 * @returns {{fontSize:number, lines:string[], truncated:boolean}}
 */
export function fitText({ measureAt, text, width, height, maxFont, minFont, maxLines = 1, lineHeight = 1.15, step = 1 }) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return { fontSize: maxFont, lines: [], truncated: false };

  for (let size = maxFont; size >= minFont; size -= step) {
    const measure = measureAt(size);
    const lines = wrapWords(measure, clean, width);
    const fits =
      lines.length <= maxLines &&
      lines.length * size * lineHeight <= height &&
      lines.every((line) => measure(line) <= width);
    if (fits) return { fontSize: size, lines, truncated: false };
  }

  const measure = measureAt(minFont);
  const byHeight = Math.max(1, Math.floor(height / (minFont * lineHeight)));
  const limit = Math.min(maxLines, byHeight);
  const wrapped = wrapWords(measure, clean, width);
  const kept = wrapped.slice(0, limit - 1);
  const last = ellipsize(measure, wrapped.slice(limit - 1).join(' '), width);
  return { fontSize: minFont, lines: [...kept, last], truncated: true };
}
