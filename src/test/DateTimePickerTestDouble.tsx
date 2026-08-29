import { Pressable, Text } from 'react-native';

type Props = {
  onChange?: (event: unknown, value?: Date) => void;
  onValueChange?: (event: unknown, value?: Date) => void;
  onDismiss: () => void;
  mode?: 'date' | 'time' | 'datetime';
  accessibilityLabel?: string;
};

export default function DateTimePickerTestDouble({
  onChange,
  onValueChange,
  onDismiss,
  accessibilityLabel,
}: Props) {
  const handleChange = onChange ?? onValueChange;
  const label = accessibilityLabel ?? 'Select move date';
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => handleChange?.({ nativeEvent: {} }, new Date('2026-08-14T12:00:00'))}
      >
        <Text>{label}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel native date picker"
        onPress={() => {
          handleChange?.({ type: 'dismissed' });
          onDismiss?.();
        }}
      >
        <Text>Cancel native date picker</Text>
      </Pressable>
    </>
  );
}
