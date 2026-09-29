import { DSPParameters, MeterData } from '../types';

export class BroadcastDSPEngine {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  // DSP Nodes
  private inputAnalyser: AnalyserNode | null = null;
  private preGainNode: GainNode | null = null;
  private gateGainNode: GainNode | null = null;

  // EQ Nodes
  private hpfFilter: BiquadFilterNode | null = null;
  private warmthFilter: BiquadFilterNode | null = null;
  private mudFilter: BiquadFilterNode | null = null;
  private presenceFilter: BiquadFilterNode | null = null;
  private airFilter: BiquadFilterNode | null = null;

  // De-Esser Node
  private deEsserFilter: BiquadFilterNode | null = null;

  // Compressor & Limiter
  private compressorNode: DynamicsCompressorNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;

  // Visualizer / Output Analyser
  private outputAnalyser: AnalyserNode | null = null;

  // Destinations & Routing
  private mainDestination: MediaStreamAudioDestinationNode | null = null;
  private monitorDestination: MediaStreamAudioDestinationNode | null = null;
  private monitorGainNode: GainNode | null = null;

  private mainAudioElement: HTMLAudioElement | null = null;
  private monitorAudioElement: HTMLAudioElement | null = null;

  // Internal State
  private isRunning: boolean = false;
  private currentParams: DSPParameters | null = null;
  private animationFrameId: number | null = null;
  private onMeterUpdate: ((data: MeterData) => void) | null = null;

  // Gate Envelope Follower state
  private gateCurrentGain: number = 1.0;
  private gateOpen: boolean = true;
  private lastGateTime: number = 0;

  constructor() {
    this.mainAudioElement = new Audio();
    this.mainAudioElement.autoplay = true;

    this.monitorAudioElement = new Audio();
    this.monitorAudioElement.autoplay = true;
  }

  public setMeterCallback(cb: (data: MeterData) => void) {
    this.onMeterUpdate = cb;
  }

  public async start(
    inputDeviceId: string,
    outputDeviceId: string,
    monitorDeviceId: string,
    params: DSPParameters,
    listenToSelf: boolean,
    monitorVolume: number
  ): Promise<void> {
    await this.stop();

    this.currentParams = params;
    this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate: 48000,
    });

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    // Capture microphone input without default aggressive OS filters
    const audioConstraints: any = {
      deviceId: inputDeviceId ? { exact: inputDeviceId } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
      latency: 0.005,
    };

    const constraints: MediaStreamConstraints = {
      audio: audioConstraints,
      video: false,
    };

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.warn('Could not acquire device with strict constraints, falling back to default:', err);
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }

    this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

    // 1. Input Analyser
    this.inputAnalyser = this.audioCtx.createAnalyser();
    this.inputAnalyser.fftSize = 512;
    this.inputAnalyser.smoothingTimeConstant = 0.3;

    // 2. Pre-Gain (Boost quiet voice cleanly)
    this.preGainNode = this.audioCtx.createGain();
    const preGainLinear = Math.pow(10, params.preGainDb / 20);
    this.preGainNode.gain.setValueAtTime(preGainLinear, this.audioCtx.currentTime);

    // 3. Noise Gate Gain Node
    this.gateGainNode = this.audioCtx.createGain();
    this.gateGainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

    // 4. EQ Stage
    // Band 1: High Pass Filter (cut plosive/desk rumble)
    this.hpfFilter = this.audioCtx.createBiquadFilter();
    this.hpfFilter.type = 'highpass';
    this.hpfFilter.frequency.setValueAtTime(params.eq.hpfFreq, this.audioCtx.currentTime);

    // Band 2: Warmth / Proximity effect
    this.warmthFilter = this.audioCtx.createBiquadFilter();
    this.warmthFilter.type = 'peaking';
    this.warmthFilter.frequency.setValueAtTime(params.eq.warmthFreq, this.audioCtx.currentTime);
    this.warmthFilter.gain.setValueAtTime(params.eq.enabled ? params.eq.warmthGainDb : 0, this.audioCtx.currentTime);
    this.warmthFilter.Q.setValueAtTime(1.1, this.audioCtx.currentTime);

    // Band 3: De-Mud / Boxiness Cut
    this.mudFilter = this.audioCtx.createBiquadFilter();
    this.mudFilter.type = 'peaking';
    this.mudFilter.frequency.setValueAtTime(params.eq.mudFreq, this.audioCtx.currentTime);
    this.mudFilter.gain.setValueAtTime(params.eq.enabled ? params.eq.mudGainDb : 0, this.audioCtx.currentTime);
    this.mudFilter.Q.setValueAtTime(params.eq.mudQ, this.audioCtx.currentTime);

    // Band 4: Broadcast Presence (Vocal intelligibility & clarity)
    this.presenceFilter = this.audioCtx.createBiquadFilter();
    this.presenceFilter.type = 'peaking';
    this.presenceFilter.frequency.setValueAtTime(params.eq.presenceFreq, this.audioCtx.currentTime);
    this.presenceFilter.gain.setValueAtTime(params.eq.enabled ? params.eq.presenceGainDb : 0, this.audioCtx.currentTime);
    this.presenceFilter.Q.setValueAtTime(params.eq.presenceQ, this.audioCtx.currentTime);

    // Band 5: Air & Sheen
    this.airFilter = this.audioCtx.createBiquadFilter();
    this.airFilter.type = 'highshelf';
    this.airFilter.frequency.setValueAtTime(params.eq.airFreq, this.audioCtx.currentTime);
    this.airFilter.gain.setValueAtTime(params.eq.enabled ? params.eq.airGainDb : 0, this.audioCtx.currentTime);

    // 5. De-Esser (gentle dynamic high-mid dip)
    this.deEsserFilter = this.audioCtx.createBiquadFilter();
    this.deEsserFilter.type = 'peaking';
    this.deEsserFilter.frequency.setValueAtTime(params.deEsser.freq, this.audioCtx.currentTime);
    this.deEsserFilter.gain.setValueAtTime(params.deEsser.enabled ? params.deEsser.reductionDb : 0, this.audioCtx.currentTime);
    this.deEsserFilter.Q.setValueAtTime(2.2, this.audioCtx.currentTime);

    // 6. Broadcast Compressor / Leveler
    this.compressorNode = this.audioCtx.createDynamicsCompressor();
    this.compressorNode.threshold.setValueAtTime(params.compressor.enabled ? params.compressor.thresholdDb : 0, this.audioCtx.currentTime);
    this.compressorNode.ratio.setValueAtTime(params.compressor.enabled ? params.compressor.ratio : 1, this.audioCtx.currentTime);
    this.compressorNode.attack.setValueAtTime(params.compressor.attackMs / 1000, this.audioCtx.currentTime);
    this.compressorNode.release.setValueAtTime(params.compressor.releaseMs / 1000, this.audioCtx.currentTime);
    this.compressorNode.knee.setValueAtTime(params.compressor.kneeDb, this.audioCtx.currentTime);

    // 7. Brickwall Limiter (fast attack ceiling limiter)
    this.limiterNode = this.audioCtx.createDynamicsCompressor();
    this.limiterNode.threshold.setValueAtTime(params.limiter.ceilingDb, this.audioCtx.currentTime);
    this.limiterNode.ratio.setValueAtTime(20.0, this.audioCtx.currentTime);
    this.limiterNode.attack.setValueAtTime(0.002, this.audioCtx.currentTime);
    this.limiterNode.release.setValueAtTime(0.040, this.audioCtx.currentTime);
    this.limiterNode.knee.setValueAtTime(0.0, this.audioCtx.currentTime);

    // 8. Master Output Gain
    this.masterGainNode = this.audioCtx.createGain();
    const masterGainLinear = Math.pow(10, params.outputGainDb / 20);
    this.masterGainNode.gain.setValueAtTime(masterGainLinear, this.audioCtx.currentTime);

    // 9. Output Analyser (for VU meters & spectrum visualizer)
    this.outputAnalyser = this.audioCtx.createAnalyser();
    this.outputAnalyser.fftSize = 1024;
    this.outputAnalyser.smoothingTimeConstant = 0.4;

    // Connect DSP Chain
    // Source -> Input Analyser -> PreGain -> Gate -> HPF -> Warmth -> Mud -> Presence -> Air -> De-Esser -> Compressor -> Limiter -> Master -> Output Analyser
    this.sourceNode.connect(this.inputAnalyser);
    this.sourceNode.connect(this.preGainNode);
    this.preGainNode.connect(this.gateGainNode);
    this.gateGainNode.connect(this.hpfFilter);
    this.hpfFilter.connect(this.warmthFilter);
    this.warmthFilter.connect(this.mudFilter);
    this.mudFilter.connect(this.presenceFilter);
    this.presenceFilter.connect(this.airFilter);
    this.airFilter.connect(this.deEsserFilter);
    this.deEsserFilter.connect(this.compressorNode);
    this.compressorNode.connect(this.limiterNode);
    this.limiterNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.outputAnalyser);

    // 10. Route to Main Output Destination (e.g. VB-Audio Cable)
    this.mainDestination = this.audioCtx.createMediaStreamDestination();
    this.outputAnalyser.connect(this.mainDestination);

    if (this.mainAudioElement) {
      this.mainAudioElement.srcObject = this.mainDestination.stream;
      if (outputDeviceId && 'setSinkId' in this.mainAudioElement) {
        try {
          await (this.mainAudioElement as any).setSinkId(outputDeviceId);
        } catch (e) {
          console.warn('Could not set sink ID for main output:', e);
        }
      }
      await this.mainAudioElement.play().catch(() => {});
    }

    // 11. Route to Headphones Monitor (Listen to Self with Original / Enhanced selector)
    this.monitorDestination = this.audioCtx.createMediaStreamDestination();
    this.monitorGainNode = this.audioCtx.createGain();
    this.monitorGainNode.gain.setValueAtTime(listenToSelf ? monitorVolume : 0.0, this.audioCtx.currentTime);

    // Default enhanced monitor feed
    this.outputAnalyser.connect(this.monitorGainNode);
    this.monitorGainNode.connect(this.monitorDestination);

    if (this.monitorAudioElement) {
      this.monitorAudioElement.srcObject = this.monitorDestination.stream;
      if (monitorDeviceId && 'setSinkId' in this.monitorAudioElement) {
        try {
          await (this.monitorAudioElement as any).setSinkId(monitorDeviceId);
        } catch (e) {
          console.warn('Could not set sink ID for monitor output:', e);
        }
      }
      await this.monitorAudioElement.play().catch(() => {});
    }

    this.isRunning = true;
    this.lastGateTime = performance.now();
    this.startMeterLoop();
  }

  public updateParameters(params: DSPParameters) {
    if (!this.audioCtx || !this.isRunning) return;
    this.currentParams = params;
    const now = this.audioCtx.currentTime;

    // PreGain
    if (this.preGainNode) {
      const preLinear = Math.pow(10, params.preGainDb / 20);
      this.preGainNode.gain.setTargetAtTime(preLinear, now, 0.02);
    }

    // EQ
    if (this.hpfFilter) {
      this.hpfFilter.frequency.setTargetAtTime(params.eq.hpfFreq, now, 0.02);
    }
    if (this.warmthFilter) {
      this.warmthFilter.frequency.setTargetAtTime(params.eq.warmthFreq, now, 0.02);
      this.warmthFilter.gain.setTargetAtTime(params.eq.enabled ? params.eq.warmthGainDb : 0, now, 0.02);
    }
    if (this.mudFilter) {
      this.mudFilter.frequency.setTargetAtTime(params.eq.mudFreq, now, 0.02);
      this.mudFilter.gain.setTargetAtTime(params.eq.enabled ? params.eq.mudGainDb : 0, now, 0.02);
      this.mudFilter.Q.setTargetAtTime(params.eq.mudQ, now, 0.02);
    }
    if (this.presenceFilter) {
      this.presenceFilter.frequency.setTargetAtTime(params.eq.presenceFreq, now, 0.02);
      this.presenceFilter.gain.setTargetAtTime(params.eq.enabled ? params.eq.presenceGainDb : 0, now, 0.02);
      this.presenceFilter.Q.setTargetAtTime(params.eq.presenceQ, now, 0.02);
    }
    if (this.airFilter) {
      this.airFilter.frequency.setTargetAtTime(params.eq.airFreq, now, 0.02);
      this.airFilter.gain.setTargetAtTime(params.eq.enabled ? params.eq.airGainDb : 0, now, 0.02);
    }

    // De-Esser
    if (this.deEsserFilter) {
      this.deEsserFilter.frequency.setTargetAtTime(params.deEsser.freq, now, 0.02);
      this.deEsserFilter.gain.setTargetAtTime(params.deEsser.enabled ? params.deEsser.reductionDb : 0, now, 0.02);
    }

    // Compressor
    if (this.compressorNode) {
      this.compressorNode.threshold.setTargetAtTime(params.compressor.enabled ? params.compressor.thresholdDb : 0, now, 0.02);
      this.compressorNode.ratio.setTargetAtTime(params.compressor.enabled ? params.compressor.ratio : 1, now, 0.02);
      this.compressorNode.attack.setTargetAtTime(params.compressor.attackMs / 1000, now, 0.02);
      this.compressorNode.release.setTargetAtTime(params.compressor.releaseMs / 1000, now, 0.02);
      this.compressorNode.knee.setTargetAtTime(params.compressor.kneeDb, now, 0.02);
    }

    // Limiter
    if (this.limiterNode) {
      this.limiterNode.threshold.setTargetAtTime(params.limiter.ceilingDb, now, 0.02);
    }

    // Master
    if (this.masterGainNode) {
      const masterLinear = Math.pow(10, params.outputGainDb / 20);
      this.masterGainNode.gain.setTargetAtTime(masterLinear, now, 0.02);
    }
  }

  public setMonitoring(listenToSelf: boolean, volume: number) {
    if (!this.audioCtx || !this.monitorGainNode) return;
    const target = listenToSelf ? Math.max(0, Math.min(1, volume)) : 0.0;
    this.monitorGainNode.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.03);
  }

  public async setOutputDevice(deviceId: string) {
    if (this.mainAudioElement && 'setSinkId' in this.mainAudioElement) {
      try {
        await (this.mainAudioElement as any).setSinkId(deviceId);
      } catch (e) {
        console.warn('Failed to switch output device:', e);
      }
    }
  }

  public async setMonitorDevice(deviceId: string) {
    if (this.monitorAudioElement && 'setSinkId' in this.monitorAudioElement) {
      try {
        await (this.monitorAudioElement as any).setSinkId(deviceId);
      } catch (e) {
        console.warn('Failed to switch monitor device:', e);
      }
    }
  }

  public getFrequencyData(array: any): void {
    if (this.outputAnalyser) {
      this.outputAnalyser.getByteFrequencyData(array);
    }
  }

  private startMeterLoop() {
    const inputBuffer = new Float32Array(512);
    const outputBuffer = new Float32Array(512);

    const loop = () => {
      if (!this.isRunning) return;

      const now = performance.now();
      const dt = (now - this.lastGateTime) / 1000;
      this.lastGateTime = now;

      // 1. Calculate Input Peak & RMS
      let inPeak = 0;
      let inSumSq = 0;
      if (this.inputAnalyser) {
        this.inputAnalyser.getFloatTimeDomainData(inputBuffer);
        for (let i = 0; i < inputBuffer.length; i++) {
          const val = Math.abs(inputBuffer[i]);
          if (val > inPeak) inPeak = val;
          inSumSq += val * val;
        }
      }
      const inRms = Math.sqrt(inSumSq / inputBuffer.length);
      const inPeakDb = inPeak > 0.00001 ? 20 * Math.log10(inPeak) : -90;
      const inRmsDb = inRms > 0.00001 ? 20 * Math.log10(inRms) : -90;

      // 2. Dynamic Noise Gate Processing
      if (this.currentParams && this.gateGainNode && this.audioCtx) {
        const { enabled, thresholdDb, reductionDb, attackMs, releaseMs } = this.currentParams.noiseGate;
        if (enabled) {
          // If input exceeds gate threshold, open gate; otherwise close
          const shouldBeOpen = inRmsDb > thresholdDb;
          this.gateOpen = shouldBeOpen;

          const targetGain = shouldBeOpen ? 1.0 : Math.pow(10, reductionDb / 20);
          const timeConstant = shouldBeOpen ? (attackMs / 1000) : (releaseMs / 1000);

          // Smooth exponential filter
          const alpha = 1 - Math.exp(-dt / (timeConstant + 0.0001));
          this.gateCurrentGain += alpha * (targetGain - this.gateCurrentGain);

          this.gateGainNode.gain.setValueAtTime(this.gateCurrentGain, this.audioCtx.currentTime);
        } else {
          this.gateOpen = true;
          this.gateGainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
        }
      }

      // 3. Calculate Output Peak & RMS
      let outPeak = 0;
      let outSumSq = 0;
      if (this.outputAnalyser) {
        this.outputAnalyser.getFloatTimeDomainData(outputBuffer);
        for (let i = 0; i < outputBuffer.length; i++) {
          const val = Math.abs(outputBuffer[i]);
          if (val > outPeak) outPeak = val;
          outSumSq += val * val;
        }
      }
      const outRms = Math.sqrt(outSumSq / outputBuffer.length);
      const outPeakDb = outPeak > 0.00001 ? 20 * Math.log10(outPeak) : -90;
      const outRmsDb = outRms > 0.00001 ? 20 * Math.log10(outRms) : -90;

      // 4. Compressor Gain Reduction
      const gainReductionDb = this.compressorNode ? Math.abs(this.compressorNode.reduction) : 0;

      if (this.onMeterUpdate) {
        this.onMeterUpdate({
          inputPeakDb: Math.max(-90, inPeakDb),
          inputRmsDb: Math.max(-90, inRmsDb),
          outputPeakDb: Math.max(-90, outPeakDb),
          outputRmsDb: Math.max(-90, outRmsDb),
          gainReductionDb,
          gateOpen: this.gateOpen,
        });
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mainAudioElement) {
      this.mainAudioElement.pause();
      this.mainAudioElement.srcObject = null;
    }
    if (this.monitorAudioElement) {
      this.monitorAudioElement.pause();
      this.monitorAudioElement.srcObject = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        await this.audioCtx.close();
      } catch (e) {
        console.warn('Error closing AudioContext:', e);
      }
      this.audioCtx = null;
    }
  }

  public getStatus(): boolean {
    return this.isRunning;
  }
}

export const dspEngine = new BroadcastDSPEngine();
