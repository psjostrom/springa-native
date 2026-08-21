import type { ReactElement } from 'react';
import { BarChart3 } from 'lucide-react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { CompletedSplit } from '@/api/types';
import { AppText, Card, Section } from '@/components/ui';
import { HrZoneColors, SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';
import {
  formatElevationM,
  formatPaceMinPerKm,
  getPaceSplitZone,
  paceSplitBarWidth,
  splitAccessibilityLabel,
} from './completedOverviewPresentation';

type CompletedPaceSplitsProps = {
  splits: CompletedSplit[] | null;
};

const legend = [
  { label: 'Hard', color: HrZoneColors[5] },
  { label: 'Interval', color: SpringaColors.warning },
  { label: 'Race', color: SpringaColors.chartSecondary },
  { label: 'Easy', color: SpringaColors.success },
];

export function CompletedPaceSplits({
  splits,
}: CompletedPaceSplitsProps): ReactElement | null {
  const { fontScale } = useWindowDimensions();

  if (splits == null || splits.length === 0) return null;

  const fastestPace = Math.min(...splits.map((split) => split.paceMinPerKm));
  const usesAccessibleLayout = fontScale >= 1.3;

  return (
    <Section title="Pace Splits" icon={BarChart3} iconColor={SpringaColors.chartSecondary}>
      <Card accessibilityLabel="Pace splits">
        <AppText variant="label" tone="muted" style={styles.title}>Splits</AppText>
        {!usesAccessibleLayout ? (
          <View style={styles.headerRow}>
            <AppText variant="caption" tone="muted" style={styles.km}>KM</AppText>
            <AppText variant="caption" tone="muted" style={styles.pace}>PACE</AppText>
            <View style={styles.barColumn} />
            <AppText variant="caption" tone="muted" style={styles.elevation}>ELEV</AppText>
            <AppText variant="caption" tone="muted" style={styles.heartRate}>HR</AppText>
          </View>
        ) : null}
        <View testID={usesAccessibleLayout ? 'accessible-split-layout' : undefined}>
          {splits.map((split) => {
            const zone = getPaceSplitZone(split.paceMinPerKm);
            const barWidth = paceSplitBarWidth(split.paceMinPerKm, fastestPace);
            const pace = `${formatPaceMinPerKm(split.paceMinPerKm)} /km`;
            const elevation = split.elevationChangeM == null
              ? '—'
              : `${formatElevationM(split.elevationChangeM)} m`;
            const heartRate = split.avgHr == null ? '—' : split.avgHr;

            return (
              <View
                key={split.km}
                accessible
                accessibilityLabel={splitAccessibilityLabel(split)}
                style={usesAccessibleLayout ? styles.accessibleRow : styles.row}
              >
                {usesAccessibleLayout ? (
                  <>
                    <View style={styles.accessibleLine}>
                      <AppText tone="muted" selectable>{`Km ${split.km}`}</AppText>
                      <AppText variant="label" selectable>{pace}</AppText>
                    </View>
                    <View style={styles.accessibleLine}>
                      <AppText tone="muted" selectable>{`Elevation ${elevation}`}</AppText>
                      <AppText tone="muted" selectable>{`Avg HR ${heartRate}`}</AppText>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.bar, { width: `${barWidth}%`, backgroundColor: zone.color }]} />
                    </View>
                  </>
                ) : (
                  <>
                    <AppText tone="muted" selectable style={styles.km}>{split.km}</AppText>
                    <AppText variant="label" selectable style={styles.pace}>{pace}</AppText>
                    <View style={styles.barColumn}>
                      <View style={styles.barTrack}>
                        <View style={[styles.bar, { width: `${barWidth}%`, backgroundColor: zone.color }]} />
                      </View>
                    </View>
                    <AppText tone="muted" selectable style={styles.elevation}>{elevation}</AppText>
                    <AppText tone="muted" selectable style={styles.heartRate}>{heartRate}</AppText>
                  </>
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.legend}>
          {legend.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <AppText variant="caption" tone="muted">{item.label}</AppText>
            </View>
          ))}
        </View>
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
    borderBottomColor: SpringaColors.border,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 32,
    paddingVertical: Spacing.xs,
    borderBottomColor: `${SpringaColors.border}55`,
    borderBottomWidth: 1,
  },
  accessibleRow: {
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderBottomColor: `${SpringaColors.border}55`,
    borderBottomWidth: 1,
  },
  accessibleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  km: {
    width: 24,
    fontVariant: ['tabular-nums'],
  },
  pace: {
    width: 80,
    fontVariant: ['tabular-nums'],
  },
  barColumn: {
    flex: 1,
    minWidth: 48,
  },
  barTrack: {
    height: 8,
    overflow: 'hidden',
    backgroundColor: SpringaColors.surfaceAlt,
    borderRadius: Radius.pill,
  },
  bar: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  elevation: {
    width: 44,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  heartRate: {
    width: 36,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
});
