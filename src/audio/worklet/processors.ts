// AudioWorklet processors for the voice chain. Bundled by Vite as a separate module
// (see engine.ts: `?worker&url`) and loaded with audioWorklet.addModule().
import { Denoiser, DenoiseOptions } from '../dsp/denoiser';
import { DeEsser, Declicker } from '../dsp/cleanup';
import { Leveler, LevelerOptions, Limiter } from '../dsp/dynamics';
import { LoudnessMeter } from '../dsp/loudness';

declare const sampleRate: number;
declare const currentTime: number;
declare function registerProcessor(name: string, ctor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: unknown);
}

const REPORT_EVERY_S = 0.05;

function mono(inputs: Float32Array[][], outputs: Float32Array[][]): Float32Array | null {
  const input = inputs[0];
  const out = outputs[0];
  if (!out || !out[0]) return null;
  const o = out[0];
  if (input && input[0]) o.set(input[0]);
  else o.fill(0);
  return o;
}

function copyToOtherChannels(outputs: Float32Array[][]) {
  const out = outputs[0];
  for (let c = 1; c < out.length; c++) out[c].set(out[0]);
}

class DenoiseProcessor extends AudioWorkletProcessor {
  private denoiser: Denoiser;
  private enabled = true;
  private lastReport = 0;

  constructor(options: { processorOptions?: { frameSize?: number } }) {
    super();
    this.denoiser = new Denoiser(sampleRate, options?.processorOptions?.frameSize ?? 512);
    this.port.onmessage = (e: MessageEvent) => {
      const d = e.data as { enabled: boolean } & DenoiseOptions;
      this.enabled = d.enabled;
      this.denoiser.setOptions({ ...d, reductionDb: d.enabled ? d.reductionDb : 0 });
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const o = mono(inputs, outputs);
    if (!o) return true;
    // Runs even when off (reduction 0) so the delay, and so lip-sync, stays constant.
    this.denoiser.process(o);
    copyToOtherChannels(outputs);
    if (currentTime - this.lastReport > REPORT_EVERY_S) {
      this.lastReport = currentTime;
      const d = this.denoiser;
      this.port.postMessage({ noiseInDb: d.noiseInDb, noiseOutDb: this.enabled ? d.noiseOutDb : d.noiseInDb, humDb: d.humDb, echo: d.echoAmount });
    }
    return true;
  }
}

class DeclickProcessor extends AudioWorkletProcessor {
  private dc = new Declicker(sampleRate);
  private lastReport = 0;
  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      this.dc.pops = !!e.data.pops;
      this.dc.clicks = !!e.data.clicks;
    };
  }
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const o = mono(inputs, outputs);
    if (!o) return true;
    this.dc.process(o);
    copyToOtherChannels(outputs);
    if (currentTime - this.lastReport > 1) {
      this.lastReport = currentTime;
      this.port.postMessage({ pops: this.dc.popsRemoved, clicks: this.dc.clicksRemoved });
    }
    return true;
  }
}

class DeEssProcessor extends AudioWorkletProcessor {
  private ds = new DeEsser(sampleRate);
  private lastReport = 0;
  private worst = 0;
  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      this.ds.enabled = !!e.data.enabled;
      this.ds.reductionDb = e.data.reductionDb;
      if (e.data.freq !== this.ds.freq) this.ds.setFreq(e.data.freq);
    };
  }
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const o = mono(inputs, outputs);
    if (!o) return true;
    this.ds.process(o);
    copyToOtherChannels(outputs);
    this.worst = Math.min(this.worst, this.ds.reductionNowDb);
    if (currentTime - this.lastReport > REPORT_EVERY_S) {
      this.lastReport = currentTime;
      this.port.postMessage({ reductionDb: this.worst });
      this.worst = 0;
    }
    return true;
  }
}

// Voice Boost & leveler → limiter, with the output meter.
class DynamicsProcessor extends AudioWorkletProcessor {
  private leveler = new Leveler(sampleRate);
  private limiter = new Limiter(sampleRate);
  private meter = new LoudnessMeter(sampleRate);
  private lastReport = 0;
  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      const d = e.data as LevelerOptions & { limiterOn: boolean; ceilingDb: number };
      this.leveler.setOptions(d);
      this.limiter.enabled = d.limiterOn;
      this.limiter.ceilingDb = d.ceilingDb;
    };
  }
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const o = mono(inputs, outputs);
    if (!o) return true;
    this.leveler.process(o);
    this.limiter.process(o);
    this.meter.process(o);
    copyToOtherChannels(outputs);
    if (currentTime - this.lastReport > REPORT_EVERY_S) {
      this.lastReport = currentTime;
      this.port.postMessage({ ...this.meter.report(), gainDb: this.leveler.gainDb, limiterDb: this.limiter.reductionDb });
    }
    return true;
  }
}

// Pass-through meter, used on the raw mic.
class MeterProcessor extends AudioWorkletProcessor {
  private meter = new LoudnessMeter(sampleRate);
  private lastReport = 0;
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const o = mono(inputs, outputs);
    if (!o) return true;
    this.meter.process(o);
    copyToOtherChannels(outputs);
    if (currentTime - this.lastReport > REPORT_EVERY_S) {
      this.lastReport = currentTime;
      this.port.postMessage(this.meter.report());
    }
    return true;
  }
}

// Collects raw samples for Test my sound and the voice check. Starts on {record: seconds}.
class RecorderProcessor extends AudioWorkletProcessor {
  private buf: Float32Array | null = null;
  private pos = 0;
  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data.record) {
        this.buf = new Float32Array(Math.round(e.data.record * sampleRate));
        this.pos = 0;
      } else if (e.data.cancel) {
        this.buf = null;
      }
    };
  }
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const o = mono(inputs, outputs);
    if (!o) return true;
    copyToOtherChannels(outputs);
    if (this.buf) {
      const n = Math.min(o.length, this.buf.length - this.pos);
      this.buf.set(o.subarray(0, n), this.pos);
      this.pos += n;
      if (this.pos >= this.buf.length) {
        const done = this.buf;
        this.buf = null;
        this.port.postMessage({ samples: done, sampleRate }, [done.buffer]);
      } else if (currentTime % 0.1 < 128 / sampleRate) {
        this.port.postMessage({ progress: this.pos / this.buf.length });
      }
    }
    return true;
  }
}

registerProcessor('aurel-denoise', DenoiseProcessor);
registerProcessor('aurel-declick', DeclickProcessor);
registerProcessor('aurel-deess', DeEssProcessor);
registerProcessor('aurel-dynamics', DynamicsProcessor);
registerProcessor('aurel-meter', MeterProcessor);
registerProcessor('aurel-recorder', RecorderProcessor);
