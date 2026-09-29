import React, { useState, useEffect, useMemo } from 'react';
import { AudioDeviceOption } from '../types';

interface VoiceCheckWizardProps {
  isOpen: boolean;
  onClose: () => void;
  inputDevices: AudioDeviceOption[];
  selectedInputId: string;
  onSelectInputId: (id: string) => void;
  onApplyProfile?: (profileId: string) => void;
}

export const VoiceCheckWizard: React.FC<VoiceCheckWizardProps> = ({
  isOpen,
  onClose,
  inputDevices,
  selectedInputId,
  onSelectInputId,
  onApplyProfile,
}) => {
  const [step, setStep] = useState<number>(1);
  const [manageVolume, setManageVolume] = useState<boolean>(true);
  const [defaultMicSwitch, setDefaultMicSwitch] = useState<boolean>(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('broadcast');
  const [previewMode, setPreviewMode] = useState<'original' | 'enhanced'>('enhanced');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [voiceSeconds, setVoiceSeconds] = useState<number>(7.2);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Countdown timer for Step 2
  useEffect(() => {
    let interval: any;
    if (isOpen && step === 2 && isRecording) {
      interval = setInterval(() => {
        setVoiceSeconds((prev) => {
          if (prev >= 10) {
            setIsRecording(false);
            return 10;
          }
          return Number((prev + 0.1).toFixed(1));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isOpen, step, isRecording]);

  if (!isOpen) return null;

  const currentDevice = inputDevices.find((d) => d.deviceId === selectedInputId);
  const currentDeviceLabel = currentDevice?.label || 'USB Microphone';

  const profiles = [
    {
      id: 'broadcast',
      name: 'Broadcast',
      desc: 'Deep, close and controlled. The late-night radio voice.',
      recommended: true,
      curve: 'M0 30 C18 30 28 11 58 12 S108 25 140 25 S198 17 228 19 S254 27 260 29',
    },
    {
      id: 'podcast',
      name: 'Podcast',
      desc: 'Rich and even for long-form talk, interviews and narration.',
      recommended: false,
      curve: 'M0 33 C25 33 40 17 72 17 S120 23 150 22 S210 16 240 18 S258 25 260 27',
    },
    {
      id: 'clear',
      name: 'Clear Speech',
      desc: 'Crisp and intelligible. Tuned for meetings and calls.',
      recommended: false,
      curve: 'M0 39 C20 39 34 27 60 25 S120 23 150 21 S190 9 215 11 S250 21 260 25',
    },
    {
      id: 'condenser',
      name: 'Studio Condenser',
      desc: 'Open, airy detail with a polished top end.',
      recommended: false,
      curve: 'M0 34 C30 34 50 24 90 24 S150 25 180 21 S230 8 260 7',
    },
    {
      id: 'natural',
      name: 'Natural',
      desc: 'Light cleanup only. Still you, just clearer and louder.',
      recommended: false,
      curve: 'M0 29 C30 26 60 24 130 24 S230 24 260 25',
    },
  ];

  // Helper for segmented meter paths (Board 02 & 08)
  const renderStep1Segment = (lit: number) => {
    let on = '', off = '';
    for (let i = 0; i < 24; i++) {
      const d = `M${i * 10} 0h7v14h-7z `;
      if (i < lit) on += d;
      else off += d;
    }
    return { on, off };
  };

  const renderStep2Meter = () => {
    const N = 72, stepPx = 18, w = 14, top = 14, h = 30;
    const lit = Math.round((voiceSeconds / 10) * 32);
    let onD = '', offD = '';
    for (let i = 0; i < N; i++) {
      const x = i * stepPx;
      const seg = `M${x} ${top}h${w}v${h}h-${w}z `;
      if (i < lit) onD += seg;
      else offD += seg;
    }
    const zs = 36 * stepPx;
    const ze = 48 * stepPx - 4;
    const zoneD = `M${zs} 8V2H${ze}V8`;
    return { onD, offD, zoneD, peakX: 28 * stepPx };
  };

  const { onD: s2OnD, offD: s2OffD, zoneD: s2ZoneD, peakX: s2PeakX } = renderStep2Meter();

  // Waveform for Step 3 Preview Player
  const renderStep3Wave = () => {
    let waveDone = '', waveTodo = '';
    for (let i = 0; i < 122; i++) {
      const x = 3 + i * 6;
      const r = (Math.sin(i * 7.233) * 43758.5453) % 1;
      const e = Math.abs(Math.sin(i * 0.29)) * Math.max(0, Math.sin(i * 0.06 + 0.3));
      const h = previewMode === 'enhanced'
        ? (e > 0.07 ? Math.min(26, 3 + 24 * Math.pow(e * (0.75 + 0.25 * r), 0.5)) : 1.2)
        : (1.5 + 8 * e * (0.55 + 0.45 * r));
      const d = `M${x} ${(28 - h).toFixed(1)}V${(28 + h).toFixed(1)} `;
      if (x < 295) waveDone += d;
      else waveTodo += d;
    }
    return { waveDone, waveTodo };
  };

  const { waveDone: s3Done, waveTodo: s3Todo } = renderStep3Wave();

  const handleFinish = () => {
    if (onApplyProfile) onApplyProfile(selectedProfileId);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        background: '#0D0E10',
        overflow: 'hidden',
        color: '#F3F2EF',
      }}
    >
      {/* 40px Setup Titlebar */}
      <header
        style={{
          height: '40px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '16px',
          borderBottom: '1px solid #1C1E22',
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
          <span style={{ fontSize: '12px', color: '#B9BBC1' }}>Aurel Voice Studio — Setup</span>
        </div>
        <div style={{ display: 'flex' }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '46px',
              height: '40px',
              border: 0,
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B9BBC1',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Setup Content Area */}
      <div style={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
        {/* Left Sidebar Stepper (400px) */}
        <aside
          style={{
            width: '400px',
            flexShrink: 0,
            background: '#111215',
            borderRight: '1px solid #1C1E22',
            display: 'flex',
            flexDirection: 'column',
            gap: '48px',
            padding: '48px 40px 36px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <svg width="44" height="44" viewBox="0 0 28 28" aria-hidden="true">
              <rect width="28" height="28" rx="8" fill="#F5A623" />
              <path
                d="M8 14v0M11 10.5v7M14 7.5v13M17 10.5v7M20 13.5v1"
                stroke="#1B1204"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em' }}>
                Set up Aurel
              </span>
              <span style={{ fontSize: '14px', lineHeight: 1.5, color: '#B9BBC1' }}>
                Four quick steps to a broadcast-quality voice. About two minutes.
              </span>
            </div>
          </div>

          <ol aria-label="Setup steps" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
            {/* Step 1 Item */}
            <li style={{ display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {step > 1 ? (
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1E3A2B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#43D18A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  </span>
                ) : (
                  <span className="mono" style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F5A623', color: '#1B1204', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    1
                  </span>
                )}
                <span style={{ width: '2px', flexGrow: 1, minHeight: '34px', background: step > 1 ? '#2A3A31' : '#26292E' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px', paddingBottom: '22px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: step === 1 ? '#F3F2EF' : '#B9BBC1' }}>Microphone</span>
                <span style={{ fontSize: '13px', color: '#B9BBC1' }}>{step > 1 ? `${currentDeviceLabel} selected` : 'Pick the mic you speak into'}</span>
              </div>
            </li>

            {/* Step 2 Item */}
            <li style={{ display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {step > 2 ? (
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1E3A2B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#43D18A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  </span>
                ) : step === 2 ? (
                  <span className="mono" style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F5A623', color: '#1B1204', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    2
                  </span>
                ) : (
                  <span className="mono" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid #3A3E46', color: '#8C9098', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    2
                  </span>
                )}
                <span style={{ width: '2px', flexGrow: 1, minHeight: '34px', background: step > 2 ? '#2A3A31' : '#26292E' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px', paddingBottom: '22px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: step === 2 ? '#F3F2EF' : step > 2 ? '#B9BBC1' : '#8C9098' }}>Voice check</span>
                <span style={{ fontSize: '13px', color: step >= 2 ? '#B9BBC1' : '#8C9098' }}>{step > 2 ? 'Soft voice · −42 LUFS' : 'Measure how loudly you speak'}</span>
              </div>
            </li>

            {/* Step 3 Item */}
            <li style={{ display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {step > 3 ? (
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1E3A2B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#43D18A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  </span>
                ) : step === 3 ? (
                  <span className="mono" style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F5A623', color: '#1B1204', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    3
                  </span>
                ) : (
                  <span className="mono" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid #3A3E46', color: '#8C9098', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    3
                  </span>
                )}
                <span style={{ width: '2px', flexGrow: 1, minHeight: '34px', background: step > 3 ? '#2A3A31' : '#26292E' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px', paddingBottom: '22px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: step === 3 ? '#F3F2EF' : step > 3 ? '#B9BBC1' : '#8C9098' }}>Choose your sound</span>
                <span style={{ fontSize: '13px', color: step >= 3 ? '#B9BBC1' : '#8C9098' }}>{step > 3 ? 'Broadcast' : 'Broadcast, podcast, or clear speech'}</span>
              </div>
            </li>

            {/* Step 4 Item */}
            <li style={{ display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="mono" style={{ width: '28px', height: '28px', borderRadius: '50%', border: step === 4 ? '0' : '1.5px solid #3A3E46', background: step === 4 ? '#F5A623' : 'transparent', color: step === 4 ? '#1B1204' : '#8C9098', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  4
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: step === 4 ? '#F3F2EF' : '#8C9098' }}>Connect your apps</span>
                <span style={{ fontSize: '13px', color: step === 4 ? '#B9BBC1' : '#8C9098' }}>Zoom, Teams, Discord, OBS and more</span>
              </div>
            </li>
          </ol>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', padding: '16px', borderRadius: '12px', background: '#17191C', border: '1px solid #24272C' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B9BBC1" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: '1px' }}>
              <path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3z" />
            </svg>
            <span style={{ fontSize: '13px', lineHeight: 1.5, color: '#B9BBC1' }}>
              Your voice never leaves this PC. Aurel works fully offline and keeps no recordings.
            </span>
          </div>
        </aside>

        {/* Right Main Stepper Panel */}
        <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '32px', padding: '56px 80px 44px', boxSizing: 'border-box', minWidth: 0, overflowY: 'auto' }}>
          
          {/* STEP 1: CHOOSE MICROPHONE */}
          {step === 1 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F5A623' }}>
                  Step 1 of 4
                </span>
                <h1 style={{ margin: 0, fontSize: '38px', fontWeight: 600, letterSpacing: '-0.025em' }}>
                  Which microphone do you speak into?
                </h1>
                <p style={{ margin: 0, maxWidth: '860px', fontSize: '16px', lineHeight: 1.55, color: '#B9BBC1' }}>
                  We found {inputDevices.length || 3} on this PC. Say a few words — the one that hears you best lights up.
                </p>
              </div>

              <div role="radiogroup" aria-label="Microphone" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {inputDevices.map((d, idx) => {
                  const isSelected = d.deviceId === selectedInputId || (idx === 0 && !selectedInputId);
                  const isPrimary = idx === 0;
                  const lit = isPrimary ? 16 : idx === 1 ? 7 : 3;
                  const seg = renderStep1Segment(lit);
                  return (
                    <button
                      key={d.deviceId || idx}
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onSelectInputId(d.deviceId)}
                      style={{
                        position: 'relative',
                        height: '96px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        padding: '0 24px',
                        boxSizing: 'border-box',
                        borderRadius: '16px',
                        background: '#16181B',
                        border: '1px solid #24272C',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      {isSelected && (
                        <span style={{ position: 'absolute', left: '-1px', top: '-1px', right: '-1px', bottom: '-1px', border: '2px solid #F5A623', borderRadius: '16px', pointerEvents: 'none' }} />
                      )}
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${isSelected ? '#F5A623' : '#5A5E66'}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSelected && <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F5A623' }} />}
                      </span>
                      <span style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#23262B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F3F2EF" strokeWidth="1.8" strokeLinecap="round">
                          <rect x="9" y="3" width="6" height="11" rx="3" />
                          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
                        </svg>
                      </span>
                      <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: '#F3F2EF' }}>{d.label || 'Microphone'}</span>
                          {isPrimary && (
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#16301F', color: '#6BE3A4' }}>
                              Hears you best
                            </span>
                          )}
                        </span>
                        <span style={{ fontSize: '13px', color: '#8C9098' }}>USB · 48 kHz</span>
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                        <svg width="240" height="14" viewBox="0 0 240 14" aria-hidden="true">
                          <path d={seg.off} fill="#23262B" />
                          <path d={seg.on} fill={lit > 12 ? '#F3F2EF' : '#9EA1A8'} />
                        </svg>
                        <span style={{ fontSize: '12px', color: '#8C9098' }}>{isPrimary ? 'Clear voice, quiet room' : 'Mostly room and fan noise'}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tips and Manage Volume grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px' }}>
                <section aria-labelledby="tip-h" style={{ display: 'flex', gap: '20px', padding: '24px', borderRadius: '16px', background: '#16181B', border: '1px solid #24272C' }}>
                  <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <rect width="120" height="120" rx="12" fill="#1B1D21" />
                    <rect x="18" y="38" width="30" height="44" rx="15" fill="none" stroke="#9EA1A8" strokeWidth="2" />
                    <path d="M48 60h26" stroke="#F5A623" strokeWidth="2" strokeDasharray="3 4" />
                    <circle cx="92" cy="60" r="14" fill="none" stroke="#F3F2EF" strokeWidth="2" />
                    <path d="M86 66q6 4 12 0" stroke="#F3F2EF" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <text x="61" y="52" fill="#FFC869" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">5–15 cm</text>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h2 id="tip-h" style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Get the most from any mic</h2>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: '#B9BBC1' }}>
                      Stay 5–15 cm from the mic and speak slightly past it, not straight into it, to avoid pops. Closer means more voice and less room. Aurel makes up the volume, so you never have to lean in.
                    </p>
                  </div>
                </section>

                <section aria-labelledby="vol-h" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', padding: '24px', borderRadius: '16px', background: '#16181B', border: '1px solid #24272C' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <h2 id="vol-h" style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Let Aurel manage input volume</h2>
                      <span style={{ fontSize: '13px', lineHeight: 1.55, color: '#B9BBC1' }}>
                        Windows has this mic at 64%. Aurel sets it to 100% and does all the lifting cleanly after that.
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={manageVolume}
                      onClick={() => setManageVolume(!manageVolume)}
                      style={{
                        width: '44px',
                        height: '26px',
                        borderRadius: '13px',
                        background: manageVolume ? '#F5A623' : '#666A73',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: manageVolume ? 'flex-end' : 'flex-start',
                        padding: '3px',
                        boxSizing: 'border-box',
                        flexShrink: 0,
                        border: 0,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: manageVolume ? '#1B1204' : '#F3F2EF' }} />
                    </button>
                  </div>
                  <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#8C9098' }}>
                    <span>64%</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                    <span style={{ color: '#F3F2EF' }}>100%</span>
                  </div>
                </section>
              </div>

              {/* Step 1 Actions */}
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={onClose} style={{ height: '44px', display: 'flex', alignItems: 'center', padding: '0 4px', fontSize: '14px', fontWeight: 500, color: '#B9BBC1', background: 'transparent', border: 0 }}>
                  Skip setup
                </button>
                <button
                  onClick={() => {
                    setStep(2);
                    setIsRecording(true);
                  }}
                  style={{ height: '44px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', borderRadius: '10px', background: '#F5A623', color: '#1B1204', fontSize: '14px', fontWeight: 600, border: 0, cursor: 'pointer' }}
                >
                  Continue
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* STEP 2: VOICE CHECK */}
          {step === 2 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F5A623' }}>
                  Step 2 of 4
                </span>
                <h1 style={{ margin: 0, fontSize: '38px', fontWeight: 600, letterSpacing: '-0.025em' }}>
                  Let’s hear your normal speaking voice
                </h1>
                <p style={{ margin: 0, maxWidth: '820px', fontSize: '16px', lineHeight: 1.55, color: '#B9BBC1' }}>
                  Read the line below the way you usually talk in meetings. Don’t lean in or speak up — Aurel works best when it hears your real level.
                </p>
              </div>

              <section aria-label="Read aloud" style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '32px', background: '#16181B', border: '1px solid #24272C', borderRadius: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF6A5C' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{isRecording ? 'Listening' : 'Finished listening'}</span>
                    <span className="mono" style={{ fontSize: '13px', color: '#8C9098' }}>{voiceSeconds} s of 10 s</span>
                  </div>
                  <svg width="220" height="6" viewBox="0 0 220 6" aria-hidden="true">
                    <rect width="220" height="6" rx="3" fill="#23262B" />
                    <rect width={Math.round((voiceSeconds / 10) * 220)} height="6" rx="3" fill="#F3F2EF" />
                  </svg>
                </div>

                <p style={{ margin: 0, fontSize: '30px', lineHeight: 1.4, fontWeight: 500, letterSpacing: '-0.015em', color: '#F3F2EF' }}>
                  “The morning light spilled over the harbor as the first boats headed out, <span style={{ color: '#8C9098' }}>and the town slowly woke to the sound of gulls and distant engines.</span>”
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ position: 'relative', width: '100%', height: '44px' }}>
                    <svg width="100%" height="44" viewBox="0 0 1296 44" preserveAspectRatio="none" role="img" aria-label="Input level meter">
                      <path d={s2ZoneD} fill="none" stroke="#5CC8DF" strokeWidth="1.5" />
                      <path d={s2OffD} fill="#23262B" />
                      <path d={s2OnD} fill="#F3F2EF" />
                    </svg>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${(s2PeakX / 1296) * 100}%`,
                      top: '14px',
                      width: '14px',
                      height: '30px',
                      borderRadius: '2px',
                      background: '#9EA1A8',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
                  <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8C9098' }}>
                    <span>−60 dB</span><span>−48</span><span>−36</span><span>−24</span><span>−12</span><span>0</span>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#B9BBC1' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F3F2EF' }} />Your level now
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#9EA1A8' }} />Your loudest word
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '14px', height: '6px', border: '1.5px solid #5CC8DF', borderBottom: 0, boxSizing: 'border-box' }} />Typical speaking range
                    </span>
                  </div>
                </div>
              </section>

              {/* What we heard 3-col */}
              <section aria-label="What we heard" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '24px', background: '#16181B', border: '1px solid #24272C', borderRadius: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#8C9098' }}>Your speaking level</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span className="mono" style={{ fontSize: '34px', fontWeight: 500, letterSpacing: '-0.02em' }}>−42</span>
                    <span style={{ fontSize: '14px', color: '#B9BBC1' }}>LUFS</span>
                    <span style={{ marginLeft: '6px', fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#2A2111', color: '#FFC869' }}>Soft</span>
                  </div>
                  <span style={{ fontSize: '13px', lineHeight: 1.5, color: '#B9BBC1' }}>
                    About 26 dB below a broadcast voice. Aurel will lift it cleanly.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '24px', background: '#16181B', border: '1px solid #24272C', borderRadius: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#8C9098' }}>Room noise</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span className="mono" style={{ fontSize: '34px', fontWeight: 500, letterSpacing: '-0.02em' }}>−68</span>
                    <span style={{ fontSize: '14px', color: '#B9BBC1' }}>dB</span>
                    <span style={{ marginLeft: '6px', fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#16301F', color: '#6BE3A4' }}>Quiet room</span>
                  </div>
                  <span style={{ fontSize: '13px', lineHeight: 1.5, color: '#B9BBC1' }}>
                    Low fan hum detected. Balanced noise removal will handle it.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '24px', background: '#16181B', border: '1px solid #24272C', borderRadius: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#8C9098' }}>Microphone</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{currentDeviceLabel}</span>
                  </div>
                  <span style={{ fontSize: '13px', lineHeight: 1.5, color: '#B9BBC1' }}>
                    Mic correction measured: adds body, tames boxiness. Stay 5–15 cm away for the fullest tone.
                  </span>
                </div>
              </section>

              {/* Recommendation card */}
              <section aria-label="Recommendation" style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '22px 24px', borderRadius: '16px', background: '#1C1810', border: '1px solid #4A3715' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F5A623', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B1204" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>Recommended for you: Broadcast profile with Voice Boost +26 dB</span>
                  <span style={{ fontSize: '14px', color: '#D8C9AE' }}>Brings your voice to −16 LUFS, the loudness podcasts and radio use, while keeping the room silent.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => setPreviewMode('original')}
                    style={{
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      background: previewMode === 'original' ? '#2A2111' : 'transparent',
                      border: '1px solid #5A4213',
                      color: '#FFC869',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 4.5v15l12-7.5z" />
                    </svg>
                    Hear before
                  </button>
                  <button
                    onClick={() => setPreviewMode('enhanced')}
                    style={{
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      background: previewMode === 'enhanced' ? '#F5A623' : 'transparent',
                      border: previewMode === 'enhanced' ? '0' : '1px solid #5A4213',
                      color: previewMode === 'enhanced' ? '#1B1204' : '#FFC869',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 4.5v15l12-7.5z" />
                    </svg>
                    Hear after
                  </button>
                </div>
              </section>

              {/* Step 2 Actions */}
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={onClose} style={{ height: '44px', display: 'flex', alignItems: 'center', padding: '0 4px', fontSize: '14px', fontWeight: 500, color: '#B9BBC1', background: 'transparent', border: 0, cursor: 'pointer' }}>
                  Skip setup
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{ height: '44px', display: 'flex', alignItems: 'center', padding: '0 20px', borderRadius: '10px', background: '#17191C', border: '1px solid #33373E', fontSize: '14px', fontWeight: 500, color: '#F3F2EF', cursor: 'pointer' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setVoiceSeconds(0);
                      setIsRecording(true);
                    }}
                    style={{ height: '44px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', borderRadius: '10px', background: '#17191C', border: '1px solid #33373E', fontSize: '14px', fontWeight: 500, color: '#F3F2EF', cursor: 'pointer' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    Record again
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    style={{ height: '44px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', borderRadius: '10px', background: '#F5A623', color: '#1B1204', fontSize: '14px', fontWeight: 600, border: 0, cursor: 'pointer' }}
                  >
                    Continue
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* STEP 3: CHOOSE YOUR SOUND */}
          {step === 3 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F5A623' }}>
                  Step 3 of 4
                </span>
                <h1 style={{ margin: 0, fontSize: '38px', fontWeight: 600, letterSpacing: '-0.025em' }}>
                  Choose how you want to sound
                </h1>
                <p style={{ margin: 0, maxWidth: '860px', fontSize: '16px', lineHeight: 1.55, color: '#B9BBC1' }}>
                  Play your own voice from the voice check through each profile. Your Voice Boost of +26 dB is already applied. You can change this any time.
                </p>
              </div>

              {/* 5-col profile cards */}
              <div role="radiogroup" aria-label="Sound profile" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '16px' }}>
                {profiles.map((p) => {
                  const isSelected = selectedProfileId === p.id;
                  return (
                    <div
                      key={p.id}
                      style={{
                        position: 'relative',
                        height: '268px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        padding: '22px',
                        boxSizing: 'border-box',
                        borderRadius: '16px',
                        background: '#16181B',
                        border: '1px solid #24272C',
                      }}
                    >
                      {isSelected && (
                        <span style={{ position: 'absolute', left: '-1px', top: '-1px', right: '-1px', bottom: '-1px', border: '2px solid #F5A623', borderRadius: '16px', pointerEvents: 'none' }} />
                      )}
                      <div style={{ height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {p.recommended && (
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#2A2111', color: '#FFC869' }}>
                            Recommended for you
                          </span>
                        )}
                      </div>
                      <svg width="100%" height="44" viewBox="0 0 260 40" preserveAspectRatio="none" aria-hidden="true">
                        <line x1="0" y1="24" x2="260" y2="24" stroke="#2A2D33" strokeDasharray="3 4" />
                        <path d={p.curve} fill="none" stroke={isSelected ? '#F5A623' : '#8C9098'} strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      <button
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedProfileId(p.id)}
                        style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: 0, border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                      >
                        <span style={{ fontSize: '17px', fontWeight: 600, color: '#F3F2EF' }}>{p.name}</span>
                        <span style={{ fontSize: '13px', lineHeight: 1.5, color: '#B9BBC1' }}>{p.desc}</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProfileId(p.id);
                          setIsPlaying(!isPlaying);
                        }}
                        style={{
                          marginTop: 'auto',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          borderRadius: '10px',
                          background: isSelected && isPlaying ? '#F5A623' : '#1F2227',
                          border: isSelected && isPlaying ? '0' : '1px solid #33373E',
                          color: isSelected && isPlaying ? '#1B1204' : '#F3F2EF',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d={isSelected && isPlaying ? 'M6 4h4v16H6zM14 4h4v16h-4z' : 'M7 4.5v15l12-7.5z'} />
                        </svg>
                        {isSelected && isPlaying ? 'Pause' : 'Play preview'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Preview player */}
              <section aria-label="Preview player" style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '20px 24px', borderRadius: '16px', background: '#16181B', border: '1px solid #24272C' }}>
                <button
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F5A623', border: 0, color: '#1B1204', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d={isPlaying ? 'M6 4h4v16H6zM14 4h4v16h-4z' : 'M7 4.5v15l12-7.5z'} />
                  </svg>
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '230px', flexShrink: 0 }}>
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>
                    {profiles.find((p) => p.id === selectedProfileId)?.name}
                  </span>
                  <span className="mono" style={{ fontSize: '12px', color: '#8C9098' }}>0:04 / 0:10 · from your voice check</span>
                </div>
                <svg width="760" height="56" viewBox="0 0 760 56" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d={s3Done} stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
                  <path d={s3Todo} stroke="#3A3E46" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div role="group" aria-label="Compare" style={{ marginLeft: 'auto', display: 'flex', gap: '2px', padding: '3px', background: '#111215', border: '1px solid #26292E', borderRadius: '10px' }}>
                  <button
                    aria-pressed={previewMode === 'original'}
                    onClick={() => setPreviewMode('original')}
                    style={{
                      height: '34px',
                      padding: '0 14px',
                      border: 0,
                      borderRadius: '7px',
                      background: previewMode === 'original' ? '#2B2E34' : 'transparent',
                      color: previewMode === 'original' ? '#F3F2EF' : '#B9BBC1',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Original
                  </button>
                  <button
                    aria-pressed={previewMode === 'enhanced'}
                    onClick={() => setPreviewMode('enhanced')}
                    style={{
                      height: '34px',
                      padding: '0 14px',
                      border: 0,
                      borderRadius: '7px',
                      background: previewMode === 'enhanced' ? '#2B2E34' : 'transparent',
                      color: previewMode === 'enhanced' ? '#F3F2EF' : '#B9BBC1',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Enhanced
                  </button>
                </div>
              </section>

              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#8C9098' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3z" />
                </svg>
                The 10-second clip stays on this PC and is deleted when setup finishes.
              </p>

              {/* Step 3 Actions */}
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={onClose} style={{ height: '44px', display: 'flex', alignItems: 'center', padding: '0 4px', fontSize: '14px', fontWeight: 500, color: '#B9BBC1', background: 'transparent', border: 0, cursor: 'pointer' }}>
                  Skip setup
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setStep(2)}
                    style={{ height: '44px', display: 'flex', alignItems: 'center', padding: '0 20px', borderRadius: '10px', background: '#17191C', border: '1px solid #33373E', fontSize: '14px', fontWeight: 500, color: '#F3F2EF', cursor: 'pointer' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    style={{ height: '44px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', borderRadius: '10px', background: '#F5A623', color: '#1B1204', fontSize: '14px', fontWeight: 600, border: 0, cursor: 'pointer' }}
                  >
                    Continue
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* STEP 4: CONNECT APPS */}
          {step === 4 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F5A623' }}>
                  Step 4 of 4
                </span>
                <h1 style={{ margin: 0, fontSize: '38px', fontWeight: 600, letterSpacing: '-0.025em' }}>
                  Send your new voice to your apps
                </h1>
                <p style={{ margin: 0, maxWidth: '860px', fontSize: '16px', lineHeight: 1.55, color: '#B9BBC1' }}>
                  Aurel adds a microphone to Windows called “Aurel Microphone”. Apps that use it hear your enhanced voice.
                </p>
              </div>

              {/* Default mic banner */}
              <section aria-label="Default microphone" style={{ display: 'flex', alignItems: 'center', gap: '28px', padding: '28px 32px', borderRadius: '18px', background: '#1C1810', border: '1px solid #4A3715' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#F5A623', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1B1204" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
                  </svg>
                </div>
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 600 }}>Make Aurel the Windows default microphone</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#F5A623', color: '#1B1204' }}>Recommended</span>
                  </span>
                  <span style={{ fontSize: '14px', lineHeight: 1.5, color: '#D8C9AE' }}>
                    Most apps follow the Windows default, so they switch over on their own. You can undo this from Settings any time.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={defaultMicSwitch}
                  onClick={() => setDefaultMicSwitch(!defaultMicSwitch)}
                  style={{
                    width: '52px',
                    height: '30px',
                    borderRadius: '15px',
                    background: defaultMicSwitch ? '#F5A623' : '#666A73',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: defaultMicSwitch ? 'flex-end' : 'flex-start',
                    padding: '3px',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    border: 0,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: defaultMicSwitch ? '#1B1204' : '#F3F2EF' }} />
                </button>
              </section>

              {/* Apps we found 4-col */}
              <section aria-labelledby="found-h" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <h2 id="found-h" style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Apps we found</h2>
                  <span style={{ fontSize: '13px', color: '#8C9098' }}>3 are ready. 1 needs a quick change, which we’ll walk you through later.</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', borderRadius: '14px', background: '#16181B', border: '1px solid #24272C' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#2B2E34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600 }}>Te</span>
                      <span style={{ fontSize: '15px', fontWeight: 600 }}>Microsoft Teams</span>
                    </div>
                    <span style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '999px', background: '#16301F', color: '#6BE3A4' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                      Ready
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', borderRadius: '14px', background: '#16181B', border: '1px solid #24272C' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#2B2E34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600 }}>Zo</span>
                      <span style={{ fontSize: '15px', fontWeight: 600 }}>Zoom Workplace</span>
                    </div>
                    <span style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '999px', background: '#16301F', color: '#6BE3A4' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                      Ready
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', borderRadius: '14px', background: '#16181B', border: '1px solid #24272C' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#2B2E34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600 }}>Ob</span>
                      <span style={{ fontSize: '15px', fontWeight: 600 }}>OBS Studio</span>
                    </div>
                    <span style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '999px', background: '#16301F', color: '#6BE3A4' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                      Ready
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', borderRadius: '14px', background: '#16181B', border: '1px solid #24272C' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#2B2E34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600 }}>Di</span>
                      <span style={{ fontSize: '15px', fontWeight: 600 }}>Discord</span>
                    </div>
                    <span style={{ alignSelf: 'flex-start', fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '999px', background: '#2A2111', color: '#FFC869' }}>
                      Uses your mic directly · fix later
                    </span>
                  </div>
                </div>
              </section>

              {/* Your setup routing flow */}
              <section aria-label="Your setup" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '22px 28px', borderRadius: '16px', background: '#16181B', border: '1px solid #24272C' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8C9098', width: '110px' }}>Your setup</span>
                <span style={{ fontSize: '15px', fontWeight: 500 }}>{currentDeviceLabel}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8C9098" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <span style={{ fontSize: '15px', fontWeight: 500 }}>{profiles.find((p) => p.id === selectedProfileId)?.name}</span>
                <span className="mono" style={{ fontSize: '13px', color: '#8C9098' }}>+26 dB · noise Balanced</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8C9098" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <span style={{ fontSize: '15px', fontWeight: 500, color: '#FFC869' }}>Aurel Microphone</span>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#B9BBC1' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M3 12h1M7 8v8M11 4v16M15 8v8M19 11v2" />
                  </svg>
                  Lives in the system tray after setup
                </span>
              </section>

              {/* Step 4 Actions */}
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={onClose} style={{ height: '44px', display: 'flex', alignItems: 'center', padding: '0 4px', fontSize: '14px', fontWeight: 500, color: '#B9BBC1', background: 'transparent', border: 0, cursor: 'pointer' }}>
                  Skip setup
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setStep(3)}
                    style={{ height: '44px', display: 'flex', alignItems: 'center', padding: '0 20px', borderRadius: '10px', background: '#17191C', border: '1px solid #33373E', fontSize: '14px', fontWeight: 500, color: '#F3F2EF', cursor: 'pointer' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinish}
                    style={{ height: '44px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', borderRadius: '10px', background: '#F5A623', color: '#1B1204', fontSize: '14px', fontWeight: 600, border: 0, cursor: 'pointer' }}
                  >
                    Finish and open Aurel
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
};
