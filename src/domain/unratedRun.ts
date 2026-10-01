import type { CalendarEvent } from '@/api/types';

export interface UnratedRun {
  activityId: string;
  eventId: string;
  name: string;
  date: Date;
}

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const CLOCK_DRIFT_TOLERANCE_MS = 24 * 60 * 60 * 1000;

export function isUnratedCompletedRun(
  event: CalendarEvent,
): event is CalendarEvent & { activityId: string } {
  return (
    event.type === 'completed' &&
    typeof event.activityId === 'string' &&
    event.activityId.length > 0 &&
    !event.isRated &&
    !event.rating &&
    !event.feedbackComment
  );
}

/**
 * Detect the most recent completed run in the last 7 days that hasn't been rated.
 */
export function findUnratedRun(
  events: readonly CalendarEvent[],
  now = Date.now(),
): UnratedRun | null {
  const cutoff = now - SEVEN_DAYS_MS;
  const maxValidTime = now + CLOCK_DRIFT_TOLERANCE_MS;
  const match = events
    .filter((event): event is CalendarEvent & { activityId: string } => {
      if (!isUnratedCompletedRun(event)) return false;
      const time =
        event.date instanceof Date ? event.date.getTime() : new Date(event.date).getTime();
      return time >= cutoff && time <= maxValidTime;
    })
    .sort((a, b) => {
      const timeA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
      const timeB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
      return timeB - timeA;
    })
    .at(0);

  if (!match) return null;

  return {
    activityId: match.activityId,
    eventId: match.id,
    name: match.name,
    date: match.date instanceof Date ? match.date : new Date(match.date),
  };
}

export function getNextUnratedRunBoundary(
  events: readonly CalendarEvent[],
  now = Date.now(),
): number | null {
  const maxValidTime = now + CLOCK_DRIFT_TOLERANCE_MS;
  const nextBoundary = events
    .filter(isUnratedCompletedRun)
    .map((event) => {
      const time =
        event.date instanceof Date ? event.date.getTime() : new Date(event.date).getTime();
      return time <= maxValidTime ? time + SEVEN_DAYS_MS : null;
    })
    .filter((boundary): boundary is number => boundary !== null && boundary > now)
    .sort((a, b) => a - b)
    .at(0);

  return nextBoundary ?? null;
}
