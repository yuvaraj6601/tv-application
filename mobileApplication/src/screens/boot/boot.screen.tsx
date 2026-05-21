import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../app/app.navigator';
import { pairingService } from '../../services/pairing.service';
import { signageStore } from '../../store/store';
import { setBootstrapped, setOnlineStatus } from '../../store/slices/app.slice';
import { setDeviceIdentity, setDeviceToken, setPairingCode, setPaired } from '../../store/slices/device.slice';
import { syncService } from '../../services/sync.service';
import { setPlaylist } from '../../store/slices/playlist.slice';
import { deviceIdentifierService } from '../../services/device-identifier.service';
import { localPlaylistService } from '../../services/local-playlist.service';

type Props = NativeStackScreenProps<AppStackParamList, 'Boot'>;

export const BootScreen = ({ navigation }: Props): React.JSX.Element => {
  useEffect(() => {
    const bootstrapApplication = async (): Promise<void> => {
      const networkState = await NetInfo.fetch();
      const hasInternet = Boolean(networkState.isConnected && networkState.isInternetReachable);
      signageStore.dispatch(setOnlineStatus(hasInternet));

      if (!hasInternet) {
        const offlinePlaylist = localPlaylistService.get();
        if (offlinePlaylist.length > 0) {
          signageStore.dispatch(setPlaylist(offlinePlaylist));
          signageStore.dispatch(setPaired(true));
          navigation.replace('Player');
          return;
        }

        navigation.replace('Offline');
        return;
      }

      const deviceUniqueId = await deviceIdentifierService.getDeviceUniqueId();

      const registerResponse = await pairingService.registerDevice({
        deviceName: 'Android TV Device',
        deviceUniqueId
      });

      signageStore.dispatch(
        setDeviceIdentity({
          deviceId: registerResponse.deviceId,
          deviceUniqueId
        })
      );
      signageStore.dispatch(setPairingCode(registerResponse.pairingCode));
      signageStore.dispatch(setDeviceToken(registerResponse.deviceToken));
      signageStore.dispatch(setPaired(registerResponse.isPaired));
      signageStore.dispatch(setBootstrapped(true));

      if (registerResponse.isPaired) {
        const contentItems = await syncService.synchronizeDeviceContent(registerResponse.deviceId);
        signageStore.dispatch(setPlaylist(contentItems));
        localPlaylistService.save(contentItems);
        navigation.replace('Player');
        return;
      }

      navigation.replace('Pairing');
    };

    bootstrapApplication().catch(() => {
      const offlinePlaylist = localPlaylistService.get();
      if (offlinePlaylist.length > 0) {
        signageStore.dispatch(setPlaylist(offlinePlaylist));
        signageStore.dispatch(setPaired(true));
        navigation.replace('Player');
        return;
      }

      navigation.replace('Offline');
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={styles.text}>Initializing signage player...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  text: {
    marginTop: 12,
    color: '#ffffff',
    fontSize: 20
  }
});
