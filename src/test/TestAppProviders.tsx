import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import { ApiClientProvider } from '@/api/ApiClientProvider';
import { createApiClient } from '@/api/client';
import {
  AuthProviderForTests,
  type AuthValue,
} from '@/auth/AuthContext';
import type { Session } from '@/auth/session';

const baseUrl = process.env.EXPO_PUBLIC_SPRINGA_API_URL ?? 'https://www.springa.run';

export function makeTestSession(email = 'runner@example.com'): Session {
  return {
    token: 'test-token',
    email,
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
  };
}

export function makeTestAuthValue(
  session: Session | null,
  overrides: Partial<AuthValue> = {},
): AuthValue {
  return {
    status: session ? 'signedIn' : 'signedOut',
    session,
    configError: null,
    signInWithGoogle: async () => {},
    signOut: async () => {},
    ...overrides,
  };
}

/**
 * Auth + ApiClient + fresh QueryClient for integration tests.
 * ApiClient is built from the injected session so getToken stays in sync.
 */
export function TestAppProviders({
  auth,
  children,
}: {
  auth: AuthValue;
  children: ReactNode;
}) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 0 },
        },
      }),
    [],
  );

  // ApiClientProvider reads useAuth — wrap auth first, then a bridge that still
  // uses the real ApiClientProvider under the test auth.
  return (
    <AuthProviderForTests value={auth}>
      <ApiClientProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ApiClientProvider>
    </AuthProviderForTests>
  );
}

/** Direct client for non-React client tests (unchanged base URL). */
export function makeTestApiClient(onUnauthorized: () => void = () => {}) {
  return createApiClient({
    getToken: () => 'test-token',
    onUnauthorized,
    baseUrl,
  });
}
