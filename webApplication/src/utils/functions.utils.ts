const MAC_ADDRESS_PATTERN = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

// Matches the Python server's local-dev PI_ID default (see pythonServer/.env.example) — lets a
// device be linked to a locally-running dev instance without a real Pi MAC address.
export const LOCAL_DEV_PI_ID = 'local-dev-test';

// pi_id columns are VARCHAR(17) in the analytics DB (sized for a MAC address).
const PI_ID_MAX_LENGTH = 17;

export const isValidMacAddress = (value: string): boolean => MAC_ADDRESS_PATTERN.test(value);

export const isValidPiId = (value: string): boolean => value.trim().length > 0 && value.trim().length <= PI_ID_MAX_LENGTH;

export const formatWatchTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};
