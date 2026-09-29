import processorsUrl from './worklet/processors.ts?worker&url';
import {
  LEVELING_SPEEDS,
  LiveControls,
  VoiceSettings,
  WarmthCharacter,
  effectiveBands,
  micCorrectionBands,
  noiseReductionDb,
} from '../voice/model';

export type Quality = 'light' | 'balanced' | 'best';
export const FRAME_SIZE: Record<Quality, number> = { light: 256, balanced: 512, best: 1024 };

const loaded = new WeakSet<BaseAudioContext>();
export async function loadWorklets(ctx: BaseAudioContext): Promise<void> {
  if (loaded.has(ctx)) return;
  await ctx.audioWorklet.addModule(processorsUrl);
  loaded.add(ctx);
}

function mono(node: AudioNode): AudioNode {
  node.channelCount = 1;
  node.channelCountMode = 'explicit';
  node.channelInterpretation = 'speakers';
  return node;
}

function worklet(ctx: BaseAudioContext, name: string, processorOptions?: object): AudioWorkletNode {
  return mono(new AudioWorkletNode(ctx, name, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], processorOptions })) as AudioWorkletNode;
}

// Soft-saturation curves with a slope of 1 at zero, so quiet speech passes unchanged and only the
// loud peaks are rounded off: richness without audible distortion. Drive 0–100 % sets how hard.
export function warmthCurve(character: WarmthCharacter, drive: number): Float32Array<ArrayBuffer> {
  const n = 2049;
  const curve = new Float32Array(n);
  const k = 1 + (drive / 100) * 4;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    let y: number;
    switch (character) {
      case 'tube': // asymmetric, adds some even harmonics
        y = Math.tanh(k * (x + 0.1 * x * x)) / k;
        break;
      case 'console': // gentle rational knee
        y = x / (1 + ((k - 1) / 4) * Math.abs(x));
        break;
      default: // tape: symmetric tanh
        y = Math.tanh(k * x) / k;
    }
    curve[i] = y;
  }
  return curve;
}

export interface ChainMeters {
  onOutput?: (d: OutputReport) => void;
  onNoise?: (d: { noiseInDb: number; noiseOutDb: number; humDb: number; echo: number }) => void;
  onDeEss?: (d: { reductionDb: number }) => void;
  onDeclick?: (d: { pops: number; clicks: number }) => void;
}

export interface OutputReport {
  momentaryLufs: number;
  shortTermLufs: number;
  peakDb: number;
  truePeakDb: number;
  rmsDb: number;
  noiseFloorDb: number;
  gainDb: number;
  limiterDb: number;
}

// The processed half of the graph: input → … → output, in the design's order.
export class VoiceChain {
  readonly input: GainNode;
  readonly output: GainNode;
  readonly latencySamples: number;
  readonly compressor: DynamicsCompressorNode;
  private readonly denoise: AudioWorkletNode;
  private readonly declick: AudioWorkletNode;
  private readonly deess: AudioWorkletNode;
  private readonly dynamics: AudioWorkletNode;
  private readonly mic: BiquadFilterNode[];
  private readonly rumble: [IIRFilterNode, BiquadFilterNode];
  private readonly rumbleBypass: GainNode;
  private readonly rumbleWet: GainNode;
  private readonly eq: BiquadFilterNode[];
  private readonly warmth: WaveShaperNode;
  private readonly ctx: BaseAudioContext;
  private rumbleFreq = 0;
  private warmthKey = '';

  constructor(ctx: BaseAudioContext, quality: Quality, meters: ChainMeters = {}) {
    this.ctx = ctx;
    const frame = FRAME_SIZE[quality];
    this.input = mono(ctx.createGain()) as GainNode;
    this.output = mono(ctx.createGain()) as GainNode;
    this.denoise = worklet(ctx, 'aurel-denoise', { frameSize: frame });
    this.mic = [0, 1, 2].map(() => mono(ctx.createBiquadFilter()) as BiquadFilterNode);
    this.rumble = [this.firstOrderHighpass(80), mono(ctx.createBiquadFilter()) as BiquadFilterNode];
    this.rumbleBypass = ctx.createGain();
    this.rumbleWet = ctx.createGain();
    this.declick = worklet(ctx, 'aurel-declick');
    this.eq = [0, 1, 2, 3].map(() => mono(ctx.createBiquadFilter()) as BiquadFilterNode);
    this.compressor = mono(ctx.createDynamicsCompressor()) as DynamicsCompressorNode;
    this.warmth = mono(ctx.createWaveShaper()) as WaveShaperNode;
    this.warmth.oversample = '2x';
    this.deess = worklet(ctx, 'aurel-deess');
    this.dynamics = worklet(ctx, 'aurel-dynamics');

    // noise removal → mic correction → rumble → pops/clicks → EQ → compressor → warmth → de-esser → boost/leveler/limiter
    this.input.connect(this.denoise);
    let prev: AudioNode = this.denoise;
    for (const m of this.mic) { prev.connect(m); prev = m; }
    prev.connect(this.rumbleBypass);
    prev.connect(this.rumble[0]);
    this.rumble[0].connect(this.rumble[1]).connect(this.rumbleWet);
    this.rumbleBypass.connect(this.declick);
    this.rumbleWet.connect(this.declick);
    prev = this.declick;
    for (const b of this.eq) { prev.connect(b); prev = b; }
    prev.connect(this.compressor).connect(this.warmth).connect(this.deess).connect(this.dynamics).connect(this.output);

    this.latencySamples = frame + Math.round(ctx.sampleRate * 0.0015) * 2;

    this.denoise.port.onmessage = (e) => meters.onNoise?.(e.data);
    this.deess.port.onmessage = (e) => meters.onDeEss?.(e.data);
    this.declick.port.onmessage = (e) => meters.onDeclick?.(e.data);
    this.dynamics.port.onmessage = (e) => meters.onOutput?.(e.data);
  }

  // Web Audio has no first-order high-pass biquad; IIRFilterNode does it exactly.
  // First order (6 dB/oct) + second order (12 dB/oct) = the design's 18 dB/oct rumble filter.
  private firstOrderHighpass(freq: number): IIRFilterNode {
    const k = Math.tan((Math.PI * freq) / this.ctx.sampleRate);
    const a0 = 1 + k;
    this.rumbleFreq = freq;
    return mono(this.ctx.createIIRFilter([1 / a0, -1 / a0], [1, (k - 1) / a0])) as IIRFilterNode;
  }

  update(s: VoiceSettings, live: LiveControls): void {
    const t = this.ctx.currentTime;
    const ramp = (p: AudioParam, v: number) => p.setTargetAtTime(v, t, 0.02);

    this.denoise.port.postMessage({
      enabled: s.noise.enabled && s.noise.mode !== 'off' && s.noise.amount > 0,
      reductionDb: noiseReductionDb(s.noise.amount),
      keepBreaths: s.noise.keepBreaths,
      reduceEcho: s.noise.reduceEcho,
    });

    micCorrectionBands(s).forEach((b, i) => {
      const f = this.mic[i];
      f.type = b.type as BiquadFilterType;
      ramp(f.frequency, b.freq);
      ramp(f.Q, b.q);
      ramp(f.gain, s.micCorrection.enabled ? b.gainDb : 0);
    });

    const hp = s.eq.bands[0];
    if (Math.abs(hp.freq - this.rumbleFreq) > 0.5) {
      // IIRFilterNode coefficients are fixed, so rebuild the first-order stage on a change.
      const old = this.rumble[0];
      const fresh = this.firstOrderHighpass(hp.freq);
      this.mic[2].connect(fresh);
      fresh.connect(this.rumble[1]);
      this.mic[2].disconnect(old);
      old.disconnect();
      this.rumble[0] = fresh;
    }
    this.rumble[1].type = 'highpass';
    ramp(this.rumble[1].frequency, hp.freq);
    ramp(this.rumble[1].Q, 1.0);
    ramp(this.rumbleWet.gain, s.rumble.enabled ? 1 : 0);
    ramp(this.rumbleBypass.gain, s.rumble.enabled ? 0 : 1);

    this.declick.port.postMessage({ pops: s.pops.enabled, clicks: s.clicks.enabled });

    effectiveBands(s).slice(1).forEach((b, i) => {
      const f = this.eq[i];
      f.type = b.type as BiquadFilterType;
      ramp(f.frequency, b.freq);
      ramp(f.Q, b.q);
      ramp(f.gain, s.eq.enabled ? b.gainDb : 0);
    });

    const c = s.compressor;
    ramp(this.compressor.threshold, c.enabled ? c.thresholdDb : 0);
    ramp(this.compressor.ratio, c.enabled ? c.ratio : 1);
    ramp(this.compressor.knee, c.enabled ? 6 : 0);
    ramp(this.compressor.attack, c.attackMs / 1000);
    ramp(this.compressor.release, c.releaseMs / 1000);

    const key = s.warmth.enabled ? `${s.warmth.character}:${s.warmth.drive}` : 'off';
    if (key !== this.warmthKey) {
      this.warmthKey = key;
      this.warmth.curve = s.warmth.enabled && s.warmth.drive > 0 ? warmthCurve(s.warmth.character, s.warmth.drive) : null;
    }

    this.deess.port.postMessage({ enabled: s.deEsser.enabled, freq: s.deEsser.freq, reductionDb: s.deEsser.reductionDb });

    const sp = LEVELING_SPEEDS[s.leveler.speed];
    this.dynamics.port.postMessage({
      boostDb: live.boostDb,
      levelerOn: s.leveler.enabled,
      targetLufs: s.leveler.targetLufs,
      maxLiftDb: s.leveler.maxLiftDb,
      attackS: sp.attackS,
      releaseS: sp.releaseS,
      limiterOn: s.limiter.enabled,
      ceilingDb: s.limiter.ceilingDb,
    });
  }

  disconnect(): void {
    for (const n of [this.input, this.denoise, ...this.mic, ...this.rumble, this.rumbleBypass, this.rumbleWet, this.declick, ...this.eq, this.compressor, this.warmth, this.deess, this.dynamics, this.output]) {
      try { n.disconnect(); } catch { /* ignore */ }
    }
    for (const w of [this.denoise, this.declick, this.deess, this.dynamics]) w.port.onmessage = null;
  }
}

// Render a recording through the chain offline (Test my sound, voice-check "Hear after").
export async function renderOffline(
  samples: Float32Array,
  sampleRate: number,
  settings: VoiceSettings,
  live: LiveControls,
  quality: Quality = 'balanced'
): Promise<Float32Array> {
  if (!live.enhancementOn) return samples.slice();
  const probe = FRAME_SIZE[quality] + Math.round(sampleRate * 0.0015) * 2;
  // Two seconds of lead-in lets the noise estimate and leveler settle before the clip starts.
  const lead = Math.round(sampleRate * 2);
  const ctx = new OfflineAudioContext(1, lead + samples.length + probe, sampleRate);
  await loadWorklets(ctx);
  const chain = new VoiceChain(ctx, quality);
  chain.update(settings, live);
  const buf = ctx.createBuffer(1, lead + samples.length, sampleRate);
  const data = buf.getChannelData(0);
  // Lead-in: the recording's own quietest second, so the denoiser learns this room.
  const quiet = quietestSecond(samples, sampleRate);
  for (let i = 0; i < lead; i++) data[i] = quiet[i % quiet.length];
  data.set(samples, lead);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(chain.input);
  chain.output.connect(ctx.destination);
  src.start();
  const rendered = await ctx.startRendering();
  return rendered.getChannelData(0).slice(lead + chain.latencySamples, lead + chain.latencySamples + samples.length);
}

function quietestSecond(samples: Float32Array, sampleRate: number): Float32Array {
  const win = Math.min(samples.length, Math.round(sampleRate * 0.5));
  if (win === 0) return new Float32Array(1);
  let best = 0, bestE = Infinity;
  for (let start = 0; start + win <= samples.length; start += Math.round(win / 2)) {
    let e = 0;
    for (let i = start; i < start + win; i++) e += samples[i] * samples[i];
    if (e < bestE) { bestE = e; best = start; }
  }
  return samples.subarray(best, best + win);
}
