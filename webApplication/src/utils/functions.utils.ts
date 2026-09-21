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

export const isPreviewableContent = (type: 'IMAGE' | 'VIDEO' | 'WEBPAGE'): boolean => type === 'IMAGE' || type === 'VIDEO';

export interface FilterableContentItem {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'WEBPAGE';
  url: string;
  fileName: string | null;
  createdAt: string;
}

export type ContentTypeFilterValue = 'ALL' | 'IMAGE' | 'VIDEO' | 'WEBPAGE';
export type ContentSortBy = 'NEWEST' | 'OLDEST' | 'NAME';

export interface ContentFilterOptions {
  typeFilter: ContentTypeFilterValue;
  searchTerm: string;
  sortBy: ContentSortBy;
  page: number;
  pageSize: number;
}

export interface PaginatedContentResult<ContentItemType> {
  items: ContentItemType[];
  totalItems: number;
  totalPages: number;
  page: number;
}

export const filterSortAndPaginateContent = <ContentItemType extends FilterableContentItem>(
  items: ContentItemType[],
  { typeFilter, searchTerm, sortBy, page, pageSize }: ContentFilterOptions
): PaginatedContentResult<ContentItemType> => {
  const trimmedSearch = searchTerm.trim().toLowerCase();

  const filtered = items.filter(item => {
    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
    const matchesSearch = !trimmedSearch || getContentDisplayName(item.fileName, item.url, item.type).toLowerCase().includes(trimmedSearch);

    return matchesType && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'NAME') {
      return getContentDisplayName(a.fileName, a.url, a.type).localeCompare(getContentDisplayName(b.fileName, b.url, b.type));
    }

    const aCreatedTime = new Date(a.createdAt).getTime();
    const bCreatedTime = new Date(b.createdAt).getTime();
    return sortBy === 'OLDEST' ? aCreatedTime - bCreatedTime : bCreatedTime - aCreatedTime;
  });

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    items: sorted.slice(startIndex, startIndex + pageSize),
    totalItems,
    totalPages,
    page: safePage
  };
};

export const truncateFileName = (fileName: string, maxLength = 12): string => {
  return fileName.length > maxLength ? `${fileName.slice(0, maxLength)}...` : fileName;
};

export interface FilterableDevice {
  id: string;
  deviceName: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeen: string | null;
}

export type DeviceStatusFilter = 'ALL' | 'ONLINE' | 'OFFLINE';
export type DeviceSortBy = 'LAST_SEEN' | 'NAME';

export interface DeviceFilterOptions {
  statusFilter: DeviceStatusFilter;
  searchTerm: string;
  sortBy: DeviceSortBy;
}

export const filterAndSortDevices = <DeviceType extends FilterableDevice>(
  devices: DeviceType[],
  { statusFilter, searchTerm, sortBy }: DeviceFilterOptions
): DeviceType[] => {
  const trimmedSearch = searchTerm.trim().toLowerCase();

  const filtered = devices.filter(device => {
    const matchesStatus = statusFilter === 'ALL' || device.status === statusFilter;
    const matchesSearch =
      !trimmedSearch || device.deviceName.toLowerCase().includes(trimmedSearch) || device.id.toLowerCase().includes(trimmedSearch);

    return matchesStatus && matchesSearch;
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'NAME') {
      return a.deviceName.localeCompare(b.deviceName);
    }

    const aLastSeenTime = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
    const bLastSeenTime = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
    return bLastSeenTime - aLastSeenTime;
  });
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
