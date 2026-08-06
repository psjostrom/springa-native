import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthContext';
import { SpringaMark } from '@/components/shell/SpringaMark';
import { SpringaColors } from '@/theme/colors';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <Text style={styles.wordmark}>springa</Text>
      </View>

      <View style={styles.footer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          onPress={() => {
            void onContinue();
          }}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          style={({ pressed }) => [
            styles.button,
            (pressed || busy) && styles.buttonPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={SpringaColors.text} />
          ) : (
            <Text style={styles.buttonLabel}>Continue with Google</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SpringaColors.bg,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  brand: {
    alignItems: 'center',
    gap: 12,
    marginTop: 64,
  },
  wordmark: {
    color: SpringaColors.brand,
    fontSize: 36,
    fontWeight: '800',
    includeFontPadding: false,
  },
  footer: {
    gap: 12,
  },
  error: {
    color: SpringaColors.error,
    textAlign: 'center',
    fontSize: 14,
  },
  button: {
    backgroundColor: SpringaColors.brand,
    borderRadius: 12,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: SpringaColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
