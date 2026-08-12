import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { AppText, Card, IconButton, TextField } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';

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
    <Card padding="compact" style={styles.row} accessibilityLabel="Pre-run carbs">
      <AppText tone="muted" style={styles.label} selectable>
        Pre-run carbs
      </AppText>
      {editing ? (
        <View style={styles.editor}>
          <TextField
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
            style={styles.input}
            editable={!pending}
            error={error ?? undefined}
          />
          <AppText tone="muted">g</AppText>
        </View>
      ) : (
        <View style={styles.valueAction}>
          <AppText variant="subheading" style={styles.value} selectable>
            {value == null ? 'Add' : `${value} g`}
          </AppText>
          <IconButton accessibilityLabel="Edit pre-run carbs" onPress={beginEditing}>
            <Pencil color={SpringaColors.muted} size={16} />
          </IconButton>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: SpringaColors.surfaceAlt,
  },
  label: {
    flex: 1,
    minWidth: 128,
  },
  valueAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
  editor: {
    minWidth: 128,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    minWidth: 88,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
