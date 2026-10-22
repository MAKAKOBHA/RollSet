// Запускает задачи (функции, возвращающие промис) не более limit одновременно, по порядку.
// Ошибки отдельных задач не останавливают остальные.

export async function runPool(tasks, limit = 2) {
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next];
      next += 1;
      try {
        await task();
      } catch {
        /* одна неудача не мешает остальным */
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}
