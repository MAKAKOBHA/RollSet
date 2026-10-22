// Разбор списка шрифтов из js/data/fonts.js (чистая логика, без DOM; покрыта тестами).

/** Три роли шрифта на сайте и CSS-имена семейств, под которыми они подключаются. */
export const FONT_ROLES = Object.freeze({
  display: 'RollSet Display', // заголовки интерфейса
  body: 'RollSet Body', // основной текст интерфейса
  sheet: 'RollSet Sheet', // текст, который печатается на листе
});

const KNOWN_FAMILIES = new Set(Object.values(FONT_ROLES));
const ALL_ROLES = Object.keys(FONT_ROLES);
const FILE_EXT = /\.(woff2?|ttf|otf)$/i;

/** Русские буквы без пробелов: пробел есть почти в любом шрифте и сбивает проверку. */
export const CYRILLIC_UPPER = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
export const CYRILLIC_SAMPLE = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя';

/**
 * Запись списка может быть такой:
 *   { file: 'Fonts/My.ttf' }                              — один шрифт на все роли (проще всего)
 *   { file: 'Fonts/My.ttf', roles: ['display', 'sheet'] } — только для некоторых ролей
 *   { family: 'RollSet Sheet', file: '…', weight: '700' } — прежний формат (имя семейства — одно из трёх)
 *
 * @returns {{faces: {family:string,file:string,weight:string,style:string}[], problems: string[]}}
 */
export function normalizeFontEntries(entries) {
  const faces = [];
  const problems = [];

  (entries ?? []).forEach((entry, index) => {
    const label = typeof entry?.file === 'string' && entry.file.trim() ? `«${entry.file.trim()}»` : `запись №${index + 1} в fonts.js`;

    if (typeof entry?.file !== 'string' || !entry.file.trim()) {
      problems.push(`${label}: не указан file (путь к файлу шрифта внутри папки Assets).`);
      return;
    }

    // Частые ошибки: обратные слэши Windows и лишний «Assets/» в начале пути.
    const file = entry.file.trim().replace(/\\/g, '/').replace(/^\.?\/?Assets\//i, '');
    if (!FILE_EXT.test(file)) {
      problems.push(`${label}: файл должен быть .woff2, .woff, .ttf или .otf.`);
      return;
    }

    const families = [];
    if (Array.isArray(entry.roles)) {
      for (const role of entry.roles) {
        if (FONT_ROLES[role]) families.push(FONT_ROLES[role]);
        else problems.push(`${label}: неизвестная роль «${role}». Допустимо: ${ALL_ROLES.join(', ')}.`);
      }
    }
    if (typeof entry.family === 'string') {
      if (KNOWN_FAMILIES.has(entry.family)) families.push(entry.family);
      else {
        problems.push(
          `${label}: имя семейства «${entry.family}» сайт не использует, поэтому шрифт не применится. ` +
            `Уберите family и укажите roles: ['display', 'body', 'sheet'] (или не указывайте ничего: тогда шрифт получат все роли).`,
        );
      }
    }
    // Ни family, ни roles: шрифт для всех ролей.
    if (!Array.isArray(entry.roles) && typeof entry.family !== 'string') families.push(...Object.values(FONT_ROLES));

    for (const family of new Set(families)) {
      faces.push({
        family,
        file,
        // «100 900» = файл используется при любой жирности, без искусственного утолщения браузером
        weight: String(entry.weight ?? '100 900'),
        style: entry.style ?? 'normal',
      });
    }
  });

  return { faces, problems };
}

/** Какие роли получили шрифт из файла: 'display, body, sheet'. */
export function rolesOfFile(faces, file) {
  const byFamily = Object.entries(FONT_ROLES);
  return faces
    .filter((face) => face.file === file)
    .map((face) => byFamily.find(([, family]) => family === face.family)?.[0])
    .filter(Boolean);
}
