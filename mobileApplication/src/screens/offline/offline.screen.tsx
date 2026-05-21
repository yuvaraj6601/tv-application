import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../app/app.navigator';
import { localPlaylistService } from '../../services/local-playlist.service';
import { signageStore } from '../../store/store';
import { setPlaylist } from '../../store/slices/playlist.slice';
import { setPaired } from '../../store/slices/device.slice';

type Props = NativeStackScreenProps<AppStackParamList, 'Offline'>;

export const OfflineScreen = ({ navigation }: Props): React.JSX.Element => {
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    const offlinePlaylist = localPlaylistService.get();
    if (offlinePlaylist.length > 0) {
      signageStore.dispatch(setPlaylist(offlinePlaylist));
      signageStore.dispatch(setPaired(true));
      navigation.replace('Player');
      return;
    }

    const interval = setInterval(() => {
      setRetryCount(previous => previous + 1);

      NetInfo.fetch().then(state => {
        if (state.isConnected && state.isInternetReachable) {
          navigation.replace('Boot');
        }
      });
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>No Internet Connection</Text>
      <Text style={styles.subtitle}>Retrying... attempt #{retryCount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    marginBottom: 8
  },
  subtitle: {
    color: '#bfbfbf',
    fontSize: 18
  }
});
