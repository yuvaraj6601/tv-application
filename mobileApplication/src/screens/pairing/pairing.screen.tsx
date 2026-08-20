import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../app/app.navigator';
import { RootState } from '../../store/store';
import { tvSocketService } from '../../services/socket.service';
import { signageStore } from '../../store/store';
import { setOrientation, setPaired } from '../../store/slices/device.slice';
import { setPlaylist } from '../../store/slices/playlist.slice';
import { syncService } from '../../services/sync.service';
import { heartbeatService } from '../../services/heartbeat.service';
import { localPlaylistService } from '../../services/local-playlist.service';
import { TvRotatedView } from '../../components/common/tv-rotated-view/tv-rotated-view.component';

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
        .then(({ items, orientation }) => {
          signageStore.dispatch(setPlaylist(items));
          signageStore.dispatch(setOrientation(orientation));
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
    <TvRotatedView>
      {() => (
        <View style={styles.container}>
          <Text style={styles.title}>Pair This Device</Text>
          <Text style={styles.code}>{pairingCode || '----'}</Text>
          <Text style={styles.subtitle}>Enter this code in the admin dashboard.</Text>
        </View>
      )}
    </TvRotatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    marginBottom: 20
  },
  code: {
    color: '#16a34a',
    fontSize: 84,
    letterSpacing: 8,
    fontWeight: '700'
  },
  subtitle: {
    marginTop: 16,
    color: '#475569',
    fontSize: 18
  }
});
