import { Pressable, Text } from 'react-native';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { usePlannedWorkoutDetail, usePlannedWorkoutMutations } from './usePlannedWorkout';
import { useCalendarEvents } from './useCalendarEvents';
import { queryKeys } from './keys';
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

function MutationProbe() {
  const { data } = usePlannedWorkoutDetail('event-123');
  const { move, replace, savePreRunCarbs, deleteWorkout } =
    usePlannedWorkoutMutations('event-123');
  return (
    <>
      <Text>Workout: {data?.event.name ?? 'loading'}</Text>
      <Text>Carbs: {data?.preRunCarbsG ?? 'none'}</Text>
      <Text>Starts: {data?.event.startDateLocal ?? 'loading'}</Text>
      <Text>Move pending: {move.isPending ? 'yes' : 'no'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Move workout"
        onPress={() => move.mutate('2026-08-14T15:30:00')}
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
  return <Text>Calendar: {events[0]?.name ?? 'loading'}</Text>;
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
          return HttpResponse.json(detail('After replacement', '456'));
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
      expect(events[0]).toMatchObject({ id: '456', name: 'After replacement' });
      expect(readCache('original-detail-cache')).toBe('');
      expect(JSON.parse(readCache('replacement-detail-cache'))).toMatchObject({
        event: { id: '456', name: 'After replacement' },
      });
    });
    expect(order[0]).toBe('detail');
    expect(detailRequestIds).toContain('456');
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

  it('settles a move before the Calendar refresh finishes', async () => {
    let calendarGets = 0;
    let blockRefresh = false;
    let releaseRefresh: (() => void) | null = null;
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () =>
        HttpResponse.json(detail('Move me')),
      ),
      http.get(apiUrl('/api/intervals/calendar'), async () => {
        calendarGets += 1;
        if (blockRefresh) {
          await new Promise<void>((resolve) => { releaseRefresh = resolve; });
        }
        return HttpResponse.json([]);
      }),
      http.put(apiUrl('/api/intervals/events/event-123'), () =>
        HttpResponse.json({ ok: true }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
        <CalendarProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Move pending: no')).toBeOnTheScreen();
    await waitFor(() => expect(calendarGets).toBeGreaterThan(0));
    const calendarBaseline = calendarGets;
    blockRefresh = true;
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Move workout'));

    await waitFor(() => expect(calendarGets).toBeGreaterThan(calendarBaseline));
    expect(screen.getByText('Move pending: no')).toBeOnTheScreen();
    await waitFor(() => expect(releaseRefresh).not.toBeNull());
    releaseRefresh!();
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
    await waitFor(() => expect(calendarGets).toBeGreaterThan(0));
    const calendarBaseline = calendarGets;
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Save pre-run carbs'));

    expect(await screen.findByText('Carbs: 30')).toBeOnTheScreen();
    expect(detailGets).toBe(1);
    expect(calendarGets).toBe(calendarBaseline);
  });

  it('does not refetch deleted detail before Calendar refresh', async () => {
    let detailGets = 0;
    let calendarGets = 0;
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () => {
        detailGets += 1;
        return HttpResponse.json(detail('Delete me'));
      }),
      http.get(apiUrl('/api/intervals/calendar'), () => {
        calendarGets += 1;
        return HttpResponse.json([
          {
            id: 'event-123',
            date: new Date().toISOString(),
            name: 'Delete me',
            description: '',
            type: 'planned',
            category: 'easy',
          },
        ]);
      }),
      http.delete(apiUrl('/api/intervals/events/event-123'), () =>
        HttpResponse.json({ ok: true }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
        <CalendarProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Workout: Delete me')).toBeOnTheScreen();
    expect(await screen.findByText('Calendar: Delete me')).toBeOnTheScreen();
    await waitFor(() => expect(calendarGets).toBeGreaterThan(0));
    const calendarBaseline = calendarGets;
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Delete workout'));
    await waitFor(() => expect(calendarGets).toBeGreaterThan(calendarBaseline));

    expect(detailGets).toBe(1);
  });
});
