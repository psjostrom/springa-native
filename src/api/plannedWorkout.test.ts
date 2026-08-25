import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { parsePlannedWorkoutDetail } from './plannedWorkout';

const fixture = {
  effortMetric: 'pace',
  heartRateMetricAvailable: false,
  event: {
    id: 'event-123',
    intervalsEventId: 123,
    startDateLocal: '2026-08-13T12:00:00',
    name: 'W05 Easy',
    category: 'easy',
    description: 'Warmup\n- 10m 6:30-7:00/km Pace',
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

    expect(detail.effortMetric).toBe('pace');
    expect(detail.heartRateMetricAvailable).toBe(false);
    expect(detail.event.id).toBe('event-123');
    expect(detail.replacementCategory).toBe('quality');
    expect(detail.structure.sections[0]?.steps[0]?.zone).toBe('z2');
    expect(detail.structure.timeline[0]?.estimated).toBe(false);
    expect(detail.metrics.duration).toEqual({ minutes: 65, estimated: false });
    expect(detail.preRunCarbsG).toBe(25);
    expect(detail.clothing.status).toBe('available');
  });

  it('rejects an unknown replacement category', () => {
    expect(() => parsePlannedWorkoutDetail({
      ...fixture,
      replacementCategory: 'tempo',
    })).toThrow(ApiError);
  });

  it('rejects a missing effort metric', () => {
    const { effortMetric: _effortMetric, ...missingEffortMetric } = fixture;

    expect(() => parsePlannedWorkoutDetail(missingEffortMetric)).toThrow(ApiError);
  });

  it('rejects an unknown effort metric', () => {
    expect(() => parsePlannedWorkoutDetail({
      ...fixture,
      effortMetric: 'power',
    })).toThrow(ApiError);
  });

  it('rejects a non-boolean heart-rate availability field', () => {
    expect(() => parsePlannedWorkoutDetail({
      ...fixture,
      heartRateMetricAvailable: 'false',
    })).toThrow(ApiError);
  });

  it('rejects a missing heart-rate availability field', () => {
    const {
      heartRateMetricAvailable: _heartRateMetricAvailable,
      ...missingHeartRateAvailability
    } = fixture;

    expect(() => parsePlannedWorkoutDetail(missingHeartRateAvailability)).toThrow(ApiError);
  });

  it('accepts responses from servers without replacement intent', () => {
    const { replacementCategory: _replacementCategory, ...legacyFixture } = fixture;

    expect(parsePlannedWorkoutDetail(legacyFixture).replacementCategory).toBeNull();
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
