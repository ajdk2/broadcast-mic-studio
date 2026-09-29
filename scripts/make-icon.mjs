// Draws the Aurel mark (amber rounded square, five voice bars) and writes build/icon.png and a
// multi-size build/icon.ico for the installer. Run with: node scripts/make-icon.mjs
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const AMBER = [0xf5, 0xa6, 0x23];
const INK = [0x1b, 0x12, 0x04];
const BARS = [[8, 14, 14], [11, 10.5, 17.5], [14, 7.5, 20.5], [17, 10.5, 17.5], [20, 13.5, 14.5]];

function render(size) {
  const s = size;
  const px = new Float64Array(s * s * 4); // straight RGBA, 0–1
  const scale = s / 28;
  const r = 8 * scale;
  const half = (2.2 * scale) / 2;
  const inRounded = (x, y) => {
    const cx = Math.min(Math.max(x, r), s - r);
    const cy = Math.min(Math.max(y, r), s - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
  const inBar = (x, y) =>
    BARS.some(([bx, y0, y1]) => {
      const X = bx * scale, Y0 = y0 * scale, Y1 = y1 * scale;
      const cy = Math.min(Math.max(y, Y0), Y1);
      return (x - X) ** 2 + (y - cy) ** 2 <= half * half;
    });
  const N = 8;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      let a = 0, b = 0;
      for (let sy = 0; sy < N; sy++) {
        for (let sx = 0; sx < N; sx++) {
          const fx = x + (sx + 0.5) / N, fy = y + (sy + 0.5) / N;
          if (inRounded(fx, fy)) {
            a++;
            if (inBar(fx, fy)) b++;
          }
        }
      }
      a /= N * N;
      b /= N * N;
      const i = (y * s + x) * 4;
      const t = a ? b / a : 0; // share of ink inside the square
      for (let c = 0; c < 3; c++) px[i + c] = (AMBER[c] * (1 - t) + INK[c] * t) / 255;
      px[i + 3] = a;
    }
  }
  const out = Buffer.alloc(s * s * 4);
  for (let i = 0; i < out.length; i++) out[i] = Math.round(px[i] * 255);
  return out;
}

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const rgba = render(size);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ICO with PNG-compressed entries (supported since Windows Vista).
function ico(sizes) {
  const images = sizes.map(png);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  const dir = Buffer.alloc(16 * sizes.length);
  let offset = 6 + dir.length;
  sizes.forEach((s, i) => {
    const e = i * 16;
    dir[e] = s >= 256 ? 0 : s;
    dir[e + 1] = s >= 256 ? 0 : s;
    dir.writeUInt16LE(1, e + 4); // planes
    dir.writeUInt16LE(32, e + 6); // bits per pixel
    dir.writeUInt32LE(images[i].length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += images[i].length;
  });
  return Buffer.concat([header, dir, ...images]);
}

const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'build');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon.png'), png(512));
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico([16, 20, 24, 32, 40, 48, 64, 128, 256]));
console.log('Wrote build/icon.png and build/icon.ico');
