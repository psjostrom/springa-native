import { Host, ModalBottomSheet, RNHostView } from '@expo/ui/jetpack-compose';
import type { ReactElement } from 'react';
import { useWindowDimensions } from 'react-native';
import { SpringaColors } from '@/theme/colors';

type Props = {
  children: ReactElement;
  isPresented: boolean;
  onDismiss: () => void;
};

export function WorkoutActionsBottomSheet({ children, isPresented, onDismiss }: Props) {
  const { width } = useWindowDimensions();

  if (!isPresented) return null;

  return (
    <Host style={{ position: 'absolute', width }} pointerEvents="none" colorScheme="dark">
      <ModalBottomSheet
        onDismissRequest={onDismiss}
        containerColor={SpringaColors.surface}
        contentColor={SpringaColors.text}
      >
        <RNHostView matchContents>{children}</RNHostView>
      </ModalBottomSheet>
    </Host>
  );
}
