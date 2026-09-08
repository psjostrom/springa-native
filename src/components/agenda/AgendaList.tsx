import { LegendList } from '@legendapp/list/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, History, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { CreateWorkoutSheet } from '@/components/workout/CreateWorkoutSheet';
import type { CalendarEvent } from '@/api/types';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import { AppText, Card, IconButton, StateView } from '@/components/ui';
import { startOfLocalDay } from '@/domain/eventStatus';
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
  const [createPresented, setCreatePresented] = useState(false);
  const [view, setView] = useState<AgendaViewMode>('upcoming');
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { status: authStatus, session } = useAuth();
  const {
    events,
    pendingEventIds,
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
  const plannedUpcomingKey = useMemo(
    () =>
      upcoming
        .filter((event) => event.type === 'planned' && !pendingEventIds.includes(event.id))
        .slice(0, 10)
        .map((event) => event.id)
        .join(','),
    [upcoming, pendingEventIds],
  );
  const completedEarlierKey = useMemo(
    () =>
      earlier
        .filter((event) => event.type === 'completed' && event.activityId != null)
        .slice(-10)
        .map((event) => event.activityId as string)
        .join(','),
    [earlier],
  );
  const sessionEmail = session?.email;
  const historyMode = view === 'history';

  useEffect(() => {
    if (authStatus !== 'signedIn' || sessionEmail == null) return;

    let cancelled = false;
    const upcomingIds = plannedUpcomingKey ? plannedUpcomingKey.split(',') : [];
    const earlierIds = completedEarlierKey ? completedEarlierKey.split(',') : [];

    const runPrefetch = async () => {
      await Promise.all([
        ...upcomingIds.map(async (eventId) => {
          if (cancelled) return;
          await prefetchPlannedWorkoutDetail(
            queryClient,
            apiClient,
            sessionEmail,
            eventId,
          ).catch(() => {});
        }),
        ...earlierIds.map(async (activityId) => {
          if (cancelled) return;
          await prefetchCompletedWorkoutOverview(
            queryClient,
            apiClient,
            sessionEmail,
            activityId,
          ).catch(() => {});
        }),
      ]);
    };

    void runPrefetch();
    return () => {
      cancelled = true;
    };
  }, [
    apiClient,
    authStatus,
    completedEarlierKey,
    plannedUpcomingKey,
    queryClient,
    sessionEmail,
  ]);

  // Empty older windows are gaps — keep paging while history is open and still empty.
  useEffect(() => {
    if (!historyMode || earlier.length > 0 || isFetchingOlder || !hasOlder || Boolean(olderError)) return;
    void fetchOlder();
  }, [historyMode, earlier.length, isFetchingOlder, hasOlder, olderError, fetchOlder]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await reload();
    } finally {
      setIsRefreshing(false);
    }
  }, [reload]);

  const listData = useMemo(
    () => (historyMode ? [...earlier].reverse() : upcoming),
    [earlier, historyMode, upcoming],
  );
  const historyStillLoading =
    historyMode && earlier.length === 0 && (isFetchingOlder || hasOlder);

  if (isLoading) {
    return (
      <View accessibilityLabel="Loading calendar">
        <StateView loading title="Loading workouts…" />
      </View>
    );
  }

  if (isError && events.length === 0) {
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

  return (
    <>
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
      refreshControl={
        <RefreshControl
          testID="agenda-refresh-control"
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={SpringaColors.brand}
          colors={[SpringaColors.brand]}
        />
      }

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
          <Card style={styles.titleRow}>
            <AppText variant="subheading">Agenda</AppText>
            <IconButton accessibilityLabel="Add workout" disabled={pendingEventIds.length > 0} onPress={() => setCreatePresented(true)}>
              <Plus size={IconSize.md} color={SpringaColors.brandText} />
            </IconButton>
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
          saving={pendingEventIds.includes(item.id)}
          onPress={(event) => {
            onOpenWorkout?.(event.id);
          }}
        />
      )}
    />
    <CreateWorkoutSheet
      isPresented={createPresented}
      onDismiss={() => setCreatePresented(false)}
      onSave={(date) => setView(date < startOfLocalDay() ? 'history' : 'upcoming')}
    />
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
