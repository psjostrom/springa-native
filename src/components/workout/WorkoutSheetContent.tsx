import { StyleSheet, Text, View } from 'react-native';
import type { CalendarEvent } from '@/api/types';
import { getCardStatus } from '@/domain/eventStatus';
import { SpringaColors } from '@/theme/colors';
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
        <Text style={styles.title}>Workout not found</Text>
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
          <Text style={styles.date}>{formatWorkoutDate(event.date)}</Text>
          <Text style={styles.title}>{event.name}</Text>
          <View
            style={[
              styles.badge,
              badge.label === 'Missed' && styles.badgeMissed,
              badge.label === 'Completed' && styles.badgeCompleted,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                badge.label === 'Missed' && styles.badgeTextMissed,
              ]}
            >
              {badge.label}
            </Text>
          </View>
        </View>
      </View>

      <CompletedWorkoutSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 8,
    minHeight: 120,
    backgroundColor: SpringaColors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  date: {
    fontSize: 13,
    color: SpringaColors.muted,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: SpringaColors.text,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: SpringaColors.tintBrand,
    borderWidth: 1,
    borderColor: SpringaColors.border,
  },
  badgeMissed: {
    backgroundColor: SpringaColors.tintError,
    borderColor: SpringaColors.error + '4D',
  },
  badgeCompleted: {
    backgroundColor: SpringaColors.tintSuccess,
    borderColor: SpringaColors.success + '4D',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: SpringaColors.text,
  },
  badgeTextMissed: {
    color: SpringaColors.error,
  },
});
