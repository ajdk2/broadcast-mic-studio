import { Biquad } from './dsp/biquad';
import { FFT } from './dsp/fft';
import { setKWeighting } from './dsp/loudness';

export interface VoiceAnalysis {
  speechLufs: number; // loudness while talking (gated, like BS.1770 integrated)
  noiseDb: number; // room level between words, dBFS
  peakDb: number;
  speechSeconds: number;
  correction: { bodyDb: number; boxinessDb: number; harshnessDb: number };
  notes: string[]; // plain-language findings for the mic card
}

// Long-term average speech spectrum relative to 1 kHz, from Byrne et al. (1994), averaged over
// male and female talkers. Used as "what an even mic would hear".
const LTASS: [number, number][] = [
  [125, 3], [160, 5], [200, 6], [250, 6.5], [315, 6], [400, 5.5], [500, 5], [630, 4], [800, 2],
  [1000, 0], [1250, -1.5], [1600, -3], [2000, -4.5], [2500, -6], [3150, -7], [4000, -8], [5000, -9.5],
];
const ltass = (f: number) => {
  for (let i = 1; i < LTASS.length; i++) {
    if (f <= LTASS[i][0]) {
      const [f0, d0] = LTASS[i - 1];
      const [f1, d1] = LTASS[i];
      const t = Math.log(f / f0) / Math.log(f1 / f0);
      return d0 + t * (d1 - d0);
    }
  }
  return LTASS[LTASS.length - 1][1];
};

export function analyzeVoice(samples: Float32Array, sampleRate: number): VoiceAnalysis {
  // 1. K-weighted loudness per 400 ms block (75 % overlap), gated at −70 LUFS absolute and
  //    10 LU below the ungated mean, as in BS.1770.
  const pre = new Biquad('peaking', 1000, sampleRate);
  const rlb = new Biquad('highpass', 40, sampleRate);
  setKWeighting(pre, rlb, sampleRate);
  const k = new Float32Array(samples.length);
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    k[i] = rlb.process(pre.process(samples[i]));
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const block = Math.round(sampleRate * 0.4);
  const hop = Math.round(block / 4);
  const blocks: { ms: number; raw: number; start: number }[] = [];
  for (let start = 0; start + block <= samples.length; start += hop) {
    let s = 0, r = 0;
    for (let i = start; i < start + block; i++) { s += k[i] * k[i]; r += samples[i] * samples[i]; }
    blocks.push({ ms: s / block, raw: r / block, start });
  }
  const lufs = (ms: number) => (ms > 1e-12 ? -0.691 + 10 * Math.log10(ms) : -120);
  const abs = blocks.filter((b) => lufs(b.ms) > -70);
  const mean = abs.length ? abs.reduce((a, b) => a + b.ms, 0) / abs.length : 0;
  const speech = abs.filter((b) => lufs(b.ms) > lufs(mean) - 10);
  const speechMs = speech.length ? speech.reduce((a, b) => a + b.ms, 0) / speech.length : 0;

  // 2. Room noise: the quietest 10 % of 50 ms windows (short enough to fit between words).
  const nb = Math.round(sampleRate * 0.05);
  const short: number[] = [];
  for (let start = 0; start + nb <= samples.length; start += nb) {
    let r = 0;
    for (let i = start; i < start + nb; i++) r += samples[i] * samples[i];
    short.push(r / nb);
  }
  short.sort((a, b) => a - b);
  const q = short.length ? short[Math.floor(short.length * 0.1)] : 0;
  const noiseDb = q > 1e-14 ? 10 * Math.log10(q) : -120;

  // 3. Spectrum of the speech parts, compared with LTASS in three bands.
  const n = 4096;
  const fft = new FFT(n);
  const win = new Float32Array(n);
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
  const avg = new Float64Array(n / 2);
  let frames = 0;
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  const speechStarts = new Set(speech.map((b) => Math.floor(b.start / hop)));
  for (let start = 0; start + n <= samples.length; start += n / 2) {
    if (!speechStarts.has(Math.floor(start / hop))) continue;
    for (let i = 0; i < n; i++) { re[i] = samples[start + i] * win[i]; im[i] = 0; }
    fft.transform(re, im);
    for (let b = 0; b < n / 2; b++) avg[b] += re[b] * re[b] + im[b] * im[b];
    frames++;
  }
  const binHz = sampleRate / n;
  // Level per third-octave inside a band, so it compares directly with LTASS's third-octave levels.
  const thirds = (lo: number, hi: number) => 3 * Math.log2(hi / lo);
  const bandDb = (lo: number, hi: number) => {
    let s = 0;
    for (let b = Math.ceil(lo / binHz); b <= Math.floor(hi / binHz); b++) s += avg[b];
    return s > 0 ? 10 * Math.log10(s / thirds(lo, hi)) : -200;
  };
  const refBand = (lo: number, hi: number) => {
    let s = 0, c = 0;
    for (let f = lo * Math.pow(2, 1 / 6); f < hi; f *= Math.pow(2, 1 / 3)) { s += Math.pow(10, ltass(f) / 10); c++; }
    return 10 * Math.log10(s / Math.max(1, c));
  };
  let correction = { bodyDb: 0, boxinessDb: 0, harshnessDb: 0 };
  const notes: string[] = [];
  if (frames >= 3) {
    const ref = bandDb(800, 1600) - refBand(800, 1600);
    const dev = (lo: number, hi: number) => bandDb(lo, hi) - ref - refBand(lo, hi);
    const clamp = (v: number, lo: number, hi: number) => Math.round(Math.max(lo, Math.min(hi, v)) * 10) / 10;
    // Correct about 60 % of the measured difference; a short clip is an estimate, not a lab test.
    correction = {
      bodyDb: clamp(-0.6 * dev(100, 250), -4, 4),
      boxinessDb: clamp(-0.6 * dev(500, 800), -4, 1),
      harshnessDb: clamp(-0.6 * dev(3000, 5000), -4, 2),
    };
    if (correction.bodyDb > 0.5) notes.push('adds body');
    if (correction.bodyDb < -0.5) notes.push('tames boominess');
    if (correction.boxinessDb < -0.5) notes.push('tames boxiness');
    if (correction.harshnessDb < -0.5) notes.push('softens harshness');
    if (correction.harshnessDb > 0.5) notes.push('adds clarity');
  }

  return {
    speechLufs: lufs(speechMs),
    noiseDb,
    peakDb: peak > 1e-7 ? 20 * Math.log10(peak) : -140,
    speechSeconds: (speech.length * hop) / sampleRate,
    correction,
    notes,
  };
}

export function describeLevel(lufs: number): { label: string; tone: 'ok' | 'warn' | 'error' } {
  if (lufs < -50) return { label: 'Very soft', tone: 'warn' };
  if (lufs < -30) return { label: 'Soft', tone: 'warn' };
  if (lufs < -20) return { label: 'Good level', tone: 'ok' };
  if (lufs < -10) return { label: 'Loud', tone: 'ok' };
  return { label: 'Too hot', tone: 'error' };
}

export function describeRoom(db: number): { label: string; tone: 'ok' | 'warn' | 'error'; text: string } {
  if (db < -65) return { label: 'Quiet room', tone: 'ok', text: 'Light noise removal is enough; Balanced will make it silent.' };
  if (db < -50) return { label: 'Some noise', tone: 'warn', text: 'Steady background noise. Balanced noise removal will handle it.' };
  return { label: 'Noisy room', tone: 'error', text: 'A lot of background noise. Strong noise removal is recommended.' };
}

// Voice Boost that brings this speech level to the target, within the slider's range.
export function recommendBoost(speechLufs: number, targetLufs = -16): number {
  return Math.round(Math.max(0, Math.min(38, targetLufs - speechLufs)));
}
