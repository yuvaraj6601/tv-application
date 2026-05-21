import { ContentType } from '@prisma/client';
import { prisma } from '../db';
import { socketGateway } from '../socket/socket.gateway';

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
    let localPath: string | null = '';
    let fileName: string | undefined;
    let fileMimeType: string | undefined;
    let fileData: string | undefined;

    if (payload.file) {
      finalUrl = '';
      localPath = null;
      fileName = payload.file.originalname;
      fileMimeType = payload.file.mimetype;
      fileData = payload.file.buffer.toString('base64');
    }

    const content = await prisma.content.create({
      data: {
        deviceId: payload.deviceId,
        type: payload.type,
        url: finalUrl,
        localPath,
        fileName,
        fileMimeType,
        fileData,
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
    let nextLocalPath: string | null | undefined;
    let nextFileName: string | undefined;
    let nextFileMimeType: string | undefined;
    let nextFileData: string | undefined;

    if (file) {
      nextUrl = '';
      nextLocalPath = null;
      nextFileName = file.originalname;
      nextFileMimeType = file.mimetype;
      nextFileData = file.buffer.toString('base64');
    }

    const updated = await prisma.content.update({
      where: { id: payload.contentId },
      data: {
        type: payload.type,
        url: nextUrl,
        localPath: nextLocalPath,
        fileName: nextFileName,
        fileMimeType: nextFileMimeType,
        fileData: nextFileData,
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
