import AsyncStorage from '@react-native-async-storage/async-storage';
import { describe, expect, it } from 'vitest';
import { QUERY_CACHE_KEY } from '@/query/persister';
import {
  clearSession,
  createSessionApi,
  isSessionValid,
  parseSessionJson,
  type Session,
  type SessionStore,
} from './session';

describe('isSessionValid', () => {
  it('accepts future expiry', () => {
    const s: Session = { token: 't', email: 'a@b.c', expiresAt: 2_000_000_000 };
    expect(isSessionValid(s, 1_700_000_000)).toBe(true);
  });

  it('rejects near-expiry within skew', () => {
    const s: Session = { token: 't', email: 'a@b.c', expiresAt: 1_700_000_030 };
    expect(isSessionValid(s, 1_700_000_000)).toBe(false);
  });
});

describe('parseSessionJson', () => {
  it('returns null for corrupt JSON', () => {
    expect(parseSessionJson('{not json')).toBeNull();
  });

  it('parses a valid session payload', () => {
    const s: Session = { token: 't', email: 'a@b.c', expiresAt: 2_000_000_000 };
    expect(parseSessionJson(JSON.stringify(s))).toEqual(s);
  });

  it('returns null when token is missing or empty', () => {
    expect(
      parseSessionJson(JSON.stringify({ email: 'a@b.c', expiresAt: 2_000_000_000 })),
    ).toBeNull();
    expect(
      parseSessionJson(
        JSON.stringify({ token: '', email: 'a@b.c', expiresAt: 2_000_000_000 }),
      ),
    ).toBeNull();
  });

  it('returns null when email is missing or empty', () => {
    expect(
      parseSessionJson(JSON.stringify({ token: 't', expiresAt: 2_000_000_000 })),
    ).toBeNull();
    expect(
      parseSessionJson(
        JSON.stringify({ token: 't', email: '', expiresAt: 2_000_000_000 }),
      ),
    ).toBeNull();
  });

  it('returns null for non-finite expiresAt', () => {
    expect(
      parseSessionJson('{"token":"t","email":"a@b.c","expiresAt":1e400}'),
    ).toBeNull();
    expect(
      parseSessionJson(
        JSON.stringify({
          token: 't',
          email: 'a@b.c',
          expiresAt: Number.POSITIVE_INFINITY,
        }),
      ),
    ).toBeNull();
    expect(
      parseSessionJson(
        JSON.stringify({ token: 't', email: 'a@b.c', expiresAt: 'soon' }),
      ),
    ).toBeNull();
  });
});

describe('session persistence queue', () => {
  it('keeps a session saved while a delayed clear from sign-out is still running', async () => {
    const map = new Map<string, string>();
    const store: SessionStore = {
      async getItemAsync(key) {
        return map.get(key) ?? null;
      },
      async setItemAsync(key, value) {
        map.set(key, value);
      },
      async deleteItemAsync(key) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        map.delete(key);
      },
    };

    const { saveSession, clearSession, loadSession } = createSessionApi(
      async () => store,
    );

    const oldSession: Session = {
      token: 'old',
      email: 'old@example.com',
      expiresAt: 2_000_000_000,
    };
    const newSession: Session = {
      token: 'new',
      email: 'new@example.com',
      expiresAt: 2_000_000_000,
    };

    await saveSession(oldSession);
    const clearStarted = clearSession();
    const saveStarted = saveSession(newSession);
    await Promise.all([clearStarted, saveStarted]);

    expect(await loadSession()).toEqual(newSession);
  });

  it('retries deletion on clearSession and succeeds when second attempt passes', async () => {
    let attempts = 0;
    const store: SessionStore = {
      async getItemAsync() {
        return null;
      },
      async setItemAsync() {
        // no-op
      },
      async deleteItemAsync() {
        attempts += 1;
        if (attempts === 1) throw new Error('First attempt failed');
      },
    };

    const { clearSession } = createSessionApi(async () => store);
    await expect(clearSession()).resolves.toBeUndefined();
    expect(attempts).toBe(2);
  });

  it('rejects clearSession when both deletion attempts fail and retains key for recovery', async () => {
    let shouldFail = true;
    let deleteCalls = 0;
    const map = new Map<string, string>([['springa.session.v1', 'saved-session']]);
    const store: SessionStore = {
      async getItemAsync(key) {
        return map.get(key) ?? null;
      },
      async setItemAsync(key, value) {
        map.set(key, value);
      },
      async deleteItemAsync(key) {
        deleteCalls += 1;
        if (shouldFail) {
          throw new Error('SecureStore unavailable');
        }
        map.delete(key);
      },
    };

    const { clearSession } = createSessionApi(async () => store);

    await expect(clearSession()).rejects.toThrow('SecureStore unavailable');
    expect(deleteCalls).toBe(2);
    expect(map.get('springa.session.v1')).toBe('saved-session');

    shouldFail = false;
    await expect(clearSession()).resolves.toBeUndefined();
    expect(map.get('springa.session.v1')).toBeUndefined();
  });

  it('evicts persisted query cache from AsyncStorage when clearing session', async () => {
    const map = new Map<string, string>();
    const store: SessionStore = {
      async getItemAsync(key) {
        return map.get(key) ?? null;
      },
      async setItemAsync(key, value) {
        map.set(key, value);
      },
      async deleteItemAsync(key) {
        map.delete(key);
      },
    };

    const removedKeys: string[] = [];
    const mockAsyncStorage = {
      removeItem: async (key: string) => {
        removedKeys.push(key);
      },
    };

    const { clearSession } = createSessionApi(
      async () => store,
      mockAsyncStorage,
    );

    await clearSession();

    expect(removedKeys).toContain('SPRINGA_REACT_QUERY_CACHE');
  });
});

describe('default session api and cache eviction', () => {
  it('evicts persisted query cache from default AsyncStorage on clearSession', async () => {
    await AsyncStorage.setItem(QUERY_CACHE_KEY, 'cached-query-data');
    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBe('cached-query-data');

    await clearSession();

    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
  });

  it('evicts persisted query cache when loading an expired session', async () => {
    await AsyncStorage.setItem(QUERY_CACHE_KEY, 'stale-user-cache');
    const map = new Map<string, string>();
    map.set('springa.session.v1', JSON.stringify({ token: 'expired', email: 'test@example.com', expiresAt: 100 }));
    const store: SessionStore = {
      async getItemAsync(key) {
        return map.get(key) ?? null;
      },
      async setItemAsync(key, value) {
        map.set(key, value);
      },
      async deleteItemAsync(key) {
        map.delete(key);
      },
    };

    const { loadSession } = createSessionApi(async () => store);
    const result = await loadSession();

    expect(result).toBeNull();
    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
  });

  it('evicts persisted query cache when loading with missing session record', async () => {
    await AsyncStorage.setItem(QUERY_CACHE_KEY, 'stale-user-cache');
    const store: SessionStore = {
      async getItemAsync() {
        return null;
      },
      async setItemAsync() {},
      async deleteItemAsync() {},
    };

    const { loadSession } = createSessionApi(async () => store);
    const result = await loadSession();

    expect(result).toBeNull();
    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
  });

  it('leaves eviction guard active if store persistence fails in saveSession', async () => {
    const { evictPersistedQueryCache, asyncStoragePersister, resetCacheEvicted } =
      await import('@/query/persister');
    await evictPersistedQueryCache();

    const store: SessionStore = {
      async getItemAsync() {
        return null;
      },
      async setItemAsync() {
        throw new Error('Storage failure');
      },
      async deleteItemAsync() {},
    };

    const { saveSession } = createSessionApi(async () => store);
    await expect(
      saveSession({ token: 't', email: 'a@b.c', expiresAt: 2_000_000_000 }),
    ).rejects.toThrow('Storage failure');

    // Eviction guard remains active; writes to QUERY_CACHE_KEY are blocked
    await asyncStoragePersister.persistClient({
      timestamp: Date.now(),
      buster: '',
      clientState: { mutations: [], queries: [] },
    });
    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();

    resetCacheEvicted();
  });

  it('un-gates persistent query cache writes when saveSession succeeds', async () => {
    const { evictPersistedQueryCache, asyncStoragePersister, resetCacheEvicted } =
      await import('@/query/persister');
    await evictPersistedQueryCache();

    const map = new Map<string, string>();
    const store: SessionStore = {
      async getItemAsync(key) {
        return map.get(key) ?? null;
      },
      async setItemAsync(key, value) {
        map.set(key, value);
      },
      async deleteItemAsync(key) {
        map.delete(key);
      },
    };

    const { saveSession } = createSessionApi(async () => store);
    await saveSession({ token: 't', email: 'a@b.c', expiresAt: 2_000_000_000 });

    await asyncStoragePersister.persistClient({
      timestamp: Date.now(),
      buster: '',
      clientState: { mutations: [], queries: [] },
    });
    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).not.toBeNull();

    resetCacheEvicted();
  });

  it('purges query cache even when store deleteItemAsync throws in clearSession', async () => {
    await AsyncStorage.setItem(QUERY_CACHE_KEY, 'cached-workouts');
    const store: SessionStore = {
      async getItemAsync() {
        return null;
      },
      async setItemAsync() {},
      async deleteItemAsync() {
        throw new Error('KeyStore locked');
      },
    };

    const { clearSession } = createSessionApi(async () => store);
    await expect(clearSession()).rejects.toThrow('KeyStore locked');

    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
  });

  it('purges query cache even when getStore rejects in clearSession', async () => {
    await AsyncStorage.setItem(QUERY_CACHE_KEY, 'cached-workouts');
    const { clearSession } = createSessionApi(async () => {
      throw new Error('Module import failed');
    });
    await expect(clearSession()).rejects.toThrow('Module import failed');

    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
  });
});

