import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/ApiClientProvider';
import type { PaceSuggestion } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { queryKeys } from './keys';
import { useSettingsQuery } from './useSettingsQuery';

export function usePaceSuggestionQuery() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { status: authStatus, session } = useAuth();
  const settings = useSettingsQuery();
  const intervalsConnected = Boolean(settings.settings?.intervalsConnected);
  const enabled = authStatus === 'signedIn' && session != null && intervalsConnected;
  const identity = session?.email ?? '';

  const query = useQuery({
    queryKey: queryKeys.paceSuggestion(identity),
    queryFn: () => client.getPaceSuggestion(),
    enabled,
  });

  const acceptMutation = useMutation({
    mutationFn: ({
      suggestedAbilitySecs,
      currentAbilityDist,
    }: {
      suggestedAbilitySecs: number;
      currentAbilityDist: number;
    }) => client.acceptPaceSuggestion(suggestedAbilitySecs, currentAbilityDist),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paceSuggestion(identity) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.paceCurves(identity) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings(identity) });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: () => client.dismissPaceSuggestion(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paceSuggestion(identity) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings(identity) });
    },
  });

  const reload = useCallback(() => {
    if (!enabled) return Promise.resolve();
    return query.refetch();
  }, [enabled, query]);

  const accept = useCallback(
    async (suggestedAbilitySecs: number, currentAbilityDist?: number) => {
      const dist = currentAbilityDist ?? query.data?.currentAbilityDist ?? 5;
      await acceptMutation.mutateAsync({ suggestedAbilitySecs, currentAbilityDist: dist });
    },
    [acceptMutation, query.data?.currentAbilityDist],
  );

  const dismiss = useCallback(async () => {
    await dismissMutation.mutateAsync();
  }, [dismissMutation]);

  if (!enabled) {
    return {
      status: 'idle' as const,
      suggestion: null as PaceSuggestion | null,
      error: null as string | null,
      reload,
      accept,
      dismiss,
      isAccepting: false,
      isDismissing: false,
    };
  }

  if (query.isPending || (query.isFetching && query.data === undefined && !query.isError)) {
    return {
      status: 'loading' as const,
      suggestion: null as PaceSuggestion | null,
      error: null as string | null,
      reload,
      accept,
      dismiss,
      isAccepting: acceptMutation.isPending,
      isDismissing: dismissMutation.isPending,
    };
  }

  if (query.isError) {
    return {
      status: 'error' as const,
      suggestion: null as PaceSuggestion | null,
      error: query.error instanceof Error ? query.error.message : 'Failed to load pace suggestion',
      reload,
      accept,
      dismiss,
      isAccepting: acceptMutation.isPending,
      isDismissing: dismissMutation.isPending,
    };
  }

  return {
    status: 'ready' as const,
    suggestion: query.data ?? null,
    error: null as string | null,
    reload,
    accept,
    dismiss,
    isAccepting: acceptMutation.isPending,
    isDismissing: dismissMutation.isPending,
  };
}
