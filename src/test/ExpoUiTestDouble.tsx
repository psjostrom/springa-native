import {
  Children,
  forwardRef,
  isValidElement,
  type ReactNode,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, Text, View, type ViewProps } from 'react-native';

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

export function Host({
  children,
  testID,
  matchContents,
  style,
}: ViewProps & {
  matchContents?: boolean | { horizontal?: boolean; vertical?: boolean };
}) {
  if (testID == null) return <>{children}</>;
  return (
    <View
      testID={testID}
      style={style}
      {...({ matchContents } as unknown as ViewProps)}
    >
      {children}
    </View>
  );
}

type PickerValue = string | number;
type PickerItemProps = { label: string; value: PickerValue };

function PickerItem({ label }: PickerItemProps) {
  return <Text>{label}</Text>;
}

type PickerProps = {
  selectedValue: PickerValue;
  onValueChange: (value: PickerValue) => void;
  enabled?: boolean;
  children?: ReactNode;
  testID?: string;
};

export function Picker({
  selectedValue,
  onValueChange,
  enabled = true,
  children,
  testID,
}: PickerProps) {
  const items = Children.toArray(children).flatMap((child) =>
    isValidElement<PickerItemProps>(child) ? [child.props] : [],
  );

  return (
    <View
      testID={testID}
      accessibilityRole="combobox"
      accessibilityState={{ disabled: !enabled }}
      {...({ selectedValue, enabled } as unknown as ViewProps)}
    >
      {items.map((item) => (
        <Pressable
          key={String(item.value)}
          accessibilityRole="button"
          disabled={!enabled}
          onPress={() => onValueChange(item.value)}
        >
          <Text>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

Picker.Item = PickerItem;

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
