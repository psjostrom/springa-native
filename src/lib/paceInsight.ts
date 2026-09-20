export interface PaceSuggestion {
  newThresholdPace: number;
  currentPace: number;
  driftPercentage: number;
  message: string;
}

/**
 * Hook to detect pace drift and suggest pace adjustments.
 * Stubbed for now — full calibration requires streaming activity telemetry.
 */
export function usePaceSuggestion(): PaceSuggestion | null {
  return null;
}
