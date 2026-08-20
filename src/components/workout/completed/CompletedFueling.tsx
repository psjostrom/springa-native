import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Pencil } from 'lucide-react-native';
import type { CalendarEvent, CompletedWorkoutOverview } from '@/api/types';
import { AppText, Badge, Card, IconButton, Section, TextField } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';

type CompletedFuelingProps = {
  event: CalendarEvent;
  preRunCarbs: CompletedWorkoutOverview['preRunCarbs'] | null;
  saveCarbs: (value: number) => Promise<void>;
  savePreRunCarbs: (
    value: number | null,
  ) => Promise<{ cleanupWarning: string | null }>;
};

type EditorProps = {
  label: string;
  accessibilityLabel: string;
  value: number | null;
  allowClear: boolean;
  saveErrorFallback: string;
  onSave: (value: number | null) => Promise<{ cleanupWarning?: string | null } | void>;
};

function useEditor({ value, allowClear, onSave, saveErrorFallback }: {
  value: number | null;
  allowClear: boolean;
  onSave: (value: number | null) => Promise<{ cleanupWarning?: string | null } | void>;
  saveErrorFallback: string;
}) {
  const inputRef = useRef<TextInput>(null);
  const draftRef = useRef('');
  const committingRef = useRef<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanupWarning, setCleanupWarning] = useState<string | null>(null);

  const beginEditing = () => {
    const next = value == null ? '' : String(value);
    draftRef.current = next;
    committingRef.current = null;
    setDraft(next);
    setError(null);
    setCleanupWarning(null);
    setEditing(true);
  };

  const commit = async () => {
    const input = draftRef.current.trim();
    if (saving || committingRef.current === input) return;

    const carbsG = input.length === 0 ? null : Number(input);
    if (
      carbsG === null && !allowClear
    ) {
      setError('Use a whole number of grams.');
      return;
    }
    if (
      carbsG !== null &&
      (!/^\d+$/.test(input) || !Number.isSafeInteger(carbsG) || carbsG < 0)
    ) {
      setError('Use a whole number of grams.');
      return;
    }

    committingRef.current = input;
    setSaving(true);
    setError(null);
    try {
      const result = await onSave(carbsG);
      if (result != null && 'cleanupWarning' in result) {
        setCleanupWarning(result.cleanupWarning ?? null);
      }
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : saveErrorFallback);
    } finally {
      setSaving(false);
      if (committingRef.current === input) committingRef.current = null;
    }
  };

  const updateDraft = (next: string) => {
    draftRef.current = next;
    committingRef.current = null;
    setDraft(next);
  };

  return {
    inputRef,
    editing,
    draft,
    saving,
    error,
    cleanupWarning,
    beginEditing,
    commit,
    updateDraft,
  };
}

function EditorRow({
  label,
  accessibilityLabel,
  editAccessibilityLabel,
  value,
  allowClear,
  saveErrorFallback,
  onSave,
  badge,
}: EditorProps & {
  editAccessibilityLabel: string;
  badge?: ReactElement | null;
}) {
  const {
    inputRef,
    editing,
    draft,
    saving,
    error,
    cleanupWarning,
    beginEditing,
    commit,
    updateDraft,
  } = useEditor({ value, allowClear, saveErrorFallback, onSave });

  return (
    <Card accessibilityLabel={label} style={styles.row}>
      <View style={styles.labelWrap}>
        <AppText tone="muted" style={styles.label} selectable>
          {label}
        </AppText>
        {badge}
      </View>
      {editing ? (
        <View style={styles.editor}>
          <TextField
            ref={inputRef}
            autoFocus
            value={draft}
            onChangeText={updateDraft}
            onBlur={() => void commit()}
            onSubmitEditing={() => {
              void commit();
              inputRef.current?.blur();
            }}
            accessibilityLabel={accessibilityLabel}
            keyboardType="number-pad"
            returnKeyType="done"
            submitBehavior="submit"
            placeholder="0"
            style={styles.input}
            editable={!saving}
            error={error ?? undefined}
          />
          <AppText tone="muted">g</AppText>
        </View>
      ) : (
        <View style={styles.valueAction}>
          <AppText variant="subheading" style={styles.value} selectable>
            {value == null ? 'Add' : `${value} g`}
          </AppText>
          <IconButton
            accessibilityLabel={editAccessibilityLabel}
            onPress={beginEditing}
            disabled={saving}
          >
            <Pencil color={SpringaColors.muted} size={16} />
          </IconButton>
        </View>
      )}
      {!editing && cleanupWarning ? (
        <AppText accessibilityRole="alert" tone="warning" style={styles.warning}>
          {cleanupWarning}
        </AppText>
      ) : null}
    </Card>
  );
}

function preRunBadge(
  source: CompletedWorkoutOverview['preRunCarbs']['source'] | null,
): ReactElement | null {
  switch (source) {
    case 'activity':
      return <Badge label="Activity" tone="brand" />;
    case 'paired-event':
      return <Badge label="Fallback" tone="warning" />;
    case 'none':
      return <Badge label="Not recorded" tone="neutral" />;
    default:
      return null;
  }
}

export function CompletedFueling({
  event,
  preRunCarbs,
  saveCarbs,
  savePreRunCarbs,
}: CompletedFuelingProps): ReactElement {
  return (
    <Section title="Fueling">
      <EditorRow
        label="Carbs ingested"
        accessibilityLabel="Carbs ingested grams"
        editAccessibilityLabel="Edit carbs ingested"
        value={event.carbsIngested ?? null}
        allowClear={false}
        saveErrorFallback="Failed to save carbs."
        onSave={async (carbsG) => {
          await saveCarbs(carbsG as number);
        }}
      />
      {event.prescribedCarbsG != null ? (
        <Card tone="subtle" accessibilityLabel="Planned carbs" style={styles.row}>
          <AppText tone="muted" style={styles.label} selectable>
            Planned carbs
          </AppText>
          <AppText variant="subheading" selectable>
            {event.prescribedCarbsG} g
          </AppText>
        </Card>
      ) : null}
      <EditorRow
        label="Pre-run carbs"
        accessibilityLabel="Pre-run carbs grams"
        editAccessibilityLabel="Edit pre-run carbs"
        value={preRunCarbs?.grams ?? event.preRunCarbsG ?? null}
        allowClear
        saveErrorFallback="Failed to save pre-run carbs."
        badge={preRunBadge(preRunCarbs?.source ?? null)}
        onSave={savePreRunCarbs}
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  labelWrap: {
    flex: 1,
    minWidth: 128,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    minWidth: 96,
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
  warning: {
    flexBasis: '100%',
  },
});