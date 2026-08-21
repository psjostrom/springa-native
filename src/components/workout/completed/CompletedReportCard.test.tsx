import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react-native';
import type { CompletedWorkoutOverview } from '@/api/types';
import { CompletedReportCard } from './CompletedReportCard';

const report: CompletedWorkoutOverview['reportCard'] = {
  bg: {
    rating: 'good',
    startBG: 6.8,
    minBG: 4.9,
    hypo: false,
    worstRate: -0.6,
    lbgi: 1.2,
  },
  hrZone: { rating: 'good', targetZone: 'z3', pctInTarget: 72, expectedRepSec: 185 },
  entryTrend: { rating: 'ok', slope30m: 0.9, stability: 4.1, label: 'Stable' },
  recovery: {
    rating: 'bad',
    drop30m: -2.4,
    nadir: 4.2,
    postHypo: true,
    label: 'Deep drop',
  },
};

function renderCard(overrides: Partial<CompletedWorkoutOverview['reportCard']> = {}) {
  return render(<CompletedReportCard reportCard={{ ...report, ...overrides }} />);
}

describe('CompletedReportCard', () => {
  it('renders nothing when every report result is null', async () => {
    const view = await renderCard({ bg: null, entryTrend: null, recovery: null });
    expect(view.toJSON()).toBeNull();
  });

  it('renders only non-null report results', async () => {
    await renderCard({ entryTrend: null });

    expect(screen.getAllByText('Blood Glucose')).toHaveLength(1);
    expect(screen.getByText('During run')).toBeOnTheScreen();
    expect(screen.getByText('After run')).toBeOnTheScreen();
    expect(screen.queryByText('Before run')).not.toBeOnTheScreen();
  });

  it('groups during-run glucose outcome and names every value', async () => {
    await renderCard();

    expect(screen.getByText('During run')).toBeOnTheScreen();
    expect(screen.getByText('Crashing')).toBeOnTheScreen();
    expect(screen.getByText('Start')).toBeOnTheScreen();
    expect(screen.getByText('6.8 mmol/L')).toBeOnTheScreen();
    expect(screen.getByText('Lowest')).toBeOnTheScreen();
    expect(screen.getByText('4.9 mmol/L')).toBeOnTheScreen();
    expect(screen.getByText('Steepest 5-min change')).toBeOnTheScreen();
    expect(screen.getByText('-3.0 mmol/L')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        'During run, Crashing, start 6.8 mmol/L, lowest 4.9 mmol/L, steepest 5-minute change -3.0 mmol/L',
      ),
    ).toBeOnTheScreen();
  });

  it('names hypo and steep drops in the BG judgment', async () => {
    await renderCard({
      bg: { ...report.bg!, hypo: true, worstRate: -0.05 },
    });
    expect(screen.getByText('Hypo')).toBeOnTheScreen();

    await renderCard({
      bg: { ...report.bg!, hypo: false, worstRate: -0.19 },
    });
    expect(screen.getByText('Crashing')).toBeOnTheScreen();
  });

  it('groups pre-run trend with a five-minute glucose change', async () => {
    await renderCard();

    expect(screen.getByText('Before run')).toBeOnTheScreen();
    expect(screen.getByText('5-min change')).toBeOnTheScreen();
    expect(screen.getByText('+4.5 mmol/L')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Before run, Stable, 5-minute change +4.5 mmol/L'),
    ).toBeOnTheScreen();
  });

  it('separates the first 30-minute recovery change from the later low', async () => {
    await renderCard();

    expect(screen.getByText('After run')).toBeOnTheScreen();
    expect(screen.getByText('Deep drop')).toBeOnTheScreen();
    expect(screen.getByText('First 30 min')).toBeOnTheScreen();
    expect(screen.getByText('-2.4 mmol/L')).toBeOnTheScreen();
    expect(screen.getByText('Lowest after run')).toBeOnTheScreen();
    expect(screen.getByText('4.2 mmol/L')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        'After run, Deep drop, first 30-minute change -2.4 mmol/L, lowest after run 4.2 mmol/L',
      ),
    ).toBeOnTheScreen();
  });

  it('does not expose per-minute glucose rates', async () => {
    await renderCard();

    expect(screen.queryByText(/\/min/)).not.toBeOnTheScreen();
  });

  it('keeps HR zone compliance out of the report card grid', async () => {
    await renderCard();

    expect(screen.queryByText('HR Zone')).not.toBeOnTheScreen();
    expect(screen.queryByText('72%')).not.toBeOnTheScreen();
  });
});
