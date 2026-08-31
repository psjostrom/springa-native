import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannerContent } from './PlannerContent';
import { apiUrl } from '@/test/msw/helpers';
import { makeTestAuthValue, makeTestSession, TestAppProviders } from '@/test/TestAppProviders';
import { blurRouteForTests } from '@/test/ExpoRouterTestDouble';
import { activePlannerState, replacePlanPreview } from '@/test/msw/handlers/planner';
import { server } from '@/test/msw/server';

beforeEach(() => {
  vi.setSystemTime(new Date('2026-08-25T12:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderPlanner() {
  return render(
    <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
      <PlannerContent />
    </TestAppProviders>,
  );
}

describe('Planner content', () => {
  it('renders active summary and learned/default fuel rates', async () => {
    await renderPlanner();

    expect(await screen.findByText('3 days/wk')).toBeOnTheScreen();
    expect(screen.getByText('Long: Sun')).toBeOnTheScreen();
    expect(screen.getByText('Stockholm Half 21.1km')).toBeOnTheScreen();
    expect(screen.getByText('13 wks to go')).toBeOnTheScreen();
    expect(screen.getByText('55 g/h')).toBeOnTheScreen();
    expect(screen.getByText('60 g/h (default)')).toBeOnTheScreen();
    expect(screen.queryByText(/Adapt Upcoming/i)).toBeNull();
  });

  it('keeps active edits draft-only and previews changed config directly', async () => {
    let settingsWrites = 0;
    let previewWrites = 0;
    let previewBody: unknown;
    server.use(http.put(apiUrl('/api/settings'), async ({ request }) => {
      settingsWrites += 1;
      await request.json();
      return HttpResponse.json({ ok: true });
    }), http.post(apiUrl('/api/planner/preview'), async ({ request }) => {
      previewWrites += 1;
      previewBody = await request.json();
      const preview = replacePlanPreview();
      preview.intent = 'update';
      preview.action = 'update-targets';
      return HttpResponse.json(preview);
    }));
    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Monday run day' }));
    expect(settingsWrites).toBe(0);
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));
    await waitFor(() => expect(previewWrites).toBe(1));
    expect(settingsWrites).toBe(0);
    expect(previewBody).toMatchObject({ intent: 'update', config: { runDays: [1, 2, 4, 0] } });
    expect(await screen.findByText('Ready to update')).toBeOnTheScreen();
    expect(screen.queryByText('Update future workouts to match your new settings?')).toBeNull();
    expect(screen.queryByText('Targets changed')).toBeNull();
  });

  it('collapses edits reverted to the current plan without writing or previewing', async () => {
    let settingsWrites = 0;
    let previewWrites = 0;
    server.use(
      http.put(apiUrl('/api/settings'), () => {
        settingsWrites += 1;
        return HttpResponse.json({ ok: true });
      }),
      http.post(apiUrl('/api/planner/preview'), () => {
        previewWrites += 1;
        return HttpResponse.json(replacePlanPreview());
      }),
    );

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Monday run day' }));
    await user.press(screen.getByRole('button', { name: 'Monday run day' }));
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));

    expect(settingsWrites).toBe(0);
    expect(previewWrites).toBe(0);
    expect(await screen.findByText('3 days/wk')).toBeOnTheScreen();
  });

  it('previews race-name-only edits without saving settings', async () => {
    let settingsWrites = 0;
    let previewWrites = 0;
    server.use(
      http.put(apiUrl('/api/settings'), () => {
        settingsWrites += 1;
        return HttpResponse.json({ ok: true });
      }),
      http.post(apiUrl('/api/planner/preview'), () => {
        previewWrites += 1;
        const preview = replacePlanPreview();
        preview.intent = 'update';
        return HttpResponse.json(preview);
      }),
    );

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    const raceName = screen.getByLabelText('Race name');
    await user.clear(raceName);
    await user.type(raceName, 'New race name');
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));

    await waitFor(() => expect(previewWrites).toBe(1));
    expect(settingsWrites).toBe(0);
    expect(await screen.findByText('Ready to update')).toBeOnTheScreen();
  });

  it('previews unchanged config when server sync is dirty', async () => {
    const state = activePlannerState();
    state.plan.sync = { status: 'dirty', dirtyKind: 'structural' };
    let settingsWrites = 0;
    let previewWrites = 0;
    server.use(
      http.get(apiUrl('/api/planner'), () => HttpResponse.json(state)),
      http.put(apiUrl('/api/settings'), () => {
        settingsWrites += 1;
        return HttpResponse.json({ ok: true });
      }),
      http.post(apiUrl('/api/planner/preview'), () => {
        previewWrites += 1;
        const preview = replacePlanPreview();
        preview.intent = 'update';
        return HttpResponse.json(preview);
      }),
    );

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));

    await waitFor(() => expect(previewWrites).toBe(1));
    expect(settingsWrites).toBe(0);
    expect(screen.queryByText('Targets changed')).toBeNull();
    expect(await screen.findByText('Ready to update')).toBeOnTheScreen();
  });

  it('cancels update preview back to original config without writing', async () => {
    let settingsWrites = 0;
    let applyWrites = 0;
    server.use(
      http.put(apiUrl('/api/settings'), () => {
        settingsWrites += 1;
        return HttpResponse.json({ ok: true });
      }),
      http.post(apiUrl('/api/planner/preview'), () => {
        const preview = replacePlanPreview();
        preview.intent = 'update';
        return HttpResponse.json(preview);
      }),
      http.post(apiUrl('/api/planner/apply'), () => {
        applyWrites += 1;
        return HttpResponse.json({ error: 'unexpected apply' }, { status: 500 });
      }),
    );

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Monday run day' }));
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));
    await user.press(await screen.findByRole('button', { name: 'Cancel' }));

    expect(settingsWrites).toBe(0);
    expect(applyWrites).toBe(0);
    expect(await screen.findByText('3 days/wk')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Edit planner settings' }));
    expect(screen.getByRole('button', { name: 'Monday run day' })).toHaveProp(
      'accessibilityState',
      { selected: false },
    );
  });

  it('keeps direct preview pending and errors in active editor', async () => {
    let previewWrites = 0;
    let resolvePreview: (() => void) | undefined;
    server.use(http.post(apiUrl('/api/planner/preview'), () => {
      previewWrites += 1;
      return new Promise((resolve) => {
        resolvePreview = () => resolve(HttpResponse.json({ error: 'preview unavailable' }, { status: 502 }));
      });
    }));

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Monday run day' }));
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));

    await waitFor(() => expect(previewWrites).toBe(1));
    expect(screen.getByRole('button', { name: 'Done editing planner' })).toHaveProp(
      'accessibilityState',
      { disabled: true, busy: true },
    );
    resolvePreview?.();
    expect(await screen.findByText('preview unavailable')).toBeOnTheScreen();
  });

  it('keeps a pending preview cancelled after its response arrives', async () => {
    let resolvePreview: (() => void) | undefined;
    server.use(http.post(apiUrl('/api/planner/preview'), () =>
      new Promise((resolve) => {
        resolvePreview = () => resolve(HttpResponse.json({
          ...replacePlanPreview(),
          intent: 'update',
        }));
      })));

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Monday run day' }));
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));
    await waitFor(() => expect(resolvePreview).toBeTypeOf('function'));
    await user.press(screen.getByRole('button', { name: 'Cancel' }));

    await act(async () => {
      resolvePreview?.();
      await Promise.resolve();
    });

    expect(screen.queryByText('Ready to update')).toBeNull();
    expect(screen.getByText('3 days/wk')).toBeOnTheScreen();
  });

  it('keeps a pending preview retry from reopening after edit', async () => {
    let previewWrites = 0;
    let resolveRetry: (() => void) | undefined;
    server.use(
      http.post(apiUrl('/api/planner/preview'), () => {
        previewWrites += 1;
        if (previewWrites === 1) {
          return HttpResponse.json({ ...replacePlanPreview(), intent: 'update' });
        }
        return new Promise((resolve) => {
          resolveRetry = () => resolve(HttpResponse.json({
            ...replacePlanPreview(),
            intent: 'update',
          }));
        });
      }),
      http.post(apiUrl('/api/planner/apply'), () => HttpResponse.json(
        { error: 'Preview changed' },
        { status: 409 },
      )),
    );

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Monday run day' }));
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));
    await user.press(await screen.findByRole('button', { name: 'Update Workouts' }));
    await user.press(await screen.findByRole('button', { name: 'Preview again' }));
    await waitFor(() => expect(resolveRetry).toBeTypeOf('function'));
    await user.press(screen.getByRole('button', { name: 'Edit' }));

    await act(async () => {
      resolveRetry?.();
      await Promise.resolve();
    });

    expect(screen.queryByText('Ready to update')).toBeNull();
    expect(screen.getByRole('button', { name: 'Done editing planner' })).toBeOnTheScreen();
  });

  it('collapses stale existing plan without writing when unchanged', async () => {
    vi.setSystemTime(new Date('2026-08-27T12:00:00'));
    const stale = activePlannerState();
    stale.currentConfig = {
      ...stale.currentConfig!,
      raceDate: '2026-10-18',
      totalWeeks: 9,
      includeBasePhase: false,
    };
    stale.newProgramDraft = stale.currentConfig;
    let settingsWrites = 0;
    server.use(
      http.get(apiUrl('/api/planner'), () => HttpResponse.json(stale)),
      http.put(apiUrl('/api/settings'), () => {
        settingsWrites += 1;
        return HttpResponse.json({ ok: true });
      }),
    );

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));

    expect(settingsWrites).toBe(0);
    expect(screen.queryByText('Plan length must match race date.')).toBeNull();
    expect(screen.getByText('3 days/wk')).toBeOnTheScreen();
  });

  it('previews schedule edits with existing plan length unchanged', async () => {
    vi.setSystemTime(new Date('2026-08-27T12:00:00'));
    const stale = activePlannerState();
    stale.currentConfig = {
      ...stale.currentConfig!,
      raceDate: '2026-10-18',
      totalWeeks: 16,
      includeBasePhase: false,
    };
    let previewWrites = 0;
    let previewBody: unknown;
    server.use(
      http.get(apiUrl('/api/planner'), () => HttpResponse.json(stale)),
      http.put(apiUrl('/api/settings'), () => HttpResponse.json({ ok: true })),
      http.post(apiUrl('/api/planner/preview'), async ({ request }) => {
        previewWrites += 1;
        previewBody = await request.json();
        const preview = replacePlanPreview();
        preview.intent = 'update';
        preview.action = 'update-targets';
        return HttpResponse.json(preview);
      }),
    );

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Monday run day' }));
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));

    await waitFor(() => expect(previewWrites).toBe(1));
    expect(screen.queryByRole('button', { name: 'Preview update' })).toBeNull();
    expect(previewBody).toMatchObject({ intent: 'update', config: { totalWeeks: 16 } });
    expect(await screen.findByText('Ready to update')).toBeOnTheScreen();
  });

  it('shows program updated until the planner loses focus', async () => {
    const state = activePlannerState();
    state.plan.sync = { status: 'dirty', dirtyKind: 'structural' };
    server.use(
      http.get(apiUrl('/api/planner'), () => HttpResponse.json(state)),
      http.post(apiUrl('/api/planner/preview'), () => {
        const preview = replacePlanPreview();
        preview.intent = 'update';
        preview.action = 'replace-plan';
        return HttpResponse.json(preview);
      }),
    );

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));
    await screen.findByText('Ready to update');
    await user.press(await screen.findByRole('button', { name: 'Update Workouts' }));

    expect(await screen.findByText('Program updated.')).toBeOnTheScreen();
    expect(screen.queryByText('Program started.')).toBeNull();

    await act(async () => blurRouteForTests());

    expect(screen.queryByText('Program updated.')).toBeNull();
  });

  it('shows program started until the planner loses focus', async () => {
    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Start New Program' }));
    await user.press(screen.getByRole('button', { name: 'Preview plan' }));
    await user.press(await screen.findByRole('button', { name: 'Start Program' }));

    expect(await screen.findByText('Program started.')).toBeOnTheScreen();

    await act(async () => blurRouteForTests());

    expect(screen.queryByText('Program started.')).toBeNull();
  });

  it('previews active race-date updates without changing plan length', async () => {
    vi.setSystemTime(new Date('2026-07-20T12:00:00'));
    const active = activePlannerState();
    active.currentConfig = {
      ...active.currentConfig!,
      raceDate: '2026-11-29',
      totalWeeks: 16,
      includeBasePhase: true,
    };
    let settingsWrites = 0;
    let previewWrites = 0;
    let previewBody: unknown;
    server.use(
      http.get(apiUrl('/api/planner'), () => HttpResponse.json(active)),
      http.put(apiUrl('/api/settings'), async ({ request }) => {
        settingsWrites += 1;
        await request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.post(apiUrl('/api/planner/preview'), async ({ request }) => {
        previewWrites += 1;
        previewBody = await request.json();
        const preview = replacePlanPreview();
        preview.intent = 'update';
        preview.action = 'update-targets';
        return HttpResponse.json(preview);
      }),
    );

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Choose race date' }));
    await user.press(screen.getAllByRole('button', { name: 'Choose race date' })[1]!);
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));

    await waitFor(() => expect(previewWrites).toBe(1));
    expect(settingsWrites).toBe(0);
    expect(previewBody).toMatchObject({
      intent: 'update',
      config: {
        raceDate: '2026-08-14',
        totalWeeks: 16,
        includeBasePhase: true,
      },
    });
    expect(await screen.findByText('Ready to update')).toBeOnTheScreen();
  });

  it('allows changed-date update preview retries with backend config', async () => {
    vi.setSystemTime(new Date('2026-08-27T12:00:00'));
    const stale = activePlannerState();
    stale.currentConfig = {
      ...stale.currentConfig!,
      raceDate: '2026-10-18',
      totalWeeks: 16,
      includeBasePhase: false,
    };
    let previewWrites = 0;
    const previewBodies: unknown[] = [];
    server.use(
      http.get(apiUrl('/api/planner'), () => HttpResponse.json(stale)),
      http.put(apiUrl('/api/settings'), () => HttpResponse.json({ ok: true })),
      http.post(apiUrl('/api/planner/preview'), async ({ request }) => {
        previewWrites += 1;
        previewBodies.push(await request.json());
        const preview = replacePlanPreview();
        preview.intent = 'update';
        preview.action = 'update-targets';
        preview.config = {
          ...preview.config,
          raceDate: '2026-11-01',
          totalWeeks: 9,
          includeBasePhase: false,
        };
        preview.summary = { ...preview.summary, raceDate: '2026-11-01', planWeeks: 9 };
        return HttpResponse.json(preview);
      }),
      http.post(apiUrl('/api/planner/apply'), () => HttpResponse.json(
        { error: 'Preview changed' },
        { status: 409 },
      )),
    );

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Monday run day' }));
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));
    await waitFor(() => expect(previewWrites).toBe(1));
    expect(screen.queryByRole('button', { name: 'Preview update' })).toBeNull();
    expect(previewBodies[0]).toMatchObject({ intent: 'update', config: { totalWeeks: 16 } });

    await user.press(screen.getByRole('button', { name: 'Update Workouts' }));
    await user.press(await screen.findByRole('button', { name: 'Preview again' }));

    await waitFor(() => expect(previewWrites).toBe(2));
    expect(previewBodies[1]).toMatchObject({
      intent: 'update',
      config: { raceDate: '2026-11-01', totalWeeks: 9 },
    });
    expect(screen.queryByRole('button', { name: 'Preview again' })).toBeNull();
    expect(await screen.findByText('Ready to update')).toBeOnTheScreen();
  });

  it('keeps new-program preview validation strict for a stale timeline', async () => {
    vi.setSystemTime(new Date('2026-08-27T12:00:00'));
    const stale = activePlannerState();
    stale.currentConfig = null;
    stale.newProgramDraft = {
      ...stale.newProgramDraft,
      raceDate: '2026-10-18',
      totalWeeks: 9,
      includeBasePhase: false,
    };
    let previewWrites = 0;
    server.use(
      http.get(apiUrl('/api/planner'), () => HttpResponse.json(stale)),
      http.post(apiUrl('/api/planner/preview'), () => {
        previewWrites += 1;
        return HttpResponse.json(replacePlanPreview());
      }),
    );

    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Start New Program' }));
    await user.press(screen.getByRole('button', { name: 'Preview plan' }));

    expect(screen.getByText('Plan length must match race date.')).toBeOnTheScreen();
    expect(previewWrites).toBe(0);
  });

  it('cancels planner settings without saving', async () => {
    let settingsWrites = 0;
    server.use(http.put(apiUrl('/api/settings'), () => {
      settingsWrites += 1;
      return HttpResponse.json({ ok: true });
    }));
    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('3 days/wk')).toBeOnTheScreen();
    expect(settingsWrites).toBe(0);
  });

  it('exposes native controls through their accessibility host', async () => {
    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));

    const clubRun = screen.getByRole('switch', { name: 'Club run' });
    expect(clubRun).toHaveProp('accessibilityState', { checked: false });
    await fireEvent(clubRun, 'accessibilityTap');
    expect(screen.getByRole('switch', { name: 'Club run' })).toHaveProp(
      'accessibilityState',
      { checked: true },
    );
  });

  it('previews a new program without saving settings and renders read-only rows', async () => {
    let settingsWrites = 0;
    let previewBody: unknown;
    server.use(
      http.put(apiUrl('/api/settings'), () => {
        settingsWrites += 1;
        return HttpResponse.json({ ok: true });
      }),
      http.post(apiUrl('/api/planner/preview'), async ({ request }) => {
        previewBody = await request.json();
        return HttpResponse.json(replacePlanPreview());
      }),
    );
    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Start New Program' }));
    expect(screen.getByText('Start new program')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Preview plan' }));
    expect(await screen.findByText('Ready to start')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Start Program' })).toBeOnTheScreen();
    expect(screen.queryByText('Reviewing new program preview')).toBeNull();
    // LegendList may not mount virtualized rows under Vitest; header is the gate.
    expect(screen.getAllByText('Week 1').length).toBeGreaterThan(0);
    expect(settingsWrites).toBe(0);
    expect(previewBody).toMatchObject({ intent: 'start', config: expect.any(Object) });
  });

  it('shows loading and retryable errors', async () => {
    let available = false;
    server.use(http.get(apiUrl('/api/planner'), () => available
      ? HttpResponse.json(activePlannerState())
      : HttpResponse.json({ error: 'planner unavailable' }, { status: 502 })));
    await renderPlanner();
    expect(await screen.findByText('Couldn’t load planner')).toBeOnTheScreen();
    available = true;
    await userEvent.setup().press(screen.getByRole('button', { name: 'Retry loading planner' }));
    expect(await screen.findByText('3 days/wk')).toBeOnTheScreen();
  });

  it('renders completed plans without a countdown', async () => {
    const completed = activePlannerState();
    completed.plan = {
      ...completed.plan,
      status: 'complete',
      weeksToGo: null,
      futureWorkoutCount: 0,
    };
    server.use(http.get(apiUrl('/api/planner'), () => HttpResponse.json(completed)));

    await renderPlanner();

    expect(await screen.findByText('Stockholm Half is complete.')).toBeOnTheScreen();
    expect(screen.getByText('Start a fresh plan for the next race without repeating account setup.')).toBeOnTheScreen();
    expect(screen.queryByText(/wks to go/)).toBeNull();
  });
});
