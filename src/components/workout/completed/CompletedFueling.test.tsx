import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { CalendarEvent, CompletedWorkoutOverview } from '@/api/types';
import { CompletedFueling } from './CompletedFueling';

const event: CalendarEvent = {
  id: 'event-123',
  date: new Date('2026-08-13T12:00:00'),
  name: 'Morning easy run',
  description: '',
  type: 'completed',
  category: 'easy',
  carbsIngested: 45,
  prescribedCarbsG: 60,
  preRunCarbsG: null,
  activityId: 'activity-123',
};

const preRun: CompletedWorkoutOverview['preRunCarbs'] = {
  grams: 30,
  source: 'activity',
  fallbackEventId: null,
};

function renderFueling(
  overrides: Partial<CalendarEvent> = {},
  preRunCarbs: CompletedWorkoutOverview['preRunCarbs'] | null = preRun,
  saveCarbs: (value: number) => Promise<void> = vi.fn(async () => {}),
  savePreRunCarbs: (value: number | null) => Promise<{ cleanupWarning: string | null }> = vi.fn(
    async () => ({ cleanupWarning: null }),
  ),
) {
  return render(
    <CompletedFueling
      event={{ ...event, ...overrides }}
      preRunCarbs={preRunCarbs}
      saveCarbs={saveCarbs}
      savePreRunCarbs={savePreRunCarbs}
    />,
  );
}

describe('CompletedFueling', () => {
  it('shows actual and planned carbs as separate labeled values', async () => {
    await renderFueling();

    expect(screen.getByText('Carbs ingested')).toBeOnTheScreen();
    expect(screen.getByText('45 g')).toBeOnTheScreen();
    expect(screen.getByText('Planned carbs')).toBeOnTheScreen();
    expect(screen.getByText('60 g')).toBeOnTheScreen();
  });

  it('shows the planned fallback when actual carbs are absent', async () => {
    await renderFueling({ carbsIngested: null });

    expect(screen.getByText('Add')).toBeOnTheScreen();
    expect(screen.getByText('Planned carbs')).toBeOnTheScreen();
    expect(screen.getByText('60 g')).toBeOnTheScreen();
  });

  it('omits the planned row when no prescribed carbs exist', async () => {
    await renderFueling({ prescribedCarbsG: null });

    expect(screen.queryByText('Planned carbs')).not.toBeOnTheScreen();
  });

  it('edits and saves ingested carbs', async () => {
    const saveCarbs = vi.fn(async () => {});
    await renderFueling({}, preRun, saveCarbs);

    await fireEvent.press(screen.getByLabelText('Edit carbs ingested'));
    const input = screen.getByLabelText('Carbs ingested grams');
    expect(input.props.value).toBe('45');

    await fireEvent.changeText(input, '50');
    await fireEvent(input, 'blur');

    await waitFor(() => expect(saveCarbs).toHaveBeenCalledWith(50));
  });

  it('starts the carbs editor blank when no value exists', async () => {
    await renderFueling({ carbsIngested: null });

    await fireEvent.press(screen.getByLabelText('Edit carbs ingested'));
    expect(screen.getByLabelText('Carbs ingested grams').props.value).toBe('');
  });

  it('rejects invalid carb input without saving', async () => {
    const saveCarbs = vi.fn(async () => {});
    await renderFueling({}, preRun, saveCarbs);

    await fireEvent.press(screen.getByLabelText('Edit carbs ingested'));
    const input = screen.getByLabelText('Carbs ingested grams');
    await fireEvent.changeText(input, '2.5');
    await fireEvent(input, 'blur');

    expect(await screen.findByText('Use a whole number of grams.')).toBeOnTheScreen();
    expect(saveCarbs).not.toHaveBeenCalled();
  });

  it('shows a local error when the carbs write fails', async () => {
    const saveCarbs = vi.fn(async () => {
      throw new Error('Intervals is unavailable');
    });
    await renderFueling({}, preRun, saveCarbs);

    await fireEvent.press(screen.getByLabelText('Edit carbs ingested'));
    const input = screen.getByLabelText('Carbs ingested grams');
    await fireEvent.changeText(input, '50');
    await fireEvent(input, 'blur');

    expect(await screen.findByText('Intervals is unavailable')).toBeOnTheScreen();
  });

  it('saves pre-run carbs and clears them with an empty input', async () => {
    const savePreRunCarbs = vi.fn(async () => ({ cleanupWarning: null }));
    await renderFueling({}, preRun, vi.fn(async () => {}), savePreRunCarbs);

    await fireEvent.press(screen.getByLabelText('Edit pre-run carbs'));
    const input = screen.getByLabelText('Pre-run carbs grams');
    expect(input.props.value).toBe('30');

    await fireEvent.changeText(input, '');
    await fireEvent(input, 'blur');

    await waitFor(() => expect(savePreRunCarbs).toHaveBeenCalledWith(null));
  });

  it('renders the pre-run source label from Overview data', async () => {
    await renderFueling({}, { grams: 45, source: 'activity', fallbackEventId: null });
    expect(screen.getByText('Activity')).toBeOnTheScreen();

    await renderFueling({}, { grams: 30, source: 'paired-event', fallbackEventId: 7 });
    expect(screen.getByText('Fallback')).toBeOnTheScreen();

    await renderFueling({}, { grams: null, source: 'none', fallbackEventId: null });
    expect(screen.getByText('Not recorded')).toBeOnTheScreen();
  });

  it('falls back to the Calendar pre-run value when Overview is not loaded', async () => {
    await renderFueling({ preRunCarbsG: 30 }, null);

    expect(screen.getByText('30 g')).toBeOnTheScreen();
    expect(screen.queryByText('Activity')).not.toBeOnTheScreen();
  });

  it('keeps the cleanup warning separate from write failures', async () => {
    const savePreRunCarbs = vi.fn(async () => ({
      cleanupWarning: 'Pre-run saved, but the old fallback value could not be cleared.',
    }));
    await renderFueling({}, preRun, vi.fn(async () => {}), savePreRunCarbs);

    await fireEvent.press(screen.getByLabelText('Edit pre-run carbs'));
    const input = screen.getByLabelText('Pre-run carbs grams');
    await fireEvent.changeText(input, '50');
    await fireEvent(input, 'blur');

    expect(
      await screen.findByText('Pre-run saved, but the old fallback value could not be cleared.'),
    ).toBeOnTheScreen();
  });

  it('shows a local error when the pre-run write fails', async () => {
    const savePreRunCarbs = vi.fn(async () => {
      throw new Error('Failed to save pre-run carbs.');
    });
    await renderFueling({}, preRun, vi.fn(async () => {}), savePreRunCarbs);

    await fireEvent.press(screen.getByLabelText('Edit pre-run carbs'));
    const input = screen.getByLabelText('Pre-run carbs grams');
    await fireEvent.changeText(input, '50');
    await fireEvent(input, 'blur');

    expect(await screen.findByText('Failed to save pre-run carbs.')).toBeOnTheScreen();
  });

  it('disables editors while a save is in flight', async () => {
    const saveCarbs = vi.fn(() => new Promise<void>(() => {}));
    await renderFueling({}, preRun, saveCarbs);

    await fireEvent.press(screen.getByLabelText('Edit carbs ingested'));
    const input = screen.getByLabelText('Carbs ingested grams');
    await fireEvent.changeText(input, '50');
    await fireEvent(input, 'blur');

    await waitFor(() => expect(screen.getByLabelText('Carbs ingested grams')).toBeDisabled());
  });
});
