import React from 'react';
import { NavigationTab } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  inputDeviceLabel: string;
  isMicConnected: boolean;
  onOpenVoiceCheck: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  inputDeviceLabel,
  isMicConnected,
  onOpenVoiceCheck,
}) => {
  const navItems = [
    {
      id: 'studio' as NavigationTab,
      label: 'Studio',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M3 12h1M7 8v8M11 4v16M15 8v8M19 11v2" />
        </svg>
      ),
    },
    {
      id: 'profiles' as NavigationTab,
      label: 'Profiles',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3 3 8l9 5 9-5-9-5z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
      ),
    },
    {
      id: 'finetune' as NavigationTab,
      label: 'Fine-tune',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
          <circle cx="15" cy="6" r="2" />
          <circle cx="9" cy="12" r="2" />
          <circle cx="17" cy="18" r="2" />
        </svg>
      ),
    },
    {
      id: 'connect' as NavigationTab,
      label: 'Connect apps',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <path d="M17.5 14v7M14 17.5h7" />
        </svg>
      ),
    },
    {
      id: 'settings' as NavigationTab,
      label: 'Settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Primary"
      style={{
        width: '248px',
        flexShrink: 0,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-titlebar)',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        padding: '22px 14px 18px',
        boxSizing: 'border-box',
      }}
    >
      {/* Brand logo & header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
        <svg width="32" height="32" viewBox="0 0 28 28" aria-hidden="true">
          <rect width="28" height="28" rx="8" fill="#F5A623" />
          <path
            d="M8 14v0M11 10.5v7M14 7.5v13M17 10.5v7M20 13.5v1"
            stroke="#1B1204"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            Aurel
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Voice Studio</span>
        </div>
      </div>

      {/* Navigation List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className="nav-btn"
              onClick={() => onTabChange(item.id)}
              style={{
                position: 'relative',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                borderRadius: '8px',
                background: isActive ? 'var(--bg-raised)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: 500,
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.12s ease',
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '12px',
                    width: '3px',
                    height: '16px',
                    borderRadius: '2px',
                    background: 'var(--accent-amber)',
                  }}
                />
              )}
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Bottom Input status widget */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Input
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                background: 'var(--bg-control)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '140px',
                }}
                title={inputDeviceLabel}
              >
                {inputDeviceLabel || 'USB Microphone'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>USB · 48 kHz</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isMicConnected ? 'var(--color-success)' : 'var(--color-error)',
                }}
              />
              {isMicConnected ? 'Connected' : 'Unplugged'}
            </span>
            <button
              onClick={onOpenVoiceCheck}
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--accent-amber)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              Run voice check
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3z" />
          </svg>
          Offline · processed on this PC
        </div>
      </div>
    </nav>
  );
};
