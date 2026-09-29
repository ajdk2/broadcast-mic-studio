import { describe, expect, it } from 'vitest';
import { FFT } from './fft';
import { Denoiser } from './denoiser';
import { LoudnessMeter } from './loudness';
import { Leveler, Limiter } from './dynamics';
import { DeEsser, Declicker } from './cleanup';

const FS = 48000;

function sine(freq: number, amp: number, seconds: number, phase = 0): Float32Array {
  const n = Math.round(seconds * FS);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / FS + phase);
  return out;
}

// Deterministic white noise.
function noise(amp: number, seconds: number, seed = 1): Float32Array {
  const n = Math.round(seconds * FS);
  const out = new Float32Array(n);
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out[i] = amp * ((s / 4294967296) * 2 - 1);
  }
  return out;
}

const rmsDb = (b: Float32Array, from = 0, to = b.length) => {
  let s = 0;
  for (let i = from; i < to; i++) s += b[i] * b[i];
  return 10 * Math.log10(s / (to - from));
};

function runBlocks(buf: Float32Array, fn: (b: Float32Array) => void, block = 128) {
  for (let i = 0; i < buf.length; i += block) fn(buf.subarray(i, Math.min(buf.length, i + block)));
}

describe('FFT', () => {
  it('round-trips a signal', () => {
    const fft = new FFT(256);
    const re = new Float32Array(256);
    const im = new Float32Array(256);
    for (let i = 0; i < 256; i++) re[i] = Math.sin(i * 0.3) + 0.2 * Math.cos(i * 1.7);
    const orig = re.slice();
    fft.transform(re, im);
    fft.transform(re, im, true);
    for (let i = 0; i < 256; i++) expect(re[i] / 256).toBeCloseTo(orig[i], 4);
  });
});

describe('Denoiser', () => {
  it('passes audio through unchanged (delayed one frame) when reduction is 0', () => {
    const d = new Denoiser(FS, 512);
    d.setOptions({ reductionDb: 0, keepBreaths: false, reduceEcho: false });
    const input = sine(440, 0.3, 0.5);
    const out = input.slice();
    runBlocks(out, (b) => d.process(b));
    for (let i = 4000; i < 4100; i++) expect(out[i]).toBeCloseTo(input[i - 512], 3);
  });

  it('pulls steady noise down and keeps a tone', () => {
    const d = new Denoiser(FS, 512);
    d.setOptions({ reductionDb: 22, keepBreaths: false, reduceEcho: false });
    const nz = noise(0.01, 6);
    const buf = nz.slice();
    runBlocks(buf, (b) => d.process(b));
    const before = rmsDb(nz, FS * 4, FS * 6);
    const after = rmsDb(buf, FS * 4, FS * 6);
    expect(before - after).toBeGreaterThan(12);

    const tone = sine(1000, 0.2, 1);
    const mix = new Float32Array(tone.length);
    const nz2 = noise(0.01, 1, 7);
    for (let i = 0; i < mix.length; i++) mix[i] = tone[i] + nz2[i];
    runBlocks(mix, (b) => d.process(b));
    expect(Math.abs(rmsDb(mix, FS * 0.5, FS) - rmsDb(tone, FS * 0.5, FS))).toBeLessThan(1.5);
  });
});

describe('LoudnessMeter', () => {
  it('reads a −20 dBFS 1 kHz sine as about −23 LUFS', () => {
    const m = new LoudnessMeter(FS);
    m.process(sine(1000, 0.1, 1));
    expect(m.report().momentaryLufs).toBeGreaterThan(-23.4);
    const m2 = new LoudnessMeter(FS);
    m2.process(sine(1000, 0.1, 1));
    expect(m2.report().momentaryLufs).toBeLessThan(-22.6);
  });

  it('finds the true peak between samples', () => {
    const m = new LoudnessMeter(FS);
    m.process(sine(FS / 4, 1, 0.1, Math.PI / 4));
    const r = m.report();
    expect(r.peakDb).toBeLessThan(-2.5);
    expect(r.truePeakDb).toBeGreaterThan(-0.6);
  });
});

describe('Limiter', () => {
  it('never lets a sample past the ceiling', () => {
    const l = new Limiter(FS);
    l.ceilingDb = -1;
    const buf = sine(200, 2, 0.5);
    runBlocks(buf, (b) => l.process(b));
    let max = 0;
    for (const v of buf) max = Math.max(max, Math.abs(v));
    expect(20 * Math.log10(max)).toBeLessThanOrEqual(-1);
  });
});

describe('Leveler', () => {
  it('moves quiet speech toward the target within ±6 dB', () => {
    const lv = new Leveler(FS);
    lv.setOptions({ boostDb: 20, levelerOn: true, targetLufs: -16, maxLiftDb: 30, attackS: 0.3, releaseS: 0.5 });
    const buf = sine(1000, 0.00707, 6); // ≈ −46 LUFS; +20 dB boost leaves it 10 dB short
    runBlocks(buf, (b) => lv.process(b));
    expect(lv.gainDb).toBeGreaterThan(25.5);
    expect(lv.gainDb).toBeLessThan(26.1);
  });

  it('applies only the boost when auto-level is off', () => {
    const lv = new Leveler(FS);
    lv.setOptions({ boostDb: 12, levelerOn: false, targetLufs: -16, maxLiftDb: 30, attackS: 1, releaseS: 1 });
    const buf = sine(1000, 0.01, 1);
    runBlocks(buf, (b) => lv.process(b));
    expect(lv.gainDb).toBeCloseTo(12, 1);
  });
});

describe('DeEsser', () => {
  it('turns down sibilance but not a low tone', () => {
    const ds = new DeEsser(FS);
    ds.reductionDb = -6;
    const s = sine(8000, 0.2, 0.5);
    const orig = s.slice();
    runBlocks(s, (b) => ds.process(b));
    expect(rmsDb(orig, FS * 0.25, FS * 0.5) - rmsDb(s, FS * 0.25, FS * 0.5)).toBeGreaterThan(3);

    const ds2 = new DeEsser(FS);
    const low = sine(300, 0.2, 0.5);
    const lowOrig = low.slice();
    runBlocks(low, (b) => ds2.process(b));
    expect(Math.abs(rmsDb(lowOrig, FS * 0.25, FS * 0.5) - rmsDb(low, FS * 0.25, FS * 0.5))).toBeLessThan(0.3);
  });
});

describe('Declicker', () => {
  it('softens a mouth click and leaves steady speech alone', () => {
    const dc = new Declicker(FS);
    const buf = sine(220, 0.1, 0.5);
    const clean = buf.slice();
    const at = 12000;
    for (let i = 0; i < 24; i++) buf[at + i] += (i % 2 ? -1 : 1) * 0.5;
    runBlocks(buf, (b) => dc.process(b));
    const L = dc.latency;
    let clickPeak = 0;
    for (let i = at; i < at + 24; i++) clickPeak = Math.max(clickPeak, Math.abs(buf[i + L] - clean[i]));
    expect(clickPeak).toBeLessThan(0.3);
    // Far from the click the output is just the delayed input.
    for (let i = 20000; i < 20050; i++) expect(buf[i + L]).toBeCloseTo(clean[i], 2);
    expect(dc.clicksRemoved).toBeGreaterThan(0);
  });
});
