// Девять навыков. Порядок здесь = порядок строк в таблице подсчёта.
// id — латиницей, он используется в cards.js и sheet-layout.js. Название — то, что видит игрок.

export const SKILLS = Object.freeze([
  Object.freeze({ id: 'physiology', name: 'Физиология' }),
  Object.freeze({ id: 'motorics', name: 'Моторика' }),
  Object.freeze({ id: 'attention', name: 'Внимание' }),
  Object.freeze({ id: 'intuition', name: 'Интуиция' }),
  Object.freeze({ id: 'empathy', name: 'Эмпатия' }),
  Object.freeze({ id: 'mind', name: 'Разум' }),
  Object.freeze({ id: 'authority', name: 'Авторитет' }),
  Object.freeze({ id: 'intimidation', name: 'Запугивание' }),
  Object.freeze({ id: 'manipulation', name: 'Манипуляция' }),
]);
