import React, { useState } from 'react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApp?: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onOpenApp,
}) => {
  const [items, setItems] = useState<number[]>([1, 2, 3]);

  if (!isOpen) return null;

  const dismiss = (id: number) => {
    setItems((prev) => prev.filter((i) => i !== id));
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5,6,8,0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        padding: '24px 32px 48px',
      }}
    >
      <div
        role="region"
        aria-label="Notifications"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '460px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
          color: '#F3F2EF',
        }}
      >
        {items.includes(1) && (
          <div
            role="status"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '16px 18px',
              borderRadius: '14px',
              background: '#1A1C20',
              border: '1px solid #2E3137',
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#B9BBC1' }}>
                <svg width="14" height="14" viewBox="0 0 28 28" aria-hidden="true">
                  <rect width="28" height="28" rx="8" fill="#F5A623" />
                  <path d="M8 14v0M11 10.5v7M14 7.5v13M17 10.5v7M20 13.5v1" stroke="#1B1204" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                Aurel · 2 min ago
              </span>
              <button
                onClick={() => dismiss(1)}
                aria-label="Dismiss"
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, borderRadius: '6px', background: 'transparent', color: '#8C9098', cursor: 'pointer' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#2A2111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFC869" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3 3 8l9 5 9-5-9-5z" />
                  <path d="m3 13 9 5 9-5" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Switched to Late-night stream</span>
                <span style={{ fontSize: '13px', lineHeight: 1.5, color: '#B9BBC1' }}>
                  OBS Studio started recording, so your rule kicked in.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', paddingLeft: '50px' }}>
              <button
                onClick={() => dismiss(1)}
                style={{ height: '32px', padding: '0 12px', borderRadius: '8px', background: '#22252A', border: '1px solid #33373E', fontSize: '12px', fontWeight: 500, color: '#F3F2EF', cursor: 'pointer' }}
              >
                Undo
              </button>
            </div>
          </div>
        )}

        {items.includes(2) && (
          <div
            role="alert"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '16px 18px',
              borderRadius: '14px',
              background: '#1A1C20',
              border: '1px solid #2E3137',
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#B9BBC1' }}>
                <svg width="14" height="14" viewBox="0 0 28 28" aria-hidden="true">
                  <rect width="28" height="28" rx="8" fill="#F5A623" />
                  <path d="M8 14v0M11 10.5v7M14 7.5v13M17 10.5v7M20 13.5v1" stroke="#1B1204" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                Aurel · just now
              </span>
              <button
                onClick={() => dismiss(2)}
                aria-label="Dismiss"
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, borderRadius: '6px', background: 'transparent', color: '#8C9098', cursor: 'pointer' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#22252A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F3F2EF" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  <path d="M4 4l16 16" stroke="#FF8A7E" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Talking while muted?</span>
                <span style={{ fontSize: '13px', lineHeight: 1.5, color: '#B9BBC1' }}>
                  Aurel heard you speak, but Microsoft Teams can’t hear you.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '50px' }}>
              <button
                onClick={() => dismiss(2)}
                style={{ height: '32px', padding: '0 14px', borderRadius: '8px', background: '#F5A623', border: 0, color: '#1B1204', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Unmute
              </button>
              <span className="mono font-mono" style={{ fontSize: '11px', color: '#8C9098' }}>Ctrl Alt M</span>
            </div>
          </div>
        )}

        {items.includes(3) && (
          <div
            role="alert"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '16px 18px',
              borderRadius: '14px',
              background: '#1A1C20',
              border: '1px solid #5C2A24',
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#B9BBC1' }}>
                <svg width="14" height="14" viewBox="0 0 28 28" aria-hidden="true">
                  <rect width="28" height="28" rx="8" fill="#F5A623" />
                  <path d="M8 14v0M11 10.5v7M14 7.5v13M17 10.5v7M20 13.5v1" stroke="#1B1204" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                Aurel · just now
              </span>
              <button
                onClick={() => dismiss(3)}
                aria-label="Dismiss"
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, borderRadius: '6px', background: 'transparent', color: '#8C9098', cursor: 'pointer' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#2A1512', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF8A7E" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
                  <path d="M3 3l18 18" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Your mic was unplugged</span>
                <span style={{ fontSize: '13px', lineHeight: 1.5, color: '#B9BBC1' }}>
                  Your apps hear silence until it’s back. Aurel picks it up again on its own.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', paddingLeft: '50px' }}>
              <button
                onClick={() => dismiss(3)}
                style={{ height: '32px', padding: '0 14px', borderRadius: '8px', background: '#F5A623', border: 0, color: '#1B1204', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Use laptop mic
              </button>
              {onOpenApp && (
                <button
                  onClick={() => {
                    onOpenApp();
                    onClose();
                  }}
                  style={{ height: '32px', padding: '0 12px', borderRadius: '8px', background: '#22252A', border: '1px solid #33373E', fontSize: '12px', fontWeight: 500, color: '#F3F2EF', cursor: 'pointer' }}
                >
                  Open Aurel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
