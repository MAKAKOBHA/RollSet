// Подключение пользовательских шрифтов через FontFace. Список — в js/data/fonts.js.
// Если файл не найден или не открылся, шрифт попадает в failed, а страница работает на запасных.

import { CYRILLIC_SAMPLE, CYRILLIC_UPPER, normalizeFontEntries, rolesOfFile } from '../core/fonts.js';
import { assetUrl } from '../core/paths.js';

/** true, если в загруженном шрифте есть русские буквы (иначе они рисуются запасным шрифтом). */
export function supportsCyrillic(family, sample = CYRILLIC_SAMPLE) {
  const ctx = document.createElement('canvas').getContext('2d');
  const width = (fallback) => {
    ctx.font = `32px "${family}", ${fallback}`;
    return ctx.measureText(sample).width;
  };
  // Если все буквы есть в шрифте, результат не зависит от запасного шрифта.
  return Math.abs(width('monospace') - width('serif')) < 0.5;
}

/**
 * @returns {Promise<{loaded: object[], failed: object[], problems: string[], noCyrillic: string[]}>}
 *   loaded      — подключённые файлы с ролями;
 *   failed      — файлы, которые не удалось загрузить (с причиной);
 *   problems    — ошибки в самом списке (опечатки, неизвестные имена);
 *   noCyrillic  — файлы, в которых нет кириллицы.
 */
export async function loadFonts(fontEntries, config, fontSet = globalThis.document?.fonts) {
  const { faces, problems } = normalizeFontEntries(fontEntries);
  const report = { loaded: [], failed: [], problems, noCyrillic: [] };
  if (!fontSet || typeof globalThis.FontFace !== 'function') return report;

  const results = await Promise.all(
    faces.map(async (entry) => {
      try {
        const url = assetUrl(config, entry.file);
        const face = new FontFace(entry.family, `url("${url}")`, { weight: entry.weight, style: entry.style, display: 'swap' });
        await face.load();
        fontSet.add(face);
        return { ok: true, entry };
      } catch (error) {
        return { ok: false, entry, error: String(error?.message ?? error) };
      }
    }),
  );

  const files = new Map(); // file → { ok, roles, family }
  for (const result of results) {
    const known = files.get(result.entry.file) ?? { file: result.entry.file, ok: true, error: '', family: result.entry.family };
    if (!result.ok) {
      known.ok = false;
      known.error = result.error;
    }
    files.set(result.entry.file, known);
  }

  for (const info of files.values()) {
    const roles = rolesOfFile(faces, info.file);
    if (!info.ok) {
      report.failed.push({ file: `Assets/${info.file}`, roles, error: info.error });
      continue;
    }
    report.loaded.push({ file: info.file, roles });
    // шрифт только для заголовков (они капсом) может содержать одни заглавные буквы
    const capsOnly = roles.length === 1 && roles[0] === 'display';
    if (!supportsCyrillic(info.family, capsOnly ? CYRILLIC_UPPER : CYRILLIC_SAMPLE)) report.noCyrillic.push(info.file);
  }

  for (const message of problems) console.warn(`[RollSet шрифты] ${message}`);
  for (const f of report.failed) console.warn(`[RollSet шрифты] не загрузился ${f.file}: ${f.error}`);
  for (const file of report.noCyrillic) console.warn(`[RollSet шрифты] в ${file} нет кириллицы`);
  return report;
}

/** Ждёт, пока браузер закончит загрузку всех шрифтов, прежде чем рисовать на canvas. */
export async function ensureFontsReady(fontSet = globalThis.document?.fonts) {
  try {
    await fontSet?.ready;
  } catch {
    /* запасной шрифт — не повод падать */
  }
}
