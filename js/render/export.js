// Скачивание готового листа: PNG без потерь и PDF формата A4.

import { buildPdf } from '../core/pdf.js';
import { makeFileName } from '../core/filename.js';

export function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('браузер не смог создать файл из холста'))),
      type,
      quality,
    );
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function exportPng(canvas, characterName) {
  const blob = await canvasToBlob(canvas, 'image/png');
  const filename = makeFileName(characterName, 'png');
  downloadBlob(blob, filename);
  return filename;
}

export async function exportPdf(canvas, characterName, { jpegQuality = 0.95 } = {}) {
  const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', jpegQuality);
  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());
  const pdf = buildPdf({
    jpeg,
    imageWidth: canvas.width,
    imageHeight: canvas.height,
    title: `Лист персонажа — ${characterName}`,
  });
  const filename = makeFileName(characterName, 'pdf');
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), filename);
  return filename;
}
