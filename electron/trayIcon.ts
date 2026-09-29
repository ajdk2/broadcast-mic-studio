import { nativeImage, NativeImage } from 'electron';

// Draws the Aurel mark (amber rounded square with five voice bars) as a bitmap, so the tray icon
// needs no image file. `muted` adds a red slash; `bypassed` greys the square.
export function trayIcon(size = 32, state: 'on' | 'bypassed' | 'muted' = 'on'): NativeImage {
  const s = size;
  const buf = Buffer.alloc(s * s * 4);
  const amber = state === 'bypassed' ? [0x8c, 0x90, 0x98] : [0xf5, 0xa6, 0x23];
  const ink = [0x1b, 0x12, 0x04];
  const r = (8 / 28) * s;
  const bars: [number, number, number][] = [
    [8, 14, 14], [11, 10.5, 17.5], [14, 7.5, 20.5], [17, 10.5, 17.5], [20, 13.5, 14.5],
  ].map(([x, y0, y1]) => [(x / 28) * s, (y0 / 28) * s, (y1 / 28) * s]);
  const barHalf = ((2.4 / 28) * s) / 2;
  const put = (x: number, y: number, rgb: number[], a: number) => {
    const i = (y * s + x) * 4;
    // BGRA, premultiplied alpha blend over what's there.
    const inv = 1 - a;
    buf[i] = Math.round(rgb[2] * a + buf[i] * inv);
    buf[i + 1] = Math.round(rgb[1] * a + buf[i + 1] * inv);
    buf[i + 2] = Math.round(rgb[0] * a + buf[i + 2] * inv);
    buf[i + 3] = Math.round(255 * a + buf[i + 3] * inv);
  };
  const cover = (fn: (x: number, y: number) => boolean, x: number, y: number) => {
    let n = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) if (fn(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4)) n++;
    return n / 16;
  };
  const inRounded = (x: number, y: number) => {
    const cx = Math.min(Math.max(x, r), s - r);
    const cy = Math.min(Math.max(y, r), s - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
  const inBar = (x: number, y: number) =>
    bars.some(([bx, y0, y1]) => {
      const cy = Math.min(Math.max(y, y0), y1);
      return (x - bx) ** 2 + (y - cy) ** 2 <= barHalf * barHalf;
    });
  const inSlash = (x: number, y: number) => Math.abs(x - y) < s * 0.07 && x > s * 0.08 && x < s * 0.92;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const a = cover(inRounded, x, y);
      if (a) put(x, y, amber, a);
      const b = cover(inBar, x, y);
      if (b) put(x, y, ink, b * (a || 1));
      if (state === 'muted') {
        const m = cover(inSlash, x, y);
        if (m) put(x, y, [0xff, 0x6a, 0x5c], m);
      }
    }
  }
  return nativeImage.createFromBitmap(buf, { width: s, height: s });
}
