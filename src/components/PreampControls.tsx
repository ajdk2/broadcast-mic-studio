import React from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, spacing, radii } from '../stylex/tokens.stylex';
import { DSPParameters } from '../types';
import { Sparkles, Shield, Volume2 } from 'lucide-react';

interface PreampControlsProps {
  params: DSPParameters;
  onChange: (newParams: DSPParameters) => void;
}

const styles = stylex.create({
  container: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    paddingTop: '18px',
    paddingBottom: '18px',
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '13px',
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: '-0.01em',
  },
  badge: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#34d399',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radii.full,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  heroBoostCard: {
    backgroundColor: colors.bgSurfaceElevated,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: radii.md,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
  },
  boostTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boostLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  boostValuePill: {
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: '700',
    color: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: radii.sm,
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
  },
  slider: {
    width: '100%',
    height: '6px',
  },
  caption: {
    fontSize: '11px',
    color: colors.textMuted,
    lineHeight: '1.4',
  },
  gateContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    backgroundColor: colors.bgSurfaceElevated,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  gateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleSwitch: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: '700',
    paddingTop: '3px',
    paddingBottom: '3px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRadius: radii.full,
    borderWidth: 1,
    borderStyle: 'solid',
    transition: 'all 0.15s ease',
  },
  toggleActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    color: '#34d399',
  },
  toggleInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: colors.borderSubtle,
    color: colors.textMuted,
  },
  gateControlsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.md,
    marginTop: '4px',
  },
  miniControl: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  miniLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: colors.textSecondary,
  },
});

export const PreampControls: React.FC<PreampControlsProps> = ({ params, onChange }) => {
  const handlePreGainChange = (val: number) => {
    onChange({
      ...params,
      preGainDb: val,
    });
  };

  const handleGateToggle = () => {
    onChange({
      ...params,
      noiseGate: {
        ...params.noiseGate,
        enabled: !params.noiseGate.enabled,
      },
    });
  };

  const handleGateThresholdChange = (val: number) => {
    onChange({
      ...params,
      noiseGate: {
        ...params.noiseGate,
        thresholdDb: val,
      },
    });
  };

  const handleGateReductionChange = (val: number) => {
    onChange({
      ...params,
      noiseGate: {
        ...params.noiseGate,
        reductionDb: val,
      },
    });
  };

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.headerRow)}>
        <div {...stylex.props(styles.titleGroup)}>
          <Sparkles size={16} color="#6366f1" />
          <span {...stylex.props(styles.title)}>Clean Preamp & Low-Voice Booster</span>
        </div>
        <span {...stylex.props(styles.badge)}>Ultra-Low Noise Floor</span>
      </div>

      {/* Hero Preamp Boost Slider */}
      <div {...stylex.props(styles.heroBoostCard)}>
        <div {...stylex.props(styles.boostTopRow)}>
          <span {...stylex.props(styles.boostLabel)}>
            <Volume2 size={15} color="#6366f1" />
            Digital Preamp Gain (Speech Boost)
          </span>
          <span {...stylex.props(styles.boostValuePill)}>+{params.preGainDb.toFixed(1)} dB</span>
        </div>
        <input
          type="range"
          min="0"
          max="30"
          step="0.5"
          value={params.preGainDb}
          onChange={(e) => handlePreGainChange(parseFloat(e.target.value))}
          {...stylex.props(styles.slider)}
        />
        <div {...stylex.props(styles.caption)}>
          Cleanly elevates quiet voices by up to 32x without introducing digital grain. Essential for dynamic mics like the Maono PD100.
        </div>
      </div>

      {/* Adaptive Background Noise Gate & Expander */}
      <div {...stylex.props(styles.gateContainer)}>
        <div {...stylex.props(styles.gateHeader)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color="#f59e0b" />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#f8fafc' }}>
              Adaptive Noise Gate & Expander
            </span>
          </div>
          <button
            onClick={handleGateToggle}
            {...stylex.props(
              styles.toggleSwitch,
              params.noiseGate.enabled ? styles.toggleActive : styles.toggleInactive
            )}
          >
            {params.noiseGate.enabled ? 'ACTIVE' : 'BYPASSED'}
          </button>
        </div>

        <div {...stylex.props(styles.gateControlsGrid)}>
          <div {...stylex.props(styles.miniControl)}>
            <div {...stylex.props(styles.miniLabelRow)}>
              <span>Threshold (Sensitivity)</span>
              <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#f59e0b' }}>
                {params.noiseGate.thresholdDb} dB
              </span>
            </div>
            <input
              type="range"
              min="-70"
              max="-20"
              step="1"
              disabled={!params.noiseGate.enabled}
              value={params.noiseGate.thresholdDb}
              onChange={(e) => handleGateThresholdChange(parseFloat(e.target.value))}
              style={{ width: '100%', height: '5px' }}
            />
          </div>

          <div {...stylex.props(styles.miniControl)}>
            <div {...stylex.props(styles.miniLabelRow)}>
              <span>Silence Attenuation</span>
              <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#f59e0b' }}>
                {params.noiseGate.reductionDb} dB
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="-10"
              step="1"
              disabled={!params.noiseGate.enabled}
              value={params.noiseGate.reductionDb}
              onChange={(e) => handleGateReductionChange(parseFloat(e.target.value))}
              style={{ width: '100%', height: '5px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
