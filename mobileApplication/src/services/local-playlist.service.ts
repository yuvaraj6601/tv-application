import { storageAdapter } from '../adapters/storage/storage.adapter';
import { PlaylistItemModel } from '../types/app.types';

const PLAYLIST_KEY = 'active-playlist';

export const localPlaylistService = {
  save: (items: PlaylistItemModel[]): void => {
    storageAdapter.set(PLAYLIST_KEY, JSON.stringify(items));
  },
  get: (): PlaylistItemModel[] => {
    const raw = storageAdapter.getString(PLAYLIST_KEY);
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
    storageAdapter.delete(PLAYLIST_KEY);
  }
};
