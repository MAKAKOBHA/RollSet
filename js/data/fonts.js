// Подключение пользовательских шрифтов. Пока список пуст, везде используются запасные шрифты
// с кириллицей (Georgia / PT Serif / системный).
//
// САМЫЙ ПРОСТОЙ СПОСОБ — один шрифт на всё:
//   1. Положите файл в Assets/Fonts/ (.woff2, .woff, .ttf или .otf). В шрифте должна быть кириллица,
//      а лицензия должна разрешать использование на сайте и в картинках.
//   2. Впишите его в FONT_FILES ниже. Путь пишется ОТ папки Assets, без слова «Assets»:
//        { file: 'Fonts/MyFont.ttf' },
//   3. Обновите страницу (Ctrl+F5).
//
// Если нужны разные шрифты для разных мест, добавьте roles:
//        { file: 'Fonts/Title.woff2', roles: ['display'] },          // заголовки интерфейса
//        { file: 'Fonts/Text.woff2',  roles: ['body'] },             // основной текст интерфейса
//        { file: 'Fonts/Sheet.ttf',   roles: ['sheet'] },            // текст на листе персонажа
//   (роли: display, body, sheet; в одной записи можно указать несколько).
//
// Необязательно: weight: '700' (если у файла только одно начертание, лучше не указывать)
// и style: 'italic'.
//
// Если что-то не так (нет файла, нет русских букв, неверный путь), на странице появится жёлтое
// сообщение, а подробности видны на calibrate.html и в консоли браузера (F12).

import { FONT_ROLES } from '../core/fonts.js';

export const FONT_FAMILIES = FONT_ROLES;

const SERIF = 'Georgia, "PT Serif", "Times New Roman", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const FONT_STACKS = Object.freeze({
  display: `"${FONT_FAMILIES.display}", ${SERIF}`,
  body: `"${FONT_FAMILIES.body}", ${SANS}`,
  sheet: `"${FONT_FAMILIES.sheet}", ${SERIF}`,
});

export const FONT_FILES = Object.freeze([
  // BrightonTwo Gothika NBP: в нём есть только ЗАГЛАВНЫЕ русские буквы, поэтому им набраны заголовки (капсом).
  { file: 'Fonts/BrightonTwoGothika.ttf', roles: ['display'] },
  // a_OldTyperNr: пишущая машинка, только для текста на листе персонажа.
  { file: 'Fonts/AOldTyper.ttf', roles: ['sheet'] },
  // { file: 'Fonts/MyFont.ttf' },
]);

export const FONT_TEST_TEXT = 'Съешь ещё этих мягких французских булок, да выпей чаю. 0123456789 +3 -2';
