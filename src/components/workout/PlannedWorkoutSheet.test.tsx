import { Alert } from 'react-native';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import type { CalendarEvent } from '@/api/types';
import { PlannedWorkoutSheet } from './PlannedWorkoutSheet';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import { defaultPlannedWorkoutDetail } from '@/test/msw/handlers/plannedWorkout';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';

const event: CalendarEvent = {
  id: 'event-123',
  date: new Date('2026-08-13T12:00:00'),
  name: 'Threshold intervals',
  description: '',
  type: 'planned',
  category: 'interval',
};

function renderSheet(
  onClose = () => {},
  eventOverrides: Partial<CalendarEvent> = {},
  onActionsReady?: (handler: (() => void) | null) => void,
) {
  return render(
    <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
      <PlannedWorkoutSheet
        event={{ ...event, ...eventOverrides }}
        onClose={onClose}
        onActionsReady={onActionsReady}
      />
    </TestAppProviders>,
  );
}

function detailWithCarbs(carbsG: number | null) {
  return { ...defaultPlannedWorkoutDetail(), preRunCarbsG: carbsG };
}

const nativeAlert = Alert.alert;

afterEach(() => {
  vi.restoreAllMocks();
  Alert.alert = nativeAlert;
});

function captureAlert() {
  const calls: Parameters<typeof Alert.alert>[] = [];
  Alert.alert = ((...args: Parameters<typeof Alert.alert>) => {
    calls.push(args);
  }) as typeof Alert.alert;
  return calls;
}

describe('PlannedWorkoutSheet', () => {
  it('renders empty derived fields and unavailable clothing without guessing', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), () =>
        HttpResponse.json({
          ...defaultPlannedWorkoutDetail(),
          structure: { sections: [], timeline: [] },
          metrics: {
            duration: null,
            distance: null,
            fuelRateGPerHour: null,
            prescribedCarbsG: null,
          },
          preRunCarbsG: null,
          clothing: { status: 'unavailable', reason: 'forecast-unavailable' },
        }),
      ),
    );

    await renderSheet();

    expect(await screen.findByText('No parsed structure available.')).toBeOnTheScreen();
    expect(screen.getByText('No timeline available.')).toBeOnTheScreen();
    expect(screen.getByText('Clothing unavailable: forecast unavailable.')).toBeOnTheScreen();
    expect(screen.getByText('Add')).toBeOnTheScreen();
    expect(screen.queryByText('65 min')).toBeNull();
  });

  it('retries a failed detail request', async () => {
    let attempts = 0;
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ error: 'temporary detail failure' }, { status: 502 })
          : HttpResponse.json(defaultPlannedWorkoutDetail());
      }),
    );

    await renderSheet();
    expect(await screen.findByText('Couldn’t load workout details')).toBeOnTheScreen();
    expect(screen.getByText('temporary detail failure')).toBeOnTheScreen();

    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Retry loading workout details'));

    expect(await screen.findByText('Workout structure')).toBeOnTheScreen();
    expect(attempts).toBe(2);
  });

  it('saves pre-run carbs when the inline editor blurs', async () => {
    let carbsG: number | null = 25;
    let savedBody: { carbsG: number | null } | null = null;
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), () =>
        HttpResponse.json(detailWithCarbs(carbsG)),
      ),
      http.post(apiUrl('/api/prerun-carbs'), async ({ request }) => {
        const body = (await request.json()) as { carbsG: number | null };
        savedBody = body;
        carbsG = body.carbsG;
        return HttpResponse.json({ ok: true });
      }),
    );

    await renderSheet();
    expect(await screen.findByText('25 g')).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Edit pre-run carbs'));
    const input = screen.getByLabelText('Pre-run carbs grams');
    await fireEvent.changeText(input, '30');
    await fireEvent(input, 'blur');
    await waitFor(() => expect(savedBody).not.toBeNull());
    expect(savedBody).toMatchObject({ carbsG: 30 });
    expect(await screen.findByText('30 g')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Save pre-run carbs')).toBeNull();
    expect(screen.queryByLabelText('Cancel pre-run carbs')).toBeNull();
    expect(screen.queryByLabelText('Clear pre-run carbs')).toBeNull();
  });

  it('rejects non-integer pre-run carbs locally', async () => {
    await renderSheet();
    const user = userEvent.setup();
    await screen.findByText('Workout structure');
    await user.press(screen.getByLabelText('Edit pre-run carbs'));
    const input = screen.getByLabelText('Pre-run carbs grams');
    await fireEvent.changeText(input, '2.5');
    await fireEvent(input, 'blur');

    expect(await screen.findByText('Use a whole number of grams.')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('2.5')).toBeOnTheScreen();
  });

  it('moves a workout with a local date-time value', async () => {
    let movedTo = '';
    server.use(
      http.put(apiUrl('/api/intervals/events/:id'), async ({ request }) => {
        movedTo = String(((await request.json()) as { start_date_local: string }).start_date_local);
        return HttpResponse.json({ ok: true });
      }),
    );

    await renderSheet();
    const user = userEvent.setup();
    await screen.findByText('Workout structure');
    await user.press(screen.getByLabelText('Workout actions'));
    expect(screen.getByText('Workout actions')).toBeOnTheScreen();
    await user.press(screen.getByLabelText('Move workout'));
    await user.press(await screen.findByLabelText('Select move date'));
    await user.press(await screen.findByLabelText('Select move date'));
    await user.press(screen.getByLabelText('Save moved workout'));

    await waitFor(() => expect(movedTo).toBe('2026-08-14T12:00:00'));
    expect(await screen.findByText('Workout moved.')).toBeOnTheScreen();
  });

  it('does not commit a partial Android picker selection when dismissed', async () => {
    await renderSheet();
    const user = userEvent.setup();
    await screen.findByText('Workout structure');
    await user.press(screen.getByLabelText('Workout actions'));
    await user.press(screen.getByLabelText('Move workout'));

    await user.press(await screen.findByLabelText('Select move date'));
    await user.press(screen.getByLabelText('Cancel native date picker'));

    expect(screen.getByLabelText('Move workout date')).toHaveTextContent(
      'Thursday, 13 August 2026 at 12:00',
    );
  });

  it('replaces a workout from a server-owned category choice', async () => {
    let replacementCategory = '';
    server.use(
      http.post(apiUrl('/api/intervals/events/replace'), async ({ request }) => {
        const body = (await request.json()) as { category: string };
        replacementCategory = body.category;
        return HttpResponse.json({ newId: 123 });
      }),
    );

    await renderSheet();
    const user = userEvent.setup();
    await screen.findByText('Workout structure');
    await user.press(screen.getByLabelText('Workout actions'));
    await user.press(screen.getByLabelText('Replace workout'));
    expect(screen.getByLabelText('Replace with Easy')).toBeOnTheScreen();
    expect(screen.getByLabelText('Replace with Quality')).toBeOnTheScreen();
    expect(screen.getByLabelText('Replace with Long')).toBeOnTheScreen();
    expect(screen.getByLabelText('Replace with Club Run')).toBeOnTheScreen();
    await user.press(screen.getByLabelText('Replace with Quality'));

    expect(await screen.findByText('Workout replaced.')).toBeOnTheScreen();
    expect(replacementCategory).toBe('quality');
  });

  it('confirms delete, closes after success, and retains sheet after failure', async () => {
    let deleted = false;
    const close = vi.fn();
    const alerts = captureAlert();
    server.use(
      http.delete(apiUrl('/api/intervals/events/:id'), () => {
        deleted = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <PlannedWorkoutSheet event={event} onClose={close} />
      </TestAppProviders>,
    );
    const user = userEvent.setup();
    await screen.findByText('Workout structure');
    await user.press(screen.getByLabelText('Workout actions'));
    await user.press(screen.getByLabelText('Delete workout'));
    await act(async () => {
      alerts[0]?.[2]?.find((button) => button.text === 'Delete')?.onPress?.();
    });

    await waitFor(() => expect(deleted).toBe(true));
    expect(close).toHaveBeenCalledTimes(1);
    expect(alerts).toHaveLength(1);
  });

  it('shows mutation error without closing the sheet', async () => {
    const close = vi.fn();
    const alerts = captureAlert();
    server.use(
      http.delete(apiUrl('/api/intervals/events/:id'), () =>
        HttpResponse.json({ error: 'Failed to delete event' }, { status: 502 }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <PlannedWorkoutSheet event={event} onClose={close} />
      </TestAppProviders>,
    );
    const user = userEvent.setup();
    await screen.findByText('Workout structure');
    await user.press(screen.getByLabelText('Workout actions'));
    await user.press(screen.getByLabelText('Delete workout'));
    await act(async () => {
      alerts[0]?.[2]?.find((button) => button.text === 'Delete')?.onPress?.();
    });

    expect(await screen.findByText('Failed to delete event')).toBeOnTheScreen();
    expect(close).not.toHaveBeenCalled();
    expect(alerts).toHaveLength(1);
  });

  it('uses one native presentation for easy workouts with rounded values', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), () =>
        HttpResponse.json({
          ...defaultPlannedWorkoutDetail(),
          event: { ...defaultPlannedWorkoutDetail().event, category: 'easy' },
          metrics: {
            ...defaultPlannedWorkoutDetail().metrics,
            distance: { km: 9.26, estimated: true },
          },
          structure: {
            ...defaultPlannedWorkoutDetail().structure,
            timeline: [
              {
                durationMinutes: 3.8683241188959747,
                intensityPercent: 92,
                zone: 'z4',
                estimated: true,
              },
            ],
          },
        }),
      ),
    );

    await renderSheet(() => {}, { category: 'easy', name: 'W05 Easy' });

    expect(await screen.findByLabelText('Native workout details')).toBeOnTheScreen();
    expect(screen.getByText('~9.3 km')).toBeOnTheScreen();
    expect(screen.getByLabelText('Edit pre-run carbs')).toBeOnTheScreen();
    expect(screen.getByLabelText('Z4, 3.9m, estimated')).toBeOnTheScreen();
    expect(screen.queryByText(/3\.868324/)).toBeNull();
    expect(screen.queryByText(/Z4 3\.9m/)).toBeNull();
  });

  it('renders notes below native workout structure without raw interval markup', async () => {
    const detail = defaultPlannedWorkoutDetail();
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), () =>
        HttpResponse.json({
          ...detail,
          event: {
            ...detail.event,
            description:
              'Track-style reps to sharpen your pace awareness.\n\nWarmup\n- Warmup 10m 7:08-20:55/km Pace intensity=warmup',
          },
        }),
      ),
    );

    await renderSheet();

    expect(await screen.findByLabelText('Native workout details')).toBeOnTheScreen();
    expect(screen.getByText('Workout structure')).toBeOnTheScreen();
    expect(screen.getByText('Track-style reps to sharpen your pace awareness.')).toBeOnTheScreen();
    expect(screen.queryByText('Workout summary')).toBeNull();
    expect(screen.queryByText(/intensity=warmup/)).toBeNull();
  });

  it('keeps the planned header and actions visible while detail loads', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return HttpResponse.json(defaultPlannedWorkoutDetail());
      }),
    );

    await renderSheet();

    expect(screen.getByText(/13 August 2026/)).toBeOnTheScreen();
    expect(screen.getByText('Threshold intervals')).toBeOnTheScreen();
    expect(screen.getByLabelText('Workout actions')).toBeOnTheScreen();
  });

  it('registers actions for the native stack header', async () => {
    const actionHandlerRef = { current: null as (() => void) | null };
    await renderSheet(() => {}, {}, (handler) => {
      actionHandlerRef.current = handler;
    });

    await screen.findByText('Workout structure');
    expect(screen.queryByLabelText('Workout actions')).toBeNull();
    const handler = actionHandlerRef.current;
    expect(handler).toEqual(expect.any(Function));
    if (handler == null) throw new Error('Native header action was not registered');
    await act(async () => handler());

    expect(await screen.findByText('Workout actions')).toBeOnTheScreen();
    expect(screen.getByLabelText('Replace workout')).toBeOnTheScreen();
  });

  it('uses server local time for loaded detail header', async () => {
    await renderSheet(() => {}, { date: new Date(2026, 7, 13, 14, 0) });

    expect(await screen.findByText('Thursday, 13 August 2026 at 12:00')).toBeOnTheScreen();
    expect(screen.queryByText('Thursday, 13 August 2026 at 14:00')).toBeNull();
  });
});
