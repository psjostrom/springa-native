import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Smile } from 'lucide-react-native';
import type {
  CalendarEvent,
  CamAPSAutoSubmode,
  CamAPSMode,
  ProtocolTiming,
  WorkoutProtocol,
} from '@/api/types';
import { AppText, Button, ChoiceChip, TextField } from '@/components/ui';
import { formatDuration } from '@/domain/format';
import { formatDistanceKm } from '@/components/workout/completed/completedOverviewPresentation';
import { formatFeel } from '@/domain/formatProtocol';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

export { formatFeel } from '@/domain/formatProtocol';

export type FeedbackFormProps = {
  event: CalendarEvent;
  protocol?: WorkoutProtocol | null;
  feel?: number | null;
  rpe?: number | null;
  saveFeedback: (input: {
    feel?: number | null;
    rpe?: number | null;
    rating?: 'good' | 'bad' | 'skipped' | null;
    comment?: string | null;
    protocol?: WorkoutProtocol | null;
    carbsG?: number | null;
    preRunCarbsG?: number | null;
  }) => Promise<unknown> | void;
  pending: boolean;
  error?: string | null;
  onDone: () => void;
  onInputFocus?: (target: TextInput) => void;
};

export function FeedbackForm({
  event,
  protocol: initialProtocol,
  feel,
  rpe,
  saveFeedback,
  pending,
  error,
  onDone,
  onInputFocus,
}: FeedbackFormProps) {
  const [selectedFeel, setSelectedFeel] = useState<number | null>(
    feel ?? (event.feel ?? null),
  );

  const preRunCarbsRef = useRef<TextInput>(null);
  const carbsIngestedRef = useRef<TextInput>(null);
  const beforeTargetBgRef = useRef<TextInput>(null);
  const beforeManualUhRef = useRef<TextInput>(null);
  const duringTargetBgRef = useRef<TextInput>(null);
  const duringManualUhRef = useRef<TextInput>(null);
  const rescueGramsRef = useRef<TextInput>(null);
  const commentRef = useRef<TextInput>(null);

  // Fueling
  const [preRunCarbs, setPreRunCarbs] = useState<string>(
    initialProtocol?.preRunCarbsG != null
      ? String(initialProtocol.preRunCarbsG)
      : event.preRunCarbsG != null
        ? String(event.preRunCarbsG)
        : '',
  );
  const [carbsIngested, setCarbsIngested] = useState<string>(
    event.carbsIngested != null ? String(event.carbsIngested) : '',
  );

  // Before Run Strategy
  const [beforeMode, setBeforeMode] = useState<CamAPSMode>(
    initialProtocol?.beforeMode ?? 'auto',
  );
  const [beforeAutoSubmode, setBeforeAutoSubmode] = useState<CamAPSAutoSubmode>(
    initialProtocol?.beforeMode === 'auto'
      ? initialProtocol.beforeAutoSubmode ?? 'ease_off'
      : 'ease_off',
  );
  const [beforeTargetBg, setBeforeTargetBg] = useState<string>(
    initialProtocol?.beforeTargetBg != null
      ? String(initialProtocol.beforeTargetBg)
      : '',
  );
  const [beforeManualUh, setBeforeManualUh] = useState<string>(
    initialProtocol?.beforeManualUh != null
      ? String(initialProtocol.beforeManualUh)
      : '',
  );
  const [beforeTiming, setBeforeTiming] = useState<ProtocolTiming>(
    initialProtocol?.beforeTiming ?? '1-2h',
  );

  // During Run Strategy
  const [duringSame, setDuringSame] = useState(
    initialProtocol ? initialProtocol.duringSame : true,
  );
  const [duringMode, setDuringMode] = useState<CamAPSMode>(
    initialProtocol?.duringMode ?? 'disconnected',
  );
  const [duringAutoSubmode, setDuringAutoSubmode] = useState<CamAPSAutoSubmode>(
    initialProtocol?.duringAutoSubmode ?? 'ease_off',
  );
  const [duringTargetBg, setDuringTargetBg] = useState<string>(
    initialProtocol?.duringTargetBg != null
      ? String(initialProtocol.duringTargetBg)
      : '',
  );
  const [duringManualUh, setDuringManualUh] = useState<string>(
    initialProtocol?.duringManualUh != null
      ? String(initialProtocol.duringManualUh)
      : '',
  );

  // Rescue Carbs
  const [hadRescue, setHadRescue] = useState(
    initialProtocol ? (initialProtocol.rescueCarbsG != null && initialProtocol.rescueCarbsG > 0) : false,
  );
  const [rescueGrams, setRescueGrams] = useState<string>(
    initialProtocol?.rescueCarbsG != null
      ? String(initialProtocol.rescueCarbsG)
      : '',
  );

  // Note
  const [comment, setComment] = useState<string>(
    event.feedbackComment ?? initialProtocol?.note ?? '',
  );

  const displayFeel = feel ?? event.feel;
  const displayRpe = rpe ?? event.rpe;
  const hasGarminMetrics = displayFeel != null;

  const handleSave = async () => {
    const parsedTargetBg = parseFloat(beforeTargetBg);
    const parsedManualUh = parseFloat(beforeManualUh);
    const parsedRescueG = parseFloat(rescueGrams);
    const parsedPreRunG = parseFloat(preRunCarbs);
    const parsedCarbsG = parseFloat(carbsIngested);

    const resolvedFeel = selectedFeel ?? displayFeel ?? null;

    const protocolToSave: WorkoutProtocol = {
      beforeMode,
      beforeAutoSubmode: beforeMode === 'auto' ? beforeAutoSubmode : null,
      beforeTargetBg: beforeMode === 'auto' && Number.isFinite(parsedTargetBg) ? parsedTargetBg : null,
      beforeManualUh: beforeMode === 'manual' && Number.isFinite(parsedManualUh) ? parsedManualUh : null,
      beforeTiming,
      duringSame,
      duringMode: duringSame ? null : duringMode,
      duringAutoSubmode: !duringSame && duringMode === 'auto' ? duringAutoSubmode : null,
      duringTargetBg: !duringSame && duringMode === 'auto' && Number.isFinite(parseFloat(duringTargetBg)) ? parseFloat(duringTargetBg) : null,
      duringManualUh: !duringSame && duringMode === 'manual' && Number.isFinite(parseFloat(duringManualUh)) ? parseFloat(duringManualUh) : null,
      preRunCarbsG: Number.isFinite(parsedPreRunG) ? parsedPreRunG : null,
      rescueCarbsG: hadRescue && Number.isFinite(parsedRescueG) ? parsedRescueG : null,
      feel: resolvedFeel,
      rpe: displayRpe ?? null,
      note: comment.trim() || null,
    };

    try {
      await saveFeedback({
        feel: resolvedFeel,
        rpe: displayRpe ?? null,
        comment: comment.trim() || null,
        protocol: protocolToSave,
        carbsG: Number.isFinite(parsedCarbsG) ? parsedCarbsG : null,
        preRunCarbsG: Number.isFinite(parsedPreRunG) ? parsedPreRunG : null,
      });
    } catch {
      return;
    }
    onDone();
  };

  const handleSkip = async () => {
    try {
      await saveFeedback({
        rating: 'skipped',
      });
    } catch {
      return;
    }
    onDone();
  };

  return (
    <View style={styles.container}>
      {/* Title & Date */}
      <View style={styles.header}>
        <AppText variant="heading" tone="primary">
          How was the run?
        </AppText>
        <AppText variant="caption" tone="muted">
          {event.name}
        </AppText>
      </View>

      {/* Summary Stat Tiles */}
      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <AppText variant="caption" tone="muted">
            Distance
          </AppText>
          <AppText variant="subheading" tone="primary">
            {event.distance ? formatDistanceKm(event.distance) : '—'}
          </AppText>
        </View>
        <View style={styles.statTile}>
          <AppText variant="caption" tone="muted">
            Time
          </AppText>
          <AppText variant="subheading" tone="primary">
            {event.duration ? formatDuration(event.duration) : '—'}
          </AppText>
        </View>
        <View style={styles.statTile}>
          <AppText variant="caption" tone="muted">
            Avg HR
          </AppText>
          <AppText variant="subheading" tone="primary">
            {event.avgHr ? `${Math.round(event.avgHr)} bpm` : '—'}
          </AppText>
        </View>
      </View>

      {/* Rating or Garmin Receipt */}
      <View style={styles.ratingSection}>
        {hasGarminMetrics ? (
          <View style={styles.garminReceipt} testID="garmin-receipt">
            <Smile size={20} color={SpringaColors.brand} />
            <AppText variant="label" tone="primary">
              Garmin Receipt:{' '}
              {displayFeel != null ? formatFeel(displayFeel) : ''}
              {displayFeel != null && displayRpe != null ? ' · ' : ''}
              {displayRpe != null ? `RPE ${displayRpe}/10` : ''}
            </AppText>
          </View>
        ) : (
          <View style={styles.scaleContainer} testID="feel-scale-picker">
            <AppText variant="caption" tone="muted" style={styles.scaleTitle}>
              How did it feel?
            </AppText>
            <View style={styles.scaleRow}>
              {[1, 2, 3, 4, 5].map((val) => (
                <Pressable
                  key={val}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${val}: ${formatFeel(val)}`}
                  testID={`feel-button-${val}`}
                  onPress={() => setSelectedFeel(val)}
                  style={[
                    styles.scaleButton,
                    selectedFeel === val && styles.scaleButtonSelected,
                  ]}
                >
                  <AppText
                    variant="subheading"
                    style={[
                      styles.scaleButtonText,
                      selectedFeel === val && styles.scaleButtonTextSelected,
                    ]}
                  >
                    {val}
                  </AppText>
                </Pressable>
              ))}
            </View>
            {selectedFeel != null ? (
              <AppText variant="caption" style={styles.scaleLabel}>
                {formatFeel(selectedFeel)}
              </AppText>
            ) : null}
          </View>
        )}
      </View>

      {/* Fueling Section */}
      <View style={styles.strategySection}>
        <AppText variant="label" tone="muted" style={styles.sectionTitle}>
          FUELING
        </AppText>

        {/* Pre-run Carbs */}
        <View style={styles.fieldBlock}>
          <AppText variant="subheading" tone="primary">
            Pre-run Carbs
          </AppText>
          <TextField
            ref={preRunCarbsRef}
            onFocus={() => {
              if (preRunCarbsRef.current != null) onInputFocus?.(preRunCarbsRef.current);
            }}
            accessibilityLabel="Pre-run carbs"
            placeholder="Pre-run carbs (grams, e.g. 25)"
            keyboardType="number-pad"
            value={preRunCarbs}
            onChangeText={setPreRunCarbs}
            editable={!pending}
          />
        </View>

        {/* Carbs Ingested */}
        <View style={styles.fieldBlock}>
          <View style={styles.labelWithAction}>
            <AppText variant="subheading" tone="primary">
              Carbs Ingested
            </AppText>
            {event.prescribedCarbsG != null ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Use prescribed ${event.prescribedCarbsG}g`}
                testID="use-prescribed-carbs-button"
                onPress={() => setCarbsIngested(String(event.prescribedCarbsG))}
                disabled={pending}
                hitSlop={8}
              >
                <AppText variant="caption" style={styles.actionLink}>
                  Use prescribed ({event.prescribedCarbsG}g)
                </AppText>
              </Pressable>
            ) : null}
          </View>
          <TextField
            ref={carbsIngestedRef}
            onFocus={() => {
              if (carbsIngestedRef.current != null) onInputFocus?.(carbsIngestedRef.current);
            }}
            accessibilityLabel="Carbs ingested"
            placeholder="Carbs during run (grams, e.g. 40)"
            keyboardType="number-pad"
            value={carbsIngested}
            onChangeText={setCarbsIngested}
            editable={!pending}
          />
        </View>
      </View>

      {/* Pump Strategy Section (flat layout, no cards) */}
      <View style={styles.strategySection}>
        <AppText variant="label" tone="muted" style={styles.sectionTitle}>
          PUMP STRATEGY
        </AppText>

        {/* Before Run */}
        <View style={styles.fieldBlock}>
          <AppText variant="subheading" tone="primary">
            Before Run
          </AppText>
          <View style={styles.chipRow}>
            <ChoiceChip
              label="Disconnected"
              selected={beforeMode === 'disconnected'}
              disabled={pending}
              onPress={() => setBeforeMode('disconnected')}
            />
            <ChoiceChip
              label="Auto"
              selected={beforeMode === 'auto'}
              disabled={pending}
              onPress={() => setBeforeMode('auto')}
            />
            <ChoiceChip
              label="Manual"
              selected={beforeMode === 'manual'}
              disabled={pending}
              onPress={() => setBeforeMode('manual')}
            />
          </View>

          {beforeMode === 'auto' && (
            <View style={styles.subOptions}>
              <View style={styles.chipRow}>
                <ChoiceChip
                  label="Ease off"
                  selected={beforeAutoSubmode === 'ease_off'}
                  disabled={pending}
                  onPress={() => setBeforeAutoSubmode('ease_off')}
                />
                <ChoiceChip
                  label="Normal"
                  selected={beforeAutoSubmode === 'normal'}
                  disabled={pending}
                  onPress={() => setBeforeAutoSubmode('normal')}
                />
                <ChoiceChip
                  label="Boost"
                  selected={beforeAutoSubmode === 'boost'}
                  disabled={pending}
                  onPress={() => setBeforeAutoSubmode('boost')}
                />
              </View>
              <TextField
                ref={beforeTargetBgRef}
                onFocus={() => {
                  if (beforeTargetBgRef.current != null) onInputFocus?.(beforeTargetBgRef.current);
                }}
                accessibilityLabel="Before target BG"
                placeholder="Target BG (optional mmol/L, e.g. 8.5)"
                keyboardType="decimal-pad"
                value={beforeTargetBg}
                onChangeText={setBeforeTargetBg}
                editable={!pending}
              />
            </View>
          )}

          {beforeMode === 'manual' && (
            <View style={styles.subOptions}>
              <TextField
                ref={beforeManualUhRef}
                onFocus={() => {
                  if (beforeManualUhRef.current != null) onInputFocus?.(beforeManualUhRef.current);
                }}
                accessibilityLabel="Before manual rate"
                placeholder="Basal rate (u/h, e.g. 0.22)"
                keyboardType="decimal-pad"
                value={beforeManualUh}
                onChangeText={setBeforeManualUh}
                editable={!pending}
              />
            </View>
          )}

          <AppText variant="caption" tone="muted" style={styles.subLabel}>
            Timing
          </AppText>
          <View style={styles.chipRow}>
            <ChoiceChip
              label=">2h before"
              selected={beforeTiming === '>2h'}
              disabled={pending}
              onPress={() => setBeforeTiming('>2h')}
            />
            <ChoiceChip
              label="1–2h before"
              selected={beforeTiming === '1-2h'}
              disabled={pending}
              onPress={() => setBeforeTiming('1-2h')}
            />
            <ChoiceChip
              label="<30m before"
              selected={beforeTiming === '<30m'}
              disabled={pending}
              onPress={() => setBeforeTiming('<30m')}
            />
            <ChoiceChip
              label="At start"
              selected={beforeTiming === 'at_start'}
              disabled={pending}
              onPress={() => setBeforeTiming('at_start')}
            />
          </View>
        </View>

        {/* During Run */}
        <View style={styles.fieldBlock}>
          <AppText variant="subheading" tone="primary">
            During Run
          </AppText>
          <View style={styles.chipRow}>
            <ChoiceChip
              label="Same as before"
              selected={duringSame}
              disabled={pending}
              onPress={() => setDuringSame(true)}
            />
            <ChoiceChip
              label="Different"
              selected={!duringSame}
              disabled={pending}
              onPress={() => setDuringSame(false)}
            />
          </View>

          {!duringSame && (
            <View style={styles.subOptions}>
              <View style={styles.chipRow}>
                <ChoiceChip
                  label="Disconnected"
                  selected={duringMode === 'disconnected'}
                  disabled={pending}
                  onPress={() => setDuringMode('disconnected')}
                />
                <ChoiceChip
                  label="Auto"
                  selected={duringMode === 'auto'}
                  disabled={pending}
                  onPress={() => setDuringMode('auto')}
                />
                <ChoiceChip
                  label="Manual"
                  selected={duringMode === 'manual'}
                  disabled={pending}
                  onPress={() => setDuringMode('manual')}
                />
              </View>

              {duringMode === 'auto' && (
                <View style={styles.chipRow}>
                  <ChoiceChip
                    label="Ease off"
                    selected={duringAutoSubmode === 'ease_off'}
                    disabled={pending}
                    onPress={() => setDuringAutoSubmode('ease_off')}
                  />
                  <ChoiceChip
                    label="Normal"
                    selected={duringAutoSubmode === 'normal'}
                    disabled={pending}
                    onPress={() => setDuringAutoSubmode('normal')}
                  />
                  <ChoiceChip
                    label="Boost"
                    selected={duringAutoSubmode === 'boost'}
                    disabled={pending}
                    onPress={() => setDuringAutoSubmode('boost')}
                  />
                </View>
              )}

              {duringMode === 'auto' && (
                <TextField
                  ref={duringTargetBgRef}
                  onFocus={() => {
                    if (duringTargetBgRef.current != null) onInputFocus?.(duringTargetBgRef.current);
                  }}
                  accessibilityLabel="During target BG"
                  placeholder="Target BG (optional mmol/L, e.g. 8.5)"
                  keyboardType="decimal-pad"
                  value={duringTargetBg}
                  onChangeText={setDuringTargetBg}
                  editable={!pending}
                />
              )}

              {duringMode === 'manual' && (
                <TextField
                  ref={duringManualUhRef}
                  onFocus={() => {
                    if (duringManualUhRef.current != null) onInputFocus?.(duringManualUhRef.current);
                  }}
                  accessibilityLabel="During manual rate"
                  placeholder="Basal rate (u/h, e.g. 0.22)"
                  keyboardType="decimal-pad"
                  value={duringManualUh}
                  onChangeText={setDuringManualUh}
                  editable={!pending}
                />
              )}
            </View>
          )}
        </View>

        {/* Rescue Carbs */}
        <View style={styles.fieldBlock}>
          <AppText variant="subheading" tone="primary">
            Rescue Carbs
          </AppText>
          <View style={styles.chipRow}>
            <ChoiceChip
              label="No (per plan)"
              selected={!hadRescue}
              disabled={pending}
              onPress={() => setHadRescue(false)}
            />
            <ChoiceChip
              label="Yes (rescue)"
              selected={hadRescue}
              disabled={pending}
              onPress={() => setHadRescue(true)}
            />
          </View>

          {hadRescue && (
            <View style={styles.subOptions}>
              <TextField
                ref={rescueGramsRef}
                onFocus={() => {
                  if (rescueGramsRef.current != null) onInputFocus?.(rescueGramsRef.current);
                }}
                accessibilityLabel="Rescue carbs grams"
                placeholder="Rescue carbs (grams, e.g. 15)"
                keyboardType="number-pad"
                value={rescueGrams}
                onChangeText={setRescueGrams}
                editable={!pending}
              />
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.fieldBlock}>
          <AppText variant="subheading" tone="primary">
            Notes
          </AppText>
          <TextField
            ref={commentRef}
            onFocus={() => {
              if (commentRef.current != null) onInputFocus?.(commentRef.current);
            }}
            accessibilityLabel="Feedback comment"
            placeholder="Optional note (weather, heat, course)..."
            value={comment}
            onChangeText={setComment}
            editable={!pending}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {error ? (
        <AppText variant="caption" tone="error" style={styles.errorText}>
          {error}
        </AppText>
      ) : null}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <Button
          label="Save"
          variant="primary"
          loading={pending}
          disabled={pending || (selectedFeel == null && displayFeel == null)}
          onPress={handleSave}
          style={styles.actionButton}
        />
        <Button
          label="Skip"
          variant="secondary"
          disabled={pending}
          onPress={handleSkip}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statTile: {
    flex: 1,
    backgroundColor: SpringaColors.surface,
    borderColor: SpringaColors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  ratingSection: {
    marginBottom: Spacing.md,
  },
  garminReceipt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: SpringaColors.surfaceAlt,
    borderColor: SpringaColors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  scaleContainer: {
    gap: Spacing.sm,
  },
  scaleTitle: {
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scaleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  scaleButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SpringaColors.surface,
    borderColor: SpringaColors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  scaleButtonSelected: {
    borderColor: SpringaColors.brand,
    backgroundColor: SpringaColors.tintBrand,
  },
  scaleButtonText: {
    color: SpringaColors.text,
  },
  scaleButtonTextSelected: {
    color: SpringaColors.brand,
    fontWeight: '700',
  },
  scaleLabel: {
    textAlign: 'center',
    color: SpringaColors.brand,
    fontWeight: '600',
  },
  strategySection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    letterSpacing: 1.2,
    marginTop: Spacing.xs,
  },
  fieldBlock: {
    gap: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  subOptions: {
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  subLabel: {
    marginTop: Spacing.xs,
  },
  errorText: {
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  labelWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionLink: {
    color: SpringaColors.brand,
    fontWeight: '600',
  },
});
