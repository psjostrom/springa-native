import type { CompletedBgScore, CompletedSplit } from '@/api/types';
import { HrZoneColors, SpringaColors } from '@/theme/colors';

export type PaceSplitZone = {
  label: 'Hard' | 'Interval' | 'Race' | 'Easy';
  color: string;
};

export type PerformanceJudgment = {
  label: string;
  color: string;
  fraction: number;
};

export function formatPaceMinPerKm(paceMinPerKm: number): string {
  const totalSeconds = Math.round(paceMinPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatMmol(value: number): string {
  return value.toFixed(1);
}

export function bgJudgment(score: Pick<CompletedBgScore, 'hypo' | 'worstRate'>): string {
  if (score.hypo) return 'Hypo';
  if (score.worstRate < -0.17) return 'Crashing';
  if (score.worstRate < -0.11) return 'Dropping';
  return 'Stable';
}

export function complianceJudgment(rating: 'good' | 'ok' | 'bad'): PerformanceJudgment {
  switch (rating) {
    case 'good':
      return { label: 'Good', color: SpringaColors.success, fraction: 0.9 };
    case 'ok':
      return { label: 'OK', color: SpringaColors.warning, fraction: 0.6 };
    case 'bad':
      return { label: 'Poor', color: SpringaColors.error, fraction: 0.3 };
  }
}

export function formatFiveMinuteChange(ratePerMinute: number): string {
  const change = Math.abs(ratePerMinute * 5) < 0.05 ? 0 : ratePerMinute * 5;
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}`;
}

export function formatElevationM(meters: number): string {
  const rounded = Math.round(meters);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

/** CalendarEvent.distance is in meters — convert for display, matching web Springa. */
export function formatDistanceKm(meters: number): string {
  return `${Number((meters / 1000).toFixed(1))} km`;
}

export function getPaceSplitZone(paceMinPerKm: number): PaceSplitZone {
  if (paceMinPerKm < 5.083) return { label: 'Hard', color: HrZoneColors[5] };
  if (paceMinPerKm < 5.583) return { label: 'Interval', color: SpringaColors.warning };
  if (paceMinPerKm < 7) return { label: 'Race', color: SpringaColors.chartSecondary };
  return { label: 'Easy', color: SpringaColors.success };
}

export function paceSplitBarWidth(
  paceMinPerKm: number,
  fastestPaceMinPerKm: number,
): number {
  if (paceMinPerKm <= 0 || fastestPaceMinPerKm <= 0) return 0;
  const speed = 60 / paceMinPerKm;
  const maxSpeed = 60 / fastestPaceMinPerKm;
  return Math.round(Math.pow(speed / maxSpeed, 2) * 100);
}

export function cadenceJudgment(spm: number): PerformanceJudgment {
  if (spm >= 180) return { label: 'Excellent', color: SpringaColors.success, fraction: 1 };
  if (spm >= 170) return { label: 'Good', color: SpringaColors.chartSecondary, fraction: 0.75 };
  if (spm >= 160) return { label: 'OK', color: SpringaColors.warning, fraction: 0.5 };
  return { label: 'Low', color: SpringaColors.error, fraction: 0.25 };
}

export function loadJudgment(load: number): PerformanceJudgment {
  if (load >= 150) return { label: 'Very Hard', color: SpringaColors.error, fraction: 1 };
  if (load >= 100) return { label: 'Hard', color: HrZoneColors[4], fraction: 0.75 };
  if (load >= 50) return { label: 'Moderate', color: SpringaColors.warning, fraction: 0.5 };
  return { label: 'Light', color: SpringaColors.success, fraction: 0.25 };
}

export function intensityJudgment(pct: number): PerformanceJudgment {
  if (pct >= 100) return { label: 'Maximum', color: SpringaColors.error, fraction: 1 };
  if (pct >= 80) return { label: 'Hard', color: HrZoneColors[4], fraction: 0.75 };
  if (pct >= 60) return { label: 'Moderate', color: SpringaColors.warning, fraction: 0.5 };
  return { label: 'Easy', color: SpringaColors.success, fraction: 0.25 };
}

export function splitAccessibilityLabel(split: CompletedSplit): string {
  const parts = [`Km ${split.km}, pace ${formatPaceMinPerKm(split.paceMinPerKm)} per km`];
  if (split.avgHr != null) parts.push(`avg HR ${split.avgHr} bpm`);
  if (split.elevationChangeM != null) {
    parts.push(`elevation ${formatElevationM(split.elevationChangeM)} m`);
  }
  return parts.join(', ');
}
