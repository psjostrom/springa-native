import { StyleSheet, View } from 'react-native';
import { AppText, Card } from '@/components/ui';
import type { PhaseInfo } from '@/lib/phases';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

type Props = {
  phaseInfo: PhaseInfo | null;
};

export function PhaseTracker({ phaseInfo }: Props) {
  if (!phaseInfo) return null;

  return (
    <Card tone="default">
      <View style={styles.header}>
        <AppText variant="subheading">{phaseInfo.name}</AppText>
        <AppText variant="caption" tone="muted">
          Week {phaseInfo.week} of {phaseInfo.totalWeeks}
        </AppText>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.min(100, Math.max(0, phaseInfo.progressPercent)),
        }}
      >
        <View
          style={[
            styles.fill,
            { width: `${Math.min(100, Math.max(0, phaseInfo.progressPercent))}%` },
          ]}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  track: {
    height: 6,
    backgroundColor: SpringaColors.surfaceAlt,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: SpringaColors.brand,
    borderRadius: Radius.pill,
  },
});
