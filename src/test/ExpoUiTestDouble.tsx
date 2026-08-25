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

type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  testID?: string;
};

function Toggle({ value, onValueChange, label, disabled, testID, role }: ToggleProps & { role: 'switch' | 'checkbox' }) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      testID={testID}
    >
      {label ? <Text>{label}</Text> : null}
    </Pressable>
  );
}

export function Switch(props: ToggleProps) {
  return <Toggle {...props} role="switch" />;
}

export function Checkbox(props: ToggleProps) {
  return <Toggle {...props} role="checkbox" />;
}

type SliderProps = {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  testID?: string;
};

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  disabled,
  testID,
}: SliderProps) {
  const nextValue = Math.min(max, Math.max(min, value + step));
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onValueChange(nextValue)}
      testID={testID}
    />
  );
}

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
  accessible,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  accessibilityValue,
  accessibilityState,
  onAccessibilityTap,
}: ViewProps & {
  matchContents?: boolean | { horizontal?: boolean; vertical?: boolean };
}) {
  if (testID == null) return <>{children}</>;
  return (
    <View
      testID={testID}
      style={style}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityValue={accessibilityValue}
      accessibilityState={accessibilityState}
      onAccessibilityTap={onAccessibilityTap}
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
