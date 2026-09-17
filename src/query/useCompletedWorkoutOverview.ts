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
import type { CalendarEvent, CompletedWorkoutOverview, WorkoutProtocol } from '@/api/types';
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
    {
      rating?: 'good' | 'bad' | 'skipped' | string | null;
      comment?: string | null;
      protocol?: WorkoutProtocol | null;
      carbsG?: number | null;
      preRunCarbsG?: number | null;
    }
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
      {
        feel?: number | null;
        rpe?: number | null;
        rating?: 'good' | 'bad' | 'skipped' | string | null;
        comment?: string | null;
        protocol?: WorkoutProtocol | null;
        carbsG?: number | null;
        preRunCarbsG?: number | null;
      }
    >({
      mutationKey: queryKeys.updateWorkout(identity),
      networkMode: 'always',
      retry: false,
      onMutate: ({ feel, rpe, rating, comment, protocol, carbsG, preRunCarbsG }) => {
        const patch: Partial<
          Pick<
            CalendarEvent,
            'feel' | 'rpe' | 'rating' | 'feedbackComment' | 'preRunCarbsG' | 'carbsIngested'
          >
        > = {};
        if (feel !== undefined) patch.feel = feel;
        if (rpe !== undefined) patch.rpe = rpe;
        if (rating !== undefined) patch.rating = rating;
        const note = comment ?? protocol?.note;
        if (note !== undefined) patch.feedbackComment = note;
        if (preRunCarbsG !== undefined) {
          patch.preRunCarbsG = preRunCarbsG;
        } else if (protocol?.preRunCarbsG !== undefined) {
          patch.preRunCarbsG = protocol.preRunCarbsG;
        }
        if (carbsG !== undefined) {
          patch.carbsIngested = carbsG;
        }
        return beginWorkoutUpdate(queryClient, identity, {
          eventId: event.id,
          activityId,
          patch,
        });
      },
      mutationFn: async (input) => {
        if (feedbackInFlight.current) {
          throw new Error('Save already in progress');
        }
        if (!activityId) {
          throw new Error('No activity selected');
        }
        feedbackInFlight.current = true;
        try {
          return await client.saveRunFeedback(activityId, input);
        } finally {
          feedbackInFlight.current = false;
        }
      },
      onSuccess: async (_result, input) => {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: calendarKey }),
          queryClient.cancelQueries({ queryKey: overviewKey }),
        ]);
        const calendarPatch: Partial<
          Pick<
            CalendarEvent,
            'feel' | 'rpe' | 'rating' | 'feedbackComment' | 'preRunCarbsG' | 'carbsIngested'
          >
        > = {};
        if (input.feel !== undefined) calendarPatch.feel = input.feel;
        if (input.rpe !== undefined) calendarPatch.rpe = input.rpe;
        if (input.rating !== undefined) calendarPatch.rating = input.rating;
        const note = input.comment ?? input.protocol?.note;
        if (note !== undefined) calendarPatch.feedbackComment = note;
        if (input.preRunCarbsG !== undefined) {
          calendarPatch.preRunCarbsG = input.preRunCarbsG;
        } else if (input.protocol?.preRunCarbsG !== undefined) {
          calendarPatch.preRunCarbsG = input.protocol.preRunCarbsG;
        }
        if (input.carbsG !== undefined) {
          calendarPatch.carbsIngested = input.carbsG;
        }
        patchCalendar(calendarPatch);
        const resolvedPreRunCarbsG = input.preRunCarbsG ?? input.protocol?.preRunCarbsG;
        if (input.protocol || resolvedPreRunCarbsG !== undefined || input.feel !== undefined) {
          queryClient.setQueryData<CompletedWorkoutOverview>(
            overviewKey,
            (current) =>
              current == null
                ? current
                : {
                    ...current,
                    feel: input.feel !== undefined ? input.feel : current.feel,
                    rpe: input.rpe !== undefined ? input.rpe : current.rpe,
                    protocol: input.protocol ?? current.protocol,
                    preRunCarbs:
                      resolvedPreRunCarbsG !== undefined
                        ? {
                            grams: resolvedPreRunCarbsG,
                            source: 'activity',
                            fallbackEventId: null,
                          }
                        : current.preRunCarbs,
                  },
          );
        }
      },
    }),
  };
}
