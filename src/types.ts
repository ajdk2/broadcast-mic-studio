export type NoiseCleanupMode = 'off' | 'light' | 'balanced' | 'strong';
export type HeadphonePreviewMode = 'original' | 'enhanced';
export type NavigationTab = 'studio' | 'profiles' | 'finetune' | 'connect' | 'settings';

export interface DSPParameters {
  preGainDb: number; // 0 to +38 dB
  noiseGate: {
    enabled: boolean;
    thresholdDb: number;
    reductionDb: number;
    attackMs: number;
    releaseMs: number;
  };
  eq: {
    enabled: boolean;
    hpfFreq: number;
    warmthFreq: number;
    warmthGainDb: number;
    mudFreq: number;
    mudGainDb: number;
    mudQ: number;
    presenceFreq: number;
    presenceGainDb: number;
    presenceQ: number;
    airFreq: number;
    airGainDb: number;
  };
  compressor: {
    enabled: boolean;
    thresholdDb: number;
    ratio: number;
    attackMs: number;
    releaseMs: number;
    kneeDb: number;
  };
  deEsser: {
    enabled: boolean;
    freq: number;
    reductionDb: number;
  };
  limiter: {
    enabled: boolean;
    ceilingDb: number;
  };
  outputGainDb: number;
}

export interface AurelProfile {
  id: string;
  name: string;
  desc: string;
  tags: string;
  curve: string;
  isBuiltIn: boolean;
  params: DSPParameters;
}

export interface AudioDeviceOption {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface MeterData {
  inputPeakDb: number;
  inputRmsDb: number;
  outputPeakDb: number;
  outputRmsDb: number;
  gainReductionDb: number;
  gateOpen: boolean;
}

export interface MicCorrectionModel {
  id: string;
  name: string;
  category: string;
  description: string;
  eqOffsets: {
    hpfFreq?: number;
    warmthGain?: number;
    mudGain?: number;
    presenceGain?: number;
    airGain?: number;
  };
}
