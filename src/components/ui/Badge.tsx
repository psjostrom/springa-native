import { StyleSheet, View, type ViewProps } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';
import { AppText } from './AppText';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'error';

export type BadgeProps = Omit<ViewProps, 'children'> & {
  label: string;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'neutral', style, ...props }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[tone], style]} {...props}>
      <AppText variant="caption" tone={tone === 'neutral' || tone === 'brand' ? 'primary' : tone}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  neutral: { backgroundColor: SpringaColors.surfaceAlt },
  brand: { backgroundColor: SpringaColors.tintBrand },
  success: { backgroundColor: SpringaColors.tintSuccess },
  warning: { backgroundColor: SpringaColors.tintWarning },
  error: { backgroundColor: SpringaColors.tintError },
});
