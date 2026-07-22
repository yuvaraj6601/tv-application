import React, { useEffect, useMemo, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import WebView from 'react-native-webview';
import { useDispatch, useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import { RootState } from '../../store/store';
import { moveNext, setPlaylist } from '../../store/slices/playlist.slice';
import { tvSocketService } from '../../services/socket.service';
import { syncService } from '../../services/sync.service';
import { heartbeatService } from '../../services/heartbeat.service';
import { localPlaylistService } from '../../services/local-playlist.service';

export const PlayerScreen = (): React.JSX.Element => {
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.playlist.items);
  const currentIndex = useSelector((state: RootState) => state.playlist.currentIndex);
  const deviceId = useSelector((state: RootState) => state.device.deviceId);
  const deviceToken = useSelector((state: RootState) => state.device.deviceToken);
  const syncInProgressRef = useRef<boolean>(false);
  const wasOfflineRef = useRef<boolean>(false);

  const currentItem = useMemo(() => {
    return items[currentIndex] || null;
  }, [items, currentIndex]);

  useEffect(() => {
    if (!currentItem || currentItem.type === 'VIDEO') {
      return;
    }

    const interval = setTimeout(() => {
      dispatch(moveNext());
    }, currentItem.duration * 1000);

    return () => {
      clearTimeout(interval);
    };
  }, [dispatch, currentItem]);

  useEffect(() => {
    if (!deviceToken || !deviceId) {
      return;
    }

    const socket = tvSocketService.connect(deviceToken);
    socket.emit('joinDeviceRoom', deviceId);
    const stopHeartbeat = heartbeatService.start(deviceId);

    const resync = (): void => {
      if (syncInProgressRef.current) {
        return;
      }

      syncInProgressRef.current = true;
      syncService
        .synchronizeDeviceContent(deviceId)
        .then(nextItems => {
          dispatch(setPlaylist(nextItems));
          localPlaylistService.save(nextItems);
        })
        .catch(() => undefined)
        .finally(() => {
          syncInProgressRef.current = false;
        });
    };

    const unsubscribeNetwork = NetInfo.addEventListener(networkState => {
      const isOnline = networkState.isConnected === true &&
        (networkState.isInternetReachable === null || networkState.isInternetReachable === true);
      if (isOnline && wasOfflineRef.current) {
        wasOfflineRef.current = false;
        resync();
      } else if (!isOnline) {
        wasOfflineRef.current = true;
      }
    });

    socket.on('connect', resync);
    socket.on('contentUpdated', resync);
    socket.on('playlistUpdated', resync);

    return () => {
      socket.off('connect', resync);
      socket.off('contentUpdated', resync);
      socket.off('playlistUpdated', resync);
      stopHeartbeat();
      unsubscribeNetwork();
    };
  }, [deviceId, deviceToken, dispatch]);

  if (!currentItem) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Waiting for content...</Text>
      </View>
    );
  }

  if (currentItem.type === 'IMAGE') {
    return <Image style={styles.media} source={{ uri: `file://${currentItem.localPath}` }} resizeMode="contain" />;
  }

  if (currentItem.type === 'VIDEO') {
    return (
      <Video
        source={{ uri: `file://${currentItem.localPath}` }}
        style={styles.media}
        resizeMode="contain"
        repeat={false}
        controls={false}
        onEnd={() => {
          dispatch(moveNext());
        }}
      />
    );
  }

  const webpageUri = currentItem.localPath ? `file://${currentItem.localPath}` : currentItem.url;
  return <WebView source={{ uri: webpageUri }} style={styles.media} javaScriptEnabled domStorageEnabled />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  media: {
    flex: 1,
    backgroundColor: '#000000'
  },
  placeholder: {
    color: '#ffffff',
    fontSize: 24
  }
});
