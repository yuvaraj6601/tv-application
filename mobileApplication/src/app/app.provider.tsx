import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider, useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
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

const ROTATION_DEGREES: Record<DeviceOrientation, string> = {
  PORTRAIT: '270deg',
  LANDSCAPE: '0deg',
  PORTRAIT_FLIP: '90deg',
  LANDSCAPE_FLIP: '180deg'
};

const RotatedApp = (): React.JSX.Element => {
  const orientation = useSelector((state: RootState) => state.device.orientation);
  const { width, height } = Dimensions.get('window');
  const rotationDegrees = ROTATION_DEGREES[orientation];
  const isSideways = rotationDegrees === '90deg' || rotationDegrees === '270deg';

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.rotatable,
          {
            width: isSideways ? height : width,
            height: isSideways ? width : height,
            transform: [{ rotate: rotationDegrees }]
          }
        ]}
      >
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </View>
    </View>
  );
};

export const SignageApplication = (): React.JSX.Element => {
  return (
    <Provider store={signageStore}>
      <SafeAreaProvider>
        <RotatedApp />
      </SafeAreaProvider>
    </Provider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  rotatable: {
    backgroundColor: '#ffffff'
  }
});
