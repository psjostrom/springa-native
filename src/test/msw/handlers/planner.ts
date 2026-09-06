import { http } from 'msw';
import type {
  PlannerConfig,
  PlannerPreview,
  PlannerState,
} from '@/api/types';
import { apiUrl, jsonOk } from '../helpers';

export function defaultPlannerConfig(): PlannerConfig {
  return {
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
  };
}

export function activePlannerState(): PlannerState {
  const config = defaultPlannerConfig();
  return {
    currentConfig: config,
    newProgramDraft: config,
    fitnessOptions: [
      { label: '5K', distanceKm: 5, defaultSeconds: 1500, minSeconds: 1200, maxSeconds: 1800, stepSeconds: 30 },
      { label: '10K', distanceKm: 10, defaultSeconds: 3600, minSeconds: 3000, maxSeconds: 4800, stepSeconds: 60 },
      { label: 'Half', distanceKm: 21.1, defaultSeconds: 7200, minSeconds: 6000, maxSeconds: 9000, stepSeconds: 60 },
      { label: 'Marathon', distanceKm: 42.2, defaultSeconds: 14400, minSeconds: 12000, maxSeconds: 18000, stepSeconds: 60 },
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
}

export function replacePlanPreview(): PlannerPreview {
  const config = defaultPlannerConfig();
  return {
    intent: 'start',
    action: 'replace-plan',
    config,
    previewHash: 'a'.repeat(64),
    warning: null,
    summary: {
      workoutCount: 3,
      planWeeks: config.totalWeeks,
      firstWorkoutDate: '2026-09-01',
      raceDate: config.raceDate,
      totalDistanceKm: 32.5,
    },
    weeks: [
      { week: 1, startsOn: '2026-08-31', distanceKm: 20, workoutCount: 3 },
    ],
    workouts: [
      {
        key: 'easy-1',
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
}

export const plannerHandlers = [
  http.get(apiUrl('/api/planner'), () => jsonOk(activePlannerState())),
  http.put(apiUrl('/api/settings'), () => jsonOk({ ok: true })),
  http.post(apiUrl('/api/planner/preview'), () => jsonOk(replacePlanPreview())),
  http.post(apiUrl('/api/planner/apply'), () => jsonOk({
    action: 'replace-plan',
    appliedWorkoutCount: 3,
    warnings: [],
    state: activePlannerState(),
  })),
];
