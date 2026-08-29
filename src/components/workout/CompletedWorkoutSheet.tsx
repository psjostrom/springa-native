import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
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
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetY = useRef(0);
  const pendingEditorTarget = useRef<TextInput | null>(null);

  const scrollToEditor = useCallback((target: TextInput, keyboardY: number) => {
    target.measureInWindow((_x, y, _width, height) => {
      const overlap = y + height + Spacing.lg - keyboardY;
      if (overlap <= 0) return;
      scrollRef.current?.scrollTo({
        y: scrollOffsetY.current + overlap,
        animated: true,
      });
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = Keyboard.addListener('keyboardDidShow', (keyboardEvent) => {
      const target = pendingEditorTarget.current;
      if (target == null) return;
      pendingEditorTarget.current = null;
      requestAnimationFrame(() => {
        scrollToEditor(target, keyboardEvent.endCoordinates.screenY);
      });
    });
    return () => subscription.remove();
  }, [scrollToEditor]);

  const scrollEditorAboveKeyboard = useCallback((target: TextInput) => {
    if (Platform.OS !== 'android') return;
    const keyboardY = Keyboard.metrics()?.screenY;
    if (Keyboard.isVisible() && keyboardY != null) {
      scrollToEditor(target, keyboardY);
      return;
    }
    pendingEditorTarget.current = target;
  }, [scrollToEditor]);

  const feedbackError = mutations.saveFeedback.isError
    ? (mutations.saveFeedback.error?.message ?? 'Failed to save feedback.')
    : null;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    const refreshStart = Date.now();
    console.log(
      `[COMPLETED] Pull-to-refresh triggered for activity ${event.activityId ?? ''}`,
    );
    setIsRefreshing(true);
    try {
      await reload();
      console.log(
        `[COMPLETED] Pull-to-refresh finished in ${Date.now() - refreshStart}ms`,
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [event.activityId, reload]);

  return (
    <KeyboardAvoidingView
      testID="completed-workout-keyboard"
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScroll={(scrollEvent) => {
          scrollOffsetY.current = scrollEvent.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        scrollsChildToFocus={Platform.OS === 'android' ? false : undefined}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        accessibilityLabel="Completed workout details"
        refreshControl={
          <RefreshControl
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
              onInputFocus={scrollEditorAboveKeyboard}
            />
            <CompletedFeedback
              event={event}
              saveFeedback={mutations.saveFeedback.mutate}
              pending={mutations.saveFeedback.isPending}
              error={feedbackError}
              onInputFocus={scrollEditorAboveKeyboard}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
});
