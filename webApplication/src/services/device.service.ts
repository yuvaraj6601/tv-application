import { dashboardAxios } from '../utils/axios.utils';
import { DeviceSummary } from '../store/slices/devices.slice';

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
}

export interface TestingPairingCodeModel {
  id: string;
  deviceName: string;
  pairingCode: string | null;
  updatedAt: string;
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
  getTestingPairingCodes: async (): Promise<TestingPairingCodeModel[]> => {
    const response = await dashboardAxios.get<ApiResponseModel<TestingPairingCodeModel[]>>('/api/v1/device/testing/pairing-codes');
    return response.data.data;
  },
  generateTestingPairingCodes: async (count = 5): Promise<TestingPairingCodeModel[]> => {
    const response = await dashboardAxios.post<ApiResponseModel<TestingPairingCodeModel[]>>('/api/v1/device/testing/pairing-codes/generate', {
      count
    });
    return response.data.data;
  },
  pairByCode: async (pairingCode: string): Promise<void> => {
    await dashboardAxios.post('/api/v1/device/pair/confirm', {
      pairingCode
    });
  }
};
