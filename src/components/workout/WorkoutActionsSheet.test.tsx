import { createRef, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import { View } from 'react-native';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlannedWorkoutActions } from './PlannedWorkoutSheet';
import type { WorkoutActionsSheetMethods } from './WorkoutActionsSheet';

const nativeSheetTestDouble = vi.hoisted(() => ({
  onDismiss: null as (() => void) | null,
  finishDismiss() {
    this.onDismiss?.();
  },
}));

let WorkoutActionsSheet: typeof import('./WorkoutActionsSheet').WorkoutActionsSheet;

beforeAll(async () => {
  vi.doMock('@/components/ui/AppBottomSheet', () => ({
    AppBottomSheet: forwardRef(function AppBottomSheetTestDouble(
      { children, onDismiss }: { children: ReactNode; onDismiss?: () => void },
      ref,
    ) {
      nativeSheetTestDouble.onDismiss = onDismiss ?? null;
      useImperativeHandle(ref, () => ({ present() {}, dismiss() {} }));
      return <View>{children}</View>;
    }),
  }));
  ({ WorkoutActionsSheet } = await import('./WorkoutActionsSheet'));
});

function makeActions(overrides: Partial<PlannedWorkoutActions> = {}): PlannedWorkoutActions {
  return {
    pending: false,
    currentReplacementCategory: 'quality',
    move: vi.fn(),
    replace: vi.fn(),
    deleteWorkout: vi.fn(),
    ...overrides,
  };
}

describe('WorkoutActionsSheet', () => {
  beforeEach(() => {
    nativeSheetTestDouble.onDismiss = null;
  });

  it('defers move until the sheet reports dismissal', async () => {
    const move = vi.fn();
    const sheetRef = createRef<WorkoutActionsSheetMethods>();
    await render(
      <WorkoutActionsSheet
        ref={sheetRef}
        actions={makeActions({ move })}
        workoutName="Easy"
      />,
    );

    await act(async () => sheetRef.current?.present());
    await userEvent.setup().press(screen.getByRole('button', { name: 'Move workout' }));
    expect(move).not.toHaveBeenCalled();

    await act(async () => nativeSheetTestDouble.finishDismiss());
    expect(move).toHaveBeenCalledOnce();
  });

  it('returns to root mode after native dismissal', async () => {
    const sheetRef = createRef<WorkoutActionsSheetMethods>();
    await render(
      <WorkoutActionsSheet
        ref={sheetRef}
        actions={makeActions()}
        workoutName="Easy"
      />,
    );
    const user = userEvent.setup();

    await act(async () => sheetRef.current?.present());
    await user.press(screen.getByRole('button', { name: 'Replace workout' }));
    expect(screen.getByText('Replace workout')).toBeOnTheScreen();

    await act(async () => nativeSheetTestDouble.finishDismiss());
    await act(async () => sheetRef.current?.present());
    expect(screen.getByText('Workout actions')).toBeOnTheScreen();
    expect(screen.queryByText('Replace workout')).toBeNull();
  });
});
