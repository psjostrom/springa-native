import { useRef } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import type { ApiClient } from '@/api/client';
import type { CalendarEvent, CompletedWorkoutOverview } from '@/api/types';
import { queryKeys } from './keys';
import { applyWorkoutUpdates, beginWorkoutUpdate, usePendingWorkoutUpdates } from './usePendingWorkoutUpdates';

export const COMPLETED_OVERVIEW_STALE_TIME = 1000 * 60 * 60 * 24; // 24 hours

const PRE_RUN_CLEANUP_WARNING =
  'Pre-run saved, but the old fallback value could not be cleared.';

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

export function completedWorkoutOverviewQueryOptions(
  client: ApiClient,
  identity: string,
  activityId: string,
) {
  return {
    queryKey: queryKeys.completedWorkoutOverview(identity, activityId),
    queryFn: () => client.getCompletedWorkoutOverview(activityId),
    staleTime: COMPLETED_OVERVIEW_STALE_TIME,
  };
}

export function prefetchCompletedWorkoutOverview(
  queryClient: QueryClient,
  client: ApiClient,
  identity: string,
  activityId: string,
) {
  return queryClient.prefetchQuery(
    completedWorkoutOverviewQueryOptions(client, identity, activityId),
  );
}

export function useCompletedWorkoutOverview(activityId: string) {
  const client = useApiClient();
  const { status: authStatus, session } = useAuth();
  const identity = session?.email ?? '';
  const enabled = authStatus === 'signedIn' && session != null && activityId.length > 0;
  const query = useQuery({
    ...completedWorkoutOverviewQueryOptions(client, identity, activityId),
    enabled,
  });

  const pendingUpdates = usePendingWorkoutUpdates(identity);
  const data = pendingUpdates.reduce((current, update) => {
    if (current == null || update?.activityId !== activityId || update.patch?.preRunCarbsG === undefined) return current;
    return { ...current, preRunCarbs: nextPreRunState(current.preRunCarbs, update.patch.preRunCarbsG, true) };
  }, query.data);

  return {
    data: data ?? null,
    isEnabled: enabled,
    isLoading: enabled && query.isPending,
    isError: enabled && query.isError,
    error: query.error instanceof Error ? query.error.message : null,
    reload: () => query.refetch(),

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
                applyWorkoutUpdates(page, [{ eventId: event.id, activityId, patch }]),
              ),
            },
    );
  };

  return {
    saveCarbs: useMutation<{ ok: true }, Error, number>({
      mutationKey: queryKeys.updateWorkout(identity),
      networkMode: 'always',
      retry: false,
      onMutate: (carbsG) => beginWorkoutUpdate(queryClient, identity, { eventId: event.id, activityId, patch: { carbsIngested: carbsG } }),
      mutationFn: async (carbsG) => {
        if (carbsInFlight.current) {
          throw new Error('Save already in progress');
        }
        if (!activityId) {
          throw new Error('No activity selected');
        }
        carbsInFlight.current = true;
        try {
          return await client.updateActivityCarbs(activityId, carbsG);
        } finally {
          carbsInFlight.current = false;
        }
      },
      onSuccess: async (_result, carbsG) => {
        await queryClient.cancelQueries({ queryKey: calendarKey });
        patchCalendar({ carbsIngested: carbsG });
      },
    }),
    savePreRunCarbs: useMutation<
      { cleanupWarning: string | null },
      Error,
      number | null
    >({
      mutationKey: queryKeys.updateWorkout(identity),
      networkMode: 'always',
      retry: false,
      onMutate: (carbsG) => beginWorkoutUpdate(queryClient, identity, { eventId: event.id, activityId, patch: { preRunCarbsG: carbsG } }),
      mutationFn: async (carbsG) => {
        if (preRunInFlight.current) {
          throw new Error('Save already in progress');
        }
        if (!activityId) {
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
      onSuccess: async (result, carbsG) => {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: calendarKey }),
          queryClient.cancelQueries({ queryKey: overviewKey }),
        ]);
        const previous = queryClient.getQueryData<CompletedWorkoutOverview>(overviewKey)?.preRunCarbs;
        const preRunCarbs = nextPreRunState(previous ?? { grams: null, source: 'none', fallbackEventId: null }, carbsG, result.cleanupWarning == null);
        patchCalendar({ preRunCarbsG: preRunCarbs.grams });
        queryClient.setQueryData<CompletedWorkoutOverview>(
          overviewKey,
          (current) =>
            current == null
              ? current
              : {
                  ...current,
                  preRunCarbs,
                },
        );
      },
    }),
    saveFeedback: useMutation<
      { ok: true },
      Error,
      { rating: 'good' | 'bad'; comment: string }
    >({
      mutationKey: queryKeys.updateWorkout(identity),
      networkMode: 'always',
      retry: false,
      onMutate: ({ rating, comment }) => beginWorkoutUpdate(queryClient, identity, {
        eventId: event.id, activityId, patch: { rating, feedbackComment: comment },
      }),
      mutationFn: async ({ rating, comment }) => {
        if (feedbackInFlight.current) {
          throw new Error('Save already in progress');
        }
        if (!activityId) {
          throw new Error('No activity selected');
        }
        feedbackInFlight.current = true;
        try {
          return await client.saveRunFeedback(activityId, rating, comment);
        } finally {
          feedbackInFlight.current = false;
        }
      },
      onSuccess: async (_result, input) => {
        await queryClient.cancelQueries({ queryKey: calendarKey });
        patchCalendar({ rating: input.rating, feedbackComment: input.comment });
      },
    }),
  };
}
