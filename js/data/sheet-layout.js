// Размеры листа и координаты полей, куда программа печатает текст.
// ТЕСТОВАЯ РАЗМЕТКА: координаты подобраны наугад, потому что настоящий лист в проект ещё не добавлен.
// Как подогнать под реальный лист: откройте calibrate.html, перетащите рамки мышью,
// скопируйте результат и вставьте в этот файл целиком.
//
// Все числа — в пикселях исходного PNG (2480×3508 = A4 при 300 dpi).
// x, y — левый верхний угол поля; w, h — размеры.
// align — выравнивание текста: 'left' | 'center' | 'right'.
// maxFont / minFont — текст подгоняется под рамку: сначала maxFont, уменьшается до minFont.
// maxLines — сколько строк допустимо (длинное название переносится, а затем сжимается).

export const SHEET = Object.freeze({
  width: 2480,
  height: 3508,
  file: 'Sheet/character-sheet.png', // относительно Assets/
});

export const SHEET_STYLE = Object.freeze({
  color: '#1b1712',
  nameWeight: '700',
  archetypeWeight: '600',
  skillWeight: '700',
  lineHeight: 1.15,
  plus: '+',
  minus: '-', // обычный дефис есть в любом шрифте; если в вашем шрифте есть «−» (U+2212), можно заменить
});

export const LAYOUT = {
  name: { x: 352, y: 109, w: 1361, h: 92, align: "center", maxFont: 130, minFont: 48, maxLines: 1 },
  archetypes: [
    { x: 1064, y: 664, w: 764, h: 63, align: "center", maxFont: 64, minFont: 30, maxLines: 2 },
    { x: 1060, y: 736, w: 764, h: 63, align: "center", maxFont: 64, minFont: 30, maxLines: 2 },
    { x: 1063, y: 795, w: 764, h: 63, align: "center", maxFont: 64, minFont: 30, maxLines: 2 },
  ],
  skills: {
    physiology: { x: 990, y: 330, w: 139, h: 90, align: "center", maxFont: 120, minFont: 50, maxLines: 1 },
    motorics: { x: 1273, y: 330, w: 139, h: 90, align: "center", maxFont: 120, minFont: 50, maxLines: 1 },
    attention: { x: 1559, y: 330, w: 139, h: 90, align: "center", maxFont: 120, minFont: 50, maxLines: 1 },
    intuition: { x: 658, y: 330, w: 139, h: 90, align: "center", maxFont: 120, minFont: 50, maxLines: 1 },
    empathy: { x: 359, y: 330, w: 139, h: 90, align: "center", maxFont: 120, minFont: 50, maxLines: 1 },
    mind: { x: 30, y: 330, w: 139, h: 90, align: "center", maxFont: 120, minFont: 50, maxLines: 1 },
    authority: { x: 30, y: 610, w: 139, h: 90, align: "center", maxFont: 120, minFont: 50, maxLines: 1 },
    intimidation: { x: 30, y: 930, w: 139, h: 90, align: "center", maxFont: 120, minFont: 50, maxLines: 1 },
    manipulation: { x: 30, y: 1190, w: 139, h: 90, align: "center", maxFont: 120, minFont: 50, maxLines: 1 },
  },
  derived: {
    hp: { x: 1979, y: 154, w: 130, h: 100, align: "center", maxFont: 120, minFont: 50, maxLines: 1 },
    psyche: { x: 1979, y: 373, w: 130, h: 100, align: "center", maxFont: 120, minFont: 50, maxLines: 1 },
  },
};