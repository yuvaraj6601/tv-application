import { Request, Response } from 'express';
import { prisma } from '../db';
import { jwtHelper } from '../helpers/jwt.helper';
import { passwordHelper } from '../helpers/password.helper';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { adminBootstrapService } from '../services/admin-bootstrap.service';

export const authController = {
  login: async (req: Request, res: Response): Promise<void> => {
    await adminBootstrapService.ensureDefaultAdmin();

    const { email, password } = req.body as { email: string; password: string };
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user || !passwordHelper.isMatch(password, user.passwordHash)) {
      res.status(401).json({
        status: false,
        message: 'Invalid email or password'
      });
      return;
    }

    const token = jwtHelper.sign({
      sub: user.id,
      role: 'ADMIN'
    });

    res.status(200).json({
      status: true,
      message: 'Login successful',
      data: {
        token,
        email: user.email
      }
    });
  },
  me: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ status: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth.sub },
      select: {
        id: true,
        email: true
      }
    });

    if (!user) {
      res.status(404).json({ status: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      status: true,
      data: user
    });
  }
};
