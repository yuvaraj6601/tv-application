import express from 'express';
import { authMiddleware, requireAdminDeviceAccess, requireRole } from '../../middleware/auth.middleware';
import { uploadMiddleware } from '../../middleware/upload.middleware';
import { contentController } from '../../controllers/content.controller';
import { validationMiddleware } from '../../middleware/validation.middleware';
import {
  contentAttachValidation,
  contentCreateValidation,
  contentDeleteParamsValidation,
  contentListParamsValidation,
  contentOrderValidation,
  contentUpdateValidation
} from '../../validations/content.validation';

export const contentRoute = express.Router({ mergeParams: true });

contentRoute.get(
  '/',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware(contentListParamsValidation, 'params'),
  requireAdminDeviceAccess(),
  contentController.listByDevice
);
contentRoute.post(
  '/',
  authMiddleware,
  requireRole(['ADMIN']),
  uploadMiddleware.single('file'),
  validationMiddleware(contentCreateValidation),
  requireAdminDeviceAccess(),
  contentController.create
);
contentRoute.post(
  '/attach',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware(contentAttachValidation),
  requireAdminDeviceAccess(),
  contentController.attach
);
contentRoute.patch(
  '/:contentId',
  authMiddleware,
  requireRole(['ADMIN']),
  uploadMiddleware.single('file'),
  validationMiddleware(contentUpdateValidation),
  requireAdminDeviceAccess(),
  contentController.update
);
contentRoute.delete(
  '/:contentId',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware(contentDeleteParamsValidation, 'params'),
  requireAdminDeviceAccess(),
  contentController.remove
);
contentRoute.put(
  '/playlist/order',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware(contentOrderValidation),
  requireAdminDeviceAccess(),
  contentController.updatePlaylistOrder
);
