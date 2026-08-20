import { describe, expect, it } from 'vitest';
import { parseCalendarEvents } from './calendar';

const completedEvent = {
  id: 'activity-run-123',
  date: '2026-08-18T06:30:00.000Z',
  name: 'Morning long run',
  description: 'Steady aerobic effort',
  type: 'completed',
  category: 'long',
  distance: 15000,
  duration: 3600,
  avgHr: 145,
  maxHr: 168,
  pace: 4.5,
  fuelRate: null,
  prescribedCarbsG: 60,
  load: 92,
  intensity: 78,
  calories: 980,
  cadence: 176,
  zoneTimes: {
    z1: 300,
    z2: 900,
    z3: 1200,
    z4: 900,
    z5: 300,
  },
  carbsIngested: 55,
  preRunCarbsG: null,
  rating: 'good',
  feedbackComment: 'Felt controlled throughout',
  activityId: 'activity-123',
  pairedEventId: 456,
};

describe('parseCalendarEvents', () => {
  it('preserves the full completed-event contract', () => {
    const [event] = parseCalendarEvents([completedEvent]);

    expect(event).toMatchObject({
      id: completedEvent.id,
      date: new Date(completedEvent.date),
      name: completedEvent.name,
      description: completedEvent.description,
      type: completedEvent.type,
      category: completedEvent.category,
      distance: completedEvent.distance,
      duration: completedEvent.duration,
      avgHr: completedEvent.avgHr,
      maxHr: completedEvent.maxHr,
      pace: completedEvent.pace,
      fuelRate: null,
      prescribedCarbsG: completedEvent.prescribedCarbsG,
      load: completedEvent.load,
      intensity: completedEvent.intensity,
      calories: completedEvent.calories,
      cadence: completedEvent.cadence,
      zoneTimes: completedEvent.zoneTimes,
      carbsIngested: completedEvent.carbsIngested,
      preRunCarbsG: null,
      rating: completedEvent.rating,
      feedbackComment: completedEvent.feedbackComment,
      activityId: completedEvent.activityId,
      pairedEventId: completedEvent.pairedEventId,
    });
  });

  it('omits malformed optional fields without dropping a valid event', () => {
    const [event] = parseCalendarEvents([
      {
        ...completedEvent,
        load: '92',
        intensity: false,
        calories: '980',
        cadence: {},
        zoneTimes: { ...completedEvent.zoneTimes, z5: '300' },
        fuelRate: '45',
        prescribedCarbsG: '60',
        carbsIngested: '55',
        preRunCarbsG: {},
        rating: 5,
        feedbackComment: false,
        pairedEventId: 456.5,
      },
    ]);

    expect(event).toBeDefined();
    expect(event?.load).toBeUndefined();
    expect(event?.intensity).toBeUndefined();
    expect(event?.calories).toBeUndefined();
    expect(event?.cadence).toBeUndefined();
    expect(event?.zoneTimes).toBeUndefined();
    expect(event?.carbsIngested).toBeUndefined();
    expect(event?.preRunCarbsG).toBeUndefined();
    expect(event?.rating).toBeUndefined();
    expect(event?.feedbackComment).toBeUndefined();
    expect(event?.pairedEventId).toBeUndefined();
  });

  it('requires all five numeric heart-rate zones', () => {
    const malformedZoneTimes = [
      { ...completedEvent.zoneTimes, z1: '300' },
      { ...completedEvent.zoneTimes, z2: null },
      { ...completedEvent.zoneTimes, z3: undefined },
      { ...completedEvent.zoneTimes, z4: false },
      { ...completedEvent.zoneTimes, z5: [] },
    ];

    for (const zoneTimes of malformedZoneTimes) {
      const [event] = parseCalendarEvents([{ ...completedEvent, zoneTimes }]);

      expect(event).toBeDefined();
      expect(event?.zoneTimes).toBeUndefined();
    }
  });

  it('keeps missing carb fields undefined and explicit null values null', () => {
    const {
      fuelRate: _fuelRate,
      prescribedCarbsG: _prescribedCarbsG,
      carbsIngested: _carbsIngested,
      preRunCarbsG: _preRunCarbsG,
      ...eventWithoutCarbs
    } = completedEvent;
    const [missing] = parseCalendarEvents([
      eventWithoutCarbs,
    ]);
    const [explicitNull] = parseCalendarEvents([
      {
        ...completedEvent,
        fuelRate: null,
        prescribedCarbsG: null,
        carbsIngested: null,
        preRunCarbsG: null,
        rating: null,
        feedbackComment: null,
      },
    ]);

    expect(missing).toBeDefined();
    expect(missing?.fuelRate).toBeUndefined();
    expect(missing?.prescribedCarbsG).toBeUndefined();
    expect(missing?.carbsIngested).toBeUndefined();
    expect(missing?.preRunCarbsG).toBeUndefined();
    expect(missing?.rating).toBe(completedEvent.rating);
    expect(missing?.feedbackComment).toBe(completedEvent.feedbackComment);
    expect(missing?.fuelRate).not.toBe(0);
    expect(missing?.prescribedCarbsG).not.toBe(0);
    expect(missing?.carbsIngested).not.toBe(0);
    expect(missing?.preRunCarbsG).not.toBe(0);

    expect(explicitNull).toMatchObject({
      fuelRate: null,
      prescribedCarbsG: null,
      carbsIngested: null,
      preRunCarbsG: null,
      rating: null,
      feedbackComment: null,
    });
  });

  it('drops malformed top-level entries while keeping valid events', () => {
    expect(parseCalendarEvents([null, {}, 'invalid', completedEvent])).toHaveLength(1);
  });
});
