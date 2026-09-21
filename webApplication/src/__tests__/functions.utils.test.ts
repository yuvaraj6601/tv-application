import { describe, expect, it } from 'vitest';
import {
  FilterableContentItem,
  FilterableDevice,
  filterAndSortDevices,
  filterSortAndPaginateContent,
  formatWatchTime,
  getContentDisplayName,
  isPreviewableContent,
  isValidMacAddress,
  isValidPiId
} from '../utils/functions.utils';

describe('isValidMacAddress', () => {
  it('happy path — accepts a well-formed MAC address', () => {
    expect(isValidMacAddress('b8:27:eb:11:11:11')).toBe(true);
  });

  it('happy path — accepts uppercase hex digits', () => {
    expect(isValidMacAddress('B8:27:EB:11:11:11')).toBe(true);
  });

  it('validation failure — rejects a malformed value', () => {
    expect(isValidMacAddress('not-a-mac')).toBe(false);
  });

  it('validation failure — rejects an empty string', () => {
    expect(isValidMacAddress('')).toBe(false);
  });

  it('boundary — rejects a MAC address missing a segment', () => {
    expect(isValidMacAddress('b8:27:eb:11:11')).toBe(false);
  });

  it('boundary — rejects a MAC address with an extra segment', () => {
    expect(isValidMacAddress('b8:27:eb:11:11:11:11')).toBe(false);
  });

  it('boundary — rejects a MAC address using dashes instead of colons', () => {
    expect(isValidMacAddress('b8-27-eb-11-11-11')).toBe(false);
  });
});

describe('isValidPiId', () => {
  it('happy path — accepts a well-formed MAC address', () => {
    expect(isValidPiId('b8:27:eb:11:11:11')).toBe(true);
  });

  it('happy path — accepts the local-dev-test literal', () => {
    expect(isValidPiId('local-dev-test')).toBe(true);
  });

  it('happy path — accepts an arbitrary non-MAC value within the length limit', () => {
    expect(isValidPiId('test')).toBe(true);
  });

  it('validation failure — rejects an empty string', () => {
    expect(isValidPiId('')).toBe(false);
  });

  it('validation failure — rejects a value made only of whitespace', () => {
    expect(isValidPiId('   ')).toBe(false);
  });

  it('boundary — rejects a value longer than 17 characters', () => {
    expect(isValidPiId('this-value-is-too-long')).toBe(false);
  });

  it('boundary — accepts a value exactly 17 characters long', () => {
    expect(isValidPiId('12345678901234567')).toBe(true);
  });
});

describe('formatWatchTime', () => {
  it('happy path — formats seconds under a minute', () => {
    expect(formatWatchTime(45)).toBe('45s');
  });

  it('happy path — formats minutes and seconds', () => {
    expect(formatWatchTime(125)).toBe('2m 5s');
  });

  it('happy path — formats hours and minutes', () => {
    expect(formatWatchTime(3725)).toBe('1h 2m');
  });

  it('boundary — zero seconds', () => {
    expect(formatWatchTime(0)).toBe('0s');
  });

  it('boundary — exactly one minute has no leftover seconds shown', () => {
    expect(formatWatchTime(60)).toBe('1m 0s');
  });

  it('boundary — exactly one hour has no leftover minutes shown', () => {
    expect(formatWatchTime(3600)).toBe('1h 0m');
  });
});

describe('getContentDisplayName', () => {
  it('happy path — returns the fileName as-is when present', () => {
    expect(getContentDisplayName('sunset.jpg', 'https://cdn.example.com/uploads/device-1/1699999999-sunset.jpg', 'IMAGE')).toBe('sunset.jpg');
  });

  it('happy path — strips a timestamp prefix from the fileName', () => {
    expect(getContentDisplayName('1699999999-sunset.jpg', 'https://cdn.example.com/uploads/device-1/1699999999-sunset.jpg', 'IMAGE')).toBe(
      'sunset.jpg'
    );
  });

  it('fallback — derives a name from the URL when fileName is null', () => {
    expect(getContentDisplayName(null, 'https://cdn.example.com/uploads/device-1/1699999999-poster.png', 'IMAGE')).toBe('poster.png');
  });

  it('fallback — uses the hostname for a WEBPAGE type with no fileName', () => {
    expect(getContentDisplayName(null, 'https://example.com/landing-page', 'WEBPAGE')).toBe('example.com');
  });

  it('boundary — returns a generic label when neither fileName nor a usable URL segment exists', () => {
    expect(getContentDisplayName(null, '', 'IMAGE')).toBe('Untitled IMAGE');
  });

  it('boundary — empty-string fileName is treated as missing, falls back to the URL', () => {
    expect(getContentDisplayName('', 'https://cdn.example.com/uploads/device-1/clip.mp4', 'VIDEO')).toBe('clip.mp4');
  });
});

describe('filterAndSortDevices', () => {
  const devices: FilterableDevice[] = [
    { id: 'device-1', deviceName: 'Lobby Screen', status: 'ONLINE', lastSeen: '2026-09-20T10:00:00.000Z' },
    { id: 'device-2', deviceName: 'Kitchen Display', status: 'OFFLINE', lastSeen: '2026-09-21T09:00:00.000Z' },
    { id: 'device-3', deviceName: 'Warehouse Board', status: 'ONLINE', lastSeen: null }
  ];

  it('happy path — status filter ONLINE returns only online devices', () => {
    const result = filterAndSortDevices(devices, { statusFilter: 'ONLINE', searchTerm: '', sortBy: 'LAST_SEEN' });
    expect(result.map(device => device.id)).toEqual(['device-1', 'device-3']);
  });

  it('happy path — status filter OFFLINE returns only offline devices', () => {
    const result = filterAndSortDevices(devices, { statusFilter: 'OFFLINE', searchTerm: '', sortBy: 'LAST_SEEN' });
    expect(result.map(device => device.id)).toEqual(['device-2']);
  });

  it('happy path — search matches by device name, case-insensitively', () => {
    const result = filterAndSortDevices(devices, { statusFilter: 'ALL', searchTerm: 'kitchen', sortBy: 'LAST_SEEN' });
    expect(result.map(device => device.id)).toEqual(['device-2']);
  });

  it('happy path — search matches by device id', () => {
    const result = filterAndSortDevices(devices, { statusFilter: 'ALL', searchTerm: 'device-3', sortBy: 'LAST_SEEN' });
    expect(result.map(device => device.id)).toEqual(['device-3']);
  });

  it('happy path — sorts by last seen, most recent first, with null last-seen treated as oldest', () => {
    const result = filterAndSortDevices(devices, { statusFilter: 'ALL', searchTerm: '', sortBy: 'LAST_SEEN' });
    expect(result.map(device => device.id)).toEqual(['device-2', 'device-1', 'device-3']);
  });

  it('happy path — sorts by name alphabetically', () => {
    const result = filterAndSortDevices(devices, { statusFilter: 'ALL', searchTerm: '', sortBy: 'NAME' });
    expect(result.map(device => device.id)).toEqual(['device-2', 'device-1', 'device-3']);
  });

  it('boundary — no matches returns an empty array', () => {
    const result = filterAndSortDevices(devices, { statusFilter: 'ALL', searchTerm: 'nonexistent', sortBy: 'LAST_SEEN' });
    expect(result).toEqual([]);
  });

  it('boundary — whitespace-only search term is treated as no search', () => {
    const result = filterAndSortDevices(devices, { statusFilter: 'ALL', searchTerm: '   ', sortBy: 'LAST_SEEN' });
    expect(result).toHaveLength(3);
  });
});

describe('filterSortAndPaginateContent', () => {
  const items: FilterableContentItem[] = [
    { id: 'content-1', type: 'IMAGE', url: 'https://cdn.example.com/sunset.jpg', fileName: 'sunset.jpg', createdAt: '2026-09-18T10:00:00.000Z' },
    { id: 'content-2', type: 'VIDEO', url: 'https://cdn.example.com/clip.mp4', fileName: 'clip.mp4', createdAt: '2026-09-20T10:00:00.000Z' },
    { id: 'content-3', type: 'VIDEO', url: 'https://cdn.example.com/promo.mp4', fileName: 'promo.mp4', createdAt: '2026-09-19T10:00:00.000Z' }
  ];

  it('happy path — type filter VIDEO returns only videos', () => {
    const result = filterSortAndPaginateContent(items, { typeFilter: 'VIDEO', searchTerm: '', sortBy: 'NEWEST', page: 1, pageSize: 10 });
    expect(result.items.map(item => item.id)).toEqual(['content-2', 'content-3']);
    expect(result.totalItems).toBe(2);
  });

  it('happy path — search matches by display file name, case-insensitively', () => {
    const result = filterSortAndPaginateContent(items, { typeFilter: 'ALL', searchTerm: 'PROMO', sortBy: 'NEWEST', page: 1, pageSize: 10 });
    expect(result.items.map(item => item.id)).toEqual(['content-3']);
  });

  it('happy path — sorts NEWEST first by default', () => {
    const result = filterSortAndPaginateContent(items, { typeFilter: 'ALL', searchTerm: '', sortBy: 'NEWEST', page: 1, pageSize: 10 });
    expect(result.items.map(item => item.id)).toEqual(['content-2', 'content-3', 'content-1']);
  });

  it('happy path — sorts OLDEST first', () => {
    const result = filterSortAndPaginateContent(items, { typeFilter: 'ALL', searchTerm: '', sortBy: 'OLDEST', page: 1, pageSize: 10 });
    expect(result.items.map(item => item.id)).toEqual(['content-1', 'content-3', 'content-2']);
  });

  it('happy path — sorts by name alphabetically', () => {
    const result = filterSortAndPaginateContent(items, { typeFilter: 'ALL', searchTerm: '', sortBy: 'NAME', page: 1, pageSize: 10 });
    expect(result.items.map(item => item.id)).toEqual(['content-2', 'content-3', 'content-1']);
  });

  it('happy path — paginates results and reports total pages', () => {
    const result = filterSortAndPaginateContent(items, { typeFilter: 'ALL', searchTerm: '', sortBy: 'NEWEST', page: 1, pageSize: 2 });
    expect(result.items.map(item => item.id)).toEqual(['content-2', 'content-3']);
    expect(result.totalItems).toBe(3);
    expect(result.totalPages).toBe(2);
  });

  it('happy path — returns the second page', () => {
    const result = filterSortAndPaginateContent(items, { typeFilter: 'ALL', searchTerm: '', sortBy: 'NEWEST', page: 2, pageSize: 2 });
    expect(result.items.map(item => item.id)).toEqual(['content-1']);
    expect(result.page).toBe(2);
  });

  it('boundary — no matches returns an empty page with totalPages of 1', () => {
    const result = filterSortAndPaginateContent(items, { typeFilter: 'ALL', searchTerm: 'nonexistent', sortBy: 'NEWEST', page: 1, pageSize: 10 });
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(1);
  });

  it('boundary — a page beyond the last page clamps to the last page', () => {
    const result = filterSortAndPaginateContent(items, { typeFilter: 'ALL', searchTerm: '', sortBy: 'NEWEST', page: 99, pageSize: 2 });
    expect(result.page).toBe(2);
    expect(result.items.map(item => item.id)).toEqual(['content-1']);
  });
});

describe('isPreviewableContent', () => {
  it('happy path — IMAGE can be previewed', () => {
    expect(isPreviewableContent('IMAGE')).toBe(true);
  });

  it('happy path — VIDEO can be previewed', () => {
    expect(isPreviewableContent('VIDEO')).toBe(true);
  });

  it('boundary — WEBPAGE cannot be previewed (opened externally instead)', () => {
    expect(isPreviewableContent('WEBPAGE')).toBe(false);
  });
});
