// Generates public/favicon.ico (16×16 + 32×32 PNG entries) from public/favicon.svg with sharp.
// sharp has no ICO encoder, so the ICO container (ICONDIR + ICONDIRENTRY[] + PNG payloads) is written by hand.
// Run: node scripts/build-favicon-ico.mjs   (the output is committed; re-run only when favicon.svg changes)
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function icoFromPngs(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach(({ size, png }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o); // width
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1); // height
    dir.writeUInt8(0, o + 2); // palette colours
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // colour planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('../public/', import.meta.url);
  const svg = await readFile(new URL('favicon.svg', root));
  const entries = [];
  for (const size of [16, 32]) {
    const png = await sharp(svg, { density: 384 }).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    entries.push({ size, png });
  }
  const ico = icoFromPngs(entries);
  await writeFile(new URL('favicon.ico', root), ico);
  console.log(`public/favicon.ico: ${ico.length} bytes (${entries.map((e) => `${e.size}x${e.size}`).join(', ')})`);
}
