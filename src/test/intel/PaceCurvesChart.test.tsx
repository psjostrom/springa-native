import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react-native';
import { PaceCurvesChart } from '@/components/intel/PaceCurvesChart';

describe('PaceCurvesChart', () => {
  const sampleCurve = [
    { distance: 1000, pace: 4.0 },
    { distance: 2000, pace: 4.2 },
    { distance: 5000, pace: 4.5 },
    { distance: 10000, pace: 4.8 },
  ];

  it('renders pace header with best pace and distance range', async () => {
    const view = await render(
      <PaceCurvesChart
        curve={sampleCurve}
      />,
    );

    expect(view.getByText('4:00/km')).toBeOnTheScreen();
    expect(view.getByText('Best Pace')).toBeOnTheScreen();
    expect(view.getByText('1.0 km – 10 km curve')).toBeOnTheScreen();
  });

  it('renders curve without crash and accepts scrubbing callback', async () => {
    const onScrubbingChange = vi.fn();
    const view = await render(
      <PaceCurvesChart
        curve={sampleCurve}
        onScrubbingChange={onScrubbingChange}
      />,
    );

    expect(view.getByText('4:00/km')).toBeOnTheScreen();
  });
});
