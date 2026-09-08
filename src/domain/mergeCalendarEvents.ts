import type { CalendarEvent } from '@/api/types';

/** Merge event pages, unique by id, sorted ascending by date then id. */
export function mergeCalendarEvents(pages: CalendarEvent[][]): CalendarEvent[] {
  const byId = new Map<string, CalendarEvent>();
  for (const page of pages) {
    for (const event of page) {
      const normalized =
        event.date instanceof Date
          ? event
          : { ...event, date: new Date(event.date) };
      byId.set(normalized.id, normalized);
    }
  }
  return [...byId.values()].sort((a, b) => {
    const t = a.date.getTime() - b.date.getTime();
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });
}

