import { describe, expect, it } from 'vitest';
import {
  extractWorkoutNotes,
  formatDistanceKm,
  formatLocalDateTime,
  formatWorkoutStepDuration,
  formatTimelineMinutes,
  parseLocalDateTime,
  timelineSegmentHeightPercent,
} from './plannedWorkoutPresentation';

describe('planned workout presentation helpers', () => {
  it('rounds estimated distances to one decimal place', () => {
    expect(formatDistanceKm(9.26)).toBe('9.3 km');
  });

  it('rounds estimated timeline minutes without exposing raw floats', () => {
    expect(formatTimelineMinutes(3.8683241188959747)).toBe('3.9m');
    expect(formatTimelineMinutes(10)).toBe('10m');
  });

  it('formats sub-kilometer workout steps as meters', () => {
    expect(formatWorkoutStepDuration('0.6 km')).toBe('600m');
    expect(formatWorkoutStepDuration('0.2km')).toBe('200m');
    expect(formatWorkoutStepDuration('10m')).toBe('10m');
  });

  it('extracts coaching notes without raw interval instructions', () => {
    expect(
      extractWorkoutNotes(
        'Track-style reps to sharpen your pace awareness.\n\nWarmup\n- Warmup 10m 7:08-20:55/km Pace intensity=warmup',
      ),
    ).toBe('Track-style reps to sharpen your pace awareness.');
    expect(extractWorkoutNotes('Warmup\n- 10m easy')).toBeNull();
  });

  it('maps PWA intensity values to visibly different bar heights', () => {
    expect(timelineSegmentHeightPercent(92)).toBeGreaterThan(
      timelineSegmentHeightPercent(70),
    );
    expect(timelineSegmentHeightPercent(70)).toBe(30);
    expect(timelineSegmentHeightPercent(92)).toBeCloseTo(81.333, 2);
  });

  it('round-trips local move date-times without UTC conversion', () => {
    const date = parseLocalDateTime('2026-08-14T12:05:09');
    expect(formatLocalDateTime(date)).toBe('2026-08-14T12:05:09');
  });
});
