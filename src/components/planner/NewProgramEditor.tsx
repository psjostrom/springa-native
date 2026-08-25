import { Checkbox, Host, Picker } from '@expo/ui';
import { useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { PlannerConfig, PlannerFitnessOption, PlannerState } from '@/api/types';
import { AppText, Button, Card, TextField } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';
import { PlannerRaceGoalFields } from './PlannerRaceGoalFields';
import { PlannerScheduleEditor } from './PlannerScheduleEditor';
import { PlannerSummaryCard } from './PlannerSummaryCard';
import { formatFitnessTime } from './plannerDraft';

type NewProgramEditorProps = {
  value: PlannerConfig;
  errors: Record<string, string>;
  fitnessOptions: PlannerFitnessOption[];
  constraints: PlannerState['constraints'];
  previewing: boolean;
  previewError?: string | null;
  onChange: (value: PlannerConfig) => void;
  onCancel: () => void;
  onPreview: () => void;
};

export function NewProgramEditor({
  value,
  errors,
  fitnessOptions,
  constraints,
  previewing,
  previewError,
  onChange,
  onCancel,
  onPreview,
}: NewProgramEditorProps) {
  const selectedFitness = fitnessOptions.find((option) => option.distanceKm === value.currentAbilityDist) ?? fitnessOptions[0];
  const basePhaseAllowed = value.totalWeeks >= constraints.basePhaseMinimumWeeks;
  const fitnessTime = formatFitnessTime(value.currentAbilitySecs);
  const fitnessStep = selectedFitness?.stepSeconds ?? 0;
  const fitnessStepDescription = fitnessStep % 60 === 0
    ? `${fitnessStep / 60}-minute`
    : `${fitnessStep}-second`;
  const fitnessSliderWidth = useRef(0);
  const fitnessRange = selectedFitness
    ? selectedFitness.maxSeconds - selectedFitness.minSeconds
    : 0;
  const fitnessProgress = selectedFitness && fitnessRange > 0
    ? Math.max(0, Math.min(1, (value.currentAbilitySecs - selectedFitness.minSeconds) / fitnessRange))
    : 0;
  const setFitnessSeconds = (currentAbilitySecs: number) => {
    if (!selectedFitness) return;
    onChange({
      ...value,
      currentAbilitySecs: Math.min(
        selectedFitness.maxSeconds,
        Math.max(selectedFitness.minSeconds, currentAbilitySecs),
      ),
    });
  };
  const adjustFitness = (delta: number) => {
    setFitnessSeconds(value.currentAbilitySecs + delta);
  };
  const updateFitnessFromPosition = (locationX: number) => {
    if (!selectedFitness || fitnessSliderWidth.current <= 0) return;
    const progress = Math.max(0, Math.min(1, locationX / fitnessSliderWidth.current));
    const rawSeconds = selectedFitness.minSeconds + progress * fitnessRange;
    const steppedSeconds = selectedFitness.minSeconds
      + Math.round((rawSeconds - selectedFitness.minSeconds) / selectedFitness.stepSeconds)
        * selectedFitness.stepSeconds;
    setFitnessSeconds(steppedSeconds);
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <PlannerSummaryCard config={value} hasActivePlan={false} weeksToGo={null} />
        <Card tone="brand">
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText variant="heading">Start new program</AppText>
              <AppText tone="muted">
                Set the next race, check your current fitness, preview the plan, then choose when to replace future workouts.
              </AppText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel new program" onPress={onCancel}>
              <AppText tone="brand" variant="label">Cancel</AppText>
            </Pressable>
          </View>

          <PlannerRaceGoalFields value={value} onChange={onChange} errors={errors} />

          <View style={styles.section}>
            <AppText variant="label">Current fitness</AppText>
            <View style={styles.chips}>
              {fitnessOptions.map((option) => {
                const selected = option.distanceKm === value.currentAbilityDist;
                return (
                  <Pressable
                    key={option.label}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.label} current fitness`}
                    accessibilityState={{ selected }}
                    onPress={() => onChange({
                      ...value,
                      currentAbilityDist: option.distanceKm,
                      currentAbilitySecs: option.defaultSeconds,
                    })}
                    style={[styles.chip, selected && styles.selectedChip]}
                  >
                    <AppText tone={selected ? 'primary' : 'muted'} variant="label">{option.label}</AppText>
                  </Pressable>
                );
              })}
            </View>
            {selectedFitness ? (
              <>
                <AppText variant="heading" style={styles.fitnessTime}>{fitnessTime}</AppText>
                <View
                  testID="planner-fitness-slider-accessibility"
                  collapsable={false}
                  style={styles.sliderHost}
                  accessible
                  importantForAccessibility="yes"
                  accessibilityRole="adjustable"
                  accessibilityLabel={`Current fitness time, ${fitnessStepDescription} increments`}
                  accessibilityValue={{
                    min: selectedFitness.minSeconds,
                    max: selectedFitness.maxSeconds,
                    now: value.currentAbilitySecs,
                    text: fitnessTime,
                  }}
                  accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                  onAccessibilityAction={({ nativeEvent }) => {
                    const delta = nativeEvent.actionName === 'increment'
                      ? selectedFitness.stepSeconds
                      : nativeEvent.actionName === 'decrement'
                        ? -selectedFitness.stepSeconds
                      : 0;
                    if (delta !== 0) adjustFitness(delta);
                  }}
                  onLayout={({ nativeEvent }) => {
                    fitnessSliderWidth.current = nativeEvent.layout.width;
                  }}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={({ nativeEvent }) => updateFitnessFromPosition(nativeEvent.locationX)}
                  onResponderMove={({ nativeEvent }) => updateFitnessFromPosition(nativeEvent.locationX)}
                  onResponderTerminationRequest={() => false}
                >
                  <View pointerEvents="none" style={styles.sliderTrack}>
                    <View style={styles.sliderTrackBackground} />
                    <View style={[styles.sliderTrackFill, { width: `${fitnessProgress * 100}%` }]} />
                    <View style={[styles.sliderThumb, { left: `${fitnessProgress * 100}%` }]} />
                  </View>
                </View>
              </>
            ) : null}
            {errors.currentAbilityDist ? <AppText tone="error" variant="caption">{errors.currentAbilityDist}</AppText> : null}
            {errors.currentAbilitySecs ? <AppText tone="error" variant="caption">{errors.currentAbilitySecs}</AppText> : null}
          </View>

          <PlannerScheduleEditor value={value} onChange={onChange} errors={errors} />

          <View style={styles.section}>
            <AppText variant="label">Plan options</AppText>
            <Host colorScheme="dark" matchContents style={styles.nativeHost}>
              <Picker
                selectedValue={value.effortMetric}
                onValueChange={(effortMetric) => onChange({ ...value, effortMetric: effortMetric as PlannerConfig['effortMetric'] })}
                testID="planner-new-effort-picker"
              >
                <Picker.Item label="Pace" value="pace" />
                <Picker.Item label="Heart rate" value="hr" />
                <Picker.Item label="Feel" value="feel" />
              </Picker>
            </Host>
            <TextField
              accessibilityLabel="Starting distance"
              keyboardType="decimal-pad"
              value={String(value.startKm)}
              onChangeText={(text) => {
                const next = Number(text);
                if (Number.isFinite(next)) onChange({ ...value, startKm: next });
              }}
              error={errors.startKm}
            />
            <View style={styles.checkboxRow}>
              <View style={styles.checkboxControlRow}>
                <Host
                  colorScheme="dark"
                  style={styles.checkboxHost}
                  accessible
                  accessibilityRole="checkbox"
                  accessibilityLabel="Include base phase"
                  accessibilityState={{
                    checked: basePhaseAllowed && value.includeBasePhase,
                    disabled: !basePhaseAllowed,
                  }}
                  onAccessibilityTap={() => {
                    if (basePhaseAllowed) onChange({ ...value, includeBasePhase: !value.includeBasePhase });
                  }}
                >
                  <Checkbox
                    value={basePhaseAllowed && value.includeBasePhase}
                    disabled={!basePhaseAllowed}
                    onValueChange={(includeBasePhase) => onChange({ ...value, includeBasePhase })}
                    testID="planner-base-phase"
                  />
                </Host>
                <AppText tone="muted" variant="label">Include base phase</AppText>
              </View>
              <AppText tone="muted" variant="caption">Adds easy-only weeks before the build phase.</AppText>
            </View>
            {errors.includeBasePhase ? <AppText tone="error" variant="caption">{errors.includeBasePhase}</AppText> : null}
          </View>

          {previewError ? <AppText tone="error" accessibilityRole="alert">{previewError}</AppText> : null}
          {errors.totalWeeks ? <AppText tone="warning" variant="caption">{errors.totalWeeks}</AppText> : null}
          <View style={styles.actions}>
            <Button label="Cancel" variant="secondary" onPress={onCancel} />
            <Button
              label="Preview plan"
              loading={previewing}
              accessibilityLabel="Preview plan"
              onPress={onPreview}
            />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: Spacing.lg, padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  headerText: { flex: 1, gap: Spacing.sm },
  section: { gap: Spacing.md, marginTop: Spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    minHeight: 44,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: SpringaColors.surfaceAlt,
    borderColor: SpringaColors.border,
    borderWidth: 1,
  },
  selectedChip: { backgroundColor: SpringaColors.brandAction, borderColor: SpringaColors.brand },
  fitnessTime: { textAlign: 'center', marginTop: Spacing.sm },
  sliderHost: { minHeight: 52, width: '100%', alignSelf: 'stretch' },
  sliderTrack: { flex: 1, justifyContent: 'center' },
  sliderTrackBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: SpringaColors.borderSubtle,
  },
  sliderTrackFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: SpringaColors.brand,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 11,
    backgroundColor: SpringaColors.brandAction,
    borderColor: SpringaColors.brand,
    borderWidth: 2,
  },
  nativeHost: { minHeight: 52, minWidth: 180, alignSelf: 'stretch' },
  checkboxRow: { gap: Spacing.sm },
  checkboxControlRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkboxHost: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: Spacing.sm, marginTop: Spacing.md },
});
