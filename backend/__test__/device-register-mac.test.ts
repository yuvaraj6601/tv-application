import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db';

const UNIQUE_ID_PREFIX = 'mac-register-test-device-';
const MAC_A = 'AA:BB:CC:11:22:33';
const MAC_B = 'AA:BB:CC:44:55:66';

beforeAll(async () => {
  await prisma.device.deleteMany({ where: { deviceUniqueId: { startsWith: UNIQUE_ID_PREFIX } } });
});

afterAll(async () => {
  await prisma.device.deleteMany({ where: { deviceUniqueId: { startsWith: UNIQUE_ID_PREFIX } } });
  await prisma.$disconnect();
});

describe('POST /api/v1/device/register — macAddress', () => {
  it('happy path — stores macAddress on a newly created device', async () => {
    const deviceUniqueId = `${UNIQUE_ID_PREFIX}1`;

    const res = await request(app)
      .post('/api/v1/device/register')
      .send({ deviceName: 'Lobby TV', deviceUniqueId, macAddress: MAC_A });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(res.body.data.deviceId).toBeTruthy();

    const stored = await prisma.device.findUnique({ where: { deviceUniqueId } });
    expect(stored?.macAddress).toBe(MAC_A);
  });

  it('re-register with same deviceUniqueId reuses the existing row instead of creating a duplicate', async () => {
    const deviceUniqueId = `${UNIQUE_ID_PREFIX}2`;

    const first = await request(app)
      .post('/api/v1/device/register')
      .send({ deviceName: 'Lobby TV', deviceUniqueId, macAddress: MAC_A });
    const firstDeviceId = first.body.data.deviceId;

    const second = await request(app)
      .post('/api/v1/device/register')
      .send({ deviceName: 'Lobby TV', deviceUniqueId, macAddress: MAC_A });

    expect(second.status).toBe(200);
    expect(second.body.data.deviceId).toBe(firstDeviceId);

    const matches = await prisma.device.findMany({ where: { deviceUniqueId } });
    expect(matches).toHaveLength(1);
  });

  it('re-register with a changed macAddress on the same deviceUniqueId updates the stored macAddress, still no duplicate row', async () => {
    const deviceUniqueId = `${UNIQUE_ID_PREFIX}3`;

    await request(app)
      .post('/api/v1/device/register')
      .send({ deviceName: 'Lobby TV', deviceUniqueId, macAddress: MAC_A });

    const res = await request(app)
      .post('/api/v1/device/register')
      .send({ deviceName: 'Lobby TV', deviceUniqueId, macAddress: MAC_B });

    expect(res.status).toBe(200);

    const matches = await prisma.device.findMany({ where: { deviceUniqueId } });
    expect(matches).toHaveLength(1);
    expect(matches[0].macAddress).toBe(MAC_B);
  });

  it('validation failure — macAddress in the wrong format is rejected with 400', async () => {
    const deviceUniqueId = `${UNIQUE_ID_PREFIX}4`;

    const res = await request(app)
      .post('/api/v1/device/register')
      .send({ deviceName: 'Lobby TV', deviceUniqueId, macAddress: 'not-a-mac' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe(false);

    const stored = await prisma.device.findUnique({ where: { deviceUniqueId } });
    expect(stored).toBeNull();
  });

  it('boundary — macAddress is optional; registration still succeeds without it', async () => {
    const deviceUniqueId = `${UNIQUE_ID_PREFIX}5`;

    const res = await request(app)
      .post('/api/v1/device/register')
      .send({ deviceName: 'Lobby TV', deviceUniqueId });

    expect(res.status).toBe(200);

    const stored = await prisma.device.findUnique({ where: { deviceUniqueId } });
    expect(stored?.macAddress).toBeNull();
  });

  it('conflict — same macAddress under a different deviceUniqueId reuses the existing row instead of duplicating (e.g. deviceUniqueId fallback drift across reinstalls)', async () => {
    const firstUniqueId = `${UNIQUE_ID_PREFIX}6a`;
    const secondUniqueId = `${UNIQUE_ID_PREFIX}6b`;

    const first = await request(app)
      .post('/api/v1/device/register')
      .send({ deviceName: 'Lobby TV', deviceUniqueId: firstUniqueId, macAddress: MAC_A });
    const firstDeviceId = first.body.data.deviceId;

    const second = await request(app)
      .post('/api/v1/device/register')
      .send({ deviceName: 'Lobby TV', deviceUniqueId: secondUniqueId, macAddress: MAC_A });

    expect(second.status).toBe(200);
    expect(second.body.data.deviceId).toBe(firstDeviceId);

    const matches = await prisma.device.findMany({ where: { macAddress: MAC_A } });
    expect(matches).toHaveLength(1);
    expect(matches[0].deviceUniqueId).toBe(secondUniqueId);
  });

  it('no macAddress provided falls back to deviceUniqueId lookup, unaffected by macAddress-based dedup', async () => {
    const deviceUniqueId = `${UNIQUE_ID_PREFIX}7`;

    const first = await request(app)
      .post('/api/v1/device/register')
      .send({ deviceName: 'Lobby TV', deviceUniqueId });
    const firstDeviceId = first.body.data.deviceId;

    const second = await request(app)
      .post('/api/v1/device/register')
      .send({ deviceName: 'Lobby TV', deviceUniqueId });

    expect(second.status).toBe(200);
    expect(second.body.data.deviceId).toBe(firstDeviceId);

    const matches = await prisma.device.findMany({ where: { deviceUniqueId } });
    expect(matches).toHaveLength(1);
  });
});
