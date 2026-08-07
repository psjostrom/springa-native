import { http } from 'msw';
import { apiUrl, jsonOk } from '../helpers';

function isoDaysFromToday(offset: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Happy-path calendar events spanning the default initial window. */
export function defaultCalendarEvents() {
  return [
    {
      id: 'easy-past',
      date: `${isoDaysFromToday(-3)}T12:00:00.000Z`,
      name: 'Easy Run',
      description: '',
      type: 'completed',
      category: 'easy',
      distance: 8200,
      duration: 2700,
      pace: 5.48,
      avgHr: 138,
    },
    {
      id: 'threshold-today',
      date: `${isoDaysFromToday(0)}T12:00:00.000Z`,
      name: 'Threshold intervals',
      description: '',
      type: 'planned',
      category: 'interval',
      distance: 10000,
      duration: 3300,
      fuelRate: 45,
      prescribedCarbsG: 42,
    },
    {
      id: 'race-future',
      date: `${isoDaysFromToday(10)}T12:00:00.000Z`,
      name: 'Half marathon',
      description: '',
      type: 'race',
      category: 'race',
      distance: 21100,
      duration: 6300,
    },
  ];
}

export const calendarHandlers = [
  http.get(apiUrl('/api/intervals/calendar'), () => jsonOk(defaultCalendarEvents())),
];
