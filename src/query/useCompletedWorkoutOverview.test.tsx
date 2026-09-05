import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { describe, expect, it } from 'vitest';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { QueryClient } from '@tanstack/react-query';
import {
  COMPLETED_OVERVIEW_STALE_TIME,
  completedWorkoutOverviewQueryOptions,
  prefetchCompletedWorkoutOverview,
  useCompletedWorkoutMutations,
  useCompletedWorkoutOverview,
} from './useCompletedWorkoutOverview';
import { useCalendarEvents } from './useCalendarEvents';
import { queryKeys } from './keys';
import { createApiClient } from '@/api/client';
import {
  formatIsoDay,
  initialCalendarWindow,
  newerCalendarWindow,
  olderCalendarWindow,
} from '@/domain/calendarWindows';
import type { CalendarEvent, CompletedWorkoutOverview } from '@/api/types';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';

function isoDay(offset: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return formatIsoDay(d);
}

function rawCompletedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    date: `${isoDay(0)}T12:00:00.000Z`,
    name: 'W05 Easy',
    description: '',
    type: 'completed',
    category: 'easy',
    activityId: 'activity-123',
    carbsIngested: 45,
    preRunCarbsG: 25,
    rating: 'good',
    feedbackComment: 'Felt smooth',
    ...overrides,
  };
}

function rawPlannedEvent(id: string, dayOffset: number) {
  return {
    id,
    date: `${isoDay(dayOffset)}T12:00:00.000Z`,
    name: 'Planned tempo',
    description: '',
    type: 'planned',
    category: 'interval',
  };
}

function selectedEvent(): CalendarEvent {
  return {
    id: 'event-1',
    date: new Date(`${isoDay(0)}T12:00:00.000Z`),
    name: 'W05 Easy',
    description: '',
    type: 'completed',
    category: 'easy',
    activityId: 'activity-123',
    carbsIngested: 45,
    preRunCarbsG: 25,
    rating: 'good',
    feedbackComment: 'Felt smooth',
  };
}

function overviewFixture(
  preRunCarbs: CompletedWorkoutOverview['preRunCarbs'] = {
    grams: 45,
    source: 'activity',
    fallbackEventId: null,
  },
): CompletedWorkoutOverview {
  return {
    activityId: 'activity-123',
    reportCard: {
      bg: {
        rating: 'good',
        startBG: 6.8,
        minBG: 4.9,
        hypo: false,
        worstRate: -0.6,
        lbgi: 1.2,
      },
      hrZone: null,
      entryTrend: null,
      recovery: null,
    },
    splits: null,
    preRunCarbs,
  };
}

function calendarPages() {
  const initial = initialCalendarWindow();
  const older = olderCalendarWindow(initial.oldest);
  const newer = newerCalendarWindow(initial.newest);
  return { initial, older, newer };
}

function calendarHandler(
  pagesByOldest: Record<string, unknown[]>,
  counter: { gets: number },
) {
  return http.get(apiUrl('/api/intervals/calendar'), ({ request }) => {
    counter.gets += 1;
    const oldest = new URL(request.url).searchParams.get('oldest') ?? '';
    return HttpResponse.json(pagesByOldest[oldest] ?? []);
  });
}

function overviewHandler(
  fixture: CompletedWorkoutOverview,
  counter?: { gets: number },
) {
  return http.get(apiUrl('/api/intervals/activity/:id/overview'), () => {
    counter && (counter.gets += 1);
    return HttpResponse.json(fixture);
  });
}

function activityPutHandler(
  counter: { gets: number },
  onBody?: (body: Record<string, unknown>) => void,
  status = 200,
) {
  return http.put(apiUrl('/api/intervals/activity/:id'), async ({ request }) => {
    counter.gets += 1;
    const body = (await request.json()) as Record<string, unknown>;
    onBody?.(body);
    if (status !== 200) {
      return HttpResponse.json({ error: 'write failed' }, { status });
    }
    return HttpResponse.json({ ok: true });
  });
}

function OverviewProbe({ activityId = 'activity-123' }: { activityId?: string }) {
  const { data, isLoading, isError, error } = useCompletedWorkoutOverview(activityId);
  return (
    <>
      <Text>
        Overview: {isLoading ? 'loading' : data?.reportCard.bg?.rating ?? 'none'}
      </Text>
      <Text>
        Pre-run: {data?.preRunCarbs.grams ?? 'none'} (
        {data?.preRunCarbs.source ?? 'unavailable'})
      </Text>
      <Text>Overview error: {isError ? error : 'none'}</Text>
    </>
  );
}

function CalendarProbe() {
  const { events } = useCalendarEvents();
  return (
    <>
      {events.map((e) => (
        <Text key={e.id}>
          {e.id}: carbs={e.carbsIngested ?? 'none'} pre={e.preRunCarbsG ?? 'none'}{' '}
          rating={e.rating ?? 'none'} comment={e.feedbackComment ?? 'none'}
        </Text>
      ))}
    </>
  );
}

function MutationProbe({ event = selectedEvent() }: { event?: CalendarEvent }) {
  const { saveCarbs, savePreRunCarbs, saveFeedback } =
    useCompletedWorkoutMutations(event);
  return (
    <>
      <Text>Carbs pending: {saveCarbs.isPending ? 'yes' : 'no'}</Text>
      <Text>Carbs error: {saveCarbs.error?.message ?? 'none'}</Text>
      <Text>Pre-run pending: {savePreRunCarbs.isPending ? 'yes' : 'no'}</Text>
      <Text>Pre-run error: {savePreRunCarbs.error?.message ?? 'none'}</Text>
      <Text>Feedback pending: {saveFeedback.isPending ? 'yes' : 'no'}</Text>
      <Text>Feedback error: {saveFeedback.error?.message ?? 'none'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save carbs"
        onPress={() => saveCarbs.mutate(60)}
      >
        <Text>Save carbs</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save pre-run"
        onPress={() => savePreRunCarbs.mutate(30)}
      >
        <Text>Save pre-run</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save feedback"
        onPress={() => saveFeedback.mutate({ rating: 'good', comment: 'Strong finish' })}
      >
        <Text>Save feedback</Text>
      </Pressable>
    </>
  );
}

function PreRunWarningProbe() {
  const { savePreRunCarbs } = useCompletedWorkoutMutations(selectedEvent());
  const [warning, setWarning] = useState<string | null>(null);
  return (
    <>
      <Text>Cleanup warning: {warning ?? 'none'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save pre-run"
        onPress={() => {
          void savePreRunCarbs.mutateAsync(30).then((result) => {
            setWarning(result.cleanupWarning);
          });
        }}
      >
        <Text>Save pre-run</Text>
      </Pressable>
    </>
  );
}

describe('completed workout overview query', () => {
  it('loads the selected overview for a signed-in user', async () => {
    server.use(overviewHandler(overviewFixture()));

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <OverviewProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Overview: good')).toBeOnTheScreen();
    expect(screen.getByText('Pre-run: 45 (activity)')).toBeOnTheScreen();
  });

  it('stays disabled when signed out', async () => {
    const overviewGets = { gets: 0 };
    server.use(overviewHandler(overviewFixture(), overviewGets));

    await render(
      <TestAppProviders auth={makeTestAuthValue(null)}>
        <OverviewProbe />
      </TestAppProviders>,
    );

    expect(screen.getByText('Overview: none')).toBeOnTheScreen();
    expect(overviewGets.gets).toBe(0);
  });

  it('stays disabled without an activity id', async () => {
    const overviewGets = { gets: 0 };
    server.use(overviewHandler(overviewFixture(), overviewGets));

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <OverviewProbe activityId="" />
      </TestAppProviders>,
    );

    expect(screen.getByText('Overview: none')).toBeOnTheScreen();
    expect(overviewGets.gets).toBe(0);
  });

  it('prefetches completed workout overview into QueryClient cache', async () => {
    const fixture = overviewFixture();
    server.use(overviewHandler(fixture));

    const queryClient = new QueryClient();
    const client = createApiClient({
      getToken: () => 'test-token',
      onUnauthorized: () => {},
    });

    await prefetchCompletedWorkoutOverview(
      queryClient,
      client,
      'runner@example.com',
      'activity-123',
    );

    const cached = queryClient.getQueryData<CompletedWorkoutOverview>(
      queryKeys.completedWorkoutOverview('runner@example.com', 'activity-123'),
    );
    expect(cached).toEqual(fixture);
  });

  it('exposes completedWorkoutOverviewQueryOptions with 24h stale time', () => {
    const client = createApiClient({
      getToken: () => 'test-token',
      onUnauthorized: () => {},
    });

    const options = completedWorkoutOverviewQueryOptions(
      client,
      'runner@example.com',
      'activity-123',
    );

    expect(options.queryKey).toEqual(
      queryKeys.completedWorkoutOverview('runner@example.com', 'activity-123'),
    );
    expect(options.staleTime).toBe(24 * 60 * 60 * 1000);
    expect(COMPLETED_OVERVIEW_STALE_TIME).toBe(24 * 60 * 60 * 1000);
  });

  it('patches only the matching Calendar events when actual carbs are saved', async () => {
    const pages = calendarPages();
    const calendarGets = { gets: 0 };
    const putGets = { gets: 0 };
    server.use(
      calendarHandler(
        {
          [pages.initial.oldest]: [rawCompletedEvent(), rawPlannedEvent('event-2', 2)],
          [pages.older.oldest]: [
            rawCompletedEvent({
              id: 'event-3',
              name: 'Older easy',
              date: `${isoDay(-5)}T12:00:00.000Z`,
              activityId: 'activity-999',
              carbsIngested: 10,
              rating: null,
              feedbackComment: null,
            }),
            rawCompletedEvent({
              id: 'event-4',
              name: 'Twin easy',
              date: `${isoDay(-3)}T12:00:00.000Z`,
            }),
          ],
        },
        calendarGets,
      ),
      overviewHandler(overviewFixture()),
      activityPutHandler(putGets),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
        <CalendarProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText(/event-1: carbs=45/)).toBeOnTheScreen();
    await waitFor(() => expect(calendarGets.gets).toBeGreaterThanOrEqual(3));
    const calendarBaseline = calendarGets.gets;
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Save carbs'));

    await waitFor(() => {
      expect(screen.getByText(/event-1: carbs=60/)).toBeOnTheScreen();
    });
    expect(screen.getByText(/event-4: carbs=60/)).toBeOnTheScreen();
    expect(screen.getByText(/event-3: carbs=10/)).toBeOnTheScreen();
    expect(screen.getByText(/event-2: carbs=none/)).toBeOnTheScreen();
    expect(putGets.gets).toBe(1);
    expect(calendarGets.gets).toBe(calendarBaseline);
  });

  it('patches rating and comment only when feedback is saved', async () => {
    const pages = calendarPages();
    const calendarGets = { gets: 0 };
    const posted: Record<string, unknown>[] = [];
    server.use(
      calendarHandler(
        {
          [pages.initial.oldest]: [rawCompletedEvent()],
        },
        calendarGets,
      ),
      overviewHandler(overviewFixture()),
      http.post(apiUrl('/api/run-feedback'), async ({ request }) => {
        posted.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true });
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
        <CalendarProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText(/event-1: carbs=45 pre=25 rating=good/)).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Save feedback'));

    await waitFor(() => {
      expect(
        screen.getByText(/event-1: carbs=45 pre=25 rating=good comment=Strong finish/),
      ).toBeOnTheScreen();
    });
    expect(posted[0]).toEqual({
      activityId: 'activity-123',
      rating: 'good',
      comment: 'Strong finish',
    });
  });

  it('patches Calendar and Overview pre-run state after the activity write, then cleans the fallback row', async () => {
    const pages = calendarPages();
    const calendarGets = { gets: 0 };
    const putGets = { gets: 0 };
    const putBodies: Record<string, unknown>[] = [];
    const deletedEventIds: string[] = [];
    server.use(
      calendarHandler(
        {
          [pages.initial.oldest]: [rawCompletedEvent()],
        },
        calendarGets,
      ),
      overviewHandler(
        overviewFixture({ grams: 20, source: 'paired-event', fallbackEventId: 101 }),
      ),
      activityPutHandler(putGets, (body) => putBodies.push(body)),
      http.delete(apiUrl('/api/prerun-carbs'), ({ request }) => {
        const url = new URL(request.url);
        deletedEventIds.push(url.searchParams.get('eventId') ?? '');
        return HttpResponse.json({ ok: true });
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
        <CalendarProbe />
        <OverviewProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Pre-run: 20 (paired-event)')).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Save pre-run'));

    await waitFor(() => {
      expect(screen.getByText(/event-1: carbs=45 pre=30/)).toBeOnTheScreen();
    });
    expect(screen.getByText('Pre-run: 30 (activity)')).toBeOnTheScreen();
    expect(putBodies[0]).toEqual({ PreRunCarbsG: 30 });
    expect(deletedEventIds).toEqual(['101']);
  });

  it('keeps both caches untouched and surfaces the error when the activity write fails', async () => {
    const pages = calendarPages();
    const calendarGets = { gets: 0 };
    const putGets = { gets: 0 };
    const deletedEventIds: string[] = [];
    server.use(
      calendarHandler(
        {
          [pages.initial.oldest]: [rawCompletedEvent()],
        },
        calendarGets,
      ),
      overviewHandler(
        overviewFixture({ grams: 20, source: 'paired-event', fallbackEventId: 101 }),
      ),
      activityPutHandler(putGets, undefined, 500),
      http.delete(apiUrl('/api/prerun-carbs'), ({ request }) => {
        const url = new URL(request.url);
        deletedEventIds.push(url.searchParams.get('eventId') ?? '');
        return HttpResponse.json({ ok: true });
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
        <CalendarProbe />
        <OverviewProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText(/event-1: carbs=45 pre=25/)).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Save pre-run'));

    await waitFor(() => {
      expect(screen.getByText('Pre-run error: write failed')).toBeOnTheScreen();
    });
    expect(screen.getByText(/event-1: carbs=45 pre=25/)).toBeOnTheScreen();
    expect(screen.getByText('Pre-run: 20 (paired-event)')).toBeOnTheScreen();
    expect(putGets.gets).toBe(1);
    expect(deletedEventIds).toEqual([]);
  });

  it('patches confirmed activity state and exposes a cleanup warning when fallback cleanup fails', async () => {
    const pages = calendarPages();
    const calendarGets = { gets: 0 };
    const putGets = { gets: 0 };
    server.use(
      calendarHandler(
        {
          [pages.initial.oldest]: [rawCompletedEvent()],
        },
        calendarGets,
      ),
      overviewHandler(
        overviewFixture({ grams: 20, source: 'paired-event', fallbackEventId: 101 }),
      ),
      activityPutHandler(putGets),
      http.delete(apiUrl('/api/prerun-carbs'), () =>
        HttpResponse.json({ error: 'cleanup failed' }, { status: 500 }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <PreRunWarningProbe />
        <CalendarProbe />
        <OverviewProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText(/event-1: carbs=45 pre=25/)).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Save pre-run'));

    await waitFor(() => {
      expect(screen.getByText(/Cleanup warning: Pre-run saved/)).toBeOnTheScreen();
    });
    expect(screen.getByText(/event-1: carbs=45 pre=30/)).toBeOnTheScreen();
    expect(screen.getByText('Pre-run: 30 (activity)')).toBeOnTheScreen();
    expect(putGets.gets).toBe(1);
  });

  it('blocks a duplicate mutation while one is pending', async () => {
    const pages = calendarPages();
    const calendarGets = { gets: 0 };
    const putGets = { gets: 0 };
    let releasePut: (() => void) | null = null;
    server.use(
      calendarHandler(
        {
          [pages.initial.oldest]: [rawCompletedEvent()],
        },
        calendarGets,
      ),
      overviewHandler(overviewFixture()),
      http.put(apiUrl('/api/intervals/activity/:id'), async () => {
        putGets.gets += 1;
        await new Promise<void>((resolve) => { releasePut = resolve; });
        return HttpResponse.json({ ok: true });
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
        <CalendarProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText(/event-1: carbs=45/)).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Save carbs'));
    await waitFor(() => expect(putGets.gets).toBe(1));
    expect(screen.getByText('Carbs pending: yes')).toBeOnTheScreen();

    await user.press(screen.getByLabelText('Save carbs'));
    await waitFor(() => {
      expect(screen.getByText('Carbs error: Save already in progress')).toBeOnTheScreen();
    });
    expect(putGets.gets).toBe(1);

    releasePut!();
    await waitFor(() => {
      expect(screen.getByText(/event-1: carbs=60/)).toBeOnTheScreen();
    });
    expect(putGets.gets).toBe(1);
    expect(screen.getByText('Carbs pending: no')).toBeOnTheScreen();
  });
});
