import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { AppText } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';

/**
 * Dev-only deep link target: springa://qa-login?token=…
 * Exchanges the Springa QA token for a mobile Bearer session.
 */
export default function QaLoginScreen() {
  const { signInWithQaToken, status } = useAuth();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  const raw = params.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const missingToken = !token;

  useEffect(() => {
    if (!__DEV__) return;
    if (status === 'loading') return;
    if (status !== 'signedOut') return;
    if (!token) return;

    let cancelled = false;
    void (async () => {
      try {
        await signInWithQaToken(token);
      } catch (err) {
        if (cancelled) return;
        setExchangeError(
          err instanceof Error ? err.message : 'QA sign-in failed',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signInWithQaToken, status, token]);

  if (!__DEV__) {
    return <Redirect href="/login" />;
  }

  if (status === 'signedIn') {
    return <Redirect href="/" />;
  }

  const error = missingToken ? 'Missing QA token' : exchangeError;

  return (
    <View style={styles.screen} accessibilityLabel="QA sign-in">
      {error ? (
        <AppText variant="label" tone="error" style={styles.message}>
          {error}
        </AppText>
      ) : (
        <>
          <ActivityIndicator color={SpringaColors.brandText} />
          <AppText variant="label" tone="muted">Signing in…</AppText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SpringaColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  message: {
    textAlign: 'center',
  },
});
