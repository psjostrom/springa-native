import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

export type StateViewState = 'loading' | 'empty' | 'unavailable' | 'error';

export type StateViewProps = {
  state: StateViewState;
  title: string;
  message: string;
  retryLabel?: string;
  retryAccessibilityLabel?: string;
  onRetry?: () => void;
};

export function StateView({
  state,
  title,
  message,
  retryLabel = 'Retry',
  retryAccessibilityLabel,
  onRetry,
}: StateViewProps) {
  return (
    <View style={styles.state}>
      {state === 'loading' ? <ActivityIndicator color={SpringaColors.brandText} /> : null}
      <AppText variant="subheading">{title}</AppText>
      <AppText tone="muted" style={styles.message}>{message}</AppText>
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
