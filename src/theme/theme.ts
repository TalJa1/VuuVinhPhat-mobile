import type { ViewStyle } from 'react-native';

/**
 * "Lagoon" theme — aqua / teal palette for a water-surface look.
 * Every screen sits on <WaterBackground/> and content lives on
 * translucent "glass" cards that gently bob like they're floating.
 */
export const colors = {
  primary: '#0aa2b8',
  primaryDark: '#087a8f',
  primaryDeep: '#05506a',
  primarySoft: '#d4f4f7',
  accent: '#2dd4bf',
  coral: '#ff7a6b',

  ink: '#0b3142',
  body: '#36586a',
  muted: '#6f8d9b',
  faint: '#9db5bf',

  glass: 'rgba(255,255,255,0.78)',
  glassStrong: 'rgba(255,255,255,0.92)',
  glassSoft: 'rgba(255,255,255,0.5)',
  glassBorder: 'rgba(255,255,255,0.95)',
  inputBg: 'rgba(225,246,249,0.85)',
  inputBorder: 'rgba(10,162,184,0.18)',
  line: 'rgba(11,49,66,0.08)',

  danger: '#e5484d',
  dangerSoft: '#ffe5e6',
  success: '#0f9f77',
  successSoft: '#d9f7ec',
  white: '#ffffff',

  waterTop: '#e8fbfd',
  overlay: 'rgba(4,40,56,0.45)',
};

export const gradients = {
  primary: ['#2fd6c8', '#0fa8bc', '#0a7e9b'],
  hero: ['#19c6c6', '#0b93b2', '#08628a'],
  deep: ['#0b7e9b', '#075a78', '#063e57'],
  water: ['#e8fbfd', '#c6f0f6', '#93dceb', '#5bc2da'],
  coral: ['#ff9a8b', '#ff6a88'],
  mint: ['#6ee7d8', '#2dd4bf'],
};

export type CategoryKey = 'cleaning' | 'classification' | 'emergency';

export const categoryColors: Record<
  CategoryKey,
  { gradient: string[]; fg: string; soft: string }
> = {
  cleaning: { gradient: ['#3ee0cf', '#0aa2b8'], fg: '#087a8f', soft: '#d4f4f7' },
  classification: { gradient: ['#b69cff', '#7c5cf0'], fg: '#6447d6', soft: '#ece6ff' },
  emergency: { gradient: ['#ff9a8b', '#f0506e'], fg: '#d93858', soft: '#ffe5ea' },
};

export const radius = { sm: 12, md: 18, lg: 24, xl: 30, pill: 999 };

/** Soft, wide shadow that makes cards read as "floating" above the water. */
export const floatShadow: ViewStyle = {
  boxShadow: '0px 12px 28px rgba(6, 84, 108, 0.16)',
};

export const softShadow: ViewStyle = {
  boxShadow: '0px 6px 16px rgba(6, 84, 108, 0.12)',
};

export const glowShadow: ViewStyle = {
  boxShadow: '0px 10px 24px rgba(10, 162, 184, 0.38)',
};
