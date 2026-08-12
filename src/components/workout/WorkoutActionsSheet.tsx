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
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlannedWorkoutReplacementCategory } from '@/api/types';
import { HrZoneColors, SpringaColors } from '@/theme/colors';
import type { PlannedWorkoutActions } from './PlannedWorkoutSheet';
import { WorkoutActionsBottomSheet } from './WorkoutActionsBottomSheet';
import { availableReplacementCategories } from './workoutActions';

type SheetMode = 'actions' | 'replace' | 'delete';

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
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
        <Icon color={color} size={20} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionLabel, destructive && styles.destructive]}>
          {label}
        </Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <ChevronRight color={SpringaColors.muted} size={18} />
    </Pressable>
  );
}

export function WorkoutActionsSheet({ isPresented, onDismiss, actions, workoutName }: Props) {
  const [mode, setMode] = useState<SheetMode>('actions');

  const dismiss = () => {
    setMode('actions');
    onDismiss();
  };

  const dismissThen = (action: () => void) => {
    dismiss();
    action();
  };

  const choices = availableReplacementCategories(actions.currentReplacementCategory);

  return (
    <WorkoutActionsBottomSheet isPresented={isPresented} onDismiss={dismiss}>
      <View style={styles.sheet}>
        {mode === 'actions' ? (
          <>
            <Text style={styles.title}>Workout actions</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{workoutName}</Text>
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
                onPress={() => dismissThen(actions.move)}
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
            <Pressable
              onPress={() => setMode('actions')}
              accessibilityRole="button"
              accessibilityLabel="Back to workout actions"
              style={styles.back}
            >
              <ChevronLeft color={SpringaColors.muted} size={20} />
              <Text style={styles.backText}>Workout actions</Text>
            </Pressable>
            <Text style={styles.title}>Replace workout</Text>
            <Text style={styles.subtitle}>Choose a different workout</Text>
            <View style={styles.replacementGrid}>
              {choices.map((category) => {
                const choice = replacementChoices[category];
                const Icon = choice.icon;
                return (
                  <Pressable
                    key={category}
                    onPress={() => dismissThen(() => actions.replace(category))}
                    accessibilityRole="button"
                    accessibilityLabel={`Replace with ${choice.label}`}
                    style={({ pressed }) => [styles.replacementCard, pressed && styles.pressed]}
                  >
                    <Icon color={choice.color} size={22} />
                    <Text style={styles.replacementLabel}>{choice.label}</Text>
                    <Text style={styles.replacementDescription}>{choice.description}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Delete workout?</Text>
            <Text style={styles.subtitle}>This removes {workoutName} from your plan.</Text>
            <Pressable
              onPress={() => dismissThen(actions.deleteWorkout)}
              accessibilityRole="button"
              accessibilityLabel="Confirm delete workout"
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            >
              <Trash2 color={SpringaColors.text} size={20} />
              <Text style={styles.deleteButtonText}>Delete workout</Text>
            </Pressable>
          </>
        )}
      </View>
    </WorkoutActionsBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    backgroundColor: SpringaColors.surface,
  },
  title: {
    color: SpringaColors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: SpringaColors.muted,
    fontSize: 14,
    marginBottom: 4,
  },
  actionList: { gap: 8 },
  actionRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: SpringaColors.border,
    backgroundColor: SpringaColors.surfaceAlt,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 11,
  },
  actionCopy: { flex: 1, gap: 2 },
  actionLabel: { color: SpringaColors.text, fontSize: 16, fontWeight: '700' },
  actionDescription: { color: SpringaColors.muted, fontSize: 13 },
  destructive: { color: SpringaColors.error },
  back: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  backText: { color: SpringaColors.muted, fontSize: 14, fontWeight: '600' },
  replacementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  replacementCard: {
    minWidth: 132,
    flexBasis: 140,
    flexGrow: 1,
    minHeight: 112,
    gap: 7,
    padding: 12,
    borderRadius: 13,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: SpringaColors.border,
    backgroundColor: SpringaColors.surfaceAlt,
  },
  replacementLabel: { color: SpringaColors.text, fontSize: 16, fontWeight: '700' },
  replacementDescription: { color: SpringaColors.muted, fontSize: 12 },
  deleteButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: SpringaColors.error,
  },
  deleteButtonText: { color: SpringaColors.text, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
