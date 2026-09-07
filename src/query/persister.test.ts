import AsyncStorage from '@react-native-async-storage/async-storage';
import { describe, expect, it } from 'vitest';
import { createAppQueryClient } from './queryClient';
import {
  asyncStoragePersister,
  evictPersistedQueryCache,
  resetCacheEvicted,
  PERSIST_MAX_AGE,
  QUERY_CACHE_KEY,
} from './persister';

describe('persister and queryClient configuration', () => {
  it('creates query client with 14-day gcTime and appropriate default options', () => {
    const client = createAppQueryClient();
    const defaultOptions = client.getDefaultOptions();
    expect(defaultOptions.queries?.gcTime).toBe(PERSIST_MAX_AGE);
    expect(defaultOptions.queries?.staleTime).toBe(60_000);
  });

  it('defines persistent cache key and persister', () => {
    expect(QUERY_CACHE_KEY).toBe('SPRINGA_REACT_QUERY_CACHE');
    expect(asyncStoragePersister).toBeDefined();
  });

  it('blocks writes and evicts cache when evictPersistedQueryCache is called', async () => {
    await AsyncStorage.setItem(QUERY_CACHE_KEY, 'cached-data');
    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBe('cached-data');

    await evictPersistedQueryCache();
    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();

    // Any late throttled write attempting to write back to the cache key is blocked
    await asyncStoragePersister.persistClient({
      timestamp: Date.now(),
      buster: '',
      clientState: { mutations: [], queries: [] },
    });
    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();

    resetCacheEvicted();
  });

  it('restores write capability when resetCacheEvicted is called after eviction', async () => {
    await evictPersistedQueryCache();

    await asyncStoragePersister.persistClient({
      timestamp: Date.now(),
      buster: '',
      clientState: { mutations: [], queries: [] },
    });
    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();

    resetCacheEvicted();

    await asyncStoragePersister.persistClient({
      timestamp: Date.now(),
      buster: '',
      clientState: { mutations: [], queries: [] },
    });
    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).not.toBeNull();
  });

  it('persists fresh query data after removeClient is called for expired data', async () => {
    resetCacheEvicted();
    await asyncStoragePersister.removeClient();

    const freshPayload = {
      timestamp: Date.now(),
      buster: '',
      clientState: {
        mutations: [],
        queries: [
          {
            queryKey: ['fresh-key'],
            queryHash: '["fresh-key"]',
            state: { data: 'fresh-data' },
          },
        ],
      },
    };

    await asyncStoragePersister.persistClient(freshPayload as never);
    const restored = await asyncStoragePersister.restoreClient();
    expect(restored).toEqual(freshPayload);
  });

  it('awaits delayed removal on malformed cache before restoreClient resolves so fresh writes are not deleted', async () => {
    resetCacheEvicted();
    await AsyncStorage.setItem(QUERY_CACHE_KEY, 'not-valid-json{{{');

    const originalRemoveItem = AsyncStorage.removeItem;
    let removeInProgress = false;
    let removeCompleted = false;

    AsyncStorage.removeItem = async (key: string) => {
      removeInProgress = true;
      await new Promise((resolve) => setTimeout(resolve, 50));
      await originalRemoveItem.call(AsyncStorage, key);
      removeInProgress = false;
      removeCompleted = true;
    };

    try {
      const restored = await asyncStoragePersister.restoreClient();
      expect(restored).toBeUndefined();
      expect(removeCompleted).toBe(true);
      expect(removeInProgress).toBe(false);

      const freshPayload = {
        timestamp: Date.now(),
        buster: '',
        clientState: {
          mutations: [],
          queries: [
            {
              queryKey: ['fresh-key'],
              queryHash: '["fresh-key"]',
              state: { data: 'fresh-data' },
            },
          ],
        },
      };

      await asyncStoragePersister.persistClient(freshPayload as never);
      expect(await asyncStoragePersister.restoreClient()).toEqual(freshPayload);
    } finally {
      AsyncStorage.removeItem = originalRemoveItem;
    }
  });

  it('clears storage and returns undefined when cached JSON is not a valid clientState object', async () => {
    resetCacheEvicted();
    for (const invalidPayload of ['null', '123', '[]', '{"timestamp": 123}']) {
      await AsyncStorage.setItem(QUERY_CACHE_KEY, invalidPayload);
      const restored = await asyncStoragePersister.restoreClient();
      expect(restored).toBeUndefined();
      expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
    }
  });
});
