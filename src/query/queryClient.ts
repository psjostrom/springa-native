import { QueryClient } from '@tanstack/react-query';
import { PERSIST_MAX_AGE } from './persister';

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 60_000,
        gcTime: PERSIST_MAX_AGE,
        refetchOnWindowFocus: false,
      },
    },
  });
}
