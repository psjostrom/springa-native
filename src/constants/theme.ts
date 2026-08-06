import '@/global.css';

import { Platform } from 'react-native';

import { HrZoneColors, SpringaColors } from '@/theme/colors';

export { HrZoneColors, SpringaColors };

const springaShell = {
  text: SpringaColors.text,
  background: SpringaColors.bg,
  backgroundElement: SpringaColors.surface,
  backgroundSelected: SpringaColors.surfaceAlt,
  textSecondary: SpringaColors.muted,
} as const;

/** Dark-only shell; light entry mirrors Springa tokens for template compat. */
export const Colors = {
  light: springaShell,
  dark: springaShell,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
