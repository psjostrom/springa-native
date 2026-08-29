import AsyncStorage from '@react-native-async-storage/async-storage';
import { QUERY_CACHE_KEY } from '@/query/persister';

export type Session = {
  token: string;
  expiresAt: number;
  email: string;
};

export type SessionStore = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

export type AsyncStorageLike = {
  removeItem: (key: string) => Promise<void>;
};

const SESSION_KEY = 'springa.session.v1';

export function isSessionValid(session: Session, nowSec = Date.now() / 1000): boolean {
  return session.expiresAt > nowSec + 60;
}

/** Parse stored session JSON; null on corrupt or incomplete payload. */
export function parseSessionJson(raw: string): Session | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      return null;
    }
    const { token, email, expiresAt } = value as Record<string, unknown>;
    if (
      typeof token !== 'string' ||
      token.length === 0 ||
      typeof email !== 'string' ||
      email.length === 0 ||
      typeof expiresAt !== 'number' ||
      !Number.isFinite(expiresAt)
    ) {
      return null;
    }
    return { token, email, expiresAt };
  } catch {
    return null;
  }
}

function createPersistQueue() {
  let chain: Promise<void> = Promise.resolve();
  return function enqueue<T>(op: () => Promise<T>): Promise<T> {
    const run = chain.then(op, op);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

/** Session load/save/clear with serialized SecureStore mutations and cache eviction. */
export function createSessionApi(
  getStore: () => Promise<SessionStore>,
  asyncStorage: AsyncStorageLike = AsyncStorage,
) {
  const enqueue = createPersistQueue();

  async function loadSession(): Promise<Session | null> {
    return enqueue(async () => {
      const store = await getStore();
      const raw = await store.getItemAsync(SESSION_KEY);
      if (!raw) return null;

      const session = parseSessionJson(raw);
      if (!session || !isSessionValid(session)) {
        await store.deleteItemAsync(SESSION_KEY);
        return null;
      }

      return session;
    });
  }

  async function saveSession(session: Session): Promise<void> {
    return enqueue(async () => {
      const store = await getStore();
      await store.setItemAsync(SESSION_KEY, JSON.stringify(session));
    });
  }

  async function clearSession(): Promise<void> {
    return enqueue(async () => {
      const store = await getStore();
      try {
        await store.deleteItemAsync(SESSION_KEY);
      } catch {
        try {
          await store.deleteItemAsync(SESSION_KEY);
        } catch (err) {
          // SecureStore deletion failed after retry; rethrow so caller knows persistence failed.
          throw err;
        }
      }
      await asyncStorage.removeItem(QUERY_CACHE_KEY);
    });
  }

  return { loadSession, saveSession, clearSession };
}

const defaultApi = createSessionApi(() => import('expo-secure-store'));

export const loadSession = defaultApi.loadSession;
export const saveSession = defaultApi.saveSession;
export const clearSession = defaultApi.clearSession;
export const clearAuthSession = defaultApi.clearSession;
