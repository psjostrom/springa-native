import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { asyncStoragePersister, PERSIST_MAX_AGE } from './persister';
import { QueryHydrationContext } from './QueryHydrationContext';
import { createAppQueryClient } from './queryClient';

export function QueryProvider({
  children,
  persister = asyncStoragePersister,
}: {
  children: ReactNode;
  persister?: PersistQueryClientOptions['persister'];
}) {
  const [client] = useState(createAppQueryClient);
  const [isHydrated, setIsHydrated] = useState(false);

  const handleSuccess = useCallback(() => {
    setIsHydrated(true);
  }, []);

  const persistOptions = useMemo(
    () => ({
      persister,
      maxAge: PERSIST_MAX_AGE,
    }),
    [persister],
  );

  const hydrationValue = useMemo(() => ({ isHydrated }), [isHydrated]);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={persistOptions}
      onSuccess={handleSuccess}
      onError={handleSuccess}
    >
      <QueryHydrationContext.Provider value={hydrationValue}>
        {children}
      </QueryHydrationContext.Provider>
    </PersistQueryClientProvider>
  );
}
