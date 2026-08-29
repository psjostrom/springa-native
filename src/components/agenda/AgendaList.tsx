import { LegendList } from '@legendapp/list/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, History } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { CalendarEvent } from '@/api/types';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import { AppText, Card, StateView } from '@/components/ui';
import { splitAgendaEvents } from '@/domain/agendaAnchor';
import { useCalendarEvents } from '@/query/useCalendarEvents';
import { prefetchCompletedWorkoutOverview } from '@/query/useCompletedWorkoutOverview';
import { prefetchPlannedWorkoutDetail } from '@/query/usePlannedWorkout';
import { SpringaColors } from '@/theme/colors';
import { IconSize, Spacing } from '@/theme/tokens';
import { AgendaEventCard } from './AgendaEventCard';

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

  const { earlier, upcoming } = useMemo(() => splitAgendaEvents(events), [events]);
  const plannedUpcomingIds = useMemo(
    () =>
      upcoming
        .filter((event) => event.type === 'planned')
        .slice(0, 10)
        .map((event) => event.id),
    [upcoming],
  );
  const completedEarlierActivityIds = useMemo(
    () =>
      earlier
        .filter((event) => event.type === 'completed' && event.activityId != null)
        .slice(-10)
        .map((event) => event.activityId as string),
    [earlier],
  );
  const sessionEmail = session?.email;
  const historyMode = view === 'history';

  useEffect(() => {
    if (authStatus !== 'signedIn' || sessionEmail == null) return;

    plannedUpcomingIds.forEach((eventId) => {
      void prefetchPlannedWorkoutDetail(
        queryClient,
        apiClient,
        sessionEmail,
        eventId,
      );
    });

    completedEarlierActivityIds.forEach((activityId) => {
      void prefetchCompletedWorkoutOverview(
        queryClient,
        apiClient,
        sessionEmail,
        activityId,
      );
    });
  }, [
    apiClient,
    authStatus,
    completedEarlierActivityIds,
    plannedUpcomingIds,
    queryClient,
    sessionEmail,
  ]);

  // Empty older windows are gaps — keep paging while history is open and still empty.
  useEffect(() => {
    if (!historyMode || earlier.length > 0 || isFetchingOlder || !hasOlder) return;
    void fetchOlder();
  }, [historyMode, earlier.length, isFetchingOlder, hasOlder, fetchOlder]);

  if (isLoading) {
    return (
      <View accessibilityLabel="Loading calendar">
        <StateView loading title="Loading workouts…" />
      </View>
    );
  }

  if (isError) {
    return (
      <StateView
        title="Couldn’t load calendar"
        message={error ?? 'Something went wrong.'}
        onRetry={reload}
        retryLabel="Retry"
        retryAccessibilityLabel="Retry loading calendar"
      />
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
          <Card>
            <AppText variant="subheading">Agenda</AppText>
          </Card>
          {historyMode ? (
            <Pressable
              onPress={() => setView('upcoming')}
              accessibilityRole="button"
              accessibilityLabel="Back to upcoming"
              style={styles.historyNav}
            >
              <ChevronLeft size={IconSize.sm} color={SpringaColors.muted} />
              <AppText variant="label" tone="muted">Back to upcoming</AppText>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setView('history')}
              accessibilityRole="button"
              accessibilityLabel="Earlier workouts"
              style={styles.earlierButton}
            >
              <History size={IconSize.sm} color={SpringaColors.muted} />
              <AppText variant="label" tone="muted">Earlier workouts</AppText>
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
              <AppText variant="caption" tone="error" style={styles.edgeText}>
                Couldn’t load more. Tap to retry.
              </AppText>
            </Pressable>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <AppText variant="label" tone="muted" style={styles.empty}>
          {historyMode
            ? historyStillLoading
              ? 'Loading earlier…'
              : 'No earlier workouts'
            : 'No workouts scheduled'}
        </AppText>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {historyMode && isFetchingOlder && earlier.length > 0 ? (
            <AppText variant="caption" tone="muted" style={styles.edgeText}>Loading earlier…</AppText>
          ) : null}
          {!historyMode && isFetchingNewer ? (
            <AppText variant="caption" tone="muted" style={styles.edgeText}>Loading more…</AppText>
          ) : null}
          {!historyMode && newerError ? (
            <Pressable
              onPress={() => {
                void fetchNewer();
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading later workouts"
            >
              <AppText variant="caption" tone="error" style={styles.edgeText}>
                Couldn’t load more. Tap to retry.
              </AppText>
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
  header: { gap: Spacing.sm, marginBottom: Spacing.sm },
  earlierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  historyNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  footer: { paddingVertical: Spacing.sm },
  edgeText: {
    textAlign: 'center',
    paddingVertical: Spacing.xs,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
