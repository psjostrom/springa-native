import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { CalendarEvent } from '@/api/types';
import { CompletedFeedback } from './CompletedFeedback';

const event: CalendarEvent = {
  id: 'event-123',
  date: new Date('2026-08-13T12:00:00'),
  name: 'Morning easy run',
  description: '',
  type: 'completed',
  category: 'easy',
  activityId: 'activity-123',
  rating: null,
  feedbackComment: null,
};

function renderFeedback(
  overrides: Partial<CalendarEvent> = {},
  saveFeedback = vi.fn(),
  pending = false,
  error: string | null = null,
) {
  return render(
    <CompletedFeedback
      event={{ ...event, ...overrides }}
      saveFeedback={saveFeedback}
      pending={pending}
      error={error}
    />,
  );
}

describe('CompletedFeedback', () => {
  it('shows the saved rating and comment', async () => {
    await renderFeedback({ rating: 'good', feedbackComment: 'Felt strong' });

    expect(screen.getByText('Good')).toBeOnTheScreen();
    expect(screen.getByText('Felt strong')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeOnTheScreen();
  });

  it('shows a saved bad rating without a comment', async () => {
    await renderFeedback({ rating: 'bad', feedbackComment: null });

    expect(screen.getByText('Bad')).toBeOnTheScreen();
    expect(screen.queryByText('Felt strong')).not.toBeOnTheScreen();
  });

  it('saves a selected rating with the typed comment', async () => {
    const saveFeedback = vi.fn();
    await renderFeedback({}, saveFeedback);

    await fireEvent.press(screen.getByRole('button', { name: 'Good' }));
    await fireEvent.changeText(screen.getByLabelText('Feedback comment'), 'Felt strong');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(saveFeedback).toHaveBeenCalledWith({ rating: 'good', comment: 'Felt strong' });
  });

  it('marks the selected rating as selected for assistive technologies', async () => {
    await renderFeedback();

    expect(screen.getByRole('button', { name: 'Good', selected: false })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Bad', selected: false })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Good' }));
    expect(screen.getByRole('button', { name: 'Good', selected: true })).toBeOnTheScreen();
  });

  it('keeps Save disabled until a rating is selected', async () => {
    await renderFeedback();

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Bad' }));
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });

  it('disables the form while pending', async () => {
    await renderFeedback({}, vi.fn(), true);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Good' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bad' })).toBeDisabled();
  });

  it('exposes save errors as alert text', async () => {
    await renderFeedback({}, vi.fn(), false, 'Save failed');

    expect(screen.getByText('Save failed')).toBeOnTheScreen();
    expect(screen.getByText('Save failed')).toHaveProp('accessibilityRole', 'alert');
  });

});
