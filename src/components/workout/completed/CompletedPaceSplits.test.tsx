import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import type { CompletedSplit } from '@/api/types';
import { CompletedPaceSplits } from './CompletedPaceSplits';

const splits: CompletedSplit[] = [
  { km: 1, paceMinPerKm: 5.42, avgHr: 142, elevationChangeM: 3.5 },
  { km: 2, paceMinPerKm: 5.38, avgHr: null, elevationChangeM: null },
];

const defaultWindow = Dimensions.get('window');
const defaultScreen = Dimensions.get('screen');

afterEach(() => {
  Dimensions.set({ window: defaultWindow, screen: defaultScreen });
});

describe('CompletedPaceSplits', () => {
  it('renders nothing when splits are null or empty', async () => {
    const nullView = await render(<CompletedPaceSplits splits={null} />);
    expect(nullView.toJSON()).toBeNull();

    const emptyView = await render(<CompletedPaceSplits splits={[]} />);
    expect(emptyView.toJSON()).toBeNull();
  });

  it('renders km index and formatted pace for every split', async () => {
    await render(<CompletedPaceSplits splits={splits} />);

    expect(screen.getByText('1')).toBeOnTheScreen();
    expect(screen.getByText('5:25')).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    expect(screen.getByText('5:23')).toBeOnTheScreen();
    expect(screen.queryByText('5:25 /km')).toBeNull();
  });

  it('shows HR and elevation only when present', async () => {
    await render(<CompletedPaceSplits splits={splits} />);

    expect(screen.getByText('142')).toBeOnTheScreen();
    expect(screen.getByText('+4')).toBeOnTheScreen();

    expect(screen.getAllByText('142')).toHaveLength(1);
    expect(screen.getAllByText('+4')).toHaveLength(1);
    expect(screen.queryByText('+4 m')).toBeNull();
  });

  it('omits missing HR and elevation cells', async () => {
    await render(<CompletedPaceSplits splits={splits} />);

    expect(screen.queryByText(/bpm/)).toBeNull();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('exposes each row as one coherent reading unit', async () => {
    await render(<CompletedPaceSplits splits={splits} />);

    expect(
      screen.getByLabelText('Km 1, pace 5:25 per km, avg HR 142 bpm, elevation +4 m'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Km 2, pace 5:23 per km')).toBeOnTheScreen();
  });

  it('keeps the PWA table layout at large text sizes', async () => {
    Dimensions.set({
      window: { ...defaultWindow, fontScale: 1.5 },
      screen: { ...defaultScreen, fontScale: 1.5 },
    });

    await render(<CompletedPaceSplits splits={splits} />);

    expect(screen.getByText('KM')).toBeOnTheScreen();
    expect(screen.getByText('PACE')).toBeOnTheScreen();
    expect(screen.getByTestId('large-text-split-table')).toBeOnTheScreen();
    expect(screen.queryByTestId('accessible-split-layout')).toBeNull();
    expect(screen.getByText('5:25')).toBeOnTheScreen();
  });
});
