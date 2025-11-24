import { Server } from 'socket.io';

let io = null;

export const initSocket = (httpServer, corsOrigin) => {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

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