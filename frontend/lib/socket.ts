import { io, Socket } from 'socket.io-client';
import { getApiUrl, getAuthToken } from './api';
import { JobStatus } from '@/types';

let socket: Socket | null = null;

export type SocketStatus = 'connected' | 'connecting' | 'disconnected';

export function initializeSocket(
  onJobUpdate: (payload: { jobId: string; status: JobStatus | string }) => void,
  onStatusChange?: (status: SocketStatus) => void
): Socket {
  if (socket && socket.connected) {
    onStatusChange?.('connected');
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  onStatusChange?.('connecting');
  const apiUrl = getApiUrl();
  const token = getAuthToken();

  socket = io(apiUrl, {
    transports: ['websocket', 'polling'],
    auth: {
      token: token || undefined,
    },
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    onStatusChange?.('connected');
  });

  socket.on('disconnect', () => {
    onStatusChange?.('disconnected');
  });

  socket.on('connect_error', () => {
    onStatusChange?.('disconnected');
  });

  socket.on('job:updated', (data) => {
    onJobUpdate(data);
  });

  socket.on('job:completed', (data) => {
    onJobUpdate({ jobId: data.jobId, status: 'COMPLETED' });
  });

  socket.on('job:failed', (data) => {
    onJobUpdate({ jobId: data.jobId, status: 'FAILED' });
  });

  socket.on('job:status', (data) => {
    onJobUpdate({ jobId: data.jobId, status: data.status });
  });

  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
