import { NextFunction, Request, Response } from 'express';
import { jwtHelper } from '../helpers/jwt.helper';
import { prisma } from '../db';

export interface AuthenticatedRequest extends Request {
  auth?: {
    sub: string;
    role: 'ADMIN' | 'DEVICE';
  };
}

type AuthRole = 'ADMIN' | 'DEVICE';

const getParamValue = (value: string | string[] | undefined): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return '';
};

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    res.status(401).json({ status: false, message: 'Unauthorized' });
    return;
  }

  try {
    const token = authorization.replace('Bearer ', '');
    req.auth = jwtHelper.verify(token);
    next();
  } catch (_error) {
    res.status(401).json({ status: false, message: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: AuthRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ status: false, message: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ status: false, message: 'Forbidden' });
      return;
    }

    next();
  };
};

export const requireDeviceOwnership = (deviceParamKey = 'deviceId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ status: false, message: 'Unauthorized' });
      return;
    }

    const requestedDeviceId = getParamValue(req.params[deviceParamKey]);
    if (!requestedDeviceId) {
      res.status(400).json({ status: false, message: 'Missing device id' });
      return;
    }

    if (req.auth.role === 'DEVICE' && req.auth.sub !== requestedDeviceId) {
      res.status(403).json({ status: false, message: 'Forbidden for requested device' });
      return;
    }

    next();
  };
};

export const requireAdminDeviceAccess = (deviceParamKey = 'deviceId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ status: false, message: 'Unauthorized' });
      return;
    }

    if (req.auth.role !== 'ADMIN') {
      res.status(403).json({ status: false, message: 'Forbidden' });
      return;
    }

    const requestedDeviceId = getParamValue(req.params[deviceParamKey]);
    if (!requestedDeviceId) {
      res.status(400).json({ status: false, message: 'Missing device id' });
      return;
    }

    const device = await prisma.device.findFirst({
      where: {
        id: requestedDeviceId,
        userId: req.auth.sub
      },
      select: {
        id: true
      }
    });

    if (!device) {
      res.status(404).json({ status: false, message: 'Device not found' });
      return;
    }

    next();
  };
};
