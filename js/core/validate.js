// Проверка данных. Возвращает список понятных ошибок (пустой список = всё хорошо).
// Нужна, чтобы при замене тестовых данных на настоящие опечатка не превратилась в «белый экран».

const ALIGNS = new Set(['left', 'center', 'right']);

export function validateCards(cards, skills, { expectedCount } = {}) {
  if (!Array.isArray(cards)) return ['cards.js: ожидается массив карт.'];
  const errors = [];

  if (expectedCount != null && cards.length !== expectedCount) {
    errors.push(`Карт должно быть ${expectedCount}, а в cards.js их ${cards.length}.`);
  }

  const ids = new Set();
  const numbers = new Set();

  cards.forEach((card, index) => {
    const where = `Карта №${index + 1} в списке`;

    if (typeof card?.id !== 'string' || !card.id) errors.push(`${where}: не задан id.`);
    else if (ids.has(card.id)) errors.push(`${where}: id «${card.id}» повторяется.`);
    else ids.add(card.id);

    if (!Number.isInteger(card?.number) || card.number < 1) {
      errors.push(`${where}: number должен быть целым числом от 1.`);
    } else if (numbers.has(card.number)) {
      errors.push(`${where}: number ${card.number} повторяется.`);
    } else numbers.add(card.number);

    if (typeof card?.name !== 'string' || !card.name.trim()) errors.push(`${where}: не задано название (name).`);

    for (const skill of skills) {
      if (!Number.isInteger(card?.modifiers?.[skill.id])) {
        errors.push(`${where} («${card?.name ?? '?'}»): модификатор «${skill.name}» (${skill.id}) должен быть целым числом.`);
      }
    }
  });

  return errors;
}

function checkBox(label, box, sheet) {
  const errors = [];
  if (!box || typeof box !== 'object') return [`Раскладка: нет поля «${label}».`];

  for (const key of ['x', 'y', 'w', 'h', 'maxFont', 'minFont']) {
    if (!Number.isFinite(box[key])) errors.push(`Раскладка «${label}»: ${key} должно быть числом.`);
  }
  if (errors.length) return errors;

  if (box.w <= 0 || box.h <= 0) errors.push(`Раскладка «${label}»: w и h должны быть больше нуля.`);
  if (box.x < 0 || box.y < 0 || box.x + box.w > sheet.width || box.y + box.h > sheet.height) {
    errors.push(`Раскладка «${label}»: поле выходит за границы листа ${sheet.width}×${sheet.height}.`);
  }
  if (box.minFont <= 0 || box.maxFont < box.minFont) {
    errors.push(`Раскладка «${label}»: должно быть 0 < minFont ≤ maxFont.`);
  }
  if (!ALIGNS.has(box.align)) errors.push(`Раскладка «${label}»: align должен быть left, center или right.`);
  if (!Number.isInteger(box.maxLines) || box.maxLines < 1) {
    errors.push(`Раскладка «${label}»: maxLines должно быть целым числом от 1.`);
  }
  return errors;
}

export function validateLayout(layout, sheet, skills, pickCount, derived = []) {
  const errors = [];
  if (!Number.isInteger(sheet?.width) || !Number.isInteger(sheet?.height) || sheet.width <= 0 || sheet.height <= 0) {
    return ['SHEET: width и height должны быть положительными целыми числами.'];
  }

  errors.push(...checkBox('Имя', layout?.name, sheet));

  if (!Array.isArray(layout?.archetypes) || layout.archetypes.length !== pickCount) {
    errors.push(`Раскладка: archetypes должен содержать ровно ${pickCount} поля.`);
  } else {
    layout.archetypes.forEach((box, i) => errors.push(...checkBox(`Архетип ${i + 1}`, box, sheet)));
  }

  for (const skill of skills) {
    errors.push(...checkBox(`Навык «${skill.name}»`, layout?.skills?.[skill.id], sheet));
  }
  // Поля Хитов и Психики необязательны (старые раскладки без них продолжают работать), но если есть — проверяются.
  if (layout?.derived) {
    for (const def of derived) {
      if (layout.derived[def.id]) errors.push(...checkBox(`«${def.name}»`, layout.derived[def.id], sheet));
    }
  }
  return errors;
}
