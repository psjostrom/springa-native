import { describe, expect, it } from 'vitest';
import {
  bgJudgment,
  complianceJudgment,
  formatDistanceKm,
  formatElevationM,
  formatMmol,
  formatPaceMinPerKm,
  formatRatePerMin,
  formatSlopePerMin,
} from './completedOverviewPresentation';

describe('completedOverviewPresentation', () => {
  it('formats pace as mm:ss per km', () => {
    expect(formatPaceMinPerKm(5.42)).toBe('5:25');
    expect(formatPaceMinPerKm(6)).toBe('6:00');
    expect(formatPaceMinPerKm(4.07)).toBe('4:04');
  });

  it('formats glucose values with one decimal', () => {
    expect(formatMmol(6.8)).toBe('6.8');
    expect(formatMmol(4.96)).toBe('5.0');
  });

  it('names BG behavior from server values', () => {
    const score = (hypo: boolean, worstRate: number) => ({ hypo, worstRate });
    expect(bgJudgment(score(false, -0.1))).toBe('Stable');
    expect(bgJudgment(score(false, -0.11))).toBe('Stable');
    expect(bgJudgment(score(false, -0.13))).toBe('Dropping');
    expect(bgJudgment(score(false, -0.17))).toBe('Dropping');
    expect(bgJudgment(score(false, -0.19))).toBe('Crashing');
    expect(bgJudgment(score(true, -0.05))).toBe('Hypo');
  });

  it('maps server compliance ratings to readable judgments', () => {
    expect(complianceJudgment('good')).toBe('Good');
    expect(complianceJudgment('ok')).toBe('OK');
    expect(complianceJudgment('bad')).toBe('Poor');
  });

  it('formats slope rates with a sign and per-minute unit', () => {
    expect(formatSlopePerMin(0.9)).toBe('+0.90/min');
    expect(formatSlopePerMin(-2.4)).toBe('-2.40/min');
  });

  it('formats worst rates with three decimals and per-minute unit', () => {
    expect(formatRatePerMin(-0.6)).toBe('-0.600/min');
  });

  it('formats elevation changes with sign and meters', () => {
    expect(formatElevationM(3.5)).toBe('+4');
    expect(formatElevationM(-2.4)).toBe('-2');
    expect(formatElevationM(0)).toBe('0');
  });

  it('converts meter distances with one decimal and km unit', () => {
    expect(formatDistanceKm(9240)).toBe('9.2 km');
    expect(formatDistanceKm(9000)).toBe('9 km');
  });
});
