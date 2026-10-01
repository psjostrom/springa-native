import type { WellnessEntry } from '@/api/types';

export interface FitnessDataPoint {
  date: string; // yyyy-MM-dd
  ctl: number; // Chronic Training Load (Fitness) — 42-day EMA
  atl: number; // Acute Training Load (Fatigue) — 7-day EMA
  tsb: number; // Training Stress Balance (Form) = CTL - ATL
}

export type FitnessTimeWindow = '90d' | '180d' | '1y' | 'all';

/**
 * Convert Intervals.icu wellness entries to FitnessDataPoints.
 * Intervals computes CTL/ATL/TSB authoritatively across all activities.
 */
export function wellnessToFitnessData(entries: WellnessEntry[]): FitnessDataPoint[] {
  return [...entries]
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter((e) => e.ctl != null && e.atl != null)
    .map((e) => ({
      date: e.id,
      ctl: Math.round((e.ctl ?? 0) * 10) / 10,
      atl: Math.round((e.atl ?? 0) * 10) / 10,
      tsb: Math.round(((e.ctl ?? 0) - (e.atl ?? 0)) * 10) / 10,
    }));
}

export function filterFitnessByWindow(
  data: FitnessDataPoint[],
  window: FitnessTimeWindow,
): FitnessDataPoint[] {
  if (window === 'all' || data.length === 0) return data;
  const days = window === '90d' ? 90 : window === '180d' ? 180 : 365;
  return data.slice(-days);
}
