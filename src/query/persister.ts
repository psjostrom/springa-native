import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const QUERY_CACHE_KEY = 'SPRINGA_REACT_QUERY_CACHE';
export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_KEY,
  throttleTime: 1000,
});
