import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import IntelScreen from '@/app/(tabs)/intel';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';

describe('IntelScreen', () => {
  it('renders sections when data loads', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({
          intervalsConnected: true,
          diabetesMode: true,
          raceDate: '2026-11-20',
          totalWeeks: 18,
          includeBasePhase: false,
        }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <IntelScreen />
      </TestAppProviders>,
    );

    // Section headings
    expect(await screen.findByText('PHASE')).toBeOnTheScreen();
    expect(await screen.findByText('READINESS')).toBeOnTheScreen();
    expect(await screen.findByText('VOLUME')).toBeOnTheScreen();
    expect(await screen.findByText('BLOOD GLUCOSE')).toBeOnTheScreen();
    expect(await screen.findByText('PERSONAL BESTS')).toBeOnTheScreen();

    // Verify sub-components rendered
    expect(screen.getByText('Build Phase')).toBeOnTheScreen();
    expect(screen.getByText('Ready to train')).toBeOnTheScreen();
    expect(screen.getByText('1KM')).toBeOnTheScreen();
    expect(screen.getByText('LONGEST RUN')).toBeOnTheScreen();
  });

  it('hides BG section when diabetesMode is false', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({
          intervalsConnected: true,
          diabetesMode: false,
        }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <IntelScreen />
      </TestAppProviders>,
    );

    expect(await screen.findByText('READINESS')).toBeOnTheScreen();
    expect(screen.queryByText('BLOOD GLUCOSE')).toBeNull();
  });

  it('shows BG section with categories when diabetesMode is true', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({
          intervalsConnected: true,
          diabetesMode: true,
        }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <IntelScreen />
      </TestAppProviders>,
    );

    expect(await screen.findByText('BLOOD GLUCOSE')).toBeOnTheScreen();
    expect(screen.getByText('EASY')).toBeOnTheScreen();
    expect(screen.getByText('LONG')).toBeOnTheScreen();
    expect(screen.getByText('INTERVAL')).toBeOnTheScreen();
  });

  it('shows empty state when no completed runs and no wellness data', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({
          intervalsConnected: true,
          diabetesMode: false,
        }),
      ),
      http.get(apiUrl('/api/wellness'), () => HttpResponse.json([])),
      http.get(apiUrl('/api/intervals/calendar'), () => HttpResponse.json([])),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <IntelScreen />
      </TestAppProviders>,
    );

    expect(
      await screen.findByText('Complete your first run to unlock training insights'),
    ).toBeOnTheScreen();
  });

  it('opens readiness bottom sheet on metric tap', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({
          intervalsConnected: true,
          diabetesMode: false,
        }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <IntelScreen />
      </TestAppProviders>,
    );

    expect(await screen.findByText('READINESS')).toBeOnTheScreen();

    const user = userEvent.setup();
    const hrvCard = screen.getByLabelText(/HRV/);
    await user.press(hrvCard);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Heart Rate Variability measures nervous system recovery/,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('renders pace suggestion banner and handles accept', async () => {
    let accepted = false;
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({
          intervalsConnected: true,
          diabetesMode: false,
        }),
      ),
      http.post(apiUrl('/api/pace-suggestion/accept'), () => {
        accepted = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <IntelScreen />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Pace update available')).toBeOnTheScreen();
    expect(
      screen.getByText(/Threshold pace improved from 5:00\/km to 4:45\/km/),
    ).toBeOnTheScreen();

    const user = userEvent.setup();
    const updateBtn = screen.getByText('Update paces');
    await user.press(updateBtn);

    await waitFor(() => {
      expect(accepted).toBe(true);
    });
  });

  it('handles pace suggestion dismiss', async () => {
    let dismissed = false;
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({
          intervalsConnected: true,
          diabetesMode: false,
        }),
      ),
      http.post(apiUrl('/api/pace-suggestion/dismiss'), () => {
        dismissed = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <IntelScreen />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Pace update available')).toBeOnTheScreen();

    const user = userEvent.setup();
    const dismissBtn = screen.getByText('Not now');
    await user.press(dismissBtn);

    await waitFor(() => {
      expect(dismissed).toBe(true);
    });
  });

  it('shows error state with retry when calendar fails', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({
          intervalsConnected: true,
          diabetesMode: false,
        }),
      ),
      http.get(apiUrl('/api/intervals/calendar'), () =>
        HttpResponse.json({ message: 'Calendar sync failed' }, { status: 500 }),
      ),
    );

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <IntelScreen />
      </TestAppProviders>,
    );

    expect(await screen.findByText('Couldn’t load calendar')).toBeOnTheScreen();
    expect(screen.getByText('Retry')).toBeOnTheScreen();
  });
});
