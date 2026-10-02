import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

type Props<T extends string> = {
  windows: readonly { label: string; value: T }[];
  selected: T;
  onChange: (value: T) => void;
};

export function TimeWindowChips<T extends string>({
  windows,
  selected,
  onChange,
}: Props<T>) {
  return (
    <View style={styles.container}>
      {windows.map((w) => {
        const isSelected = selected === w.value;
        return (
          <Pressable
            key={w.value}
            accessibilityRole="button"
            accessibilityLabel={`Time window ${w.label}`}
            accessibilityState={{ selected: isSelected }}
            hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
            onPress={() => onChange(w.value)}
            style={[
              styles.chip,
              isSelected && { backgroundColor: SpringaColors.brand },
            ]}
          >
            <AppText
              variant="caption"
              style={[
                styles.chipText,
                isSelected && { color: SpringaColors.text, fontWeight: '700' },
              ]}
            >
              {w.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.xxs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    minHeight: 24,
    borderRadius: Radius.pill,
    backgroundColor: SpringaColors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    color: SpringaColors.muted,
    fontSize: 11,
  },
});
