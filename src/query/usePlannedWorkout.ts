import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import type { ApiClient } from '@/api/client';
import type { PlannedWorkoutReplacementCategory } from '@/api/types';
import { queryKeys } from './keys';

const PLANNED_WORKOUT_STALE_TIME = 60_000;

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
    error: query.error instanceof Error ? query.error.message : null,
    reload: () => {
      void query.refetch();
    },
  };
}

export function usePlannedWorkoutMutations(eventId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const identity = session?.email ?? '';

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.plannedWorkout(identity, eventId),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar(identity) }),
    ]);
  };

  return {
    move: useMutation({
      mutationFn: (startDateLocal: string) =>
        client.moveWorkout(eventId, startDateLocal),
      onSuccess: invalidate,
    }),
    replace: useMutation({
      mutationFn: (category: PlannedWorkoutReplacementCategory) =>
        client.replaceWorkout(eventId, category),
      onSuccess: invalidate,
    }),
    deleteWorkout: useMutation({
      mutationFn: () => client.deleteWorkout(eventId),
      onSuccess: invalidate,
    }),
    savePreRunCarbs: useMutation({
      mutationFn: (carbsG: number | null) =>
        client.savePreRunCarbs(eventId, carbsG),
      onSuccess: invalidate,
    }),
  };
}
