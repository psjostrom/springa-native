import { ApiError } from './errors';
import type { PaceSuggestion } from './types';

export function parsePaceSuggestionResponse(data: unknown): PaceSuggestion | null {
  if (data === null || data === undefined) {
    return null;
  }
  if (typeof data !== 'object') {
    throw new ApiError(200, 'Pace suggestion response had unexpected shape');
  }
  const obj = data as Record<string, unknown>;
  const suggestion = obj.suggestion;
  if (suggestion === null || suggestion === undefined) {
    return null;
  }
  if (typeof suggestion !== 'object') {
    throw new ApiError(200, 'Pace suggestion had unexpected shape');
  }
  const s = suggestion as Record<string, unknown>;
  if (
    (s.direction !== 'improvement' && s.direction !== 'regression') ||
    (s.confidence !== 'high' && s.confidence !== 'medium') ||
    typeof s.suggestedAbilitySecs !== 'number' ||
    typeof s.currentAbilitySecs !== 'number' ||
    typeof s.currentAbilityDist !== 'number'
  ) {
    throw new ApiError(200, 'Pace suggestion missing required fields');
  }

  return suggestion as PaceSuggestion;
}
