import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './src/config/env.js';
import pool from './src/config/db.js';
import apiRoutes from './src/routes/api.js';
import { initSocket } from './src/services/socketService.js';
import { failSafeCheck } from './src/services/cronService.js';

const app = express();
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Load Routes
app.use('/api', apiRoutes);

// Health Check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      websocket: 'active'
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message
    });
  }
});

const server = createServer(app);

// Initialize Socket
initSocket(server, config.CORS_ORIGIN);

// Start Background Job
setInterval(failSafeCheck, 60 * 60 * 1000);
failSafeCheck();

const PORT = config.PORT;

async function start() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected');
    
    server.listen(PORT, () => {
      console.log('✓ Server running on port', PORT);
      console.log(`✓ Health: http://localhost:${PORT}/health`);
      console.log('✓ WebSocket enabled');
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err);
    process.exit(1);
  }
}

start();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    pool.end();
    console.log('Closed connections');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    pool.end();
    console.log('Closed connections');
    process.exit(0);
  });
});