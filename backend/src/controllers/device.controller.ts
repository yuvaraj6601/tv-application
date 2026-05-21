import { Request, Response } from 'express';
import { pairingService } from '../services/pairing.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { deviceService } from '../services/device.service';
import { contentService } from '../services/content.service';
import { socketGateway } from '../socket/socket.gateway';

const getParamValue = (value: string | string[] | undefined): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return '';
};

export const deviceController = {
  register: async (req: Request, res: Response): Promise<void> => {
    const response = await pairingService.registerDevice(req.body);
    res.status(200).json({
      status: true,
      message: 'Device registered successfully',
      data: response
    });
  },
  pairByCode: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ status: false, message: 'Unauthorized' });
      return;
    }

    const deviceId = await pairingService.pairDevice({
      pairingCode: req.body.pairingCode,
      userId: req.auth.sub
    });
    socketGateway.emitDevicePaired(deviceId);

    res.status(200).json({
      status: true,
      message: 'Device paired successfully'
    });
  },
  getList: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ status: false, message: 'Unauthorized' });
      return;
    }

    const devices = await deviceService.getDeviceList(req.auth.sub);
    res.status(200).json({
      status: true,
      data: devices
    });
  },
  getTestingPairingCodes: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ status: false, message: 'Unauthorized' });
      return;
    }

    const codes = await deviceService.getTestingPairingCodes();
    res.status(200).json({
      status: true,
      data: codes
    });
  },
  generateTestingPairingCodes: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ status: false, message: 'Unauthorized' });
      return;
    }

    const countFromBody = Number(req.body.count || 5);
    const codes = await deviceService.generateTestingPairingCodes(countFromBody);
    res.status(201).json({
      status: true,
      message: 'Testing verification codes generated',
      data: codes
    });
  },
  getById: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ status: false, message: 'Unauthorized' });
      return;
    }

    const device = await deviceService.getDeviceById({
      userId: req.auth.sub,
      deviceId: getParamValue(req.params.deviceId)
    });

    if (!device) {
      res.status(404).json({
        status: false,
        message: 'Device not found'
      });
      return;
    }

    res.status(200).json({
      status: true,
      data: device
    });
  },
  heartbeat: async (req: Request, res: Response): Promise<void> => {
    await deviceService.heartbeat({
      deviceId: getParamValue(req.params.deviceId),
      appVersion: req.body.appVersion,
      ipAddress: req.ip
    });

    res.status(200).json({
      status: true,
      message: 'Heartbeat recorded'
    });
  },
  syncContent: async (req: Request, res: Response): Promise<void> => {
    const content = await contentService.getByDeviceId(getParamValue(req.params.deviceId));
    const baseUrl = `${req.protocol}://${req.get('host') || 'localhost:8080'}`;
    const normalizedContent = content.map(item => {
      if (item.type !== 'WEBPAGE') {
        return item;
      }

      if (!item.url || item.url.startsWith('http://') || item.url.startsWith('https://')) {
        return item;
      }

      const normalizedPath = item.url.startsWith('/') ? item.url : `/${item.url}`;
      return {
        ...item,
        url: `${baseUrl}${normalizedPath}`
      };
    });

    res.status(200).json({
      status: true,
      data: normalizedContent
    });
  }
};
