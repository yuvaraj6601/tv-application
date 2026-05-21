declare module 'react-native' {
  interface NativeModulesStatic {
    DeviceIdentifierModule?: {
      getDeviceUniqueId: () => Promise<string>;
    };
  }
}

export {};
