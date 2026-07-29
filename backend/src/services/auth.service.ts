import { prisma } from '../db';
import { passwordHelper } from '../helpers/password.helper';

export const authService = {
  register: async (payload: { email: string; password: string }): Promise<{ id: string; email: string } | null> => {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return null;
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: passwordHelper.hash(payload.password)
      }
    });

    return { id: user.id, email: user.email };
  }
};
