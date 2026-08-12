import { Pressable, Text } from 'react-native';

type Props = {
  onValueChange: (event: unknown, value: Date) => void;
  onDismiss: () => void;
  mode?: 'date' | 'time' | 'datetime';
};

export default function DateTimePickerTestDouble({ onValueChange, onDismiss }: Props) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select move date"
        onPress={() => onValueChange({ nativeEvent: {} }, new Date('2026-08-14T12:00:00'))}
      >
        <Text>Select move date</Text>
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
