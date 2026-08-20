import React, { useEffect, useMemo, useRef } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import WebView from 'react-native-webview';
import { useDispatch, useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import { RootState } from '../../store/store';
import { moveNext, setPlaylist } from '../../store/slices/playlist.slice';
import { setOrientation } from '../../store/slices/device.slice';
import { tvSocketService } from '../../services/socket.service';
import { syncService } from '../../services/sync.service';
import { heartbeatService } from '../../services/heartbeat.service';
import { localPlaylistService } from '../../services/local-playlist.service';
import { DeviceOrientation } from '../../types/app.types';
import { TvRotatedSize, TvRotatedView } from '../../components/common/tv-rotated-view/tv-rotated-view.component';

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
    const stopHeartbeat = heartbeatService.start(deviceId);

    const resync = (): void => {
      if (syncInProgressRef.current) {
        return;
      }

      syncInProgressRef.current = true;
      syncService
        .synchronizeDeviceContent(deviceId)
        .then(({ items: nextItems, orientation }) => {
          dispatch(setPlaylist(nextItems));
          dispatch(setOrientation(orientation));
          localPlaylistService.save(nextItems);
        })
        .catch(() => undefined)
        .finally(() => {
          syncInProgressRef.current = false;
        });
    };

    const applyOrientation = (payload: { deviceId: string; orientation: DeviceOrientation }): void => {
      if (payload.deviceId === deviceId) {
        dispatch(setOrientation(payload.orientation));
      }
    };

    const handleSocketConnect = (): void => {
      socket.emit('joinDeviceRoom', deviceId);
      resync();
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

    socket.on('connect', handleSocketConnect);
    socket.on('contentUpdated', resync);
    socket.on('playlistUpdated', resync);
    socket.on('orientationUpdated', applyOrientation);

    if (socket.connected) {
      handleSocketConnect();
    }

    return () => {
      socket.off('connect', handleSocketConnect);
      socket.off('contentUpdated', resync);
      socket.off('playlistUpdated', resync);
      socket.off('orientationUpdated', applyOrientation);
      stopHeartbeat();
      unsubscribeNetwork();
    };
  }, [deviceId, deviceToken, dispatch]);

  if (!currentItem) {
    return (
      <TvRotatedView>
        {() => (
          <View style={styles.container}>
            <Text style={styles.placeholder}>Waiting for content...</Text>
          </View>
        )}
      </TvRotatedView>
    );
  }

  const renderMedia = (rotatedSize: TvRotatedSize | null): React.JSX.Element => {
    const sizedMediaStyle = rotatedSize ? [styles.media, { flex: undefined, width: rotatedSize.width, height: rotatedSize.height }] : styles.media;

    if (currentItem.type === 'IMAGE') {
      return <Image style={sizedMediaStyle} source={{ uri: `file://${currentItem.localPath}` }} resizeMode="contain" />;
    }

    if (currentItem.type === 'VIDEO') {
      const isSingleItemPlaylist = items.length === 1;
      return (
        <Video
          source={{ uri: `file://${currentItem.localPath}` }}
          style={sizedMediaStyle}
          resizeMode="contain"
          repeat={isSingleItemPlaylist}
          controls={false}
          useTextureView={Platform.isTV}
          onEnd={() => {
            if (!isSingleItemPlaylist) {
              dispatch(moveNext());
            }
          }}
        />
      );
    }

    const webpageUri = currentItem.localPath ? `file://${currentItem.localPath}` : currentItem.url;
    return <WebView source={{ uri: webpageUri }} style={sizedMediaStyle} javaScriptEnabled domStorageEnabled />;
  };

  return <TvRotatedView>{rotatedSize => renderMedia(rotatedSize)}</TvRotatedView>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  media: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  placeholder: {
    color: '#0f172a',
    fontSize: 24
  }
});
