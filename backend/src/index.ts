import dotenv from 'dotenv';
import { createApp, startServer } from './server';
import db from './db';

dotenv.config();

// Create the Express app
const app = createApp();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await db.closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await db.closePool();
  process.exit(0);
});

// Start the server
(async () => {
  // Check database connection on startup
  const dbHealthy = await db.checkHealth();
  if (dbHealthy) {
    console.log('Database connection established');
  } else {
    console.warn('Database connection failed - server running in degraded mode');
  }

  // Start server with HTTPS support if configured
  startServer(app);
})();
