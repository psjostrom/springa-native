import { createContext, useContext } from 'react';

export interface QueryHydrationContextValue {
  isHydrated: boolean;
}

export const QueryHydrationContext = createContext<QueryHydrationContextValue>({
  isHydrated: false,
});

export function useQueryHydration(): QueryHydrationContextValue {
  return useContext(QueryHydrationContext);
}
