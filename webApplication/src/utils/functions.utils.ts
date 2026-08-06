const MAC_ADDRESS_PATTERN = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

export const isValidMacAddress = (value: string): boolean => MAC_ADDRESS_PATTERN.test(value);

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
