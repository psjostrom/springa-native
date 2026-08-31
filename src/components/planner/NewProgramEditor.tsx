import { Checkbox, Host, Slider } from '@expo/ui';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { PlannerConfig, PlannerFitnessOption, PlannerState } from '@/api/types';
import { AppText, Button, Card, ChoiceChip, TextField } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';
import { PlannerRaceGoalFields } from './PlannerRaceGoalFields';
import { PlannerEffortMetricChips } from './PlannerEffortMetricChips';
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

          <PlannerRaceGoalFields value={value} onChange={onChange} errors={errors} deriveTimeline />

          <View style={styles.section}>
            <AppText variant="label">Current fitness</AppText>
            <View style={styles.chips}>
              {fitnessOptions.map((option) => {
                const selected = option.distanceKm === value.currentAbilityDist;
                return (
                  <ChoiceChip
                    key={option.label}
                    label={option.label}
                    accessibilityLabel={`${option.label} current fitness`}
                    selected={selected}
                    onPress={() => onChange({
                      ...value,
                      currentAbilityDist: option.distanceKm,
                      currentAbilitySecs: option.defaultSeconds,
                    })}
                  />
                );
              })}
            </View>
            {selectedFitness ? (
              <>
                <AppText variant="heading" style={styles.fitnessTime}>{fitnessTime}</AppText>
                <Host
                  testID="planner-fitness-slider-accessibility"
                  colorScheme="dark"
                  seedColor={SpringaColors.brand}
                  matchContents={{ vertical: true }}
                  style={styles.sliderHost}
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel={`Current fitness time, ${fitnessStepDescription} increments`}
                  accessibilityValue={{
                    min: selectedFitness.minSeconds,
                    max: selectedFitness.maxSeconds,
                    now: value.currentAbilitySecs,
                    text: fitnessTime,
                  }}
                >
                  <Slider
                    value={value.currentAbilitySecs}
                    min={selectedFitness.minSeconds}
                    max={selectedFitness.maxSeconds}
                    step={selectedFitness.stepSeconds}
                    onValueChange={(currentAbilitySecs) => onChange({ ...value, currentAbilitySecs })}
                    testID="planner-fitness-slider"
                  />
                </Host>
              </>
            ) : null}
            {errors.currentAbilityDist ? <AppText tone="error" variant="caption">{errors.currentAbilityDist}</AppText> : null}
            {errors.currentAbilitySecs ? <AppText tone="error" variant="caption">{errors.currentAbilitySecs}</AppText> : null}
          </View>

          <PlannerScheduleEditor value={value} onChange={onChange} errors={errors} />

          <View style={styles.section}>
            <AppText variant="label">Effort metric</AppText>
            <PlannerEffortMetricChips
              value={value.effortMetric}
              onChange={(effortMetric) => onChange({ ...value, effortMetric })}
              testID="planner-new-effort-chips"
            />
            <AppText variant="label">Starting long-run distance (km)</AppText>
            <TextField
              accessibilityLabel="Starting long-run distance (km)"
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
                  seedColor={SpringaColors.brand}
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
  fitnessTime: { textAlign: 'center', marginTop: Spacing.sm },
  sliderHost: { minHeight: 52, width: '100%', alignSelf: 'stretch' },
  checkboxRow: { gap: Spacing.sm },
  checkboxControlRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkboxHost: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: Spacing.sm, marginTop: Spacing.md },
});
