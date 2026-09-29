import React from 'react';
import { AurelProfile, NoiseCleanupMode } from '../types';
import { AurelSlider } from './AurelSlider';

interface TrayQuickPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnhancementOn: boolean;
  onToggleEnhancement: () => void;
  currentProfile: AurelProfile;
  onOpenProfiles: () => void;
  boost: number;
  onBoostChange: (val: number) => void;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  noise: NoiseCleanupMode;
  onCycleNoise: () => void;
  onOpenApp: () => void;
  onOpenSettings: () => void;
}

export const TrayQuickPanelModal: React.FC<TrayQuickPanelModalProps> = ({
  isOpen,
  onClose,
  isEnhancementOn,
  onToggleEnhancement,
  currentProfile,
  onOpenProfiles,
  boost,
  onBoostChange,
  isMonitoring,
  onToggleMonitoring,
  noise,
  onCycleNoise,
  onOpenApp,
  onOpenSettings,
}) => {
  if (!isOpen) return null;

  // Waveform bars matching Board 06
  const renderWave = () => {
    let wave = '';
    for (let i = 0; i < 49; i++) {
      const x = 3 + i * 6;
      const r = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const e = Math.abs(Math.sin(i * 0.31)) * Math.max(0, Math.sin(i * 0.1 + 0.4));
      const h = isEnhancementOn
        ? (e > 0.07 ? Math.min(18, 3 + 16 * Math.pow(e * (0.75 + 0.25 * r), 0.5)) : 1)
        : 1.5;
      wave += `M${x} ${(20 - h).toFixed(1)}V${(20 + h).toFixed(1)} `;
    }
    return wave;
  };

  const waveD = renderWave();
  const boostGain = Math.round(boost * 0.38);

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
        role="dialog"
        aria-label="Aurel quick panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '18px',
          boxSizing: 'border-box',
          background: '#1A1C20',
          border: '1px solid #2E3137',
          borderRadius: '14px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          color: '#F3F2EF',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              <span style={{ fontSize: '15px', fontWeight: 600 }}>Aurel</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#B9BBC1' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isEnhancementOn ? '#43D18A' : '#8C9098' }} />
                {isEnhancementOn ? 'Enhancing · Teams is listening' : 'Bypassed'}
              </span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isEnhancementOn}
            onClick={onToggleEnhancement}
            style={{
              width: '44px',
              height: '26px',
              borderRadius: '13px',
              background: isEnhancementOn ? '#F5A623' : '#666A73',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isEnhancementOn ? 'flex-end' : 'flex-start',
              padding: '3px',
              boxSizing: 'border-box',
              border: 0,
              cursor: 'pointer',
            }}
          >
            <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: isEnhancementOn ? '#1B1204' : '#F3F2EF' }} />
          </button>
        </div>

        {/* Live Mini Output Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: '10px', background: '#141619', border: '1px solid #26292E' }}>
          <svg width="100%" height="40" viewBox="0 0 294 40" preserveAspectRatio="none" aria-hidden="true">
            <path d={waveD} stroke="#F5A623" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#8C9098' }}>Output</span>
            <span className="mono font-mono" style={{ color: '#F3F2EF' }}>
              −16.0 LUFS <span style={{ color: '#6BE3A4' }}>· on target</span>
            </span>
          </div>
        </div>

        {/* Profile Button */}
        <button
          onClick={onOpenProfiles}
          aria-label="Sound profile"
          style={{
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            borderRadius: '10px',
            background: '#22252A',
            border: '1px solid #33373E',
            fontSize: '14px',
            color: '#F3F2EF',
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#8C9098' }}>Profile</span>
            <span style={{ fontWeight: 500 }}>{currentProfile.name}</span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {/* Voice Boost Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span>Voice Boost</span>
            <span className="mono font-mono" style={{ color: '#B9BBC1' }}>+{boostGain} dB</span>
          </div>
          <AurelSlider
            value={boost}
            onChange={onBoostChange}
            min={0}
            max={100}
            ariaLabel="Voice Boost"
          />
        </div>

        {/* 4 Quick Action Tiles (2-col grid) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
          <button
            onClick={() => onToggleEnhancement()}
            style={{
              height: '72px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '12px',
              boxSizing: 'border-box',
              borderRadius: '10px',
              background: '#22252A',
              border: '1px solid #2E3137',
              textAlign: 'left',
              color: '#F3F2EF',
              cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              <path d="M4 4l16 16" stroke="#FF8A7E" />
            </svg>
            <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between', fontSize: '13px', fontWeight: 500 }}>
              Mute<span className="mono font-mono" style={{ fontSize: '11px', color: '#8C9098' }}>Ctrl Alt M</span>
            </span>
          </button>

          <button
            onClick={() => onToggleEnhancement()}
            style={{
              height: '72px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '12px',
              boxSizing: 'border-box',
              borderRadius: '10px',
              background: '#22252A',
              border: '1px solid #2E3137',
              textAlign: 'left',
              color: '#F3F2EF',
              cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 7h11l-3-3M17 17H6l3 3" />
            </svg>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Hear original</span>
          </button>

          <button
            onClick={onToggleMonitoring}
            style={{
              height: '72px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '12px',
              boxSizing: 'border-box',
              borderRadius: '10px',
              background: isMonitoring ? '#2A2111' : '#22252A',
              border: isMonitoring ? '1px solid #5A4213' : '1px solid #2E3137',
              textAlign: 'left',
              color: isMonitoring ? '#FFC869' : '#F3F2EF',
              cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
              <rect x="3" y="14" width="4" height="6" rx="1.5" />
              <rect x="17" y="14" width="4" height="6" rx="1.5" />
            </svg>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Monitor</span>
          </button>

          <button
            onClick={onCycleNoise}
            style={{
              height: '72px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '12px',
              boxSizing: 'border-box',
              borderRadius: '10px',
              background: '#2A2111',
              border: '1px solid #5A4213',
              textAlign: 'left',
              color: '#FFC869',
              cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 12h2M7 9v6M11 6v12M15 9v6M19 12h2" />
            </svg>
            <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between', fontSize: '13px', fontWeight: 500 }}>
              Noise removal
              <span style={{ fontSize: '11px', color: '#D8B77A', textTransform: 'capitalize' }}>{noise}</span>
            </span>
          </button>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '8px', paddingTop: '14px', borderTop: '1px solid #2A2D33' }}>
          <button
            onClick={() => {
              onOpenApp();
              onClose();
            }}
            style={{
              flexGrow: 1,
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              background: '#F5A623',
              color: '#1B1204',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 0,
            }}
          >
            Open Aurel
          </button>
          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            aria-label="Settings"
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              background: '#22252A',
              border: '1px solid #33373E',
              boxSizing: 'border-box',
              color: '#F3F2EF',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
