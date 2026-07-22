import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../app/app.navigator';
import { localPlaylistService } from '../../services/local-playlist.service';
import { signageStore } from '../../store/store';
import { setPlaylist } from '../../store/slices/playlist.slice';
import { setPaired } from '../../store/slices/device.slice';

type Props = NativeStackScreenProps<AppStackParamList, 'Offline'>;

export const OfflineScreen = ({ navigation }: Props): React.JSX.Element => {
  const [state, setState] = useState({ retryCount: 0, isConnected: false, checking: false });

  const checkConnection = (): void => {
    setState(prev => ({ ...prev, checking: true }));
    NetInfo.fetch().then(networkState => {
      const connected = networkState.isConnected === true &&
        (networkState.isInternetReachable === null || networkState.isInternetReachable === true);
      setState(prev => ({ ...prev, isConnected: connected, checking: false }));
      if (connected) {
        navigation.replace('Boot');
      }
    });
  };

  useEffect(() => {
    const offlinePlaylist = localPlaylistService.get();
    if (offlinePlaylist.length > 0) {
      signageStore.dispatch(setPlaylist(offlinePlaylist));
      signageStore.dispatch(setPaired(true));
      navigation.replace('Player');
      return;
    }

    const interval = setInterval(() => {
      setState(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));
      NetInfo.fetch().then(networkState => {
        const connected = networkState.isConnected === true &&
          (networkState.isInternetReachable === null || networkState.isInternetReachable === true);
        setState(prev => ({ ...prev, isConnected: connected }));
        if (connected) {
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
      <Text style={styles.subtitle}>Retrying... attempt #{state.retryCount}</Text>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, state.isConnected ? styles.dotOnline : styles.dotOffline]} />
        <Text style={[styles.statusText, state.isConnected ? styles.textOnline : styles.textOffline]}>
          {state.isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, state.checking && styles.buttonDisabled]}
        onPress={checkConnection}
        disabled={state.checking}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>
          {state.checking ? 'Checking...' : 'Check Connection'}
        </Text>
      </TouchableOpacity>
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
    fontSize: 18,
    marginBottom: 32
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  dotOnline: {
    backgroundColor: '#22c55e'
  },
  dotOffline: {
    backgroundColor: '#ef4444'
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600'
  },
  textOnline: {
    color: '#22c55e'
  },
  textOffline: {
    color: '#ef4444'
  },
  button: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600'
  }
});
