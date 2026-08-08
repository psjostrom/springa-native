import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
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

  useEffect(() => {
    if (!isPresented) return;
    const onBack = () => {
      console.warn('[workout-sheet] hardwareBackPress → clearWorkout');
      clearWorkout();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => {
      sub.remove();
      const hold = BackHandler.addEventListener('hardwareBackPress', () => true);
      setTimeout(() => hold.remove(), 400);
    };
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

/** Mount native sheet while presented; keep mounted until hide animation finishes. */
export function useSheetMount(isPresented: boolean): {
  mount: boolean;
  setMount: (v: boolean) => void;
} {
  const [mount, setMount] = useState(isPresented);
  // Sync open → mounted during render (avoid setState-in-effect).
  if (isPresented && !mount) {
    setMount(true);
  }
  return { mount, setMount };
}
