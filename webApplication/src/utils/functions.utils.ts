const MAC_ADDRESS_PATTERN = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

// Matches the Python server's local-dev PI_ID default (see pythonServer/.env.example) — lets a
// device be linked to a locally-running dev instance without a real Pi MAC address.
export const LOCAL_DEV_PI_ID = 'local-dev-test';

// pi_id columns are VARCHAR(17) in the analytics DB (sized for a MAC address).
const PI_ID_MAX_LENGTH = 17;

export const isValidMacAddress = (value: string): boolean => MAC_ADDRESS_PATTERN.test(value);

export const isValidPiId = (value: string): boolean => value.trim().length > 0 && value.trim().length <= PI_ID_MAX_LENGTH;

// Matches backend's deviceNameUpdateValidation (Joi.string().min(2).max(120)).
const DEVICE_NAME_MIN_LENGTH = 2;
const DEVICE_NAME_MAX_LENGTH = 120;

export const isValidDeviceName = (value: string): boolean =>
  value.trim().length >= DEVICE_NAME_MIN_LENGTH && value.trim().length <= DEVICE_NAME_MAX_LENGTH;

const TIMESTAMP_PREFIX_PATTERN = /^\d+-/;

const stripTimestampPrefix = (value: string): string => value.replace(TIMESTAMP_PREFIX_PATTERN, '');

const getUrlBaseName = (url: string): string | null => {
  const [pathOnly] = url.split(/[?#]/);
  const segments = pathOnly.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  return lastSegment ? stripTimestampPrefix(lastSegment) : null;
};

const getUrlHostname = (url: string): string | null => {
  try {
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(normalizedUrl).hostname || null;
  } catch (_error) {
    return null;
  }
};

export const getContentDisplayName = (fileName: string | null, url: string, type: 'IMAGE' | 'VIDEO' | 'WEBPAGE'): string => {
  const trimmedFileName = fileName?.trim();
  if (trimmedFileName) {
    return stripTimestampPrefix(trimmedFileName);
  }

  if (type === 'WEBPAGE') {
    return getUrlHostname(url) || `Untitled ${type}`;
  }

  return getUrlBaseName(url) || `Untitled ${type}`;
};

export const truncateFileName = (fileName: string, maxLength = 12): string => {
  return fileName.length > maxLength ? `${fileName.slice(0, maxLength)}...` : fileName;
};

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
