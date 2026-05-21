import fs from 'fs/promises';
import path from 'path';

const uploadsRoot = path.resolve(process.cwd(), 'uploads');

const ensurePath = async (targetPath: string): Promise<void> => {
  await fs.mkdir(targetPath, { recursive: true });
};

export const storageService = {
  uploadAsset: async (file: Express.Multer.File, deviceId: string): Promise<{ url: string; storageKey: string }> => {
    const deviceFolder = path.join(uploadsRoot, deviceId);
    await ensurePath(deviceFolder);

    const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    const fullPath = path.join(deviceFolder, fileName);
    await fs.writeFile(fullPath, file.buffer);

    const storageKey = `uploads/${deviceId}/${fileName}`;
    const publicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL || process.env.API_BASE_URL || '';

    return {
      url: `${publicBaseUrl}/${storageKey}`,
      storageKey
    };
  },
  deleteAsset: async (storageKey: string): Promise<void> => {
    const absolutePath = path.resolve(process.cwd(), storageKey);
    await fs.unlink(absolutePath).catch(() => undefined);
  }
};
