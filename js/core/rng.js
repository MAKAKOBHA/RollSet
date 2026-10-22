// Случайность. Ядро не вызывает Math.random напрямую: функция random передаётся снаружи,
// поэтому в тестах выбор можно сделать предсказуемым.

/** Возвращает функцию, дающую число в диапазоне [0, 1) из криптостойкого источника. */
export function createRandom(cryptoObj = globalThis.crypto) {
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues недоступен в этом окружении');
  }
  const buffer = new Uint32Array(1);
  return () => {
    cryptoObj.getRandomValues(buffer);
    return buffer[0] / 4294967296;
  };
}

/** Выбирает count разных элементов (частичный Фишер — Йетс). Исходный массив не меняется. */
export function pickUnique(items, count, random) {
  if (!Array.isArray(items)) throw new TypeError('items должен быть массивом');
  if (!Number.isInteger(count) || count < 0 || count > items.length) {
    throw new RangeError(`Нельзя выбрать ${count} из ${items.length}`);
  }
  const pool = items.slice();
  for (let i = 0; i < count; i += 1) {
    const span = pool.length - i;
    const offset = Math.min(span - 1, Math.floor(random() * span));
    const j = i + offset;
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
