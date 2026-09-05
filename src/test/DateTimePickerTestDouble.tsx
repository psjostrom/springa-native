import { Pressable, Text } from 'react-native';

type Props = {
  onValueChange: (event: unknown, value: Date) => void;
  onDismiss: () => void;
  mode?: 'date' | 'time' | 'datetime';
  accessibilityLabel?: string;
};

export default function DateTimePickerTestDouble({
  onValueChange,
  onDismiss,
  accessibilityLabel,
}: Props) {
  const label = accessibilityLabel ?? 'Select move date';
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => onValueChange({ nativeEvent: {} }, new Date('2026-08-14T12:00:00'))}
      >
        <Text>{label}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel native date picker"
        onPress={onDismiss}
      >
        <Text>Cancel native date picker</Text>
      </Pressable>
    </>
  );
}
