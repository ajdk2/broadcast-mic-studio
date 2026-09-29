import React from 'react';

interface DeleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  profileName: string;
}

export const DeleteProfileModal: React.FC<DeleteProfileModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  profileName,
}) => {
  if (!isOpen) return null;

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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dl-h"
        aria-describedby="dl-d"
        style={{
          width: '520px',
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
        <div style={{ display: 'flex', gap: '18px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#2A1512',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FF8A7E"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 id="dl-h" style={{ margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.01em', color: '#F3F2EF' }}>
              Delete “{profileName}”?
            </h2>
            <p id="dl-d" style={{ margin: 0, fontSize: '14px', lineHeight: 1.55, color: '#B9BBC1' }}>
              Its settings, its shortcut, and its app-trigger rules will be removed. This cannot be undone, but you can export it to a file first.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={() => {
              alert(`Exported "${profileName}.aurel" to downloads.`);
            }}
            style={{
              height: '40px',
              padding: '0 4px',
              border: 0,
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 500,
              color: '#F5A623',
              cursor: 'pointer',
            }}
          >
            Export first
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                borderRadius: '10px',
                background: '#17191C',
                border: '1px solid #33373E',
                boxSizing: 'border-box',
                fontSize: '13px',
                fontWeight: 500,
                color: '#F3F2EF',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              style={{
                height: '40px',
                padding: '0 18px',
                borderRadius: '10px',
                background: '#C8372D',
                border: 0,
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Delete profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
