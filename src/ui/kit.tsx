import React from 'react';

export function Logo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="#F5A623" />
      <path d="M8 14v0M11 10.5v7M14 7.5v13M17 10.5v7M20 13.5v1" stroke="#1B1204" strokeWidth={size > 30 ? 2.2 : 2.4} strokeLinecap="round" />
    </svg>
  );
}

// Icons: 24-grid, 1.8 px stroke (design board 07).
const PATHS: Record<string, React.ReactNode> = {
  studio: <path d="M3 12h1M7 8v8M11 4v16M15 8v8M19 11v2" />,
  profiles: <><path d="M12 3 3 8l9 5 9-5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
  finetune: <><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></>,
  connect: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M17.5 14v7M14 17.5h7" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" /></>,
  micOff: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" /><path d="M3 3l18 18" /></>,
  headphones: <><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></>,
  shield: <path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3z" />,
  check: <path d="m5 12 5 5 9-10" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />,
  pause: <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></>,
  record: <circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />,
  retry: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></>,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  upload: <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  sparkle: <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" />,
  swap: <path d="M7 7h11l-3-3M17 17H6l3 3" />,
  noise: <path d="M3 12h2M7 9v6M11 6v12M15 9v6M19 12h2" />,
  alert: <><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17v.5" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  laptop: <path d="M4 5h16v10H4zM2 19h20" />,
  loop: <><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></>,
};

export function Icon({ name, size = 18, strokeWidth = 1.8, className, style }: { name: keyof typeof PATHS | string; size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
      {PATHS[name]}
    </svg>
  );
}

export function Switch({ checked, onChange, label, small, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; small?: boolean; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={small ? 'switch sm' : 'switch'} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label, fill, style }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void; label: string; fill?: boolean; style?: React.CSSProperties }) {
  return (
    <div role="group" aria-label={label} className={fill ? 'seg fill' : 'seg'} style={style}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ value, min = 0, max = 100, step = 1, onChange, label, disabled, valueText, style }: { value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; label: string; disabled?: boolean; valueText?: string; style?: React.CSSProperties }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className={disabled ? 'slider disabled' : 'slider'} style={style}>
      <div className="track" />
      <div className="fill" style={{ width: `${pct}%` }} />
      <div className="thumb" style={{ left: `${pct}%` }} />
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-label={label} aria-valuetext={valueText} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function Modal({ label, onClose, children, width = 560 }: { label: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={label} className="dialog" style={{ width, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 48px)', overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

// Level bar in dB, −60 … 0.
export function LevelBar({ db, color = 'var(--accent)', height = 8 }: { db: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  return (
    <div style={{ position: 'relative', height, borderRadius: height / 2, background: 'var(--meter-off)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color, borderRadius: height / 2, transition: 'width 60ms linear' }} />
    </div>
  );
}

// Segmented meter (setup screens): n blocks, lit according to level.
export function SegmentMeter({ db, segments = 24, width = 240, height = 14, color = 'var(--text-primary)' }: { db: number; segments?: number; width?: number; height?: number; color?: string }) {
  const lit = Math.round(Math.max(0, Math.min(1, (db + 60) / 60)) * segments);
  const w = width / segments;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {Array.from({ length: segments }, (_, i) => (
        <rect key={i} x={i * w} width={w - 3} height={height} rx={1.5} fill={i < lit ? color : 'var(--meter-off)'} />
      ))}
    </svg>
  );
}

export function fmtShortcut(acc: string | null | undefined): string[] {
  if (!acc) return [];
  return acc.split('+').map((k) => (k === 'CommandOrControl' ? 'Ctrl' : k));
}

export function Keys({ acc }: { acc: string | null | undefined }) {
  const keys = fmtShortcut(acc);
  if (!keys.length) return <span className="faint small">Not set</span>;
  return (
    <span className="row" style={{ gap: 4 }}>
      {keys.map((k, i) => (
        <kbd key={i}>{k}</kbd>
      ))}
    </span>
  );
}
