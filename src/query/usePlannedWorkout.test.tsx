import { Pressable, Text } from 'react-native';
import { QueryClient, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import {
  PLANNED_WORKOUT_STALE_TIME,
  plannedWorkoutQueryOptions,
  prefetchPlannedWorkoutDetail,
  usePlannedWorkoutDetail,
  usePlannedWorkoutMutations,
} from './usePlannedWorkout';
import { createApiClient } from '@/api/client';
import { useCalendarEvents } from './useCalendarEvents';
import { queryKeys } from './keys';
import type { DateWindow } from '@/domain/calendarWindows';
import type { CalendarEvent, PlannedWorkoutDetail } from '@/api/types';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';

function detail(name: string, eventId = 'event-123'): PlannedWorkoutDetail {
  return {
    effortMetric: 'pace' as const,
    heartRateMetricAvailable: false,
    event: {
      id: eventId,
      intervalsEventId: Number(eventId.replace('event-', '')),
      startDateLocal: '2026-08-13T12:00:00',
      name,
      category: 'easy',
      description: '',
    },
    replacementCategory: 'easy',
    structure: { sections: [], timeline: [] },
    metrics: {
      duration: null,
      distance: null,
      fuelRateGPerHour: null,
      prescribedCarbsG: null,
    },
    preRunCarbsG: null,
    clothing: { status: 'unavailable', reason: 'outside-window' },
  };
}

function DetailProbe() {
  const { data } = usePlannedWorkoutDetail('event-123');
  return <Text>{data?.event.name ?? 'loading'}</Text>;
}

function DetailStateProbe() {
  const { isDisabled, isError } = usePlannedWorkoutDetail('event-123');
  return <Text>{isDisabled ? 'disabled' : isError ? 'error' : 'enabled'}</Text>;
}

function MutationProbe({ moveTo = '2026-08-14T15:30:00' }: { moveTo?: string }) {
  const { data } = usePlannedWorkoutDetail('event-123');
  const { move, replace, savePreRunCarbs, deleteWorkout } =
    usePlannedWorkoutMutations('event-123');
  return (
    <>
      <Text>Workout: {data?.event.name ?? 'loading'}</Text>
      <Text>Carbs: {data?.preRunCarbsG ?? 'none'}</Text>
      <Text>Starts: {data?.event.startDateLocal ?? 'loading'}</Text>
      <Text>Move pending: {move.isPending ? 'yes' : 'no'}</Text>
      <Text>Move success: {move.isSuccess ? 'yes' : 'no'}</Text>
      <Text>Delete pending: {deleteWorkout.isPending ? 'yes' : 'no'}</Text>
      <Text>Delete error: {deleteWorkout.error?.message ?? 'none'}</Text>
      <Text>Carbs error: {savePreRunCarbs.error?.message ?? 'none'}</Text>
      <Text>Replacement error: {replace.isError ? 'yes' : 'no'}</Text>
      <Text>
        Replacement error message: {replace.error instanceof Error ? replace.error.message : 'none'}
      </Text>
      <Text>Replacement result: {replace.data?.detail.event.name ?? 'none'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Move workout"
        onPress={() => move.mutate(moveTo)}
      >
        <Text>Move</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Replace with long"
        onPress={() => replace.mutate('long')}
      >
        <Text>Replace long</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Replace workout"
        onPress={() => replace.mutate('quality')}
      >
        <Text>Replace</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save pre-run carbs"
        onPress={() => savePreRunCarbs.mutate(30)}
      >
        <Text>Save carbs</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete workout"
        onPress={() => deleteWorkout.mutate()}
      >
        <Text>Delete</Text>
      </Pressable>
    </>
  );
}

function CalendarProbe() {
  const { events } = useCalendarEvents();
  const event = events[0];
  return (
    <>
      <Text>Calendar: {event?.name ?? 'loading'}</Text>
      <Text>CalendarCarbs: {event?.preRunCarbsG ?? 'none'}</Text>
    </>
  );
}

function ReplacementCacheProbe() {
  const { events } = useCalendarEvents();
  const queryClient = useQueryClient();
  const originalDetail = queryClient.getQueryData<PlannedWorkoutDetail>(
    queryKeys.plannedWorkout('runner@example.com', 'event-123'),
  );
  const replacementDetail = queryClient.getQueryData<PlannedWorkoutDetail>(
    queryKeys.plannedWorkout('runner@example.com', '456'),
  );

  return (
    <>
      <Text testID="replacement-calendar-cache">{JSON.stringify(events)}</Text>
      <Text testID="original-detail-cache">{JSON.stringify(originalDetail)}</Text>
      <Text testID="replacement-detail-cache">{JSON.stringify(replacementDetail)}</Text>
    </>
  );
}

function EffortMetricProbe() {
  const { data } = usePlannedWorkoutDetail('event-123');
  useCalendarEvents();
  const { changeEffortMetric } = usePlannedWorkoutMutations('event-123');
  const queryClient = useQueryClient();
  const detailCache = queryClient.getQueryData<PlannedWorkoutDetail>(
    queryKeys.plannedWorkout('runner@example.com', 'event-123'),
  );
  const calendarCache = queryClient.getQueryData<InfiniteData<CalendarEvent[]>>(
    queryKeys.calendar('runner@example.com'),
  );

  return (
    <>
      <Text>Workout name: {data?.event.name ?? 'loading'}</Text>
      <Text>Workout description: {data?.event.description ?? 'loading'}</Text>
      <Text>Workout metric: {data?.effortMetric ?? 'loading'}</Text>
      <Text>Effort error: {changeEffortMetric?.isError ? 'yes' : 'no'}</Text>
      <Text testID="detail-cache">{JSON.stringify(detailCache)}</Text>
      <Text testID="calendar-cache">{JSON.stringify(calendarCache)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change effort to heart rate"
        onPress={() => {
          const mutation = changeEffortMetric?.mutateAsync('hr');
          if (mutation) void mutation.catch(() => {});
        }}
      >
        <Text>Change effort</Text>
      </Pressable>
    </>
  );
}

function staleCalendarEvent(): CalendarEvent {
  return {
    id: 'event-123',
    date: new Date('2026-08-13T12:00:00.000Z'),
    name: 'Pace calendar name',
    description: 'Pace calendar description',
    type: 'planned',
    category: 'easy',
    duration: 3000,
    distance: 8000,
    fuelRate: 40,
    prescribedCarbsG: 40,
  };
}

function returnedHeartRateDetail(): PlannedWorkoutDetail {
  return {
    ...detail('HR workout name'),
    effortMetric: 'hr',
    heartRateMetricAvailable: true,
    event: {
      ...detail('HR workout name').event,
      description: 'HR workout description',
    },
    metrics: {
      duration: { minutes: 75, estimated: false },
      distance: { km: 12.4, estimated: true },
      fuelRateGPerHour: 72,
      prescribedCarbsG: 90,
    },
  };
}

function readCache(testID: string): string {
  return String(screen.getByTestId(testID).props.children ?? '');
}

describe('planned workout query hooks', () => {
  it.each(['2026-08-30', '2026-12-10', '2026-06-10'])('keeps a move to %s visible after a calendar refresh', async (day) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-13T12:00:00'));
    let date = '2026-08-13T12:00:00';
    const queryClient = new QueryClient();
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () => HttpResponse.json(detail('Move me'))),
      http.get(apiUrl('/api/intervals/calendar'), ({ request }) => {
        const params = new URL(request.url).searchParams;
        const inWindow = params.get('oldest')! <= date.slice(0, 10) && params.get('newest')! >= date.slice(0, 10);
        return HttpResponse.json(inWindow ? [{ ...staleCalendarEvent(), date }] : []);
      }),
      http.put(apiUrl('/api/intervals/events/event-123'), async ({ request }) => {
        date = ((await request.json()) as { start_date_local: string }).start_date_local;
        return HttpResponse.json({ ok: true });
      }),
    );
    try {
      await render(<TestAppProviders auth={makeTestAuthValue(makeTestSession())} queryClient={queryClient}>
        <MutationProbe moveTo={`${day}T15:30:00`} /><CalendarProbe />
      </TestAppProviders>);
      await screen.findByText('Calendar: Pace calendar name');
      await userEvent.setup().press(screen.getByLabelText('Move workout'));
      await screen.findByText(`Starts: ${day}T15:30:00`);
      await screen.findByText('Move success: yes');
      expect(date).toBe(`${day}T15:30:00`);
      await waitFor(() => {
        const cached = queryClient.getQueryData<InfiniteData<CalendarEvent[], DateWindow>>(queryKeys.calendar('runner@example.com'));
        expect(cached?.pageParams.some((window) => window.oldest <= day && window.newest >= day)).toBe(true);
      });
      await act(async () => { await queryClient.refetchQueries({ queryKey: queryKeys.calendar('runner@example.com') }); });
      expect(screen.getByText('Calendar: Pace calendar name')).toBeOnTheScreen();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([true, false])('hides pending deletion, survives refresh, and reconciles success=%s', async (success) => {
    let finish!: () => void;
    const response = new Promise<void>((resolve) => { finish = resolve; });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const calendarKey = queryKeys.calendar('runner@example.com');
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () => HttpResponse.json(detail('Delete me'))),
      http.get(apiUrl('/api/intervals/calendar'), () => HttpResponse.json([staleCalendarEvent()])),
      http.delete(apiUrl('/api/intervals/events/event-123'), async () => {
        await response;
        return success ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ error: 'delete failed' }, { status: 502 });
      }),
    );
    await render(<TestAppProviders auth={makeTestAuthValue(makeTestSession())} queryClient={queryClient}>
      <MutationProbe /><CalendarProbe />
    </TestAppProviders>);
    const user = userEvent.setup();
    await screen.findByText('Calendar: Pace calendar name');
    await user.press(screen.getByLabelText('Delete workout'));
    try {
      await screen.findByText('Delete pending: yes');
      expect(screen.queryByText('Calendar: Pace calendar name')).toBeNull();
      await act(async () => { await queryClient.refetchQueries({ queryKey: calendarKey }); });
      expect(screen.queryByText('Calendar: Pace calendar name')).toBeNull();
      // Only confirmed server data belongs in the persisted query cache.
      expect(queryClient.getQueryData<InfiniteData<CalendarEvent[]>>(calendarKey)?.pages.flat()).not.toHaveLength(0);
    } finally {
      await act(async () => finish());
    }
    await screen.findByText('Delete pending: no');
    if (success) {
      expect(screen.queryByText('Calendar: Pace calendar name')).toBeNull();
      expect(queryClient.getQueryData<InfiniteData<CalendarEvent[]>>(calendarKey)?.pages.flat()).toHaveLength(0);
    } else {
      expect(await screen.findByText('Calendar: Pace calendar name')).toBeOnTheScreen();
      expect(screen.getByText('Delete error: delete failed')).toBeOnTheScreen();
    }
  });

  it('rolls back a failed move without losing concurrently saved carbs', async () => {
    let finish!: () => void;
    const response = new Promise<void>((resolve) => { finish = resolve; });
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () => HttpResponse.json(detail('Move me'))),
      http.get(apiUrl('/api/intervals/calendar'), () => HttpResponse.json([staleCalendarEvent()])),
      http.put(apiUrl('/api/intervals/events/event-123'), async () => {
        await response;
        return HttpResponse.json({ error: 'move failed' }, { status: 502 });
      }),
      http.post(apiUrl('/api/prerun-carbs'), () => HttpResponse.json({ ok: true })),
    );
    await render(<TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
      <MutationProbe /><CalendarProbe />
    </TestAppProviders>);
    const user = userEvent.setup();
    await screen.findByText('Starts: 2026-08-13T12:00:00');
    await user.press(screen.getByLabelText('Move workout'));
    await screen.findByText('Starts: 2026-08-14T15:30:00');
    await user.press(screen.getByLabelText('Save pre-run carbs'));
    await screen.findByText('CalendarCarbs: 30');
    await act(async () => finish());
    await screen.findByText('Starts: 2026-08-13T12:00:00');
    expect(screen.getByText('Carbs: 30')).toBeOnTheScreen();
    expect(screen.getByText('CalendarCarbs: 30')).toBeOnTheScreen();
  });

  it('shows pre-run carbs before the response and restores them on failure', async () => {
    let finish!: () => void;
    const response = new Promise<void>((resolve) => { finish = resolve; });
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () => HttpResponse.json(detail('Carbs'))),
      http.get(apiUrl('/api/intervals/calendar'), () => HttpResponse.json([staleCalendarEvent()])),
      http.post(apiUrl('/api/prerun-carbs'), async () => {
        await response;
        return HttpResponse.json({ error: 'carbs failed' }, { status: 502 });
      }),
    );
    await render(<TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
      <MutationProbe /><CalendarProbe />
    </TestAppProviders>);
    await screen.findByText('Workout: Carbs');
    await userEvent.setup().press(screen.getByLabelText('Save pre-run carbs'));
    try {
      expect(await screen.findByText('Carbs: 30')).toBeOnTheScreen();
      expect(screen.getByText('CalendarCarbs: 30')).toBeOnTheScreen();
    } finally {
      await act(async () => finish());
    }
    await screen.findByText('Carbs error: carbs failed');
    expect(screen.getByText('Carbs: none')).toBeOnTheScreen();
    expect(screen.getByText('CalendarCarbs: none')).toBeOnTheScreen();
  });

  it('reports disabled detail queries separately from errors', async () => {
    await render(
      <TestAppProviders auth={makeTestAuthValue(null)}>
        <DetailStateProbe />
      </TestAppProviders>,
    );

    expect(screen.getByText('disabled')).toBeOnTheScreen();
  });

  it('loads planned detail for a signed-in user', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () =>
        HttpResponse.json(detail('W05 Easy')),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <DetailProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('W05 Easy')).toBeOnTheScreen();
  });

  it('atomically publishes returned effort detail to every cached Calendar page', async () => {
    let detailGets = 0;
    let calendarGets = 0;
    const paceDetail = detail('Pace workout name');
    const heartRateDetail = returnedHeartRateDetail();
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), () => {
        detailGets += 1;
        return HttpResponse.json(paceDetail);
      }),
      http.get(apiUrl('/api/intervals/calendar'), () => {
        calendarGets += 1;
        return HttpResponse.json([staleCalendarEvent()]);
      }),
      http.put(apiUrl('/api/intervals/events/event-123'), async ({ request }) => {
        expect(await request.json()).toEqual({ effortMetric: 'hr' });
        return HttpResponse.json(heartRateDetail);
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <EffortMetricProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Workout metric: pace')).toBeOnTheScreen();
    await waitFor(() => {
      const cache = JSON.parse(readCache('calendar-cache')) as InfiniteData<CalendarEvent[]>;
      expect(cache.pages).toHaveLength(3);
    });
    const calendarBaseline = calendarGets;

    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Change effort to heart rate'));

    expect(await screen.findByText('Workout metric: hr')).toBeOnTheScreen();
    expect(screen.getByText('Workout name: HR workout name')).toBeOnTheScreen();
    expect(screen.getByText('Workout description: HR workout description')).toBeOnTheScreen();
    expect(detailGets).toBe(1);
    expect(calendarGets).toBe(calendarBaseline);

    const updatedDetail = JSON.parse(readCache('detail-cache')) as PlannedWorkoutDetail;
    expect(updatedDetail).toMatchObject({
      effortMetric: 'hr',
      event: {
        name: 'HR workout name',
        description: 'HR workout description',
      },
      metrics: {
        duration: { minutes: 75, estimated: false },
        distance: { km: 12.4, estimated: true },
        fuelRateGPerHour: 72,
        prescribedCarbsG: 90,
      },
    });

    const updatedCalendar = JSON.parse(readCache('calendar-cache')) as InfiniteData<CalendarEvent[]>;
    const events = updatedCalendar.pages.flat();
    expect(events).toHaveLength(3);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'HR workout name',
          description: 'HR workout description',
          duration: 4500,
          distance: 12400,
          fuelRate: 72,
          prescribedCarbsG: 90,
        }),
      ]),
    );
    for (const event of events) {
      expect(event).toMatchObject({
        name: 'HR workout name',
        description: 'HR workout description',
        duration: 4500,
        distance: 12400,
        fuelRate: 72,
        prescribedCarbsG: 90,
      });
    }
  });

  it('leaves detail and every cached Calendar page unchanged when effort update fails', async () => {
    let detailGets = 0;
    let calendarGets = 0;
    const paceDetail = detail('Pace workout name');
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), () => {
        detailGets += 1;
        return HttpResponse.json(paceDetail);
      }),
      http.get(apiUrl('/api/intervals/calendar'), () => {
        calendarGets += 1;
        return HttpResponse.json([staleCalendarEvent()]);
      }),
      http.put(apiUrl('/api/intervals/events/event-123'), () =>
        HttpResponse.json(
          { error: 'Plan settings required', code: 'PLAN_SETTINGS_REQUIRED' },
          { status: 422 },
        ),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <EffortMetricProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Workout metric: pace')).toBeOnTheScreen();
    await waitFor(() => {
      const cache = JSON.parse(readCache('calendar-cache')) as InfiniteData<CalendarEvent[]>;
      expect(cache.pages).toHaveLength(3);
    });
    const detailBefore = readCache('detail-cache');
    const calendarBefore = readCache('calendar-cache');
    const detailGetsBefore = detailGets;
    const calendarGetsBefore = calendarGets;

    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Change effort to heart rate'));

    expect(await screen.findByText('Effort error: yes')).toBeOnTheScreen();
    expect(readCache('detail-cache')).toBe(detailBefore);
    expect(readCache('calendar-cache')).toBe(calendarBefore);
    expect(detailGets).toBe(detailGetsBefore);
    expect(calendarGets).toBe(calendarGetsBefore);
  });

  it('moves replacement detail and Calendar identity to the returned event ID', async () => {
    let currentName = 'Before replacement';
    const detailRequestIds: string[] = [];
    const order: string[] = [];
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), ({ params }) => {
        const requestedId = String(params.id);
        detailRequestIds.push(requestedId);
        if (requestedId === '456') {
          order.push('detail');
          return HttpResponse.json({
            ...detail('After replacement', '456'),
            preRunCarbsG: null,
          });
        }
        if (currentName === 'After replacement') {
          return HttpResponse.json({ error: 'Workout not found' }, { status: 404 });
        }
        return HttpResponse.json(detail(currentName, requestedId));
      }),
      http.post(apiUrl('/api/intervals/events/replace'), () => {
        currentName = 'After replacement';
        return HttpResponse.json({ newId: 456 });
      }),
      http.get(apiUrl('/api/intervals/calendar'), () => {
        if (currentName === 'After replacement') order.push('calendar');
        return HttpResponse.json([
          {
            id: 'event-123',
            date: new Date().toISOString(),
            name: currentName,
            description: '',
            type: 'planned',
            category: 'easy',
            preRunCarbsG: 30,
          },
        ]);
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
        <ReplacementCacheProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Workout: Before replacement')).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Replace workout'));
    await waitFor(() => {
      const events = JSON.parse(readCache('replacement-calendar-cache')) as CalendarEvent[];
      expect(events[0]).toMatchObject({
        id: '456',
        name: 'After replacement',
        preRunCarbsG: null,
      });
      expect(readCache('original-detail-cache')).toBe('');
      expect(JSON.parse(readCache('replacement-detail-cache'))).toMatchObject({
        event: { id: '456', name: 'After replacement' },
      });
    });
    expect(order[0]).toBe('detail');
    expect(detailRequestIds).toContain('456');
  });

  it('retries only detail retrieval and reconciles caches after replacement detail fails', async () => {
    let replaced = false;
    let replacements = 0;
    let replacementDetailGets = 0;
    let calendarGets = 0;
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), ({ params }) => {
        const requestedId = String(params.id);
        if (requestedId === '456') {
          replacementDetailGets += 1;
          if (replacementDetailGets > 2) {
            return HttpResponse.json(detail('After replacement', '456'));
          }
          return HttpResponse.json({ error: 'detail unavailable' }, { status: 503 });
        }
        if (replaced) {
          return HttpResponse.json({ error: 'Workout not found' }, { status: 404 });
        }
        return HttpResponse.json(detail('Before replacement', requestedId));
      }),
      http.post(apiUrl('/api/intervals/events/replace'), () => {
        replacements += 1;
        replaced = true;
        return HttpResponse.json({ newId: 456 });
      }),
      http.get(apiUrl('/api/intervals/calendar'), () => {
        calendarGets += 1;
        return HttpResponse.json([{
          id: replaced ? '456' : 'event-123',
          date: new Date().toISOString(),
          name: replaced ? 'After replacement' : 'Before replacement',
          description: '',
          type: 'planned',
          category: 'easy',
        }]);
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
        <ReplacementCacheProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Workout: Before replacement')).toBeOnTheScreen();
    await waitFor(() => expect(calendarGets).toBeGreaterThan(0));
    const calendarBaseline = calendarGets;

    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Replace workout'));

    await waitFor(() => {
      expect(replacements).toBe(1);
      expect(replacementDetailGets).toBe(2);
      expect(calendarGets).toBeGreaterThan(calendarBaseline);
      expect(readCache('original-detail-cache')).toBe('');
      expect(screen.getByText('Replacement error: yes')).toBeOnTheScreen();
      const events = JSON.parse(readCache('replacement-calendar-cache')) as CalendarEvent[];
      expect(events[0]).toMatchObject({ id: '456', name: 'After replacement' });
    }, { timeout: 3_000 });

    await user.press(screen.getByLabelText('Replace with long'));

    expect(await screen.findByText(
      'Replacement error message: This workout was already replaced. Reload the workout before choosing another replacement.',
    )).toBeOnTheScreen();
    expect(replacements).toBe(1);
    expect(replacementDetailGets).toBe(2);

    await user.press(screen.getByLabelText('Replace workout'));

    await waitFor(() => {
      expect(replacements).toBe(1);
      expect(replacementDetailGets).toBe(3);
      expect(screen.getByText('Replacement result: After replacement')).toBeOnTheScreen();
    });
  });

  it('optimistically moves detail and rolls back when server rejects it', async () => {
    let rejectMove: (() => void) | null = null;
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () =>
        HttpResponse.json(detail('Move me')),
      ),
      http.put(apiUrl('/api/intervals/events/event-123'), async () => {
        await new Promise<void>((resolve) => { rejectMove = resolve; });
        return HttpResponse.json({ error: 'move failed' }, { status: 502 });
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Starts: 2026-08-13T12:00:00')).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Move workout'));
    expect(await screen.findByText('Starts: 2026-08-14T15:30:00')).toBeOnTheScreen();
    await waitFor(() => expect(rejectMove).not.toBeNull());
    rejectMove!();
    expect(await screen.findByText('Starts: 2026-08-13T12:00:00')).toBeOnTheScreen();
  });

  it('keeps the moved date while Calendar reconciles with the server', async () => {
    let date = '2026-08-13T12:00:00';
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () => HttpResponse.json(detail('Move me'))),
      http.get(apiUrl('/api/intervals/calendar'), () => HttpResponse.json([{ ...staleCalendarEvent(), date }])),
      http.put(apiUrl('/api/intervals/events/event-123'), async ({ request }) => {
        date = ((await request.json()) as { start_date_local: string }).start_date_local;
        return HttpResponse.json({ ok: true });
      }),
    );
    const queryClient = new QueryClient();
    await render(<TestAppProviders auth={makeTestAuthValue(makeTestSession())} queryClient={queryClient}>
      <MutationProbe /><CalendarProbe />
    </TestAppProviders>);
    await screen.findByText('Calendar: Pace calendar name');
    await userEvent.setup().press(screen.getByLabelText('Move workout'));
    await screen.findByText('Starts: 2026-08-14T15:30:00');
    await screen.findByText('Move success: yes');
    await waitFor(() => {
      const events = queryClient.getQueryData<InfiniteData<CalendarEvent[]>>(queryKeys.calendar('runner@example.com'))?.pages.flat();
      expect(events?.find((event) => event.id === 'event-123')?.date.getTime()).toBe(
        new Date('2026-08-14T15:30:00').getTime(),
      );
    });
  });

  it('updates Calendar from fresh replacement detail when Calendar is stale', async () => {
    let currentName = 'W03 Easy';
    let calendarGets = 0;
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), () =>
        HttpResponse.json({
          ...detail(currentName),
          event: {
            ...detail(currentName).event,
            category: currentName === 'W03 Long' ? 'long' : 'easy',
          },
          replacementCategory: currentName === 'W03 Long' ? 'long' : 'easy',
        }),
      ),
      http.post(apiUrl('/api/intervals/events/replace'), async ({ request }) => {
        const body = await request.json() as { category: string };
        if (body.category === 'long') {
          currentName = 'W03 Long';
        }
        return HttpResponse.json({ newId: 123 });
      }),
      http.get(apiUrl('/api/intervals/calendar'), () => {
        calendarGets += 1;
        return HttpResponse.json([{
          id: 'event-123',
          date: new Date().toISOString(),
          name: 'W03 Easy',
          description: '',
          type: 'planned',
          category: 'easy',
        }]);
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
        <CalendarProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Calendar: W03 Easy')).toBeOnTheScreen();
    await waitFor(() => expect(calendarGets).toBeGreaterThan(0));
    const calendarBaseline = calendarGets;
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Replace with long'));

    expect(await screen.findByText('Workout: W03 Long')).toBeOnTheScreen();
    expect(await screen.findByText('Calendar: W03 Long')).toBeOnTheScreen();
    expect(calendarGets).toBe(calendarBaseline);
  });

  it('updates pre-run carbs in detail cache without refetching detail or Calendar', async () => {
    let detailGets = 0;
    let calendarGets = 0;
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () => {
        detailGets += 1;
        return HttpResponse.json(detail('Before carb save'));
      }),
      http.get(apiUrl('/api/intervals/calendar'), () => {
        calendarGets += 1;
        return HttpResponse.json([
          {
            id: 'event-123',
            date: new Date().toISOString(),
            name: 'Before carb save',
            description: '',
            type: 'planned',
            category: 'easy',
          },
        ]);
      }),
      http.post(apiUrl('/api/prerun-carbs'), () =>
        HttpResponse.json({ ok: true }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
        <CalendarProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Carbs: none')).toBeOnTheScreen();
    expect(await screen.findByText('Calendar: Before carb save')).toBeOnTheScreen();
    expect(await screen.findByText('CalendarCarbs: none')).toBeOnTheScreen();
    await waitFor(() => expect(calendarGets).toBeGreaterThan(0));
    const calendarBaseline = calendarGets;
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Save pre-run carbs'));

    expect(await screen.findByText('Carbs: 30')).toBeOnTheScreen();
    expect(await screen.findByText('CalendarCarbs: 30')).toBeOnTheScreen();
    expect(detailGets).toBe(1);
    expect(calendarGets).toBe(calendarBaseline);
  });

  describe('plannedWorkoutQueryOptions & prefetchPlannedWorkoutDetail', () => {
    it('configures 5-minute staleTime and identity query key', () => {
      const client = createApiClient({
        getToken: () => 'test-token',
        onUnauthorized: () => {},
      });
      const options = plannedWorkoutQueryOptions(client, 'user@example.com', 'event-123');

      expect(options.queryKey).toEqual(queryKeys.plannedWorkout('user@example.com', 'event-123'));
      expect(options.staleTime).toBe(PLANNED_WORKOUT_STALE_TIME);
      expect(PLANNED_WORKOUT_STALE_TIME).toBe(5 * 60 * 1000);
    });

    it('prefetches planned workout detail into QueryClient cache', async () => {
      let networkGets = 0;
      server.use(
        http.get(apiUrl('/api/intervals/events/event-999'), () => {
          networkGets += 1;
          return HttpResponse.json(detail('Prefetched Workout', 'event-999'));
        }),
      );

      const client = createApiClient({
        getToken: () => 'test-token',
        onUnauthorized: () => {},
      });
      const queryClient = new QueryClient();

      await prefetchPlannedWorkoutDetail(
        queryClient,
        client,
        'user@example.com',
        'event-999',
      );

      expect(networkGets).toBe(1);
      const cached = queryClient.getQueryData<PlannedWorkoutDetail>(
        queryKeys.plannedWorkout('user@example.com', 'event-999'),
      );
      expect(cached?.event.name).toBe('Prefetched Workout');
    });
  });
});
