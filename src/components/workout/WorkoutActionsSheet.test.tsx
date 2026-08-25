import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { describe, expect, it } from 'vitest';
import type { EffortMetric } from '@/api/types';
import type { PlannedWorkoutActions } from './PlannedWorkoutSheet';
import { WorkoutActionsSheet } from './WorkoutActionsSheet';

const actions: PlannedWorkoutActions = {
  deleteWorkout: () => {},
  effortMetric: {
    change: () => {},
    heartRateAvailable: true,
    value: 'feel',
  },
  move: () => {},
  pending: false,
  replace: () => {},
};

function MoveHarness() {
  const [isPresented, setIsPresented] = useState(true);
  const [moveStarted, setMoveStarted] = useState(false);

  return (
    <>
      <WorkoutActionsSheet
        isPresented={isPresented}
        onDismiss={() => setIsPresented(false)}
        actions={{ ...actions, move: () => setMoveStarted(true) }}
        workoutName="Threshold intervals"
      />
      {moveStarted ? <Text>Move started</Text> : null}
    </>
  );
}

function ReplaceHarness() {
  const [isPresented, setIsPresented] = useState(true);
  const [replacement, setReplacement] = useState<string | null>(null);

  return (
    <>
      <WorkoutActionsSheet
        isPresented={isPresented}
        onDismiss={() => setIsPresented(false)}
        actions={{ ...actions, replace: (category) => setReplacement(category) }}
        workoutName="Threshold intervals"
      />
      {replacement ? <Text>Replacement started: {replacement}</Text> : null}
    </>
  );
}

function ModeResetHarness() {
  const [isPresented, setIsPresented] = useState(true);

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setIsPresented(true)}>
        <Text>Present bottom sheet</Text>
      </Pressable>
      <WorkoutActionsSheet
        isPresented={isPresented}
        onDismiss={() => setIsPresented(false)}
        actions={actions}
        workoutName="Threshold intervals"
      />
    </>
  );
}

function RunByHarness({ heartRateAvailable = true }: { heartRateAvailable?: boolean }) {
  const [isPresented, setIsPresented] = useState(true);
  const [metric, setMetric] = useState<EffortMetric>('feel');

  return (
    <>
      <WorkoutActionsSheet
        isPresented={isPresented}
        onDismiss={() => setIsPresented(false)}
        actions={{
          ...actions,
          effortMetric: {
            change: setMetric,
            heartRateAvailable,
            value: metric,
          },
        }}
        workoutName="Threshold intervals"
      />
      <Text>Current run by: {metric}</Text>
    </>
  );
}

describe('WorkoutActionsSheet', () => {
  it('shows Run by with the current choice in workout actions', async () => {
    const view = await render(
      <WorkoutActionsSheet
        isPresented
        onDismiss={() => {}}
        actions={actions}
        workoutName="Threshold intervals"
      />,
    );

    expect(view.getByLabelText('Run by')).toHaveProp(
      'accessibilityValue',
      { text: 'Currently: Feel' },
    );
    expect(view.getByText('Currently: Feel')).toBeOnTheScreen();
    expect(view.getByLabelText('Replace workout')).toBeOnTheScreen();
  });

  it('shows matching Run by choices and marks the current choice', async () => {
    const view = await render(
      <WorkoutActionsSheet
        isPresented
        onDismiss={() => {}}
        actions={actions}
        workoutName="Threshold intervals"
      />,
    );

    fireEvent.press(view.getByLabelText('Run by'));

    expect(await view.findByText('Choose how to guide this workout')).toBeOnTheScreen();
    expect(view.getByLabelText('Run by Pace')).toBeOnTheScreen();
    expect(view.getByLabelText('Run by Heart rate')).toBeOnTheScreen();
    expect(view.getByLabelText('Run by Feel')).toHaveProp(
      'accessibilityState',
      { selected: true },
    );
    expect(view.getByLabelText('Run by Feel')).toHaveProp(
      'accessibilityHint',
      'Go by how it feels',
    );
  });

  it('changes Run by only after native dismissal completes', async () => {
    const view = await render(<RunByHarness />);

    fireEvent.press(await view.findByLabelText('Run by'));
    fireEvent.press(await view.findByLabelText('Run by Pace'));

    expect(view.getByText('Current run by: feel')).toBeOnTheScreen();
    const completeDismissal = await view.findByLabelText('Complete bottom sheet dismissal');
    await act(async () => fireEvent.press(completeDismissal));

    expect(await view.findByText('Current run by: pace')).toBeOnTheScreen();
  });

  it('omits unavailable heart rate and explains why', async () => {
    const view = await render(<RunByHarness heartRateAvailable={false} />);

    fireEvent.press(await view.findByLabelText('Run by'));

    expect(await view.findByText('Choose how to guide this workout')).toBeOnTheScreen();
    expect(view.queryByLabelText('Run by Heart rate')).toBeNull();
    expect(view.getByText('Heart rate requires LTHR and five heart-rate zones.')).toBeOnTheScreen();
  });

  it('shows every replacement option including the current category', async () => {
    const view = await render(
      <WorkoutActionsSheet
        isPresented
        onDismiss={() => {}}
        actions={actions}
        workoutName="Threshold intervals"
      />,
    );

    fireEvent.press(view.getByLabelText('Replace workout'));

    await waitFor(() => {
      expect(view.getByLabelText('Replace with Easy')).toBeOnTheScreen();
    });
    expect(view.getByLabelText('Replace with Quality')).toBeOnTheScreen();
    expect(view.getByLabelText('Replace with Long')).toBeOnTheScreen();
    expect(view.getByLabelText('Replace with Club Run')).toBeOnTheScreen();
  });

  it('starts Move only after native dismissal completes', async () => {
    const view = await render(<MoveHarness />);

    fireEvent.press(await view.findByLabelText('Move workout'));

    expect(view.queryByText('Move started')).toBeNull();
    const completeDismissal = await view.findByLabelText('Complete bottom sheet dismissal');
    await act(async () => fireEvent.press(completeDismissal));

    await waitFor(() => expect(view.getByText('Move started')).toBeTruthy());
    await waitFor(() => expect(view.queryByText('Workout actions')).toBeNull());
  });

  it('starts replacement only after native dismissal completes', async () => {
    const view = await render(<ReplaceHarness />);
    fireEvent.press(await view.findByLabelText('Replace workout'));
    fireEvent.press(await view.findByLabelText('Replace with Easy'));

    expect(view.queryByText('Replacement started: easy')).toBeNull();
    const completeDismissal = await view.findByLabelText('Complete bottom sheet dismissal');
    await act(async () => fireEvent.press(completeDismissal));

    expect(await view.findByText('Replacement started: easy')).toBeOnTheScreen();
  });

  it('returns to root mode after native dismissal', async () => {
    const view = await render(<ModeResetHarness />);
    fireEvent.press(await view.findByLabelText('Replace workout'));
    await waitFor(() => {
      expect(view.getByText('Choose a different workout')).toBeOnTheScreen();
    });

    fireEvent.press(view.getByLabelText('Dismiss bottom sheet'));
    expect(view.getByText('Choose a different workout')).toBeOnTheScreen();
    const completeDismissal = await view.findByLabelText('Complete bottom sheet dismissal');
    await act(async () => fireEvent.press(completeDismissal));
    await waitFor(() => expect(view.queryByText('Choose a different workout')).toBeNull());
    fireEvent.press(view.getByText('Present bottom sheet'));

    await waitFor(() => {
      expect(view.getByText('Workout actions')).toBeOnTheScreen();
      expect(view.queryByText('Choose a different workout')).toBeNull();
    });
  });
});
