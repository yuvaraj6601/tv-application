import { Request, Response } from 'express';
import { ContentType } from '@prisma/client';
import { contentService } from '../services/content.service';

const parseType = (type: string): ContentType => {
  if (type === 'IMAGE' || type === 'VIDEO' || type === 'WEBPAGE') {
    return type;
  }

  throw new Error('Invalid content type');
};

const getParamValue = (value: string | string[] | undefined): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return '';
};

export const contentController = {
  listByDevice: async (req: Request, res: Response): Promise<void> => {
    const deviceId = getParamValue(req.params.deviceId);
    const data = await contentService.getByDeviceId(deviceId);
    res.status(200).json({ status: true, data });
  },
  create: async (req: Request, res: Response): Promise<void> => {
    const deviceId = getParamValue(req.params.deviceId);
    const content = await contentService.create({
      deviceId,
      type: parseType(req.body.type),
      duration: req.body.duration ? Number(req.body.duration) : undefined,
      order: Number(req.body.order || 1),
      url: req.body.url,
      file: req.file
    });

    res.status(201).json({
      status: true,
      message: 'Content created successfully',
      data: content
    });
  },
  update: async (req: Request, res: Response): Promise<void> => {
    const deviceId = getParamValue(req.params.deviceId);
    const contentId = getParamValue(req.params.contentId);
    const content = await contentService.update(
      {
        contentId,
        deviceId,
        type: req.body.type ? parseType(req.body.type) : undefined,
        duration: req.body.duration ? Number(req.body.duration) : undefined,
        order: req.body.order ? Number(req.body.order) : undefined,
        url: req.body.url
      },
      req.file
    );

    res.status(200).json({
      status: true,
      message: 'Content updated successfully',
      data: content
    });
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    const contentId = getParamValue(req.params.contentId);
    const deviceId = getParamValue(req.params.deviceId);
    await contentService.remove(contentId, deviceId);
    res.status(200).json({
      status: true,
      message: 'Content deleted successfully'
    });
  },
  updatePlaylistOrder: async (req: Request, res: Response): Promise<void> => {
    const deviceId = getParamValue(req.params.deviceId);
    const items = await contentService.updatePlaylistOrder(deviceId, req.body.contentIds as string[]);
    res.status(200).json({
      status: true,
      message: 'Playlist updated successfully',
      data: items
    });
  }
};
