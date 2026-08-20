import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider, useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import Orientation from 'react-native-orientation-locker';
import { AppNavigator } from './app.navigator';
import { RootState, signageStore } from '../store/store';
import { DeviceOrientation } from '../types/app.types';

enableScreens();

NetInfo.configure({
  reachabilityUrl: 'https://clients3.google.com/generate_204',
  reachabilityTest: async response => response.status === 204,
  reachabilityLongTimeout: 60 * 1000,
  reachabilityShortTimeout: 5 * 1000,
  reachabilityRequestTimeout: 15 * 1000,
});

const applyNativeOrientation = (orientation: DeviceOrientation): void => {
  switch (orientation) {
    case 'PORTRAIT':
      Orientation.lockToPortrait();
      break;
    case 'PORTRAIT_FLIP':
      Orientation.lockToPortraitUpsideDown();
      break;
    case 'LANDSCAPE_FLIP':
      Orientation.lockToLandscapeRight();
      break;
    case 'LANDSCAPE':
    default:
      Orientation.lockToLandscapeLeft();
      break;
  }
};

const OrientedApp = (): React.JSX.Element => {
  const orientation = useSelector((state: RootState) => state.device.orientation);

  useEffect(() => {
    if (Platform.isTV) {
      return;
    }

    applyNativeOrientation(orientation);
  }, [orientation]);

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
};

export const SignageApplication = (): React.JSX.Element => {
  return (
    <Provider store={signageStore}>
      <SafeAreaProvider>
        <OrientedApp />
      </SafeAreaProvider>
    </Provider>
  );
};
