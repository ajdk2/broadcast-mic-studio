import React from 'react';
import { Logo } from '../ui/kit';

export function TitleBar({ title = 'Aurel Voice Studio' }: { title?: string }) {
  const api = window.studioAPI;
  const btn: React.CSSProperties = { width: 46, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' };
  return (
    <header className="drag row" style={{ height: 40, flexShrink: 0, justifyContent: 'space-between', paddingLeft: 16, borderBottom: '1px solid var(--border-titlebar)', background: 'var(--bg-canvas)' }}>
      <div className="row" style={{ gap: 10 }}>
        <Logo size={16} />
        <span className="xsmall muted">{title}</span>
      </div>
      {api && (
        <div className="no-drag row" style={{ height: '100%' }}>
          <button aria-label="Minimize" className="icon-btn" style={{ ...btn, borderRadius: 0 }} onClick={() => api.minimizeWindow()}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M0 5.5h10" stroke="currentColor" /></svg>
          </button>
          <button aria-label="Maximize" className="icon-btn" style={{ ...btn, borderRadius: 0 }} onClick={() => api.maximizeWindow()}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="0.5" y="0.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" /></svg>
          </button>
          <button aria-label="Close" className="icon-btn titlebar-close" style={{ ...btn, borderRadius: 0 }} onClick={() => api.closeWindow()}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" /></svg>
          </button>
        </div>
      )}
    </header>
  );
}
