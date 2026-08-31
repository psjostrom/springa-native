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
import { defaultCompletedOverview } from '@/test/msw/handlers/completedWorkoutOverview';
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
  it('shows Agenda without inactive Month or Week actions', async () => {
    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <View style={{ width: 390, height: 800 }}>
          <AgendaGate>
            <AgendaList />
          </AgendaGate>
        </View>
      </TestAppProviders>,
    );

    expect(await screen.findByText('Agenda')).toBeOnTheScreen();
    expect(screen.queryByText('Month')).toBeNull();
    expect(screen.queryByText('Week')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Month' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Week' })).toBeNull();
  });

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

  it('prefetches up to 10 upcoming planned workouts and up to 10 earlier completed workouts', async () => {
    const plannedDetailRequests: string[] = [];
    const completedOverviewRequests: string[] = [];

    const now = new Date();
    const isoDay = (offsetDays: number) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, 12, 0, 0);
      return d.toISOString();
    };

    const pastEvents = [
      // Older completed events (beyond the last 10)
      { id: 'past-comp-1', date: isoDay(-12), name: 'Past 1', type: 'completed', category: 'easy', activityId: 'act-1' },
      { id: 'past-comp-2', date: isoDay(-11), name: 'Past 2', type: 'completed', category: 'easy', activityId: 'act-2' },
      // Last 10 completed events
      { id: 'past-comp-3', date: isoDay(-10), name: 'Past 3', type: 'completed', category: 'easy', activityId: 'act-3' },
      { id: 'past-comp-4', date: isoDay(-9), name: 'Past 4', type: 'completed', category: 'easy', activityId: 'act-4' },
      { id: 'past-comp-5', date: isoDay(-8), name: 'Past 5', type: 'completed', category: 'easy', activityId: 'act-5' },
      { id: 'past-comp-6', date: isoDay(-7), name: 'Past 6', type: 'completed', category: 'easy', activityId: 'act-6' },
      { id: 'past-comp-7', date: isoDay(-6), name: 'Past 7', type: 'completed', category: 'easy', activityId: 'act-7' },
      { id: 'past-comp-8', date: isoDay(-5), name: 'Past 8', type: 'completed', category: 'easy', activityId: 'act-8' },
      { id: 'past-comp-9', date: isoDay(-4), name: 'Past 9', type: 'completed', category: 'easy', activityId: 'act-9' },
      { id: 'past-comp-10', date: isoDay(-3), name: 'Past 10', type: 'completed', category: 'easy', activityId: 'act-10' },
      { id: 'past-comp-11', date: isoDay(-2), name: 'Past 11', type: 'completed', category: 'easy', activityId: 'act-11' },
      { id: 'past-comp-12', date: isoDay(-1), name: 'Past 12', type: 'completed', category: 'easy', activityId: 'act-12' },
      // Past non-completed or completed without activityId
      { id: 'past-no-act', date: isoDay(-1), name: 'Past No Act', type: 'completed', category: 'easy' },
      { id: 'past-missed-planned', date: isoDay(-1), name: 'Past Missed', type: 'planned', category: 'interval' },
    ];

    const upcomingEvents = [
      // First 10 upcoming planned events
      { id: 'plan-1', date: isoDay(0), name: 'Plan 1', type: 'planned', category: 'interval' },
      { id: 'plan-2', date: isoDay(1), name: 'Plan 2', type: 'planned', category: 'interval' },
      { id: 'plan-3', date: isoDay(2), name: 'Plan 3', type: 'planned', category: 'interval' },
      { id: 'plan-4', date: isoDay(3), name: 'Plan 4', type: 'planned', category: 'interval' },
      { id: 'plan-5', date: isoDay(4), name: 'Plan 5', type: 'planned', category: 'interval' },
      { id: 'plan-6', date: isoDay(5), name: 'Plan 6', type: 'planned', category: 'interval' },
      { id: 'plan-7', date: isoDay(6), name: 'Plan 7', type: 'planned', category: 'interval' },
      { id: 'plan-8', date: isoDay(7), name: 'Plan 8', type: 'planned', category: 'interval' },
      { id: 'plan-9', date: isoDay(8), name: 'Plan 9', type: 'planned', category: 'interval' },
      { id: 'plan-10', date: isoDay(9), name: 'Plan 10', type: 'planned', category: 'interval' },
      // 11th and 12th upcoming planned events (should not be prefetched)
      { id: 'plan-11', date: isoDay(10), name: 'Plan 11', type: 'planned', category: 'interval' },
      { id: 'plan-12', date: isoDay(11), name: 'Plan 12', type: 'planned', category: 'interval' },
      // Future non-planned
      { id: 'race-future', date: isoDay(12), name: 'Race', type: 'race', category: 'race' },
    ];

    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () =>
        HttpResponse.json([...pastEvents, ...upcomingEvents]),
      ),
      http.get(apiUrl('/api/intervals/events/:id'), ({ params }) => {
        plannedDetailRequests.push(String(params.id));
        return HttpResponse.json(defaultPlannedWorkoutDetail());
      }),
      http.get(apiUrl('/api/intervals/activity/:id/overview'), ({ params }) => {
        completedOverviewRequests.push(String(params.id));
        return HttpResponse.json(defaultCompletedOverview(String(params.id)));
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

    const expectedPlanned = [
      'plan-1',
      'plan-2',
      'plan-3',
      'plan-4',
      'plan-5',
      'plan-6',
      'plan-7',
      'plan-8',
      'plan-9',
      'plan-10',
    ];

    const expectedCompleted = [
      'act-3',
      'act-4',
      'act-5',
      'act-6',
      'act-7',
      'act-8',
      'act-9',
      'act-10',
      'act-11',
      'act-12',
    ];

    await waitFor(() => {
      expect(plannedDetailRequests).toEqual(expectedPlanned);
      expect(completedOverviewRequests).toEqual(expectedCompleted);
    });

    expect(plannedDetailRequests).not.toContain('plan-11');
    expect(plannedDetailRequests).not.toContain('plan-12');
    expect(plannedDetailRequests).not.toContain('past-missed-planned');
    expect(plannedDetailRequests).not.toContain('race-future');

    expect(completedOverviewRequests).not.toContain('act-1');
    expect(completedOverviewRequests).not.toContain('act-2');
  });

  it('triggers reload on pull to refresh', async () => {
    let calendarFetches = 0;
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () => {
        calendarFetches += 1;
        return HttpResponse.json([
          {
            id: 'event-refreshed',
            date: new Date().toISOString(),
            name: 'Refreshed run',
            description: '',
            type: 'planned',
            category: 'easy',
          },
        ]);
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

    await waitFor(() => expect(calendarFetches).toBeGreaterThanOrEqual(1));
    const initialFetches = calendarFetches;

    const refreshControl = screen.getByTestId('agenda-refresh-control');
    refreshControl.props.onRefresh();

    await waitFor(() => {
      expect(calendarFetches).toBeGreaterThan(initialFetches);
    });
  });
});
