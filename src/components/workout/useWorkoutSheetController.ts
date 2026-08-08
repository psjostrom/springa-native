import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
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

  // iOS / default: consume hardware back while the param is set.
  // Android: WorkoutSheet.android keeps BackHandler for the full Host mount
  // (param clear → hide animation) so Dialog tear-down cannot finish MainActivity.
  useEffect(() => {
    if (!isPresented || Platform.OS === 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      clearWorkout();
      return true;
    });
    return () => sub.remove();
  }, [isPresented, clearWorkout]);

  useEffect(() => {
    if (!notFound) return;
    const t = setTimeout(() => {
      clearWorkout();
    }, 1200);
    return () => clearTimeout(t);
  }, [notFound, clearWorkout]);

  return {
    isPresented,
    event: event ?? null,
    clearWorkout,
  };
}
