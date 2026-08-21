import { Response } from 'express';
import { ContentType } from '@prisma/client';
import { contentService } from '../services/content.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

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
  listLibrary: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.auth?.sub || '';
    const data = await contentService.getByUserId(userId);
    res.status(200).json({ status: true, data });
  },
  createInLibrary: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.auth?.sub || '';
    const content = await contentService.createInLibrary({
      userId,
      type: parseType(req.body.type),
      duration: req.body.duration ? Number(req.body.duration) : undefined,
      url: req.body.url,
      file: req.file
    });

    res.status(201).json({
      status: true,
      message: 'Content created successfully',
      data: content
    });
  },
  deleteFromLibrary: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.auth?.sub || '';
    const contentId = getParamValue(req.params.contentId);
    const deleted = await contentService.deleteContent(contentId, userId);

    if (!deleted) {
      res.status(404).json({ status: false, message: 'Content not found' });
      return;
    }

    res.status(200).json({
      status: true,
      message: 'Content deleted successfully'
    });
  },
  listByDevice: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const deviceId = getParamValue(req.params.deviceId);
    const data = await contentService.getByDeviceId(deviceId);
    res.status(200).json({ status: true, data });
  },
  create: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.auth?.sub || '';
    const deviceId = getParamValue(req.params.deviceId);
    const content = await contentService.createAndAttachToDevice({
      userId,
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
  attach: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.auth?.sub || '';
    const deviceId = getParamValue(req.params.deviceId);
    const result = await contentService.attachExisting({
      userId,
      deviceId,
      contentId: req.body.contentId,
      order: Number(req.body.order)
    });

    if (result === 'NOT_FOUND') {
      res.status(404).json({ status: false, message: 'Content not found' });
      return;
    }

    if (result === 'ALREADY_ATTACHED') {
      res.status(409).json({ status: false, message: 'This content is already on this device' });
      return;
    }

    res.status(201).json({
      status: true,
      message: 'Content attached successfully'
    });
  },
  update: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.auth?.sub || '';
    const contentId = getParamValue(req.params.contentId);
    const updated = await contentService.updateDuration({
      contentId,
      userId,
      duration: req.body.duration ? Number(req.body.duration) : undefined
    });

    if (!updated) {
      res.status(404).json({ status: false, message: 'Content not found' });
      return;
    }

    res.status(200).json({
      status: true,
      message: 'Content updated successfully',
      data: updated
    });
  },
  remove: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const contentId = getParamValue(req.params.contentId);
    const deviceId = getParamValue(req.params.deviceId);
    const unlinked = await contentService.unlinkFromDevice(deviceId, contentId);

    if (!unlinked) {
      res.status(404).json({ status: false, message: 'Content not found on this device' });
      return;
    }

    res.status(200).json({
      status: true,
      message: 'Content removed from device'
    });
  },
  updatePlaylistOrder: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const deviceId = getParamValue(req.params.deviceId);
    const items = await contentService.updatePlaylistOrder(deviceId, req.body.contentIds as string[]);
    res.status(200).json({
      status: true,
      message: 'Playlist updated successfully',
      data: items
    });
  }
};
