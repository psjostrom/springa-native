import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import { buildBGCategories, type CategoryBGResponse } from '@/lib/bgModel';
import { queryKeys } from './keys';
import { useSettingsQuery } from './useSettingsQuery';

export function useBgModelQuery(diabetesMode?: boolean) {
  const client = useApiClient();
  const { status: authStatus, session } = useAuth();
  const settings = useSettingsQuery();
  const isDiabetes =
    diabetesMode !== undefined
      ? diabetesMode
      : Boolean(settings.settings?.diabetesMode);
  const enabled = authStatus === 'signedIn' && session != null && isDiabetes;
  const identity = session?.email ?? '';

  const query = useQuery({
    queryKey: queryKeys.bgModel(identity),
    queryFn: () => client.getBgCache(),
    enabled,
  });

  const reload = useCallback(() => {
    if (!enabled) return Promise.resolve();
    return query.refetch();
  }, [enabled, query]);

  const { categories, activitiesAnalyzed } = useMemo(
    () => buildBGCategories(query.data ?? []),
    [query.data],
  );

  if (!enabled) {
    return {
      status: 'idle' as const,
      categories: null as CategoryBGResponse[] | null,
      activitiesAnalyzed: 0,
      error: null as string | null,
      reload,
    };
  }

  if (query.isPending || (query.isFetching && query.data === undefined && !query.isError)) {
    return {
      status: 'loading' as const,
      categories: null as CategoryBGResponse[] | null,
      activitiesAnalyzed: 0,
      error: null as string | null,
      reload,
    };
  }

  if (query.isError) {
    return {
      status: 'error' as const,
      categories: null as CategoryBGResponse[] | null,
      activitiesAnalyzed: 0,
      error: query.error instanceof Error ? query.error.message : 'Failed to load BG model data',
      reload,
    };
  }

  return {
    status: 'ready' as const,
    categories,
    activitiesAnalyzed,
    error: null as string | null,
    reload,
  };
}
