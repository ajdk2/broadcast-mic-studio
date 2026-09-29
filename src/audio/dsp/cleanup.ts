import { Biquad, dbToGain, timeCoef } from './biquad';

// Pop removal: when the band below 150 Hz suddenly jumps well above its recent level (a "p" or "b"
// hitting the capsule), pull that band down for a moment. Mouth-click removal: very short
// high-frequency spikes far above the local high-band level are softened.
// Both run on a 1.5 ms lookahead so the gain is already down when the transient arrives.
export class Declicker {
  pops = true;
  clicks = true;
  readonly latency: number;

  private readonly lowSplit: Biquad;
  private readonly highSplit: Biquad;
  private readonly delay: Float32Array;
  private readonly lowDelay: Float32Array;
  private readonly highDelay: Float32Array;
  private pos = 0;
  private lowFast = 0;
  private lowSlow = 0;
  private popGain = 1;
  private highRms = 1e-6;
  private clickHold = 0;
  private clickGain = 1;
  private readonly fastC: number;
  private readonly slowC: number;
  private readonly popRelease: number;
  private readonly rmsC: number;
  private readonly clickRelease: number;
  private readonly holdLen: number;

  popsRemoved = 0;
  clicksRemoved = 0;

  constructor(sampleRate: number) {
    this.latency = Math.round(sampleRate * 0.0015);
    this.lowSplit = new Biquad('lowpass', 150, sampleRate, 0.7071);
    this.highSplit = new Biquad('highpass', 3000, sampleRate, 0.7071);
    this.delay = new Float32Array(this.latency);
    this.lowDelay = new Float32Array(this.latency);
    this.highDelay = new Float32Array(this.latency);
    this.fastC = timeCoef(0.004, sampleRate);
    this.slowC = timeCoef(0.3, sampleRate);
    this.popRelease = timeCoef(0.12, sampleRate);
    this.rmsC = timeCoef(0.05, sampleRate);
    this.clickRelease = timeCoef(0.004, sampleRate);
    this.holdLen = Math.round(sampleRate * 0.002);
  }

  process(buf: Float32Array): void {
    const popFloor = dbToGain(-12);
    const clickFloor = dbToGain(-14);
    for (let i = 0; i < buf.length; i++) {
      const x = buf[i];
      const low = this.lowSplit.process(x);
      const high = this.highSplit.process(x);

      // Pop detector (looks at the undelayed signal).
      const la = Math.abs(low);
      this.lowFast = la + this.fastC * (this.lowFast - la);
      this.lowSlow = la + this.slowC * (this.lowSlow - la);
      if (this.pops && this.lowFast > 0.02 && this.lowFast > 4 * this.lowSlow + 1e-4) {
        if (this.popGain > 0.9) this.popsRemoved++;
        this.popGain = popFloor;
      } else {
        this.popGain = 1 + this.popRelease * (this.popGain - 1);
      }

      // Click detector: a high-band sample far above the high band's running RMS.
      const h2 = high * high;
      const spike = this.clicks && Math.abs(high) > 7 * Math.sqrt(this.highRms) && Math.abs(high) > 0.01;
      if (spike) {
        if (this.clickHold === 0) this.clicksRemoved++;
        this.clickHold = this.holdLen;
      } else {
        // Keep the RMS estimate from being inflated by the click itself.
        this.highRms = h2 + this.rmsC * (this.highRms - h2);
      }
      if (this.clickHold > 0) {
        this.clickHold--;
        this.clickGain = clickFloor;
      } else {
        this.clickGain = 1 + this.clickRelease * (this.clickGain - 1);
      }

      const d = this.delay[this.pos];
      const dl = this.lowDelay[this.pos];
      const dh = this.highDelay[this.pos];
      this.delay[this.pos] = x;
      this.lowDelay[this.pos] = low;
      this.highDelay[this.pos] = high;
      this.pos = (this.pos + 1) % this.latency;

      buf[i] = d - dl * (1 - this.popGain) - dh * (1 - this.clickGain);
    }
  }
}

// Dynamic de-esser: splits off the band above the "s" frequency and turns only that band down while
// sibilance is louder than the rest of the voice, by at most reductionDb.
export class DeEsser {
  freq = 6500;
  reductionDb = -4;
  enabled = true;
  private readonly split: Biquad;
  private readonly sampleRate: number;
  private bandEnv = 0;
  private fullEnv = 0;
  private g = 1;
  private readonly envC: number;
  private readonly attC: number;
  private readonly relC: number;
  reductionNowDb = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.split = new Biquad('lowpass', this.freq * 0.75, sampleRate, 0.7071);
    this.envC = timeCoef(0.005, sampleRate);
    this.attC = timeCoef(0.002, sampleRate);
    this.relC = timeCoef(0.06, sampleRate);
  }

  setFreq(freq: number): void {
    this.freq = freq;
    this.split.set('lowpass', freq * 0.75, this.sampleRate, 0.7071);
  }

  process(buf: Float32Array): void {
    const minG = dbToGain(Math.min(0, this.reductionDb));
    let minSeen = 1;
    for (let i = 0; i < buf.length; i++) {
      const x = buf[i];
      // Complementary split: low + hi always adds back up to x, so g = 1 is exactly transparent.
      const lo = this.split.process(x);
      const hi = x - lo;
      const ha = Math.abs(hi);
      const xa = Math.abs(x);
      this.bandEnv = ha + this.envC * (this.bandEnv - ha);
      this.fullEnv = xa + this.envC * (this.fullEnv - xa);
      let target = 1;
      if (this.enabled && this.bandEnv > 0.003) {
        // Sibilance: the top band carries more than ~45 % of the level.
        const ratio = this.bandEnv / (this.fullEnv + 1e-9);
        if (ratio > 0.45) target = Math.max(minG, 0.45 / ratio);
      }
      this.g = target < this.g ? target + this.attC * (this.g - target) : target + this.relC * (this.g - target);
      if (this.g < minSeen) minSeen = this.g;
      buf[i] = lo + hi * this.g;
    }
    this.reductionNowDb = 20 * Math.log10(minSeen);
  }
}
