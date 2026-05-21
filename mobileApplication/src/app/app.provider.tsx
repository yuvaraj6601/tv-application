import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { AppNavigator } from './app.navigator';
import { signageStore } from '../store/store';

export const SignageApplication = (): React.JSX.Element => {
  return (
    <Provider store={signageStore}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </Provider>
  );
};
