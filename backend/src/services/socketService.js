import { Server as IOServer } from 'socket.io';

let io = null;

export const initSocket = (server) => {
  io = new IOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // --- Socket.io connection handling ---
  io.on('connection', (socket) => {
    console.log('✓ Socket connected:', socket.id);

    socket.on('join', (studentId) => {
      if (!studentId) return;
      socket.join(studentId);
      console.log(`✓ Socket ${socket.id} joined room ${studentId}`);
    });

    socket.on('disconnect', () => {
      console.log('✗ Socket disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};