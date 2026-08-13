import { StyleSheet, View } from 'react-native';
import type { CalendarEvent } from '@/api/types';
import { AppText, Badge, StateView } from '@/components/ui';
import { getCardStatus } from '@/domain/eventStatus';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';
import { CompletedWorkoutSheet } from './CompletedWorkoutSheet';
import {
  PlannedWorkoutSheet,
  type PlannedWorkoutActions,
} from './PlannedWorkoutSheet';
import { formatWorkoutDate } from './plannedWorkoutPresentation';
import { getWorkoutStatusBadge } from './workoutStatusBadge';

type WorkoutSheetContentProps = {
  event: CalendarEvent | null;
  onClose: () => void;
  now?: Date;
  onActionsReady?: (actions: PlannedWorkoutActions | null) => void;
};

export function WorkoutSheetContent({
  event,
  onClose,
  now = new Date(),
  onActionsReady,
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

  const badge = getWorkoutStatusBadge(event, now);
  const completed = getCardStatus(event, now) === 'completed';

  if (!completed && event.type === 'planned') {
    return (
      <View style={styles.root} accessibilityLabel={`Workout ${event.name}`}>
        <PlannedWorkoutSheet
          event={event}
          onClose={onClose}
          onActionsReady={onActionsReady}
          now={now}
        />
      </View>
    );
  }

  return (
    <View style={styles.root} accessibilityLabel={`Workout ${event.name}`}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="caption" tone="muted">{formatWorkoutDate(event.date)}</AppText>
          <AppText variant="heading">{event.name}</AppText>
          <Badge
            label={badge.label}
            tone={badge.label === 'Missed' ? 'error' : badge.label === 'Completed' ? 'success' : badge.label === 'Race' ? 'warning' : 'brand'}
          />
        </View>
      </View>

      <CompletedWorkoutSheet />
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
