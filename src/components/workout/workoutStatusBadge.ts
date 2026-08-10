import type { CalendarEvent } from '@/api/types';
import { getCardStatus } from '@/domain/eventStatus';

export function getWorkoutStatusBadge(
  event: CalendarEvent,
  now = new Date(),
): { label: 'Planned' | 'Missed' | 'Completed' | 'Race' } {
  const status = getCardStatus(event, now);
  switch (status) {
    case 'missed':
      return { label: 'Missed' };
    case 'completed':
      return { label: 'Completed' };
    case 'race':
      return { label: 'Race' };
    default:
      return { label: 'Planned' };
  }
}
