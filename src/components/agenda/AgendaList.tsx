import { LegendList } from '@legendapp/list/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, History } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CalendarEvent } from '@/api/types';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import { splitAgendaEvents } from '@/domain/agendaAnchor';
import { useCalendarEvents } from '@/query/useCalendarEvents';
import { prefetchPlannedWorkoutDetail } from '@/query/usePlannedWorkout';
import { SpringaColors } from '@/theme/colors';
import { AgendaEventCard } from './AgendaEventCard';
import { ViewModeSwitcher } from './ViewModeSwitcher';

type AgendaViewMode = 'upcoming' | 'history';

type AgendaListProps = {
  onOpenWorkout?: (eventId: string) => void;
};

export function AgendaList({ onOpenWorkout }: AgendaListProps) {
  const [view, setView] = useState<AgendaViewMode>('upcoming');
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { status: authStatus, session } = useAuth();
  const {
    events,
    isLoading,
    isError,
    error,
    reload,
    fetchOlder,
    fetchNewer,
    hasOlder,
    isFetchingOlder,
    isFetchingNewer,
    olderError,
    newerError,
  } = useCalendarEvents();

  const { earlier, upcoming } = splitAgendaEvents(events);
  const historyMode = view === 'history';

  useEffect(() => {
    if (authStatus !== 'signedIn' || session == null) return;

    upcoming
      .filter((event) => event.type === 'planned')
      .slice(0, 8)
      .forEach((event) => {
        void prefetchPlannedWorkoutDetail(
          queryClient,
          apiClient,
          session.email,
          event.id,
        );
      });
  }, [apiClient, authStatus, queryClient, session, upcoming]);

  // Empty older windows are gaps — keep paging while history is open and still empty.
  useEffect(() => {
    if (!historyMode || earlier.length > 0 || isFetchingOlder || !hasOlder) return;
    void fetchOlder();
  }, [historyMode, earlier.length, isFetchingOlder, hasOlder, fetchOlder]);

  if (isLoading) {
    return (
      <View style={styles.center} accessibilityLabel="Loading calendar">
        <ActivityIndicator color={SpringaColors.brand} />
        <Text style={styles.muted}>Loading workouts…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Couldn’t load calendar</Text>
        <Text style={styles.body}>{error ?? 'Something went wrong.'}</Text>
        <Pressable
          onPress={reload}
          accessibilityRole="button"
          accessibilityLabel="Retry loading calendar"
          style={styles.button}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const listData = historyMode ? [...earlier].reverse() : upcoming;
  const historyStillLoading =
    historyMode && earlier.length === 0 && (isFetchingOlder || hasOlder);

  return (
    <LegendList
      // Remount when flipping modes — LegendList can stick on an empty frame
      // after upcoming ↔ history swaps.
      key={view}
      style={styles.list}
      data={listData}
      extraData={view}
      keyExtractor={(item: CalendarEvent) => item.id}
      recycleItems
      estimatedItemSize={96}
      maintainVisibleContentPosition={false}
      onStartReached={undefined}
      onEndReached={() => {
        if (historyMode) {
          void fetchOlder();
          return;
        }
        void fetchNewer();
      }}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.switcherCard}>
            <ViewModeSwitcher />
          </View>
          {historyMode ? (
            <Pressable
              onPress={() => setView('upcoming')}
              accessibilityRole="button"
              accessibilityLabel="Back to upcoming"
              style={styles.historyNav}
            >
              <ChevronLeft size={16} color={SpringaColors.muted} />
              <Text style={styles.historyNavText}>Back to upcoming</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setView('history')}
              accessibilityRole="button"
              accessibilityLabel="Earlier workouts"
              style={styles.earlierButton}
            >
              <History size={16} color={SpringaColors.muted} />
              <Text style={styles.earlierButtonText}>Earlier workouts</Text>
            </Pressable>
          )}
          {historyMode && olderError ? (
            <Pressable
              onPress={() => {
                void fetchOlder();
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading earlier workouts"
            >
              <Text style={styles.edgeError}>Couldn’t load more. Tap to retry.</Text>
            </Pressable>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {historyMode
            ? historyStillLoading
              ? 'Loading earlier…'
              : 'No earlier workouts'
            : 'No workouts scheduled'}
        </Text>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {historyMode && isFetchingOlder && earlier.length > 0 ? (
            <Text style={styles.edgeHint}>Loading earlier…</Text>
          ) : null}
          {!historyMode && isFetchingNewer ? (
            <Text style={styles.edgeHint}>Loading more…</Text>
          ) : null}
          {!historyMode && newerError ? (
            <Pressable
              onPress={() => {
                void fetchNewer();
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading later workouts"
            >
              <Text style={styles.edgeError}>Couldn’t load more. Tap to retry.</Text>
            </Pressable>
          ) : null}
        </View>
      }
      renderItem={({ item }: { item: CalendarEvent }) => (
        <AgendaEventCard
          event={item}
          onPress={(event) => {
            onOpenWorkout?.(event.id);
          }}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  header: { gap: 6, marginBottom: 6 },
  switcherCard: {
    backgroundColor: SpringaColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    padding: 8,
  },
  earlierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  earlierButtonText: {
    color: SpringaColors.muted,
    fontSize: 14,
  },
  historyNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  historyNavText: {
    color: SpringaColors.muted,
    fontSize: 14,
  },
  footer: { paddingVertical: 8 },
  edgeHint: {
    textAlign: 'center',
    color: SpringaColors.muted,
    fontSize: 12,
    paddingVertical: 4,
  },
  edgeError: {
    textAlign: 'center',
    color: SpringaColors.error,
    fontSize: 12,
    paddingVertical: 4,
  },
  empty: {
    textAlign: 'center',
    color: SpringaColors.muted,
    fontSize: 14,
    paddingVertical: 28,
  },
  center: {
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    color: SpringaColors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: SpringaColors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  muted: {
    color: SpringaColors.muted,
    fontSize: 13,
  },
  button: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: SpringaColors.tintBrand,
    borderWidth: 1,
    borderColor: SpringaColors.border,
  },
  buttonText: {
    color: SpringaColors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
});
