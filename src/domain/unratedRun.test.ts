import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@/api/types';
import { findUnratedRun, getNextUnratedRunBoundary, SEVEN_DAYS_MS } from './unratedRun';

function makeCompleted(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    activityId: 'act-1',
    name: 'Easy Run',
    description: '',
    date: new Date('2026-09-12T10:00:00Z'),
    type: 'completed',
    category: 'easy',
    rating: null,
    feedbackComment: null,
    ...overrides,
  };
}

describe('unratedRun', () => {
  const now = new Date('2026-09-12T12:00:00Z').getTime();

  it('finds the most recent unrated completed run within 7 days', () => {
    const run1 = makeCompleted({
      id: 'evt-1',
      activityId: 'act-1',
      name: 'Older Run',
      date: new Date('2026-09-10T10:00:00Z'),
    });
    const run2 = makeCompleted({
      id: 'evt-2',
      activityId: 'act-2',
      name: 'Newer Run',
      date: new Date('2026-09-11T10:00:00Z'),
    });

    const result = findUnratedRun([run1, run2], now);
    expect(result).toEqual({
      activityId: 'act-2',
      eventId: 'evt-2',
      name: 'Newer Run',
      date: new Date('2026-09-11T10:00:00Z'),
    });
  });

  it('ignores runs with existing rating', () => {
    const run = makeCompleted({ rating: 'good' });
    expect(findUnratedRun([run], now)).toBeNull();
  });

  it('ignores runs older than 7 days', () => {
    const oldRun = makeCompleted({
      date: new Date(now - SEVEN_DAYS_MS - 1000),
    });
    expect(findUnratedRun([oldRun], now)).toBeNull();
  });

  it('ignores planned events', () => {
    const planned: CalendarEvent = {
      ...makeCompleted(),
      type: 'planned',
    };
    expect(findUnratedRun([planned], now)).toBeNull();
  });

  it('computes next boundary for active unrated run', () => {
    const runDate = new Date('2026-09-10T10:00:00Z');
    const run = makeCompleted({ date: runDate });
    const boundary = getNextUnratedRunBoundary([run], now);
    expect(boundary).toBe(runDate.getTime() + SEVEN_DAYS_MS);
  });
});
