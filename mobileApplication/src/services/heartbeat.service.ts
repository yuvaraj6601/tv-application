import { mobileAxios } from '../utils/axios.utils';

export const heartbeatService = {
  start: (deviceId: string): (() => void) => {
    const interval = setInterval(() => {
      mobileAxios
        .post(`/api/v1/device/${deviceId}/heartbeat`, {
          appVersion: '1.0.0'
        })
        .catch(() => undefined);
    }, Number(process.env.HEARTBEAT_INTERVAL_MS || 30000));

    return () => {
      clearInterval(interval);
    };
  }
};
