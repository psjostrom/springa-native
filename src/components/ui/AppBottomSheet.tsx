import { BottomSheet, RNHostView } from '@expo/ui';
import { presentationBackground } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
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
  const shouldPresent = useKeyboardDismissedPresentation(isPresented);

  return (
    <BottomSheet
      isPresented={shouldPresent}
      onDismiss={() => {
        onDismiss();
        onDismissComplete?.();
      }}
      modifiers={[presentationBackground(SpringaColors.surface)]}
    >
      <RNHostView matchContents>
        <View style={styles.content}>{children}</View>
      </RNHostView>
    </BottomSheet>
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
