import express from 'express';
import { authController } from '../../controllers/auth.controller';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { loginValidation } from '../../validations/auth.validation';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';

export const authRoute = express.Router();

authRoute.post(
  '/login',
  rateLimitMiddleware({
    keyPrefix: 'auth-login',
    windowMs: 60 * 1000,
    maxRequests: 10
  }),
  validationMiddleware(loginValidation),
  authController.login
);
authRoute.get('/me', authMiddleware, requireRole(['ADMIN']), authController.me);
