import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import {
  parsePlannerApplyResponse,
  parsePlannerPreview,
  parsePlannerState,
} from './planner';

const config = {
  raceName: 'Stockholm Half',
  raceDist: 21.1,
  raceDate: '2026-11-29',
  currentAbilityDist: 10,
  currentAbilitySecs: 3600,
  runDays: [0, 2, 4],
  longRunDay: 0,
  clubDay: null,
  clubType: null,
  totalWeeks: 14,
  startKm: 8,
  includeBasePhase: true,
  effortMetric: 'pace',
} as const;

const state = {
  currentConfig: config,
  newProgramDraft: config,
  fitnessOptions: [
    {
      label: '5K',
      distanceKm: 5,
      defaultSeconds: 1500,
      minSeconds: 1200,
      maxSeconds: 1800,
      stepSeconds: 30,
    },
    {
      label: '10K',
      distanceKm: 10,
      defaultSeconds: 3600,
      minSeconds: 3000,
      maxSeconds: 4800,
      stepSeconds: 60,
    },
  ],
  constraints: {
    raceDistanceKm: { min: 1, max: 100 },
    startDistanceKm: { min: 2, max: 42 },
    minimumWeeks: 8,
    minimumNormalWeeks: 10,
    recommendedWeeks: 12,
    basePhaseMinimumWeeks: 11,
  },
  plan: {
    status: 'active',
    sync: { status: 'synced', dirtyKind: null },
    weeksToGo: 13,
    futureWorkoutCount: 3,
  },
  fuelRates: {
    easy: { gramsPerHour: 55, source: 'learned' },
    long: { gramsPerHour: 60, source: 'default' },
    interval: { gramsPerHour: 50, source: 'learned' },
  },
};

const preview = {
  intent: 'start',
  action: 'replace-plan',
  config,
  previewHash: 'a'.repeat(64),
  warning: null,
  summary: {
    workoutCount: 3,
    planWeeks: 14,
    firstWorkoutDate: '2026-08-31',
    raceDate: '2026-11-29',
    totalDistanceKm: 32.5,
  },
  weeks: [
    { week: 1, startsOn: '2026-08-31', distanceKm: 20, workoutCount: 3 },
  ],
  workouts: [
    {
      key: 'easy-2026-11-29-1-0',
      week: 1,
      date: '2026-09-01',
      name: 'W01 Easy',
      category: 'easy',
      distanceKm: 6,
      durationMinutes: 36,
      fuelRateGPerHour: null,
    },
  ],
};

const apply = {
  action: 'replace-plan',
  appliedWorkoutCount: 3,
  warnings: [],
  state,
};

describe('Planner response parsers', () => {
  it('parses nullable state, preview, and apply values', () => {
    expect(parsePlannerState({ ...state, currentConfig: null, fuelRates: null }).plan.status).toBe('active');
    expect(parsePlannerPreview({ ...preview, warning: {
      kind: 'compressed',
      title: 'Short plan',
      message: 'This is compressed.',
    } }).warning?.kind).toBe('compressed');
    expect(parsePlannerApplyResponse(apply).appliedWorkoutCount).toBe(3);
  });

  it.each([
    ['state', () => parsePlannerState({ ...state, plan: [] })],
    ['state config', () => parsePlannerState({ ...state, currentConfig: { ...config, raceDate: '2026-02-30' } })],
    ['preview action', () => parsePlannerPreview({ ...preview, action: 'rewrite' })],
    ['preview hash', () => parsePlannerPreview({ ...preview, previewHash: 'bad' })],
    ['apply warnings', () => parsePlannerApplyResponse({ ...apply, warnings: null })],
    ['apply failure detail', () => parsePlannerApplyResponse({
      ...apply,
      warnings: [{ code: 'NOPE', message: 'bad' }],
    })],
  ])('rejects malformed %s payload', (_name, parse) => {
    expect(parse).toThrowError(ApiError);
  });

  it('rejects non-finite values and invalid weekdays', () => {
    expect(() => parsePlannerState({
      ...state,
      currentConfig: { ...config, currentAbilitySecs: Number.NaN },
    })).toThrowError(ApiError);
    expect(() => parsePlannerPreview({
      ...preview,
      config: { ...config, runDays: [0, 0] },
    })).toThrowError(ApiError);
  });
});
