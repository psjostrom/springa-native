import { Pressable, StyleSheet, View } from 'react-native';
import type { EffortMetric } from '@/api/types';
import { AppText } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { MinTouchTarget, Radius, Spacing } from '@/theme/tokens';

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
        return (
          <Pressable
            key={choice.value}
            accessibilityRole="button"
            accessibilityLabel={choice.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(choice.value)}
            style={[styles.chip, selected && styles.selectedChip]}
          >
            <AppText tone={selected ? 'primary' : 'muted'} variant="label">{choice.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    minHeight: MinTouchTarget,
    minWidth: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: SpringaColors.surfaceAlt,
    borderColor: SpringaColors.border,
    borderWidth: 1,
  },
  selectedChip: { backgroundColor: SpringaColors.brandAction, borderColor: SpringaColors.brand },
});
