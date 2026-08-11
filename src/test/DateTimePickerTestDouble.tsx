import { Pressable, Text } from 'react-native';

type Props = {
  onChange: (event: unknown, value?: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
};

export default function DateTimePickerTestDouble({ onChange }: Props) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select move date"
        onPress={() => onChange({ type: 'set' }, new Date('2026-08-14T12:00:00'))}
      >
        <Text>Select move date</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel native date picker"
        onPress={() => onChange({ type: 'dismissed' }, new Date('2026-08-14T12:00:00'))}
      >
        <Text>Cancel native date picker</Text>
      </Pressable>
    </>
  );
}
