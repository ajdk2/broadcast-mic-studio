import React, { useState, useRef, useEffect, useMemo } from 'react';

interface TestSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnhancementOn: boolean;
}

export const TestSoundModal: React.FC<TestSoundModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [abMode, setAbMode] = useState<'original' | 'enhanced'>('enhanced');
  const [selectedTestProfile, setSelectedTestProfile] = useState<string>('broadcast');
  const [isLooping, setIsLooping] = useState<boolean>(true);

  if (!isOpen) return null;

  const testProfiles = [
    { id: 'broadcast', name: 'Broadcast' },
    { id: 'podcast', name: 'Podcast' },
    { id: 'clear', name: 'Clear Speech' },
    { id: 'condenser', name: 'Studio Condenser' },
    { id: 'natural', name: 'Natural' },
  ];

  const fr = (x: number) => x - Math.floor(x);
  const isEnh = abMode === 'enhanced';

  // Waveform bars matching Design Board 29
  let twDone = '';
  let twTodo = '';
  for (let i = 0; i < 122; i++) {
    const x = 3 + i * 6;
    const r = fr(Math.sin(i * 7.233) * 43758.5453);
    const e = Math.abs(Math.sin(i * 0.29)) * Math.max(0, Math.sin(i * 0.06 + 0.3));
    const h = isEnh
      ? e > 0.07
        ? Math.min(54, 6 + 48 * Math.pow(e * (0.75 + 0.25 * r), 0.5))
        : 1.2
      : 1.5 + 12 * e * (0.55 + 0.45 * r);
    const d = `M${x} ${(60 - h).toFixed(1)}V${(60 + h).toFixed(1)}`;
    if (x < 295) twDone += d;
    else twTodo += d;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,6,8,0.72)',
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
        aria-labelledby="tr-h"
        style={{
          width: '840px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          padding: '30px 32px',
          boxSizing: 'border-box',
          borderRadius: '20px',
          background: '#1A1C20',
          border: '1px solid #33373E',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h2 id="tr-h" style={{ margin: 0, fontSize: '22px', fontWeight: 600, letterSpacing: '-0.015em', color: '#F3F2EF' }}>
              Test my sound
            </h2>
            <span style={{ fontSize: '14px', lineHeight: 1.5, color: '#B9BBC1' }}>
              Record 10 seconds, then flip between original and enhanced. Much easier to judge than listening live.
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              background: 'transparent',
              border: 0,
              color: '#B9BBC1',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* Waveform Player Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px', borderRadius: '14px', background: '#111215', border: '1px solid #24272C' }}>
          <svg width="100%" height="120" viewBox="0 0 734 120" role="img" aria-label="Audio sample waveform" preserveAspectRatio="none">
            <line x1="0" y1="60" x2="734" y2="60" stroke="#23262B" />
            <path d={twDone} stroke={isEnh ? '#F5A623' : '#9EA1A8'} strokeWidth="3.5" strokeLinecap="round" />
            <path d={twTodo} stroke="#3A3E46" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="295" y1="0" x2="295" y2="120" stroke="#F3F2EF" strokeWidth="1.5" />
          </svg>
          <div className="mono font-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8C9098' }}>
            <span>0:00</span>
            <span>0:04 / 0:10</span>
          </div>
        </div>

        {/* Playback Controls & A/B Flip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <button
            onClick={() => setIsPlaying((v) => !v)}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#F5A623',
              border: 0,
              color: '#1B1204',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4.5v15l12-7.5z" />
              </svg>
            )}
          </button>

          <div role="group" aria-label="What you hear" style={{ display: 'flex', gap: '2px', padding: '4px', background: '#111215', border: '1px solid #26292E', borderRadius: '12px' }}>
            <button
              type="button"
              aria-pressed={abMode === 'original'}
              onClick={() => setAbMode('original')}
              style={{
                height: '40px',
                padding: '0 22px',
                border: 0,
                borderRadius: '9px',
                background: abMode === 'original' ? '#2B2E34' : 'transparent',
                color: abMode === 'original' ? '#F3F2EF' : '#B9BBC1',
                fontSize: '14px',
                fontWeight: abMode === 'original' ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              Original
            </button>
            <button
              type="button"
              aria-pressed={abMode === 'enhanced'}
              onClick={() => setAbMode('enhanced')}
              style={{
                height: '40px',
                padding: '0 22px',
                border: 0,
                borderRadius: '9px',
                background: abMode === 'enhanced' ? '#2B2E34' : 'transparent',
                color: abMode === 'enhanced' ? '#F3F2EF' : '#B9BBC1',
                fontSize: '14px',
                fontWeight: abMode === 'enhanced' ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              Enhanced
            </button>
          </div>

          <span style={{ fontSize: '13px', color: '#8C9098' }}>Switch while it plays</span>

          <button
            type="button"
            role="switch"
            aria-checked={isLooping}
            onClick={() => setIsLooping((v) => !v)}
            aria-label="Loop"
            style={{
              marginLeft: 'auto',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0 6px 0 14px',
              borderRadius: '10px',
              background: 'transparent',
              border: '1px solid #33373E',
              fontSize: '13px',
              color: '#F3F2EF',
              cursor: 'pointer',
            }}
          >
            Loop
            <span
              style={{
                width: '36px',
                height: '22px',
                borderRadius: '11px',
                background: isLooping ? '#F5A623' : '#666A73',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isLooping ? 'flex-end' : 'flex-start',
                padding: '3px',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: isLooping ? '#1B1204' : '#B9BBC1' }} />
            </span>
          </button>
        </div>

        {/* Hear it as Profile Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#F3F2EF' }}>Hear it as</span>
          <div role="radiogroup" aria-label="Profile for this test" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {testProfiles.map((t) => {
              const isSelected = selectedTestProfile === t.id;
              return (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setSelectedTestProfile(t.id);
                    setAbMode('enhanced');
                  }}
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    borderRadius: '999px',
                    background: isSelected ? '#2A2111' : 'transparent',
                    border: `1px solid ${isSelected ? '#F5A623' : '#33373E'}`,
                    color: isSelected ? '#FFC869' : '#B9BBC1',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '18px', borderTop: '1px solid #2A2D33' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#8C9098' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3z" />
            </svg>
            Stays on this PC. Deleted when you close this.
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
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
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="6" fill="#FF6A5C" />
              </svg>
              Record again
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                borderRadius: '10px',
                background: '#F5A623',
                color: '#1B1204',
                boxSizing: 'border-box',
                fontSize: '13px',
                fontWeight: 600,
                border: 0,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
