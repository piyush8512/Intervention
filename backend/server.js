import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './src/config/env.js';
import * as db from './src/config/db.js';
import apiRoutes from './src/routes/api.js';
import { initSocket } from './src/services/socketService.js';
import { startFailSafeJob } from './src/services/cronService.js';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health Check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Initialize Socket
initSocket(httpServer, config.corsOrigin);

// Start Server
async function start() {
  try {
    await db.query('SELECT NOW()'); 
    console.log('✓ Database connected');
    
    httpServer.listen(config.port, () => {
      console.log(`✓ Server running on port ${config.port}`);
      startFailSafeJob();
    });
  } catch (err) {
    console.error('✗ Startup failed:', err);
    process.exit(1);
  }
}

// Graceful Shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  httpServer.close(async () => {
    await db.end();
    console.log('Connections closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();