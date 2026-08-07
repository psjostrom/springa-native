import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/ApiClientProvider';
import { useAuth } from '@/auth/AuthContext';
import { queryKeys } from './keys';
import { useSettingsQuery } from './useSettingsQuery';

const BG_POLL_MS = 60_000;

export function useBgQuery() {
  const client = useApiClient();
  const { status: authStatus, session } = useAuth();
  const settings = useSettingsQuery();
  const identity = session?.email ?? '';
  const diabetesMode =
    authStatus === 'signedIn' &&
    session != null &&
    settings.status === 'ready' &&
    !!settings.settings?.diabetesMode;

  const query = useQuery({
    queryKey: queryKeys.bg(identity),
    queryFn: () => client.getBg(),
    enabled: diabetesMode,
    refetchInterval: diabetesMode ? BG_POLL_MS : false,
  });

  return {
    enabled: diabetesMode,
    data: query.data ?? null,
    isLoading: diabetesMode && query.isPending,
    isError: diabetesMode && query.isError,
  };
}
