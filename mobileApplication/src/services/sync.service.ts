import { mobileAxios } from '../utils/axios.utils';
import { DeviceOrientation, PlaylistItemModel } from '../types/app.types';
import { fileCacheUtils } from '../utils/file.cache.utils';

interface RemoteContentItem {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'WEBPAGE';
  url: string;
  localPath: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileData: string | null;
  duration: number | null;
  sortOrder: number;
}

interface RemoteSyncData {
  content: RemoteContentItem[];
  orientation: DeviceOrientation;
}

export interface SynchronizedDeviceContent {
  items: PlaylistItemModel[];
  orientation: DeviceOrientation;
}

export const syncService = {
  synchronizeDeviceContent: async (deviceId: string): Promise<SynchronizedDeviceContent> => {
    const response = await mobileAxios.get<{ status: boolean; data: RemoteSyncData }>(`/api/v1/device/${deviceId}/sync`);

    const payload = response.data.data.content.map<PlaylistItemModel>(item => ({
      id: item.id,
      type: item.type,
      url: item.url,
      localPath: item.localPath || '',
      fileName: item.fileName || undefined,
      fileMimeType: item.fileMimeType || undefined,
      fileData: item.fileData || undefined,
      duration: item.duration || 10,
      order: item.sortOrder
    }));

    const items = await fileCacheUtils.replaceAllContent(payload);
    return { items, orientation: response.data.data.orientation };
  }
};
