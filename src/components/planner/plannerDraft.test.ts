import { describe, expect, it } from 'vitest';
import {
  formatFitnessTime,
  plannerConfigAffectsPlan,
  plannerSummaryParts,
  setClubDay,
  setClubEnabled,
  setClubType,
  setLongRunDay,
  setRaceDate,
  speedDayLabel,
  toggleRunDay,
  validatePlannerDraft,
} from './plannerDraft';
import type { PlannerConfig, PlannerFitnessOption } from '@/api/types';

const NOW = new Date('2026-08-18T12:00:00');
const options: PlannerFitnessOption[] = [
  { label: '5K', distanceKm: 5, defaultSeconds: 1500, minSeconds: 1200, maxSeconds: 1800, stepSeconds: 30 },
  { label: '10K', distanceKm: 10, defaultSeconds: 3600, minSeconds: 3000, maxSeconds: 4800, stepSeconds: 60 },
];
const constraints = {
  raceDistanceKm: { min: 1, max: 100 },
  startDistanceKm: { min: 2, max: 42 },
  minimumWeeks: 8,
  minimumNormalWeeks: 10,
  recommendedWeeks: 12,
  basePhaseMinimumWeeks: 11,
} as const;
const config: PlannerConfig = {
  raceName: 'Stockholm Half',
  raceDist: 21.1,
  raceDate: '2026-11-29',
  currentAbilityDist: 10,
  currentAbilitySecs: 3600,
  runDays: [2, 4, 0],
  longRunDay: 0,
  clubDay: null,
  clubType: null,
  totalWeeks: 14,
  startKm: 8,
  includeBasePhase: true,
  effortMetric: 'pace',
};

describe('Planner draft rules', () => {
  it('keeps at least two run days and repairs dependent selections', () => {
    const twoDays = { ...config, runDays: [2, 0] as PlannerConfig['runDays'], longRunDay: 0 as const };
    expect(toggleRunDay(twoDays, 2)).toEqual(twoDays);

    const repaired = toggleRunDay(
      { ...config, runDays: [2, 4, 0], longRunDay: 4, clubDay: 2, clubType: 'speed' },
      4,
    );
    expect(repaired.runDays).toEqual([2, 0]);
    expect(repaired.longRunDay).toBe(0);
    expect(repaired.clubDay).toBe(2);
  });

  it('repairs club selection and long-club ownership', () => {
    const enabled = setClubEnabled(config, true);
    expect(enabled.clubDay).toBe(2);
    expect(enabled.clubType).toBe('varies');
    expect(setClubEnabled(enabled, false)).toMatchObject({ clubDay: null, clubType: null });

    const longClub = setClubType(setClubDay(enabled, 4), 'long');
    expect(longClub).toMatchObject({ clubDay: 4, longRunDay: 4, clubType: 'long' });
    const normalClub = setClubType(longClub, 'speed');
    expect(normalClub.clubType).toBe('speed');
    expect(normalClub.longRunDay).not.toBe(4);
  });

  it('sets race date using local calendar parts and disables base phase when compressed', () => {
    expect(setRaceDate(config, '2026-10-18', NOW)).toMatchObject({
      raceDate: '2026-10-18',
      totalWeeks: 9,
      includeBasePhase: false,
    });
  });

  it('formats fitness times and reports immediate field errors', () => {
    expect(formatFitnessTime(3600)).toBe('1:00:00');
    expect(validatePlannerDraft({ ...config, startKm: 1.9 }, options, constraints, NOW)).toHaveProperty('startKm');
    expect(validatePlannerDraft({ ...config, raceDate: '2026-02-30' }, options, constraints, NOW)).toHaveProperty('raceDate');
    expect(validatePlannerDraft({ ...config, currentAbilitySecs: 5000 }, options, constraints, NOW)).toHaveProperty('currentAbilitySecs');
  });

  it('ignores race-name and day-order changes when comparing plan inputs', () => {
    expect(plannerConfigAffectsPlan(config, { ...config, raceName: 'New name' })).toBe(false);
    expect(plannerConfigAffectsPlan(config, { ...config, runDays: [0, 4, 2] })).toBe(false);
    expect(plannerConfigAffectsPlan(config, { ...config, startKm: 10 })).toBe(true);
  });

  it('calculates speed label and ordered summary segments', () => {
    expect(speedDayLabel(config)).toMatch(/^Speed auto-assigned to /);
    expect(plannerSummaryParts(config, true, 13)).toEqual([
      '3 days/wk',
      'Long: Sun',
      'Stockholm Half 21.1km',
      '13 wks to go',
    ]);
    expect(plannerSummaryParts(config, true, 1)).toContain('Race week!');
  });

  it('rejects invalid selected day changes', () => {
    expect(setLongRunDay(config, 1)).toEqual(config);
    expect(setClubDay(config, 1)).toEqual(config);
  });

  it('allows active in-flight plans with remaining weeks differing from totalWeeks', () => {
    // Plan created in the past with totalWeeks: 14, but only 4 weeks remain from now
    const pastNow = new Date('2026-11-01T12:00:00');
    const activePlan = { ...config, totalWeeks: 14, raceDate: '2026-11-29' };
    const errors = validatePlannerDraft(activePlan, options, constraints, pastNow, false);
    expect(errors).toEqual({});
  });

  it('enforces totalWeeks matching raceDate for new programs', () => {
    const pastNow = new Date('2026-11-01T12:00:00');
    const newProgram = { ...config, totalWeeks: 14, raceDate: '2026-11-29' };
    const errors = validatePlannerDraft(newProgram, options, constraints, pastNow, true);
    expect(errors).toHaveProperty('totalWeeks');
  });
});
