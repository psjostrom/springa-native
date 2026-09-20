import { useCallback } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/ApiClientProvider';
import type { PaceCurveData } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { queryKeys } from './keys';
import { useSettingsQuery } from './useSettingsQuery';

export function usePaceCurvesQuery(timeWindow = 'all') {
  const client = useApiClient();
  const { status: authStatus, session } = useAuth();
  const settings = useSettingsQuery();
  const intervalsConnected = Boolean(settings.settings?.intervalsConnected);
  const enabled = authStatus === 'signedIn' && session != null && intervalsConnected;
  const identity = session?.email ?? '';

  const query = useQuery({
    queryKey: queryKeys.paceCurves(identity, timeWindow),
    queryFn: () => client.getPaceCurves(timeWindow),
    enabled,
    placeholderData: keepPreviousData,
  });

  const reload = useCallback(() => {
    if (!enabled) return Promise.resolve();
    return query.refetch();
  }, [enabled, query]);

  if (!enabled) {
    return {
      status: 'idle' as const,
      data: null as PaceCurveData | null,
      error: null as string | null,
      reload,
    };
  }

  if (query.isPending || (query.isFetching && query.data === undefined && !query.isError)) {
    return {
      status: 'loading' as const,
      data: null as PaceCurveData | null,
      error: null as string | null,
      reload,
    };
  }

  if (query.isError) {
    return {
      status: 'error' as const,
      data: null as PaceCurveData | null,
      error: query.error instanceof Error ? query.error.message : 'Failed to load pace curves',
      reload,
    };
  }

  return {
    status: 'ready' as const,
    data: query.data ?? null,
    error: null as string | null,
    reload,
  };
}
