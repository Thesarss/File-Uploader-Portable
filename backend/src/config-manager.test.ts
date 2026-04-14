import { ConfigManager } from './config-manager';
import * as db from './db';

// Mock the db module
jest.mock('./db');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    // Create new instance for each test
    configManager = new ConfigManager(60000); // 1 minute cache
    jest.clearAllMocks();
    
    // Set environment variables for fallback
    process.env.TARGET_FOLDER = './uploads';
    process.env.MAX_FILE_SIZE = '524288000';
    process.env.CONCURRENT_UPLOAD_LIMIT = '3';
  });

  afterEach(() => {
    configManager.clearCache();
  });

  describe('getTargetFolder', () => {
    it('should fetch target folder from database', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ value: '/custom/uploads' }],
        rowCount: 1,
      } as any);

      const result = await configManager.getTargetFolder();

      expect(result).toBe('/custom/uploads');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT value FROM configuration WHERE key = $1',
        ['target_folder']
      );
    });

    it('should fallback to environment variable if database fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await configManager.getTargetFolder();

      expect(result).toBe('./uploads');
    });

    it('should fallback to environment variable if key not found in database', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await configManager.getTargetFolder();

      expect(result).toBe('./uploads');
    });

    it('should use default value if environment variable not set', async () => {
      delete process.env.TARGET_FOLDER;
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await configManager.getTargetFolder();

      expect(result).toBe('./uploads');
    });
  });

  describe('getMaxFileSize', () => {
    it('should fetch max file size from database and parse as integer', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ value: '1048576000' }], // 1GB
        rowCount: 1,
      } as any);

      const result = await configManager.getMaxFileSize();

      expect(result).toBe(1048576000);
      expect(typeof result).toBe('number');
    });

    it('should fallback to environment variable if database fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const result = await configManager.getMaxFileSize();

      expect(result).toBe(524288000);
    });

    it('should use default 500MB if no configuration found', async () => {
      delete process.env.MAX_FILE_SIZE;
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await configManager.getMaxFileSize();

      expect(result).toBe(524288000);
    });
  });

  describe('getConcurrentUploadLimit', () => {
    it('should fetch concurrent upload limit from database', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ value: '5' }],
        rowCount: 1,
      } as any);

      const result = await configManager.getConcurrentUploadLimit();

      expect(result).toBe(5);
      expect(typeof result).toBe('number');
    });

    it('should fallback to environment variable if database fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection timeout'));

      const result = await configManager.getConcurrentUploadLimit();

      expect(result).toBe(3);
    });
  });

  describe('caching mechanism', () => {
    it('should cache database values and not query again within TTL', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ value: '/cached/path' }],
        rowCount: 1,
      } as any);

      // First call - should query database
      const result1 = await configManager.getTargetFolder();
      expect(result1).toBe('/cached/path');
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await configManager.getTargetFolder();
      expect(result2).toBe('/cached/path');
      expect(mockQuery).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should cache fallback values', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      // First call - should try database and fallback
      const result1 = await configManager.getTargetFolder();
      expect(result1).toBe('./uploads');
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Second call - should use cached fallback
      const result2 = await configManager.getTargetFolder();
      expect(result2).toBe('./uploads');
      expect(mockQuery).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should expire cache after TTL and query database again', async () => {
      // Create manager with short TTL for testing
      const shortTTLManager = new ConfigManager(100); // 100ms TTL

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ value: '/first/path' }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: [{ value: '/second/path' }],
          rowCount: 1,
        } as any);

      // First call
      const result1 = await shortTTLManager.getTargetFolder();
      expect(result1).toBe('/first/path');

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Second call - cache expired, should query again
      const result2 = await shortTTLManager.getTargetFolder();
      expect(result2).toBe('/second/path');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should clear cache when clearCache is called', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ value: '/first/path' }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: [{ value: '/second/path' }],
          rowCount: 1,
        } as any);

      // First call
      await configManager.getTargetFolder();
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Clear cache
      configManager.clearCache();

      // Second call - should query database again
      await configManager.getTargetFolder();
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('database availability handling', () => {
    it('should mark database as unavailable after first failure', async () => {
      mockQuery.mockRejectedValue(new Error('Connection failed'));

      // First call - tries database, fails, uses fallback
      await configManager.getTargetFolder();
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Clear cache to force retry
      configManager.clearCache();

      // Second call - should not try database again
      await configManager.getTargetFolder();
      expect(mockQuery).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should retry database after resetDatabaseAvailability is called', async () => {
      mockQuery
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({
          rows: [{ value: '/recovered/path' }],
          rowCount: 1,
        } as any);

      // First call - database fails
      await configManager.getTargetFolder();
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Clear cache and reset database availability
      configManager.clearCache();
      configManager.resetDatabaseAvailability();

      // Second call - should try database again
      const result = await configManager.getTargetFolder();
      expect(result).toBe('/recovered/path');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAllConfig', () => {
    it('should fetch all configuration values', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ value: '/all/config/path' }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: [{ value: '1073741824' }], // 1GB
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: [{ value: '5' }],
          rowCount: 1,
        } as any);

      const result = await configManager.getAllConfig();

      expect(result).toEqual({
        targetFolder: '/all/config/path',
        maxFileSize: 1073741824,
        concurrentUploadLimit: 5,
      });
    });

    it('should handle mixed database and fallback values', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ value: '/db/path' }],
          rowCount: 1,
        } as any)
        .mockRejectedValueOnce(new Error('DB error for max_file_size'))
        .mockResolvedValueOnce({
          rows: [{ value: '10' }],
          rowCount: 1,
        } as any);

      const result = await configManager.getAllConfig();

      expect(result).toEqual({
        targetFolder: '/db/path',
        maxFileSize: 524288000, // Fallback from env
        concurrentUploadLimit: 10,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values from database', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ value: '' }],
        rowCount: 1,
      } as any);

      const result = await configManager.getTargetFolder();

      expect(result).toBe('');
    });

    it('should handle non-numeric strings for numeric configs', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ value: 'not-a-number' }],
        rowCount: 1,
      } as any);

      const result = await configManager.getMaxFileSize();

      expect(result).toBeNaN();
    });

    it('should handle multiple concurrent requests with caching', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ value: '/concurrent/path' }],
        rowCount: 1,
      } as any);

      // Make multiple concurrent requests
      const results = await Promise.all([
        configManager.getTargetFolder(),
        configManager.getTargetFolder(),
        configManager.getTargetFolder(),
      ]);

      // All should return same value
      expect(results).toEqual([
        '/concurrent/path',
        '/concurrent/path',
        '/concurrent/path',
      ]);

      // Database should only be queried once (first request)
      // Note: Due to async nature, this might be 1 or 2 calls
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });
});
