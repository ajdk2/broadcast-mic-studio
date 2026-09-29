import React, { useEffect, useState } from 'react';
import type { TrayState } from '../App';
import { Command } from '../state/notifications';
import { Icon, Keys, Logo, Slider, Switch } from '../ui/kit';
import { useTheme } from '../ui/useTheme';
import { BOOST_MAX_DB, fmtDb, signed } from '../voice/model';

const send = (c: Command) => window.studioAPI!.sendCommand(c);

// Board 06 · Tray quick panel. It mirrors the main window's state and sends commands back.
export function TrayPanel() {
  const [st, setSt] = useState<TrayState | null>(null);
  const [boost, setBoost] = useState<number | null>(null);
  useTheme(st?.theme || 'dark');
  useEffect(() => {
    document.body.classList.add('transparent');
    const off = window.studioAPI!.onState((s) => setSt(s as TrayState));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && window.studioAPI!.hideTrayPanel();
    window.addEventListener('keydown', onKey);
    return () => { off(); window.removeEventListener('keydown', onKey); };
  }, []);
  if (!st) return null;

  const b = boost ?? st.boostDb;
  const wave = st.wave;
  let d = '';
  for (let i = 0; i < wave.length; i++) {
    const db = wave[i] > 1e-6 ? 20 * Math.log10(wave[i]) : -120;
    const h = Math.max(1, ((db + 60) / 60) * 18);
    const x = 3 + i * 6;
    d += `M${x} ${(20 - h).toFixed(1)}V${(20 + h).toFixed(1)}`;
  }
  const lufs = Number.isFinite(st.outLufs) && st.outLufs > -70 ? `${signed(st.outLufs, 1).replace('+', '')} LUFS` : '—';
  const target = st.onTarget === 'on' ? { t: '· on target', c: 'var(--success-text)' } : st.onTarget === 'low' ? { t: '· a little quiet', c: 'var(--accent-text)' } : st.onTarget === 'high' ? { t: '· hot', c: 'var(--accent-text)' } : { t: '', c: '' };
  const dot = st.muted || st.statusText.includes('stopped') || st.statusText.includes('unplugged') ? 'var(--live)' : st.enhancementOn ? 'var(--success)' : 'var(--text-tertiary)';

  const tile = (active: boolean, onClick: () => void, icon: React.ReactNode, label: React.ReactNode, labelFor: string) => (
    <button aria-pressed={active} aria-label={labelFor} onClick={onClick} className="col" style={{ height: 72, justifyContent: 'space-between', alignItems: 'flex-start', padding: 12, borderRadius: 10, textAlign: 'left', background: active ? 'var(--accent-tint)' : 'var(--bg-control-2)', border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-strong)'}`, color: active ? 'var(--accent-text)' : 'var(--text-primary)' }}>
      {icon}
      <span className="row" style={{ width: '100%', justifyContent: 'space-between', gap: 6, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'flex-end', padding: 12 }}>
      <div role="dialog" aria-label="Aurel quick panel" className="col" style={{ width: 360, gap: 16, padding: 18, background: 'var(--bg-popover)', border: '1px solid var(--border-strong)', borderRadius: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 12 }}>
            <Logo size={32} />
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Aurel</span>
              <span className="row xsmall muted" style={{ gap: 6 }}><span className="dot" style={{ width: 6, height: 6, background: dot }} />{st.statusText}</span>
            </div>
          </div>
          <Switch label="Enhancement" checked={st.enhancementOn} onChange={(v) => send({ type: 'setLive', patch: { enhancementOn: v } })} />
        </div>

        <div className="inset col" style={{ gap: 8, padding: 14 }}>
          <svg width="294" height="40" viewBox="0 0 294 40" aria-hidden="true"><path d={d} stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" fill="none" /></svg>
          <div className="row xsmall" style={{ justifyContent: 'space-between' }}><span className="faint">Output</span><span className="mono">{lufs} <span style={{ color: target.c }}>{target.t}</span></span></div>
        </div>

        <label className="row" style={{ height: 44, justifyContent: 'space-between', gap: 10, padding: '0 14px', borderRadius: 10, background: 'var(--bg-control-2)', border: '1px solid var(--border-strong)', fontSize: 14 }}>
          <span className="xsmall faint">Profile</span>
          <select className="select-bare" aria-label="Sound profile" value={st.profileId} onChange={(e) => send({ type: 'selectProfile', id: e.target.value })} style={{ flexGrow: 1, border: 0, height: '100%', color: 'var(--text-primary)', fontWeight: 500, fontSize: 14, textAlign: 'left' }}>
            {st.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <div className="col" style={{ gap: 8 }}>
          <div className="row small" style={{ justifyContent: 'space-between' }}><span>Voice Boost</span><span className="mono muted">{fmtDb(b, 0)}</span></div>
          <Slider label="Voice Boost" value={b} min={0} max={BOOST_MAX_DB} valueText={fmtDb(b, 0)} onChange={(v) => { setBoost(v); send({ type: 'setLive', patch: { boostDb: v } }); setTimeout(() => setBoost(null), 400); }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {tile(st.muted, () => send({ type: 'setLive', patch: { muted: !st.muted } }), <Icon name="micOff" size={18} style={{ color: st.muted ? 'var(--error-text)' : undefined }} />, <>{st.muted ? 'Muted' : 'Mute'}<span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{st.muteKeys?.replace(/\+/g, ' ')}</span></>, 'Mute')}
          {tile(st.hearOriginal, () => send({ type: 'setLive', patch: { hearOriginal: !st.hearOriginal } }), <Icon name="swap" size={18} />, 'Hear original', 'Hear original in headphones')}
          {tile(st.monitorOn, () => send({ type: 'setMonitor', on: !st.monitorOn }), <Icon name="headphones" size={18} />, 'Monitor', 'Monitor')}
          {tile(st.noiseOn, () => send({ type: 'cycleNoise' }), <Icon name="noise" size={18} />, <>Noise<span style={{ fontSize: 11, opacity: 0.8 }}>{st.noiseLabel}</span></>, `Noise removal: ${st.noiseLabel}. Click to change`)}
        </div>

        <div className="row" style={{ gap: 8, paddingTop: 14, borderTop: '1px solid var(--border-strong)' }}>
          <button className="btn btn-primary grow" onClick={() => { send({ type: 'showMain' }); window.studioAPI!.hideTrayPanel(); }}>Open Aurel</button>
          <button className="btn" aria-label="Settings" style={{ width: 40, padding: 0 }} onClick={() => { send({ type: 'showMain', tab: 'settings' }); window.studioAPI!.hideTrayPanel(); }}><Icon name="settings" size={16} /></button>
        </div>
      </div>
    </div>
  );
}

export { Keys };
