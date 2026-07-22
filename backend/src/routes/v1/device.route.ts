import express from 'express';
import { deviceController } from '../../controllers/device.controller';
import { authMiddleware, requireDeviceOwnership, requireRole } from '../../middleware/auth.middleware';
import { contentRoute } from './content.route';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import {
  deviceHeartbeatValidation,
  devicePairValidation,
  deviceParamValidation,
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
deviceRoute.use('/:deviceId/content', contentRoute);
