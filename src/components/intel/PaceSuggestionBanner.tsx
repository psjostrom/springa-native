import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card } from '@/components/ui';
import type { PaceSuggestion } from '@/api/types';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';

type Props = {
  suggestion: PaceSuggestion | null;
  onAccept?: () => void;
  onDismiss?: () => void;
  isAccepting?: boolean;
  isDismissing?: boolean;
};

export function PaceSuggestionBanner({
  suggestion,
  onAccept,
  onDismiss,
  isAccepting,
  isDismissing,
}: Props) {
  if (!suggestion) return null;

  return (
    <Card tone="brand" style={styles.card}>
      <AppText variant="subheading" style={styles.title}>
        Pace update available
      </AppText>
      <AppText variant="body" tone="muted" style={styles.message}>
        {suggestion.message}
      </AppText>

      <View style={styles.actions}>
        <Button
          label="Update paces"
          onPress={onAccept}
          loading={isAccepting}
          variant="primary"
        />
        {onDismiss && (
          <Button
            label="Not now"
            onPress={onDismiss}
            loading={isDismissing}
            variant="secondary"
          />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SpringaColors.tintBrand,
    borderColor: SpringaColors.brand,
    gap: Spacing.sm,
  },
  title: {
    color: SpringaColors.brandText,
  },
  message: {
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
