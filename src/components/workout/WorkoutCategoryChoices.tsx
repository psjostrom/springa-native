import { Footprints, Route, Users, Zap, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import type { PlannedWorkoutReplacementCategory } from '@/api/types';
import { AppText, Badge, Card } from '@/components/ui';
import { HrZoneColors, SpringaColors } from '@/theme/colors';
import { IconSize, Spacing } from '@/theme/tokens';

const workoutCategoryChoices: Record<
  PlannedWorkoutReplacementCategory,
  { label: string; description: string; icon: LucideIcon; color: string }
> = {
  easy: {
    label: 'Easy',
    description: 'Keep it comfortable',
    icon: Footprints,
    color: HrZoneColors[2],
  },
  quality: {
    label: 'Quality',
    description: 'Keep some intensity',
    icon: Zap,
    color: HrZoneColors[4],
  },
  long: {
    label: 'Long',
    description: 'Build endurance',
    icon: Route,
    color: HrZoneColors[3],
  },
  club: {
    label: 'Club Run',
    description: 'Run with others',
    icon: Users,
    color: SpringaColors.brand,
  },
};

const categories: PlannedWorkoutReplacementCategory[] = [
  'easy',
  'quality',
  'long',
  'club',
];

export function WorkoutCategoryChoices({
  onSelect, suggested, disabled = false, action,
}: {
  onSelect: (category: PlannedWorkoutReplacementCategory) => void;
  suggested?: PlannedWorkoutReplacementCategory;
  disabled?: boolean;
  action: 'Create' | 'Replace with';
}) {
  return (
    <View style={styles.grid}>
      {categories.map((category) => {
        const choice = workoutCategoryChoices[category];
        const Icon = choice.icon;
        const isSuggested = category === suggested;
        return (
          <Pressable
            key={category}
            disabled={disabled}
            onPress={() => onSelect(category)}
            accessibilityRole="button"
            accessibilityLabel={`${action} ${choice.label}${action === 'Create' ? ' workout' : ''}`}
            accessibilityHint={isSuggested ? `${choice.description}. Suggested for this day.` : choice.description}
            accessibilityState={{ disabled }}
            style={({ pressed }) => [styles.choice, (pressed || disabled) && styles.dimmed]}
          >
            <Card tone={isSuggested ? 'brand' : 'subtle'} style={styles.card}>
              <Icon color={choice.color} size={IconSize.lg} />
              <AppText variant="subheading">{choice.label}</AppText>
              <AppText variant="caption" tone="muted">{choice.description}</AppText>
              {isSuggested ? <Badge label="Suggested" tone="brand" /> : null}
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  choice: { minWidth: 132, flexBasis: 140, flexGrow: 1 },
  card: { flex: 1, minHeight: 112, gap: Spacing.sm },
  dimmed: { opacity: 0.48 },
});
