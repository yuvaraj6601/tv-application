import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db';
import { piAnalyticsPrisma } from '../src/db-pi-analytics';
import { jwtHelper } from '../src/helpers/jwt.helper';

const ADMIN_ID = 'test-admin-visitor-table';
const OTHER_ADMIN_ID = 'test-admin-visitor-table-other';
const PI_ID = 'b8:27:eb:33:33:33';
const UNIQUE_ID_PREFIX = 'visitor-table-test-device-';

let adminToken: string;
let deviceWithPiId: string;
let deviceWithoutPiId: string;
let otherAdminDevice: string;

// vt-a: male,   25, first seen 08-01, 2 visits, 25s total
// vt-b: female, 34, first seen 08-05, 1 visit,  10s total
// vt-c: female, 31, first seen 08-10, 3 visits, 90s total
// vt-d: unknown gender/age, first seen 08-12, 1 visit, 5s total
const visitor = (id: string, firstSeenAt: string, age: number | null, gender: string | null) => ({
  id,
  piId: PI_ID,
  faceEmbedding: Buffer.from('[]'),
  firstSeenAt: new Date(firstSeenAt),
  age,
  gender
});

const session = (id: string, visitorId: string, startedAt: string, durationSeconds: number) => ({
  id,
  piId: PI_ID,
  visitorId,
  startedAt: new Date(startedAt),
  endedAt: new Date(new Date(startedAt).getTime() + durationSeconds * 1000),
  durationSeconds
});

const getVisitors = (deviceId: string, query: Record<string, string | number> = {}) =>
  request(app).get(`/api/v1/device/${deviceId}/analytics/visitors`).query(query).set('Authorization', `Bearer ${adminToken}`);

const ids = (res: request.Response): string[] => res.body.data.items.map((item: { visitorId: string }) => item.visitorId);

beforeAll(async () => {
  await prisma.device.deleteMany({ where: { deviceUniqueId: { startsWith: UNIQUE_ID_PREFIX } } });
  await prisma.user.deleteMany({ where: { id: { in: [ADMIN_ID, OTHER_ADMIN_ID] } } });
  await prisma.user.create({ data: { id: ADMIN_ID, email: 'visitor-table-admin@test.local', passwordHash: 'x' } });
  await prisma.user.create({ data: { id: OTHER_ADMIN_ID, email: 'visitor-table-other@test.local', passwordHash: 'x' } });
  adminToken = jwtHelper.sign({ sub: ADMIN_ID, role: 'ADMIN' });

  deviceWithPiId = (
    await prisma.device.create({ data: { deviceName: 'VT', deviceUniqueId: `${UNIQUE_ID_PREFIX}1`, userId: ADMIN_ID, piId: PI_ID } })
  ).id;
  deviceWithoutPiId = (
    await prisma.device.create({ data: { deviceName: 'VT none', deviceUniqueId: `${UNIQUE_ID_PREFIX}2`, userId: ADMIN_ID } })
  ).id;
  otherAdminDevice = (
    await prisma.device.create({ data: { deviceName: 'VT other', deviceUniqueId: `${UNIQUE_ID_PREFIX}3`, userId: OTHER_ADMIN_ID } })
  ).id;

  await piAnalyticsPrisma.session.deleteMany({ where: { piId: PI_ID } });
  await piAnalyticsPrisma.visitor.deleteMany({ where: { piId: PI_ID } });
  await piAnalyticsPrisma.visitor.createMany({
    data: [
      visitor('vt-a', '2026-08-01T09:00:00Z', 25, 'male'),
      visitor('vt-b', '2026-08-05T09:00:00Z', 34, 'female'),
      visitor('vt-c', '2026-08-10T09:00:00Z', 31, 'female'),
      visitor('vt-d', '2026-08-12T09:00:00Z', null, null)
    ]
  });
  await piAnalyticsPrisma.session.createMany({
    data: [
      session('vts-1', 'vt-a', '2026-08-01T09:00:00Z', 20),
      session('vts-2', 'vt-a', '2026-08-01T10:00:00Z', 5),
      session('vts-3', 'vt-b', '2026-08-05T09:00:00Z', 10),
      session('vts-4', 'vt-c', '2026-08-10T09:00:00Z', 40),
      session('vts-5', 'vt-c', '2026-08-10T10:00:00Z', 30),
      session('vts-6', 'vt-c', '2026-08-10T11:00:00Z', 20),
      session('vts-7', 'vt-d', '2026-08-12T09:00:00Z', 5)
    ]
  });
});

afterAll(async () => {
  await piAnalyticsPrisma.session.deleteMany({ where: { piId: PI_ID } });
  await piAnalyticsPrisma.visitor.deleteMany({ where: { piId: PI_ID } });
  await prisma.device.deleteMany({ where: { deviceUniqueId: { startsWith: UNIQUE_ID_PREFIX } } });
  await prisma.user.deleteMany({ where: { id: { in: [ADMIN_ID, OTHER_ADMIN_ID] } } });
  await prisma.$disconnect();
  await piAnalyticsPrisma.$disconnect();
});

describe('GET /api/v1/device/:deviceId/analytics/visitors', () => {
  it('happy path — defaults to watch time descending with gender, age, visits and totals per visitor', async () => {
    const res = await getVisitors(deviceWithPiId);

    expect(res.status).toBe(200);
    expect(ids(res)).toEqual(['vt-c', 'vt-a', 'vt-b', 'vt-d']);
    expect(res.body.data.items[0]).toMatchObject({
      visitorId: 'vt-c',
      watchTimeSeconds: 90,
      visitCount: 3,
      gender: 'female',
      age: 31
    });
    expect(res.body.data).toMatchObject({ totalItems: 4, totalPages: 1, page: 1 });
  });

  it('sorts by visits ascending, breaking ties by visitor id', async () => {
    const res = await getVisitors(deviceWithPiId, { sortBy: 'visits', order: 'asc' });
    expect(ids(res)).toEqual(['vt-b', 'vt-d', 'vt-a', 'vt-c']);
  });

  it('sorts by first seen date descending', async () => {
    const res = await getVisitors(deviceWithPiId, { sortBy: 'firstSeen', order: 'desc' });
    expect(ids(res)).toEqual(['vt-d', 'vt-c', 'vt-b', 'vt-a']);
  });

  it('sorts by watch time ascending', async () => {
    const res = await getVisitors(deviceWithPiId, { sortBy: 'watchTime', order: 'asc' });
    expect(ids(res)).toEqual(['vt-d', 'vt-b', 'vt-a', 'vt-c']);
  });

  it.each([
    ['male', ['vt-a']],
    ['female', ['vt-c', 'vt-b']],
    ['unknown', ['vt-d']]
  ])('filters by gender=%s', async (gender, expected) => {
    const res = await getVisitors(deviceWithPiId, { gender });
    expect(ids(res)).toEqual(expected);
  });

  it('filters returning visitors (more than one visit)', async () => {
    const res = await getVisitors(deviceWithPiId, { visits: 'returning' });
    expect(ids(res)).toEqual(['vt-c', 'vt-a']);
  });

  it('filters one-time visitors', async () => {
    const res = await getVisitors(deviceWithPiId, { visits: 'oneTime' });
    expect(ids(res)).toEqual(['vt-b', 'vt-d']);
  });

  it('filters by age bucket using the same 10-year buckets as the age chart', async () => {
    const res = await getVisitors(deviceWithPiId, { ageBucket: '30-39' });
    expect(ids(res)).toEqual(['vt-c', 'vt-b']);
  });

  it('filters by first-seen date range, inclusive of the whole end day', async () => {
    const res = await getVisitors(deviceWithPiId, { from: '2026-08-05', to: '2026-08-10' });
    expect(ids(res)).toEqual(['vt-c', 'vt-b']);
  });

  it('combines filters', async () => {
    const res = await getVisitors(deviceWithPiId, { gender: 'female', visits: 'returning' });
    expect(ids(res)).toEqual(['vt-c']);
    expect(res.body.data.totalItems).toBe(1);
  });

  it('paginates in the query and reports totals for the filtered set', async () => {
    const res = await getVisitors(deviceWithPiId, { page: 2, pageSize: 3 });
    expect(ids(res)).toEqual(['vt-d']);
    expect(res.body.data).toMatchObject({ totalItems: 4, totalPages: 2, page: 2 });
  });

  it('auth failure — no token returns 401', async () => {
    const res = await request(app).get(`/api/v1/device/${deviceWithPiId}/analytics/visitors`);
    expect(res.status).toBe(401);
  });

  it('auth failure — device role returns 403', async () => {
    const deviceToken = jwtHelper.sign({ sub: deviceWithPiId, role: 'DEVICE' });
    const res = await request(app)
      .get(`/api/v1/device/${deviceWithPiId}/analytics/visitors`)
      .set('Authorization', `Bearer ${deviceToken}`);
    expect(res.status).toBe(403);
  });

  it.each<Record<string, string | number>>([
    { sortBy: 'bogus' },
    { order: 'sideways' },
    { gender: 'robot' },
    { visits: 'many' },
    { ageBucket: 'old' },
    { from: 'not-a-date' },
    { pageSize: 1000 },
    { page: 0 }
  ])('validation failure — %j returns 400', async query => {
    const res = await getVisitors(deviceWithPiId, query);
    expect(res.status).toBe(400);
  });

  it('not found — device not owned by admin returns 404', async () => {
    const res = await getVisitors(otherAdminDevice);
    expect(res.status).toBe(404);
  });

  it('boundary — device with no piId returns null data, not an error', async () => {
    const res = await getVisitors(deviceWithoutPiId);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('boundary — filters that match nothing return an empty page', async () => {
    const res = await getVisitors(deviceWithPiId, { gender: 'male', visits: 'oneTime' });
    expect(res.body.data).toMatchObject({ items: [], totalItems: 0, totalPages: 1, page: 1 });
  });
});
