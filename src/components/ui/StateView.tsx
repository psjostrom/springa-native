import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

export type StateViewProps = {
  loading?: boolean;
  title: string;
  message?: string;
  retryLabel?: string;
  retryAccessibilityLabel?: string;
  onRetry?: () => void;
};

export function StateView({
  loading = false,
  title,
  message,
  retryLabel = 'Retry',
  retryAccessibilityLabel,
  onRetry,
}: StateViewProps) {
  return (
    <View style={styles.state}>
      {loading ? <ActivityIndicator color={SpringaColors.brandText} /> : null}
      <AppText variant="subheading">{title}</AppText>
      {message ? <AppText tone="muted" style={styles.message}>{message}</AppText> : null}
      {onRetry ? (
        <Button
          label={retryLabel}
          accessibilityLabel={retryAccessibilityLabel}
          variant="secondary"
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  state: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl },
  message: { textAlign: 'center' },
});
