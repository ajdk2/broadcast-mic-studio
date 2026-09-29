import * as stylex from '@stylexjs/stylex';

export const colors = stylex.defineVars({
  // Aurel Voice Studio Obsidian Theme
  bgApp: '#0D0E10',
  bgSidebar: '#111215',
  bgCard: '#16181B',
  bgElevated: '#17191C',
  bgInput: '#15171A',
  bgHover: '#1A1C20',
  bgActivePill: '#2B2E34',
  bgActiveGold: '#231B0D',

  borderSubtle: '#1C1E22',
  borderMedium: '#24272C',
  borderInput: '#26292E',
  borderFocus: '#F5A623',
  borderGold: '#5A4213',

  // Aurel Signature Gold & Accents
  gold: '#F5A623',
  goldLight: '#FFC869',
  goldHover: '#FFC061',
  goldDark: '#1B1204',

  greenTarget: '#43D18A',
  redClip: '#FF6A5C',
  redRaw: '#FF8A7E',

  textPrimary: '#F3F2EF',
  textSecondary: '#B9BBC1',
  textMuted: '#8C9098',
  textDim: '#666A73',

  // Meter & Visualizer
  meterBg: '#131518',
  waveformRaw: '#9EA1A8',
  waveformEnhanced: '#F5A623',
});

export const spacing = stylex.defineVars({
  xs: '4px',
  sm: '8px',
  md: '14px',
  lg: '20px',
  xl: '28px',
  xxl: '40px',
});

export const radii = stylex.defineVars({
  xs: '4px',
  sm: '7px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
});
