import { ApiError } from './errors';
import type {
  ClothingRecommendation,
  PlannedWorkoutCategory,
  PlannedWorkoutClothing,
  PlannedWorkoutDetail,
  WorkoutZone,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function invalid(): never {
  throw new ApiError(200, 'Planned workout response had unexpected shape');
}

function stringField(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === 'string' ? record[key] : invalid();
}

function booleanField(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === 'boolean' ? record[key] : invalid();
}

function finiteNumberField(record: Record<string, unknown>, key: string): number {
  return typeof record[key] === 'number' && Number.isFinite(record[key])
    ? record[key]
    : invalid();
}

function nullableNumber(value: unknown): number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
    ? value
    : invalid();
}

function nullableRecord(
  value: unknown,
): Record<string, unknown> | null {
  return value === null ? null : isRecord(value) ? value : invalid();
}

function zone(value: unknown): WorkoutZone {
  return value === 'z1' ||
    value === 'z2' ||
    value === 'z3' ||
    value === 'z4' ||
    value === 'z5'
    ? value
    : invalid();
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

function parseEvent(value: unknown): PlannedWorkoutDetail['event'] {
  if (!isRecord(value)) return invalid();
  const intervalsEventId = finiteNumberField(value, 'intervalsEventId');
  if (!Number.isSafeInteger(intervalsEventId) || intervalsEventId <= 0) return invalid();
  return {
    id: stringField(value, 'id'),
    intervalsEventId,
    startDateLocal: stringField(value, 'startDateLocal'),
    name: stringField(value, 'name'),
    category: category(value.category),
    description: stringField(value, 'description'),
  };
}

function parseSectionStep(
  value: unknown,
): PlannedWorkoutDetail['structure']['sections'][number]['steps'][number] {
  if (!isRecord(value)) return invalid();
  const label = value.label === null ? null : stringField(value, 'label');
  return {
    label,
    duration: stringField(value, 'duration'),
    zone: zone(value.zone),
    detail: stringField(value, 'detail'),
  };
}

function parseSection(
  value: unknown,
): PlannedWorkoutDetail['structure']['sections'][number] {
  if (!isRecord(value) || !Array.isArray(value.steps)) return invalid();
  const repeats = value.repeats === null ? null : finiteNumberField(value, 'repeats');
  if (repeats !== null && !Number.isSafeInteger(repeats)) return invalid();
  return {
    name: stringField(value, 'name'),
    repeats,
    steps: value.steps.map(parseSectionStep),
  };
}

function parseTimelineSegment(
  value: unknown,
): PlannedWorkoutDetail['structure']['timeline'][number] {
  if (!isRecord(value)) return invalid();
  return {
    durationMinutes: finiteNumberField(value, 'durationMinutes'),
    intensityPercent: finiteNumberField(value, 'intensityPercent'),
    zone: zone(value.zone),
    estimated: booleanField(value, 'estimated'),
  };
}

function parseMetric(
  value: unknown,
  key: 'minutes',
): PlannedWorkoutDetail['metrics']['duration'];
function parseMetric(
  value: unknown,
  key: 'km',
): PlannedWorkoutDetail['metrics']['distance'];
function parseMetric(value: unknown, key: 'minutes' | 'km') {
  const record = nullableRecord(value);
  if (record === null) return null;
  const number = finiteNumberField(record, key);
  const estimated = booleanField(record, 'estimated');
  return key === 'minutes'
    ? { minutes: number, estimated }
    : { km: number, estimated };
}

function parseMetrics(value: unknown): PlannedWorkoutDetail['metrics'] {
  if (!isRecord(value)) return invalid();
  return {
    duration: parseMetric(value.duration, 'minutes'),
    distance: parseMetric(value.distance, 'km'),
    fuelRateGPerHour: nullableNumber(value.fuelRateGPerHour),
    prescribedCarbsG: nullableNumber(value.prescribedCarbsG),
  };
}

function parseWeather(value: unknown): ClothingRecommendation['weather'] {
  if (!isRecord(value)) return invalid();
  return {
    temp: finiteNumberField(value, 'temp'),
    feelsLike: finiteNumberField(value, 'feelsLike'),
    windSpeed: finiteNumberField(value, 'windSpeed'),
    precipitation: finiteNumberField(value, 'precipitation'),
    isRain: booleanField(value, 'isRain'),
    isSnow: booleanField(value, 'isSnow'),
  };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return invalid();
  }
  return value;
}

function parseRecommendation(value: unknown): ClothingRecommendation {
  if (!isRecord(value)) return invalid();
  return {
    upper: stringArray(value.upper),
    lower: stringArray(value.lower),
    accessories: stringArray(value.accessories),
    weather: parseWeather(value.weather),
  };
}

function parseClothing(value: unknown): PlannedWorkoutClothing {
  if (!isRecord(value)) return invalid();
  if (value.status === 'available') {
    return { status: 'available', recommendation: parseRecommendation(value.recommendation) };
  }
  if (
    value.status === 'unavailable' &&
    (value.reason === 'outside-window' || value.reason === 'forecast-unavailable')
  ) {
    return { status: 'unavailable', reason: value.reason };
  }
  return invalid();
}

export function parsePlannedWorkoutDetail(data: unknown): PlannedWorkoutDetail {
  if (
    !isRecord(data) ||
    !isRecord(data.event) ||
    !isRecord(data.structure) ||
    !Array.isArray(data.structure.sections) ||
    !Array.isArray(data.structure.timeline) ||
    !isRecord(data.metrics) ||
    !Object.hasOwn(data, 'preRunCarbsG') ||
    !isRecord(data.clothing)
  ) {
    return invalid();
  }
  return {
    event: parseEvent(data.event),
    structure: {
      sections: data.structure.sections.map(parseSection),
      timeline: data.structure.timeline.map(parseTimelineSegment),
    },
    metrics: parseMetrics(data.metrics),
    preRunCarbsG: nullableNumber(data.preRunCarbsG),
    clothing: parseClothing(data.clothing),
  };
}
