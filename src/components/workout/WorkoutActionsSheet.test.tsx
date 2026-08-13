import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import { describe, expect, it } from 'vitest';
import type { PlannedWorkoutActions } from './PlannedWorkoutSheet';
import { WorkoutActionsSheet } from './WorkoutActionsSheet';

function Harness() {
  const [isPresented, setIsPresented] = useState(true);
  const [moveStarted, setMoveStarted] = useState(false);
  const actions: PlannedWorkoutActions = {
    currentReplacementCategory: 'quality',
    deleteWorkout: () => {},
    move: () => setMoveStarted(true),
    pending: false,
    replace: () => {},
  };

  return (
    <>
      <WorkoutActionsSheet
        isPresented={isPresented}
        onDismiss={() => setIsPresented(false)}
        actions={actions}
        workoutName="Threshold intervals"
      />
      {moveStarted ? <Text>Move started</Text> : null}
    </>
  );
}

describe('WorkoutActionsSheet', () => {
  it('closes when starting the selected action', async () => {
    const view = await render(<Harness />);

    fireEvent.press(view.getByLabelText('Move workout'));

    await waitFor(() => expect(view.getByText('Move started')).toBeTruthy());
    await waitFor(() => expect(view.queryByText('Workout actions')).toBeNull());
  });
});
