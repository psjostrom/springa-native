import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from './queryClient';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createAppQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
