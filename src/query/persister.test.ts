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
});
