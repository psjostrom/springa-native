import { describe, expect, it } from 'vitest';
import { HrZoneColors, SpringaColors } from '@/theme/colors';
import {
  bgJudgment,
  complianceJudgment,
  formatDistanceKm,
  formatElevationM,
  formatFiveMinuteChange,
  formatMmol,
  formatPaceMinPerKm,
  cadenceJudgment,
  getPaceSplitZone,
  intensityJudgment,
  loadJudgment,
  paceSplitBarWidth,
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
    expect(complianceJudgment('good')).toEqual({
      label: 'Good',
      color: SpringaColors.success,
      fraction: 0.9,
    });
    expect(complianceJudgment('ok')).toEqual({
      label: 'OK',
      color: SpringaColors.warning,
      fraction: 0.6,
    });
    expect(complianceJudgment('bad')).toEqual({
      label: 'Poor',
      color: SpringaColors.error,
      fraction: 0.3,
    });
  });

  it('converts stored per-minute rates to signed five-minute glucose changes', () => {
    expect(formatFiveMinuteChange(0.12)).toBe('+0.6');
    expect(formatFiveMinuteChange(-0.336)).toBe('-1.7');
    expect(formatFiveMinuteChange(0)).toBe('0.0');
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

  it('uses PWA pace thresholds for split colors', () => {
    expect(getPaceSplitZone(5.082)).toMatchObject({ label: 'Hard', color: HrZoneColors[5] });
    expect(getPaceSplitZone(5.083).label).toBe('Interval');
    expect(getPaceSplitZone(5.583).label).toBe('Race');
    expect(getPaceSplitZone(7).label).toBe('Easy');
  });

  it('scales split bars by squared speed against fastest split', () => {
    expect(paceSplitBarWidth(5.42, 5.42)).toBe(100);
    expect(paceSplitBarWidth(6.42, 5.42)).toBe(
      Math.round(Math.pow((60 / 6.42) / (60 / 5.42), 2) * 100),
    );
  });

  it('uses existing PWA performance judgments', () => {
    expect(cadenceJudgment(156).label).toBe('Low');
    expect(cadenceJudgment(172).label).toBe('Good');
    expect(loadJudgment(56).label).toBe('Moderate');
    expect(intensityJudgment(77).label).toBe('Moderate');
  });
});
