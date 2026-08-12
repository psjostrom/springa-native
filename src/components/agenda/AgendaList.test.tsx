import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { View } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { CalendarEvent } from '@/api/types';
import { AgendaEventCard } from '@/components/agenda/AgendaEventCard';
import { AgendaGate } from '@/components/agenda/AgendaGate';
import { AgendaList } from '@/components/agenda/AgendaList';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import { defaultPlannedWorkoutDetail } from '@/test/msw/handlers/plannedWorkout';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';

function sampleEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'threshold-today',
    date: new Date(),
    name: 'Threshold intervals',
    description: '',
    type: 'planned',
    category: 'interval',
    distance: 10000,
    duration: 3300,
    fuelRate: 45,
    prescribedCarbsG: 42,
    ...overrides,
  };
}

describe('AgendaEventCard', () => {
  it('renders live calendar event fields', async () => {
    await render(<AgendaEventCard event={sampleEvent()} />);
    expect(screen.getByText('Threshold intervals')).toBeOnTheScreen();
    expect(screen.getByText(/~55m/)).toBeOnTheScreen();
    expect(screen.getByText(/45g\/h/)).toBeOnTheScreen();
  });

  it('opens via press callback', async () => {
    let openedId: string | null = null;
    await render(
      <AgendaEventCard
        event={sampleEvent()}
        onPress={(event) => {
          openedId = event.id;
        }}
      />,
    );
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Open workout Threshold intervals'));
    expect(openedId).toBe('threshold-today');
  });
});

describe('AgendaList', () => {
  it('shows empty copy when the calendar returns no events', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () => HttpResponse.json([])),
    );
    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <View style={{ width: 390, height: 800 }}>
          <AgendaGate>
            <AgendaList />
          </AgendaGate>
        </View>
      </TestAppProviders>,
    );
    expect(await screen.findByText('No workouts scheduled')).toBeOnTheScreen();
  });

  it('opens earlier workouts like web Agenda history', async () => {
    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <View style={{ width: 390, height: 800 }}>
          <AgendaGate>
            <AgendaList />
          </AgendaGate>
        </View>
      </TestAppProviders>,
    );

    // LegendList may not mount rows under Vitest; header controls are the gate.
    const earlier = await screen.findByLabelText('Earlier workouts');
    const user = userEvent.setup();
    await user.press(earlier);

    expect(await screen.findByLabelText('Back to upcoming')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Earlier workouts')).toBeNull();

    await user.press(screen.getByLabelText('Back to upcoming'));
    expect(await screen.findByLabelText('Earlier workouts')).toBeOnTheScreen();
  });

  it('shows calendar error and recovers after Retry', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () =>
        HttpResponse.json({ error: 'down' }, { status: 502 }),
      ),
    );
    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <View style={{ width: 390, height: 800 }}>
          <AgendaGate>
            <AgendaList />
          </AgendaGate>
        </View>
      </TestAppProviders>,
    );
    expect(await screen.findByText('Couldn’t load calendar')).toBeOnTheScreen();

    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () =>
        HttpResponse.json([
          {
            id: 'recovered',
            date: new Date().toISOString(),
            name: 'Recovered run',
            description: '',
            type: 'planned',
            category: 'easy',
          },
        ]),
      ),
    );

    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Retry loading calendar'));
    await waitFor(() => {
      expect(screen.queryByText('Couldn’t load calendar')).toBeNull();
    });
    // LegendList may not mount rows under Vitest layout; error clear is the gate.
    expect(screen.queryByLabelText('Loading calendar')).toBeNull();
  });

  it('prefetches current and future planned detail without touching missed or race events', async () => {
    const detailRequests: string[] = [];
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), ({ params }) => {
        detailRequests.push(String(params.id));
        return HttpResponse.json(defaultPlannedWorkoutDetail());
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <View style={{ width: 390, height: 800 }}>
          <AgendaGate>
            <AgendaList />
          </AgendaGate>
        </View>
      </TestAppProviders>,
    );

    const expectedDetailRequests = ['threshold-today'];
    await waitFor(() => expect(detailRequests).toEqual(expectedDetailRequests));
    expect(detailRequests).toContain('threshold-today');
    expect(detailRequests).not.toContain('tempo-missed');
    expect(detailRequests).not.toContain('race-future');
  });
});
