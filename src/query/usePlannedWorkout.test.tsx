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

function detail(name: string) {
  return {
    event: {
      id: 'event-123',
      intervalsEventId: 123,
      startDateLocal: '2026-08-13T12:00:00',
      name,
      category: 'easy',
      description: '',
    },
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

function MutationProbe() {
  const { data } = usePlannedWorkoutDetail('event-123');
  const { replace } = usePlannedWorkoutMutations('event-123');
  return (
    <>
      <Text>Workout: {data?.event.name ?? 'loading'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Replace workout"
        onPress={() => replace.mutate('quality')}
      >
        <Text>Replace</Text>
      </Pressable>
    </>
  );
}

function CalendarProbe() {
  const { events } = useCalendarEvents();
  return <Text>Calendar: {events[0]?.name ?? 'loading'}</Text>;
}

describe('planned workout query hooks', () => {
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

  it('refetches detail and Calendar after a successful replacement', async () => {
    let currentName = 'Before replacement';
    server.use(
      http.get(apiUrl('/api/intervals/events/event-123'), () =>
        HttpResponse.json(detail(currentName)),
      ),
      http.post(apiUrl('/api/intervals/events/replace'), () => {
        currentName = 'After replacement';
        return HttpResponse.json({ newId: 123 });
      }),
      http.get(apiUrl('/api/intervals/calendar'), () =>
        HttpResponse.json([
          {
            id: 'event-123',
            date: new Date().toISOString(),
            name: currentName,
            description: '',
            type: 'planned',
            category: 'easy',
          },
        ]),
      ),
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
  });
});
