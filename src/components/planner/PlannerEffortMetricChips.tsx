import { StyleSheet, View } from 'react-native';
import type { EffortMetric } from '@/api/types';
import { ChoiceChip } from '@/components/ui';
import { Spacing } from '@/theme/tokens';

const choices: { value: EffortMetric; label: string }[] = [
  { value: 'pace', label: 'Pace' },
  { value: 'hr', label: 'Heart rate' },
  { value: 'feel', label: 'Feel' },
];

type PlannerEffortMetricChipsProps = {
  value: EffortMetric;
  onChange: (value: EffortMetric) => void;
  testID?: string;
};

export function PlannerEffortMetricChips({ value, onChange, testID }: PlannerEffortMetricChipsProps) {
  return (
    <View testID={testID} style={styles.chips}>
      {choices.map((choice) => {
        const selected = choice.value === value;
        return <ChoiceChip
          key={choice.value}
          label={choice.label}
          selected={selected}
          onPress={() => onChange(choice.value)}
        />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
