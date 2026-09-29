import React, { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';

// 12 s of raw vs. enhanced peaks, drawn as mirrored bars (board 01 · Live voice). Heights use one
// dB scale for both, so the enhanced bars really are louder when Aurel lifts your voice.
export function Waveform({ height = 220, bars = 140, emphasis = 'out', fill }: { height?: number; bars?: number; emphasis?: 'raw' | 'out'; fill?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 33) return; // ~30 fps is plenty for 50 ms data
      last = t;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const css = getComputedStyle(canvas);
      const rawColor = css.getPropertyValue('--meter-raw').trim() || '#9EA1A8';
      const outColor = css.getPropertyValue('--accent').trim() || '#F5A623';
      const mid = h / 2;
      const step = w / bars;
      const lw = Math.max(2, Math.min(4.5, step * 0.56));
      const toH = (lin: number) => {
        const db = lin > 1e-6 ? 20 * Math.log10(lin) : -120;
        return Math.max(1.2, ((db + 60) / 60) * (mid - 2));
      };
      const sample = (arr: Float32Array, i: number) => {
        const a = Math.floor((i / bars) * arr.length);
        const b = Math.max(a + 1, Math.floor(((i + 1) / bars) * arr.length));
        let mx = 0;
        for (let j = a; j < b && j < arr.length; j++) mx = Math.max(mx, arr[j]);
        return mx;
      };
      ctx.lineCap = 'round';
      ctx.lineWidth = lw;
      const pass = (arr: Float32Array, color: string, alpha: number) => {
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < bars; i++) {
          const x = step * i + step / 2;
          const hh = toH(sample(arr, i));
          ctx.moveTo(x, mid - hh);
          ctx.lineTo(x, mid + hh);
        }
        ctx.stroke();
      };
      // Enhanced behind, raw in front (raw is usually smaller).
      pass(engine.outHistory, outColor, emphasis === 'out' ? 1 : 0.18);
      pass(engine.rawHistory, emphasis === 'raw' ? css.getPropertyValue('--text-primary').trim() : rawColor, 1);
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bars, emphasis]);
  return <canvas ref={ref} role="img" aria-label="Live waveform of your raw mic and the enhanced voice over the last 12 seconds" style={fill ? { width: '100%', flex: '1 1 0', minHeight: 120, display: 'block' } : { width: '100%', height, display: 'block' }} />;
}
