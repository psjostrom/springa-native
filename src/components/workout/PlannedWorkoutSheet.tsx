import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CalendarEvent,
  ClothingRecommendation,
  PlannedWorkoutClothing,
  PlannedWorkoutDetail,
  PlannedWorkoutReplacementCategory,
  WorkoutZone,
} from '@/api/types';
import {
  usePlannedWorkoutDetail,
  usePlannedWorkoutMutations,
} from '@/query/usePlannedWorkout';
import { HrZoneColors, SpringaColors } from '@/theme/colors';
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
  currentReplacementCategory: PlannedWorkoutReplacementCategory | null;
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
      <Text style={styles.muted} selectable>
        Clothing unavailable: {clothing.reason === 'outside-window' ? 'outside forecast window' : 'forecast unavailable'}.
      </Text>
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
          <View key={item} style={styles.chip}>
            <Text style={styles.chipText} selectable>
              {item}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.weather} selectable>
        {weatherSummary(recommendation.weather)}
      </Text>
    </View>
  );
}

function ClothingSection({
  clothing,
}: {
  clothing: PlannedWorkoutClothing;
}) {
  return (
    <View
      style={styles.infoCard}
      accessibilityLabel="What to wear"
    >
      <Text style={styles.eyebrow}>What to wear</Text>
      <ClothingContent clothing={clothing} />
    </View>
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

function NativeMetricGrid({ detail }: { detail: PlannedWorkoutDetail }) {
  const metrics = MetricValues({ detail });
  if (metrics.length === 0) return null;

  const labels: Record<string, string> = {
    duration: 'Duration',
    distance: 'Distance',
    fuel: 'Fuel',
    carbs: 'Total carbs',
  };

  return (
    <View style={styles.nativeMetricGrid} accessibilityLabel="Workout metrics">
      {metrics.map((metric) => (
        <View key={metric.key} style={styles.nativeMetricCell}>
          <Text style={styles.muted} selectable>
            {labels[metric.key]}
          </Text>
          <Text style={styles.nativeMetricValue} selectable>
            {metric.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function StructureSections({ detail }: { detail: PlannedWorkoutDetail }) {
  const timeline = detail.structure.timeline;
  return (
    <View style={styles.nativeStructureCard} accessibilityLabel="Workout structure">
      <Text style={styles.sectionTitle}>Workout structure</Text>
      {detail.structure.sections.length === 0 ? (
        <Text style={styles.muted} selectable>
          No parsed structure available.
        </Text>
      ) : (
        detail.structure.sections.map((section) => (
          <View key={`${section.name}-${section.repeats ?? 'single'}`} style={styles.structureSection}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeading} selectable>
                {section.name}
              </Text>
              {section.repeats != null ? (
                <View style={styles.repeatPill}>
                  <Text style={styles.repeatText}>{section.repeats}x</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.nativeSectionSteps}>
              {section.steps.map((step, index) => (
                <View
                  key={`${step.duration}-${step.zone}-${index}`}
                  style={[
                    styles.stepRow,
                    styles.nativeStepRow,
                    index === section.steps.length - 1 && styles.lastStepRow,
                  ]}
                >
                  <Text style={styles.stepDuration} selectable>
                    {formatWorkoutStepDuration(step.duration)}
                  </Text>
                  <View style={[styles.zonePill, { backgroundColor: zoneColors[step.zone] }]}>
                    <Text style={styles.zoneText}>{step.label ?? zoneLabels[step.zone]}</Text>
                  </View>
                  <Text style={styles.stepDetail} selectable>
                    {step.detail}
                  </Text>
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
    </View>
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
      <Text style={styles.headerTitle} selectable>
        {name ?? event.name}
      </Text>
      <View style={styles.headerMeta}>
        <Text style={styles.headerDate} selectable>
          {formatWorkoutDate(date ?? event.date)}
        </Text>
        <View
          style={[
            styles.badge,
            badge.label === 'Missed' && styles.badgeMissed,
            badge.label === 'Completed' && styles.badgeCompleted,
          ]}
        >
          <Text style={[styles.badgeText, badge.label === 'Missed' && styles.badgeTextMissed]}>
            {badge.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

function WorkoutDescription({ description }: { description: string }) {
  const notes = extractWorkoutNotes(description);
  if (notes == null) return null;

  return (
    <View style={styles.descriptionCard} accessibilityLabel="Workout description">
      <Text style={styles.description} selectable>
        {notes}
      </Text>
    </View>
  );
}

function NativePresentation({
  detail,
  carbsPending,
  onSaveCarbs,
}: {
  detail: PlannedWorkoutDetail;
  carbsPending: boolean;
  onSaveCarbs: (value: number | null) => Promise<void>;
}) {
  return (
    <View style={styles.presentationContent}>
      <NativeMetricGrid detail={detail} />
      <View style={styles.informationRows}>
        <PreRunCarbsRow
          value={detail.preRunCarbsG}
          pending={carbsPending}
          onSave={onSaveCarbs}
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

  const saveMove = async (moveDate: Date) => {
    if (Number.isNaN(moveDate.getTime())) {
      setActionMessage('Enter a local date and time.');
      return;
    }
    setActionMessage(null);
    try {
      await mutations.move.mutateAsync(formatLocalDateTime(moveDate));
      setActionMessage('Workout moved.');
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
    currentReplacementCategory: detail.replacementCategory,
    move: openMove,
    replace: (category) => void replaceWorkout(category),
    deleteWorkout: () => void deleteWorkout(),
  }), [actionPending, deleteWorkout, detail.replacementCategory, openMove, replaceWorkout]);

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
          <ActivityIndicator color={SpringaColors.brand} />
          <Text style={styles.headerTitle}>
            Replacing with {{ easy: 'Easy', quality: 'Quality', long: 'Long', club: 'Club Run' }[replacementPending]}…
          </Text>
        </View>
      ) : (
        <ScrollView
        contentInsetAdjustmentBehavior="automatic"
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
          <Text style={styles.message} accessibilityRole="alert" selectable>
            {actionMessage}
          </Text>
        ) : null}
        <NativePresentation
          detail={detail}
          carbsPending={mutations.savePreRunCarbs.isPending}
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
  const { data, isLoading, isError, error, reload } = usePlannedWorkoutDetail(event.id);

  if (isLoading) {
    return (
      <View style={styles.screenRoot} accessibilityLabel="Loading planned workout details">
        <PlannedWorkoutHeader
          event={event}
          now={now}
        />
        <View style={styles.center}>
          <ActivityIndicator color={SpringaColors.brand} />
          <Text style={styles.muted}>Loading workout details…</Text>
        </View>
      </View>
    );
  }

  if (isError || data == null) {
    return (
      <View style={styles.center} accessibilityLabel="Planned workout details">
        <Text style={styles.errorTitle}>Couldn’t load workout details</Text>
        <Text style={styles.muted} selectable>{error ?? 'Something went wrong.'}</Text>
        <Pressable
          onPress={reload}
          accessibilityRole="button"
          accessibilityLabel="Retry loading workout details"
          style={styles.button}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
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
    gap: 6,
    paddingBottom: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  headerDate: {
    flexShrink: 1,
    color: SpringaColors.muted,
    fontSize: 15,
  },
  headerTitle: {
    color: SpringaColors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: SpringaColors.tintBrand,
  },
  badgeMissed: {
    backgroundColor: SpringaColors.tintError,
  },
  badgeCompleted: {
    backgroundColor: SpringaColors.tintSuccess,
  },
  badgeText: {
    color: SpringaColors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  badgeTextMissed: {
    color: SpringaColors.error,
  },
  content: {
    gap: 16,
    paddingBottom: 32,
  },
  presentationContent: {
    gap: 14,
  },
  informationRows: {
    gap: 8,
  },
  infoCard: {
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: SpringaColors.surfaceAlt,
  },
  eyebrow: {
    color: SpringaColors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  nativeMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: `${SpringaColors.brand}66`,
    backgroundColor: SpringaColors.tintBrand,
  },
  nativeMetricCell: {
    minWidth: 112,
    flexBasis: 130,
    flexGrow: 1,
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  nativeMetricValue: {
    color: SpringaColors.text,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  clothingContent: {
    gap: 7,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: SpringaColors.border,
    backgroundColor: SpringaColors.surface,
  },
  chipText: {
    color: SpringaColors.muted,
    fontSize: 13,
  },
  weather: {
    color: SpringaColors.muted,
    fontSize: 13,
  },
  nativeStructureCard: {
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: SpringaColors.surfaceAlt,
  },
  sectionTitle: {
    color: SpringaColors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  structureSection: {
    gap: 6,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    color: SpringaColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  repeatPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: SpringaColors.brand,
  },
  repeatText: {
    color: SpringaColors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  nativeSectionSteps: {
    gap: 0,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: SpringaColors.borderSubtle,
  },
  stepRow: {
    minHeight: 44,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  nativeStepRow: {
    minHeight: 42,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: SpringaColors.border,
  },
  lastStepRow: {
    borderBottomWidth: 0,
  },
  stepDuration: {
    minWidth: 44,
    color: SpringaColors.text,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  zonePill: {
    maxWidth: 104,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
  },
  zoneText: {
    color: SpringaColors.bg,
    fontSize: 13,
    fontWeight: '800',
  },
  stepDetail: {
    minWidth: 132,
    flexBasis: 160,
    flexGrow: 1,
    color: SpringaColors.muted,
    fontSize: 13,
  },
  descriptionCard: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  description: {
    color: SpringaColors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 34,
    overflow: 'hidden',
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  timelineSegment: {
    minWidth: 3,
  },
  muted: {
    color: SpringaColors.muted,
    fontSize: 14,
  },
  center: {
    flex: 1,
    gap: 10,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  replacementPending: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: SpringaColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: SpringaColors.tintBrand,
    borderWidth: 1,
    borderColor: SpringaColors.border,
  },
  buttonText: {
    color: SpringaColors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  message: {
    color: SpringaColors.muted,
    fontSize: 13,
    paddingBottom: 6,
  },
});
