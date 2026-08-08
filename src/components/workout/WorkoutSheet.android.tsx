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
import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { useWorkoutSheetController } from './useWorkoutSheetController';
import { WorkoutSheetContent } from './WorkoutSheetContent';

/** Keep consuming back while Material Dialog / Host finishes after dismiss. */
const BACK_HOLD_MS = 500;

/**
 * Android: Expo UI Material ModalBottomSheet with Springa dark surface colors.
 * Identity = route search param `workout`; data = calendar Query cache.
 *
 * System back: Material Dialog owns the press while open (`shouldDismissOnBackPress`
 * → `onDismissRequest`). JS `BackHandler` stays for the Host mount and briefly after
 * unmount so Dialog tear-down cannot finish MainActivity with the same KEYCODE_BACK.
 */
export function WorkoutSheet() {
  const { isPresented, event, clearWorkout } = useWorkoutSheetController();
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const [mount, setMount] = useState(isPresented);
  const isPresentedRef = useRef(isPresented);
  /** True after isPresented→false until delayed unmount (or re-present remount). */
  const dismissingRef = useRef(false);

  // Remount after dismiss hold completed, or after we forced unmount to recover from hide().
  if (isPresented && !mount) {
    setMount(true);
  }

  useEffect(() => {
    isPresentedRef.current = isPresented;
  }, [isPresented]);

  useEffect(() => {
    if (isPresented) {
      // Re-opened while hide()/hold was in flight: Host may still be mounted but
      // Material sheet already hidden — force remount so content presents again.
      if (dismissingRef.current) {
        dismissingRef.current = false;
        setMount(false);
      }
      return;
    }

    dismissingRef.current = true;
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      dismissingRef.current = false;
      setMount(false);
    };
    const hide = sheetRef.current?.hide();
    const done = hide ?? Promise.resolve();
    done.finally(() => {
      // Defer Host unmount: Material may already have hidden the sheet before
      // onDismissRequest, so hide() can resolve immediately. Unmounting in the
      // same turn drops BackHandler while KEYCODE_BACK can still reach Activity.
      setTimeout(finish, BACK_HOLD_MS);
    });
    return () => {
      cancelled = true;
    };
  }, [isPresented]);

  useEffect(() => {
    if (!mount) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isPresentedRef.current) {
        clearWorkout();
      }
      return true;
    });
    return () => {
      sub.remove();
      const hold = BackHandler.addEventListener('hardwareBackPress', () => true);
      setTimeout(() => hold.remove(), BACK_HOLD_MS);
    };
  }, [mount, clearWorkout]);

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
