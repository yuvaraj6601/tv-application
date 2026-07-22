import { io, Socket } from 'socket.io-client';
import { config } from '../config';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): Socket {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(config.socketUrl, {
      transports: ['websocket'],
      auth: {
        token
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000
    });

    return this.socket;
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.disconnect();
    this.socket = null;
  }
}

export const tvSocketService = new SocketService();
