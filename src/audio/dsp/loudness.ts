import { Biquad } from './biquad';

// ITU-R BS.1770 loudness (K-weighted), momentary (400 ms) and short-term (3 s), plus 4× oversampled
// true peak. Mono. Feed it samples with process(); read results with report().
export class LoudnessMeter {
  private readonly pre: Biquad;
  private readonly rlb: Biquad;
  private readonly blockLen: number; // 100 ms
  private blockSum = 0;
  private blockCount = 0;
  private readonly blocks: Float64Array; // last 3 s of 100 ms mean squares
  private blockIndex = 0;
  private blocksFilled = 0;
  private readonly rawBlocks: Float64Array; // unweighted, for the noise floor
  private rawSum = 0;

  private peak = 0;
  private truePeak = 0;
  private sumSq = 0;
  private count = 0;
  private readonly hist = new Float32Array(TP_TAPS);
  private histPos = 0;

  constructor(sampleRate: number) {
    this.pre = new Biquad('peaking', 1000, sampleRate);
    this.rlb = new Biquad('highpass', 40, sampleRate);
    setKWeighting(this.pre, this.rlb, sampleRate);
    this.blockLen = Math.round(sampleRate * 0.1);
    this.blocks = new Float64Array(30);
    this.rawBlocks = new Float64Array(50);
  }

  process(input: Float32Array): void {
    for (let i = 0; i < input.length; i++) {
      const x = input[i];
      const k = this.rlb.process(this.pre.process(x));
      this.blockSum += k * k;
      this.rawSum += x * x;
      if (++this.blockCount >= this.blockLen) {
        this.blocks[this.blockIndex % 30] = this.blockSum / this.blockLen;
        this.rawBlocks[this.blockIndex % 50] = this.rawSum / this.blockLen;
        this.blockIndex++;
        this.blocksFilled = Math.min(50, this.blocksFilled + 1);
        this.blockSum = 0;
        this.rawSum = 0;
        this.blockCount = 0;
      }
      const a = Math.abs(x);
      if (a > this.peak) this.peak = a;
      this.sumSq += x * x;
      this.count++;
      // True peak: interpolate three points between each pair of samples.
      this.hist[this.histPos] = x;
      this.histPos = (this.histPos + 1) % TP_TAPS;
      if (a > this.truePeak) this.truePeak = a;
      for (let p = 1; p < 4; p++) {
        let acc = 0;
        const coeffs = TP_PHASES[p];
        for (let t = 0; t < TP_TAPS; t++) acc += coeffs[t] * this.hist[(this.histPos + t) % TP_TAPS];
        const ia = Math.abs(acc);
        if (ia > this.truePeak) this.truePeak = ia;
      }
    }
  }

  private meanOf(n: number): number {
    const have = Math.min(n, this.blockIndex);
    if (have === 0) return 0;
    let s = 0;
    for (let i = 1; i <= have; i++) s += this.blocks[(this.blockIndex - i + 30 * 10) % 30];
    return s / have;
  }

  // Unweighted level the quietest 10 % of the last 5 s sits at: the room with nobody talking.
  noiseFloorDb(): number {
    const n = Math.min(this.blocksFilled, 50);
    if (n < 5) return -120;
    const vals = Array.from(this.rawBlocks.subarray(0, n)).sort((a, b) => a - b);
    const v = vals[Math.floor(n * 0.1)];
    return v > 1e-14 ? 10 * Math.log10(v) : -140;
  }

  // Returns and resets the peak / RMS accumulators.
  report(): MeterReport {
    const m = this.meanOf(4);
    const st = this.meanOf(30);
    const rep: MeterReport = {
      momentaryLufs: m > 1e-12 ? -0.691 + 10 * Math.log10(m) : -120,
      shortTermLufs: st > 1e-12 ? -0.691 + 10 * Math.log10(st) : -120,
      peakDb: this.peak > 1e-7 ? 20 * Math.log10(this.peak) : -140,
      truePeakDb: this.truePeak > 1e-7 ? 20 * Math.log10(this.truePeak) : -140,
      rmsDb: this.count && this.sumSq > 1e-14 ? 10 * Math.log10(this.sumSq / this.count) : -140,
      noiseFloorDb: this.noiseFloorDb(),
    };
    this.peak = 0;
    this.truePeak = 0;
    this.sumSq = 0;
    this.count = 0;
    return rep;
  }
}

export interface MeterReport {
  momentaryLufs: number;
  shortTermLufs: number;
  peakDb: number;
  truePeakDb: number;
  rmsDb: number;
  noiseFloorDb: number;
}

// K-weighting filter coefficients for any sample rate (as derived in libebur128).
export function setKWeighting(pre: Biquad, rlb: Biquad, fs: number): void {
  {
    const f0 = 1681.974450955533;
    const G = 3.999843853973347;
    const Q = 0.7071752369554196;
    const K = Math.tan((Math.PI * f0) / fs);
    const Vh = Math.pow(10, G / 20);
    const Vb = Math.pow(Vh, 0.4996667741545416);
    const a0 = 1 + K / Q + K * K;
    pre.setRaw((Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0);
  }
  {
    const f0 = 38.13547087602444;
    const Q = 0.5003270373238773;
    const K = Math.tan((Math.PI * f0) / fs);
    const a0 = 1 + K / Q + K * K;
    rlb.setRaw(1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0);
  }
}

// 4× polyphase interpolator: 12 taps per phase, Kaiser-windowed sinc.
const TP_TAPS = 12;
const TP_PHASES: Float32Array[] = (() => {
  const phases: Float32Array[] = [];
  const L = 4;
  const N = TP_TAPS * L;
  const beta = 6;
  const i0 = (x: number) => {
    let s = 1, t = 1;
    for (let k = 1; k < 20; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; }
    return s;
  };
  for (let p = 0; p < L; p++) {
    const c = new Float32Array(TP_TAPS);
    let sum = 0;
    for (let t = 0; t < TP_TAPS; t++) {
      const n = t * L + (L - p) % L; // tap position in the long filter
      const m = n - (N - 1) / 2;
      const x = m / L;
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      const r = (2 * n) / (N - 1) - 1;
      const w = i0(beta * Math.sqrt(Math.max(0, 1 - r * r))) / i0(beta);
      c[t] = sinc * w;
      sum += c[t];
    }
    for (let t = 0; t < TP_TAPS; t++) c[t] /= sum;
    phases.push(c);
  }
  return phases;
})();
