import {
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetMethods,
} from '@expo/ui/community/bottom-sheet';
import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';

export type AppBottomSheetMethods = {
  present(): void;
  dismiss(): void;
};

export type AppBottomSheetProps = {
  children: ReactNode;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
};

export const AppBottomSheet = forwardRef<AppBottomSheetMethods, AppBottomSheetProps>(
  function AppBottomSheet({ children, snapPoints, onDismiss }, ref) {
    const nativeRef = useRef<BottomSheetMethods>(null);

    useImperativeHandle(ref, () => ({
      present: () => nativeRef.current?.present(),
      dismiss: () => nativeRef.current?.dismiss(),
    }), []);

    return (
      <BottomSheetModal
        ref={nativeRef}
        snapPoints={snapPoints}
        enableDynamicSizing={snapPoints == null}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: SpringaColors.surface }}
        onDismiss={onDismiss}
      >
        <BottomSheetView style={styles.content}>{children}</BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
  },
});
