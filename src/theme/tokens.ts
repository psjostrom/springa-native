import type { TextStyle } from 'react-native';

export const Typography = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  subheading: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const satisfies Record<string, TextStyle>;

export const Spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const Radius = { sm: 6, md: 8, lg: 12, xl: 16, pill: 999 } as const;
export const IconSize = { sm: 16, md: 20, lg: 24 } as const;
export const MinTouchTarget = 44;
