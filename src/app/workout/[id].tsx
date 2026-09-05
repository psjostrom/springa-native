import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WorkoutActionsSheet } from '@/components/workout/WorkoutActionsSheet';
import { WorkoutSheetContent } from '@/components/workout/WorkoutSheetContent';
import type { PlannedWorkoutActions } from '@/components/workout/PlannedWorkoutSheet';
import { findCalendarEvent } from '@/domain/findCalendarEvent';
import { useCalendarEvents } from '@/query/useCalendarEvents';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';

/** Workout detail stack screen — identity = `/workout/[id]`; data = calendar Query cache. */
export default function WorkoutSheetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, isLoading } = useCalendarEvents();
  const event = id ? findCalendarEvent(events, id) : undefined;
  const [actionsPresented, setActionsPresented] = useState(false);
  const [actions, setActions] = useState<PlannedWorkoutActions | null>(null);

  const dismiss = () => {
    if (router.canGoBack()) router.back();
  };

  if (isLoading && event == null) {
    return <View style={styles.root} testID="workout-sheet" />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Workout',
        }}
      />
      {actions ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Workout actions"
            disabled={actions.pending}
            onPress={() => setActionsPresented(true)}
          >
            <Stack.Toolbar.Icon
              src={require('../../../assets/images/ellipsis.png')}
              renderingMode="template"
            />
            <Stack.Toolbar.Label>More</Stack.Toolbar.Label>
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <View style={styles.root} testID="workout-sheet">
        <WorkoutSheetContent
          event={event ?? null}
          onClose={dismiss}
          onActionsReady={setActions}
          onReplace={(newId) => router.setParams({ id: newId })}
        />
      </View>
      {actions ? (
        <WorkoutActionsSheet
          isPresented={actionsPresented}
          onDismiss={() => setActionsPresented(false)}
          actions={actions}
          workoutName={event?.name ?? 'Workout'}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SpringaColors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});
