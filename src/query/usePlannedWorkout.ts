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
import { formatLocalDateTime, parseLocalDateTime } from '@/domain/format';
import type { DateWindow } from '@/domain/calendarWindows';
import { queryKeys } from './keys';
import { applyWorkoutUpdates, beginWorkoutUpdate, usePendingWorkoutUpdates } from './usePendingWorkoutUpdates';
import { upsertCalendarEvent } from './calendarCache';

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
    date: parseLocalDateTime(detail.event.startDateLocal),
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

  const pendingUpdates = usePendingWorkoutUpdates(identity);
  const data = pendingUpdates.reduce((current, update) => {
    if (current == null || update?.eventId !== eventId || update.patch == null) return current;
    const { date, preRunCarbsG } = update.patch;
    return {
      ...current,
      event: date == null ? current.event : { ...current.event, startDateLocal: formatLocalDateTime(date) },
      preRunCarbsG: preRunCarbsG === undefined ? current.preRunCarbsG : preRunCarbsG,
    };
  }, query.data);

  return {
    data: data ?? null,
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
      mutationKey: queryKeys.updateWorkout(identity),
      networkMode: 'always',
      retry: false,
      onMutate: (startDateLocal: string) => beginWorkoutUpdate(queryClient, identity, {
        eventId, patch: { date: parseLocalDateTime(startDateLocal) },
      }),
      mutationFn: (startDateLocal: string) => client.moveWorkout(eventId, startDateLocal),
      onSuccess: async (_result, startDateLocal) => {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: plannedWorkoutKey }),
          queryClient.cancelQueries({ queryKey: calendarKey }),
        ]);
        queryClient.setQueryData<PlannedWorkoutDetail>(plannedWorkoutKey, (current) =>
          current == null ? current : { ...current, event: { ...current.event, startDateLocal } });
        queryClient.setQueriesData<InfiniteData<CalendarEvent[], DateWindow>>(
          { queryKey: calendarKey },
          (current) => {
            const event = current?.pages.flat().find((candidate) => candidate.id === eventId);
            if (event == null) return current;
            const result = upsertCalendarEvent(current, { ...event, date: parseLocalDateTime(startDateLocal) });
            return result.data;
          },
        );
        void queryClient.invalidateQueries({ queryKey: calendarKey, refetchType: 'all' });
        void queryClient.invalidateQueries({ queryKey: plannedWorkoutKey, refetchType: 'none' });
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
      mutationKey: queryKeys.updateWorkout(identity),
      networkMode: 'always',
      retry: false,
      onMutate: () => beginWorkoutUpdate(queryClient, identity, { eventId, patch: null }),
      mutationFn: () => client.deleteWorkout(eventId),
      onSuccess: async (_result, _variables, update) => {
        await queryClient.cancelQueries({ queryKey: calendarKey });
        queryClient.setQueriesData<InfiniteData<CalendarEvent[]>>(
          { queryKey: calendarKey },
          (current) => current == null ? current : {
            ...current, pages: current.pages.map((page) => applyWorkoutUpdates(page, [update])),
          },
        );
        queryClient.removeQueries({ queryKey: plannedWorkoutKey, exact: true });
        void queryClient.invalidateQueries({ queryKey: calendarKey, refetchType: 'none' });
        void queryClient.invalidateQueries({ queryKey: queryKeys.planner(identity) });
      },
    }),
    savePreRunCarbs: useMutation({
      mutationKey: queryKeys.updateWorkout(identity),
      networkMode: 'always',
      retry: false,
      onMutate: (carbsG: number | null) => beginWorkoutUpdate(queryClient, identity, { eventId, patch: { preRunCarbsG: carbsG } }),
      mutationFn: (carbsG: number | null) =>
        client.savePreRunCarbs(eventId, carbsG),
      onSuccess: async (_result, carbsG) => {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: plannedWorkoutKey }),
          queryClient.cancelQueries({ queryKey: calendarKey }),
        ]);
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
