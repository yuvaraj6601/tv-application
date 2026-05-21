import { prisma } from '../db';
import { passwordHelper } from '../helpers/password.helper';

const FALLBACK_ADMIN_EMAIL = 'admin@signage.local';
const FALLBACK_ADMIN_PASSWORD = 'admin12345';

export const adminBootstrapService = {
  ensureDefaultAdmin: async (): Promise<void> => {
    const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || FALLBACK_ADMIN_EMAIL;
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || FALLBACK_ADMIN_PASSWORD;

    const normalizedEmail = defaultAdminEmail.trim().toLowerCase();
    const existingAdmin = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingAdmin) {
      return;
    }

    await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: passwordHelper.hash(defaultAdminPassword)
      }
    });
  }
};
