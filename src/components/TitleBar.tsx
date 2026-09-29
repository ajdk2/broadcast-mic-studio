import React from 'react';

interface TitleBarProps {
  title?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  title = 'Aurel Voice Studio',
}) => {
  const handleMinimize = () => {
    (window as any).studioAPI?.minimizeWindow?.();
  };

  const handleMaximize = () => {
    (window as any).studioAPI?.maximizeWindow?.();
  };

  const handleClose = () => {
    (window as any).studioAPI?.closeWindow?.();
  };

  return (
    <header
      className="titlebar-drag-region"
      style={{
        height: '40px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '16px',
        borderBottom: '1px solid var(--border-titlebar)',
        background: 'var(--bg-canvas)',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="16" height="16" viewBox="0 0 28 28" aria-hidden="true">
          <rect width="28" height="28" rx="8" fill="#F5A623" />
          <path
            d="M8 14v0M11 10.5v7M14 7.5v13M17 10.5v7M20 13.5v1"
            stroke="#1B1204"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>
          {title}
        </span>
      </div>

      <div className="titlebar-no-drag" style={{ display: 'flex', height: '100%' }}>
        <button
          aria-label="Minimize"
          onClick={handleMinimize}
          style={{
            width: '46px',
            height: '40px',
            border: 0,
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            transition: 'background 0.15s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M0 5.5h10" stroke="currentColor" />
          </svg>
        </button>

        <button
          aria-label="Maximize"
          onClick={handleMaximize}
          style={{
            width: '46px',
            height: '40px',
            border: 0,
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            transition: 'background 0.15s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0.5" y="0.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" />
          </svg>
        </button>

        <button
          aria-label="Close"
          onClick={handleClose}
          style={{
            width: '46px',
            height: '40px',
            border: 0,
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            transition: 'background 0.15s ease, color 0.15s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#E81123';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  );
};
