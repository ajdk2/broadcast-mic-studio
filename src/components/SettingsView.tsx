import React, { useEffect, useState } from 'react';
import { useStudio } from '../state/store';
import { AppPrefs, Shortcuts, Theme } from '../state/prefs';
import { Quality } from '../audio/chain';
import { CABLE_PLAYBACK_NAME, findCablePlayback, isCablePlayback } from '../routing';
import { Icon, Keys, Modal, Segmented, Switch } from '../ui/kit';

export function SettingsView() {
  const s = useStudio();
  const p = s.prefs;
  const [licenses, setLicenses] = useState(false);
  const [versions, setVersions] = useState<{ app: string; electron: string } | null>(null);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  useEffect(() => {
    window.studioAPI?.getVersions().then(setVersions);
  }, []);

  const selectedOutput = s.outputs.find((d) => d.deviceId === p.outputId);
  const cable = findCablePlayback(s.outputs);
  const sendingToCable = !!selectedOutput && isCablePlayback(selectedOutput.label);
  const outputHint = sendingToCable
    ? 'Apps set to CABLE Output hear your enhanced voice'
    : cable
    ? `Choose ${CABLE_PLAYBACK_NAME} so your apps can hear you`
    : 'Install VB-Audio Cable so your apps can hear you';
  const ms = (n: number) => ((n / p.sampleRate) * 1000).toFixed(1);

  return (
    <div className="page">
      <div className="page-head">
        <div className="col" style={{ gap: 6 }}>
          <h1 className="h1">Settings</h1>
          <span className="faint">Changes save automatically.</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
        <div className="col" style={{ gap: 24 }}>
          <section aria-labelledby="gen-h" className="card col" style={{ padding: '20px 24px 8px' }}>
            <h2 id="gen-h" className="h3" style={{ marginBottom: 8 }}>General</h2>
            <Row title="Start Aurel when Windows starts" sub="Your voice is enhanced before your first meeting">
              <Switch label="Start with Windows" checked={p.startWithWindows} onChange={(v) => s.setPrefs({ startWithWindows: v })} disabled={!window.studioAPI} />
            </Row>
            <Row title="Start in the system tray" sub="Opens quietly without showing this window">
              <Switch label="Start in tray" checked={p.startInTray} onChange={(v) => s.setPrefs({ startInTray: v })} disabled={!window.studioAPI || !p.startWithWindows} />
            </Row>
            <Row title="When I close the window" sub={p.closeAction === 'tray' ? 'Apps using CABLE Output keep working' : 'Your apps stop hearing you until Aurel is opened again'}>
              <select className="select" aria-label="When I close the window" value={p.closeAction} onChange={(e) => s.setPrefs({ closeAction: e.target.value as AppPrefs['closeAction'] })}>
                <option value="tray">Keep running in the tray</option>
                <option value="quit">Quit Aurel</option>
              </select>
            </Row>
            <Row title="Alert me if my mic disconnects" sub="A notification, so you’re never silent by surprise">
              <Switch label="Disconnect alerts" checked={p.alertDisconnect} onChange={(v) => s.setPrefs({ alertDisconnect: v })} />
            </Row>
          </section>

          <section aria-labelledby="eng-h" className="card col" style={{ padding: '20px 24px 8px' }}>
            <h2 id="eng-h" className="h3" style={{ marginBottom: 8 }}>Audio engine</h2>
            <Row title="Microphone">
              <select className="select" aria-label="Microphone" value={p.inputId} onChange={(e) => s.setPrefs({ inputId: e.target.value })} style={{ maxWidth: 340 }}>
                {!s.inputs.some((d) => d.deviceId === p.inputId) && <option value={p.inputId}>{p.inputId ? `${s.inputLabel} (not connected)` : 'Choose a microphone'}</option>}
                {s.inputs.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
              </select>
            </Row>
            <Row title="Send my voice to" sub={outputHint} subColor={sendingToCable ? undefined : 'var(--accent-text)'}>
              <select className="select" aria-label="Send my voice to" value={selectedOutput ? p.outputId : ''} onChange={(e) => s.setPrefs({ outputId: e.target.value })} style={{ maxWidth: 340 }}>
                <option value="">Nowhere yet</option>
                {s.outputs.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
              </select>
            </Row>
            <Row title="Monitor through" sub="Where you hear yourself when monitoring is on">
              <select className="select" aria-label="Monitor through" value={p.monitorId} onChange={(e) => s.setPrefs({ monitorId: e.target.value })} style={{ maxWidth: 340 }}>
                <option value="">Windows default output</option>
                {s.outputs.filter((d) => !isCablePlayback(d.label)).map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
              </select>
            </Row>
            <Row title="Sample rate">
              <Segmented<AppPrefs['sampleRate']>
                label="Sample rate"
                value={p.sampleRate}
                options={[44100, 48000, 96000].map((v) => ({ value: v as AppPrefs['sampleRate'], label: <span className="mono">{Number((v / 1000).toFixed(1))} kHz</span> }))}
                onChange={(v) => s.setPrefs({ sampleRate: v })}
              />
            </Row>
            <Row title="Latency" sub="Lower is snappier; raise it if you hear crackles">
              <select className="select mono" aria-label="Latency" value={p.bufferSize} onChange={(e) => s.setPrefs({ bufferSize: Number(e.target.value) as AppPrefs['bufferSize'] })}>
                {[128, 256, 512].map((n) => <option key={n} value={n}>{n} samples · {ms(n)} ms buffer</option>)}
              </select>
            </Row>
            <Row title="Processing quality" sub="Best uses more CPU and adds a little delay for cleaner noise removal">
              <Segmented<Quality>
                label="Processing quality"
                value={p.quality}
                options={[
                  { value: 'light', label: 'Light on CPU' },
                  { value: 'balanced', label: 'Balanced' },
                  { value: 'best', label: 'Best' },
                ]}
                onChange={(v) => s.setPrefs({ quality: v })}
              />
            </Row>
          </section>

          <section aria-labelledby="app-h" className="card col" style={{ padding: '20px 24px 8px' }}>
            <h2 id="app-h" className="h3" style={{ marginBottom: 8 }}>Appearance</h2>
            <Row title="Theme">
              <Segmented<Theme>
                label="Theme"
                value={p.theme}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                  { value: 'system', label: 'Match Windows' },
                ]}
                onChange={(v) => s.setPrefs({ theme: v })}
              />
            </Row>
            <Row title={<span className="small faint">Aurel {versions?.app || '1.0'}{versions ? ` · Electron ${versions.electron}` : ''}</span>}>
              <button className="small" style={{ color: 'var(--accent-text)', fontWeight: 500 }} onClick={() => setLicenses(true)}>Open-source licenses</button>
            </Row>
          </section>
        </div>

        <div className="col" style={{ gap: 24 }}>
          <ShortcutsCard />

          <section aria-labelledby="priv-h" className="card col" style={{ padding: '20px 24px', gap: 18 }}>
            <div className="row" style={{ gap: 14 }}>
              <span className="row" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--success-tint)', justifyContent: 'center', color: 'var(--success-text)' }}>
                <Icon name="shield" size={20} />
              </span>
              <div className="col" style={{ gap: 2 }}>
                <h2 id="priv-h" className="h3">Private and fully offline</h2>
                <span className="small faint">Nothing about your voice ever leaves this PC</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 16px' }}>
              {['No account or sign-in', 'All processing on this PC', 'No recordings kept', 'No usage tracking'].map((t) => (
                <span key={t} className="row small muted" style={{ gap: 8 }}><Icon name="check" size={14} strokeWidth={2.4} style={{ color: 'var(--success)' }} />{t}</span>
              ))}
            </div>
            <div className="row divider-top" style={{ justifyContent: 'space-between', gap: 16, paddingTop: 16 }}>
              <div className="col" style={{ gap: 2 }}>
                <span className="small" style={{ fontWeight: 500 }}>Updates</span>
                <span className="xsmall faint">{updateMsg || 'Aurel never checks online. Install a new version from a file.'}</span>
              </div>
              <button
                className="btn"
                disabled={!window.studioAPI}
                onClick={async () => {
                  const ok = await window.studioAPI!.installUpdateFromFile();
                  setUpdateMsg(ok ? 'Installer started. Aurel will close when it runs.' : null);
                }}
              >
                Install update from file…
              </button>
            </div>
          </section>
        </div>
      </div>
      {licenses && <LicensesModal onClose={() => setLicenses(false)} />}
    </div>
  );
}

function Row({ title, sub, subColor, children }: { title: React.ReactNode; sub?: string; subColor?: string; children: React.ReactNode }) {
  return (
    <div className="list-row">
      <div className="col" style={{ gap: 2, padding: '10px 0', minWidth: 0 }}>
        {typeof title === 'string' ? <span style={{ fontSize: 14 }}>{title}</span> : title}
        {sub && <span className="xsmall" style={{ color: subColor || 'var(--text-tertiary)' }}>{sub}</span>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

const SHORTCUT_ROWS: { key: keyof Shortcuts; label: string; sub?: string }[] = [
  { key: 'mute', label: 'Mute my mic' },
  { key: 'hearOriginal', label: 'Hear original (hold)', sub: 'Your raw mic in your headphones while held' },
  { key: 'nextProfile', label: 'Next profile' },
  { key: 'pushToTalk', label: 'Push to talk', sub: 'When set, your mic stays muted unless you hold it' },
];

// Turns a keydown into an Electron accelerator, e.g. "Ctrl+Alt+M". Needs Ctrl or Alt.
function accelerator(e: KeyboardEvent): string | null {
  const key = e.key.length === 1 ? e.key.toUpperCase() : /^F\d+$/.test(e.key) ? e.key : e.key === ' ' ? 'Space' : null;
  if (!key || ['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key)) return null;
  if (!e.ctrlKey && !e.altKey && !/^F\d+$/.test(key)) return null;
  return [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', key].filter(Boolean).join('+');
}

function ShortcutsCard() {
  const s = useStudio();
  const [capturing, setCapturing] = useState<keyof Shortcuts | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') return setCapturing(null);
      if (e.key === 'Backspace' || e.key === 'Delete') {
        s.setPrefs({ shortcuts: { ...s.prefs.shortcuts, [capturing]: null } });
        return setCapturing(null);
      }
      const acc = accelerator(e);
      if (!acc) return;
      if (/^Ctrl\+Alt\+[0-9]$/.test(acc)) {
        setError('Ctrl Alt and a number are kept for switching profiles.');
        return;
      }
      const clash = (Object.keys(s.prefs.shortcuts) as (keyof Shortcuts)[]).find((k) => k !== capturing && s.prefs.shortcuts[k] === acc);
      const next = { ...s.prefs.shortcuts, [capturing]: acc };
      if (clash) next[clash] = null;
      s.setPrefs({ shortcuts: next });
      setError(null);
      setCapturing(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [capturing, s]);

  return (
    <section aria-labelledby="key-h" className="card col" style={{ padding: '20px 24px 8px' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 id="key-h" className="h3">Keyboard shortcuts</h2>
        <span className="xsmall faint">{window.studioAPI ? 'Work in any app, even full screen' : 'Work while this window has focus'}</span>
      </div>
      {SHORTCUT_ROWS.map((r) => (
        <div key={r.key} className="list-row">
          <div className="col" style={{ gap: 2, padding: '10px 0' }}>
            <span style={{ fontSize: 14 }}>{r.label}</span>
            {r.sub && <span className="xsmall faint">{r.sub}</span>}
          </div>
          <div className="row" style={{ gap: 10 }}>
            {capturing === r.key ? (
              <span className="small" style={{ color: 'var(--accent-text)' }}>Press keys… Esc cancels, Backspace clears</span>
            ) : s.prefs.shortcuts[r.key] ? (
              <Keys acc={s.prefs.shortcuts[r.key]} />
            ) : null}
            <button className={s.prefs.shortcuts[r.key] ? 'btn btn-ghost btn-sm' : 'btn btn-sm'} onClick={() => { setError(null); setCapturing(capturing === r.key ? null : r.key); }}>
              {capturing === r.key ? 'Cancel' : s.prefs.shortcuts[r.key] ? 'Change' : 'Set shortcut'}
            </button>
          </div>
        </div>
      ))}
      {error && <p className="xsmall" role="alert" style={{ color: 'var(--error-text)', padding: '0 0 12px' }}>{error}</p>}
    </section>
  );
}

const LICENSES: [string, string][] = [
  ['Electron', 'MIT'],
  ['React', 'MIT'],
  ['better-sqlite3', 'MIT'],
  ['Vite', 'MIT'],
  ['Geist and Geist Mono (Vercel)', 'SIL Open Font License 1.1'],
  ['VB-Audio Virtual Cable (installed separately)', 'Donationware, © VB-Audio Software'],
];

function LicensesModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal label="Open-source licenses" onClose={onClose} width={520}>
      <div className="col" style={{ gap: 16, padding: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Open-source licenses</h2>
        <p className="small muted">Aurel is built with these projects. Thank you to their authors.</p>
        <div className="col">
          {LICENSES.map(([name, lic]) => (
            <div key={name} className="list-row" style={{ minHeight: 44 }}>
              <span className="small">{name}</span>
              <span className="small faint">{lic}</span>
            </div>
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-lg" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}
