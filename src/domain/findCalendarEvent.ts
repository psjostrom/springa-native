import type { CalendarEvent } from '@/api/types';

export function findCalendarEvent(
  events: readonly CalendarEvent[],
  id: string,
): CalendarEvent | undefined {
  return events.find((event) => event.id === id);
}
