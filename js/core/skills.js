// Подсчёт навыков: только сумма модификаторов выбранных карт. Базовых значений нет —
// в условии их не задано, поэтому программа их не придумывает.

function modifierOf(card, skill) {
  const value = card.modifiers?.[skill.id];
  if (!Number.isFinite(value)) {
    throw new TypeError(`Карта «${card.name}»: нет числового модификатора для навыка «${skill.name}»`);
  }
  return value;
}

/** Для каждого навыка: значения по картам (в порядке cards) и сумма. */
export function buildBreakdown(cards, skills) {
  return skills.map((skill) => {
    const perCard = cards.map((card) => modifierOf(card, skill));
    return { skill, perCard, total: perCard.reduce((sum, v) => sum + v, 0) };
  });
}

/** { skillId: сумма } */
export function sumModifiers(cards, skills) {
  const totals = {};
  for (const row of buildBreakdown(cards, skills)) totals[row.skill.id] = row.total;
  return totals;
}

/**
 * Производные показатели (Хиты, Психика): base + сумма итогов указанных навыков.
 * @returns {Record<string, number>} { hp: 12, psyche: 9 }
 */
export function computeDerived(defs, skillTotals) {
  const result = {};
  for (const def of defs ?? []) {
    result[def.id] = def.base + def.from.reduce((sum, id) => sum + skillTotals[id], 0);
  }
  return result;
}

/** Всё, что печатается на листе: имя, названия трёх архетипов, сумма по каждому навыку и производные показатели. */
export function buildCharacter({ name, cards, skills, derived = [] }) {
  const totals = sumModifiers(cards, skills);
  return {
    name,
    archetypes: cards.map((card) => card.name),
    skills: totals,
    derived: computeDerived(derived, totals),
  };
}

/** 3 → «+3», -2 → «-2», 0 → «0». Знак минуса можно заменить (например, на «−»). */
export function formatModifier(value, { plus = '+', minus = '-' } = {}) {
  if (value > 0) return `${plus}${value}`;
  if (value < 0) return `${minus}${Math.abs(value)}`;
  return '0';
}

export function signClass(value) {
  if (value > 0) return 'pos';
  if (value < 0) return 'neg';
  return 'zero';
}
