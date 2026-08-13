import {
  ChevronLeft,
  ChevronRight,
  Footprints,
  Move,
  Repeat2,
  Route,
  Trash2,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { PlannedWorkoutReplacementCategory } from '@/api/types';
import { AppText, Button, Card, IconButton } from '@/components/ui';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { HrZoneColors, SpringaColors } from '@/theme/colors';
import { IconSize, Radius, Spacing } from '@/theme/tokens';
import type { PlannedWorkoutActions } from './PlannedWorkoutSheet';

type SheetMode = 'actions' | 'replace' | 'delete';

type PendingAction =
  | { type: 'move' }
  | { type: 'replace'; category: PlannedWorkoutReplacementCategory }
  | { type: 'delete' };

type Props = {
  isPresented: boolean;
  onDismiss: () => void;
  actions: PlannedWorkoutActions;
  workoutName: string;
};

const replacementChoices: Record<
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

const replacementCategories: PlannedWorkoutReplacementCategory[] = [
  'easy',
  'quality',
  'long',
  'club',
];

function ActionRow({
  label,
  description,
  icon: Icon,
  color,
  destructive = false,
  onPress,
}: {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} workout`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card tone="subtle" style={styles.actionRow}>
        <View style={styles.icon}>
          <Icon color={color} size={IconSize.md} />
        </View>
        <View style={styles.actionCopy}>
          <AppText variant="subheading" tone={destructive ? 'error' : 'primary'}>
            {label}
          </AppText>
          <AppText variant="caption" tone="muted">{description}</AppText>
        </View>
        <ChevronRight color={SpringaColors.muted} size={IconSize.sm} />
      </Card>
    </Pressable>
  );
}

export function WorkoutActionsSheet({ isPresented, onDismiss, actions, workoutName }: Props) {
  const [mode, setMode] = useState<SheetMode>('actions');
  const pendingActionRef = useRef<PendingAction | null>(null);

  const dismissFor = (action: PendingAction) => {
    pendingActionRef.current = action;
    onDismiss();
  };

  const completeDismissal = () => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    setMode('actions');

    if (pendingAction?.type === 'move') actions.move();
    else if (pendingAction?.type === 'replace') actions.replace(pendingAction.category);
    else if (pendingAction?.type === 'delete') actions.deleteWorkout();
  };

  return (
    <AppBottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      onDismissComplete={completeDismissal}
    >
      <View style={styles.sheet}>
        {mode === 'actions' ? (
          <>
            <AppText variant="heading">Workout actions</AppText>
            <AppText variant="label" tone="muted" numberOfLines={2}>{workoutName}</AppText>
            <View style={styles.actionList}>
              <ActionRow
                label="Replace"
                description="Choose another workout"
                icon={Repeat2}
                color={SpringaColors.brand}
                onPress={() => setMode('replace')}
              />
              <ActionRow
                label="Move"
                description="Change date and time"
                icon={Move}
                color={SpringaColors.muted}
                onPress={() => dismissFor({ type: 'move' })}
              />
              <ActionRow
                label="Delete"
                description="Remove from your plan"
                icon={Trash2}
                color={SpringaColors.error}
                destructive
                onPress={() => setMode('delete')}
              />
            </View>
          </>
        ) : mode === 'replace' ? (
          <>
            <View style={styles.back}>
              <IconButton
                accessibilityLabel="Back to workout actions"
                onPress={() => setMode('actions')}
              >
                <ChevronLeft color={SpringaColors.muted} size={IconSize.md} />
              </IconButton>
              <AppText variant="label" tone="muted">Workout actions</AppText>
            </View>
            <AppText variant="heading">Replace workout</AppText>
            <AppText variant="label" tone="muted">Choose a different workout</AppText>
            <View style={styles.replacementGrid}>
              {replacementCategories.map((category) => {
                const choice = replacementChoices[category];
                const Icon = choice.icon;
                return (
                  <Pressable
                    key={category}
                    onPress={() => dismissFor({ type: 'replace', category })}
                    accessibilityRole="button"
                    accessibilityLabel={`Replace with ${choice.label}`}
                    style={({ pressed }) => [
                      styles.replacementChoice,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Card tone="subtle" style={styles.replacementCard}>
                      <Icon color={choice.color} size={IconSize.lg} />
                      <AppText variant="subheading">{choice.label}</AppText>
                      <AppText variant="caption" tone="muted">{choice.description}</AppText>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <AppText variant="heading">Delete workout?</AppText>
            <AppText variant="label" tone="muted">
              This removes {workoutName} from your plan.
            </AppText>
            <Button
              label="Delete workout"
              accessibilityLabel="Confirm delete workout"
              variant="destructive"
              onPress={() => dismissFor({ type: 'delete' })}
            />
          </>
        )}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: Spacing.sm,
  },
  actionList: { gap: Spacing.sm },
  actionRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    backgroundColor: SpringaColors.surface,
  },
  actionCopy: { flex: 1, gap: Spacing.xxs },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  replacementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  replacementChoice: {
    minWidth: 132,
    flexBasis: 140,
    flexGrow: 1,
  },
  replacementCard: {
    flex: 1,
    minHeight: 112,
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.72 },
});
