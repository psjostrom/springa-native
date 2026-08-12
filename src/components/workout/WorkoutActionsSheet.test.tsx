import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PlannedWorkoutActions } from './PlannedWorkoutSheet';
import { WorkoutActionsSheet } from './WorkoutActionsSheet';

const actions: PlannedWorkoutActions = {
  currentReplacementCategory: 'quality',
  deleteWorkout: vi.fn(),
  move: vi.fn(),
  pending: false,
  replace: vi.fn(),
};

function Harness() {
  const [isPresented, setIsPresented] = useState(true);

  return (
    <WorkoutActionsSheet
      isPresented={isPresented}
      onDismiss={() => setIsPresented(false)}
      actions={actions}
      workoutName="Threshold intervals"
    />
  );
}

describe('WorkoutActionsSheet', () => {
  it('closes when starting the selected action', async () => {
    const view = await render(<Harness />);

    fireEvent.press(view.getByLabelText('Move workout'));

    expect(actions.move).toHaveBeenCalledOnce();
    await waitFor(() => expect(view.queryByText('Workout actions')).toBeNull());
  });
});
