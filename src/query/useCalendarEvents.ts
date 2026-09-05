import { useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
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
import { useSettingsQuery } from './useSettingsQuery';

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

export function useCalendarEvents() {
  const client = useApiClient();
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
    queryFn: ({ pageParam }) => client.getCalendar(pageParam.oldest, pageParam.newest),
    // Empty windows are gaps, not boundaries — keep contiguous pages within the horizon.
    getNextPageParam: (_lastPage, _pages, lastPageParam) =>
      newerPageParam(lastPageParam.newest),
    getPreviousPageParam: (_firstPage, _pages, firstPageParam) =>
      olderPageParam(firstPageParam.oldest),
    enabled: calendarEnabled,
    staleTime: CALENDAR_STALE_TIME,
    maxPages: 8,
  });

  const pages = query.data?.pages;
  const events = useMemo(() => mergeCalendarEvents(pages ?? []), [pages]);
  const {
    isSuccess,
    data,
    hasPreviousPage,
    hasNextPage,
    fetchPreviousPage,
    fetchNextPage,
    isFetchingPreviousPage,
    isFetchingNextPage,
  } = query;

  // After the first (today→future) page paints, warm older (history) then newer.
  // Gated strictly on data.pages.length === 1 so components mounting with existing cache never refire warming.
  useEffect(() => {
    if (!calendarEnabled || !isSuccess) return;
    if ((data?.pages.length ?? 0) !== 1) return;
    void (async () => {
      if (hasPreviousPage) await fetchPreviousPage();
      if (hasNextPage) await fetchNextPage();
    })();
  }, [
    calendarEnabled,
    isSuccess,
    data?.pages.length,
    hasPreviousPage,
    hasNextPage,
    fetchPreviousPage,
    fetchNextPage,
  ]);

  const fetchOlder = useCallback(() => {
    if (!hasPreviousPage || isFetchingPreviousPage) return Promise.resolve();
    return fetchPreviousPage();
  }, [hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage]);

  const fetchNewer = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return Promise.resolve();
    return fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const reload = useCallback(() => query.refetch(), [query]);

  return {
    events,
    isLoading: calendarEnabled && query.isPending,
    isError: calendarEnabled && query.isError,
    error: query.error instanceof Error ? query.error.message : null,
    reload,



    fetchOlder,
    fetchNewer,
    hasOlder: Boolean(hasPreviousPage),
    isFetchingOlder: isFetchingPreviousPage,
    isFetchingNewer: isFetchingNextPage,
    olderError: query.isFetchPreviousPageError,
    newerError: query.isFetchNextPageError,
  };
}
