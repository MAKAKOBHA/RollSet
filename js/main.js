// Точка входа: проверяет данные, собирает стор и интерфейс, в фоне загружает картинки и шрифты.

import { CONFIG } from './config.js';
import { createController } from './core/controller.js';
import { createInitialState, createReducer } from './core/flow.js';
import { cardImagePath, sheetPath } from './core/paths.js';
import { createRandom } from './core/rng.js';
import { createStore } from './core/store.js';
import { validateCards, validateLayout } from './core/validate.js';
import { CARDS, DATA_META } from './data/cards.js';
import { FONT_FILES, FONT_STACKS } from './data/fonts.js';
import { SOUND_FILES } from './data/sounds.js';
import { LAYOUT, SHEET, SHEET_STYLE } from './data/sheet-layout.js';
import { DERIVED } from './data/derived.js';
import { SKILLS } from './data/skills.js';
import { createAudio } from './render/audio.js';
import { preloadImages } from './render/preload.js';
import { loadImage } from './render/assets.js';
import { loadFonts } from './render/fonts.js';
import { createSheetService } from './render/sheet-service.js';
import { mountApp } from './ui/app-view.js';
import { runSplash } from './ui/splash.js';
import { $, el } from './ui/dom.js';
import { STR } from './ui/strings.js';

function applyTheme() {
  const root = document.documentElement.style;
  root.setProperty('--font-display', FONT_STACKS.display);
  root.setProperty('--font-body', FONT_STACKS.body);
  root.setProperty('--flip-ms', `${CONFIG.anim.flipMs}ms`);
}

function showFatal(errors) {
  $('#fatal-list').replaceChildren(...errors.map((message) => el('li', {}, message)));
  $('#fatal').hidden = false;
  document.querySelectorAll('[data-screen]').forEach((node) => {
    node.hidden = true;
  });
}

function start() {
  applyTheme();
  runSplash(CONFIG, { reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches });

  const errors = [
    ...validateCards(CARDS, SKILLS, { expectedCount: CONFIG.cardCount }),
    ...validateLayout(LAYOUT, SHEET, SKILLS, CONFIG.pickCount, DERIVED),
  ];
  if (errors.length > 0) {
    showFatal(errors);
    return;
  }

  // Картинки и шрифты грузятся в фоне; интерфейс доступен сразу.
  const assets = (async () => {
    const [fontReport, sheetImage, backProbe, faceProbe] = await Promise.all([
      loadFonts(FONT_FILES, CONFIG),
      loadImage(sheetPath(CONFIG), { timeoutMs: 60000 }),
      loadImage(cardImagePath(CONFIG, 'back', CARDS[0])),
      loadImage(cardImagePath(CONFIG, 'face', CARDS[0])),
    ]);
    return { fontReport, sheetImage, hasCards: Boolean(backProbe && faceProbe) };
  })();

  const reducer = createReducer({
    cardIds: CARDS.map((card) => card.id),
    pickCount: CONFIG.pickCount,
    name: CONFIG.name,
    fate: CONFIG.fate,
  });
  const store = createStore(reducer, createInitialState());
  const controller = createController({
    store,
    cardIds: CARDS.map((card) => card.id),
    random: createRandom(),
    pickCount: CONFIG.pickCount,
    fate: CONFIG.fate,
  });
  const sheetService = createSheetService({
    assets,
    sheet: SHEET,
    layout: LAYOUT,
    style: SHEET_STYLE,
    skills: SKILLS,
    derived: DERIVED,
    fontStack: FONT_STACKS.sheet,
    scale: CONFIG.exportScale,
  });

  const sound = createAudio({ manifest: SOUND_FILES, config: CONFIG });
  sound.preload();
  const app = mountApp({ store, controller, cards: CARDS, skills: SKILLS, sheetService, config: CONFIG, sound, derived: DERIVED });

  if (DATA_META.isTestData) {
    $('#test-badge').hidden = false;
  }
  const missing = DERIVED.filter((def) => !LAYOUT.derived?.[def.id]).map((def) => def.name);
  if (missing.length) app.notify('warn', STR.notices.noDerived(missing.join(', ')));
  if (LAYOUT.isTestLayout) app.notify('info', STR.notices.testLayout);

  assets.then(({ fontReport, sheetImage, hasCards }) => {
    if (!sheetImage) {
      app.notify('warn', STR.notices.noSheet);
    } else if (sheetImage.naturalWidth !== SHEET.width || sheetImage.naturalHeight !== SHEET.height) {
      app.notify('warn', STR.notices.sheetSize(sheetImage.naturalWidth, sheetImage.naturalHeight, SHEET.width, SHEET.height));
    }
    if (!hasCards) app.notify('warn', STR.notices.noCards);
    // Лица карт подгружаем в фоне, чтобы переворот (на финале и в пасхалке) не ждал загрузки.
    else preloadImages(CARDS.map((card) => cardImagePath(CONFIG, 'face', card)), CONFIG.preload);
    for (const problem of fontReport.problems) app.notify('warn', problem);
    if (fontReport.failed.length > 0) {
      app.notify('warn', STR.notices.font(fontReport.failed.map((f) => f.file).join(', ')));
    }
    for (const file of fontReport.noCyrillic) app.notify('warn', STR.notices.fontNoCyrillic(`Assets/${file}`));
    // Успешное подключение шрифта на странице не показываем: оно видно по самому шрифту (и на calibrate.html).
  });
}

start();
