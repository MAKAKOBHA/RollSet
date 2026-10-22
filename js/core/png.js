// Размеры PNG по заголовку IHDR (без декодирования картинки). Используется в tools/check-assets.mjs.

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR = 0x49484452;

/** @param {Uint8Array} bytes @returns {{width:number,height:number}|null} */
export function readPngSize(bytes) {
  if (!bytes || bytes.length < 24) return null;
  if (!SIGNATURE.every((byte, i) => bytes[i] === byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(12) !== IHDR) return null;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
