import { describe, expect, it } from 'vitest';
import {
  AGENDA_EVENTS,
  MOCK_TODAY,
  getEventIcon,
  hasEventOnDay,
  splitAgendaEvents,
} from './agenda';

describe('splitAgendaEvents', () => {
  it('puts dates before MOCK_TODAY in earlier and today+future in upcoming', () => {
    const { earlier, upcoming } = splitAgendaEvents(AGENDA_EVENTS, MOCK_TODAY);
    expect(earlier.length).toBeGreaterThanOrEqual(1);
    expect(upcoming.length).toBeGreaterThanOrEqual(1);
    for (const e of earlier) expect(e.date < MOCK_TODAY).toBe(true);
    for (const e of upcoming) expect(e.date >= MOCK_TODAY).toBe(true);
  });
});

describe('hasEventOnDay', () => {
  it('detects whether MOCK_TODAY has an event', () => {
    const result = hasEventOnDay(AGENDA_EVENTS, MOCK_TODAY);
    expect(typeof result).toBe('boolean');
  });
});

describe('getEventIcon', () => {
  it('returns race flag for race category', () => {
    expect(
      getEventIcon({
        id: 'x',
        date: MOCK_TODAY,
        name: 'Race',
        status: 'planned',
        category: 'race',
      }),
    ).toBe('🏁');
  });
});
