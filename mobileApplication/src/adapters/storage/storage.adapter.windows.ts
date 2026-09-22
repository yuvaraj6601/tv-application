import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageAdapter } from '../../interfaces/storage.interface';

const STORAGE_PREFIX = 'signage-storage:';

const cache = new Map<string, string>();
let isInitialized = false;

export const storageAdapter: StorageAdapter = {
  init: async (): Promise<void> => {
    if (isInitialized) {
      return;
    }

    const allKeys = await AsyncStorage.getAllKeys();
    const prefixedKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
    const entries = await AsyncStorage.getMany(prefixedKeys);

    Object.entries(entries).forEach(([key, value]) => {
      if (value !== null) {
        cache.set(key.slice(STORAGE_PREFIX.length), value);
      }
    });

    isInitialized = true;
  },
  getString: (key: string): string | undefined => cache.get(key),
  set: (key: string, value: string): void => {
    cache.set(key, value);
    AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, value).catch(error => {
      console.error('[StorageAdapter] Failed to persist key:', key, error);
    });
  },
  delete: (key: string): void => {
    cache.delete(key);
    AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`).catch(error => {
      console.error('[StorageAdapter] Failed to remove key:', key, error);
    });
  }
};
