import { mobileAxios } from '../utils/axios.utils';
import { DeviceOrientation } from '../types/app.types';

interface RegisterDevicePayload {
  deviceName: string;
  deviceUniqueId: string;
}

interface RegisterDeviceResponse {
  deviceId: string;
  pairingCode: string | null;
  deviceToken: string;
  isPaired: boolean;
  orientation: DeviceOrientation;
}

interface RegisterDeviceApiResponse {
  status: boolean;
  message: string;
  data: RegisterDeviceResponse;
}

export const pairingService = {
  registerDevice: async (payload: RegisterDevicePayload): Promise<RegisterDeviceResponse> => {
    const response = await mobileAxios.post<RegisterDeviceApiResponse>('/api/v1/device/register', payload);
    return response.data.data;
  }
};
