import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import { WorkoutSheetContent } from '@/components/workout/WorkoutSheetContent';
import { findCalendarEvent } from '@/domain/findCalendarEvent';
import { useCalendarEvents } from '@/query/useCalendarEvents';
import { SpringaColors } from '@/theme/colors';

/** Workout detail stack screen — identity = `/workout/[id]`; data = calendar Query cache. */
export default function WorkoutSheetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, isLoading } = useCalendarEvents();
  const event = id ? findCalendarEvent(events, id) : undefined;
  const actionsRef = useRef<(() => void) | null>(null);
  const [actionsReady, setActionsReady] = useState(false);

  const registerActions = useCallback((handler: (() => void) | null) => {
    actionsRef.current = handler;
    setActionsReady(handler != null);
  }, []);

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
      <Stack.Screen
        options={{
          title: event?.name ?? 'Workout',
          headerRight: actionsReady
            ? () => (
                <Pressable
                  onPress={() => actionsRef.current?.()}
                  accessibilityRole="button"
                  accessibilityLabel="Workout actions"
                  hitSlop={8}
                  style={styles.headerAction}
                >
                  <MoreHorizontal color={SpringaColors.muted} size={22} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <WorkoutSheetContent
        event={event ?? null}
        onClose={dismiss}
        onActionsReady={registerActions}
      />
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
  headerAction: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SpringaColors.surfaceAlt,
  },
});
