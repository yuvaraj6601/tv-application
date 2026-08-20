import express from 'express';
import { deviceController } from '../../controllers/device.controller';
import { authMiddleware, requireAdminDeviceAccess, requireDeviceOwnership, requireRole } from '../../middleware/auth.middleware';
import { contentRoute } from './content.route';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import {
  deviceHeartbeatValidation,
  deviceNameUpdateValidation,
  deviceOrientationUpdateValidation,
  devicePairValidation,
  deviceParamValidation,
  devicePiIdUpdateValidation,
  deviceRegisterValidation
} from '../../validations/device.validation';

export const deviceRoute = express.Router();

deviceRoute.post(
  '/register',
  rateLimitMiddleware({
    keyPrefix: 'device-register',
    windowMs: 60 * 1000,
    maxRequests: 20
  }),
  validationMiddleware(deviceRegisterValidation),
  deviceController.register
);
deviceRoute.post(
  '/pair/confirm',
  rateLimitMiddleware({
    keyPrefix: 'device-pair-confirm',
    windowMs: 60 * 1000,
    maxRequests: 20
  }),
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware(devicePairValidation),
  deviceController.pairByCode
);
deviceRoute.get('/', authMiddleware, requireRole(['ADMIN']), deviceController.getList);
deviceRoute.post(
  '/:deviceId/heartbeat',
  rateLimitMiddleware({
    keyPrefix: 'device-heartbeat',
    windowMs: 60 * 1000,
    maxRequests: 120
  }),
  authMiddleware,
  requireRole(['DEVICE']),
  validationMiddleware(deviceParamValidation, 'params'),
  requireDeviceOwnership(),
  validationMiddleware(deviceHeartbeatValidation),
  deviceController.heartbeat
);
deviceRoute.get(
  '/:deviceId/sync',
  authMiddleware,
  requireRole(['DEVICE']),
  validationMiddleware(deviceParamValidation, 'params'),
  requireDeviceOwnership(),
  deviceController.syncContent
);
deviceRoute.get('/:deviceId', authMiddleware, requireRole(['ADMIN']), validationMiddleware(deviceParamValidation, 'params'), deviceController.getById);
deviceRoute.delete(
  '/:deviceId',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware(deviceParamValidation, 'params'),
  requireAdminDeviceAccess(),
  deviceController.deleteDevice
);
deviceRoute.patch(
  '/:deviceId/orientation',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware(deviceParamValidation, 'params'),
  validationMiddleware(deviceOrientationUpdateValidation),
  requireAdminDeviceAccess(),
  deviceController.updateOrientation
);
deviceRoute.patch(
  '/:deviceId/name',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware(deviceParamValidation, 'params'),
  validationMiddleware(deviceNameUpdateValidation),
  requireAdminDeviceAccess(),
  deviceController.updateDeviceName
);
deviceRoute.patch(
  '/:deviceId/pi-id',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware(deviceParamValidation, 'params'),
  validationMiddleware(devicePiIdUpdateValidation),
  requireAdminDeviceAccess(),
  deviceController.updatePiId
);
deviceRoute.get(
  '/:deviceId/analytics',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware(deviceParamValidation, 'params'),
  requireAdminDeviceAccess(),
  deviceController.getAnalytics
);
deviceRoute.use('/:deviceId/content', contentRoute);
