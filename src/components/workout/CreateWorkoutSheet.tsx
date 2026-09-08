import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ApiError } from '@/api/errors';
import type { PlannedWorkoutReplacementCategory } from '@/api/types';
import { AppText, Badge, Button, Card, IconButton, StateView } from '@/components/ui';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { formatIsoDay } from '@/domain/calendarWindows';
import { useCreateWorkout, useSingleWorkoutPreview } from '@/query/useSingleWorkout';
import { SpringaColors } from '@/theme/colors';
import { IconSize, Radius, Spacing } from '@/theme/tokens';
import { StructureSections, WorkoutSummary } from './PlannedWorkoutSheet';
import { extractWorkoutNotes, formatWorkoutDate } from './plannedWorkoutPresentation';
import { WorkoutCategoryChoices } from './WorkoutCategoryChoices';

type Props = { isPresented: boolean; onDismiss: () => void };

export function CreateWorkoutSheet({ isPresented, onDismiss }: Props) {
  return (
    <AppBottomSheet isPresented={isPresented} onDismiss={onDismiss}>
      {isPresented ? <WorkoutGenerator onDismiss={onDismiss} /> : <View />}
    </AppBottomSheet>
  );
}

function WorkoutGenerator({ onDismiss }: Pick<Props, 'onDismiss'>) {
  const { height } = useWindowDimensions();
  const [date, setDate] = useState(() => new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [category, setCategory] = useState<PlannedWorkoutReplacementCategory>();
  const preview = useSingleWorkoutPreview(formatIsoDay(date), category);
  const creation = useCreateWorkout();
  const workout = preview.data?.workout;
  const notes = workout ? extractWorkoutNotes(workout.description) : null;
  const stalePreview = creation.error instanceof ApiError && creation.error.code === 'WORKOUT_PREVIEW_STALE';
  const pending = creation.isPending;

  const save = async () => {
    if (!preview.data || pending || preview.isFetching || stalePreview) return;
    const { date: previewDate, category: previewCategory, previewHash } = preview.data;
    try {
      await creation.mutateAsync({ date: previewDate, category: previewCategory, previewHash });
      onDismiss();
    } catch {
      // The mutation keeps the preview and error visible for retry.
    }
  };

  return (
    <View style={[styles.sheet, { maxHeight: height * 0.8 }]}>
      <View style={styles.heading}>
        {category ? (
          <IconButton accessibilityLabel="Back to workout choices" disabled={pending} onPress={() => {
            setCategory(undefined);
            creation.reset();
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
          accessibilityState={{ disabled: pending }}
          disabled={pending}
          onPress={() => setPickerVisible(!pickerVisible)}
          style={({ pressed }) => (pressed || pending) && styles.dimmed}
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
        {pickerVisible && !pending ? (
          <DateTimePicker
            accessibilityLabel="Choose workout date"
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            themeVariant="dark"
            onValueChange={(_event, selectedDate) => {
              if (pending) return;
              if (Platform.OS === 'android') setPickerVisible(false);
              if (!selectedDate) return;
              setDate(selectedDate);
              setCategory(undefined);
              creation.reset();
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
        {creation.isError ? (
          <AppText tone="error" accessibilityRole="alert" selectable>{creation.error.message}</AppText>
        ) : null}
      </ScrollView>
      {category && workout && !preview.isError ? (
        stalePreview ? (
          <Button label="Refresh preview" loading={preview.isFetching} onPress={async () => {
            const result = await preview.refetch();
            if (result.isSuccess) creation.reset();
          }} />
        ) : (
          <Button label={pending ? 'Saving workout…' : 'Save workout'} loading={pending} disabled={preview.isFetching} onPress={() => { void save(); }} />
        )
      ) : null}
      <Button label="Cancel" variant="secondary" disabled={pending} onPress={onDismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: Spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingBottom: Spacing.xs },
  headingCopy: { flex: 1, gap: Spacing.xxs },
  headingIcon: { width: 44, height: 44, borderRadius: Radius.lg, backgroundColor: SpringaColors.tintBrand, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1 },
  content: { gap: Spacing.lg, paddingBottom: Spacing.xs },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 64 },
  dimmed: { opacity: 0.48 },
});
