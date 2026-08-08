import { BottomSheet, RNHostView } from '@expo/ui';
import { useWorkoutSheetController } from './useWorkoutSheetController';
import { WorkoutSheetContent } from './WorkoutSheetContent';

/**
 * iOS / default: Expo UI universal BottomSheet + RNHostView.
 * Android uses WorkoutSheet.android.tsx (Material sheet with Springa dark colors).
 */
export function WorkoutSheet() {
  const { isPresented, event, clearWorkout } = useWorkoutSheetController();

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={clearWorkout}
      snapPoints={['half', 'full']}
      testID="workout-sheet"
    >
      <RNHostView>
        <WorkoutSheetContent event={event} onClose={clearWorkout} />
      </RNHostView>
    </BottomSheet>
  );
}
