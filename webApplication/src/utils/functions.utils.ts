const MAC_ADDRESS_PATTERN = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

// Matches the Python server's local-dev PI_ID default (see pythonServer/.env.example) — lets a
// device be linked to a locally-running dev instance without a real Pi MAC address.
export const LOCAL_DEV_PI_ID = 'local-dev-test';

export const isValidMacAddress = (value: string): boolean => MAC_ADDRESS_PATTERN.test(value);

export const isValidPiId = (value: string): boolean => isValidMacAddress(value) || value === LOCAL_DEV_PI_ID;

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
