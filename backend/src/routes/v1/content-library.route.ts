import express from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { uploadMiddleware } from '../../middleware/upload.middleware';
import { contentController } from '../../controllers/content.controller';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { contentLibraryCreateValidation, contentLibraryDeleteParamsValidation } from '../../validations/content.validation';

export const contentLibraryRoute = express.Router();

contentLibraryRoute.get('/', authMiddleware, requireRole(['ADMIN']), contentController.listLibrary);
contentLibraryRoute.post(
  '/',
  authMiddleware,
  requireRole(['ADMIN']),
  uploadMiddleware.single('file'),
  validationMiddleware(contentLibraryCreateValidation),
  contentController.createInLibrary
);
contentLibraryRoute.delete(
  '/:contentId',
  authMiddleware,
  requireRole(['ADMIN']),
  validationMiddleware(contentLibraryDeleteParamsValidation, 'params'),
  contentController.deleteFromLibrary
);
