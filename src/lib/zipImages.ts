const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', avif: 'image/avif',
};
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 250 * 1024 * 1024;
const MAX_IMAGES = 100;

/** Extracts supported gallery images from a normal ZIP archive without uploading other entries. */
export async function extractPortfolioImages(zip: File): Promise<File[]> {
  if (zip.size > MAX_ARCHIVE_BYTES) throw new Error('ZIP archives must be 100 MB or smaller.');
  const bytes = await zip.arrayBuffer();
  if (bytes.byteLength < 22) throw new Error('This ZIP archive is too small or invalid.');
  const view = new DataView(bytes);
  const minEocd = Math.max(0, bytes.byteLength - 22 - 0xffff);
  let eocd = -1;
  for (let offset = bytes.byteLength - 22; offset >= minEocd; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.byteLength) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error('This ZIP archive is invalid or uses an unsupported ZIP format.');
  const disk = view.getUint16(eocd + 4, true), centralDisk = view.getUint16(eocd + 6, true);
  const entries = view.getUint16(eocd + 10, true), directorySize = view.getUint32(eocd + 12, true), directoryOffset = view.getUint32(eocd + 16, true);
  if (disk || centralDisk || entries === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) throw new Error('Multi-disk and ZIP64 archives are not supported.');
  if (directoryOffset + directorySize > eocd) throw new Error('This ZIP archive has an invalid directory.');

  const decoder = new TextDecoder();
  const extracted: File[] = [];
  let cursor = directoryOffset, totalBytes = 0;
  for (let index = 0; index < entries; index++) {
    if (cursor + 46 > bytes.byteLength || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('This ZIP archive has a damaged file directory.');
    const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true), uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true), extraLength = view.getUint16(cursor + 30, true), commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const nameStart = cursor + 46, next = nameStart + nameLength + extraLength + commentLength;
    if (next > bytes.byteLength) throw new Error('This ZIP archive has a damaged file name.');
    const archivedName = decoder.decode(new Uint8Array(bytes, nameStart, nameLength)).replace(/\\/g, '/');
    cursor = next;
    if (archivedName.endsWith('/')) continue;
    const extension = archivedName.split('/').pop()?.split('.').pop()?.toLowerCase() ?? '';
    const mime = IMAGE_TYPES[extension];
    if (!mime) continue;
    if (flags & 1) throw new Error(`The image “${archivedName.split('/').pop()}” is encrypted. Use an unencrypted ZIP archive.`);
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) throw new Error('ZIP64 archives are not supported.');
    if (uncompressedSize > MAX_IMAGE_BYTES) throw new Error(`The image “${archivedName.split('/').pop()}” exceeds the 20 MB per-image limit.`);
    totalBytes += uncompressedSize;
    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) throw new Error('Extracted images exceed the 250 MB total limit. Split them across smaller ZIP archives.');
    if (extracted.length >= MAX_IMAGES) throw new Error(`A maximum of ${MAX_IMAGES} images can be imported at once.`);
    if (method !== 0 && method !== 8) throw new Error(`The image “${archivedName.split('/').pop()}” uses an unsupported ZIP compression method.`);
    if (localOffset + 30 > bytes.byteLength || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error(`The image “${archivedName.split('/').pop()}” has an invalid ZIP entry.`);
    const localNameLength = view.getUint16(localOffset + 26, true), localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength, dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.byteLength) throw new Error(`The image “${archivedName.split('/').pop()}” is incomplete in the ZIP archive.`);
    const compressed = new Blob([bytes.slice(dataStart, dataEnd)]);
    let imageBlob: Blob;
    if (method === 0) imageBlob = compressed;
    else {
      if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot extract ZIP images. Try a current version of Chrome, Edge, or Firefox.');
      try { imageBlob = await new Response(compressed.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob(); }
      catch { throw new Error(`Could not extract “${archivedName.split('/').pop()}”. Check that the ZIP archive is valid.`); }
    }
    if (imageBlob.size !== uncompressedSize) throw new Error(`The extracted size of “${archivedName.split('/').pop()}” does not match the ZIP directory.`);
    extracted.push(new File([imageBlob], archivedName.split('/').pop() || `portfolio-image-${index + 1}.${extension}`, { type: mime }));
  }
  if (!extracted.length) throw new Error('No supported images found. ZIP files may contain JPG, PNG, WebP, GIF, or AVIF images.');
  return extracted;
}
