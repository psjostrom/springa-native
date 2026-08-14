import { StyleSheet, View, type ViewProps } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

export type CardTone = 'default' | 'subtle' | 'brand';

export type CardProps = ViewProps & {
  tone?: CardTone;
};

export function Card({ tone = 'default', style, ...props }: CardProps) {
  return <View style={[styles.card, styles[tone], style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderColor: SpringaColors.border,
    borderCurve: 'continuous',
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  default: { backgroundColor: SpringaColors.surface },
  subtle: { backgroundColor: SpringaColors.surfaceAlt },
  brand: {
    backgroundColor: SpringaColors.tintBrand,
    borderColor: `${SpringaColors.brand}66`,
  },
});
