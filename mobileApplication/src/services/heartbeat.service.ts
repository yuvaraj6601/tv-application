import { mobileAxios } from '../utils/axios.utils';
import { config } from '../config';

export const heartbeatService = {
  start: (deviceId: string): (() => void) => {
    const interval = setInterval(() => {
      mobileAxios
        .post(`/api/v1/device/${deviceId}/heartbeat`, {
          appVersion: '1.0.0'
        })
        .catch(() => undefined);
    }, config.heartbeatIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }
};
