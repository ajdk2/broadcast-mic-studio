import React, { useCallback, useEffect, useState } from 'react';
import { useStudio } from '../state/store';
import { CABLE_PLAYBACK_NAME, CABLE_RECORDING_NAME, findCablePlayback, isCablePlayback } from '../routing';
import { Icon, Logo } from '../ui/kit';
import { fmtDb } from '../voice/model';

interface AppInfo {
  id: string;
  mono: string;
  name: string;
  sub: string;
  exes: string[];
  path: string;
}

const APPS: AppInfo[] = [
  { id: 'teams', mono: 'Te', name: 'Microsoft Teams', sub: 'Meetings and calls', exes: ['ms-teams.exe', 'Teams.exe'], path: 'Open Teams, then Settings › Devices.' },
  { id: 'zoom', mono: 'Zo', name: 'Zoom Workplace', sub: 'Meetings and webinars', exes: ['Zoom.exe'], path: 'Open Zoom, then Settings › Audio.' },
  { id: 'discord', mono: 'Di', name: 'Discord', sub: 'Voice chat', exes: ['Discord.exe'], path: 'Open Discord, then User Settings › Voice & Video.' },
  { id: 'obs', mono: 'Ob', name: 'OBS Studio', sub: 'Streaming and recording', exes: ['obs64.exe'], path: 'Open OBS, then Settings › Audio › Mic/Auxiliary Audio.' },
  { id: 'chrome', mono: 'Ch', name: 'Google Chrome', sub: 'Meet and other web apps', exes: ['chrome.exe'], path: 'In Chrome, open Settings › Privacy and security › Site settings › Microphone.' },
  { id: 'audacity', mono: 'Au', name: 'Audacity', sub: 'Recording and editing', exes: ['Audacity.exe'], path: 'Open Audacity, then Audio Setup › Recording Device.' },
];

type Status = 'mic' | 'open' | 'closed' | 'unknown';

export function ConnectAppsView() {
  const s = useStudio();
  const [selected, setSelected] = useState('teams');
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const check = useCallback(async () => {
    if (!window.studioAPI) return;
    const list = await window.studioAPI.getRunningApps(APPS.flatMap((a) => a.exes)).catch(() => []);
    const next: Record<string, Status> = {};
    for (const a of APPS) {
      const hits = list.filter((r) => a.exes.some((e) => e.toLowerCase() === r.exe.toLowerCase()));
      next[a.id] = hits.some((h) => h.usingMic) ? 'mic' : hits.some((h) => h.running) ? 'open' : 'closed';
    }
    setStatus(next);
    setCheckedAt(Date.now());
  }, []);

  useEffect(() => {
    check();
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [check]);

  const cable = findCablePlayback(s.outputs);
  const selectedOutput = s.outputs.find((d) => d.deviceId === s.prefs.outputId);
  const sending = !!selectedOutput && isCablePlayback(selectedOutput.label);
  const cur = APPS.find((a) => a.id === selected)!;
  const st = (id: string): Status => (window.studioAPI ? status[id] || 'unknown' : 'unknown');
  const openCount = APPS.filter((a) => st(a.id) === 'mic' || st(a.id) === 'open').length;
  const micCount = APPS.filter((a) => st(a.id) === 'mic').length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CABLE_RECORDING_NAME);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard refused */
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="col" style={{ gap: 6 }}>
          <h1 className="h1">Connect apps</h1>
          <span className="faint">Aurel sends your enhanced voice through VB-Audio Cable. Any app set to “CABLE Output” as its microphone hears it.</span>
        </div>
        <button className="btn" onClick={() => window.studioAPI?.openSoundSettings()} disabled={!window.studioAPI}>
          Open Windows sound settings
          <Icon name="external" size={14} />
        </button>
      </div>

      <section aria-label="How your voice is routed" className="card row" style={{ minHeight: 208, flexShrink: 0, overflow: 'hidden', alignItems: 'stretch' }}>
        <div className="row grow" style={{ gap: 12, padding: '24px 32px' }}>
          <Node icon={<Icon name="mic" size={24} />} title={s.inputLabel} sub="Your microphone" />
          <Arrow dashed />
          <Node icon={<Logo size={52} />} bare title="Aurel engine" sub={`${s.active.name} · ${fmtDb(s.live.boostDb, 0)}${s.working.noise.enabled ? ' · noise removed' : ''}`} />
          <Arrow on={sending} />
          <Node icon={<Icon name="mic" size={24} />} accent title="VB-Audio Cable" sub="CABLE Input › CABLE Output" />
          <Arrow on={sending} />
          <div className="col" style={{ gap: 12, minWidth: 0 }}>
            <div className="row">
              {['Te', 'Zo', 'Ob'].map((m, i) => (
                <span key={m} className="row" style={{ width: 52, height: 52, marginLeft: i ? -14 : 0, borderRadius: 14, background: 'var(--bg-selected)', border: '2px solid var(--bg-surface)', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>{m}</span>
              ))}
              <span className="row mono" style={{ width: 52, height: 52, marginLeft: -14, borderRadius: 14, background: 'var(--bg-control)', border: '2px solid var(--bg-surface)', justifyContent: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>+3</span>
            </div>
            <div className="col" style={{ gap: 3 }}>
              <span className="h3">Your apps</span>
              <span className="small faint">Meetings, streaming, recording</span>
            </div>
          </div>
        </div>
        <div className="col" style={{ width: 460, flexShrink: 0, borderLeft: '1px solid var(--border-subtle)', background: 'var(--bg-sidebar)', justifyContent: 'center', gap: 14, padding: '24px 28px' }}>
          <span className={sending ? 'chip chip-ok' : 'chip chip-warn'} style={{ alignSelf: 'flex-start' }}>
            {sending ? 'Connected' : cable ? 'Not sending to the cable' : 'VB-Audio Cable not found'}
          </span>
          <span className="h3">
            {sending ? 'Your voice is going into VB-Audio Cable' : cable ? 'Aurel is sending your voice somewhere else' : 'Install VB-Audio Cable to reach your apps'}
          </span>
          <span className="small muted" style={{ lineHeight: 1.5 }}>
            {sending
              ? `Aurel plays into ${CABLE_PLAYBACK_NAME}. Apps set to CABLE Output hear it.`
              : cable
              ? `Apps can’t hear you until Aurel’s output is set to ${CABLE_PLAYBACK_NAME}.`
              : 'It’s free. Run the installer as administrator, then restart your PC. Aurel finds the cable automatically.'}
          </span>
          {!sending && (
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => (cable ? s.setPrefs({ outputId: cable.deviceId }) : window.studioAPI?.openVBCableFolder())}>
              {cable ? `Send to ${CABLE_PLAYBACK_NAME.split(' (')[0]}` : 'Get VB-Cable'}
            </button>
          )}
        </div>
      </section>

      <div style={{ flexGrow: 1, display: 'flex', gap: 24, minHeight: 0 }}>
        <section aria-labelledby="apps-h" className="card col grow" style={{ padding: '20px 12px 12px', minWidth: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', padding: '0 12px 14px' }}>
            <div className="col" style={{ gap: 4 }}>
              <h2 id="apps-h" className="h3">Apps on this PC</h2>
              <span className="small faint">
                {window.studioAPI ? `${openCount} of ${APPS.length} open${micCount ? ` · ${micCount} using a microphone now` : ''}` : 'App status is shown in the Aurel desktop app'}
              </span>
            </div>
            {window.studioAPI && (
              <button className="btn btn-ghost btn-sm" onClick={check}>
                <Icon name="refresh" size={14} />
                {checkedAt ? 'Checked just now' : 'Checking…'}
              </button>
            )}
          </div>
          <div className="row overline" style={{ padding: '0 16px 8px', gap: 16 }}>
            <span className="grow">App</span>
            <span style={{ width: 200, textAlign: 'right' }}>Status</span>
          </div>
          <div className="col" style={{ gap: 2, overflow: 'auto' }}>
            {APPS.map((a) => {
              const stt = st(a.id);
              return (
                <button key={a.id} className="row" aria-pressed={a.id === selected} onClick={() => setSelected(a.id)} style={{ gap: 16, padding: '12px 16px', borderRadius: 10, textAlign: 'left', background: a.id === selected ? 'var(--bg-raised)' : 'transparent' }}>
                  <span className="row" style={{ position: 'relative', width: 40, height: 40, borderRadius: 11, background: 'var(--bg-selected)', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
                    {a.mono}
                    {stt === 'mic' && <span className="dot" style={{ position: 'absolute', right: -2, top: -2, width: 10, height: 10, background: 'var(--live)', border: '2px solid var(--bg-surface)' }} />}
                  </span>
                  <span className="col grow" style={{ gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</span>
                    <span className="xsmall faint">{a.sub}</span>
                  </span>
                  <span style={{ width: 200, display: 'flex', justifyContent: 'flex-end' }}>
                    {stt === 'mic' ? <span className="chip chip-ok"><span className="dot" style={{ width: 6, height: 6, background: 'var(--live)' }} />Using a mic now</span>
                      : stt === 'open' ? <span className="chip">Open</span>
                      : stt === 'closed' ? <span className="chip" style={{ background: 'transparent', border: '1px solid var(--border-control)' }}>Not open</span>
                      : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside aria-labelledby="guide-h" className="card col" style={{ width: 480, flexShrink: 0, gap: 18, padding: '22px 24px' }}>
          <span className="overline" style={{ color: st(cur.id) === 'mic' ? 'var(--success-text)' : 'var(--accent-text)' }}>
            {st(cur.id) === 'mic' ? 'Recording from a mic now' : 'One-time setup'}
          </span>
          <h2 id="guide-h" className="h2">Switch {cur.name} to Aurel</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>
            {st(cur.id) === 'mic'
              ? `${cur.name} is using a microphone right now. If people hear your raw, quiet mic, it's set to your mic directly. The fix takes about 20 seconds.`
              : `Point ${cur.name} at CABLE Output once and it hears your enhanced voice from then on.`}
          </p>
          <ol className="col" style={{ listStyle: 'none', gap: 14 }}>
            <Step n={1}>{cur.path}</Step>
            <Step n={2}>Under <strong>Microphone</strong> or <strong>Input device</strong>, choose <strong>{CABLE_RECORDING_NAME}</strong>.</Step>
            <Step n={3}>Turn off the app’s own noise suppression and auto volume. Aurel already does both, and doubling up makes voices thin.</Step>
          </ol>
          <div aria-hidden="true" className="col" style={{ gap: 8, padding: 18, borderRadius: 12, background: 'var(--bg-sidebar)', border: '1px solid var(--border-subtle)' }}>
            <span className="overline">Microphone</span>
            <div className="row" style={{ height: 40, justifyContent: 'space-between', padding: '0 12px', borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--accent)', fontSize: 13 }}>
              {CABLE_RECORDING_NAME}
              <Icon name="chevronDown" size={14} />
            </div>
            <div className="col" style={{ padding: 4, borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border-strong)' }}>
              <span className="row small muted" style={{ height: 34, padding: '0 10px' }}>Default</span>
              <span className="row small" style={{ height: 34, justifyContent: 'space-between', padding: '0 10px', borderRadius: 6, background: 'var(--accent-tint)', color: 'var(--accent-text)' }}>
                {CABLE_RECORDING_NAME}
                <Icon name="check" size={14} strokeWidth={2.5} />
              </span>
              <span className="row small muted ellipsis" style={{ height: 34, padding: '0 10px' }}>{s.inputLabel}</span>
            </div>
          </div>
          <div className="row" style={{ marginTop: 'auto', gap: 10 }}>
            <button className="btn" onClick={copy}>
              <Icon name="copy" size={14} />
              {copied ? 'Copied' : 'Copy device name'}
            </button>
            {window.studioAPI && (
              <button className="btn btn-primary grow" onClick={check}>I’ve switched — check again</button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Node({ icon, title, sub, accent, bare }: { icon: React.ReactNode; title: string; sub: string; accent?: boolean; bare?: boolean }) {
  return (
    <div className="col" style={{ width: 190, gap: 12, minWidth: 0 }}>
      {bare ? (
        icon
      ) : (
        <div className="row" style={{ width: 52, height: 52, borderRadius: 14, justifyContent: 'center', background: accent ? 'var(--accent-tint)' : 'var(--bg-control)', border: accent ? '1px solid var(--accent-border)' : 0, color: accent ? 'var(--accent-text)' : 'var(--text-primary)' }}>
          {icon}
        </div>
      )}
      <div className="col" style={{ gap: 3, minWidth: 0 }}>
        <span className="h3 ellipsis" title={title}>{title}</span>
        <span className="small faint">{sub}</span>
      </div>
    </div>
  );
}

function Arrow({ dashed, on = true }: { dashed?: boolean; on?: boolean }) {
  const c = dashed || !on ? 'var(--border-hover)' : 'var(--accent)';
  return (
    <svg width="70" height="20" viewBox="0 0 70 20" aria-hidden="true" style={{ marginTop: -52 }}>
      <path d="M4 10h56" stroke={c} strokeWidth="2" strokeDasharray={dashed || !on ? '4 5' : undefined} />
      <path d="m56 5 6 5-6 5" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
      <span className="row mono" style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-control)', fontSize: 12, fontWeight: 600, justifyContent: 'center', flexShrink: 0 }}>{n}</span>
      <span className="small" style={{ lineHeight: 1.55, paddingTop: 3 }}>{children}</span>
    </li>
  );
}
