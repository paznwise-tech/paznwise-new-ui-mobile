import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { AuthStorage } from './authStorage';

// Single shared Socket.IO connection for real-time messaging.
// Handshake auth: token in the `auth` object (standard). Default /socket.io path.
let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket | null> {
  const token = await AuthStorage.getAccessToken();
  if (!token) return null;

  if (socket) {
    // Refresh auth token and reconnect if needed.
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('[socket] connected', socket?.id));
  socket.on('disconnect', reason => console.log('[socket] disconnected:', reason));
  socket.on('connect_error', err => console.warn('[socket] connect_error:', err.message));

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
