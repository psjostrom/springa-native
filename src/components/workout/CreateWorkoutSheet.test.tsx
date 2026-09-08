import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatIsoDay } from '@/domain/calendarWindows';
import { queryKeys } from '@/query/keys';
import { defaultPlannedWorkoutDetail } from '@/test/msw/handlers/plannedWorkout';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import { makeTestAuthValue, makeTestSession, TestAppProviders } from '@/test/TestAppProviders';
import { AgendaEventCard } from '@/components/agenda/AgendaEventCard';
import { Button } from '@/components/ui';
import { useCalendarEvents } from '@/query/useCalendarEvents';
import { CreateWorkoutSheet } from './CreateWorkoutSheet';

const hash = 'a'.repeat(64);
const requests: unknown[] = [];
const previewDates: string[] = [];
const names = { easy: 'Easy run', quality: 'Short intervals', long: 'Long run', club: 'Club Run' };

afterEach(() => vi.useRealTimers());

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-08T09:00:00'));
  requests.length = 0;
  previewDates.length = 0;
  server.use(
    http.get(apiUrl('/api/intervals/calendar'), () => HttpResponse.json([])),
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

function CalendarHarness() {
  const [presented, setPresented] = useState(false);
  const calendar = useCalendarEvents();
  return (
    <View>
      <Button label="Load earlier" onPress={() => { void calendar.fetchOlder(); }} />
      <Button label="Add workout" onPress={() => setPresented(true)} />
      {calendar.events.map((event) => (
        <AgendaEventCard key={event.id} event={event} saving={calendar.pendingEventIds.includes(event.id)} />
      ))}
      <CreateWorkoutSheet isPresented={presented} onDismiss={() => setPresented(false)} />
    </View>
  );
}

async function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  client.setQueryData(queryKeys.planner('runner@example.com'), {});
  client.setQueryData(queryKeys.plannedWorkout('runner@example.com', 'event-42'), defaultPlannedWorkoutDetail('event-42'));
  await render(
    <TestAppProviders auth={makeTestAuthValue(makeTestSession())} queryClient={client}>
      <CalendarHarness />
    </TestAppProviders>,
  );
  await fireEvent.press(await screen.findByRole('button', { name: 'Add workout' }));
  return { client, isClosed: () => screen.queryByText('Workout preview') == null };
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
    await screen.findByLabelText('Open workout Short intervals');
    expect(requests).toEqual([{ date: formatIsoDay(new Date()), category: 'quality', previewHash: hash }]);

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
    expect(screen.queryByLabelText('Open workout Easy run')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Review workout' }));
    expect(await screen.findByText('Easy run')).toBeOnTheScreen();
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
    await fireEvent.press(await screen.findByRole('button', { name: 'Review workout' }));
    await screen.findByRole('button', { name: 'Refresh preview' });
    expect(screen.queryByRole('button', { name: 'Save workout' })).toBeNull();
    changed = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Refresh preview' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Save workout' }));
    await waitFor(() => expect(isClosed()).toBe(true));
    expect(requests).toHaveLength(2);
  });

  it('closes and shows a saving card before POST completes, surviving a calendar refresh', async () => {
    let release: () => void = () => {};
    const waiting = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.post(apiUrl('/api/intervals/events'), async () => {
      await waiting;
      return HttpResponse.json({ newId: 42 });
    }));
    try {
      const { client, isClosed } = await setup();
      await fireEvent.press(await screen.findByLabelText('Create Easy workout'));
      await screen.findByText('Easy run');
      await fireEvent.press(screen.getByRole('button', { name: 'Save workout' }));
      expect(isClosed()).toBe(true);
      expect(await screen.findByLabelText('Open workout Easy run')).toBeDisabled();
      expect(screen.getByText('Saving…')).toBeOnTheScreen();
      expect(screen.getByText('👟')).toBeOnTheScreen();
      await act(() => client.invalidateQueries({ queryKey: queryKeys.calendar('runner@example.com') }));
      expect(screen.getByLabelText('Open workout Easy run')).toBeOnTheScreen();
      release();
      await waitFor(() => expect(screen.getByLabelText('Open workout Easy run')).toBeEnabled());
      expect(screen.queryByText('Saving…')).toBeNull();
    } finally { release(); }
  });

  it.each(['2026-04-08', '2026-09-08'])('keeps an upsert outside loaded windows after refresh when today is %s', async (today) => {
    vi.setSystemTime(new Date(`${today}T09:00:00`));
    const targetDate = '2026-08-14';
    let saved = false;
    const other = { id: 'event-99', name: 'Another run', type: 'planned', category: 'easy', date: new Date().toISOString() };
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), ({ request }) => {
        const url = new URL(request.url);
        const workout = saved
          ? { id: 'event-42', name: 'Long run', type: 'planned', category: 'long', date: `${targetDate}T12:00:00` }
          : { id: 'event-42', name: 'Old workout', type: 'planned', category: 'easy', date: new Date().toISOString() };
        return HttpResponse.json([other, workout].filter((event) => {
          const day = event.date.slice(0, 10);
          return day >= url.searchParams.get('oldest')! && day <= url.searchParams.get('newest')!;
        }));
      }),
      http.post(apiUrl('/api/intervals/events'), () => { saved = true; return HttpResponse.json({ newId: 42 }); }),
    );
    const { client } = await setup();
    await screen.findByLabelText('Open workout Old workout');
    await fireEvent.press(screen.getByLabelText('Change workout date'));
    await fireEvent.press(screen.getByLabelText('Choose workout date'));
    await fireEvent.press(await screen.findByLabelText('Create Long workout'));
    await screen.findByText('Long run');
    await fireEvent.press(screen.getByRole('button', { name: 'Save workout' }));
    await waitFor(() => expect(screen.getByLabelText('Open workout Long run')).toBeEnabled());
    await fireEvent.press(screen.getByRole('button', { name: 'Load earlier' }));
    await waitFor(() => expect(client.isFetching({ queryKey: queryKeys.calendar('runner@example.com') })).toBe(0));
    await act(() => client.invalidateQueries({ queryKey: queryKeys.calendar('runner@example.com') }));
    expect(screen.getAllByLabelText('Open workout Long run')).toHaveLength(1);
    expect(screen.queryByLabelText('Open workout Old workout')).toBeNull();
    expect(screen.getByLabelText('Open workout Another run')).toBeOnTheScreen();
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
