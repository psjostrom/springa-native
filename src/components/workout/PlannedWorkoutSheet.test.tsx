import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import type { CalendarEvent } from '@/api/types';
import {
  PlannedWorkoutSheet,
  type PlannedWorkoutActions,
} from './PlannedWorkoutSheet';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import { defaultPlannedWorkoutDetail } from '@/test/msw/handlers/plannedWorkout';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';
import { SpringaColors } from '@/theme/colors';
import { Typography } from '@/theme/tokens';
import { PreRunCarbsRow } from './PreRunCarbsRow';

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
  onActionsReady?: (actions: PlannedWorkoutActions | null) => void,
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

describe('PlannedWorkoutSheet', () => {
  it('renders the compact workout summary from general primitives', async () => {
    await renderSheet();

    expect(await screen.findByLabelText('Workout metrics')).toHaveStyle({
      backgroundColor: SpringaColors.tintBrand,
      borderColor: `${SpringaColors.brand}66`,
    });
    expect(screen.getByText('Duration')).toHaveStyle(Typography.label);
    expect(screen.getByText('65m')).toHaveStyle(Typography.subheading);
    expect(screen.getByText('Distance')).toHaveStyle(Typography.label);
    expect(screen.getByText('~9.2 km')).toHaveStyle(Typography.subheading);
  });

  it('keeps the Recovery zone label on one line', async () => {
    const detail = defaultPlannedWorkoutDetail();
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), () =>
        HttpResponse.json({
          ...detail,
          structure: {
            ...detail.structure,
            sections: [
              {
                name: 'Main set',
                repeats: null,
                steps: [{ label: null, duration: '200m', zone: 'z1', detail: '' }],
              },
            ],
          },
        }),
      ),
    );

    await renderSheet();

    expect(await screen.findByText('Recovery')).toHaveProp('numberOfLines', 1);
  });

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
    expect(screen.queryByText('No timeline available.')).toBeNull();
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

  it('saves pre-run carbs from keyboard Done without a synthetic blur', async () => {
    let savedBody: { carbsG: number | null } | null = null;
    server.use(
      http.post(apiUrl('/api/prerun-carbs'), async ({ request }) => {
        savedBody = (await request.json()) as { carbsG: number | null };
        return HttpResponse.json({ ok: true });
      }),
    );

    await renderSheet();
    const user = userEvent.setup();
    await screen.findByText('Workout structure');
    await user.press(screen.getByLabelText('Edit pre-run carbs'));
    const input = screen.getByLabelText('Pre-run carbs grams');
    await fireEvent.changeText(input, '35');
    await fireEvent(input, 'submitEditing');

    await waitFor(() => expect(savedBody).toMatchObject({ carbsG: 35 }));
    expect(await screen.findByText('35 g')).toBeOnTheScreen();
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
    let startDateLocal = '2026-08-13T12:00:00';
    const actionsRef = { current: null as PlannedWorkoutActions | null };
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), () => {
        const detail = defaultPlannedWorkoutDetail();
        return HttpResponse.json({
          ...detail,
          event: { ...detail.event, startDateLocal },
        });
      }),
      http.put(apiUrl('/api/intervals/events/:id'), async ({ request }) => {
        movedTo = String(((await request.json()) as { start_date_local: string }).start_date_local);
        startDateLocal = movedTo;
        return HttpResponse.json({ ok: true });
      }),
    );

    await renderSheet(() => {}, {}, (actions) => {
      actionsRef.current = actions;
    });
    const user = userEvent.setup();
    await screen.findByText('Workout structure');
    await act(async () => actionsRef.current?.move());
    await user.press(await screen.findByLabelText('Select move date'));
    await user.press(await screen.findByLabelText('Select move date'));

    await waitFor(() => expect(movedTo).toBe('2026-08-14T12:00:00'));
    expect(await screen.findByText('Friday, 14 August 2026 at 12:00')).toBeOnTheScreen();
    expect(screen.queryByText('Workout moved.')).toBeNull();
    expect(screen.queryByLabelText('Move workout editor')).toBeNull();
  });

  it('scrolls the carbs field above the keyboard when it receives focus', async () => {
    const onInputFocus = vi.fn();
    await render(
      <PreRunCarbsRow
        value={25}
        pending={false}
        onSave={async () => {}}
        onInputFocus={onInputFocus}
      />,
    );
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Edit pre-run carbs'));
    fireEvent(screen.getByLabelText('Pre-run carbs grams'), 'focus', {
      nativeEvent: { target: 42 },
    });

    expect(onInputFocus).toHaveBeenCalledWith(42);
  });

  it('takes manual control of Android focus scrolling', async () => {
    await renderSheet();

    expect(await screen.findByLabelText('Planned workout details')).toHaveProp(
      'scrollsChildToFocus',
      false,
    );
  });

  it('does not commit a partial Android picker selection when dismissed', async () => {
    const actionsRef = { current: null as PlannedWorkoutActions | null };
    await renderSheet(() => {}, {}, (actions) => {
      actionsRef.current = actions;
    });
    const user = userEvent.setup();
    await screen.findByText('Workout structure');
    await act(async () => actionsRef.current?.move());

    await user.press(await screen.findByLabelText('Select move date'));
    await user.press(screen.getByLabelText('Cancel native date picker'));

    expect(screen.queryByText('Workout moved.')).toBeNull();
    expect(screen.queryByLabelText('Move workout editor')).toBeNull();
  });

  it('replaces a workout from a server-owned category choice', async () => {
    let replacementCategory = '';
    const actionsRef = { current: null as PlannedWorkoutActions | null };
    server.use(
      http.post(apiUrl('/api/intervals/events/replace'), async ({ request }) => {
        const body = (await request.json()) as { category: string };
        replacementCategory = body.category;
        return HttpResponse.json({ newId: 123 });
      }),
    );

    await renderSheet(() => {}, {}, (actions) => {
      actionsRef.current = actions;
    });
    await screen.findByText('Workout structure');
    await act(async () => actionsRef.current?.replace('quality'));

    expect(await screen.findByText('Workout replaced.')).toBeOnTheScreen();
    expect(replacementCategory).toBe('quality');
  });

  it('shows selected replacement as pending and hides stale workout content', async () => {
    let finishReplacement: (() => void) | null = null;
    let replaced = false;
    const actionsRef = { current: null as PlannedWorkoutActions | null };
    server.use(
      http.post(apiUrl('/api/intervals/events/replace'), async () => {
        await new Promise<void>((resolve) => { finishReplacement = resolve; });
        replaced = true;
        return HttpResponse.json({ newId: 123 });
      }),
      http.get(apiUrl('/api/intervals/events/:id'), () => {
        const detail = defaultPlannedWorkoutDetail();
        return HttpResponse.json(replaced
          ? {
              ...detail,
              event: { ...detail.event, name: 'W06 Easy' },
              replacementCategory: 'easy',
            }
          : detail);
      }),
    );

    await renderSheet(() => {}, {}, (actions) => {
      actionsRef.current = actions;
    });
    await screen.findByText('Workout structure');
    await act(async () => actionsRef.current?.replace('easy'));

    expect(await screen.findByText('Replacing with Easy…')).toBeOnTheScreen();
    expect(screen.queryByText('Workout structure')).toBeNull();
    (finishReplacement as (() => void) | null)?.();
    expect(await screen.findByText('W06 Easy')).toBeOnTheScreen();
    expect(screen.getByText('Workout structure')).toBeOnTheScreen();
  });

  it('closes after a successful registered delete action', async () => {
    let deleted = false;
    const close = vi.fn();
    const actionsRef = { current: null as PlannedWorkoutActions | null };
    server.use(
      http.delete(apiUrl('/api/intervals/events/:id'), () => {
        deleted = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    await renderSheet(close, {}, (actions) => {
      actionsRef.current = actions;
    });
    await screen.findByText('Workout structure');
    await act(async () => actionsRef.current?.deleteWorkout());

    await waitFor(() => expect(deleted).toBe(true));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('shows mutation error without closing the sheet', async () => {
    const close = vi.fn();
    const actionsRef = { current: null as PlannedWorkoutActions | null };
    server.use(
      http.delete(apiUrl('/api/intervals/events/:id'), () =>
        HttpResponse.json({ error: 'Failed to delete event' }, { status: 502 }),
      ),
    );

    await renderSheet(close, {}, (actions) => {
      actionsRef.current = actions;
    });
    await screen.findByText('Workout structure');
    await act(async () => actionsRef.current?.deleteWorkout());

    expect(await screen.findByText('Failed to delete event')).toBeOnTheScreen();
    expect(close).not.toHaveBeenCalled();
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
    expect(screen.queryByText('Timeline')).toBeNull();
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

  it('keeps the planned header visible while detail loads', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/events/:id'), async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return HttpResponse.json(defaultPlannedWorkoutDetail());
      }),
    );

    await renderSheet();

    expect(screen.getByText(/13 August 2026/)).toBeOnTheScreen();
    expect(screen.getByText('Threshold intervals')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Workout actions')).toBeNull();
  });

  it('registers actions for the native stack header', async () => {
    const actionsRef = { current: null as PlannedWorkoutActions | null };
    await renderSheet(() => {}, {}, (actions) => {
      actionsRef.current = actions;
    });

    await screen.findByText('Workout structure');
    expect(screen.queryByLabelText('Workout actions')).toBeNull();
    expect(actionsRef.current).toMatchObject({
      pending: false,
      move: expect.any(Function),
      replace: expect.any(Function),
      deleteWorkout: expect.any(Function),
    });
  });

  it('uses server local time for loaded detail header', async () => {
    await renderSheet(() => {}, { date: new Date(2026, 7, 13, 14, 0) });

    expect(await screen.findByText('Thursday, 13 August 2026 at 12:00')).toBeOnTheScreen();
    expect(screen.queryByText('Thursday, 13 August 2026 at 14:00')).toBeNull();
  });
});
