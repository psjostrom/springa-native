import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { SpringaColors } from '@/theme/colors';

type PreRunCarbsRowProps = {
  value: number | null;
  pending: boolean;
  onSave: (value: number | null) => Promise<void>;
};

export function PreRunCarbsRow({ value, pending, onSave }: PreRunCarbsRowProps) {
  const inputRef = useRef<TextInput>(null);
  const draftRef = useRef('');
  const committingRef = useRef<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const beginEditing = () => {
    const next = value == null ? '' : String(value);
    draftRef.current = next;
    committingRef.current = null;
    setDraft(next);
    setError(null);
    setEditing(true);
  };

  const commit = async () => {
    const input = draftRef.current.trim();
    if (pending || committingRef.current === input) return;

    const carbsG = input.length === 0 ? null : Number(input);
    if (
      carbsG !== null &&
      (!/^\d+$/.test(input) || !Number.isSafeInteger(carbsG) || carbsG < 0)
    ) {
      setError('Use a whole number of grams.');
      return;
    }

    committingRef.current = input;
    setError(null);
    try {
      await onSave(carbsG);
      setEditing(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Failed to save pre-run carbs.',
      );
    } finally {
      if (committingRef.current === input) committingRef.current = null;
    }
  };

  return (
    <View style={styles.row} accessibilityLabel="Pre-run carbs">
      <Text style={styles.label} selectable>
        Pre-run carbs
      </Text>
      {editing ? (
        <View style={styles.editor}>
          <TextInput
            ref={inputRef}
            autoFocus
            value={draft}
            onChangeText={(next) => {
              draftRef.current = next;
              committingRef.current = null;
              setDraft(next);
              setError(null);
            }}
            onBlur={() => void commit()}
            onSubmitEditing={() => {
              void commit();
              inputRef.current?.blur();
            }}
            accessibilityLabel="Pre-run carbs grams"
            keyboardType="number-pad"
            returnKeyType="done"
            submitBehavior="submit"
            placeholder="0"
            placeholderTextColor={SpringaColors.muted}
            style={styles.input}
            editable={!pending}
          />
          <Text style={styles.unit}>g</Text>
        </View>
      ) : (
        <Pressable
          onPress={beginEditing}
          accessibilityRole="button"
          accessibilityLabel="Edit pre-run carbs"
          hitSlop={8}
          style={styles.valueAction}
        >
          <Text style={styles.value} selectable>
            {value == null ? 'Add' : `${value} g`}
          </Text>
          <Pencil color={SpringaColors.muted} size={16} />
        </Pressable>
      )}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert" selectable>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: SpringaColors.surfaceAlt,
  },
  label: {
    flex: 1,
    minWidth: 128,
    color: SpringaColors.muted,
    fontSize: 16,
  },
  valueAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    color: SpringaColors.text,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  editor: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    minWidth: 88,
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: SpringaColors.brand,
    borderRadius: 10,
    borderCurve: 'continuous',
    color: SpringaColors.text,
    backgroundColor: SpringaColors.surface,
    fontSize: 17,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    color: SpringaColors.muted,
    fontSize: 16,
  },
  error: {
    width: '100%',
    color: SpringaColors.error,
    fontSize: 13,
  },
});
