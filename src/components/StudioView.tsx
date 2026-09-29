import React, { useState, useEffect, useMemo } from 'react';
import { AurelProfile, HeadphonePreviewMode, MeterData, NoiseCleanupMode } from '../types';
import { AUREL_PROFILES, NOISE_MAP } from '../presets';
import { isCablePlayback } from '../routing';
import { AurelSlider } from './AurelSlider';

interface StudioViewProps {
  currentProfileId: string;
  onSelectProfile: (profile: AurelProfile) => void;
  isEnhancementOn: boolean;
  onToggleEnhancement: () => void;
  headphoneView: HeadphonePreviewMode;
  onSelectHeadphoneView: (view: HeadphonePreviewMode) => void;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  boost: number;
  onBoostChange: (v: number) => void;
  warmth: number;
  onWarmthChange: (v: number) => void;
  presence: number;
  onPresenceChange: (v: number) => void;
  noise: NoiseCleanupMode;
  onNoiseChange: (n: NoiseCleanupMode) => void;
  onOpenTestSound: () => void;
  onOpenFineTune?: () => void;
  meterData: MeterData | null;
  inputDeviceLabel: string;
  outputDeviceLabel: string;
  isMicConnected?: boolean;
  onSelectMicDevice?: () => void;
}

export const StudioView: React.FC<StudioViewProps> = ({
  currentProfileId,
  onSelectProfile,
  isEnhancementOn,
  onToggleEnhancement,
  headphoneView,
  onSelectHeadphoneView,
  isMonitoring,
  onToggleMonitoring,
  boost,
  onBoostChange,
  warmth,
  onWarmthChange,
  presence,
  onPresenceChange,
  noise,
  onNoiseChange,
  onOpenTestSound,
  onOpenFineTune,
  meterData,
  inputDeviceLabel,
  outputDeviceLabel,
  isMicConnected = true,
  onSelectMicDevice,
}) => {
  const [autoLevel, setAutoLevel] = useState<boolean>(true);
  const [showClippingToast, setShowClippingToast] = useState<boolean>(false);

  const currentProfile = useMemo(
    () => AUREL_PROFILES.find((p) => p.id === currentProfileId) || AUREL_PROFILES[0],
    [currentProfileId]
  );

  // Mathematical gain and loudness calculation matching Design.html
  const gain = isEnhancementOn ? boost * 0.38 : 0;
  const inLevel = -41.8;
  const outLevel = inLevel + gain;

  const sgn = (v: number, d: number) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(d);
  const outLabel = sgn(outLevel, 1).replace('+', '');

  const inTarget = isEnhancementOn && outLevel > -18.5 && outLevel < -13.5;
  const statusColor = !isEnhancementOn ? '#FF8A7E' : inTarget ? '#43D18A' : '#FFC869';
  const statusText = !isEnhancementOn
    ? 'Raw mic level. Most listeners will struggle to hear you.'
    : inTarget
    ? 'On target for podcasts and broadcast (−16)'
    : outLevel <= -18.5
    ? 'A little quiet. Raise Voice Boost.'
    : 'Hot. Lower Voice Boost to avoid pumping.';

  const liftLabel = sgn(gain, 0) + ' dB';
  const noiseMap = NOISE_MAP[noise] || NOISE_MAP.balanced;
  const floorLabel = isEnhancementOn ? noiseMap.floor : NOISE_MAP.off.floor;

  // Meter width helper (324px max width, range -60dB to 0dB)
  const meter = (v: number) => Math.max(4, Math.min(324, ((60 + v) / 60) * 324));
  const inW = meter(inLevel);
  const outW = meter(outLevel);


  const boostLabel = sgn(boost * 0.38, 0) + ' dB';
  const warmthLabel = sgn((warmth - 50) * 0.12, 1) + ' dB';
  const presenceLabel = sgn((presence - 50) * 0.12, 1) + ' dB';

  // Check for clipping alert
  useEffect(() => {
    if (outLevel > -2.0 && isEnhancementOn) {
      setShowClippingToast(true);
    }
  }, [outLevel, isEnhancementOn]);

  // Animated live waveform curves matching Design.html formula
  const [animTick, setAnimTick] = useState<number>(0);
  useEffect(() => {
    let animId: number;
    const loop = () => {
      setAnimTick((t) => (t + 1) % 100000);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const { inD, outD } = useMemo(() => {
    const fr = (x: number) => x - Math.floor(x);
    const g = boost / 68;
    let inPath = '';
    let outPath = '';
    const numBars = 140;

    for (let i = 0; i < numBars; i++) {
      const x = 4 + i * 8;
      const tShift = animTick * 0.02;
      const r = fr(Math.sin(i * 12.9898 + tShift) * 43758.5453);
      const syl = Math.abs(Math.sin(i * 0.31 - tShift * 0.4));
      const phrase = Math.max(0, Math.sin(i * 0.058 + 0.5 - tShift * 0.1));
      const e = syl * phrase;

      const hin = 1.5 + 20 * e * (0.55 + 0.45 * r);
      let hout = hin;
      if (isEnhancementOn) {
        hout = e > 0.07 ? Math.min(98, 6 + 88 * Math.pow(e * (0.75 + 0.25 * r), 0.5) * g) : 1.2;
      }

      inPath += `M${x} ${(110 - hin).toFixed(1)}V${(110 + hin).toFixed(1)}`;
      outPath += `M${x} ${(110 - hout).toFixed(1)}V${(110 + hout).toFixed(1)}`;
    }

    return { inD: inPath, outD: outPath };
  }, [animTick, boost, isEnhancementOn]);

  const liveCaption = isEnhancementOn
    ? `Listening through the ${currentProfile.name} profile`
    : 'Enhancement bypassed';

  return (
    <div
      style={{
        position: 'relative',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '30px 40px 28px',
        boxSizing: 'border-box',
      }}
    >
      {/* Toast Alert: Voice too loud (clipping) - Design Board 13 */}
      {showClippingToast && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            right: '408px',
            top: '64px',
            zIndex: 100,
            width: '440px',
            display: 'flex',
            gap: '14px',
            padding: '16px 18px',
            boxSizing: 'border-box',
            borderRadius: '12px',
            background: '#2A1512',
            border: '1px solid #6A2C25',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF8A7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: '1px' }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#F3F2EF' }}>Voice too loud — clipping detected</span>
            <span style={{ fontSize: '13px', lineHeight: 1.5, color: '#D8B8B5' }}>
              Voice Boost is pushing your voice over 0 dB. Lower Voice Boost to keep your sound clean.
            </span>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  onBoostChange(52);
                  setShowClippingToast(false);
                }}
                style={{
                  height: '30px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  background: '#FF8A7E',
                  color: '#1B0E0D',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Lower to +20 dB
              </button>
              <button
                type="button"
                onClick={() => setShowClippingToast(false)}
                style={{
                  height: '30px',
                  padding: '0 10px',
                  background: 'transparent',
                  color: '#B9BBC1',
                  fontSize: '12px',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
        {/* Top Header (Height 60px) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', flexShrink: 0, gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flexShrink: 1 }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Studio
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-tertiary)', minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{inputDeviceLabel || 'USB Microphone'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              {isCablePlayback(outputDeviceLabel) ? (
                <>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>VB-Audio Cable</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· apps pick CABLE Output</span>
                </>
              ) : (
                <span style={{ color: 'var(--accent-amber-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {outputDeviceLabel ? `${outputDeviceLabel} · apps can’t hear you` : 'Not sent to your apps yet'}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Headphone preview</span>
            <div
              role="group"
              aria-label="Headphone preview"
              style={{
                display: 'flex',
                gap: '2px',
                padding: '3px',
                background: '#15171A',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
              }}
            >
              <button
                type="button"
                aria-pressed={headphoneView === 'original'}
                onClick={() => onSelectHeadphoneView('original')}
                style={{
                  height: '34px',
                  padding: '0 16px',
                  border: 0,
                  borderRadius: '7px',
                  background: headphoneView === 'original' ? '#2B2E34' : 'transparent',
                  color: headphoneView === 'original' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: headphoneView === 'original' ? 600 : 500,
                  transition: 'background 0.12s ease',
                }}
              >
                Original
              </button>
              <button
                type="button"
                aria-pressed={headphoneView === 'enhanced'}
                onClick={() => onSelectHeadphoneView('enhanced')}
                style={{
                  height: '34px',
                  padding: '0 16px',
                  border: 0,
                  borderRadius: '7px',
                  background: headphoneView === 'enhanced' ? '#2B2E34' : 'transparent',
                  color: headphoneView === 'enhanced' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: headphoneView === 'enhanced' ? 600 : 500,
                  transition: 'background 0.12s ease',
                }}
              >
                Enhanced
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenTestSound}
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 14px',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                boxSizing: 'border-box',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="8" />
                <circle cx="12" cy="12" r="3.5" fill="#FF6A5C" stroke="none" />
              </svg>
              Test my sound
            </button>

            <button
              type="button"
              className="ghost"
              onClick={onToggleMonitoring}
              aria-pressed={isMonitoring}
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 14px',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
                <rect x="3" y="14" width="4" height="6" rx="1.5" />
                <rect x="17" y="14" width="4" height="6" rx="1.5" />
              </svg>
              {isMonitoring ? 'Monitoring' : 'Monitor off'}
            </button>

            <div style={{ width: '1px', height: '28px', background: 'var(--border-subtle)' }} />

            {/* Master Switch Button */}
            {isEnhancementOn ? (
              <button
                type="button"
                role="switch"
                aria-checked="true"
                onClick={onToggleEnhancement}
                style={{
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '0 8px 0 16px',
                  background: 'var(--accent-amber-tint)',
                  border: '1px solid var(--accent-amber-border)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--accent-amber-text)',
                }}
              >
                Enhancement on
                <span
                  style={{
                    width: '40px',
                    height: '24px',
                    borderRadius: '12px',
                    background: 'var(--accent-amber)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '3px',
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#1B1204' }} />
                </span>
              </button>
            ) : (
              <button
                type="button"
                role="switch"
                aria-checked="false"
                onClick={onToggleEnhancement}
                style={{
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '0 8px 0 16px',
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                Bypassed — raw mic
                <span
                  style={{
                    width: '40px',
                    height: '24px',
                    borderRadius: '12px',
                    background: '#666A73',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: '3px',
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#B9BBC1' }} />
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Section 1: Live Voice or Unplugged State (Height 348px) */}
        {!isMicConnected ? (
          <section
            aria-label="Microphone unplugged"
            style={{
              height: '348px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '32px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', maxWidth: '480px' }}>
              <div
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  background: '#2A1512',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FF8A7E" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
                  <path d="M3 3l18 18" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Mic unplugged · Teams is listening
                </h2>
                <span style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  Your audience is currently hearing silence. Plug your mic back in or choose another available microphone.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={onSelectMicDevice}
                  style={{
                    height: '40px',
                    padding: '0 18px',
                    borderRadius: '10px',
                    background: 'var(--accent-amber)',
                    color: '#1B1204',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Choose another microphone
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section
            aria-label="Live voice"
            style={{
              height: '348px',
              display: 'flex',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* Left Waveform graph */}
            <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px', padding: '26px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF6A5C' }} />
                  <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Live voice</h2>
                  <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{liveCaption}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '14px', height: '4px', borderRadius: '2px', background: 'var(--meter-raw)' }} />
                    Your raw mic
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '14px', height: '4px', borderRadius: '2px', background: 'var(--meter-enhanced)' }} />
                    Enhanced by Aurel
                  </span>
                </div>
              </div>

              <svg width="100%" height="220" viewBox="0 0 1120 220" preserveAspectRatio="none" role="img" aria-label="Live waveform comparing raw and enhanced voice">
                <line x1="0" y1="10" x2="1120" y2="10" stroke="#202328" strokeDasharray="2 6" />
                <line x1="0" y1="210" x2="1120" y2="210" stroke="#202328" strokeDasharray="2 6" />
                <line x1="0" y1="110" x2="1120" y2="110" stroke="#2A2D33" />
                <path d={outD} stroke="var(--accent-amber)" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity={headphoneView === 'enhanced' ? 1 : 0.14} />
                <path d={inD} stroke={headphoneView === 'enhanced' ? 'var(--meter-raw)' : 'var(--text-primary)'} strokeWidth="4.5" strokeLinecap="round" fill="none" />
              </svg>

              <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                <span>−12 s</span>
                <span>−9 s</span>
                <span>−6 s</span>
                <span>−3 s</span>
                <span>Now</span>
              </div>
            </div>

            {/* Right Output Loudness panel */}
            <div
              style={{
                width: '380px',
                flexShrink: 0,
                borderLeft: '1px solid var(--border-subtle)',
                background: '#141619',
                display: 'flex',
                flexDirection: 'column',
                gap: '22px',
                padding: '26px 28px',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Output loudness</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="mono" style={{ fontSize: '52px', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--text-primary)' }}>
                    {outLabel}
                  </span>
                  <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>LUFS</span>
                </div>
                <span style={{ fontSize: '13px', color: statusColor }}>{statusText}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Raw mic</span>
                    <span className="mono" style={{ color: 'var(--text-secondary)' }}>−41.8</span>
                  </div>
                  <svg width="324" height="8" viewBox="0 0 324 8" aria-hidden="true">
                    <rect width="324" height="8" rx="4" fill="var(--meter-bg)" />
                    <rect width={inW} height="8" rx="4" fill="var(--meter-raw)" />
                  </svg>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Enhanced</span>
                    <span className="mono" style={{ color: 'var(--text-primary)' }}>{outLabel}</span>
                  </div>
                  <svg width="324" height="8" viewBox="0 0 324 8" aria-hidden="true">
                    <rect width="324" height="8" rx="4" fill="var(--meter-bg)" />
                    <rect width={outW} height="8" rx="4" fill="var(--accent-amber)" />
                    <rect x="237" y="0" width="2" height="8" fill="#F3F2EF" />
                  </svg>
                  <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                    <span>−60</span>
                    <span>−40</span>
                    <span>−20</span>
                    <span>0</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '12px',
                  paddingTop: '18px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Voice lift</span>
                  <span className="mono" style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{liftLabel}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Noise floor</span>
                  <span className="mono" style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{floorLabel}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>True peak</span>
                  <span className="mono" style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>−1.0 dB</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 2: Sound Profile (5 columns) */}
        <section aria-labelledby="profiles-h" style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <h2 id="profiles-h" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Sound profile
              </h2>
              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                Pick the character you want. Every profile keeps your Voice Boost.
              </span>
            </div>
            {onOpenFineTune && (
              <button
                type="button"
                onClick={onOpenFineTune}
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--accent-amber)',
                  background: 'none',
                }}
              >
                Customize current profile
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '16px' }}>
            {AUREL_PROFILES.map((p) => {
              const isSelected = p.id === currentProfileId;
              return (
                <button
                  key={p.id}
                  className="card-btn"
                  onClick={() => onSelectProfile(p)}
                  aria-pressed={isSelected}
                  style={{
                    position: 'relative',
                    height: '172px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '18px 20px',
                    boxSizing: 'border-box',
                    textAlign: 'left',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '14px',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  {isSelected && (
                    <>
                      <span
                        style={{
                          position: 'absolute',
                          left: '-1px',
                          top: '-1px',
                          right: '-1px',
                          bottom: '-1px',
                          border: '2px solid var(--accent-amber)',
                          borderRadius: '14px',
                          pointerEvents: 'none',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: '14px',
                          top: '14px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'var(--accent-amber)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1B1204" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m5 12 5 5 9-10" />
                        </svg>
                      </span>
                    </>
                  )}

                  <svg width="200" height="38" viewBox="0 0 260 40" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="0" y1="24" x2="260" y2="24" stroke="#2A2D33" strokeDasharray="3 4" />
                    <path d={p.curve} fill="none" stroke={isSelected ? 'var(--accent-amber)' : 'var(--text-tertiary)'} strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                  <span style={{ fontSize: '13px', lineHeight: 1.45, color: 'var(--text-secondary)' }}>{p.desc}</span>
                  <span style={{ marginTop: 'auto', fontSize: '12px', color: 'var(--text-tertiary)' }}>{p.tags}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 3: Essential Controls (3 columns) */}
        <section aria-label="Essential controls" style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '24px', minHeight: '260px' }}>
          {/* Column 1: Voice Boost */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '22px 24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Voice Boost</h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'var(--accent-amber-tint)',
                    color: 'var(--accent-amber-text)',
                  }}
                >
                  For soft speakers
                </span>
              </div>
              <span className="mono" style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {boostLabel}
              </span>
            </div>

            <AurelSlider
              value={boost}
              onChange={onBoostChange}
              min={0}
              max={100}
              ariaLabel="Voice Boost amount"
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              <span>Natural level</span>
              <span>Broadcast loud</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Adds clean gain after noise removal, so soft speech reaches broadcast loudness without lifting the room.
            </p>

            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '14px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Auto-level when I lean away</span>
              <button
                type="button"
                role="switch"
                aria-checked={autoLevel}
                onClick={() => setAutoLevel(!autoLevel)}
                aria-label="Auto-level"
                style={{
                  width: '40px',
                  height: '24px',
                  borderRadius: '12px',
                  background: autoLevel ? 'var(--accent-amber)' : '#666A73',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: autoLevel ? 'flex-end' : 'flex-start',
                  padding: '3px',
                  boxSizing: 'border-box',
                  border: 0,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: autoLevel ? '#1B1204' : '#B9BBC1' }} />
              </button>
            </div>
          </div>

          {/* Column 2: Background noise */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '22px 24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Background noise</h2>
              <span className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Room {floorLabel}
              </span>
            </div>

            <div
              role="group"
              aria-label="Noise removal strength"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: '2px',
                padding: '3px',
                background: '#111215',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
              }}
            >
              {(['off', 'light', 'balanced', 'strong'] as NoiseCleanupMode[]).map((mode) => {
                const isSel = noise === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={isSel}
                    onClick={() => onNoiseChange(mode)}
                    style={{
                      height: '34px',
                      padding: '0 4px',
                      border: 0,
                      borderRadius: '7px',
                      background: isSel ? '#2B2E34' : 'transparent',
                      color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: isSel ? 600 : 500,
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                  >
                    {NOISE_MAP[mode].label}
                  </button>
                );
              })}
            </div>

            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {noiseMap.desc}
            </p>

            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '6px',
                paddingTop: '14px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
              }}
            >
              <span style={{ marginRight: '2px' }}>Removing now</span>
              <span style={{ padding: '3px 8px', borderRadius: '999px', background: 'var(--bg-control)', color: 'var(--text-secondary)', fontSize: '11px' }}>Fan hum</span>
              <span style={{ padding: '3px 8px', borderRadius: '999px', background: 'var(--bg-control)', color: 'var(--text-secondary)', fontSize: '11px' }}>Keyboard</span>
              <span style={{ padding: '3px 8px', borderRadius: '999px', background: 'var(--bg-control)', color: 'var(--text-secondary)', fontSize: '11px' }}>Room echo</span>
            </div>
          </div>

          {/* Column 3: Tone */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '22px 24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Tone</h2>
              {onOpenFineTune && (
                <button
                  type="button"
                  onClick={onOpenFineTune}
                  style={{ fontSize: '13px', fontWeight: 500, color: 'var(--accent-amber)', background: 'none' }}
                >
                  Open equalizer
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Warmth</span>
                <span className="mono" style={{ color: 'var(--text-secondary)' }}>{warmthLabel}</span>
              </div>
              <AurelSlider
                value={warmth}
                onChange={onWarmthChange}
                min={0}
                max={100}
                ariaLabel="Warmth"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Presence</span>
                <span className="mono" style={{ color: 'var(--text-secondary)' }}>{presenceLabel}</span>
              </div>
              <AurelSlider
                value={presence}
                onChange={onPresenceChange}
                min={0}
                max={100}
                ariaLabel="Presence"
              />
            </div>

            <p style={{ margin: 0, marginTop: 'auto', fontSize: '13px', lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
              Warmth adds low-end body like a close-up broadcast mic. Presence brings words forward.
            </p>
          </div>
        </section>
    </div>
  );
};
