import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { AppNavigator } from './app.navigator';
import { signageStore } from '../store/store';

enableScreens();

NetInfo.configure({
  reachabilityUrl: 'https://clients3.google.com/generate_204',
  reachabilityTest: async response => response.status === 204,
  reachabilityLongTimeout: 60 * 1000,
  reachabilityShortTimeout: 5 * 1000,
  reachabilityRequestTimeout: 15 * 1000,
});

export const SignageApplication = (): React.JSX.Element => {
  return (
    <Provider store={signageStore}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
};
