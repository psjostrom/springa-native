import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import type { Session } from './session';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export type AuthValue = {
  status: AuthStatus;
  session: Session | null;
  configError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthValue | null>(null);

/** Injected auth for tests — production uses AuthProvider. */
export function AuthProviderForTests({
  value,
  children,
}: {
  value: AuthValue;
  children: ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
