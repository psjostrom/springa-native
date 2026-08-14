import { forwardRef, type ReactNode, useImperativeHandle, useRef, useState } from 'react';
import { Pressable } from 'react-native';

export function BottomSheet({
  children,
  isPresented,
  onDismiss,
}: {
  children: ReactNode;
  isPresented: boolean;
  onDismiss: () => void;
}) {
  return isPresented ? (
    <>
      {children}
      <Pressable accessibilityLabel="Dismiss bottom sheet" onPress={onDismiss} />
    </>
  ) : null;
}

export function RNHostView({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Host({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

type ModalBottomSheetRef = {
  hide: () => Promise<void>;
  expand: () => Promise<void>;
  partialExpand: () => Promise<void>;
};

export const ModalBottomSheet = forwardRef<
  ModalBottomSheetRef,
  { children: ReactNode; onDismissRequest: () => void }
>(function ModalBottomSheet({ children, onDismissRequest }, ref) {
  const [hiding, setHiding] = useState(false);
  const resolveHideRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    hide: () =>
      new Promise<void>((resolve) => {
        resolveHideRef.current = resolve;
        setHiding(true);
      }),
    expand: async () => {},
    partialExpand: async () => {},
  }));

  return (
    <>
      {children}
      <Pressable accessibilityLabel="Dismiss bottom sheet" onPress={onDismissRequest} />
      {hiding ? (
        <Pressable
          accessibilityLabel="Complete bottom sheet dismissal"
          onPress={() => {
            resolveHideRef.current?.();
            resolveHideRef.current = null;
            setHiding(false);
          }}
        />
      ) : null}
    </>
  );
});

export function presentationBackground(color: string) {
  return { $type: 'presentationBackground', color };
}
