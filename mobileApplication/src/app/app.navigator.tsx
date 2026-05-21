import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BootScreen } from '../screens/boot/boot.screen';
import { OfflineScreen } from '../screens/offline/offline.screen';
import { PairingScreen } from '../screens/pairing/pairing.screen';
import { PlayerScreen } from '../screens/player/player.screen';

export type AppStackParamList = {
  Boot: undefined;
  Offline: undefined;
  Pairing: undefined;
  Player: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppNavigator = (): React.JSX.Element => {
  return (
    <Stack.Navigator
      initialRouteName="Boot"
      screenOptions={{
        headerShown: false,
        animation: 'none'
      }}
    >
      <Stack.Screen name="Boot" component={BootScreen} />
      <Stack.Screen name="Offline" component={OfflineScreen} />
      <Stack.Screen name="Pairing" component={PairingScreen} />
      <Stack.Screen name="Player" component={PlayerScreen} />
    </Stack.Navigator>
  );
};
