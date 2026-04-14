import { query } from './db';
import dotenv from 'dotenv';

dotenv.config();

/**
 * ConfigManager Service
 * Manages application configuration with database-first approach and environment variable fallback
 * Implements caching to avoid repeated database queries
 * 
 * Requirements: 4.1, 4.2
 */
export class ConfigManager {
  private cache: Map<string, { value: string; timestamp: number }>;
  private cacheTTL: number; // Cache time-to-live in milliseconds
  private dbAvailable: boolean;
  private pendingRequests: Map<string, Promise<string>>; // Track in-flight requests

  constructor(cacheTTL: number = 60000) { // Default 1 minute cache
    this.cache = new Map();
    this.cacheTTL = cacheTTL;
    this.dbAvailable = true;
    this.pendingRequests = new Map();
  }

  /**
   * Get target folder path for file storage
   * @returns Target folder path
   */
  async getTargetFolder(): Promise<string> {
    return await this.getConfig('target_folder', process.env.TARGET_FOLDER || './uploads');
  }

  /**
   * Get maximum file size in bytes
   * @returns Maximum file size
   */
  async getMaxFileSize(): Promise<number> {
    const value = await this.getConfig(
      'max_file_size',
      process.env.MAX_FILE_SIZE || '524288000'
    );
    return parseInt(value, 10);
  }

  /**
   * Get concurrent upload limit
   * @returns Concurrent upload limit
   */
  async getConcurrentUploadLimit(): Promise<number> {
    const value = await this.getConfig(
      'concurrent_upload_limit',
      process.env.CONCURRENT_UPLOAD_LIMIT || '3'
    );
    return parseInt(value, 10);
  }

  /**
   * Get configuration value with caching and fallback
   * @param key Configuration key
   * @param fallback Fallback value if database is unavailable
   * @returns Configuration value
   */
  private async getConfig(key: string, fallback: string): Promise<string> {
    // Check cache first
    const cached = this.getCachedValue(key);
    if (cached !== null) {
      return cached;
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    // Create new request and store it
    const request = this.fetchConfig(key, fallback);
    this.pendingRequests.set(key, request);

    try {
      const value = await request;
      return value;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Fetch configuration from database with fallback
   * @param key Configuration key
   * @param fallback Fallback value
   * @returns Configuration value
   */
  private async fetchConfig(key: string, fallback: string): Promise<string> {
    // Try to fetch from database
    if (this.dbAvailable) {
      try {
        const result = await query(
          'SELECT value FROM configuration WHERE key = $1',
          [key]
        );

        if (result.rows.length > 0) {
          const value = result.rows[0].value;
          this.setCachedValue(key, value);
          return value;
        }
      } catch (error) {
        console.warn(`Failed to fetch config from database for key: ${key}`, error);
        this.dbAvailable = false;
        // Fall through to use fallback
      }
    }

    // Use fallback value (from environment variables)
    console.log(`Using fallback value for config key: ${key}`);
    this.setCachedValue(key, fallback);
    return fallback;
  }

  /**
   * Get cached value if not expired
   * @param key Configuration key
   * @returns Cached value or null if not found or expired
   */
  private getCachedValue(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Set cached value with current timestamp
   * @param key Configuration key
   * @param value Configuration value
   */
  private setCachedValue(key: string, value: string): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all cached values
   */
  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Reset database availability flag
   * Useful for retrying database connection after it becomes available
   */
  resetDatabaseAvailability(): void {
    this.dbAvailable = true;
  }

  /**
   * Get all configuration values
   * @returns Object with all configuration values
   */
  async getAllConfig(): Promise<{
    targetFolder: string;
    maxFileSize: number;
    concurrentUploadLimit: number;
  }> {
    const [targetFolder, maxFileSize, concurrentUploadLimit] = await Promise.all([
      this.getTargetFolder(),
      this.getMaxFileSize(),
      this.getConcurrentUploadLimit(),
    ]);

    return {
      targetFolder,
      maxFileSize,
      concurrentUploadLimit,
    };
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
