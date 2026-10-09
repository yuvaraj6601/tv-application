import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { signageStore } from '../src/store/store';
import { setPlaylist } from '../src/store/slices/playlist.slice';
import { setDeviceIdentity, setDeviceToken } from '../src/store/slices/device.slice';
import { PlayerScreen } from '../src/screens/player/player.screen';
import { PlaylistItemModel } from '../src/types/app.types';
import { syncService } from '../src/services/sync.service';

type Handler = (...args: unknown[]) => void;
const handlers: Record<string, Handler> = {};
const mockSocket = {
  connected: false,
  on: jest.fn((event: string, handler: Handler) => {
    handlers[event] = handler;
  }),
  off: jest.fn(),
  emit: jest.fn()
};
const mockVideoProps: Array<Record<string, unknown>> = [];
let mockVideoMounts = 0;

jest.mock('react-native-video', () => {
  const ReactLib = require('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      ReactLib.useEffect(() => {
        mockVideoMounts += 1;
      }, []);
      mockVideoProps.push(props);
      return null;
    }
  };
});
jest.mock('react-native-webview', () => ({ __esModule: true, default: () => null }));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => jest.fn()) }));
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({ set: jest.fn(), getString: jest.fn(), delete: jest.fn() }))
}));
jest.mock('../src/services/socket.service', () => ({ tvSocketService: { connect: jest.fn(() => mockSocket) } }));
jest.mock('../src/services/heartbeat.service', () => ({ heartbeatService: { start: jest.fn(() => jest.fn()) } }));
jest.mock('../src/services/sync.service', () => ({ syncService: { synchronizeDeviceContent: jest.fn() } }));

const video = (id: string, order: number): PlaylistItemModel => ({
  id,
  type: 'VIDEO',
  url: `https://cdn/${id}.mp4`,
  localPath: `/active/${id}-${order}.mp4`,
  duration: 10,
  order
});

const lastVideoProps = (): Record<string, unknown> => mockVideoProps[mockVideoProps.length - 1];
const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('PlayerScreen sync handling', () => {
  const mockSync = syncService.synchronizeDeviceContent as jest.Mock;

  beforeEach(() => {
    mockVideoProps.length = 0;
    mockVideoMounts = 0;
    Object.keys(handlers).forEach(key => delete handlers[key]);
    mockSync.mockReset();
    signageStore.dispatch(setDeviceIdentity({ deviceId: 'dev-1', deviceUniqueId: 'uid-1' }));
    signageStore.dispatch(setDeviceToken('token'));
    signageStore.dispatch(setPlaylist([video('a', 1)]));
  });

  const mountPlayer = (): void => {
    render(
      <Provider store={signageStore}>
        <PlayerScreen />
      </Provider>
    );
  };

  test('remounts the video after a sync even when the first item keeps the same path', async () => {
    mockSync.mockResolvedValueOnce({ items: [video('a', 1), video('b', 2)], orientation: 'LANDSCAPE' });
    mountPlayer();
    const mountsBeforeSync = mockVideoMounts;

    await act(async () => {
      handlers.contentUpdated();
    });
    await flush();

    expect(mockVideoMounts).toBe(mountsBeforeSync + 1);
  });

  test('skips to the next item when the video errors', async () => {
    signageStore.dispatch(setPlaylist([video('a', 1), video('b', 2)]));
    mountPlayer();
    expect(lastVideoProps().source).toEqual({ uri: 'file:///active/a-1.mp4' });

    await act(async () => {
      (lastVideoProps().onError as Handler)({ error: { errorString: 'decode failed' } });
    });

    expect(lastVideoProps().source).toEqual({ uri: 'file:///active/b-2.mp4' });
  });

  test('runs one more sync when an update arrives while a sync is in flight', async () => {
    let finishFirst: (value: unknown) => void = () => undefined;
    mockSync.mockImplementationOnce(() => new Promise(resolve => (finishFirst = resolve)));
    mockSync.mockResolvedValue({ items: [video('a', 1), video('b', 2)], orientation: 'LANDSCAPE' });
    mountPlayer();

    await act(async () => {
      handlers.contentUpdated();
      handlers.contentUpdated();
    });
    expect(mockSync).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishFirst({ items: [video('a', 1)], orientation: 'LANDSCAPE' });
    });
    await flush();

    expect(mockSync).toHaveBeenCalledTimes(2);
  });
});
