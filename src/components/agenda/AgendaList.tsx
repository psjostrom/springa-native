import { LegendList } from '@legendapp/list/react-native';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CalendarEvent } from '@/api/types';
import { useCalendarEvents } from '@/query/useCalendarEvents';
import { SpringaColors } from '@/theme/colors';
import { AgendaEventCard } from './AgendaEventCard';
import { ViewModeSwitcher } from './ViewModeSwitcher';

export function AgendaList() {
  const {
    events,
    isLoading,
    isError,
    error,
    reload,
    fetchOlder,
    fetchNewer,
    isFetchingOlder,
    isFetchingNewer,
    olderError,
    newerError,
  } = useCalendarEvents();

  if (isLoading) {
    return (
      <View style={styles.center} accessibilityLabel="Loading calendar">
        <ActivityIndicator color={SpringaColors.brand} />
        <Text style={styles.muted}>Loading workouts…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Couldn’t load calendar</Text>
        <Text style={styles.body}>{error ?? 'Something went wrong.'}</Text>
        <Pressable
          onPress={reload}
          accessibilityRole="button"
          accessibilityLabel="Retry loading calendar"
          style={styles.button}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <LegendList
      style={styles.list}
      data={events}
      keyExtractor={(item: CalendarEvent) => item.id}
      recycleItems
      estimatedItemSize={96}
      onStartReached={() => {
        if (!isFetchingOlder) void fetchOlder();
      }}
      onStartReachedThreshold={0.2}
      onEndReached={() => {
        if (!isFetchingNewer) void fetchNewer();
      }}
      onEndReachedThreshold={0.2}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.switcherCard}>
            <ViewModeSwitcher />
          </View>
          {isFetchingOlder ? (
            <Text style={styles.edgeHint}>Loading earlier…</Text>
          ) : null}
          {olderError ? (
            <Pressable
              onPress={() => {
                void fetchOlder();
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading earlier workouts"
            >
              <Text style={styles.edgeError}>Couldn’t load more. Tap to retry.</Text>
            </Pressable>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>No workouts scheduled</Text>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {isFetchingNewer ? (
            <Text style={styles.edgeHint}>Loading more…</Text>
          ) : null}
          {newerError ? (
            <Pressable
              onPress={() => {
                void fetchNewer();
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading later workouts"
            >
              <Text style={styles.edgeError}>Couldn’t load more. Tap to retry.</Text>
            </Pressable>
          ) : null}
        </View>
      }
      renderItem={({ item }: { item: CalendarEvent }) => (
        <AgendaEventCard event={item} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  header: { gap: 6, marginBottom: 6 },
  switcherCard: {
    backgroundColor: SpringaColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    padding: 8,
  },
  footer: { paddingVertical: 8 },
  edgeHint: {
    textAlign: 'center',
    color: SpringaColors.muted,
    fontSize: 12,
    paddingVertical: 4,
  },
  edgeError: {
    textAlign: 'center',
    color: SpringaColors.error,
    fontSize: 12,
    paddingVertical: 4,
  },
  empty: {
    textAlign: 'center',
    color: SpringaColors.muted,
    fontSize: 14,
    paddingVertical: 28,
  },
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
