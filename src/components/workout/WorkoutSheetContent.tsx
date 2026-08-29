import { StyleSheet, View } from 'react-native';
import type { CalendarEvent } from '@/api/types';
import { AppText, Badge, StateView } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';
import { CompletedWorkoutSheet } from './CompletedWorkoutSheet';
import {
  PlannedWorkoutSheet,
  type PlannedWorkoutActions,
} from './PlannedWorkoutSheet';
import { formatWorkoutDate } from './plannedWorkoutPresentation';

type WorkoutSheetContentProps = {
  event: CalendarEvent | null;
  onClose: () => void;
  now?: Date;
  onActionsReady?: (actions: PlannedWorkoutActions | null) => void;
  onReplace?: (newId: string) => void;
};

export function WorkoutSheetContent({
  event,
  onClose,
  now,
  onActionsReady,
  onReplace,
}: WorkoutSheetContentProps) {
  if (event == null) {
    return (
      <View style={styles.root} accessibilityLabel="Workout not found">
        <StateView
          title="Workout not found"
          message="This workout is no longer available."
        />
      </View>
    );
  }

  if (event.type === 'completed') {
    return (
      <View style={styles.root} accessibilityLabel={`Workout ${event.name}`}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="caption" tone="muted">{formatWorkoutDate(event.date)}</AppText>
            <AppText variant="heading">{event.name}</AppText>
            <Badge label="Completed" tone="success" />
          </View>
        </View>

        <CompletedWorkoutSheet key={event.id} event={event} />
      </View>
    );
  }

  return (
    <View style={styles.root} accessibilityLabel={`Workout ${event.name}`}>
      <PlannedWorkoutSheet
        event={event}
        onClose={onClose}
        onActionsReady={onActionsReady}
        now={now}
        onReplace={onReplace}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: Spacing.sm,
    minHeight: 120,
    backgroundColor: SpringaColors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  headerText: {
    flex: 1,
    gap: Spacing.sm,
    minWidth: 0,
  },
});
