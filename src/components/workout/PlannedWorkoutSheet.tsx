import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Footprints,
  MoreHorizontal,
  Move,
  Pencil,
  Repeat2,
  Route,
  Trash2,
  Users,
  Zap,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  CalendarEvent,
  ClothingRecommendation,
  PlannedWorkoutClothing,
  PlannedWorkoutDetail,
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

type PlannedWorkoutSheetProps = {
  event: CalendarEvent;
  onClose: () => void;
  now?: Date;
  onActionsReady?: (handler: (() => void) | null) => void;
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

type CarbEditorProps = {
  value: number | null;
  input: string;
  editing: boolean;
  pending: boolean;
  error: string | null;
  onEdit: () => void;
  onInputChange: (value: string) => void;
  onSave: (value?: string) => void;
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

function PreRunCarbsRow({
  value,
  input,
  editing,
  pending,
  error,
  onEdit,
  onInputChange,
  onSave,
}: CarbEditorProps) {
  const inputRef = useRef<TextInput>(null);
  const inputValueRef = useRef(input);
  const committedValueRef = useRef<string | null>(null);

  const handleSave = () => {
    const value = inputValueRef.current;
    if (pending || committedValueRef.current === value) return;
    committedValueRef.current = value;
    onSave(value);
  };

  useEffect(() => {
    if (editing) inputValueRef.current = input;
  }, [editing, input]);

  useEffect(() => {
    if (editing) committedValueRef.current = null;
  }, [editing]);

  return (
    <View
      style={styles.infoCard}
      accessibilityLabel="Pre-run carbs"
    >
      {!editing ? (
        <View style={styles.rowHeader}>
          <Text style={styles.rowLabel} selectable>
            Pre-run carbs
          </Text>
          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit pre-run carbs"
            hitSlop={8}
            style={styles.inlineAction}
          >
            <Text style={styles.inlineValue} selectable>
              {value == null ? 'Add' : `${value} g`}
            </Text>
            <Pencil color={SpringaColors.muted} size={15} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.inlineEditor}>
          <Text style={styles.rowLabel} selectable>
            Pre-run carbs
          </Text>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={(value) => {
              inputValueRef.current = value;
              committedValueRef.current = null;
              onInputChange(value);
            }}
            onBlur={handleSave}
            onSubmitEditing={() => inputRef.current?.blur()}
            accessibilityLabel="Pre-run carbs grams"
            keyboardType="numeric"
            placeholder="e.g. 25"
            placeholderTextColor={SpringaColors.muted}
            style={styles.inlineInput}
            editable={!pending}
          />
          <Text style={styles.unit}>g</Text>
        </View>
      )}

      {error ? (
        <Text style={styles.errorText} accessibilityRole="alert" selectable>
          {error}
        </Text>
      ) : null}
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
                  <Text style={styles.stepDetail} selectable numberOfLines={2}>
                    {step.detail}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function Timeline({ detail }: { detail: PlannedWorkoutDetail }) {
  const timeline = detail.structure.timeline;
  return (
    <View style={styles.nativeTimelineCard} accessibilityLabel="Workout timeline">
      <Text style={styles.sectionTitle}>Timeline</Text>
      {timeline.length === 0 ? (
        <Text style={styles.muted} selectable>
          No timeline available.
        </Text>
      ) : (
        <>
          <View style={styles.timeline}>
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
        </>
      )}
    </View>
  );
}

function ActionMenu({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Workout actions"
      style={[styles.iconButton, disabled && styles.disabled]}
    >
      <MoreHorizontal color={SpringaColors.muted} size={21} />
    </Pressable>
  );
}

type ActionSheetMode = 'actions' | 'replace' | null;
type ReplacementCategory = 'easy' | 'quality' | 'long' | 'club';

const replacementChoices = [
  {
    category: 'easy' as const,
    label: 'Easy',
    description: 'Keep it comfortable',
    icon: Footprints,
    color: HrZoneColors[2],
  },
  {
    category: 'quality' as const,
    label: 'Quality',
    description: 'Keep some intensity',
    icon: Zap,
    color: HrZoneColors[4],
  },
  {
    category: 'long' as const,
    label: 'Long',
    description: 'Build endurance',
    icon: Route,
    color: HrZoneColors[3],
  },
  {
    category: 'club' as const,
    label: 'Club Run',
    description: 'Run with others',
    icon: Users,
    color: SpringaColors.brand,
  },
];

function SheetActionRow({
  label,
  description,
  icon: Icon,
  color,
  destructive = false,
  onPress,
}: {
  label: string;
  description: string;
  icon: typeof Move;
  color: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} workout`}
      style={({ pressed }) => [styles.sheetActionRow, pressed && styles.sheetPressed]}
    >
      <View style={[styles.sheetIcon, { backgroundColor: `${color}22` }]}>
        <Icon color={destructive ? SpringaColors.error : color} size={20} />
      </View>
      <View style={styles.sheetActionCopy}>
        <Text style={[styles.sheetActionLabel, destructive && styles.destructiveText]}>
          {label}
        </Text>
        <Text style={styles.sheetActionDescription}>{description}</Text>
      </View>
      <ChevronRight color={SpringaColors.muted} size={18} />
    </Pressable>
  );
}

function WorkoutActionSheet({
  mode,
  workoutName,
  onClose,
  onMove,
  onOpenReplace,
  onReplace,
  onDelete,
}: {
  mode: ActionSheetMode;
  workoutName: string;
  onClose: () => void;
  onMove: () => void;
  onOpenReplace: () => void;
  onReplace: (category: ReplacementCategory) => void;
  onDelete: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (mode == null) return null;

  return (
    <Modal
      transparent
      visible
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.sheetRoot} accessibilityViewIsModal>
        <Pressable
          style={styles.sheetBackdrop}
          onPress={onClose}
          accessibilityLabel="Close workout actions"
        />
        <View
          style={[styles.actionSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          accessibilityLabel={mode === 'replace' ? 'Replace workout sheet' : 'Workout actions sheet'}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {mode === 'replace' ? 'Replace workout' : 'Workout actions'}
          </Text>
          <Text style={styles.sheetSubtitle}>
            {mode === 'replace' ? 'Choose a replacement' : workoutName}
          </Text>

          {mode === 'replace' ? (
            <>
              <View style={styles.replacementGrid}>
                {replacementChoices.map((choice) => {
                  const Icon = choice.icon;
                  return (
                    <Pressable
                      key={choice.category}
                      onPress={() => onReplace(choice.category)}
                      accessibilityRole="button"
                      accessibilityLabel={`Replace with ${choice.label}`}
                      style={({ pressed }) => [
                        styles.replacementCard,
                        pressed && styles.sheetPressed,
                      ]}
                    >
                      <Icon color={choice.color} size={22} />
                      <Text style={styles.replacementLabel}>{choice.label}</Text>
                      <Text style={styles.replacementDescription}>{choice.description}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel replace workout"
                style={({ pressed }) => [styles.sheetCancel, pressed && styles.sheetPressed]}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.sheetActionList}>
              <SheetActionRow
                label="Replace"
                description="Choose another workout"
                icon={Repeat2}
                color={SpringaColors.brand}
                onPress={onOpenReplace}
              />
              <SheetActionRow
                label="Move"
                description="Change date and time"
                icon={Move}
                color={SpringaColors.muted}
                onPress={onMove}
              />
              <SheetActionRow
                label="Delete"
                description="Remove from your plan"
                icon={Trash2}
                color={SpringaColors.error}
                destructive
                onPress={onDelete}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function PlannedWorkoutHeader({
  event,
  date,
  now,
  disabled,
  showInlineActions = true,
  onActions,
}: {
  event: CalendarEvent;
  date?: Date;
  now: Date;
  disabled: boolean;
  showInlineActions?: boolean;
  onActions: () => void;
}) {
  const badge = getWorkoutStatusBadge(event, now);

  return (
    <View style={styles.plannedHeader}>
      <View style={styles.headerTopRow}>
        <Text style={styles.headerDate} selectable>
          {formatWorkoutDate(date ?? event.date)}
        </Text>
        {showInlineActions ? <ActionMenu disabled={disabled} onPress={onActions} /> : null}
      </View>
      <Text style={styles.headerTitle} selectable>
        {event.name}
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
  );
}

function MoveEditor({
  value,
  pending,
  onSave,
  onCancel,
}: {
  value: Date;
  pending: boolean;
  onSave: (value: Date) => void;
  onCancel: () => void;
}) {
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(
    Platform.OS === 'android' ? 'date' : null,
  );
  const [pickerValue, setPickerValue] = useState(value);
  const handlePickerChange = (_event: unknown, selectedDate?: Date) => {
    if (
      typeof _event === 'object' &&
      _event !== null &&
      'type' in _event &&
      _event.type === 'dismissed'
    ) {
      setPickerMode(null);
      setPickerValue(value);
      return;
    }
    if (!selectedDate) {
      setPickerMode(null);
      setPickerValue(value);
      return;
    }
    if (Platform.OS === 'android' && pickerMode === 'date') {
      const next = new Date(pickerValue);
      next.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      );
      setPickerValue(next);
      setPickerMode('time');
      return;
    }
    if (Platform.OS === 'android' && pickerMode === 'time') {
      const next = new Date(pickerValue);
      next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setPickerValue(next);
      setPickerMode(null);
      return;
    }
    setPickerValue(selectedDate);
  };

  return (
    <View style={styles.editorCard} accessibilityLabel="Move workout editor">
      <Text style={styles.eyebrow}>Move workout</Text>
      <View style={styles.datePickerRow} accessibilityLabel="Move workout date">
        <Pressable
          disabled={pending}
          onPress={() => {
            if (Platform.OS === 'android') {
              setPickerValue(value);
              setPickerMode('date');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Open move date picker"
        >
          <Text style={styles.datePickerValue} selectable>
            {formatWorkoutDate(pickerValue)}
          </Text>
        </Pressable>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={pickerValue}
            onChange={handlePickerChange}
            mode="datetime"
            display="default"
            disabled={pending}
          />
        ) : pickerMode ? (
          <DateTimePicker
            value={pickerValue}
            onChange={handlePickerChange}
            mode={pickerMode}
            display="default"
            disabled={pending}
          />
        ) : null}
      </View>
      <View style={styles.actionRow}>
        <Pressable
          disabled={pending}
          onPress={() => onSave(pickerValue)}
          accessibilityRole="button"
          accessibilityLabel="Save moved workout"
          style={[styles.actionButton, pending && styles.disabled]}
        >
          <Text style={styles.actionButtonText}>{pending ? 'Saving…' : 'Save move'}</Text>
        </Pressable>
        <Pressable
          disabled={pending}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel move"
          style={[styles.quietButton, pending && styles.disabled]}
        >
          <Text style={styles.quietButtonText}>Cancel</Text>
        </Pressable>
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
  carbProps,
}: {
  detail: PlannedWorkoutDetail;
  carbProps: CarbEditorProps;
}) {
  return (
    <View style={styles.presentationContent}>
      <View style={styles.metricStrip}>
        <NativeMetricGrid detail={detail} />
      </View>
      <PreRunCarbsRow {...carbProps} />
      <ClothingSection clothing={detail.clothing} />
      <StructureSections detail={detail} />
      <Timeline detail={detail} />
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
  onActionsReady?: (handler: (() => void) | null) => void;
  now: Date;
}) {
  const mutations = usePlannedWorkoutMutations(eventId);
  const [carbsInput, setCarbsInput] = useState(() =>
    detail.preRunCarbsG == null ? '' : String(detail.preRunCarbsG),
  );
  const [carbsValue, setCarbsValue] = useState<number | null>(detail.preRunCarbsG);
  const [carbsError, setCarbsError] = useState<string | null>(null);
  const [carbsEditing, setCarbsEditing] = useState(false);
  const [moveEditing, setMoveEditing] = useState(false);
  const detailDate = parseLocalDateTime(detail.event.startDateLocal);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionSheet, setActionSheet] = useState<ActionSheetMode>(null);

  const saveCarbs = async (inputValue = carbsInput) => {
    const trimmed = inputValue.trim();
    const carbsG = trimmed.length === 0 ? null : Number(trimmed);
    if (
      carbsG !== null &&
      (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(carbsG) || carbsG < 0)
    ) {
      setCarbsError('Use a whole number of grams.');
      return;
    }
    setCarbsError(null);
    setActionMessage(null);
    try {
      await mutations.savePreRunCarbs.mutateAsync(carbsG);
      setCarbsEditing(false);
      setCarbsValue(carbsG);
      setActionMessage('Pre-run carbs saved.');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to save pre-run carbs.');
    }
  };

  const saveMove = async (moveDate: Date) => {
    if (Number.isNaN(moveDate.getTime())) {
      setActionMessage('Enter a local date and time.');
      return;
    }
    setActionMessage(null);
    try {
      await mutations.move.mutateAsync(formatLocalDateTime(moveDate));
      setMoveEditing(false);
      setActionMessage('Workout moved.');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to move workout.');
    }
  };

  const replaceWorkout = async (category: 'easy' | 'quality' | 'long' | 'club') => {
    setActionSheet(null);
    setActionMessage(null);
    try {
      await mutations.replace.mutateAsync(category);
      setActionMessage('Workout replaced.');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to replace workout.');
    }
  };

  const deleteWorkout = async () => {
    setActionMessage(null);
    try {
      await mutations.deleteWorkout.mutateAsync();
      onClose();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to delete workout.');
    }
  };

  const showActions = useCallback(() => {
    setActionSheet('actions');
  }, []);

  const confirmDelete = () => {
    Alert.alert('Delete workout?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteWorkout() },
    ]);
  };

  useEffect(() => {
    if (onActionsReady == null) return;
    onActionsReady(showActions);
    return () => onActionsReady(null);
  }, [onActionsReady, showActions]);

  const actionPending =
    mutations.move.isPending ||
    mutations.replace.isPending ||
    mutations.deleteWorkout.isPending ||
    mutations.savePreRunCarbs.isPending;

  const carbProps: CarbEditorProps = {
    value: carbsValue,
    input: carbsInput,
    editing: carbsEditing,
    pending: actionPending,
    error: carbsError,
    onEdit: () => {
      setCarbsInput(carbsValue == null ? '' : String(carbsValue));
      setCarbsError(null);
      setActionMessage(null);
      setCarbsEditing(true);
    },
    onInputChange: (value) => {
      setCarbsInput(value);
      setCarbsError(null);
    },
    onSave: (inputValue) => void saveCarbs(inputValue),
  };

  return (
    <View
      style={styles.detailRoot}
      accessibilityLabel="Native workout details"
    >
      <PlannedWorkoutHeader
        event={event}
        date={detailDate}
        now={now}
        disabled={actionPending}
        showInlineActions={onActionsReady == null}
        onActions={showActions}
      />
      {actionMessage ? (
        <Text style={styles.message} accessibilityRole="alert" selectable>
          {actionMessage}
        </Text>
      ) : null}
      {moveEditing ? (
        <MoveEditor
          value={detailDate}
          pending={actionPending}
          onSave={(moveDate) => void saveMove(moveDate)}
          onCancel={() => setMoveEditing(false)}
        />
      ) : null}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        accessibilityLabel="Planned workout details"
      >
        <NativePresentation detail={detail} carbProps={carbProps} />
      </ScrollView>
      <WorkoutActionSheet
        mode={actionSheet}
        workoutName={event.name}
        onClose={() => setActionSheet(null)}
        onOpenReplace={() => setActionSheet('replace')}
        onReplace={(category) => void replaceWorkout(category)}
        onMove={() => {
          setActionSheet(null);
          setMoveEditing(true);
          setActionMessage(null);
        }}
        onDelete={() => {
          setActionSheet(null);
          confirmDelete();
        }}
      />
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
          disabled
          showInlineActions={onActionsReady == null}
          onActions={() => {}}
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
      key={`${data.event.name}:${data.event.startDateLocal}:${data.preRunCarbsG ?? ''}`}
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
    gap: 8,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerDate: {
    flex: 1,
    color: SpringaColors.muted,
    fontSize: 16,
  },
  headerTitle: {
    color: SpringaColors.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: SpringaColors.tintBrand,
    borderWidth: 1,
    borderColor: SpringaColors.brand + '66',
  },
  badgeMissed: {
    backgroundColor: SpringaColors.tintError,
    borderColor: SpringaColors.error + '66',
  },
  badgeCompleted: {
    backgroundColor: SpringaColors.tintSuccess,
    borderColor: SpringaColors.success + '66',
  },
  badgeText: {
    color: SpringaColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  badgeTextMissed: {
    color: SpringaColors.error,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 36,
    borderRadius: 10,
    backgroundColor: SpringaColors.surfaceAlt,
    borderWidth: 1,
    borderColor: SpringaColors.border,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: '#00000099',
  },
  actionSheet: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: SpringaColors.borderSubtle,
    backgroundColor: SpringaColors.surface,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    marginBottom: 4,
    borderRadius: 2,
    backgroundColor: SpringaColors.borderSubtle,
  },
  sheetTitle: {
    color: SpringaColors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: SpringaColors.muted,
    fontSize: 14,
    marginBottom: 4,
  },
  sheetActionList: {
    gap: 8,
  },
  sheetActionRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    backgroundColor: SpringaColors.surfaceAlt,
  },
  sheetIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 11,
  },
  sheetActionCopy: {
    flex: 1,
    gap: 2,
  },
  sheetActionLabel: {
    color: SpringaColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sheetActionDescription: {
    color: SpringaColors.muted,
    fontSize: 13,
  },
  destructiveText: {
    color: SpringaColors.error,
  },
  replacementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  replacementCard: {
    width: '48%',
    minHeight: 112,
    gap: 7,
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    backgroundColor: SpringaColors.surfaceAlt,
  },
  replacementLabel: {
    color: SpringaColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  replacementDescription: {
    color: SpringaColors.muted,
    fontSize: 12,
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  sheetCancelText: {
    color: SpringaColors.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  sheetPressed: {
    opacity: 0.72,
  },
  content: {
    gap: 12,
    paddingBottom: 28,
  },
  presentationContent: {
    gap: 10,
  },
  infoCard: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    backgroundColor: SpringaColors.surfaceAlt,
  },
  eyebrow: {
    color: SpringaColors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  rowHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    minWidth: 90,
    color: SpringaColors.muted,
    fontSize: 16,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  inlineValue: {
    color: SpringaColors.text,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  inlineEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineInput: {
    width: 64,
    minHeight: 40,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: SpringaColors.brand,
    borderRadius: 7,
    color: SpringaColors.text,
    backgroundColor: SpringaColors.surface,
    fontSize: 14,
    textAlign: 'right',
  },
  unit: {
    color: SpringaColors.muted,
    fontSize: 14,
  },
  metricStrip: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: SpringaColors.brand + '66',
    backgroundColor: SpringaColors.tintBrand,
  },
  nativeMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nativeMetricCell: {
    width: '47%',
    gap: 2,
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
    borderRadius: 6,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SpringaColors.border,
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
    minHeight: 30,
    flexDirection: 'row',
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
    width: 42,
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
    flex: 1,
    minWidth: 0,
    color: SpringaColors.muted,
    fontSize: 13,
  },
  nativeTimelineCard: {
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    backgroundColor: SpringaColors.surfaceAlt,
  },
  descriptionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    backgroundColor: SpringaColors.surfaceAlt,
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
    height: 48,
    overflow: 'hidden',
    borderRadius: 5,
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
  datePickerRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    borderRadius: 8,
    backgroundColor: SpringaColors.surface,
    paddingHorizontal: 10,
  },
  datePickerValue: {
    flex: 1,
    color: SpringaColors.text,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: SpringaColors.tintBrand,
    borderWidth: 1,
    borderColor: SpringaColors.border,
  },
  actionButtonText: {
    color: SpringaColors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
  quietButton: {
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  quietButtonText: {
    color: SpringaColors.muted,
    fontSize: 14,
  },
  editorCard: {
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    backgroundColor: SpringaColors.surfaceAlt,
  },
  disabled: {
    opacity: 0.5,
  },
  errorText: {
    color: SpringaColors.error,
    fontSize: 13,
  },
  message: {
    color: SpringaColors.muted,
    fontSize: 13,
    paddingBottom: 6,
  },
});
