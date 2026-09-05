import { Pressable, StyleSheet, View } from 'react-native';
import type { PlannerConfig } from '@/api/types';
import { AppText, Card } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';
import { plannerSummaryParts } from './plannerDraft';

type PlannerSummaryCardProps = {
  config: PlannerConfig;
  hasActivePlan: boolean;
  weeksToGo: number | null;
  onEdit?: () => void;
};

export function PlannerSummaryCard({
  config,
  hasActivePlan,
  weeksToGo,
  onEdit,
}: PlannerSummaryCardProps) {
  const parts = plannerSummaryParts(config, hasActivePlan, weeksToGo);
  return (
    <Card tone="subtle" accessibilityLabel="Current training plan">
      <View style={styles.row}>
        <View style={styles.parts}>
          {parts.map((part, index) => (
            <View key={part} style={styles.part}>
              {index > 0 ? <AppText tone="muted">·</AppText> : null}
              <AppText
                tone={index === parts.length - 1 && hasActivePlan ? 'success' : index === 2 ? 'brand' : 'primary'}
                variant={index === 2 ? 'subheading' : 'label'}
              >
                {part}
              </AppText>
            </View>
          ))}
        </View>
        {onEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit planner settings"
            hitSlop={8}
            onPress={onEdit}
            style={styles.edit}
          >
            <AppText tone="brand" variant="label">Edit</AppText>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.md },
  parts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.xs },
  part: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  edit: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: `${SpringaColors.brand}12`,
  },
});
