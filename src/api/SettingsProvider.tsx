import { useMemo, type ReactNode } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { createApiClient } from './client';
import { SettingsLoader } from './SettingsContext';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, session, signOut } = useAuth();

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

  const enabled = authStatus === 'signedIn' && session != null;
  const identity = session?.email ?? '';

  return (
    <SettingsLoader client={client} enabled={enabled} identity={identity}>
      {children}
    </SettingsLoader>
  );
}
