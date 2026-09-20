import type { WellnessEntry } from '@/api/types';

export interface ReadinessBaseline {
  mean: number;
  sd: number;
}

export type MetricKey = 'hrv' | 'rhr' | 'sleep' | 'tsb' | 'readiness';

export function computeStats(values: number[]): ReadinessBaseline {
  if (values.length === 0) return { mean: 0, sd: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { mean, sd: Math.sqrt(variance) };
}

export function zScoreToScore(
  value: number,
  mean: number,
  sd: number,
  invert = false,
): number {
  if (sd === 0) return 50;
  const z = (value - mean) / sd;
  const adjusted = invert ? -z : z;
  const score = 50 + adjusted * 25;
  return Math.max(0, Math.min(100, score));
}

export function tsbToScore(tsb: number): number {
  if (tsb <= -30) return 0;
  if (tsb >= 15) return 100;
  return ((tsb + 30) / 45) * 100;
}

export function computeReadiness(
  hrv: number | null,
  hrvBaseline: ReadinessBaseline,
  rhr: number | null,
  rhrBaseline: ReadinessBaseline,
  sleep: number | null,
  tsb: number | null,
): number | null {
  const scores: { value: number; weight: number }[] = [];

  if (hrv != null && hrvBaseline.mean > 0) {
    scores.push({
      value: zScoreToScore(hrv, hrvBaseline.mean, hrvBaseline.sd),
      weight: 30,
    });
  }

  if (rhr != null && rhrBaseline.mean > 0) {
    scores.push({
      value: zScoreToScore(rhr, rhrBaseline.mean, rhrBaseline.sd, true),
      weight: 20,
    });
  }

  if (sleep != null && sleep > 12) {
    scores.push({ value: sleep, weight: 25 });
  } else if (sleep != null) {
    const sleepScore = Math.max(0, Math.min(100, ((sleep - 4) / 5) * 100));
    scores.push({ value: sleepScore, weight: 25 });
  }

  if (tsb != null) {
    scores.push({ value: tsbToScore(tsb), weight: 25 });
  }

  if (scores.length === 0) return null;

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce((sum, s) => sum + s.value * s.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

export interface ComputedReadinessData {
  readiness: number | null;
  isComputed: boolean;
  hrv: number | null;
  restingHR: number | null;
  sleep: number | null;
  sleepLabel: string;
  sleepUnit: string;
  tsb: number | null;
  hrvSparkline: number[];
  hrSparkline: number[];
  sleepSparkline: number[];
  hrvBaseline: ReadinessBaseline;
  rhrBaseline: ReadinessBaseline;
}

export function computeReadinessData(
  entries: WellnessEntry[],
): ComputedReadinessData | null {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const latest = sorted[sorted.length - 1];
  if (!latest) return null;

  const baseline28 = sorted.slice(-28);
  const hrvValues = baseline28
    .map((e) => e.hrv)
    .filter((v): v is number => v != null && v > 0);
  const rhrValues = baseline28
    .map((e) => e.restingHR)
    .filter((v): v is number => v != null && v > 0);

  const hrvBaseline = computeStats(hrvValues);
  const rhrBaseline = computeStats(rhrValues);

  const hrv = latest.hrv ?? null;
  const restingHR = latest.restingHR ?? null;
  const sleep =
    latest.sleepScore ??
    (latest.sleepSecs != null
      ? Math.round((latest.sleepSecs / 3600) * 10) / 10
      : null);
  const tsb =
    latest.ctl != null && latest.atl != null
      ? Math.round(latest.ctl - latest.atl)
      : null;

  const builtInReadiness = latest.readiness ?? null;
  const computedVal =
    builtInReadiness == null
      ? computeReadiness(hrv, hrvBaseline, restingHR, rhrBaseline, sleep, tsb)
      : null;
  const readiness = builtInReadiness ?? computedVal;
  const isComputed = builtInReadiness == null && computedVal != null;

  const hrvSparkline = sorted
    .slice(-14)
    .map((e) => e.hrv)
    .filter((v): v is number => v != null && v > 0);
  const hrSparkline = sorted
    .slice(-14)
    .map((e) => e.restingHR)
    .filter((v): v is number => v != null && v > 0);
  const sleepSparkline = sorted
    .slice(-14)
    .map((e) =>
      e.sleepScore ?? (e.sleepSecs ? e.sleepSecs / 3600 : undefined),
    )
    .filter((v): v is number => v != null && v > 0);

  const sleepLabel = sleep != null && sleep > 12 ? 'Sleep Score' : 'Sleep';
  const sleepUnit = sleep != null && sleep > 12 ? '' : 'hrs';

  return {
    readiness,
    isComputed,
    hrv,
    restingHR,
    sleep,
    sleepLabel,
    sleepUnit,
    tsb,
    hrvSparkline,
    hrSparkline,
    sleepSparkline,
    hrvBaseline,
    rhrBaseline,
  };
}

export function getReadinessExplanation(
  metric: MetricKey,
  value: number,
  baseline: ReadinessBaseline,
): { definition: string; context: string } {
  const zScore = baseline.sd > 0 ? (value - baseline.mean) / baseline.sd : 0;

  switch (metric) {
    case 'hrv': {
      let ctx: string;
      if (zScore > 1) {
        ctx = 'Well above your baseline — excellent recovery.';
      } else if (zScore > 0.3) {
        ctx = 'Above average — good recovery state.';
      } else if (zScore > -0.3) {
        ctx = 'Within normal range.';
      } else if (zScore > -1) {
        ctx = 'Below average — consider lighter training.';
      } else {
        ctx = 'Well below baseline — prioritize recovery.';
      }
      return {
        definition:
          'Heart Rate Variability measures nervous system recovery. Higher values typically indicate better recovery and readiness.',
        context: ctx,
      };
    }
    case 'rhr': {
      const diff = value - baseline.mean;
      let ctx: string;
      if (diff < -3) {
        ctx = `${Math.abs(Math.round(diff))} bpm below average — very fresh.`;
      } else if (diff < -1) {
        ctx = 'Slightly below average — well recovered.';
      } else if (diff < 2) {
        ctx = 'At your normal baseline.';
      } else if (diff < 5) {
        ctx = 'Elevated — possible fatigue or stress.';
      } else {
        ctx = `${Math.round(diff)} bpm above average — significant elevation.`;
      }
      return {
        definition:
          'Resting heart rate reflects cardiovascular recovery. Lower values typically indicate better fitness and recovery.',
        context: ctx,
      };
    }
    case 'sleep': {
      let ctx: string;
      if (value > 12) {
        if (value >= 80) {
          ctx = 'Excellent sleep — optimal for recovery.';
        } else if (value >= 60) {
          ctx = 'Decent sleep — adequate recovery.';
        } else {
          ctx = 'Poor sleep score — recovery may be impacted.';
        }
      } else {
        if (value >= 8) {
          ctx = 'Optimal duration for recovery.';
        } else if (value >= 7) {
          ctx = 'Good sleep duration.';
        } else if (value >= 6) {
          ctx = 'Slightly short — aim for 7-9 hours.';
        } else {
          ctx = 'Insufficient sleep — recovery impacted.';
        }
      }
      return {
        definition:
          value > 12
            ? 'Sleep quality score from your wearable (0-100). Factors in duration, deep sleep, and restfulness.'
            : 'Total sleep duration. 7-9 hours recommended for optimal recovery.',
        context: ctx,
      };
    }
    case 'tsb': {
      let ctx: string;
      if (value < -20) {
        ctx = 'High fatigue from recent training load. Adaptation is occurring.';
      } else if (value < -10) {
        ctx = 'Productive training zone. Accumulating fitness with manageable fatigue.';
      } else if (value < 5) {
        ctx = 'Balanced state. Good for standard training workouts.';
      } else if (value < 15) {
        ctx = 'Low fatigue, high freshness. Ready for race or hard effort.';
      } else {
        ctx = 'Very fresh, potential fitness loss if prolonged.';
      }
      return {
        definition:
          'Training Stress Balance (TSB = CTL - ATL). Positive means fresh; negative means fatigue from training load.',
        context: ctx,
      };
    }
    case 'readiness': {
      let ctx: string;
      if (value >= 70) {
        ctx = 'Great shape to tackle planned training or hard efforts.';
      } else if (value >= 50) {
        ctx = 'Ready for normal training. Listen to your body on intensity.';
      } else if (value >= 30) {
        ctx = 'Elevated fatigue. Consider keeping effort easy.';
      } else {
        ctx = 'High stress or fatigue. Prioritize sleep and active recovery.';
      }
      return {
        definition:
          'Composite readiness indicator reflecting nervous system, cardiovascular, sleep, and training load state.',
        context: ctx,
      };
    }
  }
}
