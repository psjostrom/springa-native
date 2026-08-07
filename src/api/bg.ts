import { ApiError } from './client';
import type { BgPayload } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseBgPayload(data: unknown): BgPayload {
  if (!isRecord(data)) {
    throw new ApiError(200, 'BG response had unexpected shape');
  }

  let current: BgPayload['current'] = null;
  if (isRecord(data.current)) {
    const mmol = data.current.mmol;
    const ts = data.current.ts;
    if (typeof mmol === 'number' && typeof ts === 'number') {
      current = {
        mmol,
        ts,
        arrow: typeof data.current.arrow === 'string' ? data.current.arrow : undefined,
        direction:
          typeof data.current.direction === 'string' ? data.current.direction : undefined,
      };
    }
  } else if (data.current == null) {
    current = null;
  }

  let trend: BgPayload['trend'] = null;
  if (isRecord(data.trend)) {
    trend = {
      slope: typeof data.trend.slope === 'number' ? data.trend.slope : undefined,
      arrow: typeof data.trend.arrow === 'string' ? data.trend.arrow : undefined,
      direction: typeof data.trend.direction === 'string' ? data.trend.direction : undefined,
    };
  } else if (data.trend == null) {
    trend = null;
  }

  return {
    readings: Array.isArray(data.readings) ? data.readings : undefined,
    current,
    trend,
  };
}
