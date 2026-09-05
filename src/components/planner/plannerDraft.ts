import type {
  PlannerConfig,
  PlannerFitnessOption,
  PlannerState,
  PlannerWeekday,
} from '@/api/types';

export const PLANNER_DAYS: readonly { day: PlannerWeekday; label: string; shortLabel: string }[] = [
  { day: 1, label: 'Monday', shortLabel: 'Mon' },
  { day: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { day: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { day: 4, label: 'Thursday', shortLabel: 'Thu' },
  { day: 5, label: 'Friday', shortLabel: 'Fri' },
  { day: 6, label: 'Saturday', shortLabel: 'Sat' },
  { day: 0, label: 'Sunday', shortLabel: 'Sun' },
];

export type PlannerFieldErrors = Partial<Record<keyof PlannerConfig, string>>;

function dayOrder(day: PlannerWeekday): number {
  return day === 0 ? 6 : day - 1;
}

function sortDays(days: PlannerWeekday[]): PlannerWeekday[] {
  return [...days].sort((left, right) => dayOrder(left) - dayOrder(right));
}

function dayLabel(day: PlannerWeekday): string {
  return PLANNER_DAYS.find((item) => item.day === day)?.shortLabel ?? '';
}

function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? { year, month, day }
    : null;
}

function dateAtNoon(value: string): Date | null {
  const parts = parseDateOnly(value);
  return parts == null
    ? null
    : new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
}

function mondayUtc(year: number, month: number, day: number): number {
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.getTime();
}

function weeksForRaceDate(raceDate: string, now: Date): number | null {
  const race = parseDateOnly(raceDate);
  if (race == null) return null;
  return Math.floor(
    (mondayUtc(race.year, race.month, race.day) - mondayUtc(now.getFullYear(), now.getMonth() + 1, now.getDate())) /
      (7 * 24 * 60 * 60 * 1000),
  ) + 1;
}

function firstDifferentDay(config: PlannerConfig, excluded: PlannerWeekday): PlannerWeekday {
  return sortDays(config.runDays).find((day) => day !== excluded) ?? excluded;
}

export function toggleRunDay(config: PlannerConfig, day: PlannerWeekday): PlannerConfig {
  if (config.runDays.includes(day)) {
    if (config.runDays.length <= 2) return config;
    const runDays = sortDays(config.runDays.filter((item) => item !== day));
    const longRunDay = config.longRunDay === day
      ? (runDays.includes(0) ? 0 : runDays[runDays.length - 1]!)
      : config.longRunDay;
    const clubRemoved = config.clubDay === day;
    return {
      ...config,
      runDays,
      longRunDay,
      clubDay: clubRemoved ? null : config.clubDay,
      clubType: clubRemoved ? null : config.clubType,
    };
  }
  return { ...config, runDays: sortDays([...config.runDays, day]) };
}

export function setLongRunDay(config: PlannerConfig, day: PlannerWeekday): PlannerConfig {
  if (!config.runDays.includes(day) || config.clubType === 'long') return config;
  return { ...config, longRunDay: day };
}

export function setClubEnabled(config: PlannerConfig, enabled: boolean): PlannerConfig {
  if (!enabled) return { ...config, clubDay: null, clubType: null };
  if (config.clubDay != null) return config;
  const clubDay = sortDays(config.runDays).find((day) => day !== config.longRunDay) ?? config.runDays[0];
  return { ...config, clubDay, clubType: 'varies' };
}

export function setClubDay(config: PlannerConfig, day: PlannerWeekday): PlannerConfig {
  if (!config.runDays.includes(day)) return config;
  if (config.clubType !== 'long' && day === config.longRunDay) return config;
  return {
    ...config,
    clubDay: day,
    longRunDay: config.clubType === 'long' ? day : config.longRunDay,
  };
}

export function setClubType(
  config: PlannerConfig,
  clubType: NonNullable<PlannerConfig['clubType']>,
): PlannerConfig {
  if (config.clubDay == null) return config;
  if (clubType === 'long') return { ...config, clubType, longRunDay: config.clubDay };
  return {
    ...config,
    clubType,
    longRunDay: config.longRunDay === config.clubDay
      ? firstDifferentDay(config, config.clubDay)
      : config.longRunDay,
  };
}

export function setRaceDate(
  config: PlannerConfig,
  raceDate: string,
  now: Date,
  basePhaseMinimumWeeks = 11,
): PlannerConfig {
  const date = dateAtNoon(raceDate);
  const totalWeeks = weeksForRaceDate(raceDate, now);
  if (date == null || totalWeeks == null) return config;
  return {
    ...config,
    raceDate,
    totalWeeks,
    includeBasePhase: totalWeeks >= basePhaseMinimumWeeks && config.includeBasePhase,
  };
}

export function validatePlannerDraft(
  config: PlannerConfig,
  fitnessOptions: PlannerFitnessOption[],
  constraints: PlannerState['constraints'],
  now: Date,
  isNewProgram = false,
): PlannerFieldErrors {
  const errors: PlannerFieldErrors = {};
  const raceDate = dateAtNoon(config.raceDate);
  if (raceDate == null) errors.raceDate = 'Choose a valid race date.';
  if (!Number.isFinite(config.raceDist) || config.raceDist < constraints.raceDistanceKm.min || config.raceDist > constraints.raceDistanceKm.max) {
    errors.raceDist = `Race distance must be ${constraints.raceDistanceKm.min}-${constraints.raceDistanceKm.max} km.`;
  }
  if (!Number.isInteger(config.totalWeeks) || config.totalWeeks < 1) {
    errors.totalWeeks = 'Plan must be at least 1 week.';
  } else if (isNewProgram) {
    const expectedWeeks = weeksForRaceDate(config.raceDate, now);
    if (config.totalWeeks < constraints.minimumWeeks) {
      errors.totalWeeks = `Plan must be at least ${constraints.minimumWeeks} weeks.`;
    } else if (expectedWeeks != null && config.totalWeeks !== expectedWeeks) {
      errors.totalWeeks = 'Plan length must match race date.';
    }
  }
  const fitness = fitnessOptions.find((option) => option.distanceKm === config.currentAbilityDist);
  if (fitness == null) {
    errors.currentAbilityDist = 'Choose a current fitness distance.';
  } else if (!Number.isFinite(config.currentAbilitySecs) || config.currentAbilitySecs < fitness.minSeconds || config.currentAbilitySecs > fitness.maxSeconds) {
    errors.currentAbilitySecs = 'Fitness time is outside the supported range.';
  }
  if (config.runDays.length < 2 || new Set(config.runDays).size !== config.runDays.length) {
    errors.runDays = 'Choose at least two run days.';
  }
  if (!config.runDays.includes(config.longRunDay)) errors.longRunDay = 'Choose a selected run day.';
  if (config.clubDay != null && !config.runDays.includes(config.clubDay)) errors.clubDay = 'Choose a selected run day.';
  if (config.clubDay == null && config.clubType != null) errors.clubType = 'Choose a club day first.';
  if (config.clubDay != null && config.clubType == null) errors.clubType = 'Choose a club type.';
  if (config.clubType === 'long' && config.clubDay !== config.longRunDay) errors.clubDay = 'Long club run must be on long run day.';
  if (config.clubType !== 'long' && config.clubDay === config.longRunDay) errors.clubDay = 'Club day must differ from long run day.';
  if (!Number.isFinite(config.startKm) || config.startKm < constraints.startDistanceKm.min || config.startKm > constraints.startDistanceKm.max) {
    errors.startKm = `Starting distance must be ${constraints.startDistanceKm.min}-${constraints.startDistanceKm.max} km.`;
  }
  if (config.includeBasePhase && config.totalWeeks < constraints.basePhaseMinimumWeeks) {
    errors.includeBasePhase = `Base phase requires ${constraints.basePhaseMinimumWeeks} weeks.`;
  }
  return errors;
}

export function formatFitnessTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function plannerConfigAffectsPlan(current: PlannerConfig, next: PlannerConfig): boolean {
  const generationConfig = (config: PlannerConfig) => JSON.stringify({
    raceDist: config.raceDist,
    raceDate: config.raceDate,
    currentAbilityDist: config.currentAbilityDist,
    currentAbilitySecs: config.currentAbilitySecs,
    runDays: [...config.runDays].sort((left, right) => left - right),
    longRunDay: config.longRunDay,
    clubDay: config.clubDay,
    clubType: config.clubType,
    totalWeeks: config.totalWeeks,
    startKm: config.startKm,
    includeBasePhase: config.includeBasePhase,
    effortMetric: config.effortMetric,
  });
  return generationConfig(current) !== generationConfig(next);
}

export function speedDayLabel(config: PlannerConfig): string | null {
  const days = [...config.runDays].sort((left, right) => left - right);
  const longDay = config.clubType === 'long' && config.clubDay != null
    ? config.clubDay
    : days.includes(config.longRunDay) ? config.longRunDay : days[days.length - 1];
  const clubIsRole = config.clubDay != null && config.clubDay !== longDay;
  if (days.length < 3 || (clubIsRole && config.clubType === 'speed')) return null;
  const remaining = days.filter((day) => day !== longDay && !(clubIsRole && day === config.clubDay));
  if (remaining.length === 0) return null;
  let speedDay = remaining[0]!;
  let bestDistance = 0;
  for (const day of remaining) {
    const distance = Math.min(Math.abs(day - longDay), 7 - Math.abs(day - longDay));
    if (distance > bestDistance) {
      bestDistance = distance;
      speedDay = day;
    }
  }
  return `Speed auto-assigned to ${dayLabel(speedDay)}`;
}

export function plannerSummaryParts(
  config: PlannerConfig,
  hasActivePlan: boolean,
  weeksToGo: number | null,
): string[] {
  const parts = [
    `${config.runDays.length} days/wk`,
    `Long: ${dayLabel(config.longRunDay) || 'auto'}`,
  ];
  if (config.raceName.trim()) parts.push(`${config.raceName.trim()} ${config.raceDist}km`);
  if (hasActivePlan && weeksToGo != null) parts.push(weeksToGo <= 1 ? 'Race week!' : `${weeksToGo} wks to go`);
  return parts;
}
