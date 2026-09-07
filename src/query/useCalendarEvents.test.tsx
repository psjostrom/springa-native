import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { useCalendarEvents } from './useCalendarEvents';
import { queryKeys } from './keys';
import {
  initialCalendarWindow,
  olderCalendarWindow,
  newerCalendarWindow,
} from '@/domain/calendarWindows';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';

function CalendarProbe() {
  const { events, isLoading, isError, hasOlder, hasNewer } = useCalendarEvents();
  return (
    <>
      <Text>Loading: {isLoading ? 'yes' : 'no'}</Text>
      <Text>Error: {isError ? 'yes' : 'no'}</Text>
      <Text>Count: {events.length}</Text>
      <Text>HasOlder: {hasOlder ? 'yes' : 'no'}</Text>
      <Text>HasNewer: {hasNewer ? 'yes' : 'no'}</Text>
      {events.map((e) => (
        <Text key={e.id}>{e.id}</Text>
      ))}
    </>
  );
}

describe('useCalendarEvents', () => {
  it('automatically warms older and newer windows in background on initial mount', async () => {
    const session = makeTestSession('runner@example.com');
    const requestedWindows: { oldest: string; newest: string }[] = [];

    const initWin = initialCalendarWindow();
    const olderWin = olderCalendarWindow(initWin.oldest);
    const newerWin = newerCalendarWindow(initWin.newest);

    server.use(
      http.get(apiUrl('/api/intervals/calendar'), ({ request }) => {
        const url = new URL(request.url);
        const oldest = url.searchParams.get('oldest') ?? '';
        const newest = url.searchParams.get('newest') ?? '';
        requestedWindows.push({ oldest, newest });

        if (oldest === initWin.oldest) {
          return HttpResponse.json([
            { id: 'init-event', date: new Date().toISOString(), name: 'Today Run', type: 'planned' },
          ]);
        }
        if (oldest === olderWin.oldest) {
          return HttpResponse.json([
            { id: 'older-event', date: new Date(Date.now() - 86400000 * 5).toISOString(), name: 'Past Run', type: 'completed' },
          ]);
        }
        if (oldest === newerWin.oldest) {
          return HttpResponse.json([
            { id: 'newer-event', date: new Date(Date.now() + 86400000 * 5).toISOString(), name: 'Future Run', type: 'planned' },
          ]);
        }
        return HttpResponse.json([]);
      }),
      http.get(apiUrl('/api/intervals/settings'), () =>
        HttpResponse.json({ intervalsConnected: true }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(session)}>
        <CalendarProbe />
      </TestAppProviders>,
    );

    // Initial event paints first
    expect(await screen.findByText('init-event')).toBeOnTheScreen();

    // Dual-horizon background warming triggers older then newer
    await waitFor(() => {
      expect(screen.getByText('older-event')).toBeOnTheScreen();
      expect(screen.getByText('newer-event')).toBeOnTheScreen();
    });

    expect(requestedWindows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ oldest: initWin.oldest }),
        expect.objectContaining({ oldest: olderWin.oldest }),
        expect.objectContaining({ oldest: newerWin.oldest }),
      ]),
    );
  });

  it('bypasses background warming when mounted with rehydrated multi-page cache', async () => {
    const session = makeTestSession('runner@example.com');
    const requestedWindows: { oldest: string; newest: string }[] = [];

    const initWin = initialCalendarWindow();
    const olderWin = olderCalendarWindow(initWin.oldest);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });

    // Seed pre-existing multi-page cache (pages.length === 2)
    queryClient.setQueryData(queryKeys.calendar(session.email), {
      pageParams: [initWin, olderWin],
      pages: [
        [{ id: 'cached-init', date: new Date().toISOString(), name: 'Cached Init', type: 'planned' }],
        [{ id: 'cached-older', date: new Date(Date.now() - 86400000 * 5).toISOString(), name: 'Cached Older', type: 'completed' }],
      ],
    });

    server.use(
      http.get(apiUrl('/api/intervals/calendar'), ({ request }) => {
        const url = new URL(request.url);
        requestedWindows.push({
          oldest: url.searchParams.get('oldest') ?? '',
          newest: url.searchParams.get('newest') ?? '',
        });
        return HttpResponse.json([]);
      }),
      http.get(apiUrl('/api/intervals/settings'), () =>
        HttpResponse.json({ intervalsConnected: true }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(session)} queryClient={queryClient}>
        <CalendarProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('cached-init')).toBeOnTheScreen();
    expect(screen.getByText('cached-older')).toBeOnTheScreen();

    // Background warming must NOT fire because pageCount > 1
    expect(requestedWindows).toHaveLength(0);
  });

  it('preserves initial events rendered when background warming encounters an error', async () => {
    const session = makeTestSession('runner@example.com');
    const initWin = initialCalendarWindow();

    server.use(
      http.get(apiUrl('/api/intervals/calendar'), ({ request }) => {
        const url = new URL(request.url);
        const oldest = url.searchParams.get('oldest') ?? '';
        if (oldest === initWin.oldest) {
          return HttpResponse.json([
            { id: 'init-event', date: new Date().toISOString(), name: 'Today Run', type: 'planned' },
          ]);
        }
        // Older/newer background fetches fail
        return new HttpResponse(null, { status: 500 });
      }),
      http.get(apiUrl('/api/intervals/settings'), () =>
        HttpResponse.json({ intervalsConnected: true }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(session)}>
        <CalendarProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('init-event')).toBeOnTheScreen();
    expect(screen.getByText('Count: 1')).toBeOnTheScreen();
  });

  it('advances calendar cache when rehydrated multi-page cache is behind today', async () => {
    const session = makeTestSession('runner@example.com');
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });

    // Stale multi-page cache from 20 days ago (both pages ended before today)
    const oldPage0 = { oldest: '2026-08-01', newest: '2026-08-12' };
    const oldPage1 = { oldest: '2026-08-13', newest: '2026-08-24' };

    queryClient.setQueryData(queryKeys.calendar(session.email), {
      pageParams: [oldPage0, oldPage1],
      pages: [
        [{ id: 'old-1', date: '2026-08-05T12:00:00.000Z', name: 'Old 1', type: 'completed' }],
        [{ id: 'old-2', date: '2026-08-15T12:00:00.000Z', name: 'Old 2', type: 'completed' }],
      ],
    });

    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () =>
        HttpResponse.json([
          { id: 'fresh-today', date: new Date().toISOString(), name: 'Fresh Run', type: 'planned' },
        ]),
      ),
      http.get(apiUrl('/api/intervals/settings'), () =>
        HttpResponse.json({ intervalsConnected: true }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(session)} queryClient={queryClient}>
        <CalendarProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('old-1')).toBeOnTheScreen();
    // Cache was behind today, so background warming advanced to fetch fresh events
    await waitFor(() => {
      expect(screen.getByText('fresh-today')).toBeOnTheScreen();
    });
  });
});
