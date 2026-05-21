import { io } from 'socket.io-client';
class DashboardSocketService {
    constructor() {
        this.socket = null;
    }
    connect(token) {
        if (this.socket) {
            return this.socket;
        }
        this.socket = io(import.meta.env.VITE_SOCKET_URL, {
            transports: ['websocket'],
            auth: { token }
        });
        this.socket.emit('joinAdminRoom');
        return this.socket;
    }
    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }
    getSocket() {
        return this.socket;
    }
}
export const dashboardSocketService = new DashboardSocketService();
