import { Pool } from 'pg';

// Create mock pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
};

// Mock pg module
jest.mock('pg', () => {
  return { 
    Pool: jest.fn(() => mockPool)
  };
});

// Import db after mocking
import db from './db';

describe('Database Connection Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('query function', () => {
    it('should execute a query successfully', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await db.query('SELECT * FROM test');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test', undefined);
      expect(result).toEqual(mockResult);
    });

    it('should execute a query with parameters', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await db.query('SELECT * FROM test WHERE id = $1', [1]);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test WHERE id = $1', [1]);
      expect(result).toEqual(mockResult);
    });

    it('should throw error when query fails', async () => {
      const mockError = new Error('Query failed');
      mockPool.query.mockRejectedValue(mockError);

      await expect(db.query('SELECT * FROM test')).rejects.toThrow('Query failed');
    });
  });

  describe('getClient function', () => {
    it('should return a client from the pool', async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClient);

      const client = await db.getClient();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(client).toEqual(mockClient);
    });
  });

  describe('checkHealth function', () => {
    it('should return true when database is healthy', async () => {
      const mockResult = { rows: [{ now: new Date() }] };
      mockPool.query.mockResolvedValue(mockResult);

      const isHealthy = await db.checkHealth();

      expect(mockPool.query).toHaveBeenCalledWith('SELECT NOW()');
      expect(isHealthy).toBe(true);
    });

    it('should return false when database connection fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await db.checkHealth();

      expect(isHealthy).toBe(false);
    });
  });

  describe('closePool function', () => {
    it('should close the connection pool', async () => {
      mockPool.end.mockResolvedValue(undefined);

      await db.closePool();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});
