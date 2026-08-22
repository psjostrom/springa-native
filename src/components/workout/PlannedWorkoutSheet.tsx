import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CalendarEvent,
  ClothingRecommendation,
  PlannedWorkoutClothing,
  PlannedWorkoutDetail,
  PlannedWorkoutReplacementCategory,
  WorkoutZone,
} from '@/api/types';
import {
  AppText,
  Badge,
  Card,
  Grid,
  Section,
  StateView,
} from '@/components/ui';
import {
  usePlannedWorkoutDetail,
  usePlannedWorkoutMutations,
} from '@/query/usePlannedWorkout';
import { HrZoneColors, SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';
import {
  extractWorkoutNotes,
  formatDistanceKm,
  formatLocalDateTime,
  formatTimelineMinutes,
  formatWorkoutDate,
  formatWorkoutStepDuration,
  parseLocalDateTime,
  timelineSegmentHeightPercent,
} from './plannedWorkoutPresentation';
import { getWorkoutStatusBadge } from './workoutStatusBadge';
import { PreRunCarbsRow } from './PreRunCarbsRow';

type PlannedWorkoutSheetProps = {
  event: CalendarEvent;
  onClose: () => void;
  now?: Date;
  onActionsReady?: (actions: PlannedWorkoutActions | null) => void;
};

export type PlannedWorkoutActions = {
  pending: boolean;
  move: () => void;
  replace: (category: PlannedWorkoutReplacementCategory) => void;
  deleteWorkout: () => void;
};

const zoneColors: Record<WorkoutZone, string> = {
  z1: HrZoneColors[1],
  z2: HrZoneColors[2],
  z3: HrZoneColors[3],
  z4: HrZoneColors[4],
  z5: HrZoneColors[5],
};

const zoneLabels: Record<WorkoutZone, string> = {
  z1: 'Recovery',
  z2: 'Easy',
  z3: 'Steady',
  z4: 'Hard',
  z5: 'Max',
};

function weatherSummary(weather: ClothingRecommendation['weather']): string {
  const parts = [`${Math.round(weather.temp)}°C`];
  if (Math.round(weather.feelsLike) !== Math.round(weather.temp)) {
    parts.push(`feels ${Math.round(weather.feelsLike)}°`);
  }
  if (weather.windSpeed >= 3) {
    parts.push(`${Math.round(weather.windSpeed)} m/s`);
  }
  if (weather.isRain || weather.isSnow) {
    parts.push(`${weather.isSnow ? 'Snow' : 'Rain'} ${weather.precipitation.toFixed(1)} mm/h`);
  }
  return parts.join(' · ');
}

function ClothingContent({ clothing }: { clothing: PlannedWorkoutClothing }) {
  if (clothing.status === 'unavailable') {
    return (
      <AppText tone="muted" selectable>
        Clothing unavailable: {clothing.reason === 'outside-window' ? 'outside forecast window' : 'forecast unavailable'}.
      </AppText>
    );
  }

  const recommendation = clothing.recommendation;
  const items = [
    ...recommendation.lower,
    ...recommendation.upper,
    ...recommendation.accessories,
  ];

  return (
    <View style={styles.clothingContent}>
      <View style={styles.chips}>
        {items.map((item) => (
          <Badge key={item} label={item} />
        ))}
      </View>
      <AppText variant="caption" tone="muted" selectable>
        {weatherSummary(recommendation.weather)}
      </AppText>
    </View>
  );
}

function ClothingSection({
  clothing,
}: {
  clothing: PlannedWorkoutClothing;
}) {
  return (
    <Section title="What to wear" accessibilityLabel="What to wear">
      <Card>
        <ClothingContent clothing={clothing} />
      </Card>
    </Section>
  );
}

function MetricValues({ detail }: { detail: PlannedWorkoutDetail }) {
  const metrics = [
    detail.metrics.duration
      ? {
          key: 'duration',
          value: `${detail.metrics.duration.estimated ? '~' : ''}${detail.metrics.duration.minutes}m`,
        }
      : null,
    detail.metrics.distance
      ? {
          key: 'distance',
          value: `${detail.metrics.distance.estimated ? '~' : ''}${formatDistanceKm(detail.metrics.distance.km)}`,
        }
      : null,
    detail.metrics.fuelRateGPerHour != null
      ? { key: 'fuel', value: `${detail.metrics.fuelRateGPerHour}g/h` }
      : null,
    detail.metrics.prescribedCarbsG != null
      ? { key: 'carbs', value: `${detail.metrics.prescribedCarbsG}g total` }
      : null,
  ];
  return metrics.filter((metric): metric is NonNullable<typeof metric> => metric != null);
}

function WorkoutSummary({ detail }: { detail: PlannedWorkoutDetail }) {
  const metrics = MetricValues({ detail });
  if (metrics.length === 0) return null;

  const labels: Record<string, string> = {
    duration: 'Duration',
    distance: 'Distance',
    fuel: 'Fuel',
    carbs: 'Total carbs',
  };

  return (
    <Card tone="brand" accessibilityLabel="Workout metrics">
      <Grid>
        {metrics.map((metric) => (
          <View key={metric.key} style={styles.metricCell}>
            <AppText variant="label" tone="muted" selectable>
              {labels[metric.key]}
            </AppText>
            <AppText variant="subheading" style={styles.metricValue} selectable>
              {metric.value}
            </AppText>
          </View>
        ))}
      </Grid>
    </Card>
  );
}

function StructureSections({ detail }: { detail: PlannedWorkoutDetail }) {
  const timeline = detail.structure.timeline;
  return (
    <Section title="Workout structure" accessibilityLabel="Workout structure">
      <Card tone="subtle" style={styles.structureCard}>
        {detail.structure.sections.length === 0 ? (
          <AppText tone="muted" selectable>
            No parsed structure available.
          </AppText>
        ) : (
          detail.structure.sections.map((section) => (
            <View key={`${section.name}-${section.repeats ?? 'single'}`} style={styles.structureSection}>
              <View style={styles.sectionHeadingRow}>
                <AppText variant="subheading" selectable>
                  {section.name}
                </AppText>
                {section.repeats != null ? <Badge label={`${section.repeats}x`} tone="brand" /> : null}
              </View>
              <View style={styles.sectionSteps}>
                {section.steps.map((step, index) => (
                  <View
                    key={`${step.duration}-${step.zone}-${index}`}
                    style={[styles.stepRow, index === section.steps.length - 1 && styles.lastStepRow]}
                  >
                    <AppText variant="subheading" style={styles.stepDuration} selectable>
                      {formatWorkoutStepDuration(step.duration)}
                    </AppText>
                    <View style={[styles.zonePill, { backgroundColor: zoneColors[step.zone] }]}>
                      <AppText variant="label" style={styles.zoneText} numberOfLines={1}>
                        {step.label ?? zoneLabels[step.zone]}
                      </AppText>
                    </View>
                    <AppText variant="caption" tone="muted" style={styles.stepDetail} selectable>
                      {step.detail}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
        {timeline.length > 0 ? (
          <View style={styles.timeline} accessibilityLabel="Workout timeline">
            {timeline.map((segment, index) => (
              <View
                key={`${segment.zone}-${segment.durationMinutes}-${index}`}
                accessible
                accessibilityLabel={`${segment.zone.toUpperCase()}, ${formatTimelineMinutes(segment.durationMinutes)}${segment.estimated ? ', estimated' : ''}`}
                style={[
                  styles.timelineSegment,
                  {
                    flex: Math.max(segment.durationMinutes, 0.1),
                    height: `${timelineSegmentHeightPercent(segment.intensityPercent)}%`,
                    backgroundColor: zoneColors[segment.zone],
                  },
                ]}
              />
            ))}
          </View>
        ) : null}
      </Card>
    </Section>
  );
}

function PlannedWorkoutHeader({
  event,
  name,
  date,
  now,
}: {
  event: CalendarEvent;
  name?: string;
  date?: Date;
  now: Date;
}) {
  const badge = getWorkoutStatusBadge(event, now);

  return (
    <View style={styles.plannedHeader}>
      <AppText variant="title" selectable>
        {name ?? event.name}
      </AppText>
      <View style={styles.headerMeta}>
        <AppText tone="muted" style={styles.headerDate} selectable>
          {formatWorkoutDate(date ?? event.date)}
        </AppText>
        <Badge
          label={badge.label}
          tone={badge.label === 'Missed' ? 'error' : badge.label === 'Completed' ? 'success' : 'brand'}
        />
      </View>
    </View>
  );
}

function WorkoutDescription({ description }: { description: string }) {
  const notes = extractWorkoutNotes(description);
  if (notes == null) return null;

  return (
    <Card accessibilityLabel="Workout description">
      <AppText tone="muted" selectable>
        {notes}
      </AppText>
    </Card>
  );
}

function NativePresentation({
  detail,
  carbsPending,
  onSaveCarbs,
  onCarbsInputFocus,
}: {
  detail: PlannedWorkoutDetail;
  carbsPending: boolean;
  onSaveCarbs: (value: number | null) => Promise<void>;
  onCarbsInputFocus: (target: number) => void;
}) {
  return (
    <View style={styles.presentationContent}>
      <WorkoutSummary detail={detail} />
      <View style={styles.informationRows}>
        <PreRunCarbsRow
          value={detail.preRunCarbsG}
          pending={carbsPending}
          onSave={onSaveCarbs}
          onInputFocus={onCarbsInputFocus}
        />
        <ClothingSection clothing={detail.clothing} />
      </View>
      <StructureSections detail={detail} />
      <WorkoutDescription description={detail.event.description} />
    </View>
  );
}

function DetailBody({
  detail,
  event,
  eventId,
  onClose,
  onActionsReady,
  now,
}: {
  detail: PlannedWorkoutDetail;
  event: CalendarEvent;
  eventId: string;
  onClose: () => void;
  onActionsReady?: (actions: PlannedWorkoutActions | null) => void;
  now: Date;
}) {
  const mutations = usePlannedWorkoutMutations(eventId);
  const detailDate = parseLocalDateTime(detail.event.startDateLocal);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [movePickerMode, setMovePickerMode] = useState<'date' | 'time' | 'datetime' | null>(null);
  const [movePickerValue, setMovePickerValue] = useState(detailDate);
  const [replacementPending, setReplacementPending] =
    useState<PlannedWorkoutReplacementCategory | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const saveMove = async (moveDate: Date) => {
    if (Number.isNaN(moveDate.getTime())) {
      setActionMessage('Enter a local date and time.');
      return;
    }
    setActionMessage(null);
    try {
      await mutations.move.mutateAsync(formatLocalDateTime(moveDate));
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to move workout.');
    }
  };

  const replaceWorkout = useCallback(async (category: PlannedWorkoutReplacementCategory) => {
    setActionMessage(null);
    setReplacementPending(category);
    try {
      await mutations.replace.mutateAsync(category);
      setActionMessage('Workout replaced.');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to replace workout.');
    } finally {
      setReplacementPending(null);
    }
  }, [mutations.replace]);

  const deleteWorkout = useCallback(async () => {
    setActionMessage(null);
    try {
      await mutations.deleteWorkout.mutateAsync();
      onClose();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to delete workout.');
    }
  }, [mutations.deleteWorkout, onClose]);

  const actionPending =
    mutations.move.isPending ||
    mutations.replace.isPending ||
    mutations.deleteWorkout.isPending ||
    mutations.savePreRunCarbs.isPending;

  const openMove = useCallback(() => {
    setMovePickerValue(detailDate);
    setMovePickerMode(Platform.OS === 'android' ? 'date' : 'datetime');
    setActionMessage(null);
  }, [detailDate]);

  const handleMovePickerChange = (_pickerEvent: unknown, selectedDate: Date) => {
    if (Platform.OS === 'android' && movePickerMode === 'date') {
      const next = new Date(movePickerValue);
      next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setMovePickerValue(next);
      setMovePickerMode('time');
      return;
    }
    const next = new Date(movePickerValue);
    if (Platform.OS === 'android') {
      next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    } else {
      next.setTime(selectedDate.getTime());
    }
    setMovePickerMode(null);
    void saveMove(next);
  };

  const actions = useMemo<PlannedWorkoutActions>(() => ({
    pending: actionPending,
    move: openMove,
    replace: (category) => void replaceWorkout(category),
    deleteWorkout: () => void deleteWorkout(),
  }), [actionPending, deleteWorkout, openMove, replaceWorkout]);

  const scrollCarbsAboveKeyboard = useCallback((target: number) => {
    if (Platform.OS !== 'android') return;
    scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
      target,
      Spacing.lg,
      true,
    );
  }, []);

  useEffect(() => {
    if (onActionsReady == null) return;
    onActionsReady(actions);
    return () => onActionsReady(null);
  }, [actions, onActionsReady]);

  return (
    <View
      style={styles.detailRoot}
      accessibilityLabel="Native workout details"
    >
      {movePickerMode ? (
        <DateTimePicker
          value={movePickerValue}
          onValueChange={handleMovePickerChange}
          onDismiss={() => setMovePickerMode(null)}
          mode={movePickerMode}
          display="default"
          disabled={actionPending}
        />
      ) : null}
      {replacementPending ? (
        <View style={styles.replacementPending} accessibilityLiveRegion="polite">
          <ActivityIndicator color={SpringaColors.brandText} />
          <AppText variant="title">
            Replacing with {{ easy: 'Easy', quality: 'Quality', long: 'Long', club: 'Club Run' }[replacementPending]}…
          </AppText>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentInsetAdjustmentBehavior="automatic"
          scrollsChildToFocus={Platform.OS === 'android' ? false : undefined}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          accessibilityLabel="Planned workout details"
        >
          <PlannedWorkoutHeader
            event={event}
            name={detail.event.name}
            date={detailDate}
            now={now}
          />
          {actionMessage ? (
            <AppText variant="caption" tone="muted" accessibilityRole="alert" selectable>
              {actionMessage}
            </AppText>
          ) : null}
          <NativePresentation
            detail={detail}
            carbsPending={mutations.savePreRunCarbs.isPending}
            onCarbsInputFocus={scrollCarbsAboveKeyboard}
            onSaveCarbs={async (value) => {
              await mutations.savePreRunCarbs.mutateAsync(value);
            }}
          />
        </ScrollView>
      )}
    </View>
  );
}

export function PlannedWorkoutSheet({
  event,
  onClose,
  onActionsReady,
  now = new Date(),
}: PlannedWorkoutSheetProps) {
  const { data, isDisabled, isLoading, isError, error, reload } =
    usePlannedWorkoutDetail(event.id);

  if (isDisabled) {
    return (
      <StateView
        title="Workout details unavailable"
        message="Sign in to view workout details."
      />
    );
  }

  if (isLoading) {
    return (
      <View style={styles.screenRoot} accessibilityLabel="Loading planned workout details">
        <PlannedWorkoutHeader
          event={event}
          now={now}
        />
        <StateView
          loading
          title="Loading workout details…"
        />
      </View>
    );
  }

  if (isError || data == null) {
    return (
      <StateView
        title="Couldn’t load workout details"
        message={error ?? 'Something went wrong.'}
        retryAccessibilityLabel="Retry loading workout details"
        onRetry={reload}
      />
    );
  }

  return (
    <DetailBody
      detail={data}
      event={event}
      eventId={event.id}
      onClose={onClose}
      onActionsReady={onActionsReady}
      now={now}
    />
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    minHeight: 0,
  },
  detailRoot: {
    flex: 1,
    minHeight: 0,
  },
  plannedHeader: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerDate: {
    flexShrink: 1,
  },
  content: {
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  presentationContent: {
    gap: Spacing.lg,
  },
  metricCell: {
    gap: Spacing.xxs,
    padding: Spacing.xs,
  },
  metricValue: {
    fontVariant: ['tabular-nums'],
  },
  informationRows: {
    gap: Spacing.md,
  },
  clothingContent: {
    gap: Spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  structureCard: {
    gap: Spacing.md,
  },
  structureSection: {
    gap: Spacing.sm,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionSteps: {
    gap: 0,
    paddingLeft: Spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: SpringaColors.borderSubtle,
  },
  stepRow: {
    minHeight: 42,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: SpringaColors.border,
  },
  lastStepRow: {
    borderBottomWidth: 0,
  },
  stepDuration: {
    minWidth: 44,
    fontVariant: ['tabular-nums'],
  },
  zonePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  zoneText: {
    color: SpringaColors.bg,
  },
  stepDetail: {
    minWidth: 132,
    flexBasis: 160,
    flexGrow: 1,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xxs,
    height: 34,
    overflow: 'hidden',
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  timelineSegment: {
    minWidth: 3,
  },
  replacementPending: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
});
