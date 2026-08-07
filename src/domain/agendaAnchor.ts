import type { CalendarEvent } from '@/api/types';
import { startOfLocalDay } from './eventStatus';

/** Split like web AgendaView: earlier (before today) vs upcoming (today onward). */
export function splitAgendaEvents(
  events: readonly CalendarEvent[],
  now = new Date(),
): { earlier: CalendarEvent[]; upcoming: CalendarEvent[] } {
  const today = startOfLocalDay(now);
  const splitIndex = events.findIndex((e) => startOfLocalDay(e.date) >= today);
  if (splitIndex < 0) {
    return { earlier: [...events], upcoming: [] };
  }
  if (splitIndex === 0) {
    return { earlier: [], upcoming: [...events] };
  }
  return {
    earlier: events.slice(0, splitIndex),
    upcoming: events.slice(splitIndex),
  };
}
