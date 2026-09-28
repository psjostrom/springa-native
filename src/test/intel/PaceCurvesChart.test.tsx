import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react-native';
import { PaceCurvesChart } from '@/components/intel/PaceCurvesChart';

describe('PaceCurvesChart', () => {
  const sampleCurve = [
    { distance: 1000, pace: 4.0 },
    { distance: 2000, pace: 4.2 },
    { distance: 5000, pace: 4.5 },
    { distance: 10000, pace: 4.8 },
  ];

  it('renders time window chips and triggers callback', async () => {
    const onTimeWindowChange = vi.fn();
    const view = await render(
      <PaceCurvesChart
        curve={sampleCurve}
        timeWindow="90d"
        onTimeWindowChange={onTimeWindowChange}
      />,
    );

    expect(view.getByText('Pace Curve')).toBeOnTheScreen();
    expect(view.getByText('3m')).toBeOnTheScreen();
    expect(view.getByText('All')).toBeOnTheScreen();

    fireEvent.press(view.getByLabelText('Time window 1y'));
    expect(onTimeWindowChange).toHaveBeenCalledWith('1y');
  });

  it('renders curve without crash and initially shows no tooltip', async () => {
    const onTimeWindowChange = vi.fn();
    const view = await render(
      <PaceCurvesChart
        curve={sampleCurve}
        timeWindow="90d"
        onTimeWindowChange={onTimeWindowChange}
      />,
    );

    expect(view.queryByText('4:00/km')).toBeNull();
  });
});
