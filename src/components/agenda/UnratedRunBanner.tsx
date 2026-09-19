import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { CalendarEvent } from '@/api/types';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import { findUnratedRun, getNextUnratedRunBoundary, type UnratedRun } from '@/domain/unratedRun';
import { useCalendarEvents } from '@/query/useCalendarEvents';
import {
  prefetchCompletedWorkoutOverview,
  useCompletedWorkoutMutations,
} from '@/query/useCompletedWorkoutOverview';
import { AppText } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

function UnratedRunBannerContent({
  unrated,
  event,
}: {
  unrated: UnratedRun;
  event: CalendarEvent;
}) {
  const router = useRouter();
  const { saveFeedback } = useCompletedWorkoutMutations(event);

  const handleSkip = () => {
    saveFeedback.mutate({ status: 'skipped', rating: 'skipped' });
  };

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`${unrated.name} is unrated`}
      testID="unrated-run-banner"
      style={styles.container}
    >
      <View style={styles.textWrapper}>
        <AppText variant="label" tone="primary" numberOfLines={1}>
          {unrated.name}
          <AppText variant="caption" tone="muted">
            {' '}
            — unrated
          </AppText>
        </AppText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Rate ${unrated.name}`}
        testID="rate-run-button"
        onPress={() => {
          router.push({
            pathname: '/feedback',
            params: { activityId: unrated.activityId, eventId: unrated.eventId },
          });
        }}
        style={styles.rateButton}
      >
        <AppText variant="label" style={styles.rateButtonText}>
          Rate
        </AppText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Skip rating ${unrated.name}`}
        testID="dismiss-unrated-banner"
        onPress={handleSkip}
        style={styles.dismissButton}
        hitSlop={8}
      >
        <X size={16} color={SpringaColors.muted} />
      </Pressable>
    </View>
  );
}

export function UnratedRunBanner() {
  const { events } = useCalendarEvents();
  const [now, setNow] = useState(() => Date.now());
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const { session } = useAuth();
  const sessionEmail = session?.email;

  const unrated = findUnratedRun(events, now);

  useEffect(() => {
    if (unrated?.activityId && sessionEmail) {
      void prefetchCompletedWorkoutOverview(
        queryClient,
        apiClient,
        sessionEmail,
        unrated.activityId,
      ).catch(() => {});
    }
  }, [unrated?.activityId, sessionEmail, queryClient, apiClient]);

  useEffect(() => {
    const nextBoundary = getNextUnratedRunBoundary(events, now);
    if (nextBoundary == null) return;

    const timeoutId = setTimeout(() => {
      setNow(Date.now());
    }, Math.max(0, nextBoundary - now));

    return () => {
      clearTimeout(timeoutId);
    };
  }, [events, now]);

  if (!unrated) return null;

  const event = events.find((e) => e.activityId === unrated.activityId);
  if (!event) return null;

  return <UnratedRunBannerContent key={unrated.activityId} unrated={unrated} event={event} />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SpringaColors.surface,
    borderColor: SpringaColors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  textWrapper: {
    flex: 1,
  },
  rateButton: {
    backgroundColor: SpringaColors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateButtonText: {
    color: SpringaColors.bg,
    fontWeight: '700',
  },
  dismissButton: {
    padding: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
