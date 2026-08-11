import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { parsePlannedWorkoutDetail } from './plannedWorkout';

const fixture = {
  event: {
    id: 'event-123',
    intervalsEventId: 123,
    startDateLocal: '2026-08-13T12:00:00',
    name: 'W05 Easy',
    category: 'easy',
    description: 'Warmup\n- 10m 6:30-7:00/km Pace',
  },
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
            detail: '6:30-7:00 /km',
          },
        ],
      },
    ],
    timeline: [
      {
        durationMinutes: 10,
        intensityPercent: 79,
        zone: 'z2',
        estimated: false,
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

describe('parsePlannedWorkoutDetail', () => {
  it('parses the server planned-workout contract', () => {
    const detail = parsePlannedWorkoutDetail(fixture);

    expect(detail.event.id).toBe('event-123');
    expect(detail.structure.sections[0]?.steps[0]?.zone).toBe('z2');
    expect(detail.structure.timeline[0]?.estimated).toBe(false);
    expect(detail.metrics.duration).toEqual({ minutes: 65, estimated: false });
    expect(detail.preRunCarbsG).toBe(25);
    expect(detail.clothing.status).toBe('available');
  });

  it.each([
    null,
    [],
    {},
    { event: {}, structure: {}, metrics: {}, clothing: {} },
  ])('rejects malformed response %#', (value) => {
    expect(() => parsePlannedWorkoutDetail(value)).toThrow(ApiError);
  });
});
