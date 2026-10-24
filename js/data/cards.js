// Карты архетипов. Поля карты:
//   id         — уникальный латинский идентификатор
//   number     — номер БЕЗ нуля впереди: 1, 2, … 9, 10 (а не 01!). По нему ищутся файлы
//                Assets/Backs/01.webp и Assets/Faces/01.webp: двузначное имя файла программа делает сама.
//   name       — название, его видит игрок и оно печатается на листе
//   modifiers  — целое число для каждого из 9 навыков (см. skills.js)
//   backFile / faceFile (необязательно) — своё имя файла вместо NN.png
//
// Порядок модификаторов в каждой строке:
//   physiology, motorics, attention, intuition, empathy, mind, authority, intimidation, manipulation

export const DATA_META = Object.freeze({
  isTestData: false,
  note: 'Данные карт внесены вручную.',
});

const mods = (physiology, motorics, attention, intuition, empathy, mind, authority, intimidation, manipulation) =>
  Object.freeze({ physiology, motorics, attention, intuition, empathy, mind, authority, intimidation, manipulation });

export const CARDS = Object.freeze([
  { id: 'card-01', number: 1, name: 'Авантюрист', modifiers: mods(0, 0, 0, 0, 0, 0, -1, 1, 2) },
  { id: 'card-02', number: 2, name: 'Боец', modifiers: mods(2, -1, 0, 0, 0, 0, 0, 0, -1) },
  { id: 'card-03', number: 3, name: 'Вдохновитель', modifiers: mods(0, 0, 0, 0, 0, 1, 1, 0, 1) },
  { id: 'card-04', number: 4, name: 'Гадатель', modifiers: mods(0, 0, 0, 2, 0, -1, 0, -1, 0) },
  { id: 'card-05', number: 5, name: 'Гладиатор', modifiers: mods(1, 0, -2, 0, 0, 0, 0, 1, 0) },
  { id: 'card-06', number: 6, name: 'Глаз-алмаз', modifiers: mods(0, 0, 1, 0, 0, 2, -2, 0, 0) },
  { id: 'card-07', number: 7, name: 'Интриган', modifiers: mods(0, 0, 0,0, 1, 0, 0, 2, 1) },
  { id: 'card-08', number: 8, name: 'Интуит', modifiers: mods(-2, 0, 0, 2, 0, 0, 0, -1, 0) },
  { id: 'card-09', number: 9, name: 'Искатель истины', modifiers: mods(0,0, 1, 1, 0, 1, 0, 0, 0) },
  { id: 'card-10', number: 10, name: 'Мастер слова', modifiers: mods(0, 0, 0, 0, 1, 0, 1, 0, 1) },
  { id: 'card-11', number: 11, name: 'Наблюдатель', modifiers: mods(0, 0, 2, -1, -1, 0, 0, 0, 0) },
  { id: 'card-12', number: 12, name: 'Незаметный', modifiers: mods(0, 1, 1, 0, 1, 0, 0, 0, 0) },
  { id: 'card-13', number: 13, name: 'Оппортунист', modifiers: mods(0, 0, 0, 1, 0, -1, 1, 0, 0) },
  { id: 'card-14', number: 14, name: 'Оптимист', modifiers: mods(0, 0, 0, 0, 2, 0, 0, -2, -2) },
  { id: 'card-15', number: 15, name: 'Рабочий', modifiers: mods(2, 0, 0, 0, -1, 0, 0, 0, -2) },
  { id: 'card-16', number: 16, name: 'Реактивщик', modifiers: mods(-2, 1, 0, 0, 0, 0, 0, 1, 0) },
  { id: 'card-17', number: 17, name: 'Скиталец', modifiers: mods(0, 1, 0, 0, 0, 0, -2, 0, -1) },
  { id: 'card-18', number: 18, name: 'Следопыт', modifiers: mods(-1, 0, 2, -2, 0, 0, 0, 0, 0) },
  { id: 'card-19', number: 19, name: 'Спринтер', modifiers: mods(1, 2, -2, 0, 0, 0, 0, 0, 0) },
  { id: 'card-20', number: 20, name: 'Технарь', modifiers: mods(1, 0, 0, -1, 0, 1, 0, 0, 0) },
  { id: 'card-21', number: 21, name: 'Тихий стратег', modifiers: mods(0, 1, 0, 0, -2, 0, 2, 0, 0) },
  { id: 'card-22', number: 22, name: 'Тихоня', modifiers: mods(0, 2, -1, 1, 0, 0, 0, 0, 0) },
  { id: 'card-23', number: 23, name: 'Философ', modifiers: mods(0, 0, 0, 0, 0, 1, 1, -2, 0) },
  { id: 'card-24', number: 24, name: 'Харизматик', modifiers: mods(0, 0, 0, 0, 0, 0, 2, 2, 2) },
  { id: 'card-25', number: 25, name: 'Хилый', modifiers: mods(-1, -1, -1, 0, 0, 0, 0, 0, 0) },
  { id: 'card-26', number: 26, name: 'Хроник', modifiers: mods(0, -2, 0, -2, 0, 2, 0, 0, 0) },
  { id: 'card-27', number: 27, name: 'Эмпат', modifiers: mods(0, 0, 0, 0, 2, -2, 0, 0, -2) },
]);
