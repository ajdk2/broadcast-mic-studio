import React, { useEffect, useRef, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { StudioView } from './components/StudioView';
import { ProfilesView } from './components/ProfilesView';
import { FineTuneView } from './components/FineTuneView';
import { ConnectAppsView } from './components/ConnectAppsView';
import { SettingsView } from './components/SettingsView';
import { TestSoundModal } from './components/TestSoundModal';
import { SaveProfileModal } from './components/SaveProfileModal';
import { DeleteProfileModal } from './components/DeleteProfileModal';
import { VoiceCheckWizard } from './components/VoiceCheckWizard';
import { InPageNotifications } from './components/NotificationsDrawer';
import { EngineProblem } from './components/EngineProblem';
import { FirstRunTour } from './components/FirstRunTour';
import { engine } from './audio/engine';
import { StudioProvider, Studio, Tab, useMeters, useStudio } from './state/store';
import { Command } from './state/notifications';
import { NOISE_MODES, NoiseMode, setNoiseMode } from './voice/model';
import { useTheme } from './ui/useTheme';
import { useCpu } from './ui/useCpu';

export default function App() {
  return (
    <StudioProvider>
      <Shell />
    </StudioProvider>
  );
}

function Shell() {
  const s = useStudio();
  useTheme(s.prefs.theme);
  useCommandBridge();
  useShortcutBridge();
  useTrayPublisher();
  useElectronPrefsSync();

  if (!s.ready) return <div style={{ flexGrow: 1, background: 'var(--bg-canvas)' }} />;

  if (s.modals.setup) {
    return (
      <>
        <TitleBar title="Aurel Voice Studio — Setup" />
        <VoiceCheckWizard />
      </>
    );
  }

  return (
    <>
      <TitleBar />
      <div style={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar />
        <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {s.status.state === 'error' ? (
              <EngineProblem />
            ) : (
              <>
                {s.tab === 'studio' && <StudioView />}
                {s.tab === 'profiles' && <ProfilesView />}
                {s.tab === 'finetune' && <FineTuneView />}
                {s.tab === 'connect' && <ConnectAppsView />}
                {s.tab === 'settings' && <SettingsView />}
              </>
            )}
          </div>
          <Footer />
        </main>
      </div>
      {s.modals.testSound && <TestSoundModal />}
      {s.modals.saveProfile && <SaveProfileModal />}
      {s.modals.deleteProfileId && <DeleteProfileModal />}
      {!s.prefs.tourDone && s.tab === 'studio' && s.status.state !== 'error' && <FirstRunTour />}
      <InPageNotifications />
    </>
  );
}

function Footer() {
  const s = useStudio();
  const cpu = useCpu();
  const [version, setVersion] = useState('1.0');
  useEffect(() => {
    window.studioAPI?.getVersions().then((v) => setVersion(v.app.replace(/\.0$/, '')));
  }, []);
  const st = s.status;
  const lost = st.inputLost || s.inputMissing;
  const dot = st.state === 'running' && !lost ? 'var(--success)' : st.state === 'error' || lost ? 'var(--live)' : 'var(--text-tertiary)';
  const label =
    lost ? 'Audio engine paused · waiting for input'
    : st.state === 'running' ? 'Audio engine running'
    : st.state === 'starting' ? 'Starting audio engine…'
    : st.state === 'error' ? 'Audio engine stopped'
    : 'Audio engine off';
  return (
    <footer className="row xsmall faint" style={{ height: 30, flexShrink: 0, justifyContent: 'space-between', padding: '0 40px', borderTop: '1px solid var(--border-titlebar)', background: 'var(--bg-footer)' }}>
      <div className="row" style={{ gap: 20 }}>
        <span className="row muted" style={{ gap: 6 }}>
          <span className="dot" style={{ width: 7, height: 7, background: dot }} />
          {label}
        </span>
        {st.state === 'running' && !lost && (
          <span className="mono">
            {Number((st.sampleRate / 1000).toFixed(1))} kHz · buffer {s.prefs.bufferSize} · total delay {st.latencyMs.toFixed(1)} ms
          </span>
        )}
      </div>
      <div className="row" style={{ gap: 20 }}>
        {cpu !== null && <span className="mono">CPU {cpu.toFixed(1)}%</span>}
        <span>No internet needed</span>
        <span className="mono">v{version}</span>
      </div>
    </footer>
  );
}

// Commands from the tray panel and notification pop-ups.
export function runCommand(s: Studio, cmd: Command) {
  switch (cmd.type) {
    case 'setLive':
      s.setLive(cmd.patch);
      break;
    case 'selectProfile':
      s.selectProfile(cmd.id);
      break;
    case 'useInput':
      s.setPrefs({ inputId: cmd.id });
      break;
    case 'showMain':
      if (cmd.tab) s.setTab(cmd.tab as Tab);
      window.studioAPI?.showMainWindow();
      break;
    case 'setMonitor':
      s.setMonitorOn(cmd.on);
      break;
    case 'cycleNoise': {
      const order: NoiseMode[] = ['off', 'light', 'balanced', 'strong'];
      s.updateWorking((w) => {
        const cur = w.noise.enabled ? w.noise.mode : 'off';
        setNoiseMode(w, order[(order.indexOf(cur) + 1) % order.length]);
      });
      break;
    }
    case 'nextProfile': {
      const i = s.profiles.findIndex((p) => p.id === s.active.id);
      s.selectProfile(s.profiles[(i + 1) % s.profiles.length].id);
      break;
    }
  }
}

function useCommandBridge() {
  const s = useStudio();
  const ref = useRef(s);
  ref.current = s;
  useEffect(() => {
    if (!window.studioAPI) return;
    return window.studioAPI.onCommand((cmd) => runCommand(ref.current, cmd as Command));
  }, []);
}

// Global shortcuts (Settings › Keyboard shortcuts), plus Ctrl+Alt+<digit> per profile.
function useShortcutBridge() {
  const s = useStudio();
  const ref = useRef(s);
  ref.current = s;
  const { shortcuts } = s.prefs;
  const profileKeys = s.profiles.filter((p) => p.shortcut).map((p) => p.shortcut).join(',');
  const monitorBefore = useRef(false);

  // Push-to-talk: while a key is set, the mic stays muted except while it's held.
  useEffect(() => {
    if (!s.ready) return;
    s.setLive({ muted: !!shortcuts.pushToTalk });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcuts.pushToTalk, s.ready]);

  useEffect(() => {
    if (!s.ready) return;
    const map: Record<string, string | null> = { ...shortcuts };
    for (const d of profileKeys.split(',').filter(Boolean)) map[`profile${d}`] = `Ctrl+Alt+${d}`;
    const handle = (action: string, phase: 'down' | 'up') => {
      const st = ref.current;
      if (action === 'mute' && phase === 'down') st.setLive({ muted: !st.live.muted });
      else if (action === 'hearOriginal') {
        // Hold to hear your raw mic in your headphones; apps keep getting the enhanced voice.
        if (phase === 'down') {
          monitorBefore.current = st.monitorOn;
          st.setLive({ hearOriginal: true });
          st.setMonitorOn(true);
        } else {
          st.setLive({ hearOriginal: false });
          st.setMonitorOn(monitorBefore.current);
        }
      }
      else if (action === 'pushToTalk') st.setLive({ muted: phase === 'up' });
      else if (action === 'nextProfile' && phase === 'down') runCommand(st, { type: 'nextProfile' });
      else if (action.startsWith('profile') && phase === 'down') {
        const p = st.profiles.find((x) => x.shortcut === action.slice(7));
        if (p) st.selectProfile(p.id);
      }
    };
    if (window.studioAPI) {
      window.studioAPI.setShortcuts(map);
      return window.studioAPI.onShortcut(handle);
    }
    // Plain browser: shortcuts work while the page has focus. Key-up of any key in a held
    // combination ends a hold.
    const held = new Set<string>();
    const match = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const parts = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', key].filter(Boolean).join('+');
      return Object.entries(map).find(([, acc]) => acc === parts)?.[0];
    };
    const down = (e: KeyboardEvent) => {
      const a = match(e);
      if (a && !e.repeat) {
        e.preventDefault();
        held.add(a);
        handle(a, 'down');
      }
    };
    const up = () => {
      held.forEach((a) => handle(a, 'up'));
      held.clear();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.ready, shortcuts.mute, shortcuts.hearOriginal, shortcuts.nextProfile, shortcuts.pushToTalk, profileKeys]);
}

export interface TrayState {
  enhancementOn: boolean;
  muted: boolean;
  boostDb: number;
  monitorOn: boolean;
  hearOriginal: boolean;
  noiseLabel: string;
  noiseOn: boolean;
  profileId: string;
  profiles: { id: string; name: string }[];
  outLufs: number;
  onTarget: 'on' | 'low' | 'high' | 'off';
  statusText: string;
  wave: number[];
  muteKeys: string | null;
  theme: 'light' | 'dark';
}

// Sends a small snapshot to the tray panel window a few times a second.
function useTrayPublisher() {
  const s = useStudio();
  const m = useMeters(250);
  useEffect(() => {
    if (!window.studioAPI || !s.ready) return;
    const lufs = m.out.shortTermLufs;
    const onTarget = !s.live.enhancementOn ? 'off' : lufs > -18.5 && lufs < -13.5 ? 'on' : lufs <= -18.5 ? 'low' : 'high';
    const noiseOn = s.working.noise.enabled && s.working.noise.mode !== 'off';
    const state: TrayState = {
      enhancementOn: s.live.enhancementOn,
      muted: s.live.muted,
      boostDb: s.live.boostDb,
      monitorOn: s.monitorOn,
      hearOriginal: s.live.hearOriginal,
      noiseOn,
      noiseLabel: NOISE_MODES[noiseOn ? s.working.noise.mode : 'off'].label,
      profileId: s.active.id,
      profiles: s.profiles.map((p) => ({ id: p.id, name: p.name })),
      outLufs: lufs,
      onTarget,
      statusText:
        s.status.state !== 'running' ? 'Audio engine stopped'
        : s.status.inputLost ? 'Mic unplugged'
        : s.live.muted ? 'Muted'
        : s.live.enhancementOn ? 'Enhancing'
        : 'Bypassed · raw mic',
      wave: Array.from(engine.outHistory.slice(-49)),
      muteKeys: s.prefs.shortcuts.mute,
      theme: document.documentElement.classList.contains('theme-light') ? 'light' : 'dark',
    };
    window.studioAPI.publishState(state);
  }, [s, m]);
}

// Main-process behaviour that follows Settings choices.
function useElectronPrefsSync() {
  const s = useStudio();
  const { startWithWindows, startInTray, closeAction } = s.prefs;
  useEffect(() => {
    if (!window.studioAPI || !s.ready) return;
    window.studioAPI.setLoginItem({ openAtLogin: startWithWindows, openInTray: startInTray });
  }, [startWithWindows, startInTray, s.ready]);
  useEffect(() => {
    if (!window.studioAPI || !s.ready) return;
    window.studioAPI.setCloseToTray(closeAction === 'tray');
  }, [closeAction, s.ready]);
}
