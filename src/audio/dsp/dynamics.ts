import { Biquad, dbToGain, gainToDb, timeCoef } from './biquad';
import { setKWeighting } from './loudness';

export interface LevelerOptions {
  boostDb: number; // Voice Boost: fixed clean gain
  levelerOn: boolean; // "Auto-level when I lean away"
  targetLufs: number;
  maxLiftDb: number; // total gain never goes above this (or the boost, if higher)
  attackS: number;
  releaseS: number;
}

// Voice Boost & leveler. The boost is applied as set. With the leveler on, a slow correction of up
// to ±6 dB moves speech toward the target loudness, measured K-weighted over 400 ms and only while
// someone is talking, so pauses don't pump the room up.
export class Leveler {
  private opts: LevelerOptions = { boostDb: 26, levelerOn: true, targetLufs: -16, maxLiftDb: 30, attackS: 1.2, releaseS: 3 };
  private readonly pre: Biquad;
  private readonly rlb: Biquad;
  private ms = 0;
  private readonly msC: number;
  private corrDb = 0;
  private gainNow = 1;
  private readonly sampleRate: number;
  private readonly smoothC: number;
  static readonly RANGE_DB = 6;

  gainDb = 0; // current total gain, for the meter

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.pre = new Biquad('peaking', 1000, sampleRate);
    this.rlb = new Biquad('highpass', 40, sampleRate);
    setKWeighting(this.pre, this.rlb, sampleRate);
    this.msC = timeCoef(0.4, sampleRate);
    this.smoothC = timeCoef(0.02, sampleRate);
  }

  setOptions(o: LevelerOptions): void {
    this.opts = o;
    if (!o.levelerOn) this.corrDb = 0;
  }

  process(buf: Float32Array): void {
    const o = this.opts;
    const n = buf.length;
    // Measure the block before gain.
    for (let i = 0; i < n; i++) {
      const k = this.rlb.process(this.pre.process(buf[i]));
      this.ms = k * k + this.msC * (this.ms - k * k);
    }
    if (o.levelerOn) {
      const loud = this.ms > 1e-12 ? -0.691 + 10 * Math.log10(this.ms) : -120;
      const withBoost = loud + o.boostDb;
      const speaking = loud > -60 && withBoost > o.targetLufs - 20;
      if (speaking) {
        const want = Math.max(-Leveler.RANGE_DB, Math.min(Leveler.RANGE_DB, o.targetLufs - withBoost));
        const tau = want < this.corrDb ? o.attackS : o.releaseS;
        const c = Math.exp(-n / (tau * this.sampleRate));
        this.corrDb = want + c * (this.corrDb - want);
      }
    }
    const cap = Math.max(o.boostDb, o.maxLiftDb);
    const total = Math.min(cap, o.boostDb + this.corrDb);
    const target = dbToGain(total);
    for (let i = 0; i < n; i++) {
      this.gainNow = target + this.smoothC * (this.gainNow - target);
      buf[i] *= this.gainNow;
    }
    this.gainDb = gainToDb(this.gainNow);
  }
}

// Lookahead brickwall limiter. The gain reaches its lowest value by the time the loudest sample in
// the lookahead window comes out, so nothing passes the ceiling. Aims 0.3 dB under the ceiling to
// leave room for inter-sample peaks.
export class Limiter {
  ceilingDb = -1;
  enabled = true;
  readonly latency: number;
  private readonly delay: Float32Array;
  private readonly peaks: Float32Array; // required gain per sample in the window
  private pos = 0;
  private g = 1;
  private readonly relC: number;
  reductionDb = 0;

  constructor(sampleRate: number) {
    this.latency = Math.max(1, Math.round(sampleRate * 0.0015));
    this.delay = new Float32Array(this.latency);
    this.peaks = new Float32Array(this.latency).fill(1);
    this.relC = timeCoef(0.06, sampleRate);
  }

  process(buf: Float32Array): void {
    const ceil = dbToGain(this.ceilingDb - 0.3);
    const L = this.latency;
    let minG = 1;
    for (let i = 0; i < buf.length; i++) {
      const x = buf[i];
      const a = Math.abs(x);
      this.peaks[this.pos] = this.enabled && a > ceil ? ceil / a : 1;
      const out = this.delay[this.pos];
      this.delay[this.pos] = x;
      this.pos = (this.pos + 1) % L;

      let need = 1;
      for (let j = 0; j < L; j++) if (this.peaks[j] < need) need = this.peaks[j];
      if (need < this.g) {
        // A linear ramp of (1 − need) / L per sample reaches `need` within L samples, i.e. before
        // the sample that needs it leaves the delay line.
        this.g = Math.max(need, this.g - (1 - need) / L);
      } else {
        this.g = need + this.relC * (this.g - need);
      }
      // Hard safety: the delayed sample must be under the ceiling.
      let y = out * this.g;
      if (this.enabled && Math.abs(y) > ceil) y = Math.sign(y) * ceil;
      buf[i] = y;
      if (this.g < minG) minG = this.g;
    }
    this.reductionDb = gainToDb(minG);
  }
}
