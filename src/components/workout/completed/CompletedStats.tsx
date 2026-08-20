import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CalendarEvent,
  CompletedHrZoneScore,
  CompletedWorkoutOverview,
} from '@/api/types';
import { AppText, Card, Grid } from '@/components/ui';
import { formatDuration } from '@/domain/format';
import { Spacing } from '@/theme/tokens';
import {
  complianceJudgment,
  formatDistanceKm,
} from './completedOverviewPresentation';

type CompletedStatsProps = {
  event: CalendarEvent;
  reportCard: CompletedWorkoutOverview['reportCard'] | null;
};

function StatCell({
  label,
  accessibilityLabel,
  judgment,
  tone,
  value,
  unit,
}: {
  label: string;
  accessibilityLabel: string;
  judgment?: string;
  tone?: 'success' | 'warning' | 'error';
  value: string;
  unit?: string;
}) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.cell}>
      <View style={styles.topRow}>
        <AppText variant="caption" tone="muted">{label}</AppText>
        {judgment ? <AppText variant="label" tone={tone}>{judgment}</AppText> : null}
      </View>
      <AppText variant="subheading" selectable>
        {unit ? `${value} ${unit}` : value}
      </AppText>
    </View>
  );
}

function HrZoneCell({ score }: { score: CompletedHrZoneScore }) {
  const judgment = complianceJudgment(score.rating);
  const tone =
    score.rating === 'good' ? 'success' : score.rating === 'ok' ? 'warning' : 'error';
  const pct = Math.round(score.pctInTarget);
  return (
    <StatCell
      label="HR Zone"
      accessibilityLabel={`HR zone compliance, ${pct}% in target zone ${score.targetZone}, ${judgment}`}
      judgment={judgment}
      tone={tone}
      value={`${pct}%`}
      unit={score.targetZone}
    />
  );
}

export function CompletedStats({
  event,
  reportCard,
}: CompletedStatsProps): ReactElement | null {
  const cells: ReactElement[] = [];

  if (reportCard?.hrZone != null) {
    cells.push(<HrZoneCell key="hr" score={reportCard.hrZone} />);
  }
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
  if (event.maxHr != null) {
    cells.push(
      <StatCell
        key="maxHr"
        label="Max HR"
        accessibilityLabel={`Max HR, ${event.maxHr} bpm`}
        value={`${event.maxHr}`}
        unit="bpm"
      />,
    );
  }
  if (event.calories != null) {
    cells.push(
      <StatCell
        key="calories"
        label="Calories"
        accessibilityLabel={`Calories, ${event.calories} kcal`}
        value={`${event.calories}`}
        unit="kcal"
      />,
    );
  }
  if (event.cadence != null) {
    const spm = Math.round(event.cadence);
    cells.push(
      <StatCell
        key="cadence"
        label="Cadence"
        accessibilityLabel={`Cadence, ${spm} spm`}
        value={`${spm}`}
        unit="spm"
      />,
    );
  }
  if (event.load != null) {
    const load = Math.round(event.load);
    cells.push(
      <StatCell
        key="load"
        label="Load"
        accessibilityLabel={`Load, ${load}`}
        value={`${load}`}
      />,
    );
  }
  if (event.intensity != null) {
    const pct = Math.round(event.intensity);
    cells.push(
      <StatCell
        key="intensity"
        label="Intensity"
        accessibilityLabel={`Intensity, ${pct}%`}
        value={`${pct}%`}
      />,
    );
  }

  if (cells.length === 0) return null;

  return (
    <Card accessibilityLabel="Workout stats">
      <Grid>{cells}</Grid>
    </Card>
  );
}

const styles = StyleSheet.create({
  cell: {
    gap: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
});