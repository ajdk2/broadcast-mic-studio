import React, { useEffect, useState } from 'react';
import { AppNotification, Command, dismiss, onNotifications } from '../state/notifications';
import { useStudio } from '../state/store';
import { runCommand } from '../App';
import { Icon, Logo } from '../ui/kit';

const ICON: Record<AppNotification['kind'], { name: string; bg: string; fg: string }> = {
  rule: { name: 'profiles', bg: 'var(--accent-tint)', fg: 'var(--accent-text)' },
  'muted-talk': { name: 'micOff', bg: 'var(--bg-control-2)', fg: 'var(--text-primary)' },
  unplugged: { name: 'micOff', bg: 'var(--error-tint)', fg: 'var(--error-text)' },
  clipping: { name: 'alert', bg: 'var(--error-tint)', fg: 'var(--error-text)' },
  info: { name: 'sparkle', bg: 'var(--bg-control-2)', fg: 'var(--text-primary)' },
};

function when(at: number): string {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  return `${m} min ago`;
}

// One notification card (board 27).
export function NotificationCard({ n, onAction, onDismiss }: { n: AppNotification; onAction: (c: Command) => void; onDismiss: () => void }) {
  const ic = ICON[n.kind];
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div role={n.kind === 'rule' || n.kind === 'info' ? 'status' : 'alert'} className="toast col" style={{ gap: 12, padding: '16px 18px', borderColor: n.kind === 'unplugged' || n.kind === 'clipping' ? 'var(--error-border)' : undefined }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="row xsmall muted" style={{ gap: 8 }}><Logo size={14} />Aurel · {when(n.at)}</span>
        <button className="icon-btn" aria-label="Dismiss" style={{ width: 28, height: 28 }} onClick={onDismiss}><Icon name="close" size={12} strokeWidth={2.2} /></button>
      </div>
      <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
        <span className="row" style={{ width: 36, height: 36, borderRadius: 10, background: ic.bg, color: ic.fg, justifyContent: 'center' }}><Icon name={ic.name} size={18} /></span>
        <div className="col" style={{ gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{n.title}</span>
          <span className="small muted" style={{ lineHeight: 1.5 }}>{n.body}</span>
        </div>
      </div>
      {(n.actions.length > 0 || n.hint) && (
        <div className="row" style={{ gap: 8, paddingLeft: 50 }}>
          {n.actions.map((a) => (
            <button key={a.label} className={a.primary ? 'btn btn-sm btn-primary' : 'btn btn-sm'} onClick={() => onAction(a.command)}>{a.label}</button>
          ))}
          {n.hint && <span className="mono faint" style={{ fontSize: 11 }}>{n.hint}</span>}
        </div>
      )}
    </div>
  );
}

// Browser fallback: cards at the bottom-right of the page. (In Electron they go to their own window.)
export function InPageNotifications() {
  const s = useStudio();
  const [list, setList] = useState<AppNotification[]>([]);
  useEffect(() => onNotifications(setList), []);
  useEffect(() => {
    const t = list.map((n) => setTimeout(() => dismiss(n.id), n.kind === 'unplugged' ? 30000 : 10000));
    return () => t.forEach(clearTimeout);
  }, [list]);
  if (window.studioAPI || !list.length) return null;
  return (
    <div className="col" style={{ position: 'fixed', right: 24, bottom: 48, width: 412, gap: 12, zIndex: 60 }}>
      {list.map((n) => (
        <NotificationCard key={n.id} n={n} onDismiss={() => dismiss(n.id)} onAction={(c) => { runCommand(s, c); dismiss(n.id); }} />
      ))}
    </div>
  );
}
