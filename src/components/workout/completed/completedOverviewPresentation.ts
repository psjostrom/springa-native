import type { CompletedBgScore, CompletedSplit } from '@/api/types';

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

export function complianceJudgment(rating: 'good' | 'ok' | 'bad'): string {
  switch (rating) {
    case 'good':
      return 'Good';
    case 'ok':
      return 'OK';
    case 'bad':
      return 'Poor';
  }
}

export function formatSlopePerMin(slope: number): string {
  const sign = slope >= 0 ? '+' : '';
  return `${sign}${slope.toFixed(2)}/min`;
}

export function formatRatePerMin(rate: number): string {
  return `${rate.toFixed(3)}/min`;
}

export function formatElevationM(meters: number): string {
  const rounded = Math.round(meters);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

/** CalendarEvent.distance is in meters — convert for display, matching web Springa. */
export function formatDistanceKm(meters: number): string {
  return `${Number((meters / 1000).toFixed(1))} km`;
}

export function splitAccessibilityLabel(split: CompletedSplit): string {
  const parts = [`Km ${split.km}, pace ${formatPaceMinPerKm(split.paceMinPerKm)} per km`];
  if (split.avgHr != null) parts.push(`avg HR ${split.avgHr} bpm`);
  if (split.elevationChangeM != null) {
    parts.push(`elevation ${formatElevationM(split.elevationChangeM)} m`);
  }
  return parts.join(', ');
}