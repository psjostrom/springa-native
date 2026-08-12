import { StyleSheet, View, type ViewProps } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

export type CardPadding = 'default' | 'compact' | 'none';

export type CardProps = ViewProps & {
  padding?: CardPadding;
};

export function Card({ padding = 'default', style, ...props }: CardProps) {
  return <View style={[styles.card, styles[padding], style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SpringaColors.surface,
    borderColor: SpringaColors.border,
    borderCurve: 'continuous',
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  default: { padding: Spacing.lg },
  compact: { padding: Spacing.md },
  none: { padding: 0 },
});
