export const SpringaColors = {
  bg: '#13101c',
  surface: '#1d1828',
  surfaceAlt: '#241e30',
  border: '#2e293c',
  borderSubtle: '#4a4358',
  text: '#ffffff',
  muted: '#af9ece',
  brand: '#f23b94',
  success: '#4ade80',
  warning: '#ffb800',
  error: '#ff4d6a',
  tintSuccess: '#1a3d25',
  tintWarning: '#3d2b1a',
  tintError: '#3d1525',
  tintBrand: '#2d1a35',
} as const;

export const HrZoneColors = {
  1: '#6ee7b7',
  2: '#06b6d4',
  3: '#fbbf24',
  4: '#fb923c',
  5: '#ef4444',
} as const;

export type Colors = typeof SpringaColors;
export type HrZones = typeof HrZoneColors;
