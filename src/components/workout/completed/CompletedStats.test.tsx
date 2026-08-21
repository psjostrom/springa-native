import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import type { CalendarEvent, CompletedWorkoutOverview } from '@/api/types';
import { CompletedPerformance, CompletedSummary } from './CompletedStats';

const event: CalendarEvent = {
  id: 'event-123',
  date: new Date('2026-08-13T12:00:00'),
  name: 'Morning easy run',
  description: '',
  type: 'completed',
  category: 'easy',
  distance: 9240,
  duration: 3900,
  avgHr: 142,
  maxHr: 168,
  calories: 312,
  cadence: 172,
  load: 96,
  intensity: 78,
  pace: 5.42,
};

const hrZone: CompletedWorkoutOverview['reportCard']['hrZone'] = {
  rating: 'good',
  targetZone: 'z3',
  pctInTarget: 72,
  expectedRepSec: 185,
};

const defaultWindow = Dimensions.get('window');
const defaultScreen = Dimensions.get('screen');

afterEach(() => {
  Dimensions.set({ window: defaultWindow, screen: defaultScreen });
});

function renderStats(
  overrides: Partial<CalendarEvent> = {},
  compliance: CompletedWorkoutOverview['reportCard']['hrZone'] | null = hrZone,
) {
  const reportCard: CompletedWorkoutOverview['reportCard'] = {
    bg: null,
    hrZone: compliance,
    entryTrend: null,
    recovery: null,
  };
  return render(
    <>
      <CompletedSummary event={{ ...event, ...overrides }} />
      <CompletedPerformance
        event={{ ...event, ...overrides }}
        reportCard={reportCard}
      />
    </>,
  );
}

describe('completed workout stats', () => {
  it('renders nothing when no metric or compliance result is present', async () => {
    const view = await renderStats(
      {
        distance: undefined,
        duration: undefined,
        avgHr: undefined,
        pace: undefined,
        maxHr: undefined,
        calories: undefined,
        cadence: undefined,
        load: undefined,
        intensity: undefined,
      },
      null,
    );
    expect(view.toJSON()).toBeNull();
  });

  it('renders raw Calendar metrics with units', async () => {
    await renderStats();

    expect(screen.getByText('9.2 km')).toBeOnTheScreen();
    expect(screen.getByText('1h 5m')).toBeOnTheScreen();
    expect(screen.getByText('142 bpm')).toBeOnTheScreen();
    expect(screen.getByText('5:25 /km')).toBeOnTheScreen();
    expect(screen.getByText('168 bpm')).toBeOnTheScreen();
    expect(screen.getByText('312 kcal')).toBeOnTheScreen();
    expect(screen.getByText('172 spm')).toBeOnTheScreen();
    expect(screen.getByText('96')).toBeOnTheScreen();
    expect(screen.getByText('78%')).toBeOnTheScreen();
  });

  it('exposes metric values and units in readable labels', async () => {
    await renderStats();

    expect(screen.getByLabelText('Distance, 9.2 km')).toBeOnTheScreen();
    expect(screen.getByLabelText('Duration, 1h 5m')).toBeOnTheScreen();
    expect(screen.getByLabelText('Avg HR, 142 bpm')).toBeOnTheScreen();
    expect(screen.getByLabelText('Calories, 312 kcal')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cadence, 172 spm')).toBeOnTheScreen();
  });

  it('omits missing metrics', async () => {
    await renderStats({ cadence: undefined, load: undefined, calories: undefined });

    expect(screen.queryByText('172 spm')).not.toBeOnTheScreen();
    expect(screen.queryByText('96')).not.toBeOnTheScreen();
    expect(screen.queryByText('312 kcal')).not.toBeOnTheScreen();
    expect(screen.getByText('9.2 km')).toBeOnTheScreen();
  });

  it('shows server HR zone compliance with judgment and target zone', async () => {
    await renderStats();

    expect(screen.getByText('HR Zone')).toBeOnTheScreen();
    expect(screen.getAllByText('Good')).toHaveLength(2);
    expect(screen.getByText('72% z3')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('HR zone compliance, 72% in target zone z3, Good'),
    ).toBeOnTheScreen();
  });

  it('omits HR zone compliance when the server result is missing', async () => {
    await renderStats({}, null);

    expect(screen.queryByText('HR Zone')).not.toBeOnTheScreen();
  });

  it('shows progress only for metrics with a defined scale', async () => {
    await renderStats();

    expect(screen.getByTestId('performance-progress-hr-zone')).toBeOnTheScreen();
    expect(screen.getByTestId('performance-progress-cadence')).toBeOnTheScreen();
    expect(screen.getByTestId('performance-progress-load')).toBeOnTheScreen();
    expect(screen.getByTestId('performance-progress-intensity')).toBeOnTheScreen();
    expect(screen.queryByTestId('performance-progress-calories')).toBeNull();
    expect(screen.queryByTestId('performance-progress-max-hr')).toBeNull();
  });

  it('keeps metrics without progress equal height with their row', async () => {
    await renderStats();

    expect(screen.getByLabelText('Calories, 312 kcal')).toHaveStyle({ flex: 1 });
    expect(screen.getByLabelText('Max HR, 168 bpm')).toHaveStyle({ flex: 1 });
  });

  it('stacks performance cards when large text cannot fit two columns', async () => {
    Dimensions.set({
      window: { ...defaultWindow, fontScale: 1.5 },
      screen: { ...defaultScreen, fontScale: 1.5 },
    });

    await renderStats();

    for (const row of screen.getAllByTestId('performance-metric-row')) {
      expect(row).toHaveStyle({ flexDirection: 'column' });
    }
  });
});
