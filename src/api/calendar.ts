import { ApiError } from './errors';
import type { CalendarEvent } from './types';

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
    distance: typeof raw.distance === 'number' ? raw.distance : undefined,
    duration: typeof raw.duration === 'number' ? raw.duration : undefined,
    avgHr: typeof raw.avgHr === 'number' ? raw.avgHr : undefined,
    maxHr: typeof raw.maxHr === 'number' ? raw.maxHr : undefined,
    pace: typeof raw.pace === 'number' ? raw.pace : undefined,
    fuelRate: typeof raw.fuelRate === 'number' ? raw.fuelRate : raw.fuelRate === null ? null : undefined,
    prescribedCarbsG:
      typeof raw.prescribedCarbsG === 'number'
        ? raw.prescribedCarbsG
        : raw.prescribedCarbsG === null
          ? null
          : undefined,
    activityId: typeof raw.activityId === 'string' ? raw.activityId : undefined,
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
