import { useInfiniteQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import {
  initialCalendarWindow,
  newerCalendarWindow,
  olderCalendarWindow,
  type DateWindow,
} from '@/domain/calendarWindows';
import { mergeCalendarEvents } from '@/domain/mergeCalendarEvents';
import { queryKeys } from './keys';
import { useSettingsQuery } from './useSettingsQuery';

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
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length === 0 ? undefined : newerCalendarWindow(lastPageParam.newest),
    getPreviousPageParam: (firstPage, _pages, firstPageParam) =>
      firstPage.length === 0 ? undefined : olderCalendarWindow(firstPageParam.oldest),
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
