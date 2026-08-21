import { ContentType } from '@prisma/client';
import { prisma } from '../db';
import { socketGateway } from '../socket/socket.gateway';
import { storageService } from './storage.service';

interface CreateLibraryContentPayload {
  userId: string;
  type: ContentType;
  url?: string;
  duration?: number;
  file?: Express.Multer.File;
}

interface CreateAndAttachPayload extends CreateLibraryContentPayload {
  deviceId: string;
  order: number;
}

const toPlaylistDto = (item: { order: number; content: { id: string; type: ContentType; url: string; fileName: string | null; duration: number | null } }) => ({
  id: item.content.id,
  type: item.content.type,
  url: item.content.url,
  fileName: item.content.fileName,
  duration: item.content.duration,
  sortOrder: item.order
});

export const contentService = {
  getByUserId: async (userId: string) => {
    return prisma.content.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  },
  getByDeviceId: async (deviceId: string) => {
    const items = await prisma.playlistItem.findMany({
      where: { deviceId },
      orderBy: { order: 'asc' },
      include: {
        content: true
      }
    });

    return items.map(toPlaylistDto);
  },
  createInLibrary: async (payload: CreateLibraryContentPayload) => {
    let finalUrl = payload.url || '';
    let storageKey: string | null = null;
    let fileName: string | undefined;
    let fileMimeType: string | undefined;

    if (payload.file) {
      const uploaded = await storageService.uploadAsset(payload.file, payload.userId);
      finalUrl = uploaded.url;
      storageKey = uploaded.storageKey;
      fileName = payload.file.originalname;
      fileMimeType = payload.file.mimetype;
    }

    return prisma.content.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        url: finalUrl,
        localPath: storageKey,
        fileName,
        fileMimeType,
        duration: payload.duration
      }
    });
  },
  createAndAttachToDevice: async (payload: CreateAndAttachPayload) => {
    const content = await contentService.createInLibrary(payload);

    await prisma.playlistItem.create({
      data: {
        deviceId: payload.deviceId,
        contentId: content.id,
        order: payload.order
      }
    });

    socketGateway.emitContentUpdated(payload.deviceId);
    return content;
  },
  attachExisting: async (payload: {
    userId: string;
    deviceId: string;
    contentId: string;
    order: number;
  }): Promise<'NOT_FOUND' | 'ALREADY_ATTACHED' | 'ATTACHED'> => {
    const content = await prisma.content.findFirst({
      where: { id: payload.contentId, userId: payload.userId },
      select: { id: true }
    });

    if (!content) {
      return 'NOT_FOUND';
    }

    const existingLink = await prisma.playlistItem.findFirst({
      where: { deviceId: payload.deviceId, contentId: payload.contentId },
      select: { id: true }
    });

    if (existingLink) {
      return 'ALREADY_ATTACHED';
    }

    await prisma.playlistItem.upsert({
      where: { deviceId_order: { deviceId: payload.deviceId, order: payload.order } },
      create: { deviceId: payload.deviceId, contentId: payload.contentId, order: payload.order },
      update: { contentId: payload.contentId }
    });

    socketGateway.emitContentUpdated(payload.deviceId);
    return 'ATTACHED';
  },
  updateDuration: async (payload: { contentId: string; userId: string; duration?: number }) => {
    const existing = await prisma.content.findFirst({
      where: { id: payload.contentId, userId: payload.userId },
      select: { id: true }
    });

    if (!existing) {
      return null;
    }

    return prisma.content.update({
      where: { id: payload.contentId },
      data: { duration: payload.duration }
    });
  },
  unlinkFromDevice: async (deviceId: string, contentId: string): Promise<boolean> => {
    const existing = await prisma.playlistItem.findFirst({
      where: { deviceId, contentId },
      select: { id: true }
    });

    if (!existing) {
      return false;
    }

    await prisma.playlistItem.delete({ where: { id: existing.id } });
    socketGateway.emitContentUpdated(deviceId);
    return true;
  },
  deleteContent: async (contentId: string, userId: string): Promise<boolean> => {
    const existing = await prisma.content.findFirst({
      where: { id: contentId, userId },
      include: { playlistRef: { select: { deviceId: true } } }
    });

    if (!existing) {
      return false;
    }

    if (existing.localPath) {
      await storageService.deleteAsset(existing.localPath);
    }

    const affectedDeviceIds = existing.playlistRef.map(item => item.deviceId);

    await prisma.content.delete({ where: { id: contentId } });

    affectedDeviceIds.forEach(deviceId => socketGateway.emitContentUpdated(deviceId));
    return true;
  },
  updatePlaylistOrder: async (deviceId: string, contentIds: string[]) => {
    // Two-phase update: the (deviceId, order) unique constraint would collide if reordered
    // values were written directly (e.g. swapping positions 1 and 2), so first move every
    // row to a disjoint negative range, then assign the final 1..N order.
    await prisma.$transaction([
      ...contentIds.map((contentId, index) =>
        prisma.playlistItem.updateMany({
          where: { deviceId, contentId },
          data: { order: -(index + 1) }
        })
      ),
      ...contentIds.map((contentId, index) =>
        prisma.playlistItem.updateMany({
          where: { deviceId, contentId },
          data: { order: index + 1 }
        })
      )
    ]);

    socketGateway.emitPlaylistUpdated(deviceId);
    return contentService.getByDeviceId(deviceId);
  }
};
