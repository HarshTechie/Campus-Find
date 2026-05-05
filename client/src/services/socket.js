import { io } from 'socket.io-client';
import { getToken } from './auth';

let socket = null;

export function connectSocket() {
  const token = getToken();
  if (!token) return null;

  if (socket && socket.connected) return socket;

 if (socket && !socket.connected) {
    try {
      socket.auth = { token };
      socket.connect();
      return socket;
    } catch (err) {
      console.warn('socket reconnect failed', err);
      socket = null;
    }
  }

  
  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  
  socket.on('connect', () => console.log('socket (client) connected', socket.id));
  socket.on('disconnect', (r) => console.log('socket (client) disconnected', r));
  socket.on('connect_error', (err) => console.log('socket (client) connect_error', err && err.message));

  return socket;
}

export function getSocket() {
  return socket;
}
