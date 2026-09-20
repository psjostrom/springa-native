import { StyleSheet, View } from 'react-native';
import { AppText, Card } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

type Props = {
  actualKm: number;
  targetKm: number;
  completedRuns: number;
  totalRuns: number;
  loading?: boolean;
};

export function VolumeCompact({
  actualKm,
  targetKm,
  completedRuns,
  totalRuns,
  loading,
}: Props) {
  if (loading) {
    return (
      <Card tone="default">
        <View style={styles.topRow}>
          <AppText variant="heading" tone="muted">-- km</AppText>
          <AppText variant="caption" tone="muted">-- km target</AppText>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: '0%' }]} />
        </View>
        <AppText variant="caption" tone="muted" style={styles.footer}>
          Loading volume...
        </AppText>
      </Card>
    );
  }

  const percent = targetKm > 0 ? (actualKm / targetKm) * 100 : 0;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const isComplete = percent >= 100;

  return (
    <Card tone="default">
      <View style={styles.topRow}>
        <AppText variant="heading">{actualKm} km</AppText>
        <AppText variant="caption" tone="muted">
          {targetKm} km target
        </AppText>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(clampedPercent),
        }}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${clampedPercent}%`,
              backgroundColor: isComplete
                ? SpringaColors.success
                : SpringaColors.chartSecondary,
            },
          ]}
        />
      </View>

      <AppText variant="caption" tone="muted" style={styles.footer}>
        {completedRuns} of {totalRuns} runs
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  track: {
    height: 8,
    backgroundColor: SpringaColors.surfaceAlt,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  footer: {
    marginTop: Spacing.xxs,
  },
});
