import { Host, Picker } from '@expo/ui';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { PlannerConfig, PlannerFitnessOption, PlannerState } from '@/api/types';
import { AppText, Button, Card } from '@/components/ui';
import { Spacing } from '@/theme/tokens';
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
  onDone: () => void;
};

export function PlannerConfigEditor({
  value,
  errors,
  requestError,
  onChange,
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
            <Host colorScheme="dark" matchContents style={styles.nativeHost}>
              <Picker
                selectedValue={value.effortMetric}
                onValueChange={(effortMetric) => onChange({ ...value, effortMetric: effortMetric as PlannerConfig['effortMetric'] })}
                testID="planner-effort-picker"
              >
                <Picker.Item label="Pace" value="pace" />
                <Picker.Item label="Heart rate" value="hr" />
                <Picker.Item label="Feel" value="feel" />
              </Picker>
            </Host>
          </View>
          <PlannerRaceGoalFields value={value} onChange={onChange} errors={errors} />
          {errors.totalWeeks ? <AppText tone="error" variant="caption">{errors.totalWeeks}</AppText> : null}
          {requestError ? <AppText tone="error" accessibilityRole="alert">{requestError}</AppText> : null}
          <Button
            label="Done"
            accessibilityLabel="Done editing planner"
            loading={saving}
            onPress={onDone}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  section: { gap: Spacing.sm, marginTop: Spacing.xl },
  nativeHost: { minHeight: 52, minWidth: 180, alignSelf: 'stretch' },
});
