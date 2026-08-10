import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WorkoutSheetContent } from '@/components/workout/WorkoutSheetContent';
import { findCalendarEvent } from '@/domain/findCalendarEvent';
import { useCalendarEvents } from '@/query/useCalendarEvents';
import { SpringaColors } from '@/theme/colors';

/** Workout detail formSheet — identity = `/workout/[id]`; data = calendar Query cache. */
export default function WorkoutSheetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, isLoading } = useCalendarEvents();
  const event = id ? findCalendarEvent(events, id) : undefined;

  useEffect(() => {
    if (id == null || isLoading || event != null) return;
    const t = setTimeout(() => {
      if (router.canGoBack()) router.back();
    }, 1200);
    return () => clearTimeout(t);
  }, [id, isLoading, event, router]);

  const dismiss = () => {
    if (router.canGoBack()) router.back();
  };

  if (isLoading && event == null) {
    return <View style={styles.root} testID="workout-sheet" />;
  }

  return (
    <View style={styles.root} testID="workout-sheet">
      <WorkoutSheetContent event={event ?? null} onClose={dismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SpringaColors.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
