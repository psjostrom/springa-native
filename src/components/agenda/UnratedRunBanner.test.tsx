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
    date: new Date().toISOString(),
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

  it('dismisses banner when X is pressed', async () => {
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () =>
        jsonOk([makeCompleted()]),
      ),
    );

    const user = userEvent.setup();
    await renderBanner();

    expect(await screen.findByTestId('unrated-run-banner')).toBeOnTheScreen();
    await user.press(screen.getByTestId('dismiss-unrated-banner'));
    expect(screen.queryByTestId('unrated-run-banner')).toBeNull();
  });
});
