/**
 * Property-Based Tests for FileService - Multiple File Processing
 * 
 * Property 12: Multiple File Processing
 * **Validates: Requirements 6.1, 6.2, 6.3**
 * 
 * For any set of multiple files uploaded in a single session, the upload handler shall
 * process each file independently, and the success or failure of one file shall not
 * prevent processing of the remaining files.
 */

import { FileService, FileInput, UploadMetadata } from './file-service';
import { ClassifierService } from './classifier-service';
import { StorageService } from './storage-service';
import { HistoryService } from './history-service';
import { ConfigManager } from './config-manager';
import * as fc from 'fast-check';

describe('FileService - Property 12: Multiple File Processing', () => {
  let fileService: FileService;
  let classifierService: ClassifierService;
  let storageService: StorageService;
  let historyService: HistoryService;
  let configManager: ConfigManager;

  const MAX_FILE_SIZE = 524288000; // 500MB

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
   * Generator for valid file specifications
   */
  const validFileArb = fc.record({
    extension: fc.constantFrom('.jpg', '.png', '.mp4', '.pdf', '.mp3', '.zip', '.txt'),
    size: fc.integer({ min: 100, max: MAX_FILE_SIZE }),
    name: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, '_')),
  });

  /**
   * Generator for invalid file specifications (exceeds size limit)
   */
  const invalidFileArb = fc.record({
    extension: fc.constantFrom('.jpg', '.png', '.mp4', '.pdf'),
    size: fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE + 100000000 }),
    name: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, '_')),
  });

  /**
   * Test: All files in batch should be processed
   * Validates Requirement 6.1: Support multiple file selection
   */
  it('should process every file in a batch regardless of individual outcomes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validFileArb, { minLength: 2, maxLength: 10 }),
        async (fileSpecs) => {
          const files: FileInput[] = fileSpecs.map((spec, index) => ({
            buffer: Buffer.alloc(Math.min(spec.size, 10000)),
            originalname: `${spec.name}${index}${spec.extension}`,
            mimetype: 'application/octet-stream',
            size: spec.size,
          }));

          const metadata: UploadMetadata = {
            sessionId: 'batch-test-session',
            deviceInfo: 'test-device',
          };

          const results = await fileService.handleMultipleUploads(files, metadata);

          // Property: Result count must equal input count
          return results.length === files.length;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test: Invalid files should not block valid files
   * Validates Requirement 6.2: Process files sequentially
   * Validates Requirement 6.3: Continue on individual failures
   */
  it('should process valid files even when batch contains invalid files', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.array(validFileArb, { minLength: 1, maxLength: 5 }),
          fc.array(invalidFileArb, { minLength: 1, maxLength: 5 })
        ),
        async ([validSpecs, invalidSpecs]) => {
          // Interleave valid and invalid files
          const allSpecs = [...validSpecs, ...invalidSpecs];
          const files: FileInput[] = allSpecs.map((spec, index) => ({
            buffer: Buffer.alloc(1000),
            originalname: `file${index}${spec.extension}`,
            mimetype: 'application/octet-stream',
            size: spec.size,
          }));

          const metadata: UploadMetadata = {
            sessionId: 'mixed-batch-session',
            deviceInfo: 'test-device',
          };

          const results = await fileService.handleMultipleUploads(files, metadata);

          // Property 1: All files must be processed
          if (results.length !== files.length) return false;

          // Property 2: Invalid files must fail with size error
          const invalidCount = invalidSpecs.length;
          const failedWithSizeError = results.filter(
            r => !r.success && r.error?.includes('exceeds maximum')
          ).length;

          // At least the invalid files should fail with size error
          return failedWithSizeError >= invalidCount;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test: Each file result should be independent
   * Validates Requirement 6.3: One file failure doesn't prevent others
   */
  it('should produce independent results for each file', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            extension: fc.constantFrom('.jpg', '.pdf', '.mp3'),
            size: fc.integer({ min: 100, max: MAX_FILE_SIZE + 50000000 }),
          }),
          { minLength: 3, maxLength: 8 }
        ),
        async (fileSpecs) => {
          const files: FileInput[] = fileSpecs.map((spec, index) => ({
            buffer: Buffer.alloc(1000),
            originalname: `file${index}${spec.extension}`,
            mimetype: 'application/octet-stream',
            size: spec.size,
          }));

          const metadata: UploadMetadata = {
            sessionId: 'independent-test',
            deviceInfo: 'test-device',
          };

          const results = await fileService.handleMultipleUploads(files, metadata);

          // Property: Each result corresponds to exactly one input file
          if (results.length !== files.length) return false;

          // Property: Each result has the correct original name
          for (let i = 0; i < results.length; i++) {
            if (results[i].originalName !== files[i].originalname) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test: Batch with all invalid files
   * Validates Requirement 6.2, 6.3: Process all files even if all fail
   */
  it('should process all files even when all are invalid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(invalidFileArb, { minLength: 2, maxLength: 5 }),
        async (fileSpecs) => {
          const files: FileInput[] = fileSpecs.map((spec, index) => ({
            buffer: Buffer.alloc(1000),
            originalname: `invalid${index}${spec.extension}`,
            mimetype: 'application/octet-stream',
            size: spec.size,
          }));

          const metadata: UploadMetadata = {
            sessionId: 'all-invalid-session',
            deviceInfo: 'test-device',
          };

          const results = await fileService.handleMultipleUploads(files, metadata);

          // Property: All files processed
          if (results.length !== files.length) return false;

          // Property: All should fail with size error
          return results.every(r => !r.success && r.error?.includes('exceeds maximum'));
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test: Batch with all valid files
   * Validates Requirement 6.1, 6.2: Process multiple valid files
   */
  it('should successfully process batches of all valid files', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validFileArb, { minLength: 2, maxLength: 6 }),
        async (fileSpecs) => {
          const files: FileInput[] = fileSpecs.map((spec, index) => ({
            buffer: Buffer.alloc(Math.min(spec.size, 5000)),
            originalname: `valid${index}${spec.extension}`,
            mimetype: 'application/octet-stream',
            size: spec.size,
          }));

          const metadata: UploadMetadata = {
            sessionId: 'all-valid-session',
            deviceInfo: 'test-device',
          };

          const results = await fileService.handleMultipleUploads(files, metadata);

          // Property: All files processed
          return results.length === files.length;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test: Order preservation in results
   * Validates Requirement 6.2: Sequential processing maintains order
   */
  it('should maintain file order in results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            extension: fc.constantFrom('.jpg', '.txt', '.mp3'),
            size: fc.integer({ min: 100, max: 10000 }),
          }),
          { minLength: 3, maxLength: 7 }
        ),
        async (fileSpecs) => {
          const files: FileInput[] = fileSpecs.map((spec, index) => ({
            buffer: Buffer.alloc(spec.size),
            originalname: `ordered_${index}${spec.extension}`,
            mimetype: 'application/octet-stream',
            size: spec.size,
          }));

          const metadata: UploadMetadata = {
            sessionId: 'order-test',
            deviceInfo: 'test-device',
          };

          const results = await fileService.handleMultipleUploads(files, metadata);

          // Property: Results maintain input order
          for (let i = 0; i < results.length; i++) {
            if (results[i].originalName !== files[i].originalname) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Edge case: Empty batch
   */
  it('should handle empty file array', async () => {
    const files: FileInput[] = [];
    const metadata: UploadMetadata = {
      sessionId: 'empty-batch',
      deviceInfo: 'test-device',
    };

    const results = await fileService.handleMultipleUploads(files, metadata);

    expect(results).toHaveLength(0);
  });

  /**
   * Edge case: Single file batch
   */
  it('should handle single file in batch', async () => {
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
    expect(results[0].originalName).toBe('single.jpg');
  });

  /**
   * Test: Mixed file types in batch
   * Validates Requirement 6.1: Support multiple file types in one session
   */
  it('should handle batches with diverse file types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.shuffledSubarray(
          ['.jpg', '.png', '.mp4', '.avi', '.pdf', '.docx', '.mp3', '.wav', '.zip', '.tar'],
          { minLength: 3, maxLength: 10 }
        ),
        async (extensions) => {
          const files: FileInput[] = extensions.map((ext, index) => ({
            buffer: Buffer.alloc(1000),
            originalname: `diverse${index}${ext}`,
            mimetype: 'application/octet-stream',
            size: 5000,
          }));

          const metadata: UploadMetadata = {
            sessionId: 'diverse-batch',
            deviceInfo: 'test-device',
          };

          const results = await fileService.handleMultipleUploads(files, metadata);

          // Property: All files processed
          return results.length === files.length;
        }
      ),
      { numRuns: 10 }
    );
  });
});
