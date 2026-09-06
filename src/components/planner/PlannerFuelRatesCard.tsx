import { StyleSheet, View } from 'react-native';
import type { PlannerState } from '@/api/types';
import { AppText, Card } from '@/components/ui';
import { Spacing } from '@/theme/tokens';

type PlannerFuelRatesCardProps = {
  fuelRates: PlannerState['fuelRates'];
  enabled?: boolean;
};

export function PlannerFuelRatesCard({ fuelRates, enabled = true }: PlannerFuelRatesCardProps) {
  if (!enabled || fuelRates == null) return null;
  const rates = [
    ['Easy', fuelRates.easy],
    ['Long', fuelRates.long],
    ['Interval', fuelRates.interval],
  ] as const;

  return (
    <Card accessibilityLabel="Fuel rates">
      <AppText variant="caption" tone="muted" style={styles.heading}>FUEL RATES G/H</AppText>
      <View style={styles.columns}>
        {rates.map(([label, rate]) => (
          <View key={label} style={styles.column}>
            <AppText variant="caption" tone="muted">{label}</AppText>
            <AppText tone={rate.source === 'learned' ? 'brand' : 'muted'} variant="label">
              {rate.gramsPerHour} g/h{rate.source === 'default' ? ' (default)' : ''}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { letterSpacing: 0.5 },
  columns: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
  column: { flex: 1, gap: Spacing.xs },
});
