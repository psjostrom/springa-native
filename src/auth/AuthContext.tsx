import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getGoogleWebClientId } from './config';
import { exchangeGoogleIdToken } from './exchange';
import {
  clearSession,
  loadSession,
  saveSession,
  type Session,
} from './session';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthValue = {
  status: AuthStatus;
  session: Session | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: getGoogleWebClientId(),
      offlineAccess: false,
    });
    void (async () => {
      try {
        const existing = await loadSession();
        setSession(existing);
        setStatus(existing ? 'signedIn' : 'signedOut');
      } catch {
        setSession(null);
        setStatus('signedOut');
      }
    })();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    if (result.type !== 'success') return;
    const idToken = result.data.idToken;
    if (!idToken) throw new Error('Google sign-in returned no idToken');
    const next = await exchangeGoogleIdToken(idToken);
    await saveSession(next);
    setSession(next);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    // Gate on local session — native Google sign-out can hang or open UI.
    setSession(null);
    setStatus('signedOut');
    void GoogleSignin.signOut().catch(() => {
      // ignore native sign-out errors after local clear
    });
  }, []);

  const value = useMemo(
    () => ({ status, session, signInWithGoogle, signOut }),
    [status, session, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
