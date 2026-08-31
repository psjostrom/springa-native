import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { asyncStoragePersister, PERSIST_MAX_AGE } from './persister';
import { QueryHydrationContext } from './QueryHydrationContext';
import { createAppQueryClient } from './queryClient';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createAppQueryClient);
  const [isHydrated, setIsHydrated] = useState(false);

  const handleSuccess = useCallback(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Safety fallback: ensure splash screen dismissal proceeds if storage hangs
    const timer = setTimeout(() => setIsHydrated(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const persistOptions = useMemo(
    () => ({
      persister: asyncStoragePersister,
      maxAge: PERSIST_MAX_AGE,
    }),
    [],
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
