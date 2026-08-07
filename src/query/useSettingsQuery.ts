import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import { queryKeys } from './keys';

export function useSettingsQuery() {
  const client = useApiClient();
  const { status: authStatus, session } = useAuth();
  const enabled = authStatus === 'signedIn' && session != null;
  const identity = session?.email ?? '';

  const query = useQuery({
    queryKey: queryKeys.settings(identity),
    queryFn: () => client.getSettings(),
    enabled,
  });

  const reload = () => {
    void query.refetch();
  };

  if (!enabled) {
    return {
      status: 'idle' as const,
      settings: null,
      error: null as string | null,
      reload,
    };
  }

  if (query.isPending || (query.isFetching && query.data === undefined && !query.isError)) {
    return {
      status: 'loading' as const,
      settings: null,
      error: null as string | null,
      reload,
    };
  }

  if (query.isError) {
    return {
      status: 'error' as const,
      settings: null,
      error: query.error instanceof Error ? query.error.message : 'Failed to load settings',
      reload,
    };
  }

  return {
    status: 'ready' as const,
    settings: query.data ?? null,
    error: null as string | null,
    reload,
  };
}
