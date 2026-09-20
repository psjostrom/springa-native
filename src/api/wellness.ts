import { ApiError } from './errors';
import type { WellnessEntry } from './types';

export function parseWellnessEntries(data: unknown): WellnessEntry[] {
  if (!Array.isArray(data)) throw new ApiError(200, 'Wellness response is not an array');
  return data.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new ApiError(200, 'Wellness entry is not an object');
    }
    const e = item as Record<string, unknown>;
    if (typeof e.id !== 'string') {
      throw new ApiError(200, 'Wellness entry missing id');
    }
    return {
      id: e.id,
      restingHR: typeof e.restingHR === 'number' ? e.restingHR : undefined,
      hrv: typeof e.hrv === 'number' ? e.hrv : undefined,
      sleepSecs: typeof e.sleepSecs === 'number' ? e.sleepSecs : undefined,
      sleepScore: typeof e.sleepScore === 'number' ? e.sleepScore : undefined,
      readiness: typeof e.readiness === 'number' ? e.readiness : undefined,
      atl: typeof e.atl === 'number' ? e.atl : undefined,
      ctl: typeof e.ctl === 'number' ? e.ctl : undefined,
    };
  });
}
