import { useState } from 'react';
import { Text } from 'react-native';
import { describe, expect, it } from 'vitest';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { CalendarEvent } from '@/api/types';
import { WorkoutSheetContent } from '@/components/workout/WorkoutSheetContent';
import { getWorkoutStatusBadge } from '@/components/workout/workoutStatusBadge';
import { findCalendarEvent } from '@/domain/findCalendarEvent';

function sampleEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'threshold-today',
    date: new Date('2026-08-08T12:00:00'),
    name: 'Threshold intervals',
    description: '',
    type: 'planned',
    category: 'interval',
    ...overrides,
  };
}

describe('getWorkoutStatusBadge', () => {
  it('labels planned, missed, completed, and race', () => {
    expect(getWorkoutStatusBadge(sampleEvent({ type: 'planned' })).label).toBe('Planned');
    expect(
      getWorkoutStatusBadge(
        sampleEvent({
          id: 'missed',
          type: 'planned',
          date: new Date('2026-08-01T12:00:00'),
        }),
        new Date('2026-08-08T12:00:00'),
      ).label,
    ).toBe('Missed');
    expect(getWorkoutStatusBadge(sampleEvent({ type: 'completed' })).label).toBe('Completed');
    expect(getWorkoutStatusBadge(sampleEvent({ type: 'race' })).label).toBe('Race');
  });
});

describe('findCalendarEvent', () => {
  it('returns the event with a matching id', () => {
    const a = sampleEvent({ id: 'a' });
    const b = sampleEvent({ id: 'b', name: 'Other' });
    expect(findCalendarEvent([a, b], 'b')).toBe(b);
    expect(findCalendarEvent([a, b], 'missing')).toBeUndefined();
  });
});

describe('WorkoutSheetContent', () => {
  it('shows planned chrome and placeholder for upcoming planned', async () => {
    await render(
      <WorkoutSheetContent event={sampleEvent()} onClose={() => {}} />,
    );
    expect(screen.getByText('Threshold intervals')).toBeOnTheScreen();
    expect(screen.getByText('Planned')).toBeOnTheScreen();
    expect(screen.getByText('Planned workout')).toBeOnTheScreen();
  });

  it('shows completed placeholder for completed events', async () => {
    await render(
      <WorkoutSheetContent
        event={sampleEvent({ type: 'completed', name: 'Easy Run' })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Easy Run')).toBeOnTheScreen();
    expect(screen.getByText('Completed')).toBeOnTheScreen();
    expect(screen.getByText('Completed workout')).toBeOnTheScreen();
  });

  it('shows Missed badge and planned placeholder for missed events', async () => {
    await render(
      <WorkoutSheetContent
        event={sampleEvent({
          id: 'missed-1',
          name: 'Skipped tempo',
          type: 'planned',
          date: new Date('2026-08-01T12:00:00'),
        })}
        onClose={() => {}}
        now={new Date('2026-08-08T12:00:00')}
      />,
    );
    expect(screen.getByText('Skipped tempo')).toBeOnTheScreen();
    expect(screen.getByText('Missed')).toBeOnTheScreen();
    expect(screen.getByText('Planned workout')).toBeOnTheScreen();
  });

  it('shows not-found copy when event is missing', async () => {
    await render(<WorkoutSheetContent event={null} onClose={() => {}} />);
    expect(screen.getByText('Workout not found')).toBeOnTheScreen();
  });

  it('closes when close is pressed', async () => {
    function Harness() {
      const [closed, setClosed] = useState(false);
      if (closed) return <Text>Sheet closed</Text>;
      return <WorkoutSheetContent event={sampleEvent()} onClose={() => setClosed(true)} />;
    }
    await render(<Harness />);
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Close workout'));
    expect(await screen.findByText('Sheet closed')).toBeOnTheScreen();
  });
});
