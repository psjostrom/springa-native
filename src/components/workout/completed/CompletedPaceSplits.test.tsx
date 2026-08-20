import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react-native';
import type { CompletedSplit } from '@/api/types';
import { CompletedPaceSplits } from './CompletedPaceSplits';

const splits: CompletedSplit[] = [
  { km: 1, paceMinPerKm: 5.42, avgHr: 142, elevationChangeM: 3.5 },
  { km: 2, paceMinPerKm: 5.38, avgHr: null, elevationChangeM: null },
];

describe('CompletedPaceSplits', () => {
  it('renders nothing when splits are null or empty', async () => {
    const nullView = await render(<CompletedPaceSplits splits={null} />);
    expect(nullView.toJSON()).toBeNull();

    const emptyView = await render(<CompletedPaceSplits splits={[]} />);
    expect(emptyView.toJSON()).toBeNull();
  });

  it('renders km index and formatted pace for every split', async () => {
    await render(<CompletedPaceSplits splits={splits} />);

    expect(screen.getByText('Km 1')).toBeOnTheScreen();
    expect(screen.getByText('5:25 /km')).toBeOnTheScreen();
    expect(screen.getByText('Km 2')).toBeOnTheScreen();
    expect(screen.getByText('5:23 /km')).toBeOnTheScreen();
  });

  it('shows HR and elevation only when present', async () => {
    await render(<CompletedPaceSplits splits={splits} />);

    expect(screen.getByText('142 bpm')).toBeOnTheScreen();
    expect(screen.getByText('+4 m')).toBeOnTheScreen();

    expect(screen.getAllByText('142 bpm')).toHaveLength(1);
    expect(screen.getAllByText('+4 m')).toHaveLength(1);
  });

  it('omits missing HR and elevation cells', async () => {
    await render(<CompletedPaceSplits splits={splits} />);

    expect(screen.getAllByText(/bpm/)).toHaveLength(1);
    expect(screen.getAllByText(/ m$/)).toHaveLength(1);
  });

  it('exposes each row as one coherent reading unit', async () => {
    await render(<CompletedPaceSplits splits={splits} />);

    expect(
      screen.getByLabelText('Km 1, pace 5:25 per km, avg HR 142 bpm, elevation +4 m'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Km 2, pace 5:23 per km')).toBeOnTheScreen();
  });
});
