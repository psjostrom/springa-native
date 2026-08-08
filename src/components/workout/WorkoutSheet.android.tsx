import {
  Column,
  Host,
  ModalBottomSheet,
  RNHostView,
  type ModalBottomSheetRef,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxHeight,
  padding,
  testID as testIDModifier,
} from '@expo/ui/jetpack-compose/modifiers';
import { useEffect, useRef } from 'react';
import { SpringaColors } from '@/theme/colors';
import { useSheetMount, useWorkoutSheetController } from './useWorkoutSheetController';
import { WorkoutSheetContent } from './WorkoutSheetContent';

/**
 * Android: Expo UI Material ModalBottomSheet with Springa dark surface colors.
 * Identity = route search param `workout`; data = calendar Query cache.
 */
export function WorkoutSheet() {
  const { isPresented, event, clearWorkout } = useWorkoutSheetController();
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const { mount, setMount } = useSheetMount(isPresented);

  useEffect(() => {
    if (isPresented) return;
    let cancelled = false;
    const hide = sheetRef.current?.hide();
    if (!hide) {
      setMount(false);
      return;
    }
    hide.then(() => {
      if (!cancelled) setMount(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isPresented, setMount]);

  if (!mount) return null;

  return (
    <Host
      style={{ position: 'absolute' }}
      pointerEvents="box-none"
      colorScheme="dark"
      seedColor={SpringaColors.brand}
    >
      <ModalBottomSheet
        ref={sheetRef}
        onDismissRequest={clearWorkout}
        showDragHandle
        skipPartiallyExpanded={false}
        containerColor={SpringaColors.surface}
        contentColor={SpringaColors.text}
        scrimColor="rgba(0,0,0,0.7)"
        properties={{
          shouldDismissOnBackPress: true,
          shouldDismissOnClickOutside: true,
        }}
      >
        <Column
          modifiers={[
            padding(16, 0, 16, 0),
            fillMaxHeight(),
            testIDModifier('workout-sheet'),
          ]}
        >
          <RNHostView>
            <WorkoutSheetContent event={event} onClose={clearWorkout} />
          </RNHostView>
        </Column>
      </ModalBottomSheet>
    </Host>
  );
}
