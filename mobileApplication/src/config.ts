// Update these values to match your backend server.
// Android emulator: use 10.0.2.2 instead of localhost
// Physical device: use your computer's LAN IP (e.g. 192.168.1.100)
const BASE_URL = 'http://192.168.1.8:8080';

export const config = {
  apiBaseUrl: BASE_URL,
  socketUrl: BASE_URL,
  heartbeatIntervalMs: 30_000,
  syncRetryIntervalMs: 10_000,
};
