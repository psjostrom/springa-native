import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@/api/types';
import { splitAgendaEvents } from './agendaAnchor';
import { formatDuration, formatHrMin } from './format';
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

describe('splitAgendaEvents', () => {
  const today = new Date(2026, 7, 7, 15, 0, 0);

  it('splits before today vs today-and-later', () => {
    const events = [
      event({ id: 'past', date: new Date(2026, 7, 5), name: 'Past' }),
      event({ id: 'today', date: new Date(2026, 7, 7, 9, 0, 0), name: 'Today' }),
      event({ id: 'future', date: new Date(2026, 7, 10), name: 'Future' }),
    ];
    const { earlier, upcoming } = splitAgendaEvents(events, today);
    expect(earlier.map((e) => e.id)).toEqual(['past']);
    expect(upcoming.map((e) => e.id)).toEqual(['today', 'future']);
  });
});

describe('format', () => {
  it('formats durations like web Agenda cards', () => {
    expect(formatHrMin(111)).toBe('1h 51m');
    expect(formatHrMin(60)).toBe('1h');
    expect(formatHrMin(45)).toBe('45m');
    expect(formatDuration(6660)).toBe('1h 51m');
    expect(formatDuration(2700)).toBe('45m');
    expect(formatDuration(119.5)).toBe('2m');
  });
});

describe('calendarWindows', () => {
  it('builds an initial window from today through 11 days ahead', () => {
    const now = new Date(2026, 7, 7); // Aug 7 local
    const w = initialCalendarWindow(now);
    expect(w.oldest).toBe('2026-08-07');
    expect(w.newest).toBe('2026-08-18');
  });

  it('pages older and newer contiguously', () => {
    const older = olderCalendarWindow('2026-08-07');
    expect(older.newest).toBe('2026-08-06');
    expect(older.oldest).toBe('2026-07-26');
    expect(parseIsoDay(older.oldest) < parseIsoDay(older.newest)).toBe(true);

    const newer = newerCalendarWindow('2026-08-18');
    expect(newer.oldest).toBe('2026-08-19');
    expect(newer.newest).toBe('2026-08-30');
    expect(parseIsoDay(newer.oldest) < parseIsoDay(newer.newest)).toBe(true);
  });

  it('keeps contiguous days across a spring-forward DST boundary', () => {
    // CEST spring-forward 2026-03-29: local setDate windows must stay contiguous.
    const older = olderCalendarWindow('2026-03-30');
    expect(older.newest).toBe('2026-03-29');
    expect(older.oldest).toBe('2026-03-18');

    const newer = newerCalendarWindow('2026-03-28');
    expect(newer.oldest).toBe('2026-03-29');
    expect(newer.newest).toBe('2026-04-09');
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
