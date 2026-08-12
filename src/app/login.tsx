import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthContext';
import { SpringaMark } from '@/components/shell/SpringaMark';
import { AppText, Button } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, configError } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayError = error ?? configError;

  const onContinue = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Sign-in failed. Try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={styles.brand}>
        <SpringaMark size={48} />
        <AppText variant="title" tone="brand" style={styles.wordmark}>
          springa
        </AppText>
      </View>

      <View style={styles.footer}>
        {displayError ? (
          <AppText variant="label" tone="error" style={styles.error}>
            {displayError}
          </AppText>
        ) : null}
        <Button
          label="Continue with Google"
          onPress={() => {
            void onContinue();
          }}
          loading={busy}
          accessibilityLabel="Continue with Google"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SpringaColors.bg,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 64,
  },
  wordmark: {
    fontSize: 36,
    includeFontPadding: false,
  },
  footer: {
    gap: Spacing.md,
  },
  error: {
    textAlign: 'center',
  },
});
