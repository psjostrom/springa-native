import { describe, expect, it } from 'vitest';
import { render, userEvent, waitFor } from '@testing-library/react-native';
import { PhaseTracker } from '@/components/intel/PhaseTracker';

describe('PhaseTracker', () => {
  it('displays Taper Phase info when current week is in taper', async () => {
    const user = userEvent.setup();
    const phaseInfo = {
      name: 'Taper Phase',
      week: 12,
      totalWeeks: 14,
      progress: 12 / 14,
      progressPercent: 86,
    };

    const view = await render(
      <PhaseTracker
        phaseInfo={phaseInfo}
        raceDate="2026-10-18"
        includeBasePhase={false}
      />,
    );

    expect(view.getByText('Taper Phase')).toBeOnTheScreen();
    expect(view.getByText('Week 12 of 14')).toBeOnTheScreen();

    // Open bottom sheet
    await user.press(view.getByLabelText(/Taper Phase, Week 12 of 14/));

    // Current phase card inside sheet should show Taper Phase, NOT Build Phase
    await waitFor(() => {
      expect(
        view.getAllByText(
          'Volume drops ~40-50% to absorb training. Maintain some intensity to stay sharp.',
        ).length,
      ).toBe(2);
    });

    expect(view.getByText('Race-pace sharpening')).toBeOnTheScreen();
    expect(view.getByText('Extra rest and sleep')).toBeOnTheScreen();
    // Build phase focus bullets should not appear in active phase card
    expect(view.queryByText('Weekly speed sessions')).toBeNull();
    expect(view.queryByText('3:1 build/recovery cycle')).toBeNull();
  });
});
