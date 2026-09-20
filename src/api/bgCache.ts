import { ApiError } from './errors';
import type { BGDataPoint, CachedBGActivity, WorkoutCategory } from './types';

function isValidPoint(p: unknown): p is BGDataPoint {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  const pt = p as Record<string, unknown>;
  return (
    typeof pt.time === 'number' &&
    Number.isFinite(pt.time) &&
    typeof pt.value === 'number' &&
    Number.isFinite(pt.value)
  );
}

const ALLOWED_CATEGORIES: Set<string> = new Set(['easy', 'long', 'interval']);

export function parseBgCacheResponse(data: unknown): CachedBGActivity[] {
  if (!Array.isArray(data)) throw new ApiError(200, 'BG cache response is not an array');

  const validActivities: CachedBGActivity[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const a = item as Record<string, unknown>;
    if (typeof a.activityId !== 'string' || !a.activityId) continue;
    if (typeof a.category !== 'string' || !ALLOWED_CATEGORIES.has(a.category)) continue;
    if (!Array.isArray(a.hr) || !a.hr.every(isValidPoint)) continue;

    let glucose: BGDataPoint[] | undefined;
    if (a.glucose !== undefined) {
      if (!Array.isArray(a.glucose) || !a.glucose.every(isValidPoint)) continue;
      glucose = a.glucose;
    }

    const fuelRate =
      typeof a.fuelRate === 'number' && Number.isFinite(a.fuelRate)
        ? a.fuelRate
        : null;

    validActivities.push({
      activityId: a.activityId,
      category: a.category as WorkoutCategory,
      hr: a.hr,
      glucose,
      fuelRate,
    });
  }

  return validActivities;
}
