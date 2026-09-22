import fs from '@react-native-windows/fs';
import { StorageAdapter } from '../../interfaces/storage.interface';

const STORAGE_FILE = 'signage-storage.json';

let cache: Record<string, string> = {};

const persist = (): void => {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(cache));
  } catch (error) {
    console.error('[StorageAdapter] Failed to persist storage file:', error);
  }
};

export const storageAdapter: StorageAdapter = {
  init: async (): Promise<void> => {
    try {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf8') as string;
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === 'object') {
        cache = parsed;
      }
    } catch (_error) {
      cache = {};
    }
  },
  getString: (key: string): string | undefined => cache[key],
  set: (key: string, value: string): void => {
    cache[key] = value;
    persist();
  },
  delete: (key: string): void => {
    delete cache[key];
    persist();
  }
};
