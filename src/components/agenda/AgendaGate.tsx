import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSettings } from '@/api/SettingsContext';
import { SpringaColors } from '@/theme/colors';

type AgendaGateProps = {
  children: ReactNode;
};

export function AgendaGate({ children }: AgendaGateProps) {
  const { status, settings, error, reload } = useSettings();

  if (status === 'loading' || status === 'idle') {
    return (
      <View style={styles.center} accessibilityLabel="Loading settings">
        <ActivityIndicator color={SpringaColors.brand} />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Couldn’t load settings</Text>
        <Text style={styles.body}>{error ?? 'Something went wrong.'}</Text>
        <Pressable
          onPress={reload}
          accessibilityRole="button"
          accessibilityLabel="Retry loading settings"
          style={styles.button}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!settings?.intervalsConnected) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Intervals not connected</Text>
        <Text style={styles.body}>
          Connect Intervals.icu in Springa on the web, then retry here.
        </Text>
        <Pressable
          onPress={reload}
          accessibilityRole="button"
          accessibilityLabel="Retry loading settings"
          style={styles.button}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    color: SpringaColors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: SpringaColors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  muted: {
    color: SpringaColors.muted,
    fontSize: 13,
  },
  button: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: SpringaColors.tintBrand,
    borderWidth: 1,
    borderColor: SpringaColors.border,
  },
  buttonText: {
    color: SpringaColors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
});
