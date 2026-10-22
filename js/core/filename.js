// Имя файла для скачивания. Кириллица и другие буквы сохраняются, остальное превращается в «_».

export function slugifyName(name) {
  const slug = String(name ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
  return [...slug].slice(0, 40).join('').replace(/_+$/g, '') || 'character';
}

export function makeFileName(name, ext) {
  return `rollset_${slugifyName(name)}.${ext}`;
}
