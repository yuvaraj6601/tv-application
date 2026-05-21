import { MMKV } from 'react-native-mmkv';
import { PlaylistItemModel } from '../types/app.types';

const storage = new MMKV({
  id: 'signage-storage'
});

const PLAYLIST_KEY = 'active-playlist';

export const localPlaylistService = {
  save: (items: PlaylistItemModel[]): void => {
    storage.set(PLAYLIST_KEY, JSON.stringify(items));
  },
  get: (): PlaylistItemModel[] => {
    const raw = storage.getString(PLAYLIST_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as PlaylistItemModel[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed;
    } catch (_error) {
      return [];
    }
  },
  clear: (): void => {
    storage.delete(PLAYLIST_KEY);
  }
};
