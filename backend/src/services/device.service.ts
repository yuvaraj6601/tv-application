import { DeviceOrientation } from '@prisma/client';
import { prisma } from '../db';
import { piAnalyticsPrisma } from '../db-pi-analytics';
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
        orientation: true,
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
      orientation: device.orientation,
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
        orientation: true,
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
      orientation: device.orientation,
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
  },
  updateOrientation: async (payload: { userId: string; deviceId: string; orientation: DeviceOrientation }): Promise<DeviceOrientation | null> => {
    const device = await prisma.device.findFirst({
      where: { id: payload.deviceId, userId: payload.userId },
      select: { id: true }
    });

    if (!device) {
      return null;
    }

    const updated = await prisma.device.update({
      where: { id: payload.deviceId },
      data: { orientation: payload.orientation },
      select: { orientation: true }
    });

    socketGateway.emitOrientationUpdated(payload.deviceId, updated.orientation);
    return updated.orientation;
  },
  getOrientation: async (deviceId: string): Promise<DeviceOrientation> => {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { orientation: true }
    });

    return device?.orientation || 'PORTRAIT';
  },
  updatePiId: async (payload: { userId: string; deviceId: string; piId: string }): Promise<string | null> => {
    const device = await prisma.device.findFirst({
      where: { id: payload.deviceId, userId: payload.userId },
      select: { id: true, piId: true }
    });

    if (!device) {
      return null;
    }

    const previousPiId = device.piId;

    await prisma.device.update({
      where: { id: payload.deviceId },
      data: { piId: payload.piId },
      select: { id: true }
    });

    if (previousPiId && previousPiId !== payload.piId) {
      await piAnalyticsPrisma.visitor.updateMany({
        where: { piId: previousPiId },
        data: { piId: payload.piId }
      });

      await piAnalyticsPrisma.session.updateMany({
        where: { piId: previousPiId },
        data: { piId: payload.piId }
      });
    }

    return payload.piId;
  }
};
