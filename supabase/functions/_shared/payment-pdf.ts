import { PAYMENT_LOGO_PNG_BASE64 } from './payment-logo.ts';

const encoder = new TextEncoder();
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const NAVY = [0.055, 0.09, 0.17];
const BLUE = [0.012, 0.255, 0.988];
const RED = [0.86, 0.15, 0.17];
const SLATE = [0.31, 0.37, 0.47];
const PALE = [0.94, 0.96, 0.99];
const WATERMARK = [0.955, 0.962, 0.976];
const SITE_URL = 'https://nexxacrafts.co.ke';
export const PAYMENT_PDF_DESIGN_VERSION = 4;

export interface PaymentPdfLine {
  description: string;
  quantity: number;
  amount: number;
  unitAmount?: number;
}

export interface PaymentPdfDocument {
  kind: 'invoice' | 'receipt';
  number: string;
  orderReference: string;
  customerName: string;
  customerEmail: string;
  date?: string;
  dueDate?: string;
  lines: PaymentPdfLine[];
  subtotal?: number;
  tax?: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentMethod?: string;
  transactionReference?: string;
}

function safeText(value: unknown) {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/·/g, '-')
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/([\\()])/g, '\\$1');
}

function color(values: number[], stroke = false) {
  return `${values.map(value => value.toFixed(3)).join(' ')} ${stroke ? 'RG' : 'rg'}`;
}

function money(value: unknown) {
  const amount = Number(value);
  return `KES ${Number.isFinite(amount) ? amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`;
}

function wrap(value: unknown, maxChars: number) {
  const words = safeText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > maxChars) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function newCanvas() {
  const ops: string[] = [];
  const text = (value: unknown, x: number, y: number, size = 9, font = 'F1', ink = NAVY) => {
    ops.push(`q ${color(ink)} BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${safeText(value)}) Tj ET Q`);
  };
  const rightText = (value: unknown, right: number, y: number, size = 9, font = 'F1', ink = NAVY) => {
    const string = safeText(value);
    const approximateWidth = string.length * size * 0.52;
    text(string, right - approximateWidth, y, size, font, ink);
  };
  const rect = (x: number, y: number, width: number, height: number, fill: number[], stroke?: number[]) => {
    const paint = stroke ? `${color(stroke, true)} ${color(fill)} B` : `${color(fill)} f`;
    ops.push(`q ${x} ${y} ${width} ${height} re ${paint} Q`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, ink = PALE, width = 0.7) => {
    ops.push(`q ${color(ink, true)} ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  };
  return { ops, text, rightText, rect, line };
}

function pageHeader(canvas: ReturnType<typeof newCanvas>, document: PaymentPdfDocument, first: boolean, pageNumber: number) {
  const { text, rightText, rect, line } = canvas;
  rect(0, PAGE_HEIGHT - 4, PAGE_WIDTH, 4, BLUE);
  rect(0, PAGE_HEIGHT - 4, 34, 4, RED);

  // Low contrast diagonal brand watermark, kept inside printable margins.
  canvas.ops.push(`q ${color(WATERMARK)} BT /F2 53 Tf 0.875 0.485 -0.485 0.875 40 355 Tm (NEXXACRAFT) Tj ET Q`);
  canvas.ops.push(`q ${color([0.91, 0.93, 0.97], true)} 3 w 0.88 0.48 -0.48 0.88 34 300 cm 78 0 m 335 0 l 335 180 l S 112 0 m 112 115 l 240 115 l 240 180 l S 178 115 m 178 150 l 295 150 l S Q`);

  // White paper masthead with the actual transparent company logo and restrained brand accents.
  rect(0, PAGE_HEIGHT - 126, PAGE_WIDTH, 122, [1, 1, 1]);
  canvas.ops.push(`q 150 0 0 53 42 ${PAGE_HEIGHT - 72} cm /Logo Do Q`);
  text('DESIGN  /  PRINT  /  BUILD', 44, PAGE_HEIGHT - 91, 8, 'F2', SLATE);
  text(SITE_URL.replace('https://', ''), 44, PAGE_HEIGHT - 106, 7, 'F1', SLATE);
  rightText(first ? (document.kind === 'invoice' ? 'CUSTOMER INVOICE' : 'PAYMENT RECEIPT') : (document.kind === 'invoice' ? 'INVOICE CONTINUED' : 'RECEIPT CONTINUED'), 553, PAGE_HEIGHT - 51, 14, 'F2', NAVY);
  rightText(document.number, 553, PAGE_HEIGHT - 70, 8, 'F2', BLUE);
  if (!first) rightText(`PAGE ${pageNumber}`, 553, PAGE_HEIGHT - 88, 7, 'F1', SLATE);
  line(42, PAGE_HEIGHT - 126, 553, PAGE_HEIGHT - 126, [0.84, 0.88, 0.93], 0.8);
}

function sectionLabel(canvas: ReturnType<typeof newCanvas>, value: string, x: number, y: number) {
  canvas.text(value.toUpperCase(), x, y, 7, 'F2', BLUE);
}

function tableHeader(canvas: ReturnType<typeof newCanvas>, y: number) {
  const { rect, text, rightText } = canvas;
  rect(42, y - 8, 511, 24, [0.91, 0.94, 0.99], [0.83, 0.87, 0.94]);
  rect(42, y - 8, 3, 24, BLUE);
  text('DESCRIPTION', 53, y, 7, 'F2', NAVY);
  rightText('QTY', 453, y, 7, 'F2', NAVY);
  rightText('AMOUNT', 542, y, 7, 'F2', NAVY);
}

function beginPage(document: PaymentPdfDocument, first: boolean, pageNumber: number) {
  const canvas = newCanvas();
  pageHeader(canvas, document, first, pageNumber);
  let y = first ? 684 : 700;

  if (first) {
    const { rect, line, text, rightText } = canvas;
    rect(42, 594, 511, 72, [0.975, 0.981, 0.992], [0.86, 0.89, 0.94]);
    rect(42, 594, 3, 72, BLUE);
    sectionLabel(canvas, document.kind === 'invoice' ? 'Billed to' : 'Received from', 56, 650);
    text(document.customerName, 56, 630, 13, 'F2', NAVY);
    text(document.customerEmail, 56, 612, 8, 'F1', SLATE);
    sectionLabel(canvas, document.kind === 'invoice' ? 'Order reference' : 'Payment reference', 350, 650);
    rightText(document.orderReference, 539, 631, 8, 'F2', NAVY);
    sectionLabel(canvas, document.kind === 'invoice' ? 'Invoice date' : 'Payment date', 350, 615);
    rightText(document.date || new Date().toLocaleDateString('en-KE'), 539, 601, 8, 'F1', SLATE);

    const metaY = 573;
    text(document.kind === 'invoice' ? 'DUE DATE' : 'PAYMENT METHOD', 53, metaY, 7, 'F2', SLATE);
    text(document.kind === 'invoice' ? (document.dueDate || 'As agreed') : (document.paymentMethod || 'Confirmed').toUpperCase(), 53, metaY - 14, 9, 'F2', NAVY);
    if (document.kind === 'receipt') {
      text('PAYMENT REFERENCE', 315, metaY, 7, 'F2', SLATE);
      text(document.transactionReference || 'Confirmed', 315, metaY - 14, 8, 'F2', NAVY);
    }
    line(42, 546, 553, 546, [0.86, 0.89, 0.94]);
    y = 515;
  } else y = 660;

  sectionLabel(canvas, document.kind === 'invoice' ? 'Invoice details' : 'Payment details', 42, y + 23);
  tableHeader(canvas, y);
  return { canvas, y: y - 22 };
}

type PdfObject = string | Uint8Array;

function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function streamObject(dictionary: string, stream: Uint8Array): Uint8Array {
  return concatBytes([encoder.encode(`${dictionary}\nstream\n`), stream, encoder.encode('\nendstream')]);
}

async function deflate(bytes: Uint8Array) {
  const source = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([source]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function loadLogoImages() {
  const png = Uint8Array.from(atob(PAYMENT_LOGO_PNG_BASE64), character => character.charCodeAt(0));
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat: Uint8Array[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    const dataStart = offset + 8;
    if (type === 'IHDR') {
      width = view.getUint32(dataStart); height = view.getUint32(dataStart + 4);
      bitDepth = png[dataStart + 8]; colorType = png[dataStart + 9];
    }
    if (type === 'IDAT') idat.push(png.slice(dataStart, dataStart + length));
    offset = dataStart + length + 4;
    if (type === 'IEND') break;
  }
  if (!width || !height || bitDepth !== 8 || colorType !== 6) throw new Error('The company logo PNG must be an 8-bit RGBA image.');
  const compressed = concatBytes(idat);
  const compressedBuffer = compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength) as ArrayBuffer;
  const decodedStream = new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream('deflate'));
  const filtered = new Uint8Array(await new Response(decodedStream).arrayBuffer());
  const stride = width * 4;
  const rgba = new Uint8Array(height * stride);
  let sourceOffset = 0;
  for (let row = 0; row < height; row++) {
    const filter = filtered[sourceOffset++];
    const rowOffset = row * stride;
    for (let column = 0; column < stride; column++) {
      const raw = filtered[sourceOffset++];
      const left = column >= 4 ? rgba[rowOffset + column - 4] : 0;
      const above = row ? rgba[rowOffset - stride + column] : 0;
      const upperLeft = row && column >= 4 ? rgba[rowOffset - stride + column - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) {
        const p = left + above - upperLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - above), pc = Math.abs(p - upperLeft);
        predictor = pa <= pb && pa <= pc ? left : pb <= pc ? above : upperLeft;
      }
      rgba[rowOffset + column] = (raw + predictor) & 255;
    }
  }
  const rgbRows = new Uint8Array(height * (width * 3 + 1));
  const alphaRows = new Uint8Array(height * (width + 1));
  for (let row = 0; row < height; row++) {
    const rgbOffset = row * (width * 3 + 1), alphaOffset = row * (width + 1), rgbaOffset = row * stride;
    rgbRows[rgbOffset] = 0; alphaRows[alphaOffset] = 0;
    for (let column = 0; column < width; column++) {
      rgbRows[rgbOffset + 1 + column * 3] = rgba[rgbaOffset + column * 4];
      rgbRows[rgbOffset + 2 + column * 3] = rgba[rgbaOffset + column * 4 + 1];
      rgbRows[rgbOffset + 3 + column * 3] = rgba[rgbaOffset + column * 4 + 2];
      alphaRows[alphaOffset + 1 + column] = rgba[rgbaOffset + column * 4 + 3];
    }
  }
  return { width, height, rgb: await deflate(rgbRows), alpha: await deflate(alphaRows) };
}

function pdfObjects(pages: string[], logo: Awaited<ReturnType<typeof loadLogoImages>>) {
  const objects: PdfObject[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>',
  ];
  objects.push(streamObject(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns ${logo.width} >> >> /Length ${logo.alpha.length} >>`, logo.alpha));
  objects.push(streamObject(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${logo.width} >> /SMask 6 0 R /Length ${logo.rgb.length} >>`, logo.rgb));
  const pageIds = pages.map((_, index) => 8 + index * 2);
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  pages.forEach((stream, index) => {
    const pageId = pageIds[index];
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> /XObject << /Logo 7 0 R >> >> /Contents ${pageId + 1} 0 R >>`);
    objects.push(streamObject(`<< /Length ${encoder.encode(stream).length} >>`, encoder.encode(stream)));
  });
  const parts: Uint8Array[] = [encoder.encode('%PDF-1.4\n')];
  const offsets = [0];
  let length = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const body = typeof object === 'string' ? encoder.encode(object) : object;
    const framed = concatBytes([encoder.encode(`${index + 1} 0 obj\n`), body, encoder.encode('\nendobj\n')]);
    parts.push(framed); length += framed.length;
  });
  const xref = length;
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) trailer += `${String(offset).padStart(10, '0')} 00000 n \n`;
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  parts.push(encoder.encode(trailer));
  return concatBytes(parts);
}

/** Branded A4 invoice or receipt PDF. Uses vector artwork and standard PDF fonts for reliable printing. */
export async function createPaymentPdf(document: PaymentPdfDocument) {
  const logo = await loadLogoImages();
  const pages: string[] = [];
  let pageNumber = 1;
  let current = beginPage(document, true, pageNumber);
  let rowIndex = 0;

  const addPage = () => {
    pages.push(`${current.canvas.ops.join('\n')}\n`);
    pageNumber += 1;
    current = beginPage(document, false, pageNumber);
  };

  for (const item of document.lines) {
    const descriptionLines = wrap(item.description, 58);
    const rowHeight = Math.max(28, descriptionLines.length * 11 + 10);
    if (current.y - rowHeight < 150) addPage();
    const yTop = current.y;
    current.canvas.rect(42, yTop - rowHeight + 5, 511, rowHeight, rowIndex % 2 ? [1, 1, 1] : [0.972, 0.979, 0.992]);
    current.canvas.text(descriptionLines[0], 53, yTop - 8, 8, 'F2', NAVY);
    descriptionLines.slice(1).forEach((line, index) => current.canvas.text(line, 53, yTop - 19 - index * 10, 7.5, 'F1', NAVY));
    current.canvas.rightText(String(item.quantity || 1), 453, yTop - 9, 8, 'F1', NAVY);
    current.canvas.rightText(money(item.amount), 542, yTop - 9, 8, 'F2', NAVY);
    current.canvas.line(42, yTop - rowHeight + 5, 553, yTop - rowHeight + 5, [0.88, 0.91, 0.95], 0.45);
    current.y -= rowHeight;
    rowIndex += 1;
  }

  const totalsHeight = document.kind === 'invoice' ? 100 : 100;
  if (current.y - totalsHeight < 205) addPage();
  let totalTop = current.y - 4;
  if (totalTop - 170 < 88) {
    addPage();
    totalTop = current.y - 4;
  }
  if (document.kind === 'invoice') {
    current.canvas.rightText('Subtotal', 435, totalTop, 8, 'F1', SLATE);
    current.canvas.rightText(money(document.subtotal ?? document.total), 542, totalTop, 8, 'F2', NAVY);
    current.canvas.rightText('Tax', 435, totalTop - 17, 8, 'F1', SLATE);
    current.canvas.rightText(money(document.tax ?? 0), 542, totalTop - 17, 8, 'F2', NAVY);
    current.canvas.rect(42, totalTop - 57, 511, 29, [0.91, 0.94, 0.99], [0.82, 0.87, 0.95]);
    current.canvas.rect(42, totalTop - 57, 3, 29, BLUE);
    current.canvas.text('AMOUNT DUE', 54, totalTop - 47, 8, 'F2', NAVY);
    current.canvas.rightText(money(document.total), 540, totalTop - 47, 11, 'F2', BLUE);
    current.canvas.text(`Payment method: ${(document.paymentMethod || 'To be confirmed').toUpperCase()}`, 53, totalTop - 77, 7, 'F1', SLATE);
  } else {
    current.canvas.rightText('Invoice total', 435, totalTop, 8, 'F1', SLATE);
    current.canvas.rightText(money(document.total), 542, totalTop, 8, 'F2', NAVY);
    current.canvas.rightText('Payment received', 435, totalTop - 17, 8, 'F1', SLATE);
    current.canvas.rightText(money(document.amountPaid ?? document.total), 542, totalTop - 17, 8, 'F2', NAVY);
    current.canvas.rect(42, totalTop - 57, 511, 29, [0.91, 0.94, 0.99], [0.82, 0.87, 0.95]);
    current.canvas.rect(42, totalTop - 57, 3, 29, BLUE);
    current.canvas.text('BALANCE DUE', 54, totalTop - 47, 8, 'F2', NAVY);
    current.canvas.rightText(money(document.balanceDue ?? 0), 540, totalTop - 47, 11, 'F2', BLUE);
  }

  // Signature block: Times italic gives a script-like signature appearance while remaining font-safe in PDF viewers.
  current.canvas.text('Shannel Oduor', 385, totalTop - 122, 21, 'F3', NAVY);
  current.canvas.line(375, totalTop - 129, 545, totalTop - 129, [0.69, 0.73, 0.80], 0.65);
  current.canvas.text('Shannel Oduor', 385, totalTop - 143, 8, 'F2', NAVY);
  current.canvas.text('Manager, Nexxacrafts', 385, totalTop - 156, 7, 'F1', SLATE);

  current.canvas.line(42, 70, 553, 70, [0.84, 0.88, 0.93], 0.7);
  current.canvas.text(document.kind === 'invoice' ? 'Thank you for choosing NexxaCraft.' : 'Payment received with thanks.', 42, 54, 8, 'F2', NAVY);
  current.canvas.text('Design  /  Print  /  Build     nexxacrafts.co.ke     info@nexxacrafts.co.ke', 42, 39, 7, 'F1', SLATE);
  current.canvas.rightText(`PAGE ${pageNumber}`, 553, 39, 7, 'F1', SLATE);
  pages.push(`${current.canvas.ops.join('\n')}\n`);
  return pdfObjects(pages, logo);
}

export function pdfBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  return btoa(binary);
}

function encodeObjectPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

/** Upload a private PDF and mint a short-lived URL for the WhatsApp provider to fetch. */
export async function uploadPaymentPdf(supabaseUrl: string, serviceKey: string, objectPath: string, pdf: Uint8Array) {
  const objectUrl = `${supabaseUrl}/storage/v1/object/payment-documents/${encodeObjectPath(objectPath)}`;
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const upload = await fetch(objectUrl, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/pdf', 'x-upsert': 'true' }, body: pdf });
  if (!upload.ok) throw new Error(`Could not store PDF for WhatsApp (${upload.status}): ${(await upload.text()).slice(0, 300)}`);
  const signed = await fetch(`${supabaseUrl}/storage/v1/object/sign/payment-documents/${encodeObjectPath(objectPath)}`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 7 }),
  });
  const body = await signed.json().catch(() => ({})) as { signedURL?: string };
  if (!signed.ok || !body.signedURL) throw new Error(`Could not create a secure WhatsApp PDF link (${signed.status}).`);
  return body.signedURL.startsWith('http') ? body.signedURL : `${supabaseUrl}/storage/v1${body.signedURL.startsWith('/') ? '' : '/'}${body.signedURL}`;
}
