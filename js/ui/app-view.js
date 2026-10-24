// Собирает интерфейс: переключает экраны по фазе, связывает кнопки с командами.

import { PHASES as P } from '../core/flow.js';
import { MECHANICS } from '../data/mechanics.js';
import { $, $$, el, sleep } from './dom.js';
import { STR } from './strings.js';
import { createChooseView } from './views/choose-view.js';
import { createDialogs } from './views/dialogs.js';
import { createStageView } from './views/stage-view.js';

const SCREEN_OF_PHASE = {
  [P.INTRO]: 'intro',
  [P.RULES]: 'rules',
  [P.NAME]: 'name',
  [P.CHOOSE]: 'choose',
  [P.FATE]: 'choose',
  [P.CONFIRM]: 'choose',
  [P.REVEAL]: 'stage',
  [P.TALLY]: 'stage',
  [P.RESULT]: 'stage',
};

export function mountApp({ store, controller, cards, skills, sheetService, config, sound, derived }) {
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = () => reduceQuery.matches;

  const screens = new Map($$('[data-screen]').map((node) => [node.dataset.screen, node]));
  const nameInput = $('#name-input');
  const nameError = $('#name-error');

  const chooseView = createChooseView({ root: screens.get('choose'), cards, controller, config, sound, reduceMotion });
  const stageView = createStageView({ root: screens.get('stage'), cards, skills, controller, sheetService, config, reduceMotion, sound, derived });
  const dialogs = createDialogs({ cards, controller, config, reduceMotion });

  // --- Статичные тексты ---
  $('#name-hint').textContent = STR.nameHint(config.name.max);
  nameInput.maxLength = config.name.max * 2; // жёсткая граница; точная проверка — в логике (считает символы Unicode)

  // --- Ввод имени ---
  nameInput.addEventListener('input', () => controller.setName(nameInput.value));
  $('#name-form').addEventListener('submit', (event) => {
    event.preventDefault();
    controller.submitName();
    // Начинаем звук раскладывания непосредственно после успешного подтверждения имени.
    if (controller.getState().phase === P.CHOOSE) {
      sound.unlock();
      // После формы звук уже запущен; при других переходах к выбору запускаем здесь.
      if (previous !== 'name') sound.play('deal');
    }
  });

  // --- Кнопки ---
  const actions = {
    start: () => controller.readRules(),
    'glufonde-reader': () => window.open('https://makakobha.github.io/Glufonde-Reader/', '_blank', 'noopener,noreferrer'),
    'rules-skip': () => controller.rulesDone(),
    'rules-done': () => controller.rulesDone(),
    'edit-name': () => controller.editName(),
    'roll-fate': () => controller.rollFate(),
    'accept-fate': () => controller.acceptFate(),
    'decline-fate': () => controller.declineFate(),
    'request-confirm': () => controller.requestConfirm(),
    'cancel-confirm': () => controller.cancelConfirm(),
    confirm: () => controller.confirm(),
    reset: () => dialogs.openReset(),
    'cancel-reset': () => dialogs.closeReset(),
    'confirm-reset': () => {
      dialogs.closeReset();
      controller.reset();
    },
    'export-png': (button) => stageView.export('png', button),
    'export-pdf': (button) => stageView.export('pdf', button),
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) {
      // У кнопки отправки имени нет data-action. Озвучиваем клавиатурную активацию.
      if (event.detail === 0 && event.target.closest('#name-form button[type="submit"]')) {
        sound.unlock();
        sound.play('click');
      }
      return;
    }
    // С мышью и пальцем звук играет сразу при нажатии (ниже); здесь — только нажатие с клавиатуры.
    if (event.detail === 0 && button.dataset.action !== 'rules-skip') sound.play('click');
    actions[button.dataset.action]?.(button);
  });

  // Первый клик/тап по странице только разблокирует звук и сам же проигрывает щелчок.
  // Это работает и по пустому месту; первый клик по кнопке не дублируется.
  let firstPointerHandled = false;
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      if (!firstPointerHandled) {
        firstPointerHandled = true;
        sound.unlock();
        sound.play('click');
        return;
      }

      // Дальше звук кнопки играет в момент нажатия, а «пропустить» остаётся беззвучным.
      const button = event.target.closest('[data-action], #name-form button[type="submit"]');
      if (!button || button.disabled || button.dataset.action === 'rules-skip') return;
      sound.unlock();
      sound.play('click');
    },
    true,
  );

  // Клавиатурное взаимодействие тоже разблокирует аудиоконтекст.
  document.addEventListener('keydown', () => sound.unlock(), { capture: true, once: true });

  const soundToggle = $('#sound-toggle');
  const syncSoundToggle = (muted) => {
    soundToggle.setAttribute('aria-pressed', String(muted));
    soundToggle.setAttribute('aria-label', muted ? 'Включить звук' : 'Выключить звук');
    soundToggle.classList.toggle('is-muted', muted);
  };
  sound.onMuteChange(syncSoundToggle);
  soundToggle.addEventListener('click', () => sound.setMuted(!sound.isMuted()));

  // --- Механика: строки проявляются по очереди, внизу «пропустить» ---
  const rulesBody = $('#rules-body');
  const rulesTitle = $('#rules-title');
  const rulesNext = $('#btn-rules-next');
  let rulesTimer = 0;
  let skipHideTimer = 0;

  function playRules() {
    clearTimeout(rulesTimer);
    clearTimeout(skipHideTimer);
    const { lineFadeMs, lineStepMs } = config.rules;
    const items = [MECHANICS.title, ...MECHANICS.paragraphs];

    rulesTitle.textContent = '';
    rulesBody.replaceChildren();
    rulesNext.hidden = true;
    $('#rules-skip').classList.remove('is-fading');

    items.forEach((text, i) => {
      const target = i === 0 ? rulesTitle : rulesBody.appendChild(el('p'));
      target.textContent = text;
      target.classList.add('fade-line');
      target.style.setProperty('--line-ms', `${lineFadeMs}ms`);
      target.style.setProperty('--d', `${i * lineStepMs}ms`);
      if (i === 0) {
        // перезапуск анимации заголовка при повторном входе
        target.style.animation = 'none';
        void target.offsetWidth;
        target.style.animation = '';
      }
    });

    const total = reduceMotion() ? 0 : (items.length - 1) * lineStepMs + lineFadeMs;
    rulesTimer = setTimeout(() => {
      rulesNext.hidden = false;
      const rulesSkip = $('#rules-skip');
      rulesSkip.classList.add('is-fading');
      // После плавного исчезновения убираем кнопку из интерфейса полностью,
      // чтобы она не оставалась поверх подвала ни на компьютере, ни на телефоне.
      skipHideTimer = setTimeout(() => {
        if (controller.getState().phase === P.RULES) rulesSkip.hidden = true;
      }, 750);
      rulesNext.classList.add('fade-line');
      rulesNext.style.setProperty('--d', '0ms');
    }, total);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && controller.getState().phase === P.RULES) controller.rulesDone();
  });

  // --- Экраны ---
  let currentScreen = null;

  /** Возвращает промис, который завершается, когда новый экран полностью показан. */
  async function showScreen(name, phase) {
    if (name === currentScreen) return;
    const firstTime = currentScreen === null;
    const previous = currentScreen;
    currentScreen = name;
    const slow = previous === 'choose' && name === 'stage' && !reduceMotion();
    const { screenOutMs, screenInMs } = config.anim;

    if (slow) {
      // Выбор карт плавно гаснет, потом так же плавно появляется финальный экран.
      const old = screens.get(previous);
      old.style.setProperty('--out-ms', `${screenOutMs}ms`);
      old.classList.add('is-leaving');
      await sleep(screenOutMs);
      if (currentScreen !== name) return; // за время угасания нажали «Начать заново»
      old.classList.remove('is-leaving');
      screens.get(name).style.setProperty('--in-ms', `${screenInMs}ms`);
      screens.get(name).classList.add('is-slow-in');
    }
    document.body.dataset.phase = phase();
    for (const [key, node] of screens) node.hidden = key !== name;
    if (name === 'choose' && previous !== 'choose') {
      chooseView.dealIn();
      sound.play('deal');
    }
    if (firstTime) return;
    if (slow) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      await sleep(screenInMs);
      screens.get(name)?.classList.remove('is-slow-in');
      return;
    }

    window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    const node = screens.get(name);
    const target = name === 'name' ? nameInput : node.querySelector('h1, h2');
    if (target) {
      if (target !== nameInput) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }

  function syncName(state) {
    if (nameInput.value !== state.nameDraft) nameInput.value = state.nameDraft;
    const error = state.nameError;
    const message = !error ? '' : typeof STR.nameErrors[error] === 'function' ? STR.nameErrors[error](config.name.max) : STR.nameErrors[error];
    nameError.textContent = message;
    nameInput.setAttribute('aria-invalid', error ? 'true' : 'false');
  }

  function syncAll(state, prev) {
    const target = SCREEN_OF_PHASE[state.phase];
    const swapping = target === 'stage' && currentScreen === 'choose';
    // Пока экран выбора гаснет, атрибут фазы не меняем: иначе раскладка «всё на одном экране» прыгнет.
    if (!swapping) document.body.dataset.phase = state.phase;
    const shown = showScreen(target, () => controller.getState().phase);
    syncName(state);
    if (state.phase === P.RULES && prev?.phase !== P.RULES) playRules();
    if (state.phase !== P.RULES) {
      clearTimeout(rulesTimer);
      clearTimeout(skipHideTimer);
    }
    $('#rules-skip').hidden = state.phase !== P.RULES;
    chooseView.sync(state);
    dialogs.sync(state, prev);
    stageView.sync(state, prev, shown);
  }

  store.subscribe((state, prev) => syncAll(state, prev));
  syncAll(store.getState(), null);

  return {
    notify(kind, text) {
      $('#notices').append(el('p', { class: `notice ${kind === 'warn' ? 'notice-warn' : ''}` }, text));
    },
  };
}
