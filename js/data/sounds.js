// Звуки. Файлы лежат в Assets/Sounds/ (см. Assets/Sounds/README.md).
// Нет файла — это событие просто молчит, ошибок на странице не будет.
// Путь пишется от папки Assets, без слова «Assets». volume — громкость от 0 до 1.
// Чтобы отключить звук совсем, поставьте null. Формат любой: .mp3, .ogg, .wav, .m4a.
//
// Звук на кнопки играет на всех кнопках, кроме «пропустить».

export const SOUND_FILES = Object.freeze({
  ambient: { file: 'Sounds/ambient.mp3', volume: 0.35 }, // общий фон, зациклен; стартует после первого касания
  click: { file: 'Sounds/click.mp3', volume: 0.6 }, // любая кнопка (кроме «пропустить»)
  select: { file: 'Sounds/card-select.mp3', volume: 0.8 }, // карта выбрана
  deselect: { file: 'Sounds/card-deselect.mp3', volume: 0.6 }, // выбор карты снят
  deal: { file: 'Sounds/cards-deal.mp3', volume: 0.8 }, // 27 карт ложатся на экран
  flip: { file: 'Sounds/card-flip.mp3', volume: 0.9 }, // карта переворачивается на финальном экране
  sheetReady: { file: 'Sounds/sheet-ready.mp3', volume: 0.9 }, // лист персонажа готов
});
