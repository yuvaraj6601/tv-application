import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db';
import { piAnalyticsPrisma } from '../src/db-pi-analytics';
import { jwtHelper } from '../src/helpers/jwt.helper';

const ADMIN_ID = 'test-admin-pi-analytics';
const OTHER_ADMIN_ID = 'test-admin-pi-analytics-other';
const PI_ID_A = 'b8:27:eb:11:11:11';
const PI_ID_B = 'b8:27:eb:22:22:22';
const UNIQUE_ID_PREFIX = 'pi-analytics-test-device-';

let adminToken: string;
let deviceWithPiId: string;
let deviceForPatchHappyPath: string;
let deviceForConflict: string;
let deviceForBoundaryNoPiId: string;
let otherAdminDevice: string;

beforeAll(async () => {
  await prisma.device.deleteMany({ where: { deviceUniqueId: { startsWith: UNIQUE_ID_PREFIX } } });
  await prisma.user.deleteMany({ where: { id: { in: [ADMIN_ID, OTHER_ADMIN_ID] } } });

  await prisma.user.create({
    data: { id: ADMIN_ID, email: 'pi-analytics-admin@test.local', passwordHash: 'x' }
  });
  await prisma.user.create({
    data: { id: OTHER_ADMIN_ID, email: 'pi-analytics-admin-other@test.local', passwordHash: 'x' }
  });

  adminToken = jwtHelper.sign({ sub: ADMIN_ID, role: 'ADMIN' });

  const withPiId = await prisma.device.create({
    data: { deviceName: 'With PiId', deviceUniqueId: `${UNIQUE_ID_PREFIX}1`, userId: ADMIN_ID, piId: PI_ID_A }
  });
  deviceWithPiId = withPiId.id;

  const patchTarget = await prisma.device.create({
    data: { deviceName: 'Patch Target', deviceUniqueId: `${UNIQUE_ID_PREFIX}2`, userId: ADMIN_ID }
  });
  deviceForPatchHappyPath = patchTarget.id;

  const conflictTarget = await prisma.device.create({
    data: { deviceName: 'Conflict Target', deviceUniqueId: `${UNIQUE_ID_PREFIX}3`, userId: ADMIN_ID }
  });
  deviceForConflict = conflictTarget.id;

  const boundaryTarget = await prisma.device.create({
    data: { deviceName: 'No PiId Boundary', deviceUniqueId: `${UNIQUE_ID_PREFIX}4`, userId: ADMIN_ID }
  });
  deviceForBoundaryNoPiId = boundaryTarget.id;

  const otherDevice = await prisma.device.create({
    data: { deviceName: 'Other Admin Device', deviceUniqueId: `${UNIQUE_ID_PREFIX}5`, userId: OTHER_ADMIN_ID }
  });
  otherAdminDevice = otherDevice.id;

  await piAnalyticsPrisma.session.deleteMany({ where: { piId: { in: [PI_ID_A, PI_ID_B] } } });
  await piAnalyticsPrisma.visitor.deleteMany({ where: { piId: { in: [PI_ID_A, PI_ID_B] } } });

  await piAnalyticsPrisma.visitor.createMany({
    data: [
      {
        id: 'visitor-1',
        piId: PI_ID_A,
        faceEmbedding: Buffer.from('[]'),
        firstSeenAt: new Date('2026-08-05T09:00:00Z')
      },
      {
        id: 'visitor-2',
        piId: PI_ID_A,
        faceEmbedding: Buffer.from('[]'),
        firstSeenAt: new Date('2026-08-05T09:05:00Z')
      }
    ]
  });
  await piAnalyticsPrisma.session.createMany({
    data: [
      {
        id: 'session-1',
        piId: PI_ID_A,
        visitorId: 'visitor-1',
        startedAt: new Date('2026-08-05T09:00:00Z'),
        endedAt: new Date('2026-08-05T09:00:20Z'),
        durationSeconds: 20
      },
      {
        id: 'session-2',
        piId: PI_ID_A,
        visitorId: 'visitor-1',
        startedAt: new Date('2026-08-05T10:00:00Z'),
        endedAt: new Date('2026-08-05T10:00:05Z'),
        durationSeconds: 5
      },
      {
        id: 'session-3',
        piId: PI_ID_A,
        visitorId: 'visitor-2',
        startedAt: new Date('2026-08-05T09:05:00Z'),
        endedAt: new Date('2026-08-05T09:05:10Z'),
        durationSeconds: 10
      }
    ]
  });
});

afterAll(async () => {
  await piAnalyticsPrisma.session.deleteMany({ where: { piId: { in: [PI_ID_A, PI_ID_B] } } });
  await piAnalyticsPrisma.visitor.deleteMany({ where: { piId: { in: [PI_ID_A, PI_ID_B] } } });
  await prisma.device.deleteMany({ where: { deviceUniqueId: { startsWith: UNIQUE_ID_PREFIX } } });
  await prisma.user.deleteMany({ where: { id: { in: [ADMIN_ID, OTHER_ADMIN_ID] } } });
  await prisma.$disconnect();
  await piAnalyticsPrisma.$disconnect();
});

describe('PATCH /api/v1/device/:deviceId/pi-id', () => {
  it('happy path — sets a valid piId', async () => {
    const res = await request(app)
      .patch(`/api/v1/device/${deviceForPatchHappyPath}/pi-id`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ piId: PI_ID_B });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(res.body.data.piId).toBe(PI_ID_B);

    const updated = await prisma.device.findUnique({ where: { id: deviceForPatchHappyPath } });
    expect(updated?.piId).toBe(PI_ID_B);
  });

  it('auth failure — no token returns 401', async () => {
    const res = await request(app).patch(`/api/v1/device/${deviceWithPiId}/pi-id`).send({ piId: PI_ID_A });
    expect(res.status).toBe(401);
  });

  it('auth failure — device role returns 403', async () => {
    const deviceToken = jwtHelper.sign({ sub: deviceWithPiId, role: 'DEVICE' });
    const res = await request(app)
      .patch(`/api/v1/device/${deviceWithPiId}/pi-id`)
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ piId: PI_ID_A });
    expect(res.status).toBe(403);
  });

  it('validation failure — malformed MAC returns 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/device/${deviceWithPiId}/pi-id`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ piId: 'not-a-mac' });
    expect(res.status).toBe(400);
  });

  it('not found — device not owned by admin returns 404', async () => {
    const res = await request(app)
      .patch(`/api/v1/device/${otherAdminDevice}/pi-id`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ piId: 'aa:bb:cc:dd:ee:ff' });
    expect(res.status).toBe(404);
  });

  it('conflict — piId already assigned to another device returns 409', async () => {
    const res = await request(app)
      .patch(`/api/v1/device/${deviceForConflict}/pi-id`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ piId: PI_ID_A });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/v1/device/:deviceId/analytics', () => {
  it('happy path — returns aggregated analytics for the device piId', async () => {
    const res = await request(app)
      .get(`/api/v1/device/${deviceWithPiId}/analytics`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(res.body.data.piId).toBe(PI_ID_A);
    expect(res.body.data.uniqueVisitors).toBe(2);
    expect(res.body.data.totalWatchTimeSeconds).toBe(35);

    const visitors = [...res.body.data.visitors].sort((a: { visitorId: string }, b: { visitorId: string }) =>
      a.visitorId.localeCompare(b.visitorId)
    );
    expect(visitors).toEqual([
      { visitorId: 'visitor-1', watchTimeSeconds: 25, firstSeenAt: '2026-08-05T09:00:00.000Z' },
      { visitorId: 'visitor-2', watchTimeSeconds: 10, firstSeenAt: '2026-08-05T09:05:00.000Z' }
    ]);
  });

  it('auth failure — no token returns 401', async () => {
    const res = await request(app).get(`/api/v1/device/${deviceWithPiId}/analytics`);
    expect(res.status).toBe(401);
  });

  it('auth failure — device role returns 403', async () => {
    const deviceToken = jwtHelper.sign({ sub: deviceWithPiId, role: 'DEVICE' });
    const res = await request(app)
      .get(`/api/v1/device/${deviceWithPiId}/analytics`)
      .set('Authorization', `Bearer ${deviceToken}`);
    expect(res.status).toBe(403);
  });

  it('not found — device not owned by admin returns 404', async () => {
    const res = await request(app)
      .get(`/api/v1/device/${otherAdminDevice}/analytics`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('boundary — device with no piId set returns null data, not an error', async () => {
    const res = await request(app)
      .get(`/api/v1/device/${deviceForBoundaryNoPiId}/analytics`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(res.body.data).toBeNull();
  });
});
