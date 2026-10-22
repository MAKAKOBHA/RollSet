// Воспроизведение звуков. Короткие звуки играют через Web Audio: они заранее декодируются в память
// и стартуют мгновенно (обычный <audio> запаздывает на десятки и сотни миллисекунд).
// Фон — обычный зацикленный <audio>; его пробуем запустить сразу при заходе. Многие браузеры разрешают звук
// только после первого касания страницы: до него всё загружается, а после — запускается. Ненайденные файлы молчат.

import { normalizeSounds } from '../core/sounds.js';
import { assetUrl } from '../core/paths.js';

export function createAudio({ manifest, config }) {
  const { sounds, problems } = normalizeSounds(manifest);
  for (const message of problems) console.warn(`[RollSet звуки] ${message}`);

  const AudioCtx = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  let ctx = null;
  const buffers = new Map(); // имя → AudioBuffer (когда готов)
  let ambient = null;
  let unlocked = false;
  let muted = false;
  const listeners = new Set();

  async function decode(name, spec) {
    try {
      const response = await fetch(assetUrl(config, spec.file));
      if (!response.ok) return;
      const data = await response.arrayBuffer();
      buffers.set(name, await new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)));
    } catch {
      /* нет файла или он не открылся — событие молчит */
    }
  }

  function startAmbient() {
    if (!ambient || muted || !unlocked) return;
    ambient.play().catch(() => {});
  }

  return {
    /** Загружает звуки заранее, не дожидаясь касания (контекст до него «спит»). */
    preload() {
      if (ctx || !AudioCtx) return;
      ctx = new AudioCtx();
      for (const [name, spec] of Object.entries(sounds)) {
        if (name === 'ambient') {
          ambient = new Audio();
          ambient.loop = true;
          ambient.volume = spec.volume;
          ambient.preload = 'auto';
          ambient.addEventListener('error', () => {
            ambient = null;
          }, { once: true });
          ambient.src = assetUrl(config, spec.file);
          // Пробуем включить фон сразу при заходе. Браузер разрешит это не всегда (см. README), тогда фон
          // стартует при первом касании страницы.
          ambient
            .play()
            .then(() => this.unlock())
            .catch(() => {});
        } else {
          decode(name, spec);
        }
      }
    },
    /** Первое касание страницы: звук разрешён. */
    unlock() {
      if (unlocked) return;
      unlocked = true;
      ctx?.resume?.();
      startAmbient();
    },
    play(name) {
      if (!unlocked || muted || name === 'ambient') return;
      const buffer = buffers.get(name);
      if (!buffer || !ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = sounds[name].volume;
      source.buffer = buffer;
      source.connect(gain).connect(ctx.destination);
      source.start(0);
    },
    isMuted: () => muted,
    setMuted(value) {
      muted = Boolean(value);
      if (muted) ambient?.pause();
      else startAmbient();
      listeners.forEach((fn) => fn(muted));
    },
    onMuteChange(fn) {
      listeners.add(fn);
    },
  };
}
