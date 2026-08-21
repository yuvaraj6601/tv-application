import { describe, expect, it } from 'vitest';
import { formatWatchTime, getContentDisplayName, isValidMacAddress, isValidPiId } from '../utils/functions.utils';

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
