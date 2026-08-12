import { Pressable, Text } from 'react-native';
import { describe, expect, it } from 'vitest';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { usePlannedWorkoutDetail, usePlannedWorkoutMutations } from './usePlannedWorkout';
import { useCalendarEvents } from './useCalendarEvents';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';

function detail(name: string, eventId = 'event-123') {
  return {
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

  it('publishes fresh detail before refreshing Calendar after replacement', async () => {
    let currentName = 'Before replacement';
    let currentId = 'event-123';
    let releaseRefresh: (() => void) | null = null;
    const order: string[] = [];
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), ({ params }) => {
        if (currentName === 'After replacement') {
          order.push('detail');
        }
        return HttpResponse.json(detail(currentName, currentId));
      }),
      http.post(apiUrl('/api/intervals/events/replace'), () => {
        currentName = 'After replacement';
        currentId = 'event-456';
        return HttpResponse.json({ newId: 456 });
      }),
      http.get(apiUrl('/api/intervals/calendar'), async () => {
        if (currentName === 'After replacement' && releaseRefresh == null) {
          await new Promise<void>((resolve) => { releaseRefresh = resolve; });
        }
        if (currentName === 'After replacement') order.push('calendar');
        return HttpResponse.json([
          {
            id: currentId,
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
        <CalendarProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Workout: Before replacement')).toBeOnTheScreen();
    expect(await screen.findByText('Calendar: Before replacement')).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Replace workout'));
    await waitFor(() => {
      expect(screen.getByText('Workout: After replacement')).toBeOnTheScreen();
      expect(screen.getByText('Calendar: After replacement')).toBeOnTheScreen();
    });
    await waitFor(() => expect(releaseRefresh).not.toBeNull());
    expect(order[0]).toBe('detail');
    releaseRefresh!();
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
    let releaseRefresh: (() => void) | null = null;
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () =>
        HttpResponse.json(detail('Move me')),
      ),
      http.get(apiUrl('/api/intervals/calendar'), async () => {
        calendarGets += 1;
        if (calendarGets > 3) {
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
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Move workout'));

    await waitFor(() => expect(calendarGets).toBeGreaterThan(calendarBaseline));
    expect(screen.getByText('Move pending: no')).toBeOnTheScreen();
    (releaseRefresh as (() => void) | null)?.();
  });

  it('updates Calendar from fresh replacement detail when Calendar is stale', async () => {
    let currentName = 'W03 Easy';
    let currentId = 'event-123';
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), () =>
        HttpResponse.json({
          ...detail(currentName, currentId),
          event: {
            ...detail(currentName, currentId).event,
            category: currentName === 'W03 Long' ? 'long' : 'easy',
          },
          replacementCategory: currentName === 'W03 Long' ? 'long' : 'easy',
        }),
      ),
      http.post(apiUrl('/api/intervals/events/replace'), async ({ request }) => {
        const body = await request.json() as { category: string };
        if (body.category === 'long') {
          currentName = 'W03 Long';
          currentId = 'event-456';
        }
        return HttpResponse.json({ newId: 456 });
      }),
      http.get(apiUrl('/api/intervals/calendar'), () =>
        HttpResponse.json([{
          id: currentId,
          date: new Date().toISOString(),
          name: currentName,
          description: '',
          type: 'planned',
          category: 'easy',
        }]),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <MutationProbe />
        <CalendarProbe />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Calendar: W03 Easy')).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Replace with long'));

    expect(await screen.findByText('Workout: W03 Long')).toBeOnTheScreen();
    expect(await screen.findByText('Calendar: W03 Long')).toBeOnTheScreen();
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
