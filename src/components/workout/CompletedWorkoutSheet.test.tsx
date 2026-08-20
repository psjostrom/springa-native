import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { render, screen, userEvent } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import type { CalendarEvent } from '@/api/types';
import { ApiClientProvider } from '@/api/ApiClientProvider';
import { AuthProviderForTests } from '@/auth/AuthContext';
import { CompletedWorkoutSheet } from '@/components/workout/CompletedWorkoutSheet';
import { queryKeys } from '@/query/keys';
import { defaultCompletedOverview } from '@/test/msw/handlers/completedWorkoutOverview';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
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

const completedEvent: CalendarEvent = {
  id: 'easy-past',
  date: new Date('2026-08-13T12:00:00'),
  name: 'Easy Run',
  description: '',
  type: 'completed',
  category: 'easy',
  distance: 8200,
  duration: 2700,
  avgHr: 138,
  carbsIngested: 45,
  activityId: 'activity-123',
};

describe('CompletedWorkoutSheet', () => {
  it('renders the full Overview from the server', async () => {
    await renderWithApp(<CompletedWorkoutSheet event={completedEvent} />);

    expect(await screen.findByLabelText('Run report')).toBeOnTheScreen();
    expect(screen.getByLabelText('Workout stats')).toBeOnTheScreen();
    expect(screen.getByText('8.2 km')).toBeOnTheScreen();
    expect(screen.getByLabelText('Pace splits')).toBeOnTheScreen();
    expect(screen.getByText('Km 1')).toBeOnTheScreen();
    expect(screen.getByText('Fueling')).toBeOnTheScreen();
    expect(screen.getByText('Feedback')).toBeOnTheScreen();
  });

  it('shows a visible loading state while derived details load', async () => {
    const gate = { release: null as (() => void) | null };
    server.use(
      http.get(apiUrl('/api/intervals/activity/:id/overview'), async () => {
        await new Promise<void>((resolve) => {
          gate.release = resolve;
        });
        return HttpResponse.json(defaultCompletedOverview());
      }),
    );

    await renderWithApp(<CompletedWorkoutSheet event={completedEvent} />);

    expect(screen.getByLabelText('Workout stats')).toBeOnTheScreen();
    expect(screen.getByText('8.2 km')).toBeOnTheScreen();
    expect(screen.getByText('Loading workout details…')).toBeOnTheScreen();
    expect(screen.getByLabelText('Loading completed workout details')).toBeOnTheScreen();

    gate.release?.();
    expect(await screen.findByText('Fueling')).toBeOnTheScreen();
  });

  it('retains an error state with retry and recovers', async () => {
    let attempts = 0;
    server.use(
      http.get(apiUrl('/api/intervals/activity/:id/overview'), () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ error: 'overview unavailable' }, { status: 502 })
          : HttpResponse.json(defaultCompletedOverview());
      }),
    );

    await renderWithApp(<CompletedWorkoutSheet event={completedEvent} />);

    expect(await screen.findByText('Couldn’t load workout details')).toBeOnTheScreen();
    expect(screen.getByText('overview unavailable')).toBeOnTheScreen();
    expect(screen.getByLabelText('Workout stats')).toBeOnTheScreen();
    expect(screen.getByText('8.2 km')).toBeOnTheScreen();
    expect(screen.queryByText('Fueling')).toBeNull();

    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Retry loading workout details'));

    expect(await screen.findByText('Fueling')).toBeOnTheScreen();
    expect(attempts).toBe(2);
  });

  it('shows an unavailable state without error copy when the query is disabled', async () => {
    await render(
      <TestAppProviders auth={makeTestAuthValue(null)}>
        <CompletedWorkoutSheet event={completedEvent} />
      </TestAppProviders>,
    );

    expect(screen.getByText('Workout details unavailable')).toBeOnTheScreen();
    expect(screen.queryByText('Couldn’t load workout details')).toBeNull();
    expect(screen.queryByLabelText('Retry loading workout details')).toBeNull();
  });

  it('renders cached Overview content without refetching', async () => {
    const gets = { count: 0 };
    server.use(
      http.get(apiUrl('/api/intervals/activity/:id/overview'), () => {
        gets.count += 1;
        return HttpResponse.json(defaultCompletedOverview());
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
    });
    queryClient.setQueryData(
      queryKeys.completedWorkoutOverview('runner@example.com', 'activity-123'),
      defaultCompletedOverview(),
    );

    await render(
      <AuthProviderForTests value={makeTestAuthValue(makeTestSession())}>
        <ApiClientProvider>
          <QueryClientProvider client={queryClient}>
            <CompletedWorkoutSheet event={completedEvent} />
          </QueryClientProvider>
        </ApiClientProvider>
      </AuthProviderForTests>,
    );

    expect(await screen.findByText('Fueling')).toBeOnTheScreen();
    expect(screen.getByLabelText('Run report')).toBeOnTheScreen();
    expect(gets.count).toBe(0);
  });

  it('re-enables feedback after a failed save', async () => {
    server.use(
      http.post(apiUrl('/api/run-feedback'), () =>
        HttpResponse.json({ error: 'feedback failed' }, { status: 502 }),
      ),
    );
    await renderWithApp(<CompletedWorkoutSheet event={completedEvent} />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'Good' }));
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('feedback failed')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });
});
