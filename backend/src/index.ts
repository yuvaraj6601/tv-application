import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { initializeSocketGateway } from './socket/socket.gateway';
import { prisma } from './db';
import { jwtHelper } from './helpers/jwt.helper';
import { startDeviceStatusScheduler } from './schedulers/device-status.scheduler';
import { adminBootstrapService } from './services/admin-bootstrap.service';

dotenv.config();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || '*'
  }
});

initializeSocketGateway(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    next(new Error('Unauthorized'));
    return;
  }

  try {
    const auth = jwtHelper.verify(token);
    socket.data.auth = auth;
    next();
  } catch (_error) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', socket => {
  socket.on('joinDeviceRoom', async (deviceId: string) => {
    const auth = socket.data.auth as { sub: string; role: 'ADMIN' | 'DEVICE' } | undefined;
    if (!auth || auth.role !== 'DEVICE' || auth.sub !== deviceId) {
      socket.emit('authError', { message: 'Forbidden device room access' });
      return;
    }

    socket.join(`device:${deviceId}`);
    await prisma.device.update({
      where: { id: deviceId },
      data: {
        status: 'ONLINE',
        lastSeen: new Date()
      }
    });
    io.to(`admin:devices`).emit('deviceStatusChanged', { deviceId, status: 'ONLINE' });
  });

  socket.on('joinAdminRoom', () => {
    const auth = socket.data.auth as { sub: string; role: 'ADMIN' | 'DEVICE' } | undefined;
    if (!auth || auth.role !== 'ADMIN') {
      socket.emit('authError', { message: 'Forbidden admin room access' });
      return;
    }

    socket.join('admin:devices');
  });

  socket.on('heartbeat', async (payload: { appVersion?: string }) => {
    const auth = socket.data.auth as { sub: string; role: 'ADMIN' | 'DEVICE' } | undefined;
    if (!auth || auth.role !== 'DEVICE') {
      socket.emit('authError', { message: 'Forbidden heartbeat' });
      return;
    }

    const deviceId = auth.sub;
    await prisma.deviceHeartbeat.create({
      data: {
        deviceId,
        appVersion: payload.appVersion
      }
    });
    await prisma.device.update({
      where: { id: deviceId },
      data: {
        status: 'ONLINE',
        lastSeen: new Date()
      }
    });
    io.to(`admin:devices`).emit('deviceHeartbeat', { deviceId, appVersion: payload.appVersion });
  });
});

const port = Number(process.env.PORT || 8080);
server.listen(port, async () => {
  await adminBootstrapService.ensureDefaultAdmin();
  startDeviceStatusScheduler();
  process.stdout.write(`Backend listening on ${port}\n`);
});
