import { NativeModules, Platform } from 'react-native';
import { storageAdapter } from '../adapters/storage/storage.adapter';

interface DeviceIdentifierNativeModule {
  getDeviceUniqueId: () => Promise<string>;
}

const DEVICE_ID_KEY = 'device-unique-id';

const MAC_ADDRESS_PATTERN = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

export const isMacAddress = (identifier: string): boolean => MAC_ADDRESS_PATTERN.test(identifier);

const generateFallbackIdentifier = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.floor(Math.random() * 1000000)
    .toString(36)
    .padStart(5, '0');
  return `tv-${timestamp}-${random}`;
};

export const deviceIdentifierService = {
  getDeviceUniqueId: async (): Promise<string> => {
    const cachedIdentifier = storageAdapter.getString(DEVICE_ID_KEY);
    if (cachedIdentifier) {
      return cachedIdentifier;
    }

    if (Platform.OS === 'android') {
      const nativeModule = NativeModules.DeviceIdentifierModule as DeviceIdentifierNativeModule | undefined;
      if (nativeModule?.getDeviceUniqueId) {
        try {
          const nativeIdentifier = await nativeModule.getDeviceUniqueId();
          if (nativeIdentifier && nativeIdentifier.trim().length > 0) {
            storageAdapter.set(DEVICE_ID_KEY, nativeIdentifier);
            return nativeIdentifier;
          }
        } catch (_error) {
          // Fallback to persistent generated identifier.
        }
      }
    }

    const fallbackIdentifier = generateFallbackIdentifier();
    storageAdapter.set(DEVICE_ID_KEY, fallbackIdentifier);
    return fallbackIdentifier;
  }
};
