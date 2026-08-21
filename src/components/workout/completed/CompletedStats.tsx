import type { ReactElement } from 'react';
import { Activity, Flame, Footprints, Gauge, HeartPulse, Zap } from 'lucide-react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type {
  CalendarEvent,
  CompletedHrZoneScore,
  CompletedWorkoutOverview,
} from '@/api/types';
import { AppText, Card, Section } from '@/components/ui';
import { formatDuration } from '@/domain/format';
import { HrZoneColors, SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';
import {
  cadenceJudgment,
  complianceJudgment,
  formatDistanceKm,
  formatPaceMinPerKm,
  intensityJudgment,
  loadJudgment,
  type PerformanceJudgment,
} from './completedOverviewPresentation';

type StatCellProps = {
  label: string;
  accessibilityLabel: string;
  value: string;
  unit?: string;
};

function StatCell({ label, accessibilityLabel, value, unit }: StatCellProps) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.summaryCell}>
      <AppText variant="caption" tone="muted">{label}</AppText>
      <AppText variant="subheading" selectable style={styles.summaryValue}>
        {unit ? `${value} ${unit}` : value}
      </AppText>
    </View>
  );
}

function MetricCell({
  label,
  accessibilityLabel,
  value,
  unit,
  icon: Icon,
  iconColor,
  judgment,
  accentColor,
  fraction,
}: {
  label: string;
  accessibilityLabel: string;
  value: string;
  unit?: string;
  icon: typeof Activity;
  iconColor: string;
  judgment?: PerformanceJudgment;
  accentColor?: string;
  fraction?: number;
}) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.metricCell}>
      <View style={styles.metricTopRow}>
        <View style={styles.metricLabel}>
          <Icon color={iconColor} size={16} accessible={false} />
          <AppText variant="caption" tone="muted" style={styles.metricLabelText}>
            {label}
          </AppText>
        </View>
        {judgment ? (
          <AppText variant="label" tone="muted" style={[styles.judgment, { color: judgment.color }]}>
            {judgment.label}
          </AppText>
        ) : null}
      </View>
      <AppText variant="subheading" selectable style={styles.metricValue}>
        {unit ? `${value} ${unit}` : value}
      </AppText>
      {fraction != null && accentColor != null ? (
        <View
          testID={`performance-progress-${label.toLowerCase().replaceAll(' ', '-')}`}
          style={styles.progressTrack}
        >
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.max(0, Math.min(100, Math.round(fraction * 100)))}%`,
                backgroundColor: accentColor,
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

function TwoColumnRows({
  cells,
  stacked = false,
  rowTestID,
}: {
  cells: ReactElement[];
  stacked?: boolean;
  rowTestID?: string;
}) {
  return (
    <View style={styles.rows}>
      {cells.map((cell, index) =>
        index % 2 === 0 ? (
          <View
            key={`row-${index}`}
            testID={rowTestID}
            style={[styles.row, stacked && styles.stackedRow]}
          >
            <View style={styles.cellSlot}>{cell}</View>
            {cells[index + 1] ? <View style={styles.cellSlot}>{cells[index + 1]}</View> : null}
          </View>
        ) : null,
      )}
    </View>
  );
}

function HrZoneCell({ score }: { score: CompletedHrZoneScore }) {
  const pct = Math.round(score.pctInTarget);
  const judgment = complianceJudgment(score.rating);
  return (
    <MetricCell
      label="HR Zone"
      accessibilityLabel={`HR zone compliance, ${pct}% in target zone ${score.targetZone}, ${judgment.label}`}
      value={`${pct}%`}
      unit={score.targetZone}
      icon={Activity}
      iconColor={SpringaColors.chartSecondary}
      judgment={judgment}
      accentColor={judgment.color}
      fraction={judgment.fraction}
    />
  );
}

function summaryCells(event: CalendarEvent): ReactElement[] {
  const cells: ReactElement[] = [];
  if (event.distance != null) {
    cells.push(
      <StatCell
        key="distance"
        label="Distance"
        accessibilityLabel={`Distance, ${formatDistanceKm(event.distance)}`}
        value={formatDistanceKm(event.distance)}
      />,
    );
  }
  if (event.duration != null) {
    const duration = formatDuration(event.duration);
    cells.push(
      <StatCell
        key="duration"
        label="Duration"
        accessibilityLabel={`Duration, ${duration}`}
        value={duration}
      />,
    );
  }
  if (event.pace != null) {
    const pace = `${formatPaceMinPerKm(event.pace)} /km`;
    cells.push(
      <StatCell
        key="pace"
        label="Pace"
        accessibilityLabel={`Pace, ${pace}`}
        value={pace}
      />,
    );
  }
  if (event.avgHr != null) {
    cells.push(
      <StatCell
        key="avgHr"
        label="Avg HR"
        accessibilityLabel={`Avg HR, ${event.avgHr} bpm`}
        value={`${event.avgHr}`}
        unit="bpm"
      />,
    );
  }
  return cells;
}

function performanceCells(
  event: CalendarEvent,
  reportCard: CompletedWorkoutOverview['reportCard'] | null,
): ReactElement[] {
  const cells: ReactElement[] = [];

  if (reportCard?.hrZone != null) {
    cells.push(<HrZoneCell key="hr" score={reportCard.hrZone} />);
  }
  if (event.calories != null) {
    cells.push(
      <MetricCell
        key="calories"
        label="Calories"
        accessibilityLabel={`Calories, ${event.calories} kcal`}
        value={`${event.calories}`}
        unit="kcal"
        icon={Flame}
        iconColor={HrZoneColors[4]}
      />,
    );
  }
  if (event.cadence != null) {
    const spm = Math.round(event.cadence);
    const judgment = cadenceJudgment(spm);
    cells.push(
      <MetricCell
        key="cadence"
        label="Cadence"
        accessibilityLabel={`Cadence, ${spm} spm`}
        value={`${spm}`}
        unit="spm"
        icon={Footprints}
        iconColor={SpringaColors.chartSecondary}
        judgment={judgment}
        accentColor={judgment.color}
        fraction={judgment.fraction}
      />,
    );
  }
  if (event.maxHr != null) {
    cells.push(
      <MetricCell
        key="maxHr"
        label="Max HR"
        accessibilityLabel={`Max HR, ${event.maxHr} bpm`}
        value={`${event.maxHr}`}
        unit="bpm"
        icon={HeartPulse}
        iconColor={SpringaColors.error}
      />,
    );
  }
  if (event.load != null) {
    const load = Math.round(event.load);
    const judgment = loadJudgment(load);
    cells.push(
      <MetricCell
        key="load"
        label="Load"
        accessibilityLabel={`Load, ${load}`}
        value={`${load}`}
        icon={Zap}
        iconColor={SpringaColors.warning}
        judgment={judgment}
        accentColor={judgment.color}
        fraction={judgment.fraction}
      />,
    );
  }
  if (event.intensity != null) {
    const pct = Math.round(event.intensity);
    const judgment = intensityJudgment(pct);
    cells.push(
      <MetricCell
        key="intensity"
        label="Intensity"
        accessibilityLabel={`Intensity, ${pct}%`}
        value={`${pct}%`}
        icon={Gauge}
        iconColor={SpringaColors.muted}
        judgment={judgment}
        accentColor={judgment.color}
        fraction={judgment.fraction}
      />,
    );
  }

  return cells;
}

function SummaryCard({ event, accessibilityLabel }: { event: CalendarEvent; accessibilityLabel: string }) {
  const cells = summaryCells(event);
  if (cells.length === 0) return null;
  return (
    <Card tone="subtle" accessibilityLabel={accessibilityLabel}>
      <TwoColumnRows cells={cells} />
    </Card>
  );
}

function PerformanceSection({
  event,
  reportCard,
}: {
  event: CalendarEvent;
  reportCard: CompletedWorkoutOverview['reportCard'] | null;
}) {
  const { fontScale } = useWindowDimensions();
  const cells = performanceCells(event, reportCard);
  if (cells.length === 0) return null;
  return (
    <Section title="Performance" icon={Activity} iconColor={SpringaColors.chartSecondary}>
      <Card accessibilityLabel="Performance stats" style={styles.performanceCard}>
        <TwoColumnRows
          cells={cells}
          stacked={fontScale >= 1.3}
          rowTestID="performance-metric-row"
        />
      </Card>
    </Section>
  );
}

export function CompletedSummary({ event }: { event: CalendarEvent }): ReactElement | null {
  return <SummaryCard event={event} accessibilityLabel="Workout stats" />;
}

export function CompletedPerformance({
  event,
  reportCard,
}: {
  event: CalendarEvent;
  reportCard: CompletedWorkoutOverview['reportCard'] | null;
}): ReactElement | null {
  return <PerformanceSection event={event} reportCard={reportCard} />;
}

const styles = StyleSheet.create({
  rows: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  stackedRow: {
    flexDirection: 'column',
  },
  cellSlot: {
    flex: 1,
    minWidth: 0,
  },
  summaryCell: {
    gap: Spacing.xs,
    minWidth: 0,
  },
  summaryValue: {
    fontVariant: ['tabular-nums'],
  },
  performanceCard: {
    gap: Spacing.sm,
  },
  metricCell: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: SpringaColors.surfaceAlt,
    borderCurve: 'continuous',
    borderRadius: Radius.md,
  },
  metricTopRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  metricLabel: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metricLabelText: {
    flexShrink: 1,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  judgment: {
    flexShrink: 1,
    textAlign: 'right',
  },
  metricValue: {
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 4,
    overflow: 'hidden',
    backgroundColor: SpringaColors.surface,
    borderRadius: Radius.pill,
  },
  progressBar: {
    height: '100%',
    borderRadius: Radius.pill,
  },
});
