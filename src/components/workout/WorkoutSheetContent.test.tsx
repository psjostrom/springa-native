import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { CalendarEvent } from '@/api/types';
import { ApiClientProvider } from '@/api/ApiClientProvider';
import { AuthProviderForTests } from '@/auth/AuthContext';
import { WorkoutSheetContent } from '@/components/workout/WorkoutSheetContent';
import type { PlannedWorkoutActions } from '@/components/workout/PlannedWorkoutSheet';
import { getWorkoutStatusBadge } from '@/components/workout/workoutStatusBadge';
import { findCalendarEvent } from '@/domain/findCalendarEvent';
import { queryKeys } from '@/query/keys';
import { defaultCompletedOverview } from '@/test/msw/handlers/completedWorkoutOverview';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';

function renderWithApp(ui: ReactNode) {
  return render(
    <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
      {ui}
    </TestAppProviders>,
  );
}

const NOW = new Date('2026-08-10T12:00:00');

function sampleEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'threshold-today',
    date: new Date('2026-08-12T12:00:00'),
    name: 'Threshold intervals',
    description: '',
    type: 'planned',
    category: 'interval',
    ...overrides,
  };
}

describe('getWorkoutStatusBadge', () => {
  it('labels planned, missed, completed, and race', () => {
    expect(getWorkoutStatusBadge(sampleEvent({ type: 'planned' }), NOW).label).toBe('Planned');
    expect(
      getWorkoutStatusBadge(
        sampleEvent({
          id: 'missed',
          type: 'planned',
          date: new Date('2026-08-01T12:00:00'),
        }),
        NOW,
      ).label,
    ).toBe('Missed');
    expect(getWorkoutStatusBadge(sampleEvent({ type: 'completed' }), NOW).label).toBe(
      'Completed',
    );
    expect(getWorkoutStatusBadge(sampleEvent({ type: 'race' }), NOW).label).toBe('Race');
  });
});

describe('findCalendarEvent', () => {
  it('returns the event with a matching id', () => {
    const a = sampleEvent({ id: 'a' });
    const b = sampleEvent({ id: 'b', name: 'Other' });
    expect(findCalendarEvent([a, b], 'b')).toBe(b);
    expect(findCalendarEvent([a, b], 'missing')).toBeUndefined();
  });
});

describe('WorkoutSheetContent', () => {
  it('fills full-screen detail so planned details can scroll', async () => {
    await renderWithApp(
      <WorkoutSheetContent event={sampleEvent()} onClose={() => {}} now={NOW} />,
    );
    expect(screen.getByLabelText('Workout Threshold intervals')).toHaveStyle({ flex: 1 });
  });

  it('shows planned chrome and detail for upcoming planned', async () => {
    const actionsRef = { current: null as PlannedWorkoutActions | null };
    await renderWithApp(
      <WorkoutSheetContent
        event={sampleEvent()}
        onClose={() => {}}
        onActionsReady={(value) => { actionsRef.current = value; }}
        now={NOW}
      />,
    );
    expect(screen.getByText('Threshold intervals')).toBeOnTheScreen();
    expect(screen.getByText('Planned')).toBeOnTheScreen();
    expect(await screen.findByText('Workout structure')).toBeOnTheScreen();
    expect(screen.queryByTestId('effort-metric-picker')).toBeNull();
    expect(actionsRef.current?.effortMetric).toMatchObject({
      value: 'pace',
      change: expect.any(Function),
    });
    expect(screen.getByText('T-shirt')).toBeOnTheScreen();
    expect(screen.getByText('65m')).toBeOnTheScreen();
  });

  it('shows the Calendar summary and Overview content for completed events', async () => {
    await renderWithApp(
      <WorkoutSheetContent
        event={sampleEvent({
          id: 'easy-past',
          type: 'completed',
          name: 'Easy Run',
          activityId: 'activity-123',
        })}
        onClose={() => {}}
        now={NOW}
      />,
    );
    expect(screen.getByText('Easy Run')).toBeOnTheScreen();
    expect(screen.getByText('Completed')).toBeOnTheScreen();
    expect(await screen.findByText('Fueling')).toBeOnTheScreen();
    expect(screen.getByLabelText('Run report')).toBeOnTheScreen();
    expect(screen.getByLabelText('Km 1, pace 5:25 per km, avg HR 142 bpm, elevation +4 m')).toBeOnTheScreen();
    expect(screen.queryByText('Completed workout')).toBeNull();
    expect(screen.queryByText('Workout structure')).toBeNull();
    expect(screen.queryByTestId('effort-metric-picker')).toBeNull();
  });

  it('clears completed editor drafts when the selected event changes', async () => {
    const auth = makeTestAuthValue(makeTestSession());
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
    });
    queryClient.setQueryData(
      queryKeys.completedWorkoutOverview('runner@example.com', 'activity-123'),
      defaultCompletedOverview('activity-123'),
    );
    queryClient.setQueryData(
      queryKeys.completedWorkoutOverview('runner@example.com', 'activity-456'),
      defaultCompletedOverview('activity-456'),
    );
    const renderTree = (event: CalendarEvent) => (
      <AuthProviderForTests value={auth}>
        <ApiClientProvider>
          <QueryClientProvider client={queryClient}>
            <WorkoutSheetContent event={event} onClose={() => {}} now={NOW} />
          </QueryClientProvider>
        </ApiClientProvider>
      </AuthProviderForTests>
    );
    const first = sampleEvent({
      id: 'first-run',
      type: 'completed',
      name: 'First run',
      activityId: 'activity-123',
    });
    const second = sampleEvent({
      id: 'second-run',
      type: 'completed',
      name: 'Second run',
      activityId: 'activity-456',
    });
    const view = await render(renderTree(first));
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'Good' }));
    await user.type(screen.getByLabelText('Feedback comment'), 'First draft');

    view.rerender(renderTree(second));

    expect(await screen.findByText('Second run')).toBeOnTheScreen();
    expect(await screen.findByLabelText('Feedback comment')).toHaveProp('value', '');
    expect(screen.getByRole('button', { name: 'Good', selected: false })).toBeOnTheScreen();
  });

  it('keeps race events on the planned detail path', async () => {
    await renderWithApp(
      <WorkoutSheetContent
        event={sampleEvent({
          id: 'race-future',
          name: 'Half marathon',
          type: 'race',
          category: 'race',
        })}
        onClose={() => {}}
        now={NOW}
      />,
    );
    expect(screen.getByText('Race')).toBeOnTheScreen();
    expect(await screen.findByText('Workout structure')).toBeOnTheScreen();
    expect(screen.getByText('T-shirt')).toBeOnTheScreen();
    expect(screen.getByText('65m')).toBeOnTheScreen();
    expect(screen.queryByTestId('effort-metric-picker')).toBeNull();
    expect(screen.queryByText('Completed workout')).toBeNull();
  });

  it('shows Missed badge and planned detail for missed events', async () => {
    await renderWithApp(
      <WorkoutSheetContent
        event={sampleEvent({
          id: 'missed-1',
          name: 'Skipped tempo',
          type: 'planned',
          date: new Date('2026-08-01T12:00:00'),
        })}
        onClose={() => {}}
        now={new Date('2026-08-14T12:00:00')}
      />,
    );
    expect(screen.getByText('Skipped tempo')).toBeOnTheScreen();
    expect(screen.getByText('Missed')).toBeOnTheScreen();
    expect(await screen.findByText('Workout structure')).toBeOnTheScreen();
    expect(screen.queryByTestId('effort-metric-picker')).toBeNull();
  });

  it('shows not-found copy when event is missing', async () => {
    await render(<WorkoutSheetContent event={null} onClose={() => {}} />);
    expect(screen.getByText('Workout not found')).toBeOnTheScreen();
  });

  it('leaves dismissal to the native stack', async () => {
    await renderWithApp(
      <WorkoutSheetContent event={sampleEvent()} onClose={() => {}} now={NOW} />,
    );
    expect(screen.queryByLabelText('Close workout')).toBeNull();
  });

  it('does not add a close control when event is missing', async () => {
    await render(<WorkoutSheetContent event={null} onClose={() => {}} />);
    expect(screen.queryByLabelText('Close workout')).toBeNull();
  });
});
