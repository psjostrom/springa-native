import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import type { CalendarEvent } from '@/api/types';
import { findCalendarEvent } from '@/domain/findCalendarEvent';
import { useCalendarEvents } from '@/query/useCalendarEvents';

function workoutParam(
  value: string | string[] | undefined,
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null || raw === '') return undefined;
  return raw;
}

export type WorkoutSheetController = {
  isPresented: boolean;
  event: CalendarEvent | null;
  clearWorkout: () => void;
};

/** Shared route-param + Query resolution for the workout bottom sheet. */
export function useWorkoutSheetController(): WorkoutSheetController {
  const router = useRouter();
  const params = useLocalSearchParams<{ workout?: string | string[] }>();
  const workoutId = workoutParam(params.workout);
  const { events, isLoading } = useCalendarEvents();
  const event = workoutId ? findCalendarEvent(events, workoutId) : undefined;
  const isPresented = workoutId != null;
  const notFound = workoutId != null && !isLoading && event == null;

  const clearWorkout = useCallback(() => {
    router.setParams({ workout: undefined });
  }, [router]);

  // Dismiss: iOS universal BottomSheet onDismiss; Android Material onDismissRequest
  // + BackHandler in WorkoutSheet.android.tsx (covers Host mount / Dialog tear-down).

  useEffect(() => {
    if (!notFound) return;
    const t = setTimeout(() => {
      clearWorkout();
    }, 1200);
    return () => clearTimeout(t);
  }, [notFound, workoutId, clearWorkout]);

  return {
    isPresented,
    event: event ?? null,
    clearWorkout,
  };
}
