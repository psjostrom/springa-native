import { http } from 'msw';
import type { CompletedWorkoutOverview } from '@/api/types';
import { apiUrl, jsonOk } from '../helpers';

export function defaultCompletedOverview(
  activityId = 'activity-123',
): CompletedWorkoutOverview {
  return {
    activityId,
    reportCard: {
      bg: {
        rating: 'good',
        startBG: 6.8,
        minBG: 4.9,
        hypo: false,
        worstRate: -0.6,
        lbgi: 1.2,
      },
      hrZone: {
        rating: 'good',
        targetZone: 'z3',
        pctInTarget: 72,
        expectedRepSec: 185,
      },
      entryTrend: {
        rating: 'ok',
        slope30m: 0.9,
        stability: 4.1,
        label: 'Stable',
      },
      recovery: {
        rating: 'bad',
        drop30m: -2.4,
        nadir: 4.2,
        postHypo: true,
        label: 'Deep drop',
      },
    },
    splits: [
      { km: 1, paceMinPerKm: 5.42, avgHr: 142, elevationChangeM: 3.5 },
      { km: 2, paceMinPerKm: 5.38, avgHr: null, elevationChangeM: null },
    ],
    preRunCarbs: { grams: 45, source: 'activity', fallbackEventId: null },
  };
}

/** Overview with every optional field unavailable — BG/streams/pairing all degraded. */
export function degradedCompletedOverview(): CompletedWorkoutOverview {
  return {
    activityId: 'activity-123',
    reportCard: { bg: null, hrZone: null, entryTrend: null, recovery: null },
    splits: null,
    preRunCarbs: { grams: null, source: 'none', fallbackEventId: null },
  };
}

export const completedWorkoutOverviewHandlers = [
  http.get(apiUrl('/api/intervals/activity/:id/overview'), ({ params }) =>
    jsonOk(defaultCompletedOverview(String(params.id))),
  ),
];