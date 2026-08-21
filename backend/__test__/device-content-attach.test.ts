import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db';
import { jwtHelper } from '../src/helpers/jwt.helper';
import { passwordHelper } from '../src/helpers/password.helper';

const EMAIL_PREFIX = 'device-content-attach-test-';

const createTestUser = async (suffix: string): Promise<{ userId: string; token: string }> => {
  const user = await prisma.user.create({
    data: {
      email: `${EMAIL_PREFIX}${suffix}@example.com`,
      passwordHash: passwordHelper.hash('password123')
    }
  });

  const token = jwtHelper.sign({ sub: user.id, role: 'ADMIN' });
  return { userId: user.id, token };
};

const DEVICE_UNIQUE_ID_PREFIX = 'device-content-attach-test-';

const createDevice = async (userId: string, uniqueIdSuffix: string): Promise<string> => {
  const device = await prisma.device.create({
    data: {
      deviceName: 'Test Device',
      deviceUniqueId: `${DEVICE_UNIQUE_ID_PREFIX}${uniqueIdSuffix}`,
      userId
    }
  });
  return device.id;
};

const cleanup = async (): Promise<void> => {
  await prisma.device.deleteMany({ where: { deviceUniqueId: { startsWith: DEVICE_UNIQUE_ID_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
};

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('Device Content Attach / Unlink', () => {
  describe('POST /api/v1/device/:deviceId/content/attach', () => {
    it('happy path — attaches existing library content to a device without duplicating the Content row', async () => {
      const { userId, token } = await createTestUser('attach-happy');
      const deviceId = await createDevice(userId, 'attach-happy-device');
      const content = await prisma.content.create({
        data: { userId, type: 'IMAGE', url: 'https://example.com/lib.jpg', fileName: 'lib.jpg' }
      });

      const res = await request(app)
        .post(`/api/v1/device/${deviceId}/content/attach`)
        .set('Authorization', `Bearer ${token}`)
        .send({ contentId: content.id, order: 1 });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(true);

      const playlistItems = await prisma.playlistItem.findMany({ where: { deviceId, contentId: content.id } });
      expect(playlistItems).toHaveLength(1);

      const contentCount = await prisma.content.count({ where: { id: content.id } });
      expect(contentCount).toBe(1);
    });

    it('validation failure — 400 when contentId is missing', async () => {
      const { userId, token } = await createTestUser('attach-invalid');
      const deviceId = await createDevice(userId, 'attach-invalid-device');

      const res = await request(app)
        .post(`/api/v1/device/${deviceId}/content/attach`)
        .set('Authorization', `Bearer ${token}`)
        .send({ order: 1 });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe(false);
    });

    it('not found — 404 when the device does not belong to the requesting admin', async () => {
      const { userId: ownerId } = await createTestUser('attach-notfound-owner');
      const { token: otherToken } = await createTestUser('attach-notfound-other');
      const deviceId = await createDevice(ownerId, 'attach-notfound-device');
      const content = await prisma.content.create({
        data: { userId: ownerId, type: 'IMAGE', url: 'https://example.com/lib.jpg', fileName: 'lib.jpg' }
      });

      const res = await request(app)
        .post(`/api/v1/device/${deviceId}/content/attach`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ contentId: content.id, order: 1 });

      expect(res.status).toBe(404);
    });

    it('conflict — attaching content that belongs to a different user is rejected', async () => {
      const { userId: ownerId, token: ownerToken } = await createTestUser('attach-conflict-owner');
      const { userId: otherUserId } = await createTestUser('attach-conflict-other');
      const deviceId = await createDevice(ownerId, 'attach-conflict-device');
      const foreignContent = await prisma.content.create({
        data: { userId: otherUserId, type: 'IMAGE', url: 'https://example.com/foreign.jpg', fileName: 'foreign.jpg' }
      });

      const res = await request(app)
        .post(`/api/v1/device/${deviceId}/content/attach`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ contentId: foreignContent.id, order: 1 });

      expect(res.status).toBe(404);
    });

    it('conflict — attaching content already on this device a second time is rejected, no duplicate playlist row', async () => {
      const { userId, token } = await createTestUser('attach-duplicate');
      const deviceId = await createDevice(userId, 'attach-duplicate-device');
      const content = await prisma.content.create({
        data: { userId, type: 'IMAGE', url: 'https://example.com/lib.jpg', fileName: 'lib.jpg' }
      });

      const first = await request(app)
        .post(`/api/v1/device/${deviceId}/content/attach`)
        .set('Authorization', `Bearer ${token}`)
        .send({ contentId: content.id, order: 1 });
      expect(first.status).toBe(201);

      const second = await request(app)
        .post(`/api/v1/device/${deviceId}/content/attach`)
        .set('Authorization', `Bearer ${token}`)
        .send({ contentId: content.id, order: 2 });

      expect(second.status).toBe(409);
      expect(second.body.status).toBe(false);

      const playlistItems = await prisma.playlistItem.findMany({ where: { deviceId, contentId: content.id } });
      expect(playlistItems).toHaveLength(1);
    });

  });

  describe('DELETE /api/v1/device/:deviceId/content/:contentId — unlink semantics', () => {
    it('happy path — removes the playlist entry for this device only, content and other device links survive', async () => {
      const { userId, token } = await createTestUser('unlink-happy');
      const deviceAId = await createDevice(userId, 'unlink-happy-device-a');
      const deviceBId = await createDevice(userId, 'unlink-happy-device-b');
      const content = await prisma.content.create({
        data: {
          userId,
          type: 'IMAGE',
          url: 'https://example.com/shared.jpg',
          fileName: 'shared.jpg',
          playlistRef: {
            create: [
              { deviceId: deviceAId, order: 1 },
              { deviceId: deviceBId, order: 1 }
            ]
          }
        }
      });

      const res = await request(app)
        .delete(`/api/v1/device/${deviceAId}/content/${content.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(true);

      const linkOnA = await prisma.playlistItem.findFirst({ where: { deviceId: deviceAId, contentId: content.id } });
      expect(linkOnA).toBeNull();

      const linkOnB = await prisma.playlistItem.findFirst({ where: { deviceId: deviceBId, contentId: content.id } });
      expect(linkOnB).not.toBeNull();

      const contentStillExists = await prisma.content.findUnique({ where: { id: content.id } });
      expect(contentStillExists).not.toBeNull();
    });
  });

  describe('DELETE /api/v1/device/:deviceId — device deletion preserves content', () => {
    it('boundary — deleting a device does not delete its content, only unlinks the playlist', async () => {
      const { userId, token } = await createTestUser('device-delete-preserves');
      const deviceId = await createDevice(userId, 'device-delete-preserves-device');
      const content = await prisma.content.create({
        data: {
          userId,
          type: 'IMAGE',
          url: 'https://example.com/keep.jpg',
          fileName: 'keep.jpg',
          playlistRef: { create: { deviceId, order: 1 } }
        }
      });

      const res = await request(app).delete(`/api/v1/device/${deviceId}`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const contentStillExists = await prisma.content.findUnique({ where: { id: content.id } });
      expect(contentStillExists).not.toBeNull();
    });
  });

  describe('GET /api/v1/device/:deviceId/content — playlist listing', () => {
    it('happy path — returns content ordered by playlist order, with fileName and type', async () => {
      const { userId, token } = await createTestUser('list-playlist');
      const deviceId = await createDevice(userId, 'list-playlist-device');
      const contentB = await prisma.content.create({
        data: { userId, type: 'VIDEO', url: 'https://example.com/second.mp4', fileName: 'second.mp4' }
      });
      const contentA = await prisma.content.create({
        data: { userId, type: 'IMAGE', url: 'https://example.com/first.jpg', fileName: 'first.jpg' }
      });
      await prisma.playlistItem.create({ data: { deviceId, contentId: contentB.id, order: 2 } });
      await prisma.playlistItem.create({ data: { deviceId, contentId: contentA.id, order: 1 } });

      const res = await request(app).get(`/api/v1/device/${deviceId}/content`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].fileName).toBe('first.jpg');
      expect(res.body.data[1].fileName).toBe('second.mp4');
    });
  });
});
