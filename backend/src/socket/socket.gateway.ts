import { Server } from 'socket.io';

let socketServer: Server | null = null;

export const initializeSocketGateway = (io: Server): void => {
  socketServer = io;
};

export const socketGateway = {
  emitDevicePaired: (deviceId: string): void => {
    socketServer?.to(`device:${deviceId}`).emit('devicePaired', { deviceId });
    socketServer?.to('admin:devices').emit('devicePaired', { deviceId });
  },
  emitContentUpdated: (deviceId: string): void => {
    socketServer?.to(`device:${deviceId}`).emit('contentUpdated', { deviceId });
    socketServer?.to('admin:devices').emit('contentUpdated', { deviceId });
  },
  emitPlaylistUpdated: (deviceId: string): void => {
    socketServer?.to(`device:${deviceId}`).emit('playlistUpdated', { deviceId });
    socketServer?.to('admin:devices').emit('playlistUpdated', { deviceId });
  },
  emitDeviceStatus: (deviceId: string, status: 'ONLINE' | 'OFFLINE'): void => {
    socketServer?.to('admin:devices').emit('deviceStatusChanged', { deviceId, status });
  }
};
