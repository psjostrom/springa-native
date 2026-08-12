import { BottomSheet, RNHostView } from '@expo/ui';
import { presentationBackground } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { SpringaColors } from '@/theme/colors';

type Props = {
  children: ReactElement;
  isPresented: boolean;
  onDismiss: () => void;
};

export function WorkoutActionsBottomSheet({ children, isPresented, onDismiss }: Props) {
  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      modifiers={[presentationBackground(SpringaColors.surface)]}
    >
      <RNHostView matchContents>{children}</RNHostView>
    </BottomSheet>
  );
}
