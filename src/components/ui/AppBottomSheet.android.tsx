import {
  Host,
  ModalBottomSheet,
  RNHostView,
  type ModalBottomSheetRef,
} from '@expo/ui/jetpack-compose';
import { type ReactElement, useEffect, useEffectEvent, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';
import { useKeyboardDismissedPresentation } from './useKeyboardDismissedPresentation';

export type AppBottomSheetProps = {
  children: ReactElement;
  isPresented: boolean;
  onDismiss: () => void;
  onDismissComplete?: () => void;
};

export function AppBottomSheet({
  children,
  isPresented,
  onDismiss,
  onDismissComplete,
}: AppBottomSheetProps) {
  const { width } = useWindowDimensions();
  const shouldPresent = useKeyboardDismissedPresentation(isPresented);
  const [previousShouldPresent, setPreviousShouldPresent] = useState(shouldPresent);
  const [mounted, setMounted] = useState(shouldPresent);
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const dismissingRef = useRef(false);
  const completeDismissal = useEffectEvent(() => onDismissComplete?.());

  if (shouldPresent !== previousShouldPresent) {
    setPreviousShouldPresent(shouldPresent);
    if (shouldPresent) setMounted(true);
  }

  useEffect(() => {
    if (shouldPresent) {
      dismissingRef.current = false;
      return;
    }
    if (!mounted || dismissingRef.current) return;

    dismissingRef.current = true;
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      dismissingRef.current = false;
      setMounted(false);
      completeDismissal();
    };
    const hide = sheetRef.current?.hide();
    if (hide) void hide.then(finish);
    else finish();

    return () => {
      cancelled = true;
    };
  }, [mounted, shouldPresent]);

  if (!mounted) return null;

  return (
    <Host style={{ position: 'absolute', width }} pointerEvents="none" colorScheme="dark">
      <ModalBottomSheet
        ref={sheetRef}
        onDismissRequest={onDismiss}
        containerColor={SpringaColors.surface}
        contentColor={SpringaColors.text}
      >
        <RNHostView matchContents>
          <View style={styles.content}>{children}</View>
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
    backgroundColor: SpringaColors.surface,
  },
});
