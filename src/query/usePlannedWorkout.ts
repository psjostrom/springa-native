import {
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useRef } from 'react';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import type { ApiClient } from '@/api/client';
import type {
  CalendarEvent,
  EffortMetric,
  PlannedWorkoutDetail,
  PlannedWorkoutReplacementCategory,
} from '@/api/types';
import { queryKeys } from './keys';

export const PLANNED_WORKOUT_STALE_TIME = 1000 * 60 * 5; // 5 minutes

function replaceCalendarEvent(
  event: CalendarEvent,
  detail: PlannedWorkoutDetail,
  originalEventId = detail.event.id,
): CalendarEvent {
  if (event.id !== originalEventId) return event;
  return {
    ...event,
    id: detail.event.id,
    date: new Date(detail.event.startDateLocal),
    name: detail.event.name,
    description: detail.event.description,
    category: detail.event.category,
    duration: detail.metrics.duration == null
      ? undefined
      : detail.metrics.duration.minutes * 60,
    distance: detail.metrics.distance == null
      ? undefined
      : detail.metrics.distance.km * 1000,
    fuelRate: detail.metrics.fuelRateGPerHour,
    prescribedCarbsG: detail.metrics.prescribedCarbsG,
    preRunCarbsG: detail.preRunCarbsG,
  };
}

export function plannedWorkoutQueryOptions(
  client: ApiClient,
  identity: string,
  eventId: string,
) {
  return {
    queryKey: queryKeys.plannedWorkout(identity, eventId),
    queryFn: () => client.getPlannedWorkoutDetail(eventId),
    staleTime: PLANNED_WORKOUT_STALE_TIME,
  };
}

export function prefetchPlannedWorkoutDetail(
  queryClient: QueryClient,
  client: ApiClient,
  identity: string,
  eventId: string,
) {
  return queryClient.prefetchQuery(plannedWorkoutQueryOptions(client, identity, eventId));
}

export function usePlannedWorkoutDetail(eventId: string) {
  const client = useApiClient();
  const { status: authStatus, session } = useAuth();
  const identity = session?.email ?? '';
  const enabled = authStatus === 'signedIn' && session != null && eventId.length > 0;
  const query = useQuery({
    ...plannedWorkoutQueryOptions(client, identity, eventId),
    enabled,
  });

  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    isError: enabled && query.isError,
    isDisabled: !enabled,
    error: query.error instanceof Error ? query.error.message : null,
    reload: () => query.refetch(),

  };
}

export function usePlannedWorkoutMutations(eventId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const identity = session?.email ?? '';

  const plannedWorkoutKey = queryKeys.plannedWorkout(identity, eventId);
  const calendarKey = queryKeys.calendar(identity);
  const pendingReplacementRef = useRef<{
    originalEventId: string;
    identity: string;
    category: PlannedWorkoutReplacementCategory;
    replacementEventId: string;
  } | null>(null);
  const publishDetail = (
    detail: PlannedWorkoutDetail,
    originalEventId = detail.event.id,
  ) => {
    queryClient.setQueryData(
      queryKeys.plannedWorkout(identity, detail.event.id),
      detail,
    );
    queryClient.setQueriesData<InfiniteData<CalendarEvent[]>>(
      { queryKey: calendarKey },
      (current) => current == null
        ? current
        : {
            ...current,
            pages: current.pages.map((page) =>
              page.map((event) => replaceCalendarEvent(event, detail, originalEventId))),
          },
    );
    if (originalEventId !== detail.event.id) {
      queryClient.removeQueries({
        queryKey: queryKeys.plannedWorkout(identity, originalEventId),
        exact: true,
      });
    }
  };

  return {
    move: useMutation({
      mutationFn: (startDateLocal: string) =>
        client.moveWorkout(eventId, startDateLocal),
      onMutate: async (startDateLocal) => {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: plannedWorkoutKey }),
          queryClient.cancelQueries({ queryKey: calendarKey }),
        ]);
        const detail = queryClient.getQueryData<PlannedWorkoutDetail>(plannedWorkoutKey);
        const calendars = queryClient.getQueriesData<InfiniteData<CalendarEvent[]>>({
          queryKey: calendarKey,
        });
        queryClient.setQueryData<PlannedWorkoutDetail>(
          plannedWorkoutKey,
          (current) => current == null
            ? current
            : {
                ...current,
                event: { ...current.event, startDateLocal },
              },
        );
        queryClient.setQueriesData<InfiniteData<CalendarEvent[]>>(
          { queryKey: calendarKey },
          (current) => current == null
            ? current
            : {
                ...current,
                pages: current.pages.map((page) => page.map((event) =>
                  event.id === eventId
                    ? { ...event, date: new Date(startDateLocal) }
                    : event,
                )),
              },
        );
        return { detail, calendars };
      },
      onError: (_error, _startDateLocal, context) => {
        queryClient.setQueryData(plannedWorkoutKey, context?.detail);
        for (const [key, data] of context?.calendars ?? []) {
          queryClient.setQueryData(key, data);
        }
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: calendarKey });
      },
    }),
    replace: useMutation({
      onMutate: () => queryClient.cancelQueries({ queryKey: calendarKey }),
      mutationFn: async (category: PlannedWorkoutReplacementCategory) => {
        let pendingReplacement = pendingReplacementRef.current;
        if (
          pendingReplacement != null &&
          (pendingReplacement.originalEventId !== eventId || pendingReplacement.identity !== identity)
        ) {
          pendingReplacementRef.current = null;
          pendingReplacement = null;
        }
        if (pendingReplacement != null && pendingReplacement.category !== category) {
          throw new Error(
            'This workout was already replaced. Reload the workout before choosing another replacement.',
          );
        }
        if (pendingReplacement == null) {
          const { newId } = await client.replaceWorkout(eventId, category);
          pendingReplacement = {
            originalEventId: eventId,
            identity,
            category,
            replacementEventId: String(newId),
          };
          pendingReplacementRef.current = pendingReplacement;
        }
        try {
          const detail = await queryClient.fetchQuery({
            ...plannedWorkoutQueryOptions(
              client,
              identity,
              pendingReplacement.replacementEventId,
            ),
            retry: 1,
          });
          return { detail, originalEventId: eventId };
        } catch (error) {
          queryClient.removeQueries({ queryKey: plannedWorkoutKey, exact: true });
          await queryClient.invalidateQueries({ queryKey: calendarKey });
          throw error;
        }
      },
      onSuccess: ({ detail, originalEventId }) => {
        pendingReplacementRef.current = null;
        publishDetail(detail, originalEventId);
      },
    }),
    changeEffortMetric: useMutation({
      onMutate: async () => {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: plannedWorkoutKey }),
          queryClient.cancelQueries({ queryKey: calendarKey }),
        ]);
      },
      mutationFn: (effortMetric: EffortMetric) =>
        client.changeWorkoutEffortMetric(eventId, effortMetric),
      onSuccess: (detail) => {
        publishDetail(detail);
      },
    }),
    deleteWorkout: useMutation({
      mutationFn: () => client.deleteWorkout(eventId),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: calendarKey }),
    }),
    savePreRunCarbs: useMutation({
      mutationFn: (carbsG: number | null) =>
        client.savePreRunCarbs(eventId, carbsG),
      onSuccess: (_result, carbsG) => {
        queryClient.setQueryData<PlannedWorkoutDetail>(
          plannedWorkoutKey,
          (detail) => detail == null ? detail : { ...detail, preRunCarbsG: carbsG },
        );
        queryClient.setQueriesData<InfiniteData<CalendarEvent[]>>(
          { queryKey: calendarKey },
          (current) => current == null
            ? current
            : {
                ...current,
                pages: current.pages.map((page) => page.map((event) =>
                  event.id === eventId
                    ? { ...event, preRunCarbsG: carbsG }
                    : event,
                )),
              },
        );
      },
    }),
  };
}
