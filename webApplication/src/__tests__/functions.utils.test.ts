import { describe, expect, it } from 'vitest';
import { formatWatchTime, isValidMacAddress, isValidPiId } from '../utils/functions.utils';

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

  it('validation failure — rejects a malformed value that is not the local-dev literal', () => {
    expect(isValidPiId('not-a-mac')).toBe(false);
  });

  it('boundary — rejects a near-miss of the local-dev literal', () => {
    expect(isValidPiId('local-dev-test-2')).toBe(false);
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
