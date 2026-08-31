import { LegendList } from '@legendapp/list/react-native';
import Svg, { Rect } from 'react-native-svg';
import { useWindowDimensions, StyleSheet, View } from 'react-native';
import type { PlannerPreview as PlannerPreviewDto, PlannerPreviewWorkout } from '@/api/types';
import { AppText, Button, Card } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';
import { PlannerSummaryCard } from './PlannerSummaryCard';

type PlannerPreviewProps = {
  preview: PlannerPreviewDto;
  error: string | null;
  applying: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onApply: () => void;
  onPreviewAgain: () => void;
};

type PlannerPreviewRow =
  | { kind: 'week'; key: string; week: PlannerPreviewDto['weeks'][number] }
  | { kind: 'workout'; key: string; workout: PlannerPreviewWorkout };

function formatMetric(workout: PlannerPreviewWorkout): string | null {
  const metrics = [
    workout.distanceKm != null ? `${workout.distanceKm} km` : null,
    workout.durationMinutes != null ? `${workout.durationMinutes} min` : null,
    workout.fuelRateGPerHour != null ? `${workout.fuelRateGPerHour} g/h` : null,
  ].filter((metric): metric is string => metric != null);
  return metrics.length > 0 ? metrics.join(' · ') : null;
}

function PreviewChart({ preview }: { preview: PlannerPreviewDto }) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(240, width - Spacing.lg * 4);
  const chartHeight = 150;
  const plotHeight = 112;
  const maxDistance = Math.max(1, ...preview.weeks.map((week) => week.distanceKm));
  const minDistance = preview.weeks.length > 0 ? Math.min(...preview.weeks.map((week) => week.distanceKm)) : 0;
  const totalDistance = preview.weeks.reduce((total, week) => total + week.distanceKm, 0);
  const slotWidth = chartWidth / Math.max(1, preview.weeks.length);
  const firstWeek = preview.weeks[0]?.week ?? 0;
  const lastWeek = preview.weeks[preview.weeks.length - 1]?.week ?? 0;
  const summary = `${preview.summary.planWeeks}-week plan. Weekly distance minimum ${minDistance} km, maximum ${maxDistance} km, total ${totalDistance.toFixed(1)} km.`;

  return (
    <Card>
      <View accessible accessibilityLabel={summary}>
        <Svg width={chartWidth} height={chartHeight} accessible={false} importantForAccessibility="no-hide-descendants">
          {preview.weeks.map((week, index) => {
            const barHeight = (week.distanceKm / maxDistance) * plotHeight;
            return (
              <Rect
                key={week.week}
                x={index * slotWidth + slotWidth * 0.18}
                y={plotHeight - barHeight + 4}
                width={Math.max(4, slotWidth * 0.64)}
                height={barHeight}
                rx={4}
                fill={SpringaColors.brand}
              />
            );
          })}
        </Svg>
        <View style={styles.axisLabels}>
          <AppText variant="caption" tone="muted">Week {firstWeek}</AppText>
          <AppText variant="caption" tone="muted">Week {lastWeek}</AppText>
        </View>
      </View>
    </Card>
  );
}

function WorkoutRow({ workout }: { workout: PlannerPreviewWorkout }) {
  const metric = formatMetric(workout);
  return (
    <Card tone="subtle" style={styles.workoutCard}>
      <View style={styles.workoutTop}>
        <AppText variant="label">{workout.date}</AppText>
        <AppText variant="caption" tone="muted">{workout.category}</AppText>
      </View>
      <AppText variant="subheading">{workout.name}</AppText>
      {metric ? <AppText tone="muted" variant="caption">{metric}</AppText> : null}
    </Card>
  );
}

function buildRows(preview: PlannerPreviewDto): PlannerPreviewRow[] {
  const rows: PlannerPreviewRow[] = [];
  for (const week of preview.weeks) {
    rows.push({ kind: 'week', key: `week-${week.week}`, week });
    preview.workouts
      .filter((workout) => workout.week === week.week)
      .forEach((workout) => rows.push({ kind: 'workout', key: workout.key, workout }));
  }
  return rows;
}

export function PlannerPreviewView({
  preview,
  error,
  applying,
  onEdit,
  onCancel,
  onApply,
  onPreviewAgain,
}: PlannerPreviewProps) {
  const rows = buildRows(preview);
  const applyLabel = preview.intent === 'start' ? 'Start Program' : 'Update Workouts';
  return (
    <View style={styles.root}>
      <LegendList
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={({ item }) => item.kind === 'week' ? (
          <View style={styles.weekHeading}>
            <AppText variant="subheading">Week {item.week.week}</AppText>
            <AppText tone="muted" variant="caption">{item.week.distanceKm} km · {item.week.workoutCount} workouts</AppText>
          </View>
        ) : <WorkoutRow workout={item.workout} />}
        recycleItems
        estimatedItemSize={84}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <PlannerSummaryCard config={preview.config} hasActivePlan={false} weeksToGo={null} />
            {preview.warning ? (
              <Card tone="subtle">
                <AppText variant="label" tone="warning">{preview.warning.title}</AppText>
                <AppText tone="muted">{preview.warning.message}</AppText>
              </Card>
            ) : null}
            <PreviewChart preview={preview} />
            <Card tone="brand">
              <AppText variant="subheading">Ready to {preview.intent === 'start' ? 'start' : 'update'}</AppText>
              <AppText tone="muted">
                {preview.summary.workoutCount} workouts. Future Springa workouts are replaced; completed runs and unrelated calendar items stay.
              </AppText>
            </Card>
            {error ? (
              <View>
                <AppText accessibilityRole="alert" tone="error">{error}</AppText>
              </View>
            ) : null}
            <View style={styles.actions}>
              <Button
                label={applying ? `${preview.intent === 'start' ? 'Starting' : 'Updating'}…` : applyLabel}
                accessibilityLabel={applying ? `${preview.intent === 'start' ? 'Starting program' : 'Updating workouts'}…` : applyLabel}
                loading={applying}
                onPress={onApply}
              />
              {error?.includes('Preview changed') ? (
                <Button label="Preview again" variant="secondary" onPress={onPreviewAgain} />
              ) : null}
              <View style={styles.secondaryActions}>
                <Button label="Edit" variant="secondary" disabled={applying} onPress={onEdit} />
                <Button label="Cancel" variant="secondary" disabled={applying} onPress={onCancel} />
              </View>
            </View>
          </View>
        }
      />
    </View>
  );
}

export const PlannerPreview = PlannerPreviewView;

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  header: { gap: Spacing.lg },
  axisLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  weekHeading: { gap: Spacing.xs, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  workoutCard: { gap: Spacing.xs, marginBottom: Spacing.sm },
  workoutTop: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  actions: { gap: Spacing.sm },
  secondaryActions: { flexDirection: 'row', gap: Spacing.sm },
});
