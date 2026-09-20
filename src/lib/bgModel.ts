import type { CachedBGActivity } from '@/api/types';

export interface CategoryBGResponse {
  category: 'easy' | 'long' | 'interval';
  medianRate: number; // mmol/L per minute (negative = dropping)
  sampleCount: number;
  confidence: 'low' | 'medium' | 'high';
  avgFuelRate: number | null;
  activityCount: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const WINDOW_SIZE = 5; // minutes
const SKIP_START = 5; // skip first 5 minutes
const SKIP_END = 2; // skip last 2 minutes

export function buildBGCategories(cached: CachedBGActivity[]): {
  categories: CategoryBGResponse[];
  activitiesAnalyzed: number;
} {
  if (!cached || cached.length === 0) {
    return { categories: [], activitiesAnalyzed: 0 };
  }

  const validCategories: ('easy' | 'long' | 'interval')[] = ['easy', 'long', 'interval'];
  const categoryObservations: Record<
    'easy' | 'long' | 'interval',
    { rates: number[]; fuelRates: number[]; activityIds: Set<string> }
  > = {
    easy: { rates: [], fuelRates: [], activityIds: new Set() },
    long: { rates: [], fuelRates: [], activityIds: new Set() },
    interval: { rates: [], fuelRates: [], activityIds: new Set() },
  };

  const analyzedActivityIds = new Set<string>();

  for (const activity of cached) {
    const cat = activity.category as 'easy' | 'long' | 'interval';
    if (!validCategories.includes(cat)) continue;

    const glucose = activity.glucose;
    if (!glucose || glucose.length < 5) continue;

    analyzedActivityIds.add(activity.activityId);
    categoryObservations[cat].activityIds.add(activity.activityId);
    if (activity.fuelRate != null && activity.fuelRate > 0) {
      categoryObservations[cat].fuelRates.push(activity.fuelRate);
    }

    const startTime = glucose[0].time + SKIP_START;
    const endTime = glucose[glucose.length - 1].time - SKIP_END;

    const gMap = new Map(glucose.map((p) => [Math.round(p.time), p.value]));

    const avgGlucose = (center: number) => {
      let sum = 0;
      let count = 0;
      for (let m = center - 1; m <= center + 1; m++) {
        const val = gMap.get(m);
        if (val != null) {
          sum += val;
          count++;
        }
      }
      return count > 0 ? sum / count : null;
    };

    for (let t = startTime; t <= endTime - WINDOW_SIZE; t++) {
      let startMin: number | null = null;
      let endMin: number | null = null;
      for (let m = t; m < t + WINDOW_SIZE; m++) {
        if (gMap.has(m)) {
          startMin ??= m;
          endMin = m;
        }
      }
      if (startMin == null || endMin == null || startMin === endMin) continue;

      const gStart = avgGlucose(startMin);
      const gEnd = avgGlucose(endMin);
      if (gStart == null || gEnd == null) continue;

      const windowDuration = endMin - startMin || WINDOW_SIZE;
      const rate = (gEnd - gStart) / windowDuration;
      categoryObservations[cat].rates.push(rate);
    }
  }

  const categories: CategoryBGResponse[] = [];

  for (const cat of validCategories) {
    const data = categoryObservations[cat];
    if (data.rates.length === 0) continue;

    const medianRate = median(data.rates);
    const sampleCount = data.rates.length;
    const confidence: 'low' | 'medium' | 'high' =
      sampleCount >= 30 ? 'high' : sampleCount >= 10 ? 'medium' : 'low';

    const avgFuelRate =
      data.fuelRates.length > 0
        ? Math.round(
            data.fuelRates.reduce((a, b) => a + b, 0) / data.fuelRates.length,
          )
        : null;

    categories.push({
      category: cat,
      medianRate,
      sampleCount,
      confidence,
      avgFuelRate,
      activityCount: data.activityIds.size,
    });
  }

  return {
    categories,
    activitiesAnalyzed: analyzedActivityIds.size,
  };
}
