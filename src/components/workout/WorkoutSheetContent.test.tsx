import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react-native';
import type { CalendarEvent } from '@/api/types';
import { WorkoutSheetContent } from '@/components/workout/WorkoutSheetContent';
import { getWorkoutStatusBadge } from '@/components/workout/workoutStatusBadge';
import { findCalendarEvent } from '@/domain/findCalendarEvent';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';

function renderWithApp(ui: ReactNode) {
  return render(
    <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
      {ui}
    </TestAppProviders>,
  );
}

const NOW = new Date('2026-08-10T12:00:00');

function sampleEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'threshold-today',
    date: new Date('2026-08-12T12:00:00'),
    name: 'Threshold intervals',
    description: '',
    type: 'planned',
    category: 'interval',
    ...overrides,
  };
}

describe('getWorkoutStatusBadge', () => {
  it('labels planned, missed, completed, and race', () => {
    expect(getWorkoutStatusBadge(sampleEvent({ type: 'planned' }), NOW).label).toBe('Planned');
    expect(
      getWorkoutStatusBadge(
        sampleEvent({
          id: 'missed',
          type: 'planned',
          date: new Date('2026-08-01T12:00:00'),
        }),
        NOW,
      ).label,
    ).toBe('Missed');
    expect(getWorkoutStatusBadge(sampleEvent({ type: 'completed' }), NOW).label).toBe(
      'Completed',
    );
    expect(getWorkoutStatusBadge(sampleEvent({ type: 'race' }), NOW).label).toBe('Race');
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
  it('fills full-screen detail so planned details can scroll', async () => {
    await renderWithApp(
      <WorkoutSheetContent event={sampleEvent()} onClose={() => {}} now={NOW} />,
    );
    expect(screen.getByLabelText('Workout Threshold intervals')).toHaveStyle({ flex: 1 });
  });

  it('shows planned chrome and detail for upcoming planned', async () => {
    await renderWithApp(
      <WorkoutSheetContent event={sampleEvent()} onClose={() => {}} now={NOW} />,
    );
    expect(screen.getByText('Threshold intervals')).toBeOnTheScreen();
    expect(screen.getByText('Planned')).toBeOnTheScreen();
    expect(await screen.findByText('Workout structure')).toBeOnTheScreen();
    expect(screen.getByText('T-shirt')).toBeOnTheScreen();
    expect(screen.getByText('65m')).toBeOnTheScreen();
  });

  it('shows the Calendar summary and Overview content for completed events', async () => {
    await renderWithApp(
      <WorkoutSheetContent
        event={sampleEvent({
          id: 'easy-past',
          type: 'completed',
          name: 'Easy Run',
          activityId: 'activity-123',
        })}
        onClose={() => {}}
        now={NOW}
      />,
    );
    expect(screen.getByText('Easy Run')).toBeOnTheScreen();
    expect(screen.getByText('Completed')).toBeOnTheScreen();
    expect(await screen.findByText('Fueling')).toBeOnTheScreen();
    expect(screen.getByLabelText('Run report')).toBeOnTheScreen();
    expect(screen.getByText('Km 1')).toBeOnTheScreen();
    expect(screen.queryByText('Completed workout')).toBeNull();
    expect(screen.queryByText('Workout structure')).toBeNull();
  });

  it('exposes no planned action controls for completed events', async () => {
    const onActionsReady = vi.fn();
    await renderWithApp(
      <WorkoutSheetContent
        event={sampleEvent({
          id: 'easy-past',
          type: 'completed',
          name: 'Easy Run',
          activityId: 'activity-123',
        })}
        onClose={() => {}}
        now={NOW}
        onActionsReady={onActionsReady}
      />,
    );
    expect(await screen.findByText('Fueling')).toBeOnTheScreen();
    expect(onActionsReady).not.toHaveBeenCalled();
  });

  it('keeps race events on the planned detail path', async () => {
    await renderWithApp(
      <WorkoutSheetContent
        event={sampleEvent({
          id: 'race-future',
          name: 'Half marathon',
          type: 'race',
          category: 'race',
        })}
        onClose={() => {}}
        now={NOW}
      />,
    );
    expect(screen.getByText('Race')).toBeOnTheScreen();
    expect(await screen.findByText('Workout structure')).toBeOnTheScreen();
    expect(screen.getByText('T-shirt')).toBeOnTheScreen();
    expect(screen.getByText('65m')).toBeOnTheScreen();
    expect(screen.queryByText('Completed workout')).toBeNull();
  });

  it('shows Missed badge and planned detail for missed events', async () => {
    await renderWithApp(
      <WorkoutSheetContent
        event={sampleEvent({
          id: 'missed-1',
          name: 'Skipped tempo',
          type: 'planned',
          date: new Date('2026-08-01T12:00:00'),
        })}
        onClose={() => {}}
        now={NOW}
      />,
    );
    expect(screen.getByText('Skipped tempo')).toBeOnTheScreen();
    expect(screen.getByText('Missed')).toBeOnTheScreen();
    expect(await screen.findByText('Workout structure')).toBeOnTheScreen();
  });

  it('shows not-found copy when event is missing', async () => {
    await render(<WorkoutSheetContent event={null} onClose={() => {}} />);
    expect(screen.getByText('Workout not found')).toBeOnTheScreen();
  });

  it('leaves dismissal to the native stack', async () => {
    await renderWithApp(
      <WorkoutSheetContent event={sampleEvent()} onClose={() => {}} now={NOW} />,
    );
    expect(screen.queryByLabelText('Close workout')).toBeNull();
  });

  it('does not add a close control when event is missing', async () => {
    await render(<WorkoutSheetContent event={null} onClose={() => {}} />);
    expect(screen.queryByLabelText('Close workout')).toBeNull();
  });
});
