import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react-native';
import { http } from 'msw';
import { server } from '@/test/msw/server';
import { apiUrl, jsonOk } from '@/test/msw/helpers';
import {
  clearRouterHistoryForTests,
  setLocalSearchParamsForTests,
} from '@/test/ExpoRouterTestDouble';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';
import FeedbackScreen from '@/app/feedback';

const completedEvent = {
  id: 'evt-1',
  activityId: 'act-1',
  name: 'Morning Easy Run',
  description: '',
  date: new Date().toISOString(),
  type: 'completed',
  category: 'easy',
  distance: 7200,
  duration: 2400,
  avgHr: 144,
  rating: null,
  feedbackComment: null,
};

function renderScreen() {
  return render(
    <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
      <FeedbackScreen />
    </TestAppProviders>,
  );
}

describe('FeedbackScreen', () => {
  beforeEach(() => {
    clearRouterHistoryForTests();
  });

  it('renders FeedbackForm for matching event', async () => {
    setLocalSearchParamsForTests({ activityId: 'act-1', eventId: 'evt-1' });
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () =>
        jsonOk([completedEvent]),
      ),
      http.get(apiUrl('/api/intervals/activity/:id/overview'), () =>
        jsonOk({
          activityId: 'act-1',
          feel: 2,
          rpe: 6,
          reportCard: { bg: null, hrZone: null, entryTrend: null, recovery: null },
          splits: null,
          preRunCarbs: { grams: null, source: 'none', fallbackEventId: null },
        }),
      ),
    );

    await renderScreen();

    expect(await screen.findByText('How was the run?')).toBeOnTheScreen();
    expect(screen.getByText('Morning Easy Run')).toBeOnTheScreen();
    expect(screen.getByText(/Garmin Receipt: Strong · RPE 6\/10/)).toBeOnTheScreen();
  });

  it('renders Run not found when event does not match', async () => {
    setLocalSearchParamsForTests({ activityId: 'non-existent' });
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () => jsonOk([])),
    );

    await renderScreen();

    expect(await screen.findByText('Run not found')).toBeOnTheScreen();
  });

  it('prefills basal strategy from lastProtocols for unrated run with category', async () => {
    setLocalSearchParamsForTests({ activityId: 'act-1', eventId: 'evt-1' });
    server.use(
      http.get(apiUrl('/api/intervals/calendar'), () =>
        jsonOk([{ ...completedEvent, category: 'long' }]),
      ),
      http.get(apiUrl('/api/intervals/activity/:id/overview'), () =>
        jsonOk({
          activityId: 'act-1',
          feel: 2,
          rpe: 6,
          reportCard: { bg: null, hrZone: null, entryTrend: null, recovery: null },
          splits: null,
          preRunCarbs: { grams: null, source: 'none', fallbackEventId: null },
          protocol: null,
          lastProtocols: {
            long: {
              category: 'long',
              beforeMode: 'manual',
              beforeManualUh: 0.22,
              beforeTiming: '>2h',
              duringSame: true,
            },
          },
        }),
      ),
    );

    await renderScreen();

    expect(await screen.findByText('How was the run?')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('0.22')).toBeOnTheScreen();
  });
});
