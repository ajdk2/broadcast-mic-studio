import { Quality } from '../audio/chain';
import { DEFAULT_LIVE, LiveControls, Profile, VoiceSettings, normalizeSettings } from '../voice/model';

export type MicCorrection = VoiceSettings['micCorrection'];

export type Theme = 'dark' | 'light' | 'system';
export type CloseAction = 'tray' | 'quit';

export interface Shortcuts {
  mute: string | null;
  hearOriginal: string | null;
  nextProfile: string | null;
  pushToTalk: string | null;
}

export interface AppPrefs {
  inputId: string;
  outputId: string;
  monitorId: string;
  // Device names, to find the same device again if Windows gives it a new id.
  deviceLabels: Record<string, string>;
  sampleRate: 44100 | 48000 | 96000;
  bufferSize: 128 | 256 | 512;
  quality: Quality;
  theme: Theme;
  startWithWindows: boolean;
  startInTray: boolean;
  closeAction: CloseAction;
  alertDisconnect: boolean;
  shortcuts: Shortcuts;
  monitorVolume: number;
  setupDone: boolean;
  tourDone: boolean;
  activeProfileId: string;
  live: Pick<LiveControls, 'boostDb' | 'enhancementOn'>;
  working: VoiceSettings | null; // unsaved Fine-tune edits
  // Mic correction belongs to the microphone, not the profile: keyed by input device id.
  micCorrections: Record<string, MicCorrection>;
}

export const DEFAULT_PREFS: AppPrefs = {
  inputId: '',
  outputId: '',
  monitorId: '',
  deviceLabels: {},
  sampleRate: 48000,
  bufferSize: 256,
  quality: 'balanced',
  theme: 'dark',
  startWithWindows: true,
  startInTray: true,
  closeAction: 'tray',
  alertDisconnect: true,
  shortcuts: { mute: 'Ctrl+Alt+M', hearOriginal: 'Ctrl+Alt+B', nextProfile: 'Ctrl+Alt+P', pushToTalk: null },
  monitorVolume: 0.85,
  setupDone: false,
  tourDone: false,
  activeProfileId: 'broadcast',
  live: { boostDb: DEFAULT_LIVE.boostDb, enhancementOn: true },
  working: null,
  micCorrections: {},
};

export const DEFAULT_MIC_CORRECTION: MicCorrection = { enabled: true, bodyDb: 0, boxinessDb: 0, harshnessDb: 0, strength: 80, measured: false };

const LS_PREFS = 'aurel.prefs';
const LS_PROFILES = 'aurel.profiles';

// In the Electron app these live in SQLite; in a plain browser (npm run dev:vite) in localStorage.
export async function loadPrefs(): Promise<AppPrefs> {
  let raw: unknown = null;
  try {
    raw = window.studioAPI ? await window.studioAPI.getPrefs() : JSON.parse(localStorage.getItem(LS_PREFS) || 'null');
  } catch {
    raw = null;
  }
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFS };
  const r = raw as Partial<AppPrefs>;
  return {
    ...DEFAULT_PREFS,
    ...r,
    shortcuts: { ...DEFAULT_PREFS.shortcuts, ...(r.shortcuts || {}) },
    live: { ...DEFAULT_PREFS.live, ...(r.live || {}) },
    working: r.working ? normalizeSettings(r.working) : null,
    micCorrections: r.micCorrections && typeof r.micCorrections === 'object' ? r.micCorrections : {},
    deviceLabels: r.deviceLabels && typeof r.deviceLabels === 'object' ? r.deviceLabels : {},
  };
}

export async function savePrefs(p: AppPrefs): Promise<void> {
  try {
    if (window.studioAPI) await window.studioAPI.savePrefs(p);
    else localStorage.setItem(LS_PREFS, JSON.stringify(p));
  } catch (e) {
    console.error('Could not save settings', e);
  }
}

export async function loadStoredProfiles(): Promise<Profile[]> {
  let rows: unknown[] = [];
  try {
    rows = window.studioAPI ? await window.studioAPI.listProfiles() : JSON.parse(localStorage.getItem(LS_PROFILES) || '[]');
  } catch {
    rows = [];
  }
  return rows.map(parseProfile).filter((p): p is Profile => !!p);
}

export function parseProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Profile>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
  return {
    id: r.id,
    name: r.name.slice(0, 60),
    description: typeof r.description === 'string' ? r.description : '',
    tags: typeof r.tags === 'string' ? r.tags : '',
    builtIn: !!r.builtIn,
    basedOn: typeof r.basedOn === 'string' ? r.basedOn : undefined,
    settings: normalizeSettings(r.settings),
    shortcut: typeof r.shortcut === 'string' && /^[0-9]$/.test(r.shortcut) ? r.shortcut : undefined,
    rule: r.rule && typeof r.rule.exe === 'string' ? { app: String(r.rule.app), exe: r.rule.exe, enabled: !!r.rule.enabled } : undefined,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
  };
}

export async function storeProfile(p: Profile): Promise<void> {
  try {
    if (window.studioAPI) await window.studioAPI.saveProfile(p);
    else {
      const all = JSON.parse(localStorage.getItem(LS_PROFILES) || '[]') as Profile[];
      localStorage.setItem(LS_PROFILES, JSON.stringify([...all.filter((x) => x.id !== p.id), p]));
    }
  } catch (e) {
    console.error('Could not save profile', e);
    throw e;
  }
}

export async function removeStoredProfile(id: string): Promise<void> {
  if (window.studioAPI) await window.studioAPI.deleteProfile(id);
  else {
    const all = JSON.parse(localStorage.getItem(LS_PROFILES) || '[]') as Profile[];
    localStorage.setItem(LS_PROFILES, JSON.stringify(all.filter((x) => x.id !== id)));
  }
}
