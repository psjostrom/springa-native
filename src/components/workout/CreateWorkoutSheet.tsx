import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ApiError } from '@/api/errors';
import type { PlannedWorkoutReplacementCategory, SingleWorkoutPreview } from '@/api/types';
import { AppText, Badge, Button, Card, IconButton, StateView } from '@/components/ui';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { formatIsoDay } from '@/domain/calendarWindows';
import { useCreateWorkout, useSingleWorkoutPreview } from '@/query/useSingleWorkout';
import { SpringaColors } from '@/theme/colors';
import { IconSize, Radius, Spacing } from '@/theme/tokens';
import { StructureSections, WorkoutSummary } from './PlannedWorkoutSheet';
import { extractWorkoutNotes, formatWorkoutDate } from './plannedWorkoutPresentation';
import { WorkoutCategoryChoices } from './WorkoutCategoryChoices';

type Props = { isPresented: boolean; onDismiss: () => void; onSave?: (date: Date) => void };

export function CreateWorkoutSheet({ isPresented, onDismiss, onSave }: Props) {
  const creation = useCreateWorkout();
  const [reviewPresented, setReviewPresented] = useState(false);
  const presented = isPresented || reviewPresented;
  const dismiss = () => { setReviewPresented(false); onDismiss(); };
  return (
    <>
      <AppBottomSheet isPresented={presented} onDismiss={dismiss}>
        {presented ? (
          <WorkoutGenerator
            initialPreview={reviewPresented ? creation.variables : undefined}
            error={reviewPresented ? creation.error : null}
            onClearError={creation.reset}
            onSave={(preview) => {
              creation.mutate(preview);
              onSave?.(new Date(preview.workout.startDateLocal));
              dismiss();
            }}
            onDismiss={dismiss}
          />
        ) : <View />}
      </AppBottomSheet>
      {creation.isError && !presented ? (
        <Card style={styles.errorCard}>
          <AppText variant="label" tone="error" accessibilityRole="alert">Couldn’t save workout</AppText>
          <AppText tone="muted">{creation.error.message}</AppText>
          <Button label="Review workout" variant="secondary" onPress={() => setReviewPresented(true)} />
        </Card>
      ) : null}
    </>
  );
}

function WorkoutGenerator({ onDismiss, initialPreview, error, onClearError, onSave }: {
  onDismiss: () => void;
  initialPreview?: SingleWorkoutPreview;
  error: Error | null;
  onClearError: () => void;
  onSave: (preview: SingleWorkoutPreview) => void;
}) {
  const { height } = useWindowDimensions();
  const [date, setDate] = useState(() => initialPreview ? new Date(initialPreview.workout.startDateLocal) : new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [category, setCategory] = useState<PlannedWorkoutReplacementCategory | undefined>(initialPreview?.category);
  const preview = useSingleWorkoutPreview(formatIsoDay(date), category);
  const workout = preview.data?.workout;
  const notes = workout ? extractWorkoutNotes(workout.description) : null;
  const stalePreview = error instanceof ApiError && error.code === 'WORKOUT_PREVIEW_STALE';

  const save = () => {
    if (!preview.data || preview.isFetching || stalePreview) return;
    onSave(preview.data);
  };

  return (
    <View style={[styles.sheet, { maxHeight: height * 0.8 }]}>
      <View style={styles.heading}>
        {category ? (
          <IconButton accessibilityLabel="Back to workout choices" onPress={() => {
            setCategory(undefined);
            onClearError();
          }}>
            <ChevronLeft color={SpringaColors.muted} size={IconSize.md} />
          </IconButton>
        ) : (
          <View style={styles.headingIcon}><Plus color={SpringaColors.brandText} size={IconSize.lg} /></View>
        )}
        <View style={styles.headingCopy}>
          <AppText variant="heading">{category ? 'Workout preview' : 'Add workout'}</AppText>
          <AppText variant="caption" tone="muted">
            {category ? 'Ready when you are' : 'One run, shaped by your training plan'}
          </AppText>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change workout date"
          accessibilityValue={{ text: formatIsoDay(date) }}
          onPress={() => setPickerVisible(!pickerVisible)}
          style={({ pressed }) => pressed && styles.dimmed}
        >
          <Card tone="subtle" style={styles.dateRow}>
            <CalendarDays size={IconSize.md} color={SpringaColors.brandText} />
            <View style={styles.headingCopy}>
              <AppText variant="caption" tone="muted">Workout date</AppText>
              <AppText variant="label">{category && workout
                ? formatWorkoutDate(new Date(workout.startDateLocal))
                : date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</AppText>
            </View>
            {formatIsoDay(date) === formatIsoDay(new Date()) ? <Badge label="Today" tone="brand" /> : null}
            <ChevronRight size={IconSize.sm} color={SpringaColors.muted} />
          </Card>
        </Pressable>
        {pickerVisible ? (
          <DateTimePicker
            accessibilityLabel="Choose workout date"
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            themeVariant="dark"
            onValueChange={(_event, selectedDate) => {
              if (Platform.OS === 'android') setPickerVisible(false);
              if (!selectedDate) return;
              setDate(selectedDate);
              setCategory(undefined);
              onClearError();
            }}
            onDismiss={() => setPickerVisible(false)}
          />
        ) : null}
        {preview.isPending ? <StateView loading title="Preparing your workout…" /> : preview.isError ? (
          <StateView title="Couldn’t prepare workout" message={preview.error.message} onRetry={() => { void preview.refetch(); }} />
        ) : category && workout ? (
          <>
            <AppText variant="title" selectable>{workout.name}</AppText>
            <WorkoutSummary detail={workout} />
            <StructureSections detail={workout} />
            {notes ? <AppText tone="muted" selectable>{notes}</AppText> : null}
          </>
        ) : (
          <>
            <AppText variant="label" tone="muted">Choose your run</AppText>
            <WorkoutCategoryChoices
              action="Create"
              suggested={preview.data?.suggestedCategory}
              onSelect={(next) => { setCategory(next); setPickerVisible(false); }}
            />
          </>
        )}
        {error ? (
          <AppText tone="error" accessibilityRole="alert" selectable>{error.message}</AppText>
        ) : null}
      </ScrollView>
      {category && workout && !preview.isError ? (
        stalePreview ? (
          <Button label="Refresh preview" loading={preview.isFetching} onPress={async () => {
            const result = await preview.refetch();
            if (result.isSuccess) onClearError();
          }} />
        ) : (
          <Button label="Save workout" disabled={preview.isFetching} onPress={save} />
        )
      ) : null}
      <Button label="Cancel" variant="secondary" onPress={onDismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  errorCard: { gap: Spacing.sm, marginTop: Spacing.sm },
  sheet: { gap: Spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingBottom: Spacing.xs },
  headingCopy: { flex: 1, gap: Spacing.xxs },
  headingIcon: { width: 44, height: 44, borderRadius: Radius.lg, backgroundColor: SpringaColors.tintBrand, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1 },
  content: { gap: Spacing.lg, paddingBottom: Spacing.xs },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 64 },
  dimmed: { opacity: 0.48 },
});
