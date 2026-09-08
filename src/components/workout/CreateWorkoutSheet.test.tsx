import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatIsoDay } from '@/domain/calendarWindows';
import { queryKeys } from '@/query/keys';
import { defaultPlannedWorkoutDetail } from '@/test/msw/handlers/plannedWorkout';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import { makeTestAuthValue, makeTestSession, TestAppProviders } from '@/test/TestAppProviders';
import { CreateWorkoutSheet } from './CreateWorkoutSheet';

const hash = 'a'.repeat(64);
const requests: unknown[] = [];
const previewDates: string[] = [];
const names = { easy: 'Easy run', quality: 'Short intervals', long: 'Long run', club: 'Club Run' };

beforeEach(() => {
  requests.length = 0;
  previewDates.length = 0;
  server.use(
    http.get(apiUrl('/api/intervals/events/preview'), ({ request }) => {
      const url = new URL(request.url);
      const date = url.searchParams.get('date')!;
      const category = (url.searchParams.get('category') ?? 'easy') as keyof typeof names;
      previewDates.push(date);
      return HttpResponse.json({
        date, category, suggestedCategory: 'easy', previewHash: hash,
        workout: {
          name: names[category], description: defaultPlannedWorkoutDetail().event.description,
          startDateLocal: `${date}T12:00:00`,
          structure: defaultPlannedWorkoutDetail().structure,
          metrics: defaultPlannedWorkoutDetail().metrics,
        },
      });
    }),
    http.post(apiUrl('/api/intervals/events'), async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json({ newId: 42 });
    }),
  );
});

async function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(queryKeys.calendar('runner@example.com'), { pages: [[]], pageParams: [] });
  client.setQueryData(queryKeys.planner('runner@example.com'), {});
  client.setQueryData(queryKeys.plannedWorkout('runner@example.com', 'event-42'), defaultPlannedWorkoutDetail('event-42'));
  let closed = false;
  await render(
    <TestAppProviders auth={makeTestAuthValue(makeTestSession())} queryClient={client}>
      <CreateWorkoutSheet isPresented onDismiss={() => { closed = true; }} />
    </TestAppProviders>,
  );
  return { client, isClosed: () => closed };
}

describe('CreateWorkoutSheet', () => {
  it('previews a category for today before saving and refreshes calendar and planner', async () => {
    const { client, isClosed } = await setup();
    expect(await screen.findByText('Suggested')).toBeOnTheScreen();
    expect(previewDates[0]).toBe(formatIsoDay(new Date()));
    expect(requests).toEqual([]);
    await fireEvent.press(screen.getByLabelText('Create Quality workout'));
    expect(await screen.findByText('Short intervals')).toBeOnTheScreen();
    expect(screen.getByLabelText('Workout structure')).toBeOnTheScreen();
    expect(requests).toEqual([]);
    await fireEvent.press(screen.getByRole('button', { name: 'Save workout' }));
    await waitFor(() => expect(isClosed()).toBe(true));
    expect(requests).toEqual([{ date: formatIsoDay(new Date()), category: 'quality', previewHash: hash }]);
    expect(client.getQueryState(queryKeys.calendar('runner@example.com'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.planner('runner@example.com'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.plannedWorkout('runner@example.com', 'event-42'))?.isInvalidated).toBe(true);
  });

  it('uses the selected local date and keeps cancellation read-only', async () => {
    const { isClosed } = await setup();
    await screen.findByText('Suggested');
    await fireEvent.press(screen.getByLabelText('Change workout date'));
    await fireEvent.press(screen.getByLabelText('Choose workout date'));
    await waitFor(() => expect(previewDates).toContain('2026-08-14'));
    await fireEvent.press(await screen.findByLabelText('Create Long workout'));
    await screen.findByText('Long run');
    await fireEvent.press(screen.getByLabelText('Back to workout choices'));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(isClosed()).toBe(true);
    expect(requests).toEqual([]);
  });

  it('keeps the preview on a failed save and retries the same intent', async () => {
    let fail = true;
    server.use(http.post(apiUrl('/api/intervals/events'), async ({ request }) => {
      requests.push(await request.json());
      return fail
        ? HttpResponse.json({ error: 'Intervals is unavailable', code: 'UPSTREAM_ERROR' }, { status: 502 })
        : HttpResponse.json({ newId: 42 });
    }));
    const { isClosed } = await setup();
    await screen.findByText('Suggested');
    await fireEvent.press(screen.getByLabelText('Create Easy workout'));
    await screen.findByText('Easy run');
    await fireEvent.press(screen.getByRole('button', { name: 'Save workout' }));
    expect(await screen.findByText('Intervals is unavailable')).toBeOnTheScreen();
    expect(screen.getByText('Easy run')).toBeOnTheScreen();
    expect(isClosed()).toBe(false);
    fail = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Save workout' }));
    await waitFor(() => expect(isClosed()).toBe(true));
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(requests[0]);
  });

  it('requires a refreshed preview after settings change before saving again', async () => {
    let changed = true;
    server.use(http.post(apiUrl('/api/intervals/events'), async ({ request }) => {
      requests.push(await request.json());
      return changed
        ? HttpResponse.json({ error: 'Your workout changed. Refresh the preview.', code: 'WORKOUT_PREVIEW_STALE' }, { status: 409 })
        : HttpResponse.json({ newId: 42 });
    }));
    const { isClosed } = await setup();
    await screen.findByText('Suggested');
    await fireEvent.press(screen.getByLabelText('Create Easy workout'));
    await screen.findByText('Easy run');
    await fireEvent.press(screen.getByRole('button', { name: 'Save workout' }));
    await screen.findByRole('button', { name: 'Refresh preview' });
    expect(screen.queryByRole('button', { name: 'Save workout' })).toBeNull();
    changed = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Refresh preview' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Save workout' }));
    await waitFor(() => expect(isClosed()).toBe(true));
    expect(requests).toHaveLength(2);
  });

  it('locks date and category changes while saving', async () => {
    let release: () => void = () => {};
    const waiting = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.post(apiUrl('/api/intervals/events'), async () => {
      await waiting;
      return HttpResponse.json({ newId: 42 });
    }));
    const { isClosed } = await setup();
    await screen.findByText('Suggested');
    await fireEvent.press(screen.getByLabelText('Create Easy workout'));
    await screen.findByText('Easy run');
    await fireEvent.press(screen.getByRole('button', { name: 'Save workout' }));
    expect(await screen.findByRole('button', { name: 'Saving workout…' })).toBeDisabled();
    expect(screen.getByLabelText('Change workout date')).toBeDisabled();
    expect(screen.getByLabelText('Back to workout choices')).toBeDisabled();
    release();
    await waitFor(() => expect(isClosed()).toBe(true));
  });

  it('hides an open iOS date picker until saving finishes', async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    let release: () => void = () => {};
    const waiting = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.post(apiUrl('/api/intervals/events'), async () => {
      await waiting;
      return HttpResponse.json({ newId: 42 });
    }));
    try {
      const { isClosed } = await setup();
      await screen.findByText('Suggested');
      await fireEvent.press(screen.getByLabelText('Create Easy workout'));
      await screen.findByText('Easy run');
      await fireEvent.press(screen.getByLabelText('Change workout date'));
      expect(screen.getByLabelText('Choose workout date')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Save workout' }));
      await screen.findByRole('button', { name: 'Saving workout…' });
      expect(screen.queryByLabelText('Choose workout date')).toBeNull();
      release();
      await waitFor(() => expect(isClosed()).toBe(true));
    } finally {
      release();
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }
  });

  it('shows plan errors without offering a save', async () => {
    server.use(http.get(apiUrl('/api/intervals/events/preview'), () =>
      HttpResponse.json({ error: 'Date is outside your training plan.', code: 'DATE_OUTSIDE_PLAN' }, { status: 422 })));
    await setup();
    expect(await screen.findByText('Date is outside your training plan.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Save workout' })).toBeNull();
    expect(screen.getByLabelText('Change workout date')).toBeEnabled();
    expect(requests).toEqual([]);
  });
});
