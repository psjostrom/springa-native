import { BottomSheet, RNHostView } from '@expo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { findCalendarEvent } from '@/domain/findCalendarEvent';
import { useCalendarEvents } from '@/query/useCalendarEvents';
import { WorkoutSheetContent } from './WorkoutSheetContent';

function workoutParam(
  value: string | string[] | undefined,
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null || raw === '') return undefined;
  return raw;
}

/**
 * Bottom sheet over Calendar. Identity = route search param `workout`.
 * Data = calendar Query cache. System back / dismiss clears the param.
 */
export function WorkoutSheet() {
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
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      clearWorkout();
      return true;
    });
    return () => sub.remove();
  }, [isPresented, clearWorkout]);

  // Auto-dismiss unknown ids after a short not-found flash.
  useEffect(() => {
    if (!notFound) return;
    const t = setTimeout(() => {
      clearWorkout();
    }, 1200);
    return () => clearTimeout(t);
  }, [notFound, clearWorkout]);

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={clearWorkout}
      snapPoints={['half', 'full']}
      testID="workout-sheet"
    >
      <RNHostView>
        <WorkoutSheetContent event={event ?? null} onClose={clearWorkout} />
      </RNHostView>
    </BottomSheet>
  );
}
