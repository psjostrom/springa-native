import { ApiError } from './errors';
import type { PaceCurveData } from './types';

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
  return {
    bestEfforts: d.bestEfforts,
    curve: Array.isArray(d.curve) ? d.curve : [],
    longestRun:
      d.longestRun && typeof d.longestRun === 'object'
        ? (d.longestRun as PaceCurveData['longestRun'])
        : null,
  };
}
