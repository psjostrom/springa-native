import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/ApiClientProvider';
import type { WellnessEntry } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { queryKeys } from './keys';
import { useSettingsQuery } from './useSettingsQuery';

export function useWellnessQuery(days = 365) {
  const client = useApiClient();
  const { status: authStatus, session } = useAuth();
  const settings = useSettingsQuery();
  const intervalsConnected = Boolean(settings.settings?.intervalsConnected);
  const enabled = authStatus === 'signedIn' && session != null && intervalsConnected;
  const identity = session?.email ?? '';

  const query = useQuery({
    queryKey: queryKeys.wellness(identity, days),
    queryFn: () => client.getWellness(days),
    enabled,
  });

  const reload = useCallback(() => {
    if (!enabled) return Promise.resolve();
    return query.refetch();
  }, [enabled, query]);

  if (!enabled) {
    return {
      status: 'idle' as const,
      entries: null as WellnessEntry[] | null,
      error: null as string | null,
      reload,
    };
  }

  if (query.isPending || (query.isFetching && query.data === undefined && !query.isError)) {
    return {
      status: 'loading' as const,
      entries: null as WellnessEntry[] | null,
      error: null as string | null,
      reload,
    };
  }

  if (query.isError) {
    return {
      status: 'error' as const,
      entries: null as WellnessEntry[] | null,
      error: query.error instanceof Error ? query.error.message : 'Failed to load wellness data',
      reload,
    };
  }

  return {
    status: 'ready' as const,
    entries: query.data ?? null,
    error: null as string | null,
    reload,
  };
}
