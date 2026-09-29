import React from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, spacing, radii } from '../stylex/tokens.stylex';
import { DSPParameters } from '../types';
import { Gauge, Scissors, ShieldCheck } from 'lucide-react';

interface DynamicsControlsProps {
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
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: spacing.md,
  },
  moduleCard: {
    backgroundColor: colors.bgSurfaceElevated,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  moduleTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  toggleBtn: {
    fontSize: '10px',
    fontWeight: '700',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
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
  controlRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '2px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: colors.textSecondary,
  },
  valPill: {
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#38bdf8',
  },
  slider: {
    width: '100%',
    height: '5px',
  },
});

export const DynamicsControls: React.FC<DynamicsControlsProps> = ({ params, onChange }) => {
  const comp = params.compressor;
  const deEss = params.deEsser;

  const handleCompToggle = () => {
    onChange({
      ...params,
      compressor: { ...comp, enabled: !comp.enabled },
    });
  };

  const handleDeEssToggle = () => {
    onChange({
      ...params,
      deEsser: { ...deEss, enabled: !deEss.enabled },
    });
  };

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.headerRow)}>
        <div {...stylex.props(styles.titleGroup)}>
          <Gauge size={16} color="#10b981" />
          <span {...stylex.props(styles.title)}>Broadcast Dynamics, De-Esser & Limiter</span>
        </div>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          Dynamic Consistency & Clipping Protection
        </span>
      </div>

      <div {...stylex.props(styles.sectionGrid)}>
        {/* 1. Broadcast Voice Leveler */}
        <div {...stylex.props(styles.moduleCard)}>
          <div {...stylex.props(styles.moduleTop)}>
            <span {...stylex.props(styles.moduleLabel)}>
              <Gauge size={14} color="#6366f1" /> Broadcast Leveler
            </span>
            <button
              onClick={handleCompToggle}
              {...stylex.props(styles.toggleBtn, comp.enabled ? styles.toggleActive : styles.toggleInactive)}
            >
              {comp.enabled ? 'ACTIVE' : 'BYPASS'}
            </button>
          </div>

          <div {...stylex.props(styles.controlRow)}>
            <div {...stylex.props(styles.labelRow)}>
              <span>Threshold (Sensitivity)</span>
              <span {...stylex.props(styles.valPill)}>{comp.thresholdDb} dB</span>
            </div>
            <input
              type="range"
              min="-40"
              max="-10"
              step="1"
              value={comp.thresholdDb}
              onChange={(e) =>
                onChange({
                  ...params,
                  compressor: { ...comp, thresholdDb: parseFloat(e.target.value) },
                })
              }
              {...stylex.props(styles.slider)}
            />
          </div>

          <div {...stylex.props(styles.controlRow)}>
            <div {...stylex.props(styles.labelRow)}>
              <span>Compression Ratio</span>
              <span {...stylex.props(styles.valPill)}>{comp.ratio.toFixed(1)}:1</span>
            </div>
            <input
              type="range"
              min="2.0"
              max="8.0"
              step="0.5"
              value={comp.ratio}
              onChange={(e) =>
                onChange({
                  ...params,
                  compressor: { ...comp, ratio: parseFloat(e.target.value) },
                })
              }
              {...stylex.props(styles.slider)}
            />
          </div>
        </div>

        {/* 2. Sibilance De-Esser */}
        <div {...stylex.props(styles.moduleCard)}>
          <div {...stylex.props(styles.moduleTop)}>
            <span {...stylex.props(styles.moduleLabel)}>
              <Scissors size={14} color="#f59e0b" /> Vocal De-Esser
            </span>
            <button
              onClick={handleDeEssToggle}
              {...stylex.props(styles.toggleBtn, deEss.enabled ? styles.toggleActive : styles.toggleInactive)}
            >
              {deEss.enabled ? 'ACTIVE' : 'BYPASS'}
            </button>
          </div>

          <div {...stylex.props(styles.controlRow)}>
            <div {...stylex.props(styles.labelRow)}>
              <span>Frequency Target</span>
              <span {...stylex.props(styles.valPill)} style={{ color: '#f59e0b' }}>
                {(deEss.freq / 1000).toFixed(1)} kHz
              </span>
            </div>
            <input
              type="range"
              min="5500"
              max="8000"
              step="100"
              value={deEss.freq}
              onChange={(e) =>
                onChange({
                  ...params,
                  deEsser: { ...deEss, freq: parseFloat(e.target.value) },
                })
              }
              {...stylex.props(styles.slider)}
            />
          </div>

          <div {...stylex.props(styles.controlRow)}>
            <div {...stylex.props(styles.labelRow)}>
              <span>S-Sound Reduction</span>
              <span {...stylex.props(styles.valPill)} style={{ color: '#f59e0b' }}>
                {deEss.reductionDb.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min="-8"
              max="0"
              step="0.5"
              value={deEss.reductionDb}
              onChange={(e) =>
                onChange({
                  ...params,
                  deEsser: { ...deEss, reductionDb: parseFloat(e.target.value) },
                })
              }
              {...stylex.props(styles.slider)}
            />
          </div>
        </div>

        {/* 3. Output Limiter & Master Trim */}
        <div {...stylex.props(styles.moduleCard)}>
          <div {...stylex.props(styles.moduleTop)}>
            <span {...stylex.props(styles.moduleLabel)}>
              <ShieldCheck size={14} color="#10b981" /> Peak Limiter & Trim
            </span>
            <span style={{ fontSize: '10px', color: '#34d399', fontWeight: '700' }}>
              CLIPPING SAFE
            </span>
          </div>

          <div {...stylex.props(styles.controlRow)}>
            <div {...stylex.props(styles.labelRow)}>
              <span>Brickwall Ceiling</span>
              <span {...stylex.props(styles.valPill)} style={{ color: '#10b981' }}>
                {params.limiter.ceilingDb.toFixed(1)} dBFS
              </span>
            </div>
            <input
              type="range"
              min="-3"
              max="-0.2"
              step="0.1"
              value={params.limiter.ceilingDb}
              onChange={(e) =>
                onChange({
                  ...params,
                  limiter: { ...params.limiter, ceilingDb: parseFloat(e.target.value) },
                })
              }
              {...stylex.props(styles.slider)}
            />
          </div>

          <div {...stylex.props(styles.controlRow)}>
            <div {...stylex.props(styles.labelRow)}>
              <span>Master Output Trim</span>
              <span {...stylex.props(styles.valPill)}>
                {params.outputGainDb > 0 ? `+${params.outputGainDb.toFixed(1)}` : params.outputGainDb.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="6"
              step="0.5"
              value={params.outputGainDb}
              onChange={(e) =>
                onChange({
                  ...params,
                  outputGainDb: parseFloat(e.target.value),
                })
              }
              {...stylex.props(styles.slider)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
