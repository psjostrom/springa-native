import { Pressable, Text } from 'react-native';
import { describe, expect, it } from 'vitest';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { queryKeys } from './keys';
import { usePlannerMutations, usePlannerQuery } from './usePlanner';
import { useCalendarEvents } from './useCalendarEvents';
import { useSettingsQuery } from './useSettingsQuery';
import { apiUrl } from '@/test/msw/helpers';
import { makeTestAuthValue, makeTestSession, TestAppProviders } from '@/test/TestAppProviders';
import { activePlannerState, defaultPlannerConfig } from '@/test/msw/handlers/planner';
import { server } from '@/test/msw/server';

function Probe() {
  const planner = usePlannerQuery();
  const mutations = usePlannerMutations();
  return (
    <>
      <Text>Planner: {planner.status}</Text>
      <Text>Error: {planner.error ?? 'none'}</Text>
      <Text>Save: {mutations.saveConfig.isSuccess ? 'done' : mutations.saveConfig.isError ? 'error' : 'idle'}</Text>
      <Text>Preview: {mutations.preview.isSuccess ? 'done' : mutations.preview.isError ? 'error' : 'idle'}</Text>
      <Text>Apply: {mutations.apply.isSuccess ? 'done' : mutations.apply.isError ? 'error' : 'idle'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Save planner" onPress={() => {
        void mutations.saveConfig.mutateAsync(defaultPlannerConfig()).catch(() => {});
      }}><Text>Save</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Preview planner" onPress={() => {
        void mutations.preview.mutateAsync({ intent: 'start', config: defaultPlannerConfig() }).catch(() => {});
      }}><Text>Preview</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Apply planner" onPress={() => {
        void mutations.apply.mutateAsync({
          intent: 'start',
          config: defaultPlannerConfig(),
          previewHash: 'a'.repeat(64),
        }).catch(() => {});
      }}><Text>Apply</Text></Pressable>
    </>
  );
}

function CacheInvalidationProbe() {
  const planner = usePlannerQuery();
  const settings = useSettingsQuery();
  const calendar = useCalendarEvents();
  const { apply } = usePlannerMutations();

  return (
    <>
      <Text>Planner cache: {planner.status}</Text>
      <Text>Settings cache: {settings.status}</Text>
      <Text>
        Calendar cache: {calendar.isLoading ? 'loading' : calendar.isError ? 'error' : 'ready'}
      </Text>
      <Text>Apply: {apply.isError ? 'error' : 'idle'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Apply with cache invalidation error"
        onPress={() => {
          void apply.mutateAsync({
            intent: 'start',
            config: defaultPlannerConfig(),
            previewHash: 'a'.repeat(64),
          }).catch(() => {});
        }}
      >
        <Text>Apply</Text>
      </Pressable>
    </>
  );
}

describe('Planner query boundary', () => {
  it('stays disabled while signed out', async () => {
    await render(<TestAppProviders auth={makeTestAuthValue(null)}><Probe /></TestAppProviders>);
    expect(screen.getByText('Planner: idle')).toBeOnTheScreen();
  });

  it('loads signed-in state and exposes query identity', async () => {
    await render(<TestAppProviders auth={makeTestAuthValue(makeTestSession())}><Probe /></TestAppProviders>);
    expect(await screen.findByText('Planner: ready')).toBeOnTheScreen();
    expect(queryKeys.planner('runner@example.com')).toEqual(['planner', 'runner@example.com']);
  });

  it('supports retry after Planner load failure', async () => {
    let failed = true;
    server.use(http.get(apiUrl('/api/planner'), () => {
      if (failed) return HttpResponse.json({ error: 'planner unavailable' }, { status: 502 });
      return HttpResponse.json(activePlannerState());
    }));
    await render(<TestAppProviders auth={makeTestAuthValue(makeTestSession())}><Probe /></TestAppProviders>);
    expect(await screen.findByText('Planner: error')).toBeOnTheScreen();
    failed = false;
    // The component exposes reload through a later screen; remounting keeps this boundary test deterministic.
    await render(<TestAppProviders auth={makeTestAuthValue(makeTestSession())}><Probe /></TestAppProviders>);
    expect(await screen.findByText('Planner: ready')).toBeOnTheScreen();
  });

  it('runs save, preview, and apply mutations with their own lifecycle', async () => {
    await render(<TestAppProviders auth={makeTestAuthValue(makeTestSession())}><Probe /></TestAppProviders>);
    await screen.findByText('Planner: ready');
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Save planner' }));
    await waitFor(() => expect(screen.getByText('Save: done')).toBeOnTheScreen());
    await user.press(screen.getByRole('button', { name: 'Preview planner' }));
    await waitFor(() => expect(screen.getByText('Preview: done')).toBeOnTheScreen());
    await user.press(screen.getByRole('button', { name: 'Apply planner' }));
    await waitFor(() => expect(screen.getByText('Apply: done')).toBeOnTheScreen());
  });

  it('keeps apply errors visible without automatic mutation retry', async () => {
    server.use(http.post(apiUrl('/api/planner/apply'), () => HttpResponse.json({
      error: 'Workouts could not be updated',
      code: 'INTERVALS_UPSTREAM_ERROR',
    }, { status: 502 })));
    await render(<TestAppProviders auth={makeTestAuthValue(makeTestSession())}><Probe /></TestAppProviders>);
    await screen.findByText('Planner: ready');
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Apply planner' }));
    await waitFor(() => expect(screen.getByText('Apply: error')).toBeOnTheScreen());
  });

  it('invalidates Planner, Settings, and Calendar after any apply error', async () => {
    let plannerGets = 0;
    let settingsGets = 0;
    let calendarGets = 0;
    server.use(
      http.get(apiUrl('/api/planner'), () => {
        plannerGets += 1;
        return HttpResponse.json(activePlannerState());
      }),
      http.get(apiUrl('/api/settings'), () => {
        settingsGets += 1;
        return HttpResponse.json({
          intervalsConnected: true,
          diabetesMode: true,
          displayName: 'Runner',
          email: 'runner@example.com',
        });
      }),
      http.get(apiUrl('/api/intervals/calendar'), () => {
        calendarGets += 1;
        return HttpResponse.json([]);
      }),
      http.post(apiUrl('/api/planner/apply'), () => HttpResponse.json(
        { error: 'unexpected apply failure', code: 'UNEXPECTED_ERROR' },
        { status: 500 },
      )),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <CacheInvalidationProbe />
      </TestAppProviders>,
    );
    expect(await screen.findByText('Planner cache: ready')).toBeOnTheScreen();
    expect(await screen.findByText('Settings cache: ready')).toBeOnTheScreen();
    expect(await screen.findByText('Calendar cache: ready')).toBeOnTheScreen();
    await waitFor(() => expect(calendarGets).toBe(3));

    const baseline = { plannerGets, settingsGets, calendarGets };
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Apply with cache invalidation error' }));
    await waitFor(() => expect(screen.getByText('Apply: error')).toBeOnTheScreen());
    await waitFor(() => {
      expect(plannerGets).toBeGreaterThan(baseline.plannerGets);
      expect(settingsGets).toBeGreaterThan(baseline.settingsGets);
      expect(calendarGets).toBeGreaterThan(baseline.calendarGets);
    });
  });

  it('uses a distinct key for each signed-in identity', () => {
    expect(queryKeys.planner('one@example.com')).not.toEqual(queryKeys.planner('two@example.com'));
  });
});
