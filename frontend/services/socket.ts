import { io, Socket } from 'socket.io-client';
import { getApiUrl, getAuthToken } from './api';
import { JobStatus } from '@/types';

let socket: Socket | null = null;

export type SocketStatus = 'connected' | 'connecting' | 'disconnected';

export function initializeSocket(
  onJobUpdated: (update: { jobId: string; status: JobStatus }) => void,
  onStatusChange: (status: SocketStatus) => void
) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const token = getAuthToken();
  const url = getApiUrl();

  if (!token) {
    onStatusChange('disconnected');
    return;
  }

  onStatusChange('connecting');

  socket = io(url, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    onStatusChange('connected');
  });

  socket.on('disconnect', () => {
    onStatusChange('disconnected');
  });

  socket.on('connect_error', () => {
    onStatusChange('disconnected');
  });

  socket.on('job:updated', (payload: { jobId: string; status: JobStatus }) => {
    onJobUpdated(payload);
  });
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
