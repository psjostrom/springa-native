import { http } from 'msw';
import type { PlannedWorkoutDetail } from '@/api/types';
import { apiUrl, jsonOk } from '../helpers';

export function defaultPlannedWorkoutDetail(
  id = 'event-123',
): PlannedWorkoutDetail {
  return {
    event: {
      id,
      intervalsEventId: 123,
      startDateLocal: '2026-08-13T12:00:00',
      name: 'Threshold intervals',
      category: 'interval',
      description: 'Warmup\n- 10m easy\n\nMain set\n- 4x 5m hard',
    },
    replacementCategory: 'quality',
    structure: {
      sections: [
        {
          name: 'Warmup',
          repeats: null,
          steps: [
            {
              label: null,
              duration: '10m',
              zone: 'z2',
              detail: 'Easy 10m',
            },
          ],
        },
        {
          name: 'Main set',
          repeats: 4,
          steps: [
            {
              label: 'Hard',
              duration: '5m',
              zone: 'z4',
              detail: 'Threshold effort',
            },
          ],
        },
      ],
      timeline: [
        {
          durationMinutes: 10,
          intensityPercent: 70,
          zone: 'z2',
          estimated: false,
        },
        {
          durationMinutes: 20,
          intensityPercent: 92,
          zone: 'z4',
          estimated: true,
        },
      ],
    },
    metrics: {
      duration: { minutes: 65, estimated: false },
      distance: { km: 9.2, estimated: true },
      fuelRateGPerHour: 60,
      prescribedCarbsG: 65,
    },
    preRunCarbsG: 25,
    clothing: {
      status: 'available',
      recommendation: {
        upper: ['T-shirt'],
        lower: ['Shorts'],
        accessories: [],
        weather: {
          temp: 16,
          feelsLike: 16,
          windSpeed: 2,
          precipitation: 0,
          isRain: false,
          isSnow: false,
        },
      },
    },
  };
}

export const plannedWorkoutHandlers = [
  http.get(apiUrl('/api/intervals/events/:id'), ({ params }) =>
    jsonOk(defaultPlannedWorkoutDetail(String(params.id))),
  ),
];
