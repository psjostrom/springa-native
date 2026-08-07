import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@/api/types';
import {
  initialCalendarWindow,
  newerCalendarWindow,
  olderCalendarWindow,
  parseIsoDay,
} from './calendarWindows';
import { getCardStatus, getEventIcon, isMissedEvent } from './eventStatus';
import { mergeCalendarEvents } from './mergeCalendarEvents';

function event(partial: Partial<CalendarEvent> & Pick<CalendarEvent, 'id' | 'date' | 'name'>): CalendarEvent {
  return {
    description: '',
    type: 'planned',
    category: 'easy',
    ...partial,
  };
}

describe('calendarWindows', () => {
  it('builds an initial window spanning 14 days back and 28 forward', () => {
    const now = new Date(2026, 7, 7); // Aug 7 local
    const w = initialCalendarWindow(now);
    expect(w.oldest).toBe('2026-07-24');
    expect(w.newest).toBe('2026-09-04');
  });

  it('pages older and newer contiguously', () => {
    const older = olderCalendarWindow('2026-07-24');
    expect(older.newest).toBe('2026-07-23');
    expect(parseIsoDay(older.oldest) < parseIsoDay(older.newest)).toBe(true);

    const newer = newerCalendarWindow('2026-09-04');
    expect(newer.oldest).toBe('2026-09-05');
    expect(parseIsoDay(newer.oldest) < parseIsoDay(newer.newest)).toBe(true);
  });
});

describe('mergeCalendarEvents', () => {
  it('dedupes by id and sorts by date', () => {
    const a = event({ id: 'a', date: new Date(2026, 7, 2), name: 'A' });
    const b = event({ id: 'b', date: new Date(2026, 7, 1), name: 'B' });
    const a2 = event({ id: 'a', date: new Date(2026, 7, 2), name: 'A updated' });
    const merged = mergeCalendarEvents([[a, b], [a2]]);
    expect(merged.map((e) => e.id)).toEqual(['b', 'a']);
    expect(merged[1]?.name).toBe('A updated');
  });
});

describe('eventStatus', () => {
  const today = new Date(2026, 7, 7);

  it('marks past planned events as missed', () => {
    const e = event({
      id: 'm',
      date: new Date(2026, 7, 5),
      name: 'Missed',
      type: 'planned',
    });
    expect(isMissedEvent(e, today)).toBe(true);
    expect(getCardStatus(e, today)).toBe('missed');
  });

  it('does not mark completed past events as missed', () => {
    const e = event({
      id: 'c',
      date: new Date(2026, 7, 5),
      name: 'Done',
      type: 'completed',
    });
    expect(isMissedEvent(e, today)).toBe(false);
    expect(getCardStatus(e, today)).toBe('completed');
  });

  it('returns race flag icon for races', () => {
    expect(
      getEventIcon(
        event({ id: 'r', date: today, name: 'HM', type: 'race', category: 'race' }),
      ),
    ).toBe('🏁');
  });
});
