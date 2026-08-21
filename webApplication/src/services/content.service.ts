import { dashboardAxios } from '../utils/axios.utils';

export type DashboardContentType = 'IMAGE' | 'VIDEO' | 'WEBPAGE';

export interface DeviceContentItemModel {
  id: string;
  type: DashboardContentType;
  url: string;
  fileName: string | null;
  duration: number | null;
  sortOrder: number;
}

export interface ContentLibraryItemModel {
  id: string;
  type: DashboardContentType;
  url: string;
  fileName: string | null;
  duration: number | null;
}

interface ApiResponseModel<T> {
  status: boolean;
  data: T;
}

export const contentService = {
  list: async (deviceId: string): Promise<DeviceContentItemModel[]> => {
    const response = await dashboardAxios.get<ApiResponseModel<DeviceContentItemModel[]>>(`/api/v1/device/${deviceId}/content`);
    return response.data.data;
  },
  createWebpage: async (deviceId: string, payload: { url: string; order: number; duration: number }): Promise<void> => {
    const body = new FormData();
    body.append('type', 'WEBPAGE');
    body.append('url', payload.url);
    body.append('order', String(payload.order));
    body.append('duration', String(payload.duration));
    await dashboardAxios.post(`/api/v1/device/${deviceId}/content`, body);
  },
  uploadMedia: async (deviceId: string, payload: { type: 'IMAGE' | 'VIDEO'; file: File; order: number; duration?: number }): Promise<void> => {
    const body = new FormData();
    body.append('type', payload.type);
    body.append('order', String(payload.order));
    if (payload.duration) {
      body.append('duration', String(payload.duration));
    }
    body.append('file', payload.file);
    await dashboardAxios.post(`/api/v1/device/${deviceId}/content`, body);
  },
  attachExisting: async (deviceId: string, contentId: string, order: number): Promise<void> => {
    await dashboardAxios.post(`/api/v1/device/${deviceId}/content/attach`, { contentId, order });
  },
  updateDuration: async (deviceId: string, contentId: string, duration: number): Promise<void> => {
    const body = new FormData();
    body.append('duration', String(duration));
    await dashboardAxios.patch(`/api/v1/device/${deviceId}/content/${contentId}`, body);
  },
  remove: async (deviceId: string, contentId: string): Promise<void> => {
    await dashboardAxios.delete(`/api/v1/device/${deviceId}/content/${contentId}`);
  },
  reorder: async (deviceId: string, contentIds: string[]): Promise<void> => {
    await dashboardAxios.put(`/api/v1/device/${deviceId}/content/playlist/order`, {
      contentIds
    });
  },
  listLibrary: async (): Promise<ContentLibraryItemModel[]> => {
    const response = await dashboardAxios.get<ApiResponseModel<ContentLibraryItemModel[]>>('/api/v1/content');
    return response.data.data;
  },
  uploadToLibrary: async (payload: { type: 'IMAGE' | 'VIDEO'; file: File; duration?: number }): Promise<void> => {
    const body = new FormData();
    body.append('type', payload.type);
    if (payload.duration) {
      body.append('duration', String(payload.duration));
    }
    body.append('file', payload.file);
    await dashboardAxios.post('/api/v1/content', body);
  },
  deleteFromLibrary: async (contentId: string): Promise<void> => {
    await dashboardAxios.delete(`/api/v1/content/${contentId}`);
  }
};
