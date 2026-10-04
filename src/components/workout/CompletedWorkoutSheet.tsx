import { type ReactElement, useCallback, useState } from 'react';
import {
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { CalendarEvent } from '@/api/types';
import { StateView } from '@/components/ui';
import {
  useCompletedWorkoutMutations,
  useCompletedWorkoutOverview,
} from '@/query/useCompletedWorkoutOverview';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';
import { CompletedFeedback } from './completed/CompletedFeedback';
import { CompletedFueling } from './completed/CompletedFueling';
import { CompletedPaceSplits } from './completed/CompletedPaceSplits';
import { CompletedReportCard } from './completed/CompletedReportCard';
import { CompletedPerformance, CompletedSummary } from './completed/CompletedStats';

export function CompletedWorkoutSheet({
  event,
}: {
  event: CalendarEvent;
}): ReactElement {
  const { data, isEnabled, isLoading, isError, reload } =
    useCompletedWorkoutOverview(event.activityId ?? '');
  const mutations = useCompletedWorkoutMutations(event);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await reload();
    } finally {
      setIsRefreshing(false);
    }
  }, [reload]);

  return (
    <KeyboardAwareScrollView
      testID="completed-workout-keyboard"
      bottomOffset={Spacing.xl}
      style={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityLabel="Completed workout details"
      refreshControl={
        <RefreshControl
          testID="completed-workout-refresh-control"
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={SpringaColors.brand}
          colors={[SpringaColors.brand]}
        />
      }
    >
      {data == null ? (
        <>
          <CompletedSummary event={event} />
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
              retryAccessibilityLabel="Retry loading workout details"
              onRetry={isError ? reload : undefined}
            />
          </View>
        </>
      ) : (
        <>
          <CompletedSummary event={event} />
          <CompletedReportCard reportCard={data.reportCard} />
          <CompletedPerformance event={event} reportCard={data.reportCard} />
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
            protocol={data?.protocol}
            feel={data?.feel ?? event.feel}
            rpe={data?.rpe ?? event.rpe}
          />
        </>
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
});
