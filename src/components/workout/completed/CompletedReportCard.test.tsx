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

    expect(screen.getByText('Blood Glucose')).toBeOnTheScreen();
    expect(screen.getByText('Recovery')).toBeOnTheScreen();
    expect(screen.queryByText('Pre-Run trend')).not.toBeOnTheScreen();
  });

  it('shows BG judgment, values, and units', async () => {
    await renderCard();

    expect(screen.getByText('Crashing')).toBeOnTheScreen();
    expect(screen.getByText('6.8 → 4.9 mmol/L')).toBeOnTheScreen();
    expect(screen.getByText('-0.600/min')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Blood Glucose, Crashing, 6.8 to 4.9 mmol/L, worst rate -0.600 per minute'),
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

  it('shows trend label, slope judgment, and unit context', async () => {
    await renderCard();

    expect(screen.getByText('Pre-Run trend')).toBeOnTheScreen();
    expect(screen.getByText('+0.90/min')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Pre-Run trend, Stable, +0.90 mmol/L per minute'),
    ).toBeOnTheScreen();
  });

  it('shows recovery label, drop context, and nadir judgment', async () => {
    await renderCard();

    expect(screen.getByText('Deep drop')).toBeOnTheScreen();
    expect(screen.getByText('low 4.2')).toBeOnTheScreen();
    expect(screen.getByText('-2.4 mmol/L (30 min)')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Recovery, Deep drop, -2.4 mmol/L per 30 minutes, low 4.2 mmol/L'),
    ).toBeOnTheScreen();
  });

  it('keeps HR zone compliance out of the report card grid', async () => {
    await renderCard();

    expect(screen.queryByText('HR Zone')).not.toBeOnTheScreen();
    expect(screen.queryByText('72%')).not.toBeOnTheScreen();
  });
});
