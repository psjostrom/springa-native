import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from '@/auth/AuthContext';
import { createApiClient, type ApiClient } from './client';

const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();

  const client = useMemo(
    () =>
      createApiClient({
        getToken: () => session?.token ?? null,
        onUnauthorized: () => {
          void signOut();
        },
      }),
    [session, signOut],
  );

  return (
    <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>
  );
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error('useApiClient outside ApiClientProvider');
  return client;
}
