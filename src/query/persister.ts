import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const QUERY_CACHE_KEY = 'SPRINGA_REACT_QUERY_CACHE';
export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 14; // 14 days (safe for 32-bit setTimeout limit)

const safeAsyncStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // ignore storage write errors
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore storage remove errors
    }
  },
};

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: safeAsyncStorage,
  key: QUERY_CACHE_KEY,
  throttleTime: 1000,
  deserialize: (cachedString) => {
    try {
      return JSON.parse(cachedString);
    } catch {
      return undefined;
    }
  },
});
