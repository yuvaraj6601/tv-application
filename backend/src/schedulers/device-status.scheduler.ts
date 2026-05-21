import { prisma } from '../db';
import { socketGateway } from '../socket/socket.gateway';

const reconcileOfflineDevices = async (): Promise<void> => {
  const offlineThresholdMs = Number(process.env.DEVICE_OFFLINE_THRESHOLD_MS || 120000);
  const cutoffTime = new Date(Date.now() - offlineThresholdMs);

  const staleOnlineDevices = await prisma.device.findMany({
    where: {
      status: 'ONLINE',
      OR: [{ lastSeen: { lt: cutoffTime } }, { lastSeen: null }]
    },
    select: {
      id: true
    }
  });

  if (staleOnlineDevices.length === 0) {
    return;
  }

  await prisma.device.updateMany({
    where: {
      id: {
        in: staleOnlineDevices.map(device => device.id)
      }
    },
    data: {
      status: 'OFFLINE'
    }
  });

  for (const device of staleOnlineDevices) {
    socketGateway.emitDeviceStatus(device.id, 'OFFLINE');
  }
};

export const startDeviceStatusScheduler = (): void => {
  const intervalMs = Number(process.env.DEVICE_STATUS_RECONCILE_INTERVAL_MS || 30000);

  setInterval(() => {
    reconcileOfflineDevices().catch(() => undefined);
  }, intervalMs);
};
