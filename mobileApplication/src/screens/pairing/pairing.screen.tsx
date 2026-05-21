import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../app/app.navigator';
import { RootState } from '../../store/store';
import { tvSocketService } from '../../services/socket.service';
import { signageStore } from '../../store/store';
import { setPaired } from '../../store/slices/device.slice';
import { setPlaylist } from '../../store/slices/playlist.slice';
import { syncService } from '../../services/sync.service';
import { heartbeatService } from '../../services/heartbeat.service';
import { localPlaylistService } from '../../services/local-playlist.service';

type Props = NativeStackScreenProps<AppStackParamList, 'Pairing'>;

export const PairingScreen = ({ navigation }: Props): React.JSX.Element => {
  const pairingCode = useSelector((state: RootState) => state.device.pairingCode);
  const deviceToken = useSelector((state: RootState) => state.device.deviceToken);
  const deviceId = useSelector((state: RootState) => state.device.deviceId);

  useEffect(() => {
    if (!deviceToken || !deviceId) {
      return;
    }

    const socket = tvSocketService.connect(deviceToken);
    socket.emit('joinDeviceRoom', deviceId);
    const stopHeartbeat = heartbeatService.start(deviceId);

    socket.on('devicePaired', () => {
      syncService
        .synchronizeDeviceContent(deviceId)
        .then(items => {
          signageStore.dispatch(setPlaylist(items));
          localPlaylistService.save(items);
          signageStore.dispatch(setPaired(true));
          navigation.replace('Player');
        })
        .catch(() => undefined);
    });

    return () => {
      socket.off('devicePaired');
      stopHeartbeat();
    };
  }, [deviceToken, deviceId, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pair This Device</Text>
      <Text style={styles.code}>{pairingCode || '----'}</Text>
      <Text style={styles.subtitle}>Enter this code in the admin dashboard.</Text>
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
  title: {
    color: '#ffffff',
    fontSize: 24,
    marginBottom: 20
  },
  code: {
    color: '#00ff99',
    fontSize: 84,
    letterSpacing: 8,
    fontWeight: '700'
  },
  subtitle: {
    marginTop: 16,
    color: '#cccccc',
    fontSize: 18
  }
});
