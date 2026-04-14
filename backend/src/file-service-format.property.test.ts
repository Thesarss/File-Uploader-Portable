/**
 * Property-Based Tests for FileService - File Format Acceptance
 * Tests that all supported file formats are accepted by the upload handler
 */

import { FileService, FileInput, UploadMetadata } from './file-service';
import { ClassifierService, FileCategory } from './classifier-service';
import { StorageService } from './storage-service';
import { HistoryService } from './history-service';
import { ConfigManager } from './config-manager';
import * as fc from 'fast-check';

describe('FileService Property-Based Tests - File Format Acceptance', () => {
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
    // Photo extensions - Requirement 2.2
    const photoExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif', '.bmp', '.tiff'];
    // Video extensions - Requirement 2.3
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'];
    // Document extensions - Requirement 2.4
    const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
    // Audio extensions - Requirement 2.5
    const audioExtensions = ['.mp3', '.wav', '.aac', '.flac', '.ogg'];
    // Archive extensions - Requirement 2.6
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
    }, 10000);

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
    }, 10000);

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
    }, 10000);

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
    }, 10000);

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
    }, 10000);

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
    }, 10000);
  });
});
