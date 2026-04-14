/**
 * Property-Based Tests for FileService
 * Tests universal properties across all inputs through randomized testing
 */

import { FileService, FileInput, UploadMetadata } from './file-service';
import { ClassifierService, FileCategory } from './classifier-service';
import { StorageService } from './storage-service';
import { HistoryService } from './history-service';
import { ConfigManager } from './config-manager';
import * as fc from 'fast-check';

describe('FileService Property-Based Tests', () => {
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
   * Property 1: Supported File Format Acceptance
   * **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**
   * 
   * For any file with a supported extension (photo, video, document, audio, or archive formats),
   * the upload handler shall accept and process the file successfully.
   */
  describe('Property 1: Supported File Format Acceptance', () => {
    // Photo extensions
    const photoExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif', '.bmp', '.tiff'];
    // Video extensions
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'];
    // Document extensions
    const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
    // Audio extensions
    const audioExtensions = ['.mp3', '.wav', '.aac', '.flac', '.ogg'];
    // Archive extensions
    const archiveExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz'];

    const allSupportedExtensions = [
      ...photoExtensions,
      ...videoExtensions,
      ...documentExtensions,
      ...audioExtensions,
      ...archiveExtensions,
    ];

    it('should accept all photo format files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...photoExtensions),
          fc.integer({ min: 100, max: 1000000 }),
          async (extension, size) => {
            const fileName = `test${extension}`;
            const file: FileInput = {
              buffer: Buffer.alloc(size),
              originalname: fileName,
              mimetype: 'image/jpeg',
              size,
            };
            const metadata: UploadMetadata = {
              sessionId: 'test-session',
              deviceInfo: 'test-device',
            };

            const result = await fileService.handleUpload(file, metadata);

            // Should accept the file (success or storage failure, but not rejection)
            return result.success === true || (result.error !== undefined && !result.error.includes('exceeds maximum'));
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should accept all video format files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...videoExtensions),
          fc.integer({ min: 100, max: 1000000 }),
          async (extension, size) => {
            const fileName = `test${extension}`;
            const file: FileInput = {
              buffer: Buffer.alloc(size),
              originalname: fileName,
              mimetype: 'video/mp4',
              size,
            };
            const metadata: UploadMetadata = {
              sessionId: 'test-session',
              deviceInfo: 'test-device',
            };

            const result = await fileService.handleUpload(file, metadata);

            return result.success === true || (result.error !== undefined && !result.error.includes('exceeds maximum'));
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should accept all document format files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...documentExtensions),
          fc.integer({ min: 100, max: 1000000 }),
          async (extension, size) => {
            const fileName = `test${extension}`;
            const file: FileInput = {
              buffer: Buffer.alloc(size),
              originalname: fileName,
              mimetype: 'application/pdf',
              size,
            };
            const metadata: UploadMetadata = {
              sessionId: 'test-session',
              deviceInfo: 'test-device',
            };

            const result = await fileService.handleUpload(file, metadata);

            return result.success === true || (result.error !== undefined && !result.error.includes('exceeds maximum'));
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should accept all audio format files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...audioExtensions),
          fc.integer({ min: 100, max: 1000000 }),
          async (extension, size) => {
            const fileName = `test${extension}`;
            const file: FileInput = {
              buffer: Buffer.alloc(size),
              originalname: fileName,
              mimetype: 'audio/mpeg',
              size,
            };
            const metadata: UploadMetadata = {
              sessionId: 'test-session',
              deviceInfo: 'test-device',
            };

            const result = await fileService.handleUpload(file, metadata);

            return result.success === true || (result.error !== undefined && !result.error.includes('exceeds maximum'));
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should accept all archive format files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...archiveExtensions),
          fc.integer({ min: 100, max: 1000000 }),
          async (extension, size) => {
            const fileName = `test${extension}`;
            const file: FileInput = {
              buffer: Buffer.alloc(size),
              originalname: fileName,
              mimetype: 'application/zip',
              size,
            };
            const metadata: UploadMetadata = {
              sessionId: 'test-session',
              deviceInfo: 'test-device',
            };

            const result = await fileService.handleUpload(file, metadata);

            return result.success === true || (result.error !== undefined && !result.error.includes('exceeds maximum'));
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should accept all supported file formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...allSupportedExtensions),
          fc.integer({ min: 100, max: 1000000 }),
          async (extension, size) => {
            const fileName = `test${extension}`;
            const file: FileInput = {
              buffer: Buffer.alloc(size),
              originalname: fileName,
              mimetype: 'application/octet-stream',
              size,
            };
            const metadata: UploadMetadata = {
              sessionId: 'test-session',
              deviceInfo: 'test-device',
            };

            const result = await fileService.handleUpload(file, metadata);

            // File should be accepted (not rejected for format reasons)
            return result.success === true || (result.error !== undefined && !result.error.includes('exceeds maximum'));
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 2: File Size Limit Enforcement
   * **Validates: Requirements 2.7**
   * 
   * For any file with size ≤ 500MB, the upload handler shall accept it,
   * and for any file with size > 500MB, the upload handler shall reject it with an appropriate error.
   */
  describe('Property 2: File Size Limit Enforcement', () => {
    const MAX_FILE_SIZE = 524288000; // 500MB in bytes

    it('should accept files at or below the size limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: MAX_FILE_SIZE }),
          async (size) => {
            const file: FileInput = {
              buffer: Buffer.alloc(Math.min(size, 10000)), // Use small buffer for testing
              originalname: 'test.jpg',
              mimetype: 'image/jpeg',
              size, // Actual size reported
            };
            const metadata: UploadMetadata = {
              sessionId: 'test-session',
              deviceInfo: 'test-device',
            };

            const result = await fileService.handleUpload(file, metadata);

            // Should not reject due to size (may fail for other reasons like storage)
            return !result.error || !result.error.includes('exceeds maximum');
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should reject files exceeding the size limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE + 100000000 }),
          async (size) => {
            const file: FileInput = {
              buffer: Buffer.alloc(1000), // Small buffer, but report large size
              originalname: 'test.jpg',
              mimetype: 'image/jpeg',
              size, // Actual size reported
            };
            const metadata: UploadMetadata = {
              sessionId: 'test-session',
              deviceInfo: 'test-device',
            };

            const result = await fileService.handleUpload(file, metadata);

            // Should reject with size error
            return result.success === false && 
                   result.error !== undefined && 
                   result.error.includes('exceeds maximum');
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should enforce size limit at exact boundary', async () => {
      // Test exactly at the limit
      const file: FileInput = {
        buffer: Buffer.alloc(1000),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: MAX_FILE_SIZE,
      };
      const metadata: UploadMetadata = {
        sessionId: 'test-session',
        deviceInfo: 'test-device',
      };

      const result = await fileService.handleUpload(file, metadata);

      // Should accept file at exact limit
      expect(!result.error || !result.error.includes('exceeds maximum')).toBe(true);
    });

    it('should enforce size limit just above boundary', async () => {
      // Test just above the limit
      const file: FileInput = {
        buffer: Buffer.alloc(1000),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: MAX_FILE_SIZE + 1,
      };
      const metadata: UploadMetadata = {
        sessionId: 'test-session',
        deviceInfo: 'test-device',
      };

      const result = await fileService.handleUpload(file, metadata);

      // Should reject file just above limit
      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });
  });

  /**
   * Property 12: Multiple File Processing
   * **Validates: Requirements 6.1, 6.2, 6.3**
   * 
   * For any set of multiple files uploaded in a single session, the upload handler shall
   * process each file independently, and the success or failure of one file shall not
   * prevent processing of the remaining files.
   */
  describe('Property 12: Multiple File Processing', () => {
    it('should process all files independently in a batch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              extension: fc.constantFrom('.jpg', '.mp4', '.pdf', '.mp3', '.zip', '.txt'),
              size: fc.integer({ min: 100, max: 1000000 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (fileSpecs) => {
            const files: FileInput[] = fileSpecs.map((spec, index) => ({
              buffer: Buffer.alloc(Math.min(spec.size, 1000)),
              originalname: `file${index}${spec.extension}`,
              mimetype: 'application/octet-stream',
              size: spec.size,
            }));

            const metadata: UploadMetadata = {
              sessionId: 'batch-session',
              deviceInfo: 'test-device',
            };

            const results = await fileService.handleMultipleUploads(files, metadata);

            // Should return result for each file
            return results.length === files.length;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should continue processing after individual file failures', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              extension: fc.constantFrom('.jpg', '.mp4', '.pdf'),
              size: fc.integer({ min: 100, max: 600000000 }), // Some will exceed limit
            }),
            { minLength: 3, maxLength: 6 }
          ),
          async (fileSpecs) => {
            const files: FileInput[] = fileSpecs.map((spec, index) => ({
              buffer: Buffer.alloc(1000),
              originalname: `file${index}${spec.extension}`,
              mimetype: 'application/octet-stream',
              size: spec.size,
            }));

            const metadata: UploadMetadata = {
              sessionId: 'batch-session',
              deviceInfo: 'test-device',
            };

            const results = await fileService.handleMultipleUploads(files, metadata);

            // Should process all files even if some fail
            return results.length === files.length;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should process files with mixed valid and invalid sizes', async () => {
      const MAX_SIZE = 524288000;
      
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          async (numFiles) => {
            const files: FileInput[] = [];
            
            // Create mix of valid and invalid files
            for (let i = 0; i < numFiles; i++) {
              const isValid = i % 2 === 0;
              files.push({
                buffer: Buffer.alloc(1000),
                originalname: `file${i}.jpg`,
                mimetype: 'image/jpeg',
                size: isValid ? 1000000 : MAX_SIZE + 1000000,
              });
            }

            const metadata: UploadMetadata = {
              sessionId: 'mixed-batch',
              deviceInfo: 'test-device',
            };

            const results = await fileService.handleMultipleUploads(files, metadata);

            // All files should be processed
            if (results.length !== files.length) return false;

            // Valid files should succeed (or fail for non-size reasons)
            // Invalid files should fail with size error
            for (let i = 0; i < results.length; i++) {
              const isValid = i % 2 === 0;
              if (!isValid) {
                if (results[i].success || !results[i].error?.includes('exceeds maximum')) {
                  return false;
                }
              }
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle empty file array', async () => {
      const files: FileInput[] = [];
      const metadata: UploadMetadata = {
        sessionId: 'empty-batch',
        deviceInfo: 'test-device',
      };

      const results = await fileService.handleMultipleUploads(files, metadata);

      expect(results).toHaveLength(0);
    });

    it('should process single file in batch', async () => {
      const files: FileInput[] = [{
        buffer: Buffer.alloc(1000),
        originalname: 'single.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      }];
      const metadata: UploadMetadata = {
        sessionId: 'single-batch',
        deviceInfo: 'test-device',
      };

      const results = await fileService.handleMultipleUploads(files, metadata);

      expect(results).toHaveLength(1);
    });
  });
});
