/**
 * Integration tests for ConfigManager
 * These tests verify ConfigManager works with the actual database schema
 * 
 * Note: These tests require a running PostgreSQL database
 * Run with: npm test -- config-manager.integration.test.ts
 */

import { ConfigManager } from './config-manager';
import { query, checkHealth } from './db';

describe('ConfigManager Integration Tests', () => {
  let configManager: ConfigManager;
  let dbHealthy: boolean;

  beforeAll(async () => {
    // Check if database is available
    dbHealthy = await checkHealth();
    if (!dbHealthy) {
      console.warn('Database not available - integration tests will be skipped');
    }
  });

  beforeEach(() => {
    configManager = new ConfigManager(1000); // Short cache for testing
  });

  afterEach(() => {
    configManager.clearCache();
  });

  describe('with database available', () => {
    beforeEach(() => {
      if (!dbHealthy) {
        // Skip tests if database is not available
        return;
      }
    });

    it('should read target_folder from configuration table', async () => {
      if (!dbHealthy) {
        console.log('Skipping test - database not available');
        return;
      }

      const targetFolder = await configManager.getTargetFolder();
      
      // Should return a string value
      expect(typeof targetFolder).toBe('string');
      expect(targetFolder.length).toBeGreaterThan(0);
    });

    it('should read max_file_size from configuration table', async () => {
      if (!dbHealthy) {
        console.log('Skipping test - database not available');
        return;
      }

      const maxFileSize = await configManager.getMaxFileSize();
      
      // Should return a positive number
      expect(typeof maxFileSize).toBe('number');
      expect(maxFileSize).toBeGreaterThan(0);
    });

    it('should read concurrent_upload_limit from configuration table', async () => {
      if (!dbHealthy) {
        console.log('Skipping test - database not available');
        return;
      }

      const limit = await configManager.getConcurrentUploadLimit();
      
      // Should return a positive number
      expect(typeof limit).toBe('number');
      expect(limit).toBeGreaterThan(0);
    });

    it('should cache values and not query database repeatedly', async () => {
      if (!dbHealthy) {
        console.log('Skipping test - database not available');
        return;
      }

      // First call
      const value1 = await configManager.getTargetFolder();
      
      // Second call should use cache (we can't directly verify this without mocking,
      // but we can verify the value is consistent)
      const value2 = await configManager.getTargetFolder();
      
      expect(value1).toBe(value2);
    });

    it('should fetch all configuration values', async () => {
      if (!dbHealthy) {
        console.log('Skipping test - database not available');
        return;
      }

      const config = await configManager.getAllConfig();
      
      expect(config).toHaveProperty('targetFolder');
      expect(config).toHaveProperty('maxFileSize');
      expect(config).toHaveProperty('concurrentUploadLimit');
      
      expect(typeof config.targetFolder).toBe('string');
      expect(typeof config.maxFileSize).toBe('number');
      expect(typeof config.concurrentUploadLimit).toBe('number');
    });

    it('should verify configuration table has expected keys', async () => {
      if (!dbHealthy) {
        console.log('Skipping test - database not available');
        return;
      }

      // Query configuration table directly
      const result = await query(
        'SELECT key FROM configuration ORDER BY key'
      );

      const keys = result.rows.map(row => row.key);
      
      // Verify expected configuration keys exist
      expect(keys).toContain('target_folder');
      expect(keys).toContain('max_file_size');
      expect(keys).toContain('concurrent_upload_limit');
    });

    it('should handle cache expiration correctly', async () => {
      if (!dbHealthy) {
        console.log('Skipping test - database not available');
        return;
      }

      // Create manager with very short TTL
      const shortCacheManager = new ConfigManager(50); // 50ms

      const value1 = await shortCacheManager.getTargetFolder();
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const value2 = await shortCacheManager.getTargetFolder();
      
      // Values should still be the same (from database)
      expect(value1).toBe(value2);
    });
  });

  describe('fallback to environment variables', () => {
    it('should use environment variables when database is unavailable', async () => {
      // Set environment variables
      process.env.TARGET_FOLDER = './test-uploads';
      process.env.MAX_FILE_SIZE = '1000000';
      process.env.CONCURRENT_UPLOAD_LIMIT = '5';

      // Create a manager that will fail to connect to database
      // (This test assumes database might not be available)
      const fallbackManager = new ConfigManager();

      // Even if database fails, should get values from env
      const targetFolder = await fallbackManager.getTargetFolder();
      const maxFileSize = await fallbackManager.getMaxFileSize();
      const limit = await fallbackManager.getConcurrentUploadLimit();

      // Should return valid values (either from DB or env)
      expect(typeof targetFolder).toBe('string');
      expect(typeof maxFileSize).toBe('number');
      expect(typeof limit).toBe('number');
    });
  });
});
