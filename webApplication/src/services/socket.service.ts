import { io, Socket } from 'socket.io-client';

class DashboardSocketService {
  private socket: Socket | null = null;

  connect(token: string): Socket {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(import.meta.env.VITE_SOCKET_URL as string, {
      transports: ['websocket'],
      auth: { token }
    });
    this.socket.emit('joinAdminRoom');
    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const dashboardSocketService = new DashboardSocketService();
