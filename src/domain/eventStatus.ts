import type { CalendarEvent } from '@/api/types';

export function startOfLocalDay(d = new Date()): Date {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** Planned events whose local calendar day is before today are missed. */
export function isMissedEvent(event: CalendarEvent, now = new Date()): boolean {
  if (event.type !== 'planned') return false;
  const today = startOfLocalDay(now);
  const eventDay = startOfLocalDay(event.date);
  return eventDay < today;
}

export function getEventIcon(event: CalendarEvent): string {
  if (event.type === 'race' || event.category === 'race') return '🏁';
  if (event.category === 'long') return '🏃';
  if (event.category === 'interval') return '⚡';
  if (event.name.toLowerCase().includes('club')) return '👥';
  return '✓';
}

export type CardStatus = 'planned' | 'completed' | 'missed' | 'race';

export function getCardStatus(event: CalendarEvent, now = new Date()): CardStatus {
  if (isMissedEvent(event, now)) return 'missed';
  if (event.type === 'completed') return 'completed';
  if (event.type === 'race') return 'race';
  return 'planned';
}
