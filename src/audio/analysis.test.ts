import { describe, expect, it } from 'vitest';
import { analyzeVoice, recommendBoost } from './analysis';

const FS = 48000;

// "Speech": 400 ms bursts of a dense multi-tone signal (12 tones per octave) whose third-octave
// levels follow the LTASS shape, with 200 ms gaps of quiet noise. `bodyTilt` changes the
// 100–250 Hz level to fake a thin mic.
const LTASS: [number, number][] = [[125, 3], [250, 6.5], [500, 5], [800, 2], [1000, 0], [2000, -4.5], [4000, -8], [5000, -9.5], [8000, -12]];
const shape = (f: number) => {
  for (let i = 1; i < LTASS.length; i++) if (f <= LTASS[i][0]) {
    const [f0, d0] = LTASS[i - 1], [f1, d1] = LTASS[i];
    return d0 + (Math.log(f / f0) / Math.log(f1 / f0)) * (d1 - d0);
  }
  return -12;
};
function fakeSpeech(seconds: number, level: number, bodyTilt = 0): Float32Array {
  const tones: [number, number][] = [];
  for (let f = 110; f < 7000; f *= Math.pow(2, 1 / 12)) tones.push([f, shape(f) + (f >= 100 && f <= 260 ? bodyTilt : 0) - 10 * Math.log10(4)]);
  const n = Math.round(seconds * FS);
  const out = new Float32Array(n);
  let seed = 3;
  for (let i = 0; i < n; i++) {
    const t = i / FS;
    const inBurst = t % 0.6 < 0.4;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const nz = ((seed / 4294967296) * 2 - 1) * 0.0005;
    let v = 0;
    if (inBurst) for (const [f, db] of tones) v += Math.pow(10, db / 20) * Math.sin(2 * Math.PI * f * t + f);
    out[i] = level * v + nz;
  }
  return out;
}

describe('analyzeVoice', () => {
  it('measures speech level and room noise separately', () => {
    const a = analyzeVoice(fakeSpeech(10, 0.01), FS);
    expect(a.speechLufs).toBeLessThan(-25);
    expect(a.speechLufs).toBeGreaterThan(-45);
    expect(a.noiseDb).toBeLessThan(-60);
    expect(a.speechSeconds).toBeGreaterThan(4);
  });

  it('asks for little correction on an even mic and adds body to a thin one', () => {
    const even = analyzeVoice(fakeSpeech(10, 0.01), FS).correction;
    expect(Math.abs(even.bodyDb)).toBeLessThan(1.5);
    const thin = analyzeVoice(fakeSpeech(10, 0.01, -8), FS).correction;
    expect(thin.bodyDb).toBeGreaterThan(even.bodyDb + 2);
  });

  it('recommends the boost that reaches the target', () => {
    expect(recommendBoost(-42)).toBe(26);
    expect(recommendBoost(-10)).toBe(0);
    expect(recommendBoost(-70)).toBe(38);
  });
});
