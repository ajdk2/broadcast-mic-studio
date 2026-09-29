import React, { useState } from 'react';

interface SaveProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, desc: string, tags: string) => void;
}

export const SaveProfileModal: React.FC<SaveProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('Late-night stream');
  const [shortcut, setShortcut] = useState('Ctrl Alt 1');
  const [rule, setRule] = useState('When OBS Studio records');
  const [useNow, setUseNow] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), `From Broadcast · ${shortcut}`, 'Custom profile');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,6,8,0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-h"
        style={{
          width: '560px',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
          padding: '28px',
          boxSizing: 'border-box',
          borderRadius: '18px',
          background: '#1A1C20',
          border: '1px solid #33373E',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          color: '#F3F2EF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h2 id="sv-h" style={{ margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.01em', color: '#F3F2EF' }}>
              Save as new profile
            </h2>
            <span style={{ fontSize: '14px', lineHeight: 1.5, color: '#B9BBC1' }}>
              Your edits move into the new profile. Broadcast goes back to its original sound.
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              background: 'transparent',
              border: 0,
              color: '#B9BBC1',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="pname" style={{ fontSize: '13px', fontWeight: 500, color: '#F3F2EF' }}>
              Name
            </label>
            <input
              id="pname"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              style={{
                height: '44px',
                padding: '0 14px',
                borderRadius: '10px',
                background: '#111215',
                border: '1px solid #F5A623',
                boxShadow: '0 0 0 3px rgba(245,166,35,0.2)',
                color: '#F3F2EF',
                fontFamily: 'inherit',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '12px', color: '#8C9098' }}>
              Shown in the tray and in the profile picker
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#F3F2EF' }}>Shortcut</span>
              <button
                type="button"
                className="mono font-mono"
                style={{
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                  borderRadius: '10px',
                  background: '#1F2227',
                  border: '1px solid #33373E',
                  fontSize: '13px',
                  color: '#F3F2EF',
                }}
              >
                {shortcut}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#F3F2EF' }}>Switch automatically</span>
              <button
                type="button"
                style={{
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                  borderRadius: '10px',
                  background: '#1F2227',
                  border: '1px solid #33373E',
                  fontSize: '13px',
                  color: '#F3F2EF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rule}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginLeft: '6px' }}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>

          <label
            onClick={() => setUseNow(!useNow)}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', cursor: 'pointer' }}
          >
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                background: useNow ? '#F5A623' : '#23262B',
                border: useNow ? '0' : '1px solid #3A3E46',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {useNow && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1B1204" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              )}
            </span>
            Start using it now
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: '40px',
                padding: '0 16px',
                borderRadius: '10px',
                background: '#17191C',
                border: '1px solid #33373E',
                fontSize: '13px',
                fontWeight: 500,
                color: '#F3F2EF',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                borderRadius: '10px',
                background: '#F5A623',
                color: '#1B1204',
                fontSize: '13px',
                fontWeight: 600,
                border: 0,
                cursor: 'pointer',
              }}
            >
              Save profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
