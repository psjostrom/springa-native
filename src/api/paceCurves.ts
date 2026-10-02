import { ApiError } from './errors';
import type { BestEffort, PaceCurveData } from './types';

function isValidBestEffort(item: unknown): item is BestEffort {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const be = item as Record<string, unknown>;
  return (
    typeof be.distance === 'number' &&
    Number.isFinite(be.distance) &&
    typeof be.timeSeconds === 'number' &&
    Number.isFinite(be.timeSeconds) &&
    typeof be.pace === 'number' &&
    Number.isFinite(be.pace) &&
    typeof be.label === 'string'
  );
}

function isValidCurvePoint(item: unknown): item is { distance: number; pace: number } {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const pt = item as Record<string, unknown>;
  return (
    typeof pt.distance === 'number' &&
    Number.isFinite(pt.distance) &&
    typeof pt.pace === 'number' &&
    Number.isFinite(pt.pace)
  );
}

export function parsePaceCurveData(data: unknown): PaceCurveData | null {
  if (data === null || data === undefined) {
    return null;
  }
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new ApiError(200, 'Pace curves response had unexpected shape');
  }
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.bestEfforts)) {
    throw new ApiError(200, 'Pace curves missing bestEfforts');
  }
  if (d.curve !== undefined && !Array.isArray(d.curve)) {
    throw new ApiError(200, 'Pace curves curve must be an array');
  }

  const bestEfforts = d.bestEfforts.filter(isValidBestEffort);
  const curve = Array.isArray(d.curve) ? d.curve.filter(isValidCurvePoint) : [];

  const lr = d.longestRun as Record<string, unknown> | null | undefined;
  const longestRun =
    lr &&
    typeof lr === 'object' &&
    !Array.isArray(lr) &&
    typeof lr.distance === 'number' &&
    Number.isFinite(lr.distance) &&
    (lr.movingTime == null ||
      (typeof lr.movingTime === 'number' && Number.isFinite(lr.movingTime)))
      ? (lr as PaceCurveData['longestRun'])
      : null;

  return {
    bestEfforts,
    curve,
    longestRun,
  };
}
