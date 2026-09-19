import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, userEvent } from '@testing-library/react-native';
import { http } from 'msw';
import { server } from '@/test/msw/server';
import { apiUrl, jsonOk } from '@/test/msw/helpers';
import {
  clearRouterHistoryForTests,
  getRouterHistoryForTests,
} from '@/test/ExpoRouterTestDouble';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';
import { UnratedRunBanner } from './UnratedRunBanner';

function makeCompleted(overrides: Record<string, any> = {}) {
  return {
    id: 'evt-1',
    activityId: 'act-1',
    name: 'Morning Easy Run',
    description: '',
    date: new Date(Date.now() - 60_000).toISOString(),
    type: 'completed',
    category: 'easy',
    distance: 8000,
    duration: 2400,
    rating: null,
    feedbackComment: null,
    ...overrides,
  };
}

function renderBanner() {
  return render(
    <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
      <UnratedRunBanner />
    </TestAppProviders>,
  );
}

describe('UnratedRunBanner', () => {
  beforeEach(() => {
    clearRouterHistoryForTests();
  });

  it('renders nothing when no unrated run exists', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () =>
        jsonOk([makeCompleted({ rating: 'good' })]),
      ),
    );
    await renderBanner();
    expect(screen.queryByTestId('unrated-run-banner')).toBeNull();
  });

  it('renders banner when unrated run exists and navigates on Rate press', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () =>
        jsonOk([makeCompleted({ name: 'Morning Easy Run' })]),
      ),
    );

    const user = userEvent.setup();
    await renderBanner();

    expect(await screen.findByTestId('unrated-run-banner')).toBeOnTheScreen();
    expect(screen.getByText(/Morning Easy Run/)).toBeOnTheScreen();
    expect(screen.getByText(/— unrated/)).toBeOnTheScreen();

    await user.press(screen.getByTestId('rate-run-button'));
    expect(getRouterHistoryForTests()).toContainEqual({
      pathname: '/feedback',
      params: { activityId: 'act-1', eventId: 'evt-1' },
    });
  });

  it('permanently skips unrated run when X is pressed', async () => {
    let capturedBody: any = null;
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () =>
        jsonOk([makeCompleted()]),
      ),
      http.post(apiUrl('/api/run-feedback'), async ({ request }) => {
        capturedBody = await request.json();
        return jsonOk({ ok: true });
      }),
    );

    const user = userEvent.setup();
    await renderBanner();

    expect(await screen.findByTestId('unrated-run-banner')).toBeOnTheScreen();
    await user.press(screen.getByTestId('dismiss-unrated-banner'));
    expect(screen.queryByTestId('unrated-run-banner')).toBeNull();
    expect(capturedBody).toMatchObject({
      activityId: 'act-1',
      status: 'skipped',
      rating: 'skipped',
    });
  });

  it('shows next unrated run when X is pressed', async () => {
    const run1 = makeCompleted({
      id: 'evt-1',
      activityId: 'act-1',
      name: 'Tuesday Run',
      date: new Date(Date.now() - 60_000).toISOString(),
    });
    const run2 = makeCompleted({
      id: 'evt-2',
      activityId: 'act-2',
      name: 'Saturday Run',
      date: new Date(Date.now() - 120_000).toISOString(),
    });
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () => jsonOk([run1, run2])),
      http.post(apiUrl('/api/run-feedback'), () => jsonOk({ ok: true })),
    );

    const user = userEvent.setup();
    await renderBanner();

    expect(await screen.findByText(/Tuesday Run/)).toBeOnTheScreen();
    await user.press(screen.getByTestId('dismiss-unrated-banner'));
    expect(await screen.findByText(/Saturday Run/)).toBeOnTheScreen();
  });
});
