import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { PlannerConfig, PlannerFitnessOption, PlannerState } from '@/api/types';
import { AppText, Button, Card } from '@/components/ui';
import { Spacing } from '@/theme/tokens';
import { PlannerEffortMetricChips } from './PlannerEffortMetricChips';
import { PlannerRaceGoalFields } from './PlannerRaceGoalFields';
import { PlannerScheduleEditor } from './PlannerScheduleEditor';

type PlannerConfigEditorProps = {
  value: PlannerConfig;
  errors: Record<string, string>;
  requestError?: string | null;
  fitnessOptions: PlannerFitnessOption[];
  constraints: PlannerState['constraints'];
  saving: boolean;
  onChange: (value: PlannerConfig) => void;
  onCancel: () => void;
  onDone: () => void;
};

export function PlannerConfigEditor({
  value,
  errors,
  requestError,
  onChange,
  onCancel,
  onDone,
  saving,
}: PlannerConfigEditorProps) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Card tone="brand">
          <AppText variant="heading">Planner settings</AppText>
          <PlannerScheduleEditor value={value} onChange={onChange} errors={errors} />
          <View style={styles.section}>
            <AppText variant="label">Effort metric</AppText>
            <PlannerEffortMetricChips
              value={value.effortMetric}
              onChange={(effortMetric) => onChange({ ...value, effortMetric })}
              testID="planner-effort-picker"
            />
          </View>
          <View style={styles.section}>
            <PlannerRaceGoalFields value={value} onChange={onChange} errors={errors} />
          </View>
          {errors.totalWeeks ? <AppText tone="error" variant="caption">{errors.totalWeeks}</AppText> : null}
          {requestError ? <AppText tone="error" accessibilityRole="alert">{requestError}</AppText> : null}
          <View style={styles.actions}>
            <Button label="Cancel" variant="secondary" onPress={onCancel} />
            <Button
              label="Done"
              accessibilityLabel="Done editing planner"
              loading={saving}
              onPress={onDone}
            />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  section: { gap: Spacing.sm, marginTop: Spacing.xl },
  actions: { gap: Spacing.sm },
});
