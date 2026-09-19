import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { CalendarEvent, WorkoutProtocol } from '@/api/types';
import {
  clearRouterHistoryForTests,
  getRouterHistoryForTests,
} from '@/test/ExpoRouterTestDouble';
import { CompletedFeedback } from './CompletedFeedback';

const baseEvent: CalendarEvent = {
  id: 'evt-1',
  activityId: 'act-1',
  date: new Date('2026-09-12T10:00:00Z'),
  name: 'Morning Easy Run',
  description: '',
  type: 'completed',
  category: 'easy',
  rating: null,
  feedbackComment: null,
};

describe('CompletedFeedback', () => {
  beforeEach(() => {
    clearRouterHistoryForTests();
  });

  it('renders unrated state with Rate button when not rated', async () => {
    const user = userEvent.setup();
    await render(<CompletedFeedback event={baseEvent} />);

    expect(screen.getByText('Run not yet rated')).toBeOnTheScreen();
    const rateButton = screen.getByRole('button', { name: 'Rate run' });
    expect(rateButton).toBeOnTheScreen();

    await user.press(rateButton);
    expect(getRouterHistoryForTests()).toContainEqual({
      pathname: '/feedback',
      params: { activityId: 'act-1', eventId: 'evt-1' },
    });
  });

  it('renders Garmin telemetry receipt and comment when rated', async () => {
    const user = userEvent.setup();
    await render(
      <CompletedFeedback
        event={{ ...baseEvent, feedbackComment: 'Smooth steady run' }}
        feel={2}
        rpe={6}
      />,
    );

    expect(screen.getByTestId('garmin-feel-badge')).toBeOnTheScreen();
    expect(screen.getByText(/Garmin: Strong · RPE 6\/10/)).toBeOnTheScreen();
    expect(screen.getByText('Smooth steady run')).toBeOnTheScreen();

    const editButton = screen.getByRole('button', { name: 'Edit feedback' });
    expect(editButton).toBeOnTheScreen();

    await user.press(editButton);
    expect(getRouterHistoryForTests()).toContainEqual({
      pathname: '/feedback',
      params: { activityId: 'act-1', eventId: 'evt-1' },
    });
  });

  it('renders rating thumbs when feel is absent but rating is saved', async () => {
    await render(
      <CompletedFeedback
        event={{ ...baseEvent, rating: 'good' }}
        feel={null}
        rpe={null}
      />,
    );

    expect(screen.getByText('Good')).toBeOnTheScreen();
  });

  it('does not render bad rating badge when rating is skipped', async () => {
    await render(
      <CompletedFeedback
        event={{ ...baseEvent, rating: 'skipped' }}
        feel={null}
        rpe={null}
      />,
    );

    expect(screen.queryByText('Bad')).toBeNull();
  });

  it('renders protocol pills when protocol is saved', async () => {
    const protocol: WorkoutProtocol = {
      beforeMode: 'auto',
      beforeAutoSubmode: 'ease_off',
      beforeTargetBg: 8.5,
      beforeTiming: '1-2h',
      duringSame: true,
      rescueCarbsG: 15,
    };

    await render(
      <CompletedFeedback
        event={baseEvent}
        protocol={protocol}
        feel={3}
      />,
    );

    expect(screen.getByText('Auto Ease off (8.5 mmol/L)')).toBeOnTheScreen();
    expect(screen.getByText('1–2h before')).toBeOnTheScreen();
    expect(screen.getByText('Rescue: 15g')).toBeOnTheScreen();
  });
});
