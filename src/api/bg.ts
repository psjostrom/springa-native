import { ApiError } from './errors';
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

  return {
    readings: Array.isArray(data.readings) ? data.readings : undefined,
    current,
  };
}
