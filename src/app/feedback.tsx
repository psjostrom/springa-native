import { useContext } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { AppText, Button, StateView } from '@/components/ui';
import {
  useCompletedWorkoutMutations,
  useCompletedWorkoutOverview,
} from '@/query/useCompletedWorkoutOverview';
import { useCalendarEvents } from '@/query/useCalendarEvents';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';

export default function FeedbackScreen() {
  const router = useRouter();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const { activityId, eventId } = useLocalSearchParams<{
    activityId?: string;
    eventId?: string;
  }>();

  const { events, isLoading: eventsLoading } = useCalendarEvents();
  const event = events.find(
    (e) =>
      (activityId && e.activityId === activityId) ||
      (eventId && e.id === eventId) ||
      (activityId && e.id === activityId),
  );

  const {
    data: overview,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
  } = useCompletedWorkoutOverview(event?.activityId ?? '');

  const mutations = useCompletedWorkoutMutations(event);

  const isUnrated = !overview?.protocol;
  const isWaitingForOverview =
    (eventsLoading && !event) ||
    (overviewLoading && !overview) ||
    (isUnrated && !overview?.lastProtocols && overviewFetching);

  if (isWaitingForOverview) {
    return (
      <View style={styles.center}>
        <StateView loading title="Loading run details…" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <AppText variant="subheading" tone="primary">
          Run not found
        </AppText>
        <AppText variant="body" tone="muted" style={styles.notFoundMessage}>
          This workout is no longer available or could not be loaded.
        </AppText>
        <Button label="Go back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
      style={styles.keyboardRoot}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FeedbackForm
          key={
            overview?.protocol
              ? `protocol-${overview.activityId}-${overview.protocol.updatedAt ?? 'static'}`
              : overview
                ? `loaded-${overview.activityId}-${overview.lastProtocols ? Object.keys(overview.lastProtocols).sort().join('-') : 'none'}`
                : 'pending'
          }
          event={event}
          protocol={overview?.protocol}
          lastProtocols={overview?.lastProtocols}
          feel={overview?.feel ?? event.feel}
          rpe={overview?.rpe ?? event.rpe}
          saveFeedback={async (input) => {
            await mutations.saveFeedback.mutateAsync(input);
          }}
          pending={mutations.saveFeedback.isPending}
          error={mutations.saveFeedback.error?.message}
          onDone={() => {
            if (router.canGoBack()) router.back();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    backgroundColor: SpringaColors.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: SpringaColors.bg,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  center: {
    flex: 1,
    backgroundColor: SpringaColors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  notFoundMessage: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
});
