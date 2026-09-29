// The voice chain as the design describes it (board 03 · Fine-tune › Voice chain), top to bottom:
// noise removal → mic correction → rumble filter → pop removal → mouth-click removal → EQ →
// compressor → analog warmth → de-esser → Voice Boost & leveler → limiter.
// Every screen reads and writes this one shape; the engine turns it into audio nodes.

export type NoiseMode = 'off' | 'light' | 'balanced' | 'strong';
export type EqBandType = 'highpass' | 'lowshelf' | 'peaking' | 'highshelf';
export type WarmthCharacter = 'tape' | 'tube' | 'console';
export type LevelingSpeed = 'gentle' | 'natural' | 'fast';

export interface EqBand {
  name: string;
  type: EqBandType;
  freq: number;
  gainDb: number;
  q: number;
}

export interface VoiceSettings {
  noise: {
    enabled: boolean;
    mode: NoiseMode;
    amount: number; // 0–100 %; each mode sets a preset amount, Fine-tune fine-adjusts it
    keepBreaths: boolean;
    reduceEcho: boolean;
  };
  micCorrection: {
    enabled: boolean;
    bodyDb: number; // low shelf, 100–250 Hz
    boxinessDb: number; // bell, 500–800 Hz
    harshnessDb: number; // bell, 3–5 kHz
    strength: number; // 0–100 %
    measured: boolean;
  };
  // The rumble filter is EQ band 1 ("Rumble cut"); this switch turns it on and off.
  rumble: { enabled: boolean };
  pops: { enabled: boolean };
  clicks: { enabled: boolean };
  eq: { enabled: boolean; bands: EqBand[] };
  // Studio "Tone" sliders, applied on top of EQ bands 2 (Body) and 4 (Presence).
  tone: { warmthDb: number; presenceDb: number };
  compressor: { enabled: boolean; thresholdDb: number; ratio: number; attackMs: number; releaseMs: number };
  warmth: { enabled: boolean; character: WarmthCharacter; drive: number };
  deEsser: { enabled: boolean; freq: number; reductionDb: number };
  leveler: { enabled: boolean; targetLufs: number; maxLiftDb: number; speed: LevelingSpeed };
  limiter: { enabled: boolean; ceilingDb: number };
}

// What lives outside a profile: the user's own level and the live switches.
// "Every profile keeps your Voice Boost." (board 01)
export interface LiveControls {
  enhancementOn: boolean;
  muted: boolean;
  boostDb: number; // 0 … +38
  hearOriginal: boolean; // monitor / headphone preview shows the raw mic
}

export interface ProfileRule {
  app: string; // display name, e.g. "OBS Studio"
  exe: string; // process image name, e.g. "obs64.exe"
  enabled: boolean;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  tags: string;
  builtIn: boolean;
  basedOn?: string; // built-in profile id it started from
  settings: VoiceSettings;
  shortcut?: string; // digit for Ctrl+Alt+<digit>
  rule?: ProfileRule;
  updatedAt: number;
}

export const BOOST_MAX_DB = 38;
export const TONE_RANGE_DB = 6;

export const NOISE_MODES: Record<NoiseMode, { label: string; desc: string; amount: number }> = {
  off: { label: 'Off', desc: 'Your room is passed through untouched.', amount: 0 },
  light: { label: 'Light', desc: 'Takes the edge off steady hum and hiss. Most natural.', amount: 35 },
  balanced: { label: 'Balanced', desc: 'Removes fans, keyboard clicks and room echo while keeping breaths natural.', amount: 72 },
  strong: { label: 'Strong', desc: 'For loud rooms. Silences everything that is not your voice.', amount: 95 },
};

// Noise removal amount (0–100 %) → how far noise-only parts of the spectrum are pulled down.
export const noiseReductionDb = (amount: number): number => (amount / 100) * 36;

export function setNoiseMode(s: VoiceSettings, mode: NoiseMode): void {
  s.noise.mode = mode;
  s.noise.enabled = mode !== 'off';
  if (mode !== 'off') s.noise.amount = NOISE_MODES[mode].amount;
}

// The mode whose preset is nearest a hand-set amount.
export function modeForAmount(amount: number): NoiseMode {
  if (amount <= 0) return 'off';
  if (amount < 54) return 'light';
  if (amount < 84) return 'balanced';
  return 'strong';
}

export const LEVELING_SPEEDS: Record<LevelingSpeed, { label: string; attackS: number; releaseS: number }> = {
  gentle: { label: 'Gentle', attackS: 3, releaseS: 6 },
  natural: { label: 'Natural', attackS: 1.2, releaseS: 3 },
  fast: { label: 'Fast', attackS: 0.4, releaseS: 1 },
};

export const RULE_APPS: { app: string; exe: string }[] = [
  { app: 'OBS Studio', exe: 'obs64.exe' },
  { app: 'Microsoft Teams', exe: 'ms-teams.exe' },
  { app: 'Zoom Workplace', exe: 'Zoom.exe' },
  { app: 'Discord', exe: 'Discord.exe' },
  { app: 'Audacity', exe: 'Audacity.exe' },
];

// Design board 03 · Fine-tune shows Broadcast's chain; the others vary from it.
const broadcast: VoiceSettings = {
  noise: { enabled: true, mode: 'balanced', amount: 72, keepBreaths: true, reduceEcho: true },
  micCorrection: { enabled: true, bodyDb: 0, boxinessDb: 0, harshnessDb: 0, strength: 80, measured: false },
  rumble: { enabled: true },
  pops: { enabled: true },
  clicks: { enabled: true },
  eq: {
    enabled: true,
    bands: [
      { name: 'Rumble cut', type: 'highpass', freq: 80, gainDb: 0, q: 0.7 },
      { name: 'Body', type: 'lowshelf', freq: 120, gainDb: 3.5, q: 0.7 },
      { name: 'Mud', type: 'peaking', freq: 300, gainDb: -3, q: 1.4 },
      { name: 'Presence', type: 'peaking', freq: 3200, gainDb: 3, q: 1 },
      { name: 'Air', type: 'highshelf', freq: 10000, gainDb: 2.5, q: 0.7 },
    ],
  },
  tone: { warmthDb: 1.4, presenceDb: -0.2 },
  compressor: { enabled: true, thresholdDb: -24, ratio: 3, attackMs: 8, releaseMs: 120 },
  warmth: { enabled: true, character: 'tape', drive: 18 },
  deEsser: { enabled: true, freq: 6500, reductionDb: -4 },
  leveler: { enabled: true, targetLufs: -16, maxLiftDb: 30, speed: 'natural' },
  limiter: { enabled: true, ceilingDb: -1 },
};

export function cloneSettings(s: VoiceSettings): VoiceSettings {
  return JSON.parse(JSON.stringify(s));
}

function variant(edit: (s: VoiceSettings) => void): VoiceSettings {
  const s = cloneSettings(broadcast);
  edit(s);
  return s;
}

function band(s: VoiceSettings, i: number, patch: Partial<EqBand>) {
  Object.assign(s.eq.bands[i], patch);
}

export const BUILT_IN_PROFILES: Profile[] = [
  {
    id: 'broadcast',
    name: 'Broadcast',
    description: 'Deep, close and controlled. The late-night radio voice.',
    tags: 'Warm lows · Tight dynamics',
    builtIn: true,
    settings: cloneSettings(broadcast),
    shortcut: '3',
    updatedAt: 0,
  },
  {
    id: 'podcast',
    name: 'Podcast',
    description: 'Rich and even for long-form talk, interviews and narration.',
    tags: 'Full body · Smooth',
    builtIn: true,
    settings: variant((s) => {
      band(s, 1, { gainDb: 2.5, freq: 140 });
      band(s, 2, { gainDb: -2.5, freq: 320 });
      band(s, 3, { gainDb: 2, freq: 3000, q: 0.8 });
      band(s, 4, { gainDb: 2 });
      s.tone = { warmthDb: 0.8, presenceDb: 0 };
      s.compressor = { enabled: true, thresholdDb: -22, ratio: 2.5, attackMs: 12, releaseMs: 160 };
      s.warmth = { enabled: true, character: 'tube', drive: 14 };
      s.leveler.speed = 'gentle';
    }),
    shortcut: '4',
    updatedAt: 0,
  },
  {
    id: 'clear',
    name: 'Clear Speech',
    description: 'Crisp and intelligible. Tuned for meetings and calls.',
    tags: 'Low cut · Presence',
    builtIn: true,
    settings: variant((s) => {
      band(s, 0, { freq: 100 });
      band(s, 1, { gainDb: 0.5 });
      band(s, 2, { gainDb: -4, freq: 350, q: 1.2 });
      band(s, 3, { gainDb: 4.5, freq: 3500, q: 1.2 });
      band(s, 4, { gainDb: 3 });
      s.tone = { warmthDb: -0.6, presenceDb: 1 };
      s.warmth = { enabled: false, character: 'tape', drive: 10 };
    }),
    shortcut: '5',
    updatedAt: 0,
  },
  {
    id: 'condenser',
    name: 'Studio Condenser',
    description: 'Open, airy detail with a polished top end.',
    tags: 'Air · Detail',
    builtIn: true,
    settings: variant((s) => {
      band(s, 1, { gainDb: 1.5 });
      band(s, 2, { gainDb: -2 });
      band(s, 3, { gainDb: 2, freq: 4000 });
      band(s, 4, { gainDb: 5, freq: 9000 });
      s.compressor = { enabled: true, thresholdDb: -23, ratio: 2.5, attackMs: 14, releaseMs: 150 };
      s.warmth = { enabled: true, character: 'console', drive: 10 };
    }),
    shortcut: '6',
    updatedAt: 0,
  },
  {
    id: 'natural',
    name: 'Natural',
    description: 'Light cleanup only. Still you, just clearer and louder.',
    tags: 'Transparent',
    builtIn: true,
    settings: variant((s) => {
      setNoiseMode(s, 'light');
      s.pops.enabled = false;
      s.clicks.enabled = false;
      band(s, 1, { gainDb: 1 });
      band(s, 2, { gainDb: -1.5 });
      band(s, 3, { gainDb: 1 });
      band(s, 4, { gainDb: 1 });
      s.tone = { warmthDb: 0, presenceDb: 0 };
      s.compressor = { enabled: true, thresholdDb: -26, ratio: 2, attackMs: 15, releaseMs: 200 };
      s.warmth = { enabled: false, character: 'tape', drive: 10 };
      s.deEsser.reductionDb = -2;
      s.leveler.speed = 'gentle';
    }),
    shortcut: '7',
    updatedAt: 0,
  },
];

export const DEFAULT_LIVE: LiveControls = { enhancementOn: true, muted: false, boostDb: 26, hearOriginal: false };

export function builtInById(id: string): Profile | undefined {
  return BUILT_IN_PROFILES.find((p) => p.id === id);
}

export function settingsEqual(a: VoiceSettings, b: VoiceSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Fill any fields missing from an older saved profile with Broadcast's values.
export function normalizeSettings(raw: unknown): VoiceSettings {
  const base = cloneSettings(broadcast);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const out = base as unknown as Record<string, unknown>;
  for (const key of Object.keys(base)) {
    const v = r[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[key] = { ...(out[key] as object), ...(v as object) };
    }
  }
  const bands = (r.eq as { bands?: unknown } | undefined)?.bands;
  if (Array.isArray(bands) && bands.length === 5) base.eq.bands = bands.map((b, i) => ({ ...base.eq.bands[i], ...b }));
  return base;
}

export function newProfileId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---- Display helpers -------------------------------------------------------

export function fmtDb(v: number, digits = 1): string {
  const r = Number(v.toFixed(digits));
  if (r === 0) return (0).toFixed(digits) + ' dB';
  return (r < 0 ? '−' : '+') + Math.abs(r).toFixed(digits) + ' dB';
}

export function fmtFreq(f: number): string {
  return f >= 1000 ? `${Number((f / 1000).toFixed(f >= 10000 ? 0 : 1))} kHz` : `${Math.round(f)} Hz`;
}

export function signed(v: number, digits = 1): string {
  const r = Number(v.toFixed(digits));
  if (r === 0) return (0).toFixed(digits);
  return (r < 0 ? '−' : '+') + Math.abs(r).toFixed(digits);
}

// Magnitude response (dB) of the EQ plus tone and mic correction at frequency f, for curves on screen.
// RBJ biquad formulas, the same ones Web Audio's BiquadFilterNode uses.
export function biquadDb(type: EqBandType, f0: number, gainDb: number, q: number, f: number, fs = 48000): number {
  const w0 = (2 * Math.PI * f0) / fs;
  const A = Math.pow(10, gainDb / 40);
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  switch (type) {
    case 'highpass':
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'lowshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) - (A - 1) * cos + s); b1 = 2 * A * ((A - 1) - (A + 1) * cos); b2 = A * ((A + 1) - (A - 1) * cos - s);
      a0 = (A + 1) + (A - 1) * cos + s; a1 = -2 * ((A - 1) + (A + 1) * cos); a2 = (A + 1) + (A - 1) * cos - s;
      break;
    }
    case 'highshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) + (A - 1) * cos + s); b1 = -2 * A * ((A - 1) + (A + 1) * cos); b2 = A * ((A + 1) + (A - 1) * cos - s);
      a0 = (A + 1) - (A - 1) * cos + s; a1 = 2 * ((A - 1) - (A + 1) * cos); a2 = (A + 1) - (A - 1) * cos - s;
      break;
    }
    default:
      b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A;
      a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
  }
  const w = (2 * Math.PI * f) / fs;
  const re = (c0: number, c1: number, c2: number) => c0 + c1 * Math.cos(w) + c2 * Math.cos(2 * w);
  const im = (c1: number, c2: number) => -(c1 * Math.sin(w) + c2 * Math.sin(2 * w));
  const num = Math.hypot(re(b0, b1, b2), im(b1, b2));
  const den = Math.hypot(re(a0, a1, a2), im(a1, a2));
  return 20 * Math.log10(num / den);
}

// The EQ bands the engine actually runs: profile bands with the Studio tone sliders added.
export function effectiveBands(s: VoiceSettings): EqBand[] {
  return s.eq.bands.map((b, i) => {
    if (i === 1) return { ...b, gainDb: b.gainDb + s.tone.warmthDb };
    if (i === 3) return { ...b, gainDb: b.gainDb + s.tone.presenceDb };
    return b;
  });
}

export function micCorrectionBands(s: VoiceSettings): EqBand[] {
  const k = s.micCorrection.strength / 100;
  return [
    { name: 'Body', type: 'lowshelf', freq: 180, gainDb: s.micCorrection.bodyDb * k, q: 0.7 },
    { name: 'Boxiness', type: 'peaking', freq: 650, gainDb: s.micCorrection.boxinessDb * k, q: 1.2 },
    { name: 'Harshness', type: 'peaking', freq: 4000, gainDb: s.micCorrection.harshnessDb * k, q: 1.2 },
  ];
}

export function eqResponseDb(bands: EqBand[], f: number, includeHighpass = true): number {
  let db = 0;
  for (const b of bands) {
    if (b.type === 'highpass') {
      if (includeHighpass) db += 1.5 * biquadDb('highpass', b.freq, 0, b.q, f); // 3rd-order ≈ 18 dB/oct
    } else if (b.gainDb !== 0) {
      db += biquadDb(b.type, b.freq, b.gainDb, b.q, f);
    }
  }
  return db;
}

// SVG path for a profile's sound signature, in a width×height box, ±range dB.
export function curvePath(bands: EqBand[], width: number, height: number, rangeDb = 8, points = 64): string {
  const mid = height / 2;
  const out: string[] = [];
  for (let i = 0; i <= points; i++) {
    const f = 20 * Math.pow(1000, i / points);
    const db = Math.max(-rangeDb, Math.min(rangeDb, eqResponseDb(bands, f)));
    const x = (i / points) * width;
    const y = mid - (db / rangeDb) * (mid - 2);
    out.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return out.join(' ');
}
