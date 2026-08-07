import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AuthContext, type AuthValue } from './AuthContext';
import { getGoogleWebClientId } from './config';
import { exchangeGoogleIdToken } from './exchange';
import {
  clearSession,
  loadSession,
  saveSession,
} from './session';

type AuthStatus = AuthValue['status'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<AuthValue['session']>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        GoogleSignin.configure({
          webClientId: getGoogleWebClientId(),
          offlineAccess: false,
        });
      } catch (err) {
        setSession(null);
        setStatus('signedOut');
        setConfigError(
          err instanceof Error
            ? err.message
            : 'Google Sign-In is not configured',
        );
        return;
      }

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
    // Gate on local session immediately — SecureStore clear must not block UI.
    // clearSession is queued with saveSession so a late delete cannot wipe a newer sign-in.
    setSession(null);
    setStatus('signedOut');
    void clearSession().catch((err) => {
      setConfigError(
        err instanceof Error
          ? `Sign-out persistence failed: ${err.message}`
          : 'Sign-out persistence failed',
      );
    });
    void GoogleSignin.signOut().catch(() => {
      // ignore native sign-out errors after local clear
    });
  }, []);

  const value = useMemo(
    () => ({ status, session, configError, signInWithGoogle, signOut }),
    [status, session, configError, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
