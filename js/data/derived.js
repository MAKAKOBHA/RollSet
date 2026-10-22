// Производные показатели: считаются из итоговых навыков.
// значение = base + сумма навыков из from (минус навыка уменьшает показатель, плюс — увеличивает).
// Формулы заданы автором игры; если они изменятся, правится только этот файл.

export const DERIVED = Object.freeze([
  Object.freeze({ id: 'hp', name: 'Хиты', base: 10, from: Object.freeze(['motorics']) }),
  Object.freeze({ id: 'psyche', name: 'Психика', base: 10, from: Object.freeze(['intimidation', 'mind', 'authority']) }),
]);
