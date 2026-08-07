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

export function useCalendarEvents() {
  const client = useApiClient();
  const { status: authStatus, session } = useAuth();
  const settings = useSettingsQuery();
  const identity = session?.email ?? '';
  const connected =
    authStatus === 'signedIn' &&
    session != null &&
    settings.status === 'ready' &&
    !!settings.settings?.intervalsConnected;

  const query = useInfiniteQuery({
    queryKey: queryKeys.calendar(identity),
    initialPageParam: initialCalendarWindow() as DateWindow,
    queryFn: ({ pageParam }) => client.getCalendar(pageParam.oldest, pageParam.newest),
    // Empty windows are gaps, not boundaries — keep contiguous pages within the horizon.
    getNextPageParam: (_lastPage, _pages, lastPageParam) =>
      newerPageParam(lastPageParam.newest),
    getPreviousPageParam: (_firstPage, _pages, firstPageParam) =>
      olderPageParam(firstPageParam.oldest),
    enabled: connected,
  });

  const events = mergeCalendarEvents(query.data?.pages ?? []);

  return {
    events,
    isLoading: connected && query.isPending,
    isError: connected && query.isError,
    error: query.error instanceof Error ? query.error.message : null,
    reload: () => {
      void query.refetch();
    },
    fetchOlder: () => {
      if (query.hasPreviousPage) return query.fetchPreviousPage();
      return Promise.resolve();
    },
    fetchNewer: () => {
      if (query.hasNextPage) return query.fetchNextPage();
      return Promise.resolve();
    },
    isFetchingOlder: query.isFetchingPreviousPage,
    isFetchingNewer: query.isFetchingNextPage,
    olderError: query.isFetchPreviousPageError,
    newerError: query.isFetchNextPageError,
  };
}
