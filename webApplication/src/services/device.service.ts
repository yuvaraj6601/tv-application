import { dashboardAxios } from '../utils/axios.utils';
import { DeviceSummary } from '../store/slices/devices.slice';
import { DeviceAnalyticsModel } from '../interfaces/pi-analytics.interface';

export type DeviceOrientation = 'PORTRAIT' | 'LANDSCAPE' | 'PORTRAIT_FLIP' | 'LANDSCAPE_FLIP';

interface ApiResponseModel<T> {
  status: boolean;
  data: T;
}

export interface DeviceDetailModel {
  id: string;
  deviceName: string;
  deviceUniqueId: string;
  isPaired: boolean;
  status: 'ONLINE' | 'OFFLINE';
  lastSeen: string | null;
  contentCount: number;
  lastHeartbeatAt: string | null;
  appVersion: string | null;
  lastHeartbeatIpAddress: string | null;
  orientation: DeviceOrientation;
}

export const deviceService = {
  list: async (): Promise<DeviceSummary[]> => {
    const response = await dashboardAxios.get<ApiResponseModel<DeviceSummary[]>>('/api/v1/device');
    return response.data.data;
  },
  getById: async (deviceId: string): Promise<DeviceDetailModel> => {
    const response = await dashboardAxios.get<ApiResponseModel<DeviceDetailModel>>(`/api/v1/device/${deviceId}`);
    return response.data.data;
  },
  pairByCode: async (pairingCode: string): Promise<void> => {
    await dashboardAxios.post('/api/v1/device/pair/confirm', {
      pairingCode
    });
  },
  updateOrientation: async (deviceId: string, orientation: DeviceOrientation): Promise<void> => {
    await dashboardAxios.patch(`/api/v1/device/${deviceId}/orientation`, { orientation });
  },
  updatePiId: async (deviceId: string, piId: string): Promise<string> => {
    const response = await dashboardAxios.patch<ApiResponseModel<{ piId: string }>>(`/api/v1/device/${deviceId}/pi-id`, {
      piId
    });
    return response.data.data.piId;
  },
  getAnalytics: async (deviceId: string): Promise<DeviceAnalyticsModel | null> => {
    const response = await dashboardAxios.get<ApiResponseModel<DeviceAnalyticsModel | null>>(`/api/v1/device/${deviceId}/analytics`);
    return response.data.data;
  }
};
