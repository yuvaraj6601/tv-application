import { prisma } from '../db';
import { socketGateway } from '../socket/socket.gateway';

export const deviceService = {
  getDeviceList: async (userId: string) => {
    const devices = await prisma.device.findMany({
      where: { userId },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        deviceName: true,
        deviceUniqueId: true,
        isPaired: true,
        status: true,
        lastSeen: true,
        _count: {
          select: {
            contents: true
          }
        },
        heartbeats: {
          orderBy: { seenAt: 'desc' },
          take: 1,
          select: {
            seenAt: true,
            appVersion: true
          }
        }
      }
    });

    return devices.map(device => ({
      id: device.id,
      deviceName: device.deviceName,
      deviceUniqueId: device.deviceUniqueId,
      isPaired: device.isPaired,
      status: device.status,
      lastSeen: device.lastSeen,
      contentCount: device._count.contents,
      lastHeartbeatAt: device.heartbeats[0]?.seenAt || null,
      appVersion: device.heartbeats[0]?.appVersion || null
    }));
  },
  getDeviceById: async (payload: { userId: string; deviceId: string }) => {
    const device = await prisma.device.findFirst({
      where: {
        id: payload.deviceId,
        userId: payload.userId
      },
      select: {
        id: true,
        deviceName: true,
        deviceUniqueId: true,
        isPaired: true,
        status: true,
        lastSeen: true,
        _count: {
          select: {
            contents: true
          }
        },
        heartbeats: {
          orderBy: { seenAt: 'desc' },
          take: 1,
          select: {
            seenAt: true,
            appVersion: true,
            ipAddress: true
          }
        }
      }
    });

    if (!device) {
      return null;
    }

    return {
      id: device.id,
      deviceName: device.deviceName,
      deviceUniqueId: device.deviceUniqueId,
      isPaired: device.isPaired,
      status: device.status,
      lastSeen: device.lastSeen,
      contentCount: device._count.contents,
      lastHeartbeatAt: device.heartbeats[0]?.seenAt || null,
      appVersion: device.heartbeats[0]?.appVersion || null,
      lastHeartbeatIpAddress: device.heartbeats[0]?.ipAddress || null
    };
  },
  heartbeat: async (payload: { deviceId: string; appVersion?: string; ipAddress?: string }): Promise<void> => {
    await prisma.deviceHeartbeat.create({
      data: {
        deviceId: payload.deviceId,
        appVersion: payload.appVersion,
        ipAddress: payload.ipAddress
      }
    });

    await prisma.device.update({
      where: { id: payload.deviceId },
      data: {
        status: 'ONLINE',
        lastSeen: new Date()
      }
    });

    socketGateway.emitDeviceStatus(payload.deviceId, 'ONLINE');
  }
};
