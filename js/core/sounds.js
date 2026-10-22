// Разбор списка звуков из js/data/sounds.js (чистая логика, без DOM; покрыта тестами).

/** Названия событий, на которые сайт умеет играть звук. */
export const SOUND_EVENTS = Object.freeze(['ambient', 'click', 'select', 'deselect', 'deal', 'flip', 'sheetReady']);

const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|webm)$/i;

/**
 * @param {Record<string, {file?: string, volume?: number, loop?: boolean} | string | null>} manifest
 * @returns {{sounds: Record<string, {file:string, volume:number, loop:boolean}>, problems: string[]}}
 */
export function normalizeSounds(manifest) {
  const sounds = {};
  const problems = [];

  for (const [name, raw] of Object.entries(manifest ?? {})) {
    if (!SOUND_EVENTS.includes(name)) {
      problems.push(`Звук «${name}»: такого события нет. Допустимо: ${SOUND_EVENTS.join(', ')}.`);
      continue;
    }
    if (raw == null) continue; // null — звук отключён

    const entry = typeof raw === 'string' ? { file: raw } : raw;
    if (typeof entry.file !== 'string' || !entry.file.trim()) {
      problems.push(`Звук «${name}»: не указан file.`);
      continue;
    }
    // Частые ошибки: обратные слэши и лишний «Assets/» в начале пути.
    const file = entry.file.trim().replace(/\\/g, '/').replace(/^\.?\/?Assets\//i, '');
    if (!AUDIO_EXT.test(file)) {
      problems.push(`Звук «${name}»: файл «${file}» должен быть .mp3, .ogg, .wav, .m4a или .webm.`);
      continue;
    }
    const volume = Number.isFinite(entry.volume) ? Math.min(1, Math.max(0, entry.volume)) : 1;
    sounds[name] = { file, volume, loop: entry.loop ?? name === 'ambient' };
  }
  return { sounds, problems };
}
