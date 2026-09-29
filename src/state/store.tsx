import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { engine, EngineStatus, MeterSnapshot } from '../audio/engine';
import { findCablePlayback } from '../routing';
import { AudioDeviceOption } from '../types';
import {
  BUILT_IN_PROFILES,
  DEFAULT_LIVE,
  LiveControls,
  Profile,
  ProfileRule,
  RULE_APPS,
  VoiceSettings,
  builtInById,
  cloneSettings,
  newProfileId,
  settingsEqual,
} from '../voice/model';
import { AppPrefs, DEFAULT_MIC_CORRECTION, DEFAULT_PREFS, MicCorrection, loadPrefs, loadStoredProfiles, parseProfile, removeStoredProfile, savePrefs, storeProfile } from './prefs';
import { AppNotification, NotificationAction, notify } from './notifications';

export type Tab = 'studio' | 'profiles' | 'finetune' | 'connect' | 'settings';

export interface SaveAsNewInput {
  name: string;
  shortcut?: string;
  rule?: ProfileRule;
  useNow: boolean;
}

export interface Studio {
  ready: boolean;
  tab: Tab;
  setTab: (t: Tab) => void;
  prefs: AppPrefs;
  setPrefs: (patch: Partial<AppPrefs>) => void;

  inputs: AudioDeviceOption[];
  outputs: AudioDeviceOption[];
  refreshDevices: () => Promise<void>;
  inputLabel: string;
  outputLabel: string;

  profiles: Profile[];
  active: Profile;
  working: VoiceSettings;
  edited: boolean;
  micCorrection: MicCorrection; // for the current mic
  setMicCorrection: (patch: Partial<MicCorrection>) => void;
  live: LiveControls;
  monitorOn: boolean;

  selectProfile: (id: string) => void;
  updateWorking: (fn: (s: VoiceSettings) => void) => void;
  resetWorking: () => void;
  updateActiveFromWorking: () => Promise<void>;
  saveAsNew: (input: SaveAsNewInput) => Promise<Profile>;
  duplicateProfile: (id: string) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<void>;
  resetProfile: (id: string) => Promise<void>;
  patchProfile: (id: string, patch: Partial<Pick<Profile, 'name' | 'shortcut' | 'rule'>>) => Promise<void>;
  exportProfile: (id: string) => Promise<boolean>;
  importProfile: () => Promise<Profile | null>;

  setLive: (patch: Partial<LiveControls>) => void;
  setMonitorOn: (on: boolean) => void;
  status: EngineStatus;
  inputMissing: boolean; // the chosen mic isn't connected
  restartEngine: () => void;

  modals: { testSound: boolean; saveProfile: boolean; deleteProfileId: string | null; setup: boolean };
  openModal: (m: Partial<Studio['modals']>) => void;
}

const Ctx = createContext<Studio | null>(null);

export function useStudio(): Studio {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStudio outside StudioProvider');
  return v;
}

// Re-renders at most every `ms` with the latest meters.
export function useMeters(ms = 50): MeterSnapshot {
  const [m, setM] = useState<MeterSnapshot>(engine.meters);
  useEffect(() => {
    let last = 0;
    return engine.onMeters((snap) => {
      const now = performance.now();
      if (now - last >= ms) {
        last = now;
        setM({ ...snap });
      }
    });
  }, [ms]);
  return m;
}

function mergeProfiles(stored: Profile[]): Profile[] {
  const builtIns = BUILT_IN_PROFILES.map((b) => {
    const override = stored.find((s) => s.id === b.id);
    return override ? { ...b, settings: override.settings, shortcut: override.shortcut ?? b.shortcut, rule: override.rule, updatedAt: override.updatedAt } : b;
  });
  const custom = stored.filter((s) => !builtInById(s.id)).map((s) => ({ ...s, builtIn: false }));
  return [...custom.sort((a, b) => a.updatedAt - b.updatedAt), ...builtIns];
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('studio');
  const [prefs, setPrefsState] = useState<AppPrefs>(DEFAULT_PREFS);
  const [profiles, setProfiles] = useState<Profile[]>(BUILT_IN_PROFILES);
  const [working, setWorking] = useState<VoiceSettings>(cloneSettings(BUILT_IN_PROFILES[0].settings));
  const [live, setLiveState] = useState<LiveControls>(DEFAULT_LIVE);
  const [monitorOn, setMonitorOnState] = useState(false);
  const [inputs, setInputs] = useState<AudioDeviceOption[]>([]);
  const [outputs, setOutputs] = useState<AudioDeviceOption[]>([]);
  const [status, setStatus] = useState<EngineStatus>(engine.status);
  const [modals, setModals] = useState<Studio['modals']>({ testSound: false, saveProfile: false, deleteProfileId: null, setup: false });
  const [engineKick, setEngineKick] = useState(0);

  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  // ---- Load ---------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const [p, stored] = await Promise.all([loadPrefs(), loadStoredProfiles()]);
      const all = mergeProfiles(stored);
      const active = all.find((x) => x.id === p.activeProfileId) || all.find((x) => x.id === 'broadcast')!;
      setProfiles(all);
      setPrefsState({ ...p, activeProfileId: active.id });
      setWorking(p.working ? p.working : cloneSettings(active.settings));
      setLiveState({ ...DEFAULT_LIVE, ...p.live });
      setModals((m) => ({ ...m, setup: !p.setupDone }));
      setReady(true);
    })();
  }, []);

  const setPrefs = useCallback((patch: Partial<AppPrefs>) => {
    setPrefsState((p) => ({ ...p, ...patch }));
  }, []);

  // Persist prefs (debounced).
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => savePrefs(prefs), 300);
    return () => clearTimeout(t);
  }, [prefs, ready]);

  const active = useMemo(() => profiles.find((p) => p.id === prefs.activeProfileId) || profiles.find((p) => p.id === 'broadcast')!, [profiles, prefs.activeProfileId]);
  const edited = !settingsEqual(working, active.settings);

  // Unsaved edits survive a restart.
  useEffect(() => {
    if (!ready) return;
    setPrefsState((p) => ({ ...p, working: edited ? working : null }));
  }, [working, edited, ready]);

  useEffect(() => {
    if (!ready) return;
    setPrefsState((p) => ({ ...p, live: { boostDb: live.boostDb, enhancementOn: live.enhancementOn } }));
  }, [live.boostDb, live.enhancementOn, ready]);

  // ---- Devices --------------------------------------------------------------
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const real = (d: MediaDeviceInfo) => d.deviceId !== 'default' && d.deviceId !== 'communications';
    const ins = devices.filter((d) => d.kind === 'audioinput' && real(d)).map((d) => ({ deviceId: d.deviceId, label: d.label || 'Microphone', kind: 'audioinput' as const }));
    const outs = devices.filter((d) => d.kind === 'audiooutput' && real(d)).map((d) => ({ deviceId: d.deviceId, label: d.label || 'Output device', kind: 'audiooutput' as const }));
    setInputs(ins);
    setOutputs(outs);
    const p = prefsRef.current;
    const patch: Partial<AppPrefs> = {};
    const labels = { ...p.deviceLabels };
    // Re-find a saved device by name when its id changed (driver update, new browser profile).
    const relink = (key: 'inputId' | 'outputId' | 'monitorId', list: AudioDeviceOption[]) => {
      const id = p[key];
      if (!id || !list.length || !list.every((d) => d.deviceId)) return;
      if (list.some((d) => d.deviceId === id)) {
        const label = list.find((d) => d.deviceId === id)!.label;
        if (labels[key] !== label) labels[key] = label;
        return;
      }
      const same = labels[key] && list.find((d) => d.label === labels[key]);
      if (same) {
        patch[key] = same.deviceId;
        // Mic correction follows the mic.
        if (key === 'inputId' && p.micCorrections[id] && !p.micCorrections[same.deviceId]) {
          patch.micCorrections = { ...p.micCorrections, [same.deviceId]: p.micCorrections[id] };
        }
      }
    };
    relink('inputId', ins);
    relink('outputId', outs);
    relink('monitorId', outs);
    if (JSON.stringify(labels) !== JSON.stringify(p.deviceLabels)) patch.deviceLabels = labels;
    // Keep a saved choice that's merely unplugged; the engine reports it as lost.
    if (!p.inputId && ins[0]?.deviceId) patch.inputId = ins[0].deviceId;
    if (!patch.outputId && (!p.outputId || !outs.some((d) => d.deviceId === p.outputId))) {
      const cable = findCablePlayback(outs);
      if (cable && cable.deviceId && cable.deviceId !== p.outputId) patch.outputId = cable.deviceId;
    }
    if (Object.keys(patch).length) setPrefs(patch);
  }, [setPrefs]);

  useEffect(() => {
    if (!ready) return;
    refreshDevices();
    const md = navigator.mediaDevices;
    md?.addEventListener?.('devicechange', refreshDevices);
    const poll = setInterval(refreshDevices, 5000);
    return () => {
      md?.removeEventListener?.('devicechange', refreshDevices);
      clearInterval(poll);
    };
  }, [ready, refreshDevices]);

  // ---- Engine ---------------------------------------------------------------
  const workingRef = useRef(working);
  workingRef.current = working;
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => engine.onStatus(setStatus), []);

  // Until mic permission is granted the browser hides device ids, so a saved mic can't be matched
  // yet; start anyway (which asks for permission) rather than calling it unplugged.
  const idsKnown = inputs.length > 0 && inputs.every((d) => d.deviceId);
  const inputPresent = !prefs.inputId || !idsKnown || inputs.some((d) => d.deviceId === prefs.inputId);
  const inputMissing = ready && !!prefs.inputId && idsKnown && !inputPresent;
  useEffect(() => {
    if (!ready || !inputPresent) return;
    // Device labels (and so ids) only appear once the mic permission is granted, which start() does.
    engine
      .start(
        { inputId: prefs.inputId, outputId: prefs.outputId, monitorId: prefs.monitorId, sampleRate: prefs.sampleRate, bufferSize: prefs.bufferSize, quality: prefs.quality },
        effectiveRef.current,
        liveRef.current
      )
      .then(() => refreshDevices());
    // Output and monitor changes are applied live below, without a restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, prefs.inputId, prefs.sampleRate, prefs.bufferSize, prefs.quality, inputPresent, engineKick]);

  useEffect(() => {
    if (ready) engine.setOutputDevice(prefs.outputId);
  }, [ready, prefs.outputId]);
  useEffect(() => {
    if (ready) engine.setMonitorDevice(prefs.monitorId);
  }, [ready, prefs.monitorId]);
  const micCorrection = prefs.micCorrections[prefs.inputId] || DEFAULT_MIC_CORRECTION;
  const setMicCorrection = useCallback(
    (patch: Partial<MicCorrection>) =>
      setPrefsState((p) => ({ ...p, micCorrections: { ...p.micCorrections, [p.inputId]: { ...(p.micCorrections[p.inputId] || DEFAULT_MIC_CORRECTION), ...patch } } })),
    []
  );
  const effective = useMemo(() => ({ ...working, micCorrection }), [working, micCorrection]);
  const effectiveRef = useRef(effective);
  effectiveRef.current = effective;
  useEffect(() => {
    engine.update(effective, live);
  }, [effective, live, status.state]);
  useEffect(() => {
    engine.setMonitor(monitorOn, prefs.monitorVolume);
  }, [monitorOn, prefs.monitorVolume, status.state]);

  // Mic unplugged mid-call: keep sending silence, tell the user, and resume when it's back.
  const lostRef = useRef(false);
  useEffect(() => {
    const lost = status.inputLost || inputMissing;
    if (lost && !lostRef.current && prefsRef.current.alertDisconnect) {
      const other = inputs.find((d) => d.deviceId !== prefs.inputId);
      notify({
        kind: 'unplugged',
        title: 'Your mic was unplugged',
        body: 'Your apps hear silence until it’s back. Aurel picks it up again on its own.',
        actions: [
          ...(other ? [{ label: `Use ${shortLabel(other.label)}`, command: { type: 'useInput', id: other.deviceId }, primary: true } as NotificationAction] : []),
          { label: 'Open Aurel', command: { type: 'showMain' } },
        ],
      });
    }
    lostRef.current = lost;
  }, [status.inputLost, inputMissing, inputs, prefs.inputId]);

  // ---- Profiles ---------------------------------------------------------------
  const selectProfile = useCallback(
    (id: string) => {
      const p = profiles.find((x) => x.id === id);
      if (!p) return;
      setPrefs({ activeProfileId: id });
      setWorking(cloneSettings(p.settings));
    },
    [profiles, setPrefs]
  );

  const updateWorking = useCallback((fn: (s: VoiceSettings) => void) => {
    setWorking((w) => {
      const next = cloneSettings(w);
      fn(next);
      return next;
    });
  }, []);

  const resetWorking = useCallback(() => setWorking(cloneSettings(active.settings)), [active]);

  const persist = useCallback(async (p: Profile) => {
    await storeProfile(p);
    setProfiles((list) => {
      const exists = list.some((x) => x.id === p.id);
      return exists ? list.map((x) => (x.id === p.id ? p : x)) : mergeProfiles([...list.filter((x) => !x.builtIn), p]);
    });
  }, []);

  const updateActiveFromWorking = useCallback(async () => {
    await persist({ ...active, settings: cloneSettings(working), updatedAt: Date.now() });
  }, [active, working, persist]);

  const freeShortcut = useCallback(
    async (digit: string | undefined, exceptId: string) => {
      if (!digit) return;
      for (const p of profiles) {
        if (p.id !== exceptId && p.shortcut === digit) await persist({ ...p, shortcut: undefined });
      }
    },
    [profiles, persist]
  );

  const saveAsNew = useCallback(
    async ({ name, shortcut, rule, useNow }: SaveAsNewInput) => {
      const base = active.builtIn ? active : builtInById(active.basedOn || '') || active;
      const p: Profile = {
        id: newProfileId(),
        name: name.trim() || 'My profile',
        description: `Based on ${base.name}`,
        tags: base.tags,
        builtIn: false,
        basedOn: base.id,
        settings: cloneSettings(working),
        shortcut,
        rule,
        updatedAt: Date.now(),
      };
      await freeShortcut(shortcut, p.id);
      await persist(p);
      // "Your edits move into the new profile. Broadcast goes back to its original sound."
      if (useNow) {
        setPrefs({ activeProfileId: p.id });
        setWorking(cloneSettings(p.settings));
      } else {
        setWorking(cloneSettings(active.settings));
      }
      return p;
    },
    [active, working, persist, freeShortcut, setPrefs]
  );

  const duplicateProfile = useCallback(
    async (id: string) => {
      const src = profiles.find((x) => x.id === id)!;
      const p: Profile = {
        ...src,
        id: newProfileId(),
        name: `${src.name} copy`.slice(0, 60),
        builtIn: false,
        basedOn: src.builtIn ? src.id : src.basedOn,
        description: src.builtIn ? `Based on ${src.name}` : src.description,
        settings: cloneSettings(src.settings),
        shortcut: undefined,
        rule: undefined,
        updatedAt: Date.now(),
      };
      await persist(p);
      return p;
    },
    [profiles, persist]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      const p = profiles.find((x) => x.id === id);
      if (!p || p.builtIn) return;
      await removeStoredProfile(id);
      setProfiles((list) => list.filter((x) => x.id !== id));
      if (prefs.activeProfileId === id) {
        const fallback = builtInById(p.basedOn || '') || BUILT_IN_PROFILES[0];
        setPrefs({ activeProfileId: fallback.id });
        setWorking(cloneSettings(profiles.find((x) => x.id === fallback.id)?.settings || fallback.settings));
      }
    },
    [profiles, prefs.activeProfileId, setPrefs]
  );

  const resetProfile = useCallback(
    async (id: string) => {
      const p = profiles.find((x) => x.id === id);
      if (!p) return;
      const factory = builtInById(p.builtIn ? p.id : p.basedOn || '');
      if (!factory) return;
      const next = { ...p, settings: cloneSettings(factory.settings), updatedAt: Date.now() };
      if (p.builtIn) {
        await removeStoredProfile(p.id);
        setProfiles((list) => list.map((x) => (x.id === p.id ? { ...factory, shortcut: p.shortcut, rule: p.rule } : x)));
        if (p.shortcut !== factory.shortcut || p.rule) await persist({ ...factory, shortcut: p.shortcut, rule: p.rule, updatedAt: Date.now() });
      } else {
        await persist(next);
      }
      if (prefs.activeProfileId === id) setWorking(cloneSettings(factory.settings));
    },
    [profiles, persist, prefs.activeProfileId]
  );

  const patchProfile = useCallback(
    async (id: string, patch: Partial<Pick<Profile, 'name' | 'shortcut' | 'rule'>>) => {
      const p = profiles.find((x) => x.id === id);
      if (!p) return;
      if ('shortcut' in patch) await freeShortcut(patch.shortcut, id);
      await persist({ ...p, ...patch, updatedAt: Date.now() });
    },
    [profiles, persist, freeShortcut]
  );

  const exportProfile = useCallback(
    async (id: string) => {
      const p = profiles.find((x) => x.id === id);
      if (!p) return false;
      const json = JSON.stringify({ format: 'aurel-profile', version: 1, profile: { ...p, builtIn: false, id: undefined } }, null, 2);
      if (window.studioAPI) return window.studioAPI.exportProfile(json, `${p.name}.aurel`);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = `${p.name}.aurel`;
      a.click();
      return true;
    },
    [profiles]
  );

  const importProfile = useCallback(async () => {
    let text: string | null = null;
    if (window.studioAPI) text = await window.studioAPI.importProfile();
    else {
      text = await new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.aurel,application/json';
        input.onchange = () => (input.files?.[0] ? input.files[0].text().then(resolve) : resolve(null));
        input.click();
      });
    }
    if (!text) return null;
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('That file isn’t an Aurel profile.');
    }
    const body = (data as { format?: string; profile?: unknown })?.format === 'aurel-profile' ? (data as { profile: unknown }).profile : data;
    const parsed = parseProfile({ ...(body as object), id: newProfileId() });
    if (!parsed) throw new Error('That file isn’t an Aurel profile.');
    const p: Profile = { ...parsed, builtIn: false, shortcut: undefined, updatedAt: Date.now() };
    await persist(p);
    return p;
  }, [persist]);

  // ---- Live ----------------------------------------------------------------------
  const setLive = useCallback((patch: Partial<LiveControls>) => setLiveState((l) => ({ ...l, ...patch })), []);
  const setMonitorOn = useCallback((on: boolean) => setMonitorOnState(on), []);
  const restartEngine = useCallback(() => setEngineKick((k) => k + 1), []);
  const openModal = useCallback((m: Partial<Studio['modals']>) => setModals((x) => ({ ...x, ...m })), []);

  // "Talking while muted?"
  const mutedTalkRef = useRef({ since: 0, told: false });
  useEffect(() => {
    return engine.onMeters((m) => {
      const r = mutedTalkRef.current;
      if (!liveRef.current.muted) {
        r.since = 0;
        r.told = false;
        return;
      }
      if (m.speaking) {
        if (!r.since) r.since = performance.now();
        if (!r.told && performance.now() - r.since > 1500) {
          r.told = true;
          notify({
            kind: 'muted-talk',
            title: 'Talking while muted?',
            body: 'Aurel heard you speak, but your apps can’t hear you.',
            actions: [{ label: 'Unmute', command: { type: 'setLive', patch: { muted: false } }, primary: true }],
            hint: prefsRef.current.shortcuts.mute?.replace(/\+/g, ' ') || undefined,
          });
        }
      } else r.since = 0;
    });
  }, []);

  // Auto-switch rules: poll which rule apps are running.
  const ruleStateRef = useRef<{ running: Set<string>; before: string | null }>({ running: new Set(), before: null });
  useEffect(() => {
    if (!ready || !window.studioAPI) return;
    const rules = profiles.filter((p) => p.rule?.enabled);
    if (!rules.length) return;
    const check = async () => {
      const exes = Array.from(new Set(rules.map((p) => p.rule!.exe)));
      const apps = await window.studioAPI!.getRunningApps(exes).catch(() => []);
      const st = ruleStateRef.current;
      for (const p of rules) {
        const exe = p.rule!.exe.toLowerCase();
        const running = apps.some((a) => a.exe.toLowerCase() === exe && a.running);
        const was = st.running.has(exe);
        if (running && !was) {
          st.running.add(exe);
          if (prefsRef.current.activeProfileId !== p.id) {
            st.before = prefsRef.current.activeProfileId;
            const prev = st.before;
            setPrefs({ activeProfileId: p.id });
            setWorking(cloneSettings(p.settings));
            notify({
              kind: 'rule',
              title: `Switched to ${p.name}`,
              body: `${p.rule!.app} opened, so your rule kicked in.`,
              actions: [{ label: 'Undo', command: { type: 'selectProfile', id: prev } }],
            });
          }
        } else if (!running && was) {
          st.running.delete(exe);
          if (prefsRef.current.activeProfileId === p.id && st.before) {
            const back = profiles.find((x) => x.id === st.before);
            if (back) {
              setPrefs({ activeProfileId: back.id });
              setWorking(cloneSettings(back.settings));
            }
            st.before = null;
          }
        }
      }
    };
    check();
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [ready, profiles, setPrefs]);

  const inputLabel = inputs.find((d) => d.deviceId === prefs.inputId)?.label || status.inputLabel || 'Microphone';
  const outputLabel = outputs.find((d) => d.deviceId === prefs.outputId)?.label || '';

  const value: Studio = {
    ready,
    tab,
    setTab,
    prefs,
    setPrefs,
    inputs,
    outputs,
    refreshDevices,
    inputLabel,
    outputLabel,
    profiles,
    active,
    working,
    edited,
    micCorrection,
    setMicCorrection,
    live,
    monitorOn,
    selectProfile,
    updateWorking,
    resetWorking,
    updateActiveFromWorking,
    saveAsNew,
    duplicateProfile,
    deleteProfile,
    resetProfile,
    patchProfile,
    exportProfile,
    importProfile,
    setLive,
    setMonitorOn,
    status,
    inputMissing,
    restartEngine,
    modals,
    openModal,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function shortLabel(label: string): string {
  const m = label.match(/\(([^)]+)\)/);
  const inner = m ? m[1] : label;
  return inner.length > 28 ? inner.slice(0, 26) + '…' : inner;
}

export { RULE_APPS };
export type { AppNotification };
