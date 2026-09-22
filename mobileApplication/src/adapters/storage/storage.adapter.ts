import { MMKV } from 'react-native-mmkv';
import { StorageAdapter } from '../../interfaces/storage.interface';

const mmkvStorage = new MMKV({ id: 'signage-storage' });

export const storageAdapter: StorageAdapter = {
  init: async (): Promise<void> => {},
  getString: (key: string): string | undefined => mmkvStorage.getString(key),
  set: (key: string, value: string): void => {
    mmkvStorage.set(key, value);
  },
  delete: (key: string): void => {
    mmkvStorage.delete(key);
  }
};
