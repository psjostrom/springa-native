import { Pressable, StyleSheet } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { MinTouchTarget, Radius, Spacing } from '@/theme/tokens';
import { AppText } from './AppText';

type ChoiceChipProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  onPress: () => void;
};

export function ChoiceChip({
  label,
  selected,
  disabled,
  accessibilityLabel = label,
  testID,
  onPress,
}: ChoiceChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, ...(disabled ? { disabled: true } : {}) }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[styles.root, selected && styles.selected, disabled && styles.disabled]}
    >
      <AppText tone={selected ? 'primary' : 'muted'} variant="label">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
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
  selected: { backgroundColor: SpringaColors.brandAction, borderColor: SpringaColors.brand },
  disabled: { opacity: 0.48 },
});
