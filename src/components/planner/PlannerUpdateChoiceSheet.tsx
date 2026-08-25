import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { AppText, Button } from '@/components/ui';
import { Spacing } from '@/theme/tokens';
import { StyleSheet, View } from 'react-native';

type PlannerUpdateChoiceSheetProps = {
  isPresented: boolean;
  onDismiss: () => void;
  onKeep: () => void;
  onPreview: () => void;
};

export function PlannerUpdateChoiceSheet({
  isPresented,
  onDismiss,
  onKeep,
  onPreview,
}: PlannerUpdateChoiceSheetProps) {
  return (
    <AppBottomSheet isPresented={isPresented} onDismiss={onDismiss}>
      <View style={styles.content}>
        <AppText variant="heading">Update future workouts to match your new settings?</AppText>
        <AppText tone="muted">
          Your settings are already saved. Updating rewrites future planned workouts; keeping leaves them as they are.
        </AppText>
        <Button label="Preview update" onPress={onPreview} />
        <Button label="Keep workouts" variant="secondary" onPress={onKeep} />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({ content: { gap: Spacing.md } });
