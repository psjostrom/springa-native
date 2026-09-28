import { describe, expect, it } from 'vitest';
import { render, userEvent } from '@testing-library/react-native';
import { FitnessChart } from '@/components/intel/FitnessChart';
import type { FitnessDataPoint } from '@/lib/fitness';

describe('FitnessChart', () => {
  const sampleData: FitnessDataPoint[] = [
    { date: '2026-09-01', ctl: 45.2, atl: 52.0, tsb: -6.8 },
    { date: '2026-09-02', ctl: 45.8, atl: 50.5, tsb: -4.7 },
    { date: '2026-09-03', ctl: 46.5, atl: 48.0, tsb: -1.5 },
  ];

  it('renders title, time windows, and line toggles', async () => {
    const view = await render(<FitnessChart data={sampleData} />);

    expect(view.getByText('Fitness & Fatigue')).toBeOnTheScreen();
    expect(view.getByText('3m')).toBeOnTheScreen();
    expect(view.getByText('All')).toBeOnTheScreen();

    expect(view.getByLabelText('Toggle Fitness (CTL)')).toBeOnTheScreen();
    expect(view.getByLabelText('Toggle Fatigue (ATL)')).toBeOnTheScreen();
    expect(view.getByLabelText('Toggle Form (TSB)')).toBeOnTheScreen();
  });

  it('displays latest values in the legend', async () => {
    const view = await render(<FitnessChart data={sampleData} />);

    expect(view.getByText(/Fitness:\s*46\.5/)).toBeOnTheScreen();
    expect(view.getByText(/Fatigue:\s*48/)).toBeOnTheScreen();
    expect(view.getByText(/Form:\s*-1\.5/)).toBeOnTheScreen();
  });

  it('toggles visibility of lines', async () => {
    const user = userEvent.setup();
    const view = await render(<FitnessChart data={sampleData} />);

    const ctlToggle = view.getByLabelText('Toggle Fitness (CTL)');
    expect(ctlToggle.props.accessibilityState.selected).toBe(true);

    await user.press(ctlToggle);
    expect(
      view.getByLabelText('Toggle Fitness (CTL)').props.accessibilityState
        .selected,
    ).toBe(false);

    await user.press(view.getByLabelText('Toggle Fitness (CTL)'));
    expect(
      view.getByLabelText('Toggle Fitness (CTL)').props.accessibilityState
        .selected,
    ).toBe(true);
  });

  it('does not uncheck last remaining visible line', async () => {
    const user = userEvent.setup();
    const view = await render(<FitnessChart data={sampleData} />);

    await user.press(view.getByLabelText('Toggle Fatigue (ATL)'));
    await user.press(view.getByLabelText('Toggle Form (TSB)'));

    // Only CTL is left
    expect(
      view.getByLabelText('Toggle Fitness (CTL)').props.accessibilityState
        .selected,
    ).toBe(true);

    await user.press(view.getByLabelText('Toggle Fitness (CTL)'));
    // Should still be selected because at least one line must remain visible
    expect(
      view.getByLabelText('Toggle Fitness (CTL)').props.accessibilityState
        .selected,
    ).toBe(true);
  });
});
