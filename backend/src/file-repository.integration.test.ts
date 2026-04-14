import { FileRepository, FileCategory, UploadRecordInput } from './file-repository';
import { getPool } from './db';

/**
 * Integration tests for FileRepository
 * These tests require a running PostgreSQL database
 * Run: docker-compose up -d && node setup-database.js
 */

describe('FileRepository Integration Tests', () => {
  let repository: FileRepository;

  beforeAll(async () => {
    repository = new FileRepository();
    
    // Check if database is available
    try {
      const pool = getPool();
      await pool.query('SELECT 1');
    } catch (error) {
      console.log('Database not available, skipping integration tests');
      return;
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      const pool = getPool();
      await pool.query("DELETE FROM uploads WHERE session_id LIKE 'test-%'");
      await pool.end();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('insertUploadRecord', () => {
    it('should insert a record and return it with generated ID', async () => {
      const input: UploadRecordInput = {
        fileName: 'integration-test.jpg',
        originalName: 'test.jpg',
        fileSize: 1024,
        category: FileCategory.Photo,
        storedPath: '/uploads/Photos/integration-test.jpg',
        mimeType: 'image/jpeg',
        sessionId: 'test-integration-1',
        deviceInfo: 'Jest Test',
        checksum: 'abc123'
      };

      const result = await repository.insertUploadRecord(input);

      expect(result).toHaveProperty('id');
      expect(result.fileName).toBe(input.fileName);
      expect(result.originalName).toBe(input.originalName);
      expect(result.fileSize).toBe(input.fileSize);
      expect(result.category).toBe(input.category);
      expect(result.storedPath).toBe(input.storedPath);
      expect(result.mimeType).toBe(input.mimeType);
      expect(result.sessionId).toBe(input.sessionId);
      expect(result.deviceInfo).toBe(input.deviceInfo);
      expect(result.checksum).toBe(input.checksum);
      expect(result.uploadedAt).toBeInstanceOf(Date);
    });

    it('should insert multiple records in the same session', async () => {
      const sessionId = 'test-integration-2';
      
      const input1: UploadRecordInput = {
        fileName: 'file1.jpg',
        originalName: 'file1.jpg',
        fileSize: 1024,
        category: FileCategory.Photo,
        storedPath: '/uploads/Photos/file1.jpg',
        mimeType: 'image/jpeg',
        sessionId: sessionId
      };

      const input2: UploadRecordInput = {
        fileName: 'file2.pdf',
        originalName: 'file2.pdf',
        fileSize: 2048,
        category: FileCategory.Document,
        storedPath: '/uploads/Documents/file2.pdf',
        mimeType: 'application/pdf',
        sessionId: sessionId
      };

      const result1 = await repository.insertUploadRecord(input1);
      const result2 = await repository.insertUploadRecord(input2);

      expect(result1.id).not.toBe(result2.id);
      expect(result1.sessionId).toBe(sessionId);
      expect(result2.sessionId).toBe(sessionId);
    });
  });

  describe('getUploadsBySession', () => {
    it('should retrieve all uploads for a session', async () => {
      const sessionId = 'test-integration-3';
      
      // Insert test data
      await repository.insertUploadRecord({
        fileName: 'session-file1.jpg',
        originalName: 'session-file1.jpg',
        fileSize: 1024,
        category: FileCategory.Photo,
        storedPath: '/uploads/Photos/session-file1.jpg',
        mimeType: 'image/jpeg',
        sessionId: sessionId
      });

      await repository.insertUploadRecord({
        fileName: 'session-file2.jpg',
        originalName: 'session-file2.jpg',
        fileSize: 2048,
        category: FileCategory.Photo,
        storedPath: '/uploads/Photos/session-file2.jpg',
        mimeType: 'image/jpeg',
        sessionId: sessionId
      });

      // Query by session
      const results = await repository.getUploadsBySession(sessionId);

      expect(results).toHaveLength(2);
      expect(results[0].sessionId).toBe(sessionId);
      expect(results[1].sessionId).toBe(sessionId);
      
      // Verify ordering (most recent first)
      expect(results[0].uploadedAt.getTime()).toBeGreaterThanOrEqual(
        results[1].uploadedAt.getTime()
      );
    });

    it('should return empty array for non-existent session', async () => {
      const results = await repository.getUploadsBySession('non-existent-session');
      expect(results).toEqual([]);
    });
  });

  describe('getRecentUploads', () => {
    it('should retrieve recent uploads with limit', async () => {
      const sessionId = 'test-integration-4';
      
      // Insert test data
      for (let i = 0; i < 5; i++) {
        await repository.insertUploadRecord({
          fileName: `recent-file${i}.jpg`,
          originalName: `recent-file${i}.jpg`,
          fileSize: 1024 * (i + 1),
          category: FileCategory.Photo,
          storedPath: `/uploads/Photos/recent-file${i}.jpg`,
          mimeType: 'image/jpeg',
          sessionId: sessionId
        });
      }

      // Get recent uploads with limit
      const results = await repository.getRecentUploads(3);

      expect(results.length).toBeGreaterThanOrEqual(3);
      
      // Verify ordering (most recent first)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].uploadedAt.getTime()).toBeGreaterThanOrEqual(
          results[i + 1].uploadedAt.getTime()
        );
      }
    });

    it('should respect the limit parameter', async () => {
      const results = await repository.getRecentUploads(5);
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Data integrity', () => {
    it('should preserve all field values correctly', async () => {
      const input: UploadRecordInput = {
        fileName: 'integrity-test.pdf',
        originalName: 'original-name.pdf',
        fileSize: 123456,
        category: FileCategory.Document,
        storedPath: '/uploads/Documents/integrity-test.pdf',
        mimeType: 'application/pdf',
        sessionId: 'test-integration-5',
        deviceInfo: 'Chrome/Windows',
        checksum: 'sha256checksum123'
      };

      const inserted = await repository.insertUploadRecord(input);
      const retrieved = await repository.getUploadsBySession(input.sessionId);

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(inserted.id);
      expect(retrieved[0].fileName).toBe(input.fileName);
      expect(retrieved[0].originalName).toBe(input.originalName);
      expect(retrieved[0].fileSize).toBe(input.fileSize);
      expect(retrieved[0].category).toBe(input.category);
      expect(retrieved[0].storedPath).toBe(input.storedPath);
      expect(retrieved[0].mimeType).toBe(input.mimeType);
      expect(retrieved[0].sessionId).toBe(input.sessionId);
      expect(retrieved[0].deviceInfo).toBe(input.deviceInfo);
      expect(retrieved[0].checksum).toBe(input.checksum);
    });
  });
});
