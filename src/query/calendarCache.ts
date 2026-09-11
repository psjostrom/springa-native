import type { InfiniteData } from '@tanstack/react-query';
import type { CalendarEvent } from '@/api/types';
import { formatIsoDay, initialCalendarWindow, type DateWindow } from '@/domain/calendarWindows';

export function upsertCalendarEvent(current: InfiniteData<CalendarEvent[], DateWindow> | undefined, event: CalendarEvent) {
  const pages = current?.pages.map((page) => page.filter((item) => item.id !== event.id)) ?? [[]];
  const pageParams = current?.pageParams.map((window) => ({ ...window })) ?? [initialCalendarWindow(event.date)];
  const day = formatIsoDay(event.date);
  let index = pageParams.findIndex((window) => window.oldest <= day && window.newest >= day);
  const expandedWindow = index === -1;
  if (expandedWindow) {
    index = day < pageParams[0].oldest ? 0 : pageParams.length - 1;
    pageParams[index].oldest = day < pageParams[index].oldest ? day : pageParams[index].oldest;
    pageParams[index].newest = day > pageParams[index].newest ? day : pageParams[index].newest;
  }
  pages[index].push(event);
  return { data: { pages, pageParams }, expandedWindow };
}
