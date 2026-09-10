import { useMutationState, type QueryClient } from '@tanstack/react-query';
import type { CalendarEvent } from '@/api/types';
import { queryKeys } from './keys';

export type WorkoutUpdate = {
  eventId: string;
  activityId?: string;
  patch: Partial<Pick<CalendarEvent, 'date' | 'preRunCarbsG' | 'carbsIngested' | 'rating' | 'feedbackComment'>> | null;
};

function matchesWorkoutUpdate(event: CalendarEvent, update: WorkoutUpdate) {
  return event.id === update.eventId ||
    (update.activityId != null && event.activityId === update.activityId);
}

export function beginWorkoutUpdate(client: QueryClient, identity: string, update: WorkoutUpdate): WorkoutUpdate {
  const conflicts = client.getMutationCache().findAll({
    mutationKey: queryKeys.updateWorkout(identity), status: 'pending',
  }).some((mutation) => {
    const pending = mutation.state.context as WorkoutUpdate | undefined;
    if (pending == null || (pending.eventId !== update.eventId &&
      !(update.activityId != null && pending.activityId === update.activityId))) return false;
    return pending.patch === null || update.patch === null ||
      Object.keys(update.patch).some((field) => field in pending.patch!);
  });
  if (conflicts) throw new Error('Save already in progress');
  return update;
}

export function applyWorkoutUpdates(events: CalendarEvent[], updates: (WorkoutUpdate | undefined)[]) {
  return updates.reduce((current, update) => update == null ? current : current.flatMap((event) => {
    if (!matchesWorkoutUpdate(event, update)) return [event];
    return update.patch === null ? [] : [{ ...event, ...update.patch }];
  }), events);
}

// Pending edits stay out of the persisted cache and disappear automatically on failure.
export function usePendingWorkoutUpdates(identity: string) {
  return useMutationState({
    filters: { mutationKey: queryKeys.updateWorkout(identity), status: 'pending' },
    select: (mutation) => mutation.state.context as WorkoutUpdate | undefined,
  });
}
