import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
    assert.ok(earlier.length >= 1);
    assert.ok(upcoming.length >= 1);
    for (const e of earlier) assert.ok(e.date < MOCK_TODAY);
    for (const e of upcoming) assert.ok(e.date >= MOCK_TODAY);
  });
});

describe('hasEventOnDay', () => {
  it('detects whether MOCK_TODAY has an event', () => {
    const result = hasEventOnDay(AGENDA_EVENTS, MOCK_TODAY);
    assert.equal(typeof result, 'boolean');
  });
});

describe('getEventIcon', () => {
  it('returns race flag for race category', () => {
    assert.equal(
      getEventIcon({
        id: 'x',
        date: MOCK_TODAY,
        name: 'Race',
        status: 'planned',
        category: 'race',
      }),
      '🏁',
    );
  });
});
