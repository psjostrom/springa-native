import type { ReactElement } from 'react';
import { BarChart3 } from 'lucide-react-native';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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
  const { fontScale: rawFontScale } = useWindowDimensions();

  if (splits == null || splits.length === 0) return null;

  const fontScale = Math.max(1, rawFontScale);
  const cellWidths = {
    km: Math.ceil(28 * fontScale),
    pace: Math.ceil(48 * fontScale),
    elevation: Math.ceil(40 * fontScale),
    heartRate: Math.ceil(40 * fontScale),
  };
  const tableMinWidth = Object.values(cellWidths).reduce((total, width) => total + width, 0)
    + Spacing.sm * 4
    + 48;
  const fastestPace = Math.min(...splits.map((split) => split.paceMinPerKm));
  const table = (
    <View style={[styles.table, { minWidth: tableMinWidth }]}>
      <View style={styles.headerRow}>
        <AppText variant="caption" tone="muted" style={[styles.km, { width: cellWidths.km }]}>KM</AppText>
        <AppText variant="caption" tone="muted" style={[styles.pace, { width: cellWidths.pace }]}>PACE</AppText>
        <View style={styles.barColumn} />
        <AppText variant="caption" tone="muted" style={[styles.elevation, { width: cellWidths.elevation }]}>ELEV</AppText>
        <AppText variant="caption" tone="muted" style={[styles.heartRate, { width: cellWidths.heartRate }]}>HR</AppText>
      </View>
      {splits.map((split, index) => {
        const zone = getPaceSplitZone(split.paceMinPerKm);
        const barWidth = paceSplitBarWidth(split.paceMinPerKm, fastestPace);
        const pace = formatPaceMinPerKm(split.paceMinPerKm);
        const elevation = split.elevationChangeM == null
          ? '—'
          : formatElevationM(split.elevationChangeM);
        const heartRate = split.avgHr == null ? '—' : split.avgHr;

        return (
          <View
            key={split.km}
            accessible
            accessibilityLabel={splitAccessibilityLabel(split)}
            style={[styles.row, index < splits.length - 1 && styles.rowDivider]}
          >
            <AppText tone="muted" selectable style={[styles.km, { width: cellWidths.km }]}>{split.km}</AppText>
            <AppText variant="label" selectable style={[styles.pace, { width: cellWidths.pace }]}>{pace}</AppText>
            <View style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { width: `${barWidth}%`, backgroundColor: zone.color }]} />
              </View>
            </View>
            <AppText tone="muted" selectable style={[styles.elevation, { width: cellWidths.elevation }]}>{elevation}</AppText>
            <AppText tone="muted" selectable style={[styles.heartRate, { width: cellWidths.heartRate }]}>{heartRate}</AppText>
          </View>
        );
      })}
      <View style={styles.legend}>
        {legend.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <AppText variant="caption" tone="muted">{item.label}</AppText>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Section title="Pace Splits" icon={BarChart3} iconColor={SpringaColors.chartSecondary}>
      <Card accessibilityLabel="Pace splits">
        <AppText variant="label" tone="muted" style={styles.title}>Splits</AppText>
        {fontScale >= 1.3 ? (
          <ScrollView
            testID="large-text-split-table"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tableScrollContent}
          >
            {table}
          </ScrollView>
        ) : table}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.sm,
  },
  table: {
    flexGrow: 1,
  },
  tableScrollContent: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomColor: SpringaColors.border,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 32,
    paddingVertical: Spacing.xs,
  },
  rowDivider: {
    borderBottomColor: `${SpringaColors.border}1A`,
    borderBottomWidth: 1,
  },
  km: {
    fontVariant: ['tabular-nums'],
  },
  pace: {
    fontVariant: ['tabular-nums'],
  },
  barColumn: {
    flex: 1,
    minWidth: 48,
  },
  barTrack: {
    height: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: Radius.sm,
  },
  elevation: {
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  heartRate: {
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopColor: `${SpringaColors.border}55`,
    borderTopWidth: 1,
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
