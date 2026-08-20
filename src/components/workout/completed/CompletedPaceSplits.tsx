import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CompletedSplit } from '@/api/types';
import { AppText, Card } from '@/components/ui';
import { Spacing } from '@/theme/tokens';
import {
  formatElevationM,
  formatPaceMinPerKm,
  splitAccessibilityLabel,
} from './completedOverviewPresentation';

type CompletedPaceSplitsProps = {
  splits: CompletedSplit[] | null;
};

export function CompletedPaceSplits({
  splits,
}: CompletedPaceSplitsProps): ReactElement | null {
  if (splits == null || splits.length === 0) return null;

  return (
    <Card accessibilityLabel="Pace splits">
      <AppText variant="label" tone="muted">Splits</AppText>
      {splits.map((split) => (
        <View
          key={split.km}
          accessible
          accessibilityLabel={splitAccessibilityLabel(split)}
          style={styles.row}
        >
          <AppText tone="muted" style={styles.km} selectable>
            Km {split.km}
          </AppText>
          <AppText variant="label" style={styles.pace} selectable>
            {formatPaceMinPerKm(split.paceMinPerKm)} /km
          </AppText>
          {split.avgHr != null ? (
            <AppText tone="muted" selectable>{split.avgHr} bpm</AppText>
          ) : null}
          {split.elevationChangeM != null ? (
            <AppText tone="muted" selectable>
              {formatElevationM(split.elevationChangeM)} m
            </AppText>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  km: {
    minWidth: 48,
  },
  pace: {
    fontVariant: ['tabular-nums'],
  },
});