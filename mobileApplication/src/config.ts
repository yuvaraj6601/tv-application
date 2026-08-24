// Update these values to match your backend server.
// Android emulator: use 10.0.2.2 instead of localhost
// Physical device: use your computer's LAN IP (e.g. 192.168.1.100)

// Prefer explicit env var names; provide sensible fallbacks for local/dev.
const API_BASE_URL = 'https://api-spatiabox.alterside.io';

const SOCKET_URL = API_BASE_URL;

export const config = {
  apiBaseUrl: API_BASE_URL,
  socketUrl: SOCKET_URL,
  heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS) || 30_000,
  syncRetryIntervalMs: Number(process.env.SYNC_RETRY_INTERVAL_MS) || 10_000,
};
