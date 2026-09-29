import React from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, spacing, radii } from '../stylex/tokens.stylex';
import { DSPParameters } from '../types';
import { Sliders } from 'lucide-react';

interface EQControlsProps {
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
  toggleSwitch: {
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
  fadersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: spacing.md,
  },
  faderCard: {
    backgroundColor: colors.bgSurfaceElevated,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '8px',
    paddingRight: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    transition: 'border-color 0.15s ease',
  },
  bandLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  freqPill: {
    fontSize: '10px',
    fontWeight: '600',
    fontFamily: 'monospace',
    color: colors.textSecondary,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRadius: radii.xs,
  },
  faderWrapper: {
    height: '130px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dbValuePill: {
    fontFamily: 'monospace',
    fontSize: '11px',
    fontWeight: '700',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: radii.xs,
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '6px',
    paddingRight: '6px',
  },
});

export const EQControls: React.FC<EQControlsProps> = ({ params, onChange }) => {
  const eq = params.eq;

  const handleToggle = () => {
    onChange({
      ...params,
      eq: {
        ...eq,
        enabled: !eq.enabled,
      },
    });
  };

  const updateEq = (partial: Partial<typeof eq>) => {
    onChange({
      ...params,
      eq: {
        ...eq,
        ...partial,
      },
    });
  };

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.headerRow)}>
        <div {...stylex.props(styles.titleGroup)}>
          <Sliders size={16} color="#38bdf8" />
          <span {...stylex.props(styles.title)}>5-Band Broadcast Acoustic Equalizer</span>
        </div>
        <button
          onClick={handleToggle}
          {...stylex.props(styles.toggleSwitch, eq.enabled ? styles.toggleActive : styles.toggleInactive)}
        >
          {eq.enabled ? 'EQ ACTIVE' : 'EQ BYPASS'}
        </button>
      </div>

      <div {...stylex.props(styles.fadersGrid)}>
        {/* Band 1: High Pass Filter (Desk rumble & plosives) */}
        <div {...stylex.props(styles.faderCard)}>
          <span {...stylex.props(styles.bandLabel)}>HPF Cut</span>
          <span {...stylex.props(styles.freqPill)}>{eq.hpfFreq} Hz</span>
          <div {...stylex.props(styles.faderWrapper)}>
            <input
              type="range"
              min="50"
              max="130"
              step="5"
              value={eq.hpfFreq}
              onChange={(e) => updateEq({ hpfFreq: parseFloat(e.target.value) })}
              className="vertical-fader"
            />
          </div>
          <span {...stylex.props(styles.dbValuePill)}>Cutoff</span>
        </div>

        {/* Band 2: Warmth / Proximity (Shure SM7B Chest Resonance) */}
        <div {...stylex.props(styles.faderCard)}>
          <span {...stylex.props(styles.bandLabel)}>Warmth</span>
          <span {...stylex.props(styles.freqPill)}>{eq.warmthFreq} Hz</span>
          <div {...stylex.props(styles.faderWrapper)}>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              value={eq.warmthGainDb}
              onChange={(e) => updateEq({ warmthGainDb: parseFloat(e.target.value) })}
              className="vertical-fader"
            />
          </div>
          <span {...stylex.props(styles.dbValuePill)}>
            {eq.warmthGainDb > 0 ? `+${eq.warmthGainDb.toFixed(1)}` : eq.warmthGainDb.toFixed(1)} dB
          </span>
        </div>

        {/* Band 3: De-Mud (Cleans dynamic capsule hollow boxiness) */}
        <div {...stylex.props(styles.faderCard)}>
          <span {...stylex.props(styles.bandLabel)}>De-Mud</span>
          <span {...stylex.props(styles.freqPill)}>{eq.mudFreq} Hz</span>
          <div {...stylex.props(styles.faderWrapper)}>
            <input
              type="range"
              min="-12"
              max="6"
              step="0.5"
              value={eq.mudGainDb}
              onChange={(e) => updateEq({ mudGainDb: parseFloat(e.target.value) })}
              className="vertical-fader"
            />
          </div>
          <span {...stylex.props(styles.dbValuePill)}>
            {eq.mudGainDb > 0 ? `+${eq.mudGainDb.toFixed(1)}` : eq.mudGainDb.toFixed(1)} dB
          </span>
        </div>

        {/* Band 4: Broadcast Presence (Consonant Articulation) */}
        <div {...stylex.props(styles.faderCard)}>
          <span {...stylex.props(styles.bandLabel)}>Presence</span>
          <span {...stylex.props(styles.freqPill)}>{(eq.presenceFreq / 1000).toFixed(1)} kHz</span>
          <div {...stylex.props(styles.faderWrapper)}>
            <input
              type="range"
              min="-6"
              max="12"
              step="0.5"
              value={eq.presenceGainDb}
              onChange={(e) => updateEq({ presenceGainDb: parseFloat(e.target.value) })}
              className="vertical-fader"
            />
          </div>
          <span {...stylex.props(styles.dbValuePill)}>
            {eq.presenceGainDb > 0 ? `+${eq.presenceGainDb.toFixed(1)}` : eq.presenceGainDb.toFixed(1)} dB
          </span>
        </div>

        {/* Band 5: Air & Top Sheen */}
        <div {...stylex.props(styles.faderCard)}>
          <span {...stylex.props(styles.bandLabel)}>Air Sheen</span>
          <span {...stylex.props(styles.freqPill)}>{(eq.airFreq / 1000).toFixed(1)} kHz</span>
          <div {...stylex.props(styles.faderWrapper)}>
            <input
              type="range"
              min="-6"
              max="10"
              step="0.5"
              value={eq.airGainDb}
              onChange={(e) => updateEq({ airGainDb: parseFloat(e.target.value) })}
              className="vertical-fader"
            />
          </div>
          <span {...stylex.props(styles.dbValuePill)}>
            {eq.airGainDb > 0 ? `+${eq.airGainDb.toFixed(1)}` : eq.airGainDb.toFixed(1)} dB
          </span>
        </div>
      </div>
    </div>
  );
};
