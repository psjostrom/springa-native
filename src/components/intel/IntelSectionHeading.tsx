import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';

type Props = {
  icon: ComponentType<{ size: number; color: string }>;
  label: string;
  meta?: string | null;
};

export function IntelSectionHeading({ icon: Icon, label, meta }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Icon size={14} color={SpringaColors.chartSecondary} />
        <AppText variant="caption" style={styles.label}>
          {label.toUpperCase()}
        </AppText>
      </View>
      {meta ? (
        <AppText variant="caption" tone="muted">
          {meta}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    color: SpringaColors.muted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
