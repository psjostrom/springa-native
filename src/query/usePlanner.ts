import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, type ApiClient } from '@/api/client';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import type {
  PlannerApplyRequest,
  PlannerConfig,
  PlannerPreviewRequest,
} from '@/api/types';
import { queryKeys } from './keys';

export function plannerQueryOptions(client: ApiClient, identity: string) {
  return {
    queryKey: queryKeys.planner(identity),
    queryFn: () => client.getPlanner(),
  };
}

export function usePlannerQuery() {
  const client = useApiClient();
  const { status: authStatus, session } = useAuth();
  const identity = session?.email ?? '';
  const enabled = authStatus === 'signedIn' && session != null;
  const query = useQuery({
    ...plannerQueryOptions(client, identity),
    enabled,
  });

  if (!enabled) {
    return {
      status: 'idle' as const,
      state: null,
      error: null as string | null,
      reload: () => { void query.refetch(); },
    };
  }
  if (query.isPending || (query.isFetching && query.data === undefined && !query.isError)) {
    return {
      status: 'loading' as const,
      state: null,
      error: null as string | null,
      reload: () => { void query.refetch(); },
    };
  }
  if (query.isError) {
    return {
      status: 'error' as const,
      state: null,
      error: query.error instanceof Error ? query.error.message : 'Failed to load Planner',
      reload: () => { void query.refetch(); },
    };
  }
  return {
    status: 'ready' as const,
    state: query.data ?? null,
    error: null as string | null,
    reload: () => { void query.refetch(); },
  };
}

export function usePlannerMutations() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const identity = session?.email ?? '';
  const plannerKey = queryKeys.planner(identity);
  const settingsKey = queryKeys.settings(identity);
  const calendarKey = queryKeys.calendar(identity);

  return {
    saveConfig: useMutation({
      mutationFn: (config: PlannerConfig) => client.savePlannerConfig(config),
      retry: false,
      onSuccess: () => {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: plannerKey }),
          queryClient.invalidateQueries({ queryKey: settingsKey }),
        ]);
      },
    }),
    preview: useMutation({
      mutationFn: (request: PlannerPreviewRequest) => client.previewPlanner(request),
      retry: false,
    }),
    apply: useMutation({
      mutationFn: (request: PlannerApplyRequest) => client.applyPlanner(request),
      retry: false,
      onSuccess: () => {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: plannerKey }),
          queryClient.invalidateQueries({ queryKey: settingsKey }),
          queryClient.invalidateQueries({ queryKey: calendarKey }),
        ]);
      },
      onError: (error) => {
        if (
          error instanceof ApiError &&
          (error.code === 'PLANNER_APPLY_PARTIAL' || error.code === 'PLANNER_STATE_FINALIZE_FAILED')
        ) {
          void Promise.all([
            queryClient.invalidateQueries({ queryKey: plannerKey }),
            queryClient.invalidateQueries({ queryKey: calendarKey }),
          ]);
        }
      },
    }),
  };
}
