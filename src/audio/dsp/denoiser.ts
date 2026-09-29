import { FFT } from './fft';

export interface DenoiseOptions {
  reductionDb: number; // how far noise-only bins are pulled down (0 = off)
  keepBreaths: boolean; // softer floor so quiet breaths and word tails survive
  reduceEcho: boolean; // also suppress the decaying tail of room reflections
}

// Spectral noise removal: STFT with √Hann windows at 50 % overlap, a per-bin noise estimate that
// tracks the quietest recent power, and a smoothed Wiener-style gain with a floor.
// Latency is one frame (frameSize samples).
export class Denoiser {
  readonly frameSize: number;
  private readonly hop: number;
  private readonly fft: FFT;
  private readonly win: Float32Array;
  private readonly inBuf: Float32Array;
  private readonly outBuf: Float32Array;
  private readonly re: Float32Array;
  private readonly im: Float32Array;
  private readonly noise: Float32Array;
  private readonly smoothPow: Float32Array;
  private readonly prevPow: Float32Array;
  private readonly gain: Float32Array;
  private readonly reverb: Float32Array;
  private inPos = 0;
  private outPos = 0;
  private frames = 0;
  private opts: DenoiseOptions = { reductionDb: 22, keepBreaths: true, reduceEcho: true };
  private readonly binHz: number;
  private readonly noiseUp: number;
  private readonly noiseDown: number;

  // Last frame's totals, for meters and the "Removing now" chips.
  noiseInDb = -120;
  noiseOutDb = -120;
  humDb = -120;
  echoAmount = 0;

  constructor(sampleRate: number, frameSize = 512) {
    this.frameSize = frameSize;
    this.hop = frameSize / 2;
    this.fft = new FFT(frameSize);
    this.win = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) this.win[i] = Math.sqrt(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / frameSize));
    this.inBuf = new Float32Array(frameSize);
    this.outBuf = new Float32Array(frameSize);
    this.re = new Float32Array(frameSize);
    this.im = new Float32Array(frameSize);
    const bins = frameSize / 2 + 1;
    this.noise = new Float32Array(bins).fill(1e-9);
    this.smoothPow = new Float32Array(bins);
    this.prevPow = new Float32Array(bins);
    this.gain = new Float32Array(bins).fill(1);
    this.reverb = new Float32Array(bins);
    this.binHz = sampleRate / frameSize;
    // Quantile tracking: the estimate rises 3 dB/s while a bin is above it and falls 9 dB/s while
    // below, settling near the bin's 25th-percentile power. A steady fan is learned in a few
    // seconds; speech, which comes and goes, barely moves it.
    const framesPerSec = sampleRate / this.hop;
    this.noiseUp = Math.pow(10, 3 / 10 / framesPerSec);
    this.noiseDown = Math.pow(10, -9 / 10 / framesPerSec);
    this.inPos = this.hop; // prime so the first hop produces a frame
  }

  setOptions(o: DenoiseOptions): void {
    this.opts = o;
  }

  // Processes in place. Output is delayed by frameSize − hop + hop = frameSize samples.
  process(buf: Float32Array): void {
    // inPos − hop and outPos move together, so a frame completes exactly when an output hop ends.
    for (let i = 0; i < buf.length; i++) {
      this.inBuf[this.inPos++] = buf[i];
      buf[i] = this.outBuf[this.outPos++];
      if (this.inPos === this.frameSize) {
        this.outBuf.copyWithin(0, this.hop);
        this.outBuf.fill(0, this.frameSize - this.hop);
        this.processFrame();
        this.inBuf.copyWithin(0, this.hop);
        this.inPos = this.hop;
        this.outPos = 0;
      }
    }
  }

  private processFrame(): void {
    const n = this.frameSize;
    const bins = n / 2 + 1;
    for (let i = 0; i < n; i++) {
      this.re[i] = this.inBuf[i] * this.win[i];
      this.im[i] = 0;
    }
    this.fft.transform(this.re, this.im);
    this.frames++;

    const floor = Math.pow(10, -(this.opts.keepBreaths ? Math.min(this.opts.reductionDb, 18) : this.opts.reductionDb) / 20);
    const active = this.opts.reductionDb > 0;
    let noiseIn = 0, noiseOut = 0, hum = 0, echo = 0, total = 0;

    for (let k = 0; k < bins; k++) {
      const p = this.re[k] * this.re[k] + this.im[k] * this.im[k];
      // Smoothed power (≈ 30 ms) keeps the gain from flickering.
      const sp = (this.smoothPow[k] = 0.7 * this.smoothPow[k] + 0.3 * p);
      if (this.frames < 8) this.noise[k] = this.frames === 1 ? sp : 0.8 * this.noise[k] + 0.2 * sp;
      else this.noise[k] *= sp > this.noise[k] ? this.noiseUp : this.noiseDown;

      // Late reverberation: a decayed copy of the previous frame's power.
      let rev = 0;
      if (this.opts.reduceEcho) {
        rev = this.reverb[k] = 0.35 * this.prevPow[k] + 0.5 * this.reverb[k];
      }
      this.prevPow[k] = p;

      let g = 1;
      if (active) {
        // 2.7× covers the quantile's bias (≈ 0.75 of the mean) plus some over-subtraction.
        const unwanted = 2.7 * this.noise[k] + rev;
        g = Math.max(floor, 1 - unwanted / (sp + 1e-12));
      }
      // Faster to open than to close, so word onsets are not clipped.
      const prev = this.gain[k];
      this.gain[k] = g > prev ? 0.35 * prev + 0.65 * g : 0.8 * prev + 0.2 * g;

      const gk = this.gain[k];
      this.re[k] *= gk;
      this.im[k] *= gk;
      if (k > 0 && k < n / 2) {
        this.re[n - k] = this.re[k];
        this.im[n - k] = -this.im[k];
      }
      noiseIn += this.noise[k];
      noiseOut += this.noise[k] * gk * gk;
      if (k * this.binHz < 300) hum += this.noise[k];
      echo += rev;
      total += sp;
    }
    this.fft.transform(this.re, this.im, true);
    for (let i = 0; i < n; i++) this.outBuf[i] += (this.re[i] / n) * this.win[i];

    // Window energy normalisation so the dB figures read as signal level.
    const norm = 2 / (n * n * 0.5);
    const toDb = (v: number) => (v > 1e-14 ? 10 * Math.log10(v * norm) : -140);
    this.noiseInDb = toDb(noiseIn);
    this.noiseOutDb = toDb(noiseOut);
    this.humDb = toDb(hum);
    this.echoAmount = total > 0 ? echo / total : 0;
  }
}
