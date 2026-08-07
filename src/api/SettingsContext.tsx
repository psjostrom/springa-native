import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, type ApiClient } from './client';
import type { UserSettings } from './types';

export type SettingsStatus = 'idle' | 'loading' | 'ready' | 'error';

type SettingsValue = {
  status: SettingsStatus;
  settings: UserSettings | null;
  error: string | null;
  reload: () => void;
};

type FetchState = {
  key: string;
  status: 'ready' | 'error';
  settings: UserSettings | null;
  error: string | null;
};

const SettingsContext = createContext<SettingsValue | null>(null);

type SettingsLoaderProps = {
  client: ApiClient;
  enabled: boolean;
  /** Session-unique key (e.g. token) so a prior login's settings cannot flash after re-login. */
  identity: string;
  children: ReactNode;
};

/** Loads settings via an injected API client. Exported for tests. */
export function SettingsLoader({
  client,
  enabled,
  identity,
  children,
}: SettingsLoaderProps) {
  const [reloadToken, setReloadToken] = useState(0);
  const [fetchState, setFetchState] = useState<FetchState | null>(null);
  // Invalidate cache on disable without setState-in-effect (React "adjust state during render").
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled);
    if (!enabled) {
      setSessionEpoch((n) => n + 1);
    }
  }

  const fetchKey = `${enabled ? '1' : '0'}:${identity}:${reloadToken}:${sessionEpoch}`;

  useEffect(() => {
    if (!enabled) return;

    const key = fetchKey;
    let cancelled = false;

    void (async () => {
      try {
        const next = await client.getSettings();
        if (cancelled) return;
        setFetchState({
          key,
          status: 'ready',
          settings: next,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          // Session clear is handled by the API client; enabled will flip off.
          return;
        }
        setFetchState({
          key,
          status: 'error',
          settings: null,
          error: err instanceof Error ? err.message : 'Failed to load settings',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, fetchKey, client]);

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  const value = useMemo((): SettingsValue => {
    if (!enabled) {
      return { status: 'idle', settings: null, error: null, reload };
    }
    if (fetchState?.key === fetchKey) {
      return {
        status: fetchState.status,
        settings: fetchState.settings,
        error: fetchState.error,
        reload,
      };
    }
    return { status: 'loading', settings: null, error: null, reload };
  }, [enabled, fetchKey, fetchState, reload]);

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings outside SettingsProvider');
  return ctx;
}
