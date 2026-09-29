import React from 'react';
import { Tab, useStudio } from '../state/store';
import { Icon, Logo } from '../ui/kit';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'studio', label: 'Studio', icon: 'studio' },
  { id: 'profiles', label: 'Profiles', icon: 'profiles' },
  { id: 'finetune', label: 'Fine-tune', icon: 'finetune' },
  { id: 'connect', label: 'Connect apps', icon: 'connect' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export function Sidebar() {
  const s = useStudio();
  const running = s.status.state === 'running';
  const lost = s.status.inputLost || s.inputMissing || (s.status.state === 'error' && s.status.error !== 'failed');
  const sr = running ? `${Number((s.status.sampleRate / 1000).toFixed(1))} kHz` : '';
  return (
    <nav aria-label="Primary" className="col" style={{ width: 248, flexShrink: 0, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-titlebar)', gap: 28, padding: '22px 14px 18px' }}>
      <div className="row" style={{ gap: 12, padding: '0 8px' }}>
        <Logo size={32} />
        <div className="col" style={{ gap: 2 }}>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>Aurel</span>
          <span className="xsmall faint">Voice Studio</span>
        </div>
      </div>

      <div className="col" style={{ gap: 2 }}>
        {NAV.map((n) => (
          <button key={n.id} className="nav-btn" aria-current={s.tab === n.id ? 'page' : undefined} onClick={() => s.setTab(n.id)} data-tour={n.id === 'profiles' ? 'nav-profiles' : undefined}>
            <Icon name={n.icon} />
            {n.label}
          </button>
        ))}
      </div>

      <div className="col" style={{ marginTop: 'auto', gap: 12 }}>
        <div className="card col" style={{ borderRadius: 12, padding: 14, gap: 12 }}>
          <span className="overline">Input</span>
          <div className="row" style={{ gap: 12 }}>
            <div className="row" style={{ width: 36, height: 36, borderRadius: 9, background: lost ? 'var(--error-tint)' : 'var(--bg-control)', justifyContent: 'center', color: lost ? 'var(--error-text)' : 'var(--text-primary)' }}>
              <Icon name={lost ? 'micOff' : 'mic'} />
            </div>
            <div className="col grow" style={{ gap: 2 }}>
              <span className="small ellipsis" style={{ fontWeight: 500 }} title={s.inputLabel}>{s.inputLabel}</span>
              <span className="xsmall faint ellipsis">{lost ? 'Not connected' : sr || 'Starting…'}</span>
            </div>
            <span className="dot" style={{ background: lost ? 'var(--live)' : running ? 'var(--success)' : 'var(--text-tertiary)' }} aria-label={lost ? 'Disconnected' : 'Connected'} />
          </div>
          <button className="btn" style={{ height: 34 }} onClick={() => s.openModal({ setup: true })}>
            Run voice check
          </button>
        </div>
        <div className="row xsmall faint" style={{ gap: 8, padding: '0 8px' }}>
          <Icon name="shield" size={14} />
          Offline · processed on this PC
        </div>
      </div>
    </nav>
  );
}
