import { ApiError } from './errors';
import type {
  EffortMetric,
  PlannerApplyResponse,
  PlannerApplyWarning,
  PlannerConfig,
  PlannerFuelRate,
  PlannerFitnessOption,
  PlannerPreview,
  PlannerPreviewWorkout,
  PlannerState,
  PlannerSync,
  PlannerWarning,
  PlannerWeekday,
  PlannedWorkoutCategory,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function invalid(): never {
  throw new ApiError(200, 'Planner response had unexpected shape');
}

function stringField(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === 'string' ? record[key] : invalid();
}

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : invalid();
}

function integerField(record: Record<string, unknown>, key: string, min = 0): number {
  const value = finiteNumber(record[key]);
  return Number.isSafeInteger(value) && value >= min ? value : invalid();
}

function booleanField(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === 'boolean' ? record[key] : invalid();
}

function dateOnly(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return invalid();
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? value
    : invalid();
}

function nullableDate(value: unknown): string | null {
  return value === null ? null : dateOnly(value);
}

function weekday(value: unknown): PlannerWeekday {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6
    ? value as PlannerWeekday
    : invalid();
}

function weekdays(value: unknown): PlannerWeekday[] {
  if (!Array.isArray(value) || value.length < 2) return invalid();
  const parsed = value.map(weekday);
  return new Set(parsed).size === parsed.length ? parsed : invalid();
}

function effortMetric(value: unknown): EffortMetric {
  return value === 'pace' || value === 'hr' || value === 'feel' ? value : invalid();
}

function category(value: unknown): PlannedWorkoutCategory {
  return value === 'easy' ||
    value === 'long' ||
    value === 'interval' ||
    value === 'race' ||
    value === 'other'
    ? value
    : invalid();
}

function nullableNumber(value: unknown): number | null {
  return value === null ? null : finiteNumber(value);
}

function parsePlannerConfig(value: unknown): PlannerConfig {
  if (!isRecord(value)) return invalid();
  const runDays = weekdays(value.runDays);
  const longRunDay = weekday(value.longRunDay);
  const clubDay = value.clubDay === null ? null : weekday(value.clubDay);
  const clubType = value.clubType === null || value.clubType === 'long' ||
    value.clubType === 'speed' || value.clubType === 'varies'
    ? value.clubType
    : invalid();
  if (
    (clubDay === null) !== (clubType === null) ||
    !runDays.includes(longRunDay) ||
    (clubDay !== null && !runDays.includes(clubDay)) ||
    (clubType !== 'long' && clubDay === longRunDay)
  ) return invalid();
  return {
    raceName: stringField(value, 'raceName'),
    raceDist: finiteNumber(value.raceDist),
    raceDate: dateOnly(value.raceDate),
    currentAbilityDist: finiteNumber(value.currentAbilityDist),
    currentAbilitySecs: finiteNumber(value.currentAbilitySecs),
    runDays,
    longRunDay,
    clubDay,
    clubType,
    totalWeeks: integerField(value, 'totalWeeks', 1),
    startKm: finiteNumber(value.startKm),
    includeBasePhase: booleanField(value, 'includeBasePhase'),
    effortMetric: effortMetric(value.effortMetric),
  };
}

function parseFitnessOption(value: unknown): PlannerFitnessOption {
  if (!isRecord(value)) return invalid();
  const label = value.label;
  if (label !== '5K' && label !== '10K' && label !== 'Half' && label !== 'Marathon') return invalid();
  return {
    label,
    distanceKm: finiteNumber(value.distanceKm),
    defaultSeconds: finiteNumber(value.defaultSeconds),
    minSeconds: finiteNumber(value.minSeconds),
    maxSeconds: finiteNumber(value.maxSeconds),
    stepSeconds: finiteNumber(value.stepSeconds),
  };
}

function parseConstraints(value: unknown): PlannerState['constraints'] {
  if (!isRecord(value)) return invalid();
  const raceDistance = value.raceDistanceKm;
  const startDistance = value.startDistanceKm;
  if (!isRecord(raceDistance) || !isRecord(startDistance)) return invalid();
  const raceMin = finiteNumber(raceDistance.min);
  const raceMax = finiteNumber(raceDistance.max);
  const startMin = finiteNumber(startDistance.min);
  const startMax = finiteNumber(startDistance.max);
  if (raceMin >= raceMax || startMin >= startMax) return invalid();
  return {
    raceDistanceKm: { min: raceMin, max: raceMax },
    startDistanceKm: { min: startMin, max: startMax },
    minimumWeeks: finiteNumber(value.minimumWeeks),
    minimumNormalWeeks: finiteNumber(value.minimumNormalWeeks),
    recommendedWeeks: finiteNumber(value.recommendedWeeks),
    basePhaseMinimumWeeks: finiteNumber(value.basePhaseMinimumWeeks),
  };
}

function parseSync(value: unknown): PlannerSync {
  if (value === null) return null;
  if (!isRecord(value)) return invalid();
  if (value.status !== 'unknown' && value.status !== 'synced' && value.status !== 'dirty') return invalid();
  if (value.dirtyKind !== null && value.dirtyKind !== 'target-only' && value.dirtyKind !== 'structural') return invalid();
  return {
    status: value.status,
    dirtyKind: value.dirtyKind,
  };
}

function parseFuelRate(value: unknown): PlannerFuelRate {
  if (!isRecord(value)) return invalid();
  if (value.source !== 'learned' && value.source !== 'default') return invalid();
  return { gramsPerHour: finiteNumber(value.gramsPerHour), source: value.source };
}

function parseFuelRates(value: unknown): PlannerState['fuelRates'] {
  if (value === null) return null;
  if (!isRecord(value)) return invalid();
  return {
    easy: parseFuelRate(value.easy),
    long: parseFuelRate(value.long),
    interval: parseFuelRate(value.interval),
  };
}

export function parsePlannerState(value: unknown): PlannerState {
  if (!isRecord(value)) return invalid();
  if (value.currentConfig !== null && !isRecord(value.currentConfig)) return invalid();
  const plan = value.plan;
  if (!isRecord(plan)) return invalid();
  if (plan.status !== 'none' && plan.status !== 'active' && plan.status !== 'complete') return invalid();
  return {
    currentConfig: value.currentConfig === null ? null : parsePlannerConfig(value.currentConfig),
    newProgramDraft: parsePlannerConfig(value.newProgramDraft),
    fitnessOptions: Array.isArray(value.fitnessOptions) ? value.fitnessOptions.map(parseFitnessOption) : invalid(),
    constraints: parseConstraints(value.constraints),
    plan: {
      status: plan.status,
      sync: parseSync(plan.sync),
      weeksToGo: plan.weeksToGo === null ? null : integerField(plan, 'weeksToGo'),
      futureWorkoutCount: integerField(plan, 'futureWorkoutCount'),
    },
    fuelRates: parseFuelRates(value.fuelRates),
  };
}

function parseWarning(value: unknown): PlannerWarning | null {
  if (value === null) return null;
  if (!isRecord(value)) return invalid();
  if (value.kind !== 'compressed' && value.kind !== 'very-compressed') return invalid();
  return { kind: value.kind, title: stringField(value, 'title'), message: stringField(value, 'message') };
}

function parsePreviewWorkout(value: unknown): PlannerPreviewWorkout {
  if (!isRecord(value)) return invalid();
  return {
    key: stringField(value, 'key'),
    week: integerField(value, 'week', 1),
    date: dateOnly(value.date),
    name: stringField(value, 'name'),
    category: category(value.category),
    distanceKm: nullableNumber(value.distanceKm),
    durationMinutes: nullableNumber(value.durationMinutes),
    fuelRateGPerHour: nullableNumber(value.fuelRateGPerHour),
  };
}

export function parsePlannerPreview(value: unknown): PlannerPreview {
  if (!isRecord(value)) return invalid();
  if (value.intent !== 'start' && value.intent !== 'update') return invalid();
  if (value.action !== 'replace-plan' && value.action !== 'update-targets') return invalid();
  if (typeof value.previewHash !== 'string' || !/^[0-9a-f]{64}$/.test(value.previewHash)) return invalid();
  const summary = value.summary;
  if (!isRecord(summary)) return invalid();
  const weeks = value.weeks;
  if (!Array.isArray(weeks)) return invalid();
  const parsedWeeks = weeks.map((item) => {
    if (!isRecord(item)) return invalid();
    return {
      week: integerField(item, 'week', 1),
      startsOn: dateOnly(item.startsOn),
      distanceKm: finiteNumber(item.distanceKm),
      workoutCount: integerField(item, 'workoutCount'),
    };
  });
  return {
    intent: value.intent,
    action: value.action,
    config: parsePlannerConfig(value.config),
    previewHash: value.previewHash,
    warning: parseWarning(value.warning),
    summary: {
      workoutCount: integerField(summary, 'workoutCount'),
      planWeeks: integerField(summary, 'planWeeks', 1),
      firstWorkoutDate: nullableDate(summary.firstWorkoutDate),
      raceDate: dateOnly(summary.raceDate),
      totalDistanceKm: finiteNumber(summary.totalDistanceKm),
    },
    weeks: parsedWeeks,
    workouts: Array.isArray(value.workouts) ? value.workouts.map(parsePreviewWorkout) : invalid(),
  };
}

function parseApplyWarning(value: unknown): PlannerApplyWarning {
  if (!isRecord(value)) return invalid();
  if (value.code !== 'STALE_WORKOUTS_NOT_REMOVED' && value.code !== 'GOOGLE_CALENDAR_SYNC_FAILED') return invalid();
  return { code: value.code, message: stringField(value, 'message') };
}

export function parsePlannerApplyResponse(value: unknown): PlannerApplyResponse {
  if (!isRecord(value)) return invalid();
  if (value.action !== 'replace-plan' && value.action !== 'update-targets') return invalid();
  if (!Array.isArray(value.warnings)) return invalid();
  return {
    action: value.action,
    appliedWorkoutCount: integerField(value, 'appliedWorkoutCount'),
    warnings: value.warnings.map(parseApplyWarning),
    state: parsePlannerState(value.state),
  };
}
