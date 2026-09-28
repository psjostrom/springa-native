import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react-native';
import { PacePBs } from '@/components/intel/PacePBs';
import {
  clearRouterHistoryForTests,
  getRouterHistoryForTests,
} from '@/test/ExpoRouterTestDouble';

describe('PacePBs', () => {
  beforeEach(() => {
    clearRouterHistoryForTests();
  });

  const sampleBestEfforts = [
    {
      distance: 1000,
      label: '1km',
      timeSeconds: 245,
      pace: 4.08,
      activityId: 'act-101',
      activityName: 'Morning Speedwork',
      activityDate: '2026-08-12',
    },
    {
      distance: 5000,
      label: '5km',
      timeSeconds: 1320,
      pace: 4.4,
    },
  ];

  const sampleLongestRun = {
    distance: 21100,
    activityId: 'act-202',
    activityName: 'Sunday Long Run',
    activityDate: '2026-09-01',
    movingTime: 5400,
  };

  it('renders best efforts and longest run', async () => {
    const view = await render(
      <PacePBs bestEfforts={sampleBestEfforts} longestRun={sampleLongestRun} />,
    );

    expect(view.getByText('1KM')).toBeOnTheScreen();
    expect(view.getByText('5KM')).toBeOnTheScreen();
    expect(view.getByText('LONGEST RUN')).toBeOnTheScreen();
    expect(view.getByText('21.1 km')).toBeOnTheScreen();
  });

  it('navigates to workout when pressing a PB with activityId', async () => {
    const view = await render(
      <PacePBs bestEfforts={sampleBestEfforts} longestRun={sampleLongestRun} />,
    );

    const pbButton = view.getByLabelText('View 1km effort workout');
    fireEvent.press(pbButton);

    const history = getRouterHistoryForTests();
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual({
      pathname: '/workout/[id]',
      params: {
        id: 'act-101',
        name: 'Morning Speedwork',
        date: '2026-08-12',
      },
    });
  });

  it('navigates to workout when pressing longest run with activityId', async () => {
    const view = await render(
      <PacePBs bestEfforts={sampleBestEfforts} longestRun={sampleLongestRun} />,
    );

    const lrButton = view.getByLabelText('View longest run workout');
    fireEvent.press(lrButton);

    const history = getRouterHistoryForTests();
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual({
      pathname: '/workout/[id]',
      params: {
        id: 'act-202',
        name: 'Sunday Long Run',
        date: '2026-09-01',
      },
    });
  });

  it('does not navigate when PB has no activityId', async () => {
    const view = await render(
      <PacePBs bestEfforts={sampleBestEfforts} longestRun={sampleLongestRun} />,
    );

    expect(view.queryByLabelText('View 5km effort workout')).toBeNull();
  });
});
