/**
 * Property-Based Tests for FileService - File Size Limit Enforcement
 * Tests that file size limits are properly enforced
 */

import { FileService, FileInput, UploadMetadata } from './file-service';
import { ClassifierService } from './classifier-service';
import { StorageService } from './storage-service';
import { HistoryService } from './history-service';
import { ConfigManager } from './config-manager';
import * as fc from 'fast-check';

describe('FileService Property-Based Tests - File Size Limit', () => {
  let fileService: FileService;
  let classifierService: ClassifierService;
  let storageService: StorageService;
  let historyService: HistoryService;
  let configManager: ConfigManager;

  beforeEach(() => {
    classifierService = new ClassifierService();
    configManager = new ConfigManager();
    storageService = new StorageService(configManager);
    historyService = new HistoryService();
    fileService = new FileService(
      classifierService,
      storageService,
      historyService,
      configManager
    );
  });

  /**
   * Property 2: File Size Limit Enforcement
   * **Validates: Requirements 2.7**
   * 
   * For any file with size ≤ 500MB, the upload handler shall accept it,
   * and for any file with size > 500MB, the upload handler shall reject it
   * with an appropriate error.
   */
  describe('Property 2: File Size Limit Enforcement', () => {
    const MAX_FILE_SIZE = 524288000; // 500MB in bytes

    it('should accept files at or below 500MB limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate file sizes from 0 to MAX_FILE_SIZE (inclusive)
          fc.integer({ min: 0, max: MAX_FILE_SIZE }),
          async (fileSize) => {
            const file: FileInput = {
              buffer: Buffer.alloc(Math.min(fileSize, 1000)), // Use small buffer for testing
              originalname: 'test.jpg',
              mimetype: 'image/jpeg',
              size: fileSize,
            };
            const metadata: UploadMetadata = {
              sessionId: 'test-session',
              deviceInfo: 'test-device',
            };

            const result = await fileService.handleUpload(file, metadata);

            // File should be accepted (not rejected for size reasons)
            // It may fail for other reasons (storage, etc.) but not size
            if (!result.success && result.error) {
              return !result.error.includes('exceeds maximum');
            }
            return true;
          }
        ),
        { numRuns: 10 }
      );
    }, 10000);

    it('should reject files above 500MB limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate file sizes from MAX_FILE_SIZE + 1 to MAX_FILE_SIZE + 100MB
          fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE + 104857600 }),
          async (fileSize) => {
            const file: FileInput = {
              buffer: Buffer.alloc(1000), // Use small buffer for testing
              originalname: 'test.jpg',
              mimetype: 'image/jpeg',
              size: fileSize,
            };
            const metadata: UploadMetadata = {
              sessionId: 'test-session',
              deviceInfo: 'test-device',
            };

            const result = await fileService.handleUpload(file, metadata);

            // File should be rejected with size error
            return (
              !result.success &&
              result.error !== undefined &&
              result.error.includes('exceeds maximum')
            );
          }
        ),
        { numRuns: 10 }
      );
    }, 10000);

    it('should enforce exact 500MB boundary', async () => {
      // Test exact boundary values
      const boundaryTests = [
        MAX_FILE_SIZE - 1,     // Just below limit (should accept)
        MAX_FILE_SIZE,         // Exactly at limit (should accept)
        MAX_FILE_SIZE + 1,     // Just above limit (should reject)
      ];

      for (const fileSize of boundaryTests) {
        const file: FileInput = {
          buffer: Buffer.alloc(1000),
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          size: fileSize,
        };
        const metadata: UploadMetadata = {
          sessionId: 'test-session',
          deviceInfo: 'test-device',
        };

        const result = await fileService.handleUpload(file, metadata);

        if (fileSize <= MAX_FILE_SIZE) {
          // Should accept (not reject for size)
          if (!result.success && result.error) {
            expect(result.error).not.toContain('exceeds maximum');
          }
        } else {
          // Should reject with size error
          expect(result.success).toBe(false);
          expect(result.error).toContain('exceeds maximum');
        }
      }
    });
  });
});
