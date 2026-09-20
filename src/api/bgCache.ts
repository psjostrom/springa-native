import { ApiError } from './errors';
import type { CachedBGActivity } from './types';

export function parseBgCacheResponse(data: unknown): CachedBGActivity[] {
  if (!Array.isArray(data)) throw new ApiError(200, 'BG cache response is not an array');
  return data as CachedBGActivity[];
}
