import { DeviceOrientation } from '@prisma/client';
import { prisma } from '../db';
import { jwtHelper } from '../helpers/jwt.helper';

const generatePairingCode = (): string => {
  const random = Math.floor(1000 + Math.random() * 9000);
  return String(random);
};

export const pairingService = {
  registerDevice: async (
    payload: { deviceName: string; deviceUniqueId: string }
  ): Promise<{ deviceId: string; pairingCode: string | null; deviceToken: string; isPaired: boolean; orientation: DeviceOrientation }> => {
    const existingDevice = await prisma.device.findUnique({
      where: { deviceUniqueId: payload.deviceUniqueId }
    });

    let deviceId = existingDevice?.id || '';
    let isPaired = existingDevice?.isPaired || false;
    let orientation = existingDevice?.orientation || 'PORTRAIT';
    let nextPairingCode: string | null = null;

    if (!existingDevice) {
      const pairingCode = generatePairingCode();
      const newDevice = await prisma.device.create({
        data: {
          deviceName: payload.deviceName,
          deviceUniqueId: payload.deviceUniqueId,
          pairingCode,
          isPaired: false,
          status: 'ONLINE',
          lastSeen: new Date()
        }
      });
      deviceId = newDevice.id;
      isPaired = newDevice.isPaired;
      orientation = newDevice.orientation;
      nextPairingCode = pairingCode;
    } else if (!existingDevice.isPaired) {
      const pairingCode = generatePairingCode();
      const updatedDevice = await prisma.device.update({
        where: { id: existingDevice.id },
        data: {
          deviceName: payload.deviceName,
          pairingCode,
          status: 'ONLINE',
          lastSeen: new Date()
        }
      });
      deviceId = updatedDevice.id;
      isPaired = updatedDevice.isPaired;
      orientation = updatedDevice.orientation;
      nextPairingCode = pairingCode;
    } else {
      await prisma.device.update({
        where: { id: existingDevice.id },
        data: {
          deviceName: payload.deviceName,
          status: 'ONLINE',
          lastSeen: new Date()
        }
      });
      deviceId = existingDevice.id;
      isPaired = true;
    }

    const deviceToken = jwtHelper.sign({
      sub: deviceId,
      role: 'DEVICE'
    });

    await prisma.device.update({
      where: { id: deviceId },
      data: { token: deviceToken }
    });

    return {
      deviceId,
      pairingCode: nextPairingCode,
      deviceToken,
      isPaired,
      orientation
    };
  },
  pairDevice: async (payload: { pairingCode: string; userId: string }): Promise<string> => {
    const device = await prisma.device.findFirst({
      where: {
        pairingCode: payload.pairingCode
      }
    });

    if (!device) {
      throw new Error('Invalid pairing code');
    }

    await prisma.device.update({
      where: { id: device.id },
      data: {
        userId: payload.userId,
        isPaired: true,
        pairingCode: null
      }
    });
    return device.id;
  },
  getByPairingCode: async (pairingCode: string) => {
    return prisma.device.findFirst({
      where: { pairingCode }
    });
  }
};
