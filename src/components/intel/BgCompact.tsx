import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import type { CategoryBGResponse } from '@/lib/bgModel';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

type Props = {
  categories: CategoryBGResponse[];
};

export function BgCompact({ categories }: Props) {
  if (!categories || categories.length === 0) return null;

  return (
    <View style={styles.container}>
      {categories.map((cat) => {
        // medianRate is in mmol/L per minute -> convert to mmol/hr
        const ratePerHour = cat.medianRate * 60;
        const formattedRate =
          ratePerHour > 0
            ? `+${ratePerHour.toFixed(1)}`
            : ratePerHour.toFixed(1);

        let color: string = SpringaColors.success;
        let stability = 'Stable';
        if (ratePerHour < -3) {
          color = SpringaColors.error;
          stability = 'Fast drop';
        } else if (ratePerHour < -1) {
          color = SpringaColors.warning;
          stability = 'Moderate';
        }

        return (
          <View key={cat.category} style={styles.card}>
            <AppText variant="caption" tone="muted" style={styles.categoryLabel}>
              {cat.category.toUpperCase()}
            </AppText>
            <View style={styles.rateRow}>
              <AppText variant="heading" style={{ color }}>
                {formattedRate}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.unit}>
                mmol/L/hr
              </AppText>
            </View>
            <AppText variant="caption" style={{ color, fontWeight: '600' }}>
              {stability}
            </AppText>
            {cat.avgFuelRate != null && (
              <AppText variant="caption" tone="muted" style={styles.fuelRate}>
                {cat.avgFuelRate} g/h
              </AppText>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: SpringaColors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    alignItems: 'flex-start',
  },
  categoryLabel: {
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: Spacing.xxs,
    marginBottom: Spacing.xxs,
  },
  unit: {
    fontSize: 10,
  },
  fuelRate: {
    marginTop: Spacing.xxs,
  },
});
