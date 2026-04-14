import * as fc from 'fast-check';
import { StorageService } from './storage-service';
import { ConfigManager } from './config-manager';
import { FileCategory } from './classifier-service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Property-Based Tests for StorageService
 * 
 * These tests verify universal correctness properties across random inputs
 */
describe('Property-Based Tests', () => {
  let storageService: StorageService;
  let testTargetFolder: string;

  beforeEach(async () => {
    testTargetFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-persist-test-'));
    const configManager = {
      getTargetFolder: jest.fn().mockResolvedValue(testTargetFolder),
    } as any;
    storageService = new StorageService(configManager);
  });

  afterEach(async () => {
    try {
      await fs.rm(testTargetFolder, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Property 3: File Storage Persistence', () => {
    /**
     * **Validates: Requirements 3.1**
     * 
     * For any file successfully received by the upload handler, 
     * the storage manager shall save it to the target folder, 
     * and the file shall be retrievable from the file system.
     */
    it('should save files to disk and make them retrievable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            filename: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9-_]/g, 'a') || 'file'),
            extension: fc.constantFrom('.jpg', '.png', '.mp4', '.pdf', '.mp3', '.zip', '.txt'),
            content: fc.uint8Array({ minLength: 10, maxLength: 1000 }),
          }),
          fc.constantFrom(
            FileCategory.Photo, 
            FileCategory.Video, 
            FileCategory.Document, 
            FileCategory.Audio, 
            FileCategory.Archive, 
            FileCategory.Other
          ),
          async (fileData, category) => {
            // Generate random file
            const originalFilename = `${fileData.filename}${fileData.extension}`;
            const fileBuffer = Buffer.from(fileData.content);
            const file = { buffer: fileBuffer, originalname: originalFilename };
            
            // Save file
            const result = await storageService.saveFile(file, category);
            
            // Verify save was successful
            expect(result.success).toBe(true);
            expect(result.storedPath).toBeTruthy();
            expect(result.finalFileName).toBeTruthy();
            
            // Verify file exists on disk
            const categoryFolder = await storageService.ensureCategoryFolder(category);
            const filePath = path.join(categoryFolder, result.finalFileName);
            const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
            expect(fileExists).toBe(true);
            
            // Verify file content matches original
            const retrievedContent = await fs.readFile(filePath);
            expect(Buffer.compare(retrievedContent, fileBuffer)).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});