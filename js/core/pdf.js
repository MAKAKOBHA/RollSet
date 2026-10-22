// Минимальный писатель PDF: одна страница A4 с одной JPEG-картинкой. Без сторонних библиотек.
// Картинка вписывается в страницу по центру с сохранением пропорций
// (лист 2480×3508 — это ровно A4 при 300 dpi, поэтому занимает всю страницу).

export const A4_PT = Object.freeze({ width: 595.276, height: 841.89 }); // 210×297 мм в пунктах

const encoder = new TextEncoder();

const num = (n) => Number(n.toFixed(3)).toString();

/** Строка PDF в виде UTF-16BE hex — так в метаданных хранится кириллица. */
function utf16Hex(text) {
  let hex = 'FEFF';
  for (let i = 0; i < text.length; i += 1) hex += text.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
  return `<${hex}>`;
}

function pdfDate(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `D:${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`;
}

/**
 * @param {{jpeg:Uint8Array, imageWidth:number, imageHeight:number, pageWidth?:number, pageHeight?:number, title?:string, creationDate?:Date}} opts
 * @returns {Uint8Array}
 */
export function buildPdf({
  jpeg,
  imageWidth,
  imageHeight,
  pageWidth = A4_PT.width,
  pageHeight = A4_PT.height,
  title = '',
  creationDate = new Date(),
}) {
  if (!(jpeg instanceof Uint8Array) || jpeg.length < 4) throw new TypeError('jpeg должен быть непустым Uint8Array');
  if (!(imageWidth > 0) || !(imageHeight > 0)) throw new RangeError('Размеры картинки должны быть положительными');

  const chunks = [];
  let length = 0;
  const push = (data) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };

  const offsets = [];
  const begin = (n) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
  };
  const end = () => push('endobj\n');

  const scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
  const drawW = imageWidth * scale;
  const drawH = imageHeight * scale;
  const x = (pageWidth - drawW) / 2;
  const y = (pageHeight - drawH) / 2;
  const content = `q ${num(drawW)} 0 0 ${num(drawH)} ${num(x)} ${num(y)} cm /Im0 Do Q\n`;

  push('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // «бинарный» комментарий

  begin(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\n');
  end();

  begin(2);
  push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n');
  end();

  begin(3);
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(pageWidth)} ${num(pageHeight)}] ` +
      '/Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>\n',
  );
  end();

  begin(4);
  push(
    `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  );
  push(jpeg);
  push('\nendstream\n');
  end();

  begin(5);
  push(`<< /Length ${content.length} >>\nstream\n${content}endstream\n`);
  end();

  begin(6);
  push(`<< /Title ${utf16Hex(String(title))} /Producer (RollSet) /CreationDate (${pdfDate(creationDate)}) >>\n`);
  end();

  const xrefOffset = length;
  let xref = 'xref\n0 7\n0000000000 65535 f \n';
  for (let n = 1; n <= 6; n += 1) xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) {
    out.set(chunk, position);
    position += chunk.length;
  }
  return out;
}
