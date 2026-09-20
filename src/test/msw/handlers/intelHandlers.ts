import { http } from 'msw';
import { apiUrl, jsonOk } from '../helpers';
import type { CachedBGActivity, PaceCurveData, PaceSuggestion, WellnessEntry } from '@/api/types';

export const mockWellnessEntries: WellnessEntry[] = Array.from({ length: 30 }, (_, i) => {
  const day = (i + 1).toString().padStart(2, '0');
  return {
    id: `2026-09-${day}`,
    restingHR: 58 + (i % 5),
    hrv: 35 + (i % 10),
    sleepSecs: 7.5 * 3600,
    sleepScore: 75 + (i % 15),
    readiness: 65 + (i % 20),
    atl: 45 + (i % 8),
    ctl: 40 + Math.floor(i / 3),
  };
});

export const mockPaceCurveData: PaceCurveData = {
  bestEfforts: [
    {
      distance: 1000,
      label: '1km',
      timeSeconds: 251,
      pace: 4.18,
      activityId: 'act-1',
      activityName: 'Track Intervals',
      activityDate: '2026-08-10',
    },
    {
      distance: 2000,
      label: '2km',
      timeSeconds: 584,
      pace: 4.87,
      activityId: 'act-2',
      activityName: 'Tempo Run',
      activityDate: '2026-08-15',
    },
    {
      distance: 5000,
      label: '5km',
      timeSeconds: 1599,
      pace: 5.33,
      activityId: 'act-3',
      activityName: 'Parkrun 5K',
      activityDate: '2026-08-20',
    },
    {
      distance: 10000,
      label: '10km',
      timeSeconds: 3482,
      pace: 5.8,
      activityId: 'act-4',
      activityName: 'City 10K',
      activityDate: '2026-08-28',
    },
    {
      distance: 21097,
      label: 'HM',
      timeSeconds: 7800,
      pace: 6.16,
      activityId: 'act-5',
      activityName: 'Half Marathon Race',
      activityDate: '2026-09-05',
    },
  ],
  longestRun: {
    distance: 21200,
    activityId: 'act-longest',
    activityName: 'Sunday Long Run',
    activityDate: '2026-09-14',
    movingTime: 7850,
  },
  curve: [
    { distance: 1000, pace: 4.18 },
    { distance: 2000, pace: 4.87 },
    { distance: 3000, pace: 5.05 },
    { distance: 5000, pace: 5.33 },
    { distance: 8000, pace: 5.6 },
    { distance: 10000, pace: 5.8 },
    { distance: 15000, pace: 6.0 },
    { distance: 21097, pace: 6.16 },
  ],
};

function generateBgPoints(count: number, startBg: number, dropPerMin: number) {
  return Array.from({ length: count }, (_, i) => ({
    time: i * 2,
    value: Math.max(4, startBg - i * 2 * dropPerMin),
  }));
}

export const mockBgCache: CachedBGActivity[] = [
  {
    activityId: 'bg-act-1',
    category: 'easy',
    hr: Array.from({ length: 20 }, (_, i) => ({ time: i * 2, value: 130 })),
    glucose: generateBgPoints(20, 8.5, 0.02), // -1.2 mmol/hr
    fuelRate: 30,
  },
  {
    activityId: 'bg-act-2',
    category: 'long',
    hr: Array.from({ length: 30 }, (_, i) => ({ time: i * 2, value: 140 })),
    glucose: generateBgPoints(30, 9.0, 0.04), // -2.4 mmol/hr
    fuelRate: 60,
  },
  {
    activityId: 'bg-act-3',
    category: 'interval',
    hr: Array.from({ length: 20 }, (_, i) => ({ time: i * 2, value: 165 })),
    glucose: generateBgPoints(20, 10.0, 0.06), // -3.6 mmol/hr
    fuelRate: 45,
  },
];

export const mockPaceSuggestion: PaceSuggestion = {
  direction: 'improvement',
  confidence: 'high',
  suggestedAbilitySecs: 285,
  currentAbilitySecs: 300,
  currentAbilityDist: 1000,
  z4ImprovementSecPerKm: -15,
  cardiacCostChangePercent: -4.5,
  raceResult: null,
  sampleSize: 12,
  message: 'Threshold pace improved from 5:00/km to 4:45/km based on recent workouts.',
};

export const intelHandlers = [
  http.get(apiUrl('/api/wellness'), () => jsonOk(mockWellnessEntries)),
  http.get(apiUrl('/api/intervals/pace-curves'), () => jsonOk(mockPaceCurveData)),
  http.get(apiUrl('/api/bg-cache'), () => jsonOk(mockBgCache)),
  http.get(apiUrl('/api/pace-suggestion'), () => jsonOk({ suggestion: mockPaceSuggestion })),
  http.post(apiUrl('/api/pace-suggestion/accept'), () => jsonOk({ ok: true })),
  http.post(apiUrl('/api/pace-suggestion/dismiss'), () => jsonOk({ ok: true })),
];
