import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import type { CalendarEvent } from '@/api/types';
import { FeedbackForm } from './FeedbackForm';

const baseEvent: CalendarEvent = {
  id: 'evt-1',
  activityId: 'act-1',
  date: new Date('2026-09-12T10:00:00Z'),
  name: 'Morning Easy Run',
  description: '',
  type: 'completed',
  category: 'easy',
  distance: 7200,
  duration: 2400,
  avgHr: 144,
  rating: null,
  feedbackComment: null,
};

describe('FeedbackForm', () => {
  it('renders header, stats tiles, and Garmin receipt when telemetry present', async () => {
    const onDone = vi.fn();
    const saveFeedback = vi.fn();

    await render(
      <FeedbackForm
        event={baseEvent}
        feel={2}
        rpe={6}
        saveFeedback={saveFeedback}
        pending={false}
        onDone={onDone}
      />,
    );

    expect(screen.getByText('How was the run?')).toBeOnTheScreen();
    expect(screen.getByText('7.2 km')).toBeOnTheScreen();
    expect(screen.getByText('40m')).toBeOnTheScreen();
    expect(screen.getByText('144 bpm')).toBeOnTheScreen();
    expect(screen.getByTestId('garmin-receipt')).toBeOnTheScreen();
    expect(screen.getByText(/Garmin Receipt: Strong · RPE 6\/10/)).toBeOnTheScreen();
  });

  it('renders 1–5 scale picker when Garmin telemetry is absent and validates Save button', async () => {
    const onDone = vi.fn();
    const saveFeedback = vi.fn();
    const user = userEvent.setup();

    await render(
      <FeedbackForm
        event={baseEvent}
        feel={null}
        rpe={null}
        saveFeedback={saveFeedback}
        pending={false}
        onDone={onDone}
      />,
    );

    expect(screen.getByTestId('feel-scale-picker')).toBeOnTheScreen();
    expect(screen.getByTestId('feel-button-4')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.press(screen.getByTestId('feel-button-4'));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('keeps Save disabled when only rpe is set and feel is null', async () => {
    const onDone = vi.fn();
    const saveFeedback = vi.fn();

    await render(
      <FeedbackForm
        event={baseEvent}
        feel={null}
        rpe={7}
        saveFeedback={saveFeedback}
        pending={false}
        onDone={onDone}
      />,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves protocol and feel when Save is pressed', async () => {
    const onDone = vi.fn();
    const saveFeedback = vi.fn(async () => ({ ok: true }));
    const user = userEvent.setup();

    await render(
      <FeedbackForm
        event={baseEvent}
        feel={4}
        rpe={6}
        saveFeedback={saveFeedback}
        pending={false}
        onDone={onDone}
      />,
    );

    // Toggle submode to boost
    await user.press(screen.getByText('Boost'));

    // Type a note
    fireEvent.changeText(
      screen.getByLabelText('Feedback comment'),
      'Felt strong on hills',
    );

    // Press save
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(saveFeedback).toHaveBeenCalledOnce();
    expect(saveFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        feel: 4,
        rpe: 6,
        status: 'rated',
        rating: 'rated',
        comment: 'Felt strong on hills',
        protocol: expect.objectContaining({
          beforeAutoSubmode: 'boost',
          feel: 4,
          rpe: 6,
        }),
      }),
    );
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('calls saveFeedback with skipped when Skip is pressed', async () => {
    const onDone = vi.fn();
    const saveFeedback = vi.fn(async () => ({ ok: true }));
    const user = userEvent.setup();

    await render(
      <FeedbackForm
        event={baseEvent}
        saveFeedback={saveFeedback}
        pending={false}
        onDone={onDone}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Skip' }));
    expect(saveFeedback).toHaveBeenCalledWith({ status: 'skipped', rating: 'skipped' });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('prefills and saves fueling carbs with prescribed carbs shortcut', async () => {
    const onDone = vi.fn();
    const saveFeedback = vi.fn(async () => ({ ok: true }));
    const user = userEvent.setup();

    const eventWithPrescription: CalendarEvent = {
      ...baseEvent,
      prescribedCarbsG: 45,
      preRunCarbsG: 20,
    };

    await render(
      <FeedbackForm
        event={eventWithPrescription}
        feel={4}
        rpe={6}
        saveFeedback={saveFeedback}
        pending={false}
        onDone={onDone}
      />,
    );

    expect(screen.getByLabelText('Pre-run carbs').props.value).toBe('20');

    await user.press(screen.getByTestId('use-prescribed-carbs-button'));
    expect(screen.getByLabelText('Carbs ingested').props.value).toBe('45');

    fireEvent.changeText(screen.getByLabelText('Pre-run carbs'), '30');

    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(saveFeedback).toHaveBeenCalledOnce();
    expect(saveFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        preRunCarbsG: 30,
        carbsG: 45,
        protocol: expect.objectContaining({
          preRunCarbsG: 30,
        }),
      }),
    );
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('does not call onDone when saveFeedback fails on save', async () => {
    const onDone = vi.fn();
    const saveFeedback = vi.fn(async () => {
      throw new Error('Save failed');
    });
    const user = userEvent.setup();

    await render(
      <FeedbackForm
        event={baseEvent}
        feel={4}
        saveFeedback={saveFeedback}
        pending={false}
        onDone={onDone}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(saveFeedback).toHaveBeenCalledOnce();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('does not call onDone when saveFeedback fails on skip', async () => {
    const onDone = vi.fn();
    const saveFeedback = vi.fn(async () => {
      throw new Error('Skip failed');
    });
    const user = userEvent.setup();

    await render(
      <FeedbackForm
        event={baseEvent}
        saveFeedback={saveFeedback}
        pending={false}
        onDone={onDone}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Skip' }));
    expect(saveFeedback).toHaveBeenCalledOnce();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('autofills basal defaults from lastProtocols for known category without autofilling carbs', async () => {
    const saveFeedback = vi.fn();
    const onDone = vi.fn();

    const lastProtocols = {
      easy: {
        activityId: 'act-prev',
        beforeMode: 'manual' as const,
        beforeManualUh: 0.22,
        beforeTiming: '1-2h' as const,
        duringSame: true,
        hasProtocol: true,
        status: 'rated' as const,
        preRunCarbsG: 50,
      },
    };

    await render(
      <FeedbackForm
        event={{ ...baseEvent, category: 'easy', preRunCarbsG: null }}
        lastProtocols={lastProtocols}
        feel={3}
        saveFeedback={saveFeedback}
        pending={false}
        onDone={onDone}
      />,
    );

    // Basal fields should be autofilled from lastProtocols.easy
    expect(screen.getByLabelText('Before manual rate').props.value).toBe('0.22');

    // Carbs should NOT be autofilled from lastProtocols
    expect(screen.getByLabelText('Pre-run carbs').props.value).toBe('');
    expect(screen.getByLabelText('Carbs ingested').props.value).toBe('');
  });

  it('shows prompt for unknown category and updates basal defaults on category selection', async () => {
    const saveFeedback = vi.fn();
    const onDone = vi.fn();
    const user = userEvent.setup();

    const lastProtocols = {
      interval: {
        activityId: 'act-interval',
        beforeMode: 'manual' as const,
        beforeManualUh: 0.35,
        beforeTiming: '>2h' as const,
        duringSame: true,
        hasProtocol: true,
        status: 'rated' as const,
        preRunCarbsG: 40,
      },
    };

    const adHocEvent: CalendarEvent = {
      ...baseEvent,
      category: 'other',
      preRunCarbsG: null,
    };

    await render(
      <FeedbackForm
        event={adHocEvent}
        lastProtocols={lastProtocols}
        feel={4}
        saveFeedback={saveFeedback}
        pending={false}
        onDone={onDone}
      />,
    );

    // Prompt is visible when category is unknown
    expect(screen.getByText('Select type to load basal defaults')).toBeOnTheScreen();

    // Select Interval
    await user.press(screen.getByText('Interval'));

    // Basal field should now be populated from interval protocol
    expect(screen.getByLabelText('Before manual rate').props.value).toBe('0.35');

    // Carbs still empty
    expect(screen.getByLabelText('Pre-run carbs').props.value).toBe('');

    // Save and verify category is passed
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(saveFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'interval',
        protocol: expect.objectContaining({
          category: 'interval',
          beforeManualUh: 0.35,
        }),
      }),
    );
  });

  it('does not show RUN TYPE section when event.category is already known', async () => {
    const saveFeedback = vi.fn();
    const onDone = vi.fn();

    await render(
      <FeedbackForm
        event={{ ...baseEvent, category: 'long' }}
        lastProtocols={{}}
        feel={4}
        saveFeedback={saveFeedback}
        pending={false}
        onDone={onDone}
      />,
    );

    expect(screen.queryByText('RUN TYPE')).not.toBeOnTheScreen();
    expect(screen.queryByText('Select type to load basal defaults')).not.toBeOnTheScreen();
  });
});

