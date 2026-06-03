import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create a singleton socket instance
export const socket = io(BACKEND_URL.replace('/api', ''), {
  withCredentials: true,
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('Connected to real-time server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected from real-time server');
});
