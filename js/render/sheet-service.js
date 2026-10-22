// Собирает готовый холст с листом персонажа. Один холст используется и для предпросмотра, и для экспорта.

import { drawSheet } from './sheet-renderer.js';
import { ensureFontsReady } from './fonts.js';

export function createSheetService({ assets, sheet, layout, style, skills, derived = [], fontStack, scale = 1 }) {
  let canvas = null;

  return {
    /** @returns {Promise<HTMLCanvasElement>} */
    async render(character) {
      const { sheetImage } = await assets; // оригинальный PNG листа (или null, если файла нет)
      await ensureFontsReady();

      const next = document.createElement('canvas');
      next.width = Math.round(sheet.width * scale);
      next.height = Math.round(sheet.height * scale);
      drawSheet(next.getContext('2d'), { sheetImage, sheet, layout, style, skills, derived, fontStack, character, scale });

      canvas = next;
      return next;
    },
    getCanvas: () => canvas,
    clear() {
      canvas = null;
    },
  };
}
