import { ContentType } from '@prisma/client';
import { prisma } from '../db';
import { socketGateway } from '../socket/socket.gateway';
import { storageService } from './storage.service';

interface CreateContentPayload {
  deviceId: string;
  type: ContentType;
  url?: string;
  duration?: number;
  order: number;
  file?: Express.Multer.File;
}

export const contentService = {
  getByDeviceId: async (deviceId: string) => {
    return prisma.content.findMany({
      where: { deviceId },
      orderBy: { sortOrder: 'asc' }
    });
  },
  create: async (payload: CreateContentPayload) => {
    let finalUrl = payload.url || '';
    let storageKey: string | null = null;
    let fileName: string | undefined;
    let fileMimeType: string | undefined;

    if (payload.file) {
      const uploaded = await storageService.uploadAsset(payload.file, payload.deviceId);
      finalUrl = uploaded.url;
      storageKey = uploaded.storageKey;
      fileName = payload.file.originalname;
      fileMimeType = payload.file.mimetype;
    }

    const content = await prisma.content.create({
      data: {
        deviceId: payload.deviceId,
        type: payload.type,
        url: finalUrl,
        localPath: storageKey,
        fileName,
        fileMimeType,
        duration: payload.duration,
        sortOrder: payload.order
      }
    });

    socketGateway.emitContentUpdated(payload.deviceId);
    return content;
  },
  update: async (
    payload: {
      contentId: string;
      deviceId: string;
      type?: ContentType;
      url?: string;
      duration?: number;
      order?: number;
    },
    file?: Express.Multer.File
  ) => {
    let nextUrl = payload.url;
    let nextStorageKey: string | null | undefined;
    let nextFileName: string | undefined;
    let nextFileMimeType: string | undefined;

    if (file) {
      const existing = await prisma.content.findUnique({
        where: { id: payload.contentId },
        select: { localPath: true }
      });

      if (existing?.localPath) {
        await storageService.deleteAsset(existing.localPath);
      }

      const uploaded = await storageService.uploadAsset(file, payload.deviceId);
      nextUrl = uploaded.url;
      nextStorageKey = uploaded.storageKey;
      nextFileName = file.originalname;
      nextFileMimeType = file.mimetype;
    }

    const updated = await prisma.content.update({
      where: { id: payload.contentId },
      data: {
        type: payload.type,
        url: nextUrl,
        localPath: nextStorageKey,
        fileName: nextFileName,
        fileMimeType: nextFileMimeType,
        duration: payload.duration,
        sortOrder: payload.order
      }
    });

    socketGateway.emitContentUpdated(payload.deviceId);
    return updated;
  },
  remove: async (contentId: string, deviceId: string) => {
    const existing = await prisma.content.findUnique({
      where: { id: contentId }
    });

    if (!existing) {
      throw new Error('Content not found');
    }

    if (existing.localPath) {
      await storageService.deleteAsset(existing.localPath);
    }

    await prisma.content.delete({
      where: { id: contentId }
    });

    socketGateway.emitContentUpdated(deviceId);
  },
  updatePlaylistOrder: async (deviceId: string, contentIds: string[]) => {
    await prisma.$transaction(
      contentIds.map((contentId, index) =>
        prisma.content.update({
          where: { id: contentId },
          data: { sortOrder: index + 1 }
        })
      )
    );

    socketGateway.emitPlaylistUpdated(deviceId);
    return contentService.getByDeviceId(deviceId);
  }
};
