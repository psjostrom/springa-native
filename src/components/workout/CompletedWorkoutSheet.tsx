import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { CalendarEvent } from '@/api/types';
import { StateView } from '@/components/ui';
import {
  useCompletedWorkoutMutations,
  useCompletedWorkoutOverview,
} from '@/query/useCompletedWorkoutOverview';
import { Spacing } from '@/theme/tokens';
import { CompletedFeedback } from './completed/CompletedFeedback';
import { CompletedFueling } from './completed/CompletedFueling';
import { CompletedPaceSplits } from './completed/CompletedPaceSplits';
import { CompletedReportCard } from './completed/CompletedReportCard';
import { CompletedStats } from './completed/CompletedStats';

export function CompletedWorkoutSheet({
  event,
}: {
  event: CalendarEvent;
}): ReactElement {
  const { data, isEnabled, isLoading, isError, error, reload } =
    useCompletedWorkoutOverview(event.activityId ?? '');
  const mutations = useCompletedWorkoutMutations(event);

  const feedbackError = mutations.saveFeedback.isError
    ? (mutations.saveFeedback.error?.message ?? 'Failed to save feedback.')
    : null;

  return (
    <ScrollView
      style={styles.root}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityLabel="Completed workout details"
    >
      {data == null ? (
        <>
          <CompletedStats event={event} reportCard={null} />
          <View
            accessibilityLabel={
              isLoading
                ? 'Loading completed workout details'
                : 'Completed workout details'
            }
          >
            <StateView
              loading={isLoading}
              title={
                !isEnabled
                  ? 'Workout details unavailable'
                  : isLoading
                  ? 'Loading workout details…'
                  : 'Couldn’t load workout details'
              }
              message={
                !isEnabled
                  ? 'Workout details aren’t available in this state.'
                  : isLoading
                  ? 'Workout details will appear when ready.'
                  : (error ?? 'Something went wrong.')
              }
              retryAccessibilityLabel="Retry loading workout details"
              onRetry={isError ? reload : undefined}
            />
          </View>
        </>
      ) : (
        <>
          <CompletedReportCard reportCard={data.reportCard} />
          <CompletedStats event={event} reportCard={data.reportCard} />
          <CompletedPaceSplits splits={data.splits} />
          <CompletedFueling
            event={event}
            preRunCarbs={data.preRunCarbs}
            saveCarbs={async (carbsG) => {
              await mutations.saveCarbs.mutateAsync(carbsG);
            }}
            savePreRunCarbs={mutations.savePreRunCarbs.mutateAsync}
          />
          <CompletedFeedback
            event={event}
            saveFeedback={mutations.saveFeedback.mutate}
            pending={mutations.saveFeedback.isPending}
            error={feedbackError}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
});
