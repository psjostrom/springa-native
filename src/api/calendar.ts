import { ApiError } from './errors';
import type { CalendarEvent, HeartRateZoneTimes } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function numberField(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function nullableNumberField(value: unknown): number | null | undefined {
  if (value === null) return null;
  return numberField(value);
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function nullableStringField(value: unknown): string | null | undefined {
  if (value === null) return null;
  return stringField(value);
}

function integerIdField(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}

function parseZoneTimes(value: unknown): HeartRateZoneTimes | undefined {
  if (!isRecord(value)) return undefined;
  const z1 = numberField(value.z1);
  const z2 = numberField(value.z2);
  const z3 = numberField(value.z3);
  const z4 = numberField(value.z4);
  const z5 = numberField(value.z5);
  if (z1 === undefined || z2 === undefined || z3 === undefined || z4 === undefined || z5 === undefined) {
    return undefined;
  }
  return { z1, z2, z3, z4, z5 };
}

function parseEvent(raw: unknown): CalendarEvent | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  if (typeof raw.name !== 'string') return null;
  const date = parseDate(raw.date);
  if (!date) return null;

  const type = raw.type;
  if (type !== 'completed' && type !== 'planned' && type !== 'race') return null;

  const category = raw.category;
  const safeCategory =
    category === 'long' ||
    category === 'interval' ||
    category === 'easy' ||
    category === 'race' ||
    category === 'other'
      ? category
      : 'other';

  return {
    id: raw.id,
    date,
    name: raw.name,
    description: typeof raw.description === 'string' ? raw.description : '',
    type,
    category: safeCategory,
    distance: numberField(raw.distance),
    duration: numberField(raw.duration),
    avgHr: numberField(raw.avgHr),
    maxHr: numberField(raw.maxHr),
    load: numberField(raw.load),
    intensity: numberField(raw.intensity),
    pace: numberField(raw.pace),
    calories: numberField(raw.calories),
    cadence: numberField(raw.cadence),
    zoneTimes: parseZoneTimes(raw.zoneTimes),
    fuelRate: nullableNumberField(raw.fuelRate),
    prescribedCarbsG: nullableNumberField(raw.prescribedCarbsG),
    carbsIngested: nullableNumberField(raw.carbsIngested),
    preRunCarbsG: nullableNumberField(raw.preRunCarbsG),
    rating: nullableStringField(raw.rating),
    feedbackComment: nullableStringField(raw.feedbackComment),
    activityId: stringField(raw.activityId),
    pairedEventId: integerIdField(raw.pairedEventId),
  };
}

/** Reject non-arrays; drop malformed entries rather than failing the whole window. */
export function parseCalendarEvents(data: unknown): CalendarEvent[] {
  if (!Array.isArray(data)) {
    throw new ApiError(200, 'Calendar response had unexpected shape');
  }
  const events: CalendarEvent[] = [];
  for (const item of data) {
    const parsed = parseEvent(item);
    if (parsed) events.push(parsed);
  }
  return events;
}
