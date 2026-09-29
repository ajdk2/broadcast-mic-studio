import React, { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, spacing, radii } from '../stylex/tokens.stylex';
import { Preset } from '../types';
import { Bookmark, Plus, Trash2, Check, Sparkles, Mic, Zap, Moon, MessageSquare } from 'lucide-react';

interface PresetSelectorProps {
  presets: Preset[];
  activePresetId: string;
  onSelectPreset: (preset: Preset) => void;
  onSaveCustomPreset: (name: string, description: string) => void;
  onDeletePreset: (id: string) => void;
}

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
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
    gap: spacing.xs,
  },
  title: {
    fontSize: '13px',
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: '-0.01em',
  },
  sqliteBadge: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#a5b4fc',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRadius: radii.full,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: colors.bgSurfaceElevated,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderMedium,
    color: colors.textPrimary,
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radii.sm,
    transition: 'all 0.15s ease',
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: spacing.md,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurfaceElevated,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    minHeight: '95px',
    position: 'relative',
    textAlign: 'left',
  },
  cardActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.2)',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  iconAndBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  cardIcon: {
    color: '#6366f1',
    display: 'flex',
    alignItems: 'center',
  },
  badge: {
    fontSize: '10px',
    fontWeight: '600',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRadius: radii.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: colors.textSecondary,
  },
  badgeHighlight: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: '-0.01em',
    marginBottom: '3px',
  },
  cardDesc: {
    fontSize: '11px',
    color: colors.textMuted,
    lineHeight: '1.4',
  },
  checkIcon: {
    color: '#6366f1',
    display: 'flex',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalBox: {
    backgroundColor: '#12141c',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderMedium,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
  },
  input: {
    backgroundColor: colors.bgBase,
    color: colors.textPrimary,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.sm,
    padding: '10px 12px',
    fontSize: '13px',
    outline: 'none',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    borderRadius: radii.sm,
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    borderRadius: radii.sm,
    padding: '8px 16px',
    fontSize: '12px',
  },
});

function getPresetIcon(id: string) {
  if (id === 'quiet-voice-leveler') return <Sparkles size={14} color="#f59e0b" />;
  if (id === 'shure-sm7b-warm') return <Mic size={14} color="#38bdf8" />;
  if (id === 'rode-procaster-crisp') return <Zap size={14} color="#10b981" />;
  if (id === 'deep-midnight-fm') return <Moon size={14} color="#a855f7" />;
  return <MessageSquare size={14} color="#6366f1" />;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  presets,
  activePresetId,
  onSelectPreset,
  onSaveCustomPreset,
  onDeletePreset,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');

  const handleSave = () => {
    if (!newPresetName.trim()) return;
    onSaveCustomPreset(newPresetName.trim(), newPresetDesc.trim() || 'Custom vocal profile');
    setNewPresetName('');
    setNewPresetDesc('');
    setIsModalOpen(false);
  };

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.headerRow)}>
        <div {...stylex.props(styles.titleGroup)}>
          <Bookmark size={15} color="#6366f1" />
          <span {...stylex.props(styles.title)}>Studio Tone Profiles</span>
          <span {...stylex.props(styles.sqliteBadge)}>SQLite Backed</span>
        </div>
        <button onClick={() => setIsModalOpen(true)} {...stylex.props(styles.saveBtn)}>
          <Plus size={14} />
          <span>Save Current As Preset</span>
        </button>
      </div>

      <div {...stylex.props(styles.presetGrid)}>
        {presets.map((preset) => {
          const isActive = preset.id === activePresetId;
          const isQuietSpecialist = preset.id === 'quiet-voice-leveler';

          return (
            <div
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              {...stylex.props(styles.card, isActive && styles.cardActive)}
            >
              <div {...stylex.props(styles.cardTop)}>
                <div {...stylex.props(styles.iconAndBadge)}>
                  <div {...stylex.props(styles.cardIcon)}>{getPresetIcon(preset.id)}</div>
                  <span
                    {...stylex.props(
                      styles.badge,
                      isQuietSpecialist ? styles.badgeHighlight : null
                    )}
                  >
                    {preset.badge || 'Studio'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isActive && (
                    <div {...stylex.props(styles.checkIcon)}>
                      <Check size={16} />
                    </div>
                  )}
                  {!preset.isBuiltIn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePreset(preset.id);
                      }}
                      style={{ color: '#64748b' }}
                      title="Delete Preset"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div {...stylex.props(styles.cardTitle)}>{preset.name}</div>
                <div {...stylex.props(styles.cardDesc)}>{preset.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Custom Preset Modal */}
      {isModalOpen && (
        <div {...stylex.props(styles.modalOverlay)}>
          <div {...stylex.props(styles.modalBox)}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
                Save Custom Profile
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Saves your active Pre-Gain, Noise Gate, 5-Band EQ, and Leveler to SQLite.
              </p>
            </div>
            <input
              type="text"
              placeholder="Profile Name (e.g. My Warm Late-Night Voice)"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              {...stylex.props(styles.input)}
            />
            <input
              type="text"
              placeholder="Description (Optional)"
              value={newPresetDesc}
              onChange={(e) => setNewPresetDesc(e.target.value)}
              {...stylex.props(styles.input)}
            />
            <div {...stylex.props(styles.modalActions)}>
              <button onClick={() => setIsModalOpen(false)} {...stylex.props(styles.cancelBtn)}>
                Cancel
              </button>
              <button onClick={handleSave} {...stylex.props(styles.primaryBtn)}>
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
