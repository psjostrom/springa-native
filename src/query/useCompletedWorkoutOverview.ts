import { useRef } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import type { CalendarEvent, CompletedWorkoutOverview } from '@/api/types';
import { queryKeys } from './keys';

const OVERVIEW_STALE_TIME = 60_000;

const PRE_RUN_CLEANUP_WARNING =
  'Pre-run saved, but the old fallback value could not be cleared.';

function matchesSelectedActivity(
  event: CalendarEvent,
  selected: CalendarEvent,
): boolean {
  return (
    event.id === selected.id ||
    (selected.activityId != null && event.activityId === selected.activityId)
  );
}

function nextPreRunState(
  current: CompletedWorkoutOverview['preRunCarbs'],
  carbsG: number | null,
  cleanupSucceeded: boolean,
): CompletedWorkoutOverview['preRunCarbs'] {
  if (carbsG != null) {
    return { grams: carbsG, source: 'activity', fallbackEventId: null };
  }
  if (!cleanupSucceeded && current.source === 'paired-event') {
    return current;
  }
  return { grams: null, source: 'none', fallbackEventId: null };
}

export function useCompletedWorkoutOverview(activityId: string) {
  const client = useApiClient();
  const { status: authStatus, session } = useAuth();
  const identity = session?.email ?? '';
  const enabled = authStatus === 'signedIn' && session != null && activityId.length > 0;
  const query = useQuery({
    queryKey: queryKeys.completedWorkoutOverview(identity, activityId),
    queryFn: () => client.getCompletedWorkoutOverview(activityId),
    staleTime: OVERVIEW_STALE_TIME,
    enabled,
  });

  return {
    data: query.data ?? null,
    isEnabled: enabled,
    isLoading: enabled && query.isPending,
    isError: enabled && query.isError,
    error: query.error instanceof Error ? query.error.message : null,
    reload: () => {
      void query.refetch();
    },
  };
}

export function useCompletedWorkoutMutations(event: CalendarEvent): {
  saveCarbs: UseMutationResult<{ ok: true }, Error, number>;
  savePreRunCarbs: UseMutationResult<
    { cleanupWarning: string | null },
    Error,
    number | null
  >;
  saveFeedback: UseMutationResult<
    { ok: true },
    Error,
    { rating: 'good' | 'bad'; comment: string }
  >;
} {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const identity = session?.email ?? '';
  const activityId = event.activityId;
  const calendarKey = queryKeys.calendar(identity);
  const overviewKey = queryKeys.completedWorkoutOverview(identity, activityId ?? '');
  const carbsInFlight = useRef(false);
  const preRunInFlight = useRef(false);
  const feedbackInFlight = useRef(false);

  const patchCalendar = (
    patch: Partial<
      Pick<
        CalendarEvent,
        'carbsIngested' | 'preRunCarbsG' | 'rating' | 'feedbackComment'
      >
    >,
  ) => {
    queryClient.setQueriesData<InfiniteData<CalendarEvent[]>>(
      { queryKey: calendarKey },
      (current) =>
        current == null
          ? current
          : {
              ...current,
              pages: current.pages.map((page) =>
                page.map((candidate) =>
                  matchesSelectedActivity(candidate, event)
                    ? { ...candidate, ...patch }
                    : candidate,
                ),
              ),
            },
    );
  };

  return {
    saveCarbs: useMutation<{ ok: true }, Error, number>({
      mutationFn: async (carbsG) => {
        if (carbsInFlight.current) {
          throw new Error('Save already in progress');
        }
        if (activityId == null) {
          throw new Error('No activity selected');
        }
        carbsInFlight.current = true;
        try {
          return await client.updateActivityCarbs(activityId, carbsG);
        } finally {
          carbsInFlight.current = false;
        }
      },
      onSuccess: (_result, carbsG) => {
        patchCalendar({ carbsIngested: carbsG });
      },
    }),
    savePreRunCarbs: useMutation<
      { cleanupWarning: string | null },
      Error,
      number | null
    >({
      mutationFn: async (carbsG) => {
        if (preRunInFlight.current) {
          throw new Error('Save already in progress');
        }
        if (activityId == null) {
          throw new Error('No activity selected');
        }
        preRunInFlight.current = true;
        try {
          await client.updateActivityPreRunCarbs(activityId, carbsG);
          const overview =
            queryClient.getQueryData<CompletedWorkoutOverview>(overviewKey);
          const fallbackEventId =
            overview?.preRunCarbs.source === 'paired-event'
              ? overview.preRunCarbs.fallbackEventId
              : null;
          if (fallbackEventId != null) {
            try {
              await client.deletePreRunCarbs(fallbackEventId);
            } catch {
              return { cleanupWarning: PRE_RUN_CLEANUP_WARNING };
            }
          }
          return { cleanupWarning: null };
        } finally {
          preRunInFlight.current = false;
        }
      },
      onSuccess: (result, carbsG) => {
        patchCalendar({ preRunCarbsG: carbsG });
        queryClient.setQueryData<CompletedWorkoutOverview>(
          overviewKey,
          (current) =>
            current == null
              ? current
              : {
                  ...current,
                  preRunCarbs: nextPreRunState(
                    current.preRunCarbs,
                    carbsG,
                    result.cleanupWarning == null,
                  ),
                },
        );
      },
    }),
    saveFeedback: useMutation<
      { ok: true },
      Error,
      { rating: 'good' | 'bad'; comment: string }
    >({
      mutationFn: async ({ rating, comment }) => {
        if (feedbackInFlight.current) {
          throw new Error('Save already in progress');
        }
        if (activityId == null) {
          throw new Error('No activity selected');
        }
        feedbackInFlight.current = true;
        try {
          return await client.saveRunFeedback(activityId, rating, comment);
        } finally {
          feedbackInFlight.current = false;
        }
      },
      onSuccess: (_result, input) => {
        patchCalendar({ rating: input.rating, feedbackComment: input.comment });
      },
    }),
  };
}
