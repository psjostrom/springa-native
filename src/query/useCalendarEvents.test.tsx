import { useEffect } from 'react';
import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
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

    // Background warming triggers newer upcoming horizon before older history
    await waitFor(() => {
      expect(screen.getByText('newer-event')).toBeOnTheScreen();
      expect(screen.getByText('older-event')).toBeOnTheScreen();
    });

    expect(requestedWindows[0]).toEqual(expect.objectContaining({ oldest: initWin.oldest }));
    expect(requestedWindows[1]).toEqual(expect.objectContaining({ oldest: newerWin.oldest }));
    expect(requestedWindows[2]).toEqual(expect.objectContaining({ oldest: olderWin.oldest }));
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

  it('terminates warming loop and resets warmed state if fetchNextPage fails', async () => {
    const session = makeTestSession();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });

    const oldPage0 = { oldest: '2026-08-01', newest: '2026-08-12' };
    const oldPage1 = { oldest: '2026-08-13', newest: '2026-08-24' };

    queryClient.setQueryData(queryKeys.calendar(session.email), {
      pageParams: [oldPage0, oldPage1],
      pages: [
        [{ id: 'old-1', date: '2026-08-05T12:00:00.000Z', name: 'Old 1', type: 'completed' }],
        [{ id: 'old-2', date: '2026-08-15T12:00:00.000Z', name: 'Old 2', type: 'completed' }],
      ],
    });

    let previousCalls = 0;
    let newerCalls = 0;
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), ({ request }) => {
        const url = new URL(request.url);
        const oldest = url.searchParams.get('oldest') ?? '';
        if (oldest < oldPage0.oldest) {
          previousCalls++;
          return HttpResponse.json([]);
        }
        newerCalls++;
        return HttpResponse.json({ error: 'failed' }, { status: 500 });
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

    expect(await screen.findByText('old-1')).toBeOnTheScreen();
    await waitFor(() => {
      expect(newerCalls).toBe(1);
      expect(previousCalls).toBe(0);
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(newerCalls).toBe(1);
    expect(previousCalls).toBe(0);
  });

  it('deduplicates concurrent fetchNewer calls to avoid dropping in-flight fetches', async () => {
    const session = makeTestSession('runner@example.com');
    const initWin = initialCalendarWindow();
    let newerRequests = 0;
    let resolveNewer: (() => void) | null = null;

    server.use(
      http.get(apiUrl('/api/intervals/calendar'), async ({ request }) => {
        const url = new URL(request.url);
        const oldest = url.searchParams.get('oldest') ?? '';
        if (oldest === initWin.oldest) {
          return HttpResponse.json([
            { id: 'init-event', date: new Date().toISOString(), name: 'Today Run', type: 'planned' },
          ]);
        }
        if (oldest > initWin.oldest) {
          newerRequests++;
          await new Promise<void>((resolve) => {
            resolveNewer = resolve;
          });
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

    let captured: ReturnType<typeof useCalendarEvents> | null = null;
    function Probe() {
      const api = useCalendarEvents();
      useEffect(() => {
        captured = api;
      }, [api]);
      return <Text>{api.events.length}</Text>;
    }

    await render(
      <TestAppProviders auth={makeTestAuthValue(session)}>
        <Probe />
      </TestAppProviders>,
    );

    await waitFor(() => {
      expect(captured).not.toBeNull();
      expect(captured!.isLoading).toBe(false);
      expect(newerRequests).toBe(1);
    });

    // While initial newer request is still in flight, burst concurrent calls
    const p1 = captured!.fetchNewer();
    const p2 = captured!.fetchNewer();

    resolveNewer!();
    await act(async () => {
      await Promise.all([p1, p2]);
    });

    expect(newerRequests).toBe(1);
  });

  it('shares warming and in-flight fetch deduplication across concurrent subscribers', async () => {
    const session = makeTestSession('runner@example.com');
    const initWin = initialCalendarWindow();
    let newerRequests = 0;
    let resolveNewer: (() => void) | null = null;

    server.use(
      http.get(apiUrl('/api/intervals/calendar'), async ({ request }) => {
        const url = new URL(request.url);
        const oldest = url.searchParams.get('oldest') ?? '';
        if (oldest === initWin.oldest) {
          return HttpResponse.json([
            { id: 'init-event', date: new Date().toISOString(), name: 'Today Run', type: 'planned' },
          ]);
        }
        if (oldest > initWin.oldest) {
          newerRequests++;
          await new Promise<void>((resolve) => {
            resolveNewer = resolve;
          });
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

    let sub1: ReturnType<typeof useCalendarEvents> | null = null;
    let sub2: ReturnType<typeof useCalendarEvents> | null = null;

    function Subscriber1() {
      const api = useCalendarEvents();
      useEffect(() => {
        sub1 = api;
      }, [api]);
      return <Text testID="sub1">{api.events.length}</Text>;
    }

    function Subscriber2() {
      const api = useCalendarEvents();
      useEffect(() => {
        sub2 = api;
      }, [api]);
      return <Text testID="sub2">{api.events.length}</Text>;
    }

    await render(
      <TestAppProviders auth={makeTestAuthValue(session)}>
        <Subscriber1 />
        <Subscriber2 />
      </TestAppProviders>,
    );

    await waitFor(() => {
      expect(sub1).not.toBeNull();
      expect(sub2).not.toBeNull();
      expect(sub1!.isLoading).toBe(false);
      expect(sub2!.isLoading).toBe(false);
      expect(newerRequests).toBe(1);
    });

    // Both subscribers calling fetchNewer simultaneously share the same in-flight fetch
    const p1 = sub1!.fetchNewer();
    const p2 = sub2!.fetchNewer();

    resolveNewer!();
    await act(async () => {
      await Promise.all([p1, p2]);
    });

    expect(newerRequests).toBe(1);
  });

  it('cleans up warming state if unmounted before completion so later mounts can warm', async () => {
    const session = makeTestSession('runner@example.com');
    const initWin = initialCalendarWindow();
    let warmingAttempts = 0;
    let resolveWarming: (() => void) | null = null;

    server.use(
      http.get(apiUrl('/api/intervals/calendar'), async ({ request }) => {
        const url = new URL(request.url);
        const oldest = url.searchParams.get('oldest') ?? '';
        if (oldest === initWin.oldest) {
          return HttpResponse.json([
            { id: 'init-event', date: new Date().toISOString(), name: 'Today Run', type: 'planned' },
          ]);
        }
        warmingAttempts++;
        await new Promise<void>((resolve) => {
          resolveWarming = resolve;
        });
        return HttpResponse.json([]);
      }),
      http.get(apiUrl('/api/intervals/settings'), () =>
        HttpResponse.json({ intervalsConnected: true }),
      ),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });

    function Probe() {
      const api = useCalendarEvents();
      return <Text>{api.events.length}</Text>;
    }

    const { unmount } = await render(
      <TestAppProviders auth={makeTestAuthValue(session)} queryClient={queryClient}>
        <Probe />
      </TestAppProviders>,
    );

    await waitFor(() => {
      expect(warmingAttempts).toBe(1);
    });

    // Unmount before warming completes
    unmount();
    resolveWarming!();

    // Remount on the same QueryClient — warming state was cleared on abort, so it warms again
    await render(
      <TestAppProviders auth={makeTestAuthValue(session)} queryClient={queryClient}>
        <Probe />
      </TestAppProviders>,
    );

    await waitFor(() => {
      expect(warmingAttempts).toBe(2);
    });
    resolveWarming!();
  });
});
