import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'file_uploader',
  user: process.env.DB_USER || 'uploader_user',
  password: process.env.DB_PASSWORD || '',
  max: parseInt(process.env.DB_POOL_SIZE || '10', 10), // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection not established
};

// Create connection pool
const pool = new Pool(dbConfig);

// Pool error handler
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a query using the connection pool
 * @param text SQL query string
 * @param params Query parameters
 * @returns Query result
 */
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error', { text, error });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns Pool client
 */
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

/**
 * Check database connection health
 * @returns True if connection is healthy, false otherwise
 */
export const checkHealth = async (): Promise<boolean> => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database health check passed', { timestamp: result.rows[0].now });
    return true;
  } catch (error) {
    console.error('Database health check failed', error);
    return false;
  }
};

/**
 * Get the connection pool instance
 * @returns Pool instance
 */
export const getPool = (): Pool => {
  return pool;
};

/**
 * Close all connections in the pool
 * Should be called when shutting down the application
 */
export const closePool = async (): Promise<void> => {
  await pool.end();
  console.log('Database connection pool closed');
};

export default {
  query,
  getClient,
  checkHealth,
  closePool,
  getPool,
  pool,
};
