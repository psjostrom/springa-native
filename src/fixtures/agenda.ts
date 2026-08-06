export type AgendaStatus = 'planned' | 'completed' | 'missed';
export type AgendaCategory = 'easy' | 'long' | 'interval' | 'race' | 'club';

export type StructureSegment = {
  zone: 1 | 2 | 3 | 4 | 5;
  /** Relative width weight */
  weight: number;
  /** Relative height 0–1 */
  intensity: number;
};

export type AgendaEvent = {
  id: string;
  /** ISO date `YYYY-MM-DD` interpreted as local calendar day */
  date: string;
  name: string;
  status: AgendaStatus;
  category: AgendaCategory;
  durationMin?: number;
  distanceKm?: number;
  fuelGPerH?: number;
  fuelTotalG?: number;
  structure?: StructureSegment[];
  /** Completed-only */
  paceSecPerKm?: number;
  avgHr?: number;
};

export const MOCK_TODAY = '2026-08-06';

export function parseAgendaDate(isoDay: string): Date {
  const [year, month, day] = isoDay.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getEventIcon(event: AgendaEvent): string {
  switch (event.category) {
    case 'race':
      return '🏁';
    case 'long':
      return '🏃';
    case 'interval':
      return '⚡';
    case 'club':
      return '👥';
    default:
      return '✓';
  }
}

export function splitAgendaEvents(
  events: AgendaEvent[],
  mockToday: string,
): { earlier: AgendaEvent[]; upcoming: AgendaEvent[] } {
  const earlier = events.filter((e) => e.date < mockToday);
  const upcoming = events.filter((e) => e.date >= mockToday);
  return { earlier, upcoming };
}

export function hasEventOnDay(events: AgendaEvent[], isoDay: string): boolean {
  return events.some((e) => e.date === isoDay);
}

export const AGENDA_EVENTS: AgendaEvent[] = [
  {
    id: 'easy-2026-08-03',
    date: '2026-08-03',
    name: 'Easy Run',
    status: 'completed',
    category: 'easy',
    durationMin: 45,
    distanceKm: 8.2,
    paceSecPerKm: 329,
    avgHr: 138,
  },
  {
    id: 'missed-2026-08-04',
    date: '2026-08-04',
    name: 'Recovery jog',
    status: 'missed',
    category: 'easy',
    durationMin: 30,
    distanceKm: 5,
  },
  {
    id: 'long-2026-08-05',
    date: '2026-08-05',
    name: 'Long run',
    status: 'completed',
    category: 'long',
    durationMin: 95,
    distanceKm: 18.5,
    paceSecPerKm: 308,
    avgHr: 152,
  },
  {
    id: 'interval-2026-08-06',
    date: '2026-08-06',
    name: 'Threshold intervals',
    status: 'planned',
    category: 'interval',
    durationMin: 55,
    distanceKm: 10,
    fuelGPerH: 45,
    fuelTotalG: 42,
    structure: [
      { zone: 2, weight: 2, intensity: 0.4 },
      { zone: 4, weight: 3, intensity: 0.85 },
      { zone: 2, weight: 2, intensity: 0.35 },
      { zone: 4, weight: 3, intensity: 0.9 },
      { zone: 1, weight: 1, intensity: 0.25 },
    ],
  },
  {
    id: 'club-2026-08-09',
    date: '2026-08-09',
    name: 'Tuesday club run',
    status: 'planned',
    category: 'club',
    durationMin: 60,
    distanceKm: 10,
  },
  {
    id: 'race-2026-08-16',
    date: '2026-08-16',
    name: 'Half marathon',
    status: 'planned',
    category: 'race',
    durationMin: 105,
    distanceKm: 21.1,
    fuelGPerH: 50,
    fuelTotalG: 88,
  },
];
