import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSettingsQuery } from '@/query/useSettingsQuery';
import { SpringaColors } from '@/theme/colors';

type AgendaGateProps = {
  children: ReactNode;
};

/**
 * Blocks Agenda only when settings prove Intervals is disconnected (or fail).
 * While settings are still loading, children render so calendar can fetch in parallel.
 */
export function AgendaGate({ children }: AgendaGateProps) {
  const { status, settings, error, reload } = useSettingsQuery();

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

  if (status === 'ready' && !settings?.intervalsConnected) {
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

  // idle (signed out), loading, or ready+connected → let Agenda mount
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
