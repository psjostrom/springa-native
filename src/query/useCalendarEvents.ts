import { useCallback, useEffect, useMemo } from 'react';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type InfiniteQueryObserverResult,
  type QueryClient,
} from '@tanstack/react-query';
import type { CalendarEvent } from '@/api/types';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import {
  formatIsoDay,
  initialCalendarWindow,
  newerCalendarWindow,
  olderCalendarWindow,
  type DateWindow,
} from '@/domain/calendarWindows';
import { mergeCalendarEvents } from '@/domain/mergeCalendarEvents';
import { queryKeys } from './keys';
import { usePendingWorkoutCreations } from './useSingleWorkout';
import { useSettingsQuery } from './useSettingsQuery';
import { applyWorkoutUpdates, usePendingWorkoutUpdates } from './usePendingWorkoutUpdates';

/** Stop paging once windows fall entirely outside this horizon (empty gaps must not). */
const LOOKBACK_DAYS = 730;
const LOOKAHEAD_DAYS = 365;

function olderPageParam(currentOldest: string, now = new Date()): DateWindow | undefined {
  const next = olderCalendarWindow(currentOldest);
  const floor = formatIsoDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - LOOKBACK_DAYS),
  );
  // ISO YYYY-MM-DD compares lexicographically.
  if (next.newest < floor) return undefined;
  return next;
}

function newerPageParam(currentNewest: string, now = new Date()): DateWindow | undefined {
  const next = newerCalendarWindow(currentNewest);
  const ceiling = formatIsoDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + LOOKAHEAD_DAYS),
  );
  if (next.oldest > ceiling) return undefined;
  return next;
}

export const CALENDAR_STALE_TIME = 1000 * 60 * 5; // 5 minutes

type CalendarQueryResult = InfiniteQueryObserverResult<InfiniteData<CalendarEvent[], unknown>, Error>;

// Cache-scoped coordination so all concurrent subscribers (AgendaList, UnratedRunBanner, etc.)
// sharing a QueryClient instance share deduplication and warming state without cross-client leakage.
const clientInFlightNext = new WeakMap<QueryClient, Map<string, Promise<CalendarQueryResult | undefined>>>();
const clientInFlightPrev = new WeakMap<QueryClient, Map<string, Promise<CalendarQueryResult | undefined>>>();
const clientWarmedIdentities = new WeakMap<QueryClient, Set<string>>();

function getWarmedSet(client: QueryClient): Set<string> {
  let set = clientWarmedIdentities.get(client);
  if (!set) {
    set = new Set();
    clientWarmedIdentities.set(client, set);
  }
  return set;
}

function getInFlightMap(
  store: WeakMap<QueryClient, Map<string, Promise<CalendarQueryResult | undefined>>>,
  client: QueryClient,
): Map<string, Promise<CalendarQueryResult | undefined>> {
  let map = store.get(client);
  if (!map) {
    map = new Map();
    store.set(client, map);
  }
  return map;
}

export function useCalendarEvents() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { status: authStatus, session } = useAuth();
  const settings = useSettingsQuery();
  const identity = session?.email ?? '';
  // Start calendar as soon as signed in; only stop once settings prove disconnected.
  const knownDisconnected =
    settings.status === 'ready' && !settings.settings?.intervalsConnected;
  const calendarEnabled =
    authStatus === 'signedIn' && session != null && !knownDisconnected;

  const query = useInfiniteQuery({
    queryKey: queryKeys.calendar(identity),
    initialPageParam: initialCalendarWindow() as DateWindow,
    queryFn: ({ pageParam, signal }) => client.getCalendar(pageParam.oldest, pageParam.newest, signal),
    // Empty windows are gaps, not boundaries — keep contiguous pages within the horizon.
    getNextPageParam: (_lastPage, _pages, lastPageParam) => {
      const next = newerPageParam(lastPageParam.newest);
      if (!next) return undefined;
      // Refetch must preserve windows expanded to include a newly created workout.
      const cached = queryClient.getQueryData<InfiniteData<CalendarEvent[], DateWindow>>(queryKeys.calendar(identity));
      return cached?.pageParams.find((window) => window.oldest === next.oldest) ?? next;
    },
    getPreviousPageParam: (_firstPage, _pages, firstPageParam) =>
      olderPageParam(firstPageParam.oldest),
    enabled: calendarEnabled,
    staleTime: CALENDAR_STALE_TIME,
  });

  const pages = query.data?.pages;
  const pendingEvents = usePendingWorkoutCreations();
  const pendingUpdates = usePendingWorkoutUpdates(identity);
  const pendingEventIds = useMemo(() => pendingEvents.map((event) => event.id), [pendingEvents]);
  const events = useMemo(() => mergeCalendarEvents([
    applyWorkoutUpdates((pages ?? []).flat(), pendingUpdates), pendingEvents,
  ]), [pages, pendingEvents, pendingUpdates]);
  const {
    isSuccess,
    hasPreviousPage,
    hasNextPage,
    fetchPreviousPage,
    fetchNextPage,
    isFetchingPreviousPage,
    isFetchingNextPage,
  } = query;

  const fetchNewer = useCallback(() => {
    if (!identity) return Promise.resolve(undefined);
    const inFlightMap = getInFlightMap(clientInFlightNext, queryClient);
    const existing = inFlightMap.get(identity);
    if (existing) return existing;

    const execute = async () => {
      const activePrev = getInFlightMap(clientInFlightPrev, queryClient).get(identity);
      if (activePrev) {
        await activePrev.catch(() => {});
      }
      return fetchNextPage();
    };

    const promise = execute().finally(() => {
      if (inFlightMap.get(identity) === promise) {
        inFlightMap.delete(identity);
      }
    });
    inFlightMap.set(identity, promise);
    return promise;
  }, [identity, queryClient, fetchNextPage]);

  const fetchOlder = useCallback(() => {
    if (!identity) return Promise.resolve(undefined);
    const inFlightMap = getInFlightMap(clientInFlightPrev, queryClient);
    const existing = inFlightMap.get(identity);
    if (existing) return existing;

    const execute = async () => {
      const activeNext = getInFlightMap(clientInFlightNext, queryClient).get(identity);
      if (activeNext) {
        await activeNext.catch(() => {});
      }
      return fetchPreviousPage();
    };

    const promise = execute().finally(() => {
      if (inFlightMap.get(identity) === promise) {
        inFlightMap.delete(identity);
      }
    });
    inFlightMap.set(identity, promise);
    return promise;
  }, [identity, queryClient, fetchPreviousPage]);

  // After the first (today→future) page paints, warm newer (future) then older (history).
  // Gated on pageCount === 1 so components mounting with existing cache never refire warming,
  // unless the hydrated cache is behind today due to multi-day inactivity.
  useEffect(() => {
    if (!calendarEnabled || !isSuccess || !identity) return;
    const warmedSet = getWarmedSet(queryClient);
    if (warmedSet.has(identity)) return;

    const cached = queryClient.getQueryData<InfiniteData<CalendarEvent[], DateWindow>>(
      queryKeys.calendar(identity),
    );
    const pageParams = cached?.pageParams;
    const newestIso = pageParams?.reduce(
      (max, p) => (!max || p.newest > max ? p.newest : max),
      '',
    );
    const isCacheBehindToday = Boolean(
      newestIso && newestIso < formatIsoDay(new Date()),
    );
    const pageCount = cached?.pages.length ?? 0;
    if (pageCount !== 1 && !isCacheBehindToday) return;

    warmedSet.add(identity);
    let cancelled = false;
    let completed = false;

    void (async () => {
      try {
        if (isCacheBehindToday) {
          // Stale cache: advance future horizon to reach today FIRST
          let currentRes = await fetchNewer();
          while (!cancelled && currentRes?.isSuccess) {
            const params = currentRes.data?.pageParams as DateWindow[] | undefined;
            const last = params?.[params.length - 1];
            if (!last || last.newest >= formatIsoDay(new Date()) || !currentRes.hasNextPage) {
              break;
            }
            currentRes = await fetchNewer();
          }
          if (!currentRes?.isSuccess) {
            warmedSet.delete(identity);
            return;
          }
          // Now that cache is caught up to today, warm history in background
          if (!cancelled) {
            await fetchOlder();
          }
        } else {
          // Normal mount: warm upcoming workouts first, then older history in background.
          if (!cancelled) await fetchNewer();
          if (!cancelled) await fetchOlder();
        }
        if (!cancelled) {
          completed = true;
        }
      } catch {
        warmedSet.delete(identity);
      }
    })();

    return () => {
      cancelled = true;
      if (!completed) {
        warmedSet.delete(identity);
      }
    };
  }, [calendarEnabled, isSuccess, identity, queryClient, fetchNewer, fetchOlder]);

  const { refetch } = query;
  const reload = useCallback(() => {
    getWarmedSet(queryClient).delete(identity);
    return refetch();
  }, [identity, queryClient, refetch]);

  return {
    events,
    pendingEventIds,
    isLoading: calendarEnabled && query.isPending,
    isError: calendarEnabled && query.isError,
    error: query.error instanceof Error ? query.error.message : null,
    reload,



    fetchOlder,
    fetchNewer,
    hasOlder: Boolean(hasPreviousPage),
    hasNewer: Boolean(hasNextPage),
    isFetchingOlder: isFetchingPreviousPage,
    isFetchingNewer: isFetchingNextPage,
    olderError: query.isFetchPreviousPageError,
    newerError: query.isFetchNextPageError,
  };
}
