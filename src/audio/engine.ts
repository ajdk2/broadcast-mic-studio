import { LiveControls, VoiceSettings } from '../voice/model';
import { FRAME_SIZE, OutputReport, Quality, VoiceChain, loadWorklets } from './chain';
import { MeterReport } from './dsp/loudness';

export type EngineError = 'no-mic' | 'mic-locked' | 'permission' | 'failed';

export interface EngineStartOptions {
  inputId: string;
  outputId: string;
  monitorId: string;
  sampleRate: number;
  bufferSize: number;
  quality: Quality;
}

export interface EngineStatus {
  state: 'stopped' | 'starting' | 'running' | 'error';
  error?: EngineError;
  message?: string;
  inputLost: boolean;
  inputLabel: string;
  latencyMs: number;
  sampleRate: number;
}

export interface MeterSnapshot {
  raw: MeterReport;
  out: OutputReport;
  noiseInDb: number;
  noiseOutDb: number;
  humDb: number;
  echo: number;
  deEssDb: number;
  compressorDb: number;
  pops: number;
  clicks: number;
  speaking: boolean;
}

const HISTORY = 240; // 12 s of 50 ms reports

const SILENT: MeterReport = { momentaryLufs: -120, shortTermLufs: -120, peakDb: -140, truePeakDb: -140, rmsDb: -140, noiseFloorDb: -120 };

// Runs the mic through the voice chain and out to the chosen output (VB-Cable's CABLE Input) and,
// separately, to the monitor device. Holds the latest meter readings and 12 s of waveform history.
export class VoiceEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private chain: VoiceChain | null = null;
  private rawMeter: AudioWorkletNode | null = null;
  private recorder: AudioWorkletNode | null = null;
  private rawToMain: GainNode | null = null;
  private procToMain: GainNode | null = null;
  private muteGain: GainNode | null = null;
  private rawToMon: GainNode | null = null;
  private procToMon: GainNode | null = null;
  private monitorGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private rawAnalyser: AnalyserNode | null = null;
  private mainEl: HTMLAudioElement | null = null;
  private monitorEl: HTMLAudioElement | null = null;
  private startToken = 0;

  private settings: VoiceSettings | null = null;
  private live: LiveControls | null = null;
  private monitorOn = false;
  private monitorVolume = 0.85;
  private opts: EngineStartOptions | null = null;

  status: EngineStatus = { state: 'stopped', inputLost: false, inputLabel: '', latencyMs: 0, sampleRate: 48000 };
  meters: MeterSnapshot = {
    raw: SILENT,
    out: { ...SILENT, gainDb: 0, limiterDb: 0 },
    noiseInDb: -120,
    noiseOutDb: -120,
    humDb: -120,
    echo: 0,
    deEssDb: 0,
    compressorDb: 0,
    pops: 0,
    clicks: 0,
    speaking: false,
  };
  // Peak levels (linear, 0–1) per 50 ms, oldest first.
  readonly rawHistory = new Float32Array(HISTORY);
  readonly outHistory = new Float32Array(HISTORY);

  private meterListeners = new Set<(m: MeterSnapshot) => void>();
  private statusListeners = new Set<(s: EngineStatus) => void>();

  onMeters(fn: (m: MeterSnapshot) => void): () => void {
    this.meterListeners.add(fn);
    return () => this.meterListeners.delete(fn);
  }

  onStatus(fn: (s: EngineStatus) => void): () => void {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  private setStatus(patch: Partial<EngineStatus>) {
    this.status = { ...this.status, ...patch };
    this.statusListeners.forEach((fn) => fn(this.status));
  }

  get running(): boolean {
    return this.status.state === 'running';
  }

  get audioContext(): AudioContext | null {
    return this.ctx;
  }

  async start(opts: EngineStartOptions, settings: VoiceSettings, live: LiveControls): Promise<void> {
    const token = ++this.startToken;
    await this.teardown();
    this.opts = opts;
    this.settings = settings;
    this.live = live;
    this.setStatus({ state: 'starting', error: undefined, message: undefined, inputLost: false });

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: opts.inputId ? { exact: opts.inputId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
        video: false,
      });
    } catch (err) {
      if (token !== this.startToken) return;
      const name = (err as DOMException)?.name;
      const error: EngineError =
        name === 'NotFoundError' || name === 'OverconstrainedError' ? 'no-mic'
        : name === 'NotReadableError' || name === 'AbortError' ? 'mic-locked'
        : name === 'NotAllowedError' || name === 'SecurityError' ? 'permission'
        : 'failed';
      this.setStatus({ state: 'error', error, message: (err as Error)?.message });
      return;
    }
    if (token !== this.startToken) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    try {
      const ctx = new AudioContext({ sampleRate: opts.sampleRate, latencyHint: opts.bufferSize / opts.sampleRate });
      this.ctx = ctx;
      this.stream = stream;
      await loadWorklets(ctx);
      if (token !== this.startToken) return;

      const track = stream.getAudioTracks()[0];
      track.addEventListener('ended', () => {
        if (token === this.startToken) this.setStatus({ inputLost: true });
      });

      this.source = ctx.createMediaStreamSource(stream);
      this.rawMeter = new AudioWorkletNode(ctx, 'aurel-meter', { outputChannelCount: [1] });
      this.recorder = new AudioWorkletNode(ctx, 'aurel-recorder', { outputChannelCount: [1] });
      this.chain = new VoiceChain(ctx, opts.quality, {
        onOutput: (d) => this.onOutput(d),
        onNoise: (d) => Object.assign(this.meters, d),
        onDeEss: (d) => (this.meters.deEssDb = d.reductionDb),
        onDeclick: (d) => Object.assign(this.meters, d),
      });
      this.rawMeter.port.onmessage = (e) => (this.meters.raw = e.data);

      this.source.connect(this.rawMeter);
      this.source.connect(this.recorder);
      // The recorder must be pulled by the graph to run.
      const sink = ctx.createGain();
      sink.gain.value = 0;
      this.recorder.connect(sink).connect(ctx.destination);

      this.rawMeter.connect(this.chain.input);
      this.rawToMain = ctx.createGain();
      this.procToMain = ctx.createGain();
      this.muteGain = ctx.createGain();
      this.rawToMon = ctx.createGain();
      this.procToMon = ctx.createGain();
      this.monitorGain = ctx.createGain();
      this.rawMeter.connect(this.rawToMain);
      this.chain.output.connect(this.procToMain);
      this.rawToMain.connect(this.muteGain);
      this.procToMain.connect(this.muteGain);
      this.rawMeter.connect(this.rawToMon);
      this.chain.output.connect(this.procToMon);
      this.rawToMon.connect(this.monitorGain);
      this.procToMon.connect(this.monitorGain);

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0.75;
      this.chain.output.connect(this.analyser);
      this.rawAnalyser = ctx.createAnalyser();
      this.rawAnalyser.fftSize = 4096;
      this.rawAnalyser.smoothingTimeConstant = 0.75;
      this.rawMeter.connect(this.rawAnalyser);

      const mainDest = ctx.createMediaStreamDestination();
      this.muteGain.connect(mainDest);
      const monDest = ctx.createMediaStreamDestination();
      this.monitorGain.connect(monDest);

      this.applyLive(true);
      this.chain.update(settings, live);

      this.mainEl = new Audio();
      this.monitorEl = new Audio();
      await this.attachOutput(this.mainEl, mainDest.stream, opts.outputId, false);
      await this.attachOutput(this.monitorEl, monDest.stream, opts.monitorId, true);

      if (ctx.state === 'suspended') await ctx.resume();
      const dspMs = ((FRAME_SIZE[opts.quality] + Math.round(ctx.sampleRate * 0.0015) * 2) / ctx.sampleRate) * 1000;
      this.setStatus({
        state: 'running',
        inputLabel: track.label,
        sampleRate: ctx.sampleRate,
        latencyMs: (ctx.baseLatency + (ctx.outputLatency || 0)) * 1000 + dspMs,
      });
    } catch (err) {
      if (token !== this.startToken) return;
      await this.teardown();
      this.setStatus({ state: 'error', error: 'failed', message: (err as Error)?.message });
    }
  }

  // Without a chosen output (normally VB-Cable's CABLE Input), don't play the main feed at all: the
  // default device is usually the speakers, which would feed back into the mic.
  private async attachOutput(el: HTMLAudioElement, stream: MediaStream, deviceId: string, allowDefault: boolean) {
    if (!deviceId && !allowDefault) return;
    el.srcObject = stream;
    if (deviceId && 'setSinkId' in el) {
      try {
        await (el as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(deviceId);
      } catch (e) {
        console.warn('Could not use output device', e);
        if (!allowDefault) {
          el.srcObject = null;
          return;
        }
      }
    }
    await el.play().catch(() => {});
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    if (!this.opts) return;
    this.opts.outputId = deviceId;
    if (this.ctx && this.mainEl && this.muteGain) {
      const dest = this.ctx.createMediaStreamDestination();
      this.muteGain.disconnect();
      this.muteGain.connect(dest);
      this.mainEl.pause();
      this.mainEl.srcObject = null;
      await this.attachOutput(this.mainEl, dest.stream, deviceId, false);
    }
  }

  async setMonitorDevice(deviceId: string): Promise<void> {
    if (!this.opts) return;
    this.opts.monitorId = deviceId;
    if (this.monitorEl && 'setSinkId' in this.monitorEl) {
      try {
        await (this.monitorEl as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(deviceId || '');
      } catch (e) {
        console.warn('Could not use monitor device', e);
      }
    }
  }

  update(settings: VoiceSettings, live: LiveControls): void {
    this.settings = settings;
    this.live = live;
    this.chain?.update(settings, live);
    this.applyLive(false);
  }

  setMonitor(on: boolean, volume: number): void {
    this.monitorOn = on;
    this.monitorVolume = volume;
    this.applyLive(false);
  }

  private applyLive(immediate: boolean) {
    const ctx = this.ctx;
    const live = this.live;
    if (!ctx || !live || !this.rawToMain) return;
    const t = ctx.currentTime;
    const set = (p: AudioParam, v: number) => (immediate ? p.setValueAtTime(v, t) : p.setTargetAtTime(v, t, 0.03));
    const enhanced = live.enhancementOn;
    set(this.rawToMain.gain, enhanced ? 0 : 1);
    set(this.procToMain!.gain, enhanced ? 1 : 0);
    set(this.muteGain!.gain, live.muted ? 0 : 1);
    const hearRaw = live.hearOriginal || !enhanced;
    set(this.rawToMon!.gain, hearRaw ? 1 : 0);
    set(this.procToMon!.gain, hearRaw ? 0 : 1);
    set(this.monitorGain!.gain, this.monitorOn ? this.monitorVolume : 0);
  }

  private onOutput(d: OutputReport) {
    const m = this.meters;
    m.out = d;
    m.compressorDb = this.chain ? this.chain.compressor.reduction : 0;
    m.speaking = m.raw.momentaryLufs > Math.max(-55, m.raw.noiseFloorDb + 10);
    this.rawHistory.copyWithin(0, 1);
    this.outHistory.copyWithin(0, 1);
    this.rawHistory[HISTORY - 1] = Math.pow(10, m.raw.peakDb / 20);
    // What the apps hear: nothing while muted, the raw mic while bypassed.
    const live = this.live;
    this.outHistory[HISTORY - 1] = live?.muted ? 0 : live && !live.enhancementOn ? this.rawHistory[HISTORY - 1] : Math.pow(10, d.peakDb / 20);
    this.meterListeners.forEach((fn) => fn(m));
  }

  // Records the raw mic for `seconds`. Resolves with the samples.
  record(seconds: number, onProgress?: (p: number) => void): Promise<{ samples: Float32Array; sampleRate: number }> {
    const rec = this.recorder;
    if (!rec || !this.running) return Promise.reject(new Error('The audio engine is not running'));
    return new Promise((resolve) => {
      rec.port.onmessage = (e) => {
        if (e.data.progress !== undefined) onProgress?.(e.data.progress);
        if (e.data.samples) {
          rec.port.onmessage = null;
          onProgress?.(1);
          resolve({ samples: e.data.samples, sampleRate: e.data.sampleRate });
        }
      };
      rec.port.postMessage({ record: seconds });
    });
  }

  // Live spectrum in dBFS, for the equalizer and mic-correction views. Returns false if stopped.
  getSpectrum(out: Float32Array<ArrayBuffer>, which: 'out' | 'raw' = 'out'): boolean {
    const a = which === 'raw' ? this.rawAnalyser : this.analyser;
    if (!a) return false;
    a.getFloatFrequencyData(out);
    return true;
  }

  get spectrumBins(): number {
    return this.analyser ? this.analyser.frequencyBinCount : 2048;
  }

  cancelRecording(): void {
    this.recorder?.port.postMessage({ cancel: true });
  }

  async stop(): Promise<void> {
    this.startToken++;
    await this.teardown();
    this.setStatus({ state: 'stopped' });
  }

  private async teardown(): Promise<void> {
    for (const el of [this.mainEl, this.monitorEl]) {
      if (el) {
        el.pause();
        el.srcObject = null;
      }
    }
    this.mainEl = this.monitorEl = null;
    this.chain?.disconnect();
    this.chain = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        await this.ctx.close();
      } catch {
        /* already closed */
      }
    }
    this.ctx = null;
    this.rawToMain = this.procToMain = this.muteGain = this.rawToMon = this.procToMon = this.monitorGain = null;
    this.rawMeter = this.recorder = null;
    this.analyser = this.rawAnalyser = null;
    this.source = null;
    this.rawHistory.fill(0);
    this.outHistory.fill(0);
  }
}

export const engine = new VoiceEngine();
