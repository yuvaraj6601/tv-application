import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db';
import { jwtHelper } from '../src/helpers/jwt.helper';
import { passwordHelper } from '../src/helpers/password.helper';

const EMAIL_PREFIX = 'content-library-test-';

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

const DEVICE_UNIQUE_ID_PREFIX = 'content-library-test-';

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

describe('Content Library', () => {
  describe('GET /api/v1/content', () => {
    it('happy path — lists all content owned by the logged-in user, regardless of device', async () => {
      const { userId, token } = await createTestUser('list-happy');
      const deviceAId = await createDevice(userId, 'list-happy-device-a');
      const deviceBId = await createDevice(userId, 'list-happy-device-b');

      await prisma.content.create({
        data: {
          userId,
          type: 'IMAGE',
          url: 'https://example.com/a.jpg',
          fileName: 'a.jpg',
          playlistRef: { create: { deviceId: deviceAId, order: 1 } }
        }
      });
      await prisma.content.create({
        data: {
          userId,
          type: 'VIDEO',
          url: 'https://example.com/b.mp4',
          fileName: 'b.mp4',
          playlistRef: { create: { deviceId: deviceBId, order: 1 } }
        }
      });

      const res = await request(app).get('/api/v1/content').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(true);
      expect(res.body.data).toHaveLength(2);
      const fileNames = res.body.data.map((item: { fileName: string }) => item.fileName).sort();
      expect(fileNames).toEqual(['a.jpg', 'b.mp4'].sort());
    });

    it('auth failure — 401 with no token', async () => {
      const res = await request(app).get('/api/v1/content');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe(false);
    });

    it('scoping — never returns another user\'s content', async () => {
      const { userId: userAId } = await createTestUser('list-scope-a');
      const { token: tokenB } = await createTestUser('list-scope-b');

      await prisma.content.create({
        data: { userId: userAId, type: 'IMAGE', url: 'https://example.com/private.jpg', fileName: 'private.jpg' }
      });

      const res = await request(app).get('/api/v1/content').set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('POST /api/v1/content', () => {
    it('happy path — uploads a webpage-type content directly to the library with no device', async () => {
      const { token } = await createTestUser('create-happy');

      const res = await request(app)
        .post('/api/v1/content')
        .set('Authorization', `Bearer ${token}`)
        .field('type', 'WEBPAGE')
        .field('url', 'https://example.com')
        .field('duration', '10');

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(true);
      expect(res.body.data.type).toBe('WEBPAGE');
    });

    it('validation failure — 400 when type is missing', async () => {
      const { token } = await createTestUser('create-invalid');

      const res = await request(app).post('/api/v1/content').set('Authorization', `Bearer ${token}`).field('url', 'https://example.com');

      expect(res.status).toBe(400);
      expect(res.body.status).toBe(false);
    });

    it('auth failure — 403 for a DEVICE-role token', async () => {
      const deviceToken = jwtHelper.sign({ sub: 'some-device-id', role: 'DEVICE' });

      const res = await request(app)
        .post('/api/v1/content')
        .set('Authorization', `Bearer ${deviceToken}`)
        .field('type', 'WEBPAGE')
        .field('url', 'https://example.com');

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/content/:contentId', () => {
    it('happy path — deletes content and removes it from every device playlist that referenced it', async () => {
      const { userId, token } = await createTestUser('delete-happy');
      const deviceAId = await createDevice(userId, 'delete-happy-device-a');
      const deviceBId = await createDevice(userId, 'delete-happy-device-b');

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

      const res = await request(app).delete(`/api/v1/content/${content.id}`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(true);

      const stillExists = await prisma.content.findUnique({ where: { id: content.id } });
      expect(stillExists).toBeNull();

      const remainingPlaylistItems = await prisma.playlistItem.findMany({ where: { contentId: content.id } });
      expect(remainingPlaylistItems).toHaveLength(0);
    });

    it('not found — 404 for a non-existent content id', async () => {
      const { token } = await createTestUser('delete-not-found');

      const res = await request(app).delete('/api/v1/content/nonexistent-content-id').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe(false);
    });

    it('not found — 404 when deleting another user\'s content', async () => {
      const { userId: userAId } = await createTestUser('delete-other-a');
      const { token: tokenB } = await createTestUser('delete-other-b');

      const content = await prisma.content.create({
        data: { userId: userAId, type: 'IMAGE', url: 'https://example.com/a.jpg', fileName: 'a.jpg' }
      });

      const res = await request(app).delete(`/api/v1/content/${content.id}`).set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(404);

      const stillExists = await prisma.content.findUnique({ where: { id: content.id } });
      expect(stillExists).not.toBeNull();
    });
  });
});
