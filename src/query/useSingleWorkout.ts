import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import type { CreateWorkoutRequest, PlannedWorkoutReplacementCategory } from '@/api/types';
import { queryKeys } from './keys';

export function useSingleWorkoutPreview(date: string, category?: PlannedWorkoutReplacementCategory) {
  const client = useApiClient();
  const { status, session } = useAuth();
  return useQuery({
    queryKey: queryKeys.singleWorkoutPreview(session?.email ?? '', date, category),
    queryFn: () => client.previewWorkout(date, category),
    enabled: status === 'signedIn' && session != null,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreateWorkout() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const identity = session?.email ?? '';
  return useMutation({
    mutationFn: (request: CreateWorkoutRequest) => client.createWorkout(request),
    onSuccess: ({ newId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plannedWorkout(identity, `event-${newId}`) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.calendar(identity) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.planner(identity) });
    },
  });
}
