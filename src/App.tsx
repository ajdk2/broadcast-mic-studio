import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { StudioView } from './components/StudioView';
import { ProfilesView } from './components/ProfilesView';
import { FineTuneView } from './components/FineTuneView';
import { ConnectAppsView } from './components/ConnectAppsView';
import { SettingsView } from './components/SettingsView';
import { TestSoundModal } from './components/TestSoundModal';
import { SaveProfileModal } from './components/SaveProfileModal';
import { DeleteProfileModal } from './components/DeleteProfileModal';
import { VoiceCheckWizard } from './components/VoiceCheckWizard';
import { TrayQuickPanelModal } from './components/TrayQuickPanelModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { dspEngine } from './audio/dspEngine';
import { AUREL_PROFILES, BASE_DSP_PARAMS, MIC_CORRECTION_MODELS, NOISE_MAP } from './presets';
import { findCablePlayback } from './routing';
import {
  AudioDeviceOption,
  AurelProfile,
  DSPParameters,
  HeadphonePreviewMode,
  MeterData,
  NavigationTab,
  NoiseCleanupMode,
} from './types';

export default function App() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<NavigationTab>('studio');

  // Master Sound Engine States
  const [isEnhancementOn, setIsEnhancementOn] = useState<boolean>(true);
  const [headphoneView, setHeadphoneView] = useState<HeadphonePreviewMode>('enhanced');
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [monitorVolume, setMonitorVolume] = useState<number>(0.85);

  // Aurel Studio Quick Sliders
  const [boost, setBoost] = useState<number>(68); // 0..100 (maps to +26 dB)
  const [warmth, setWarmth] = useState<number>(62); // 0..100 (maps to +1.4 dB)
  const [presence, setPresence] = useState<number>(48); // 0..100 (maps to -0.2 dB)
  const [noise, setNoise] = useState<NoiseCleanupMode>('balanced');
  const [selectedMicModel, setSelectedMicModel] = useState<string>('none');

  // Profiles State
  const [profiles, setProfiles] = useState<AurelProfile[]>(AUREL_PROFILES);
  const [currentProfileId, setCurrentProfileId] = useState<string>('broadcast');

  // Fine-tune parameter overrides
  const [customParams, setCustomParams] = useState<DSPParameters>(BASE_DSP_PARAMS);

  // Audio Hardware Devices
  const [inputDevices, setInputDevices] = useState<AudioDeviceOption[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDeviceOption[]>([]);
  const [selectedInputId, setSelectedInputId] = useState<string>('');
  const [selectedOutputId, setSelectedOutputId] = useState<string>('');
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>('');
  const [bufferSize, setBufferSize] = useState<number>(128);

  // Real-time meter data from Web Audio
  const [meterData, setMeterData] = useState<MeterData | null>(null);

  // Modals & Overlays
  const [isTestSoundOpen, setIsTestSoundOpen] = useState<boolean>(false);
  const [isSaveProfileOpen, setIsSaveProfileOpen] = useState<boolean>(false);
  const [isVoiceCheckOpen, setIsVoiceCheckOpen] = useState<boolean>(false);
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);
  const [isTrayQuickPanelOpen, setIsTrayQuickPanelOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');

  // Theme synchronization with document element
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [theme]);

  // Load profiles and settings from SQLite on startup
  useEffect(() => {
    const loadFromDb = async () => {
      if ((window as any).studioAPI?.getPresets) {
        try {
          const dbPresets = await (window as any).studioAPI.getPresets();
          if (dbPresets && dbPresets.length > 0) {
            setProfiles((prev) => {
              const customOnly = dbPresets.filter((p: any) => !AUREL_PROFILES.some((ap) => ap.id === p.id));
              return [...AUREL_PROFILES, ...customOnly];
            });
          }
        } catch (e) {
          console.warn('Could not load SQLite presets:', e);
        }
      }
    };
    loadFromDb();
  }, []);

  // Enumerate hardware devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();

      const ins: AudioDeviceOption[] = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || 'Default Microphone',
          kind: 'audioinput',
        }));

      const outs: AudioDeviceOption[] = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || 'Default Output',
          kind: 'audiooutput',
        }));

      setInputDevices(ins);
      setOutputDevices(outs);

      if (ins.length > 0 && !selectedInputId) {
        setSelectedInputId(ins[0].deviceId);
      }

      // Send the enhanced voice to VB-Cable by default, so apps can pick it up as CABLE Output.
      if (!selectedOutputId) {
        const cable = findCablePlayback(outs);
        if (cable) setSelectedOutputId(cable.deviceId);
      }
    } catch (err) {
      console.warn('Device enumeration error:', err);
    }
  }, [selectedInputId, selectedOutputId]);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
    };
  }, [refreshDevices]);

  // Active Profile object
  const currentProfile = useMemo(
    () => profiles.find((p) => p.id === currentProfileId) || profiles[0],
    [profiles, currentProfileId]
  );

  // Compute live synthesized DSP parameters from profile + sliders + noise + mic correction
  const effectiveParams = useMemo<DSPParameters>(() => {
    const p = currentProfile.params || BASE_DSP_PARAMS;
    const nz = NOISE_MAP[noise] || NOISE_MAP.balanced;
    const mic = MIC_CORRECTION_MODELS.find((m) => m.id === selectedMicModel) || MIC_CORRECTION_MODELS[0];

    const targetPreGain = isEnhancementOn ? boost * 0.38 : 0;
    const warmthShift = (warmth - 50) * 0.12 + (mic.eqOffsets.warmthGain || 0);
    const presenceShift = (presence - 50) * 0.12 + (mic.eqOffsets.presenceGain || 0);
    const mudShift = mic.eqOffsets.mudGain || 0;
    const airShift = mic.eqOffsets.airGain || 0;
    const hpfFreq = mic.eqOffsets.hpfFreq || p.eq.hpfFreq;

    return {
      preGainDb: targetPreGain,
      noiseGate: {
        enabled: isEnhancementOn && noise !== 'off',
        thresholdDb: nz.thresholdDb,
        reductionDb: nz.reductionDb,
        attackMs: 10,
        releaseMs: 180,
      },
      eq: {
        enabled: isEnhancementOn,
        hpfFreq,
        warmthFreq: p.eq.warmthFreq,
        warmthGainDb: p.eq.warmthGainDb + warmthShift,
        mudFreq: p.eq.mudFreq,
        mudGainDb: p.eq.mudGainDb + mudShift,
        mudQ: p.eq.mudQ,
        presenceFreq: p.eq.presenceFreq,
        presenceGainDb: p.eq.presenceGainDb + presenceShift,
        presenceQ: p.eq.presenceQ,
        airFreq: p.eq.airFreq,
        airGainDb: p.eq.airGainDb + airShift,
      },
      compressor: {
        enabled: isEnhancementOn,
        thresholdDb: p.compressor.thresholdDb,
        ratio: p.compressor.ratio,
        attackMs: p.compressor.attackMs,
        releaseMs: p.compressor.releaseMs,
        kneeDb: p.compressor.kneeDb,
      },
      deEsser: {
        enabled: isEnhancementOn,
        freq: p.deEsser.freq,
        reductionDb: p.deEsser.reductionDb,
      },
      limiter: {
        enabled: isEnhancementOn,
        ceilingDb: -1.0,
      },
      outputGainDb: isEnhancementOn ? p.outputGainDb : 0,
    };
  }, [currentProfile, isEnhancementOn, boost, warmth, presence, noise, selectedMicModel]);

  // Connect DSP Meter Callback
  useEffect(() => {
    dspEngine.setMeterCallback((data: MeterData) => {
      setMeterData(data);
    });
  }, []);

  // Sync DSP Engine when parameters or devices change
  useEffect(() => {
    dspEngine.updateParameters(effectiveParams);
  }, [effectiveParams]);

  useEffect(() => {
    dspEngine.setMonitoring(isMonitoring, monitorVolume);
  }, [isMonitoring, monitorVolume]);

  // Start DSP on initial mount
  useEffect(() => {
    let started = false;
    const initAudio = async () => {
      try {
        await dspEngine.start(
          selectedInputId,
          selectedOutputId,
          selectedMonitorId,
          effectiveParams,
          isMonitoring,
          monitorVolume
        );
        started = true;
      } catch (err) {
        console.warn('Autoplay/Device permission required to start Web Audio:', err);
      }
    };

    initAudio();
    return () => {
      if (started) dspEngine.stop();
    };
  }, [selectedInputId, selectedOutputId, selectedMonitorId]);

  // Keyboard Shortcuts (matching Windows design specs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.code === 'KeyM') {
        e.preventDefault();
        setIsEnhancementOn((v) => !v);
      }
      if (e.ctrlKey && e.altKey && e.code === 'KeyB') {
        e.preventDefault();
        setIsEnhancementOn((v) => !v);
      }
      if (e.ctrlKey && e.altKey && e.code === 'KeyP') {
        e.preventDefault();
        setProfiles((currList) => {
          const idx = currList.findIndex((p) => p.id === currentProfileId);
          const nextIdx = (idx + 1) % currList.length;
          setCurrentProfileId(currList[nextIdx].id);
          return currList;
        });
      }
      if (e.key === 'Escape') {
        setIsTestSoundOpen(false);
        setIsSaveProfileOpen(false);
        setIsVoiceCheckOpen(false);
        setDeleteProfileId(null);
        setIsTrayQuickPanelOpen(false);
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProfileId]);

  // User selects a profile
  const handleSelectProfile = (profile: AurelProfile) => {
    setCurrentProfileId(profile.id);
  };

  const handleCycleNoise = () => {
    const modes: NoiseCleanupMode[] = ['off', 'light', 'balanced', 'strong'];
    const nextIdx = (modes.indexOf(noise) + 1) % modes.length;
    setNoise(modes[nextIdx]);
  };

  // Save new profile to SQLite
  const handleSaveProfile = async (name: string, desc: string, tags: string) => {
    const newProfile: AurelProfile = {
      id: `custom-${Date.now()}`,
      name,
      desc,
      tags,
      curve: 'M0 30 C30 28 60 22 120 22 S200 20 260 22',
      isBuiltIn: false,
      params: effectiveParams,
    };

    const nextList = [...profiles, newProfile];
    setProfiles(nextList);
    setCurrentProfileId(newProfile.id);

    if ((window as any).studioAPI?.savePreset) {
      try {
        await (window as any).studioAPI.savePreset(newProfile);
      } catch (e) {
        console.error('Failed to save preset to SQLite:', e);
      }
    }
  };

  // Delete profile from SQLite
  const handleDeleteProfile = async (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (currentProfileId === id) {
      setCurrentProfileId('broadcast');
    }
    if ((window as any).studioAPI?.deletePreset) {
      try {
        await (window as any).studioAPI.deletePreset(id);
      } catch (e) {
        console.error('Failed to delete preset from SQLite:', e);
      }
    }
  };

  const selectedInputLabel = useMemo(() => {
    const found = inputDevices.find((d) => d.deviceId === selectedInputId);
    return found ? found.label : 'USB Microphone';
  }, [inputDevices, selectedInputId]);

  const selectedOutputLabel = useMemo(
    () => outputDevices.find((d) => d.deviceId === selectedOutputId)?.label || '',
    [outputDevices, selectedOutputId]
  );

  const profileToDelete = useMemo(
    () => profiles.find((p) => p.id === deleteProfileId),
    [profiles, deleteProfileId]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: 'var(--bg-canvas)', overflow: 'hidden' }}>
      {/* 40px Draggable Window Titlebar */}
      <TitleBar />

      {/* Main App Workspace */}
      <div style={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          inputDeviceLabel={selectedInputLabel}
          isMicConnected={inputDevices.length > 0}
          onOpenVoiceCheck={() => setIsVoiceCheckOpen(true)}
        />

        {/* Dynamic View Body */}
        <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            {activeTab === 'studio' && (
              <StudioView
                currentProfileId={currentProfileId}
                onSelectProfile={handleSelectProfile}
                isEnhancementOn={isEnhancementOn}
                onToggleEnhancement={() => setIsEnhancementOn((v) => !v)}
                headphoneView={headphoneView}
                onSelectHeadphoneView={setHeadphoneView}
                isMonitoring={isMonitoring}
                onToggleMonitoring={() => setIsMonitoring((v) => !v)}
                boost={boost}
                onBoostChange={setBoost}
                warmth={warmth}
                onWarmthChange={setWarmth}
                presence={presence}
                onPresenceChange={setPresence}
                noise={noise}
                onNoiseChange={setNoise}
                onOpenTestSound={() => setIsTestSoundOpen(true)}
                onOpenFineTune={() => setActiveTab('finetune')}
                meterData={meterData}
                inputDeviceLabel={selectedInputLabel}
                outputDeviceLabel={selectedOutputLabel}
              />
            )}

            {activeTab === 'profiles' && (
              <ProfilesView
                currentProfileId={currentProfileId}
                onSelectProfile={handleSelectProfile}
                onOpenSaveModal={() => setIsSaveProfileOpen(true)}
                onOpenFineTune={() => setActiveTab('finetune')}
                onOpenDeleteModal={(id) => setDeleteProfileId(id)}
              />
            )}

            {activeTab === 'finetune' && (
              <FineTuneView
                params={effectiveParams}
                onUpdateParams={(p) => setCustomParams(p)}
                selectedMicModel={selectedMicModel}
                onSelectMicModel={setSelectedMicModel}
                onOpenVoiceCheck={() => setIsVoiceCheckOpen(true)}
                onOpenSaveModal={() => setIsSaveProfileOpen(true)}
              />
            )}

            {activeTab === 'connect' && (
              <ConnectAppsView
                outputDevices={outputDevices}
                selectedOutputId={selectedOutputId}
                inputDeviceLabel={selectedInputLabel}
                onOpenSettings={() => setActiveTab('settings')}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                inputDevices={inputDevices}
                outputDevices={outputDevices}
                selectedInputId={selectedInputId}
                selectedOutputId={selectedOutputId}
                selectedMonitorId={selectedMonitorId}
                onSelectInputId={setSelectedInputId}
                onSelectOutputId={setSelectedOutputId}
                onSelectMonitorId={setSelectedMonitorId}
                theme={theme}
                onThemeChange={setTheme}
              />
            )}
          </div>

          {/* Global 30px Fixed Footer matching Design.html */}
          <footer
            style={{
              height: '30px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 40px',
              borderTop: '1px solid var(--border-titlebar)',
              background: 'var(--bg-footer)',
              fontSize: '12px',
              color: 'var(--text-tertiary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-success)' }} />
                Audio engine running
              </span>
              <span className="mono font-mono">48 kHz · 24-bit · buffer {bufferSize || 256} · total delay 9.4 ms</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span className="mono font-mono">CPU 2.1%</span>
              <span>No internet needed</span>
              <span className="mono font-mono">v1.0</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Modals & Overlays */}
      <TestSoundModal
        isOpen={isTestSoundOpen}
        onClose={() => setIsTestSoundOpen(false)}
        isEnhancementOn={isEnhancementOn}
      />

      <SaveProfileModal
        isOpen={isSaveProfileOpen}
        onClose={() => setIsSaveProfileOpen(false)}
        onSave={handleSaveProfile}
      />

      <DeleteProfileModal
        isOpen={!!deleteProfileId}
        profileName={profileToDelete?.name || 'Custom Profile'}
        onClose={() => setDeleteProfileId(null)}
        onConfirm={() => {
          if (deleteProfileId) handleDeleteProfile(deleteProfileId);
        }}
      />

      <VoiceCheckWizard
        isOpen={isVoiceCheckOpen}
        onClose={() => setIsVoiceCheckOpen(false)}
        inputDevices={inputDevices}
        outputDevices={outputDevices}
        selectedInputId={selectedInputId}
        onSelectInputId={setSelectedInputId}
        onApplyProfile={(pid) => setCurrentProfileId(pid)}
      />

      <TrayQuickPanelModal
        isOpen={isTrayQuickPanelOpen}
        onClose={() => setIsTrayQuickPanelOpen(false)}
        isEnhancementOn={isEnhancementOn}
        onToggleEnhancement={() => setIsEnhancementOn((v) => !v)}
        currentProfile={currentProfile}
        onOpenProfiles={() => {
          setActiveTab('profiles');
          setIsTrayQuickPanelOpen(false);
        }}
        boost={boost}
        onBoostChange={setBoost}
        isMonitoring={isMonitoring}
        onToggleMonitoring={() => setIsMonitoring((v) => !v)}
        noise={noise}
        onCycleNoise={handleCycleNoise}
        onOpenApp={() => setIsTrayQuickPanelOpen(false)}
        onOpenSettings={() => {
          setActiveTab('settings');
          setIsTrayQuickPanelOpen(false);
        }}
      />

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onOpenApp={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
}
