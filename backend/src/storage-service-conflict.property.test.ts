import * as fc from 'fast-check';
import { StorageService } from './storage-service';
import { ConfigManager } from './config-manager';
import { FileCategory } from './classifier-service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Property-Based Tests', () => {
  let storageService: StorageService;
  let configManager: ConfigManager;
  let testTargetFolder: string;

  beforeEach(async () => {
    // Create a temporary test folder
    testTargetFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-conflict-test-'));
    
    // Mock ConfigManager to return test folder
    configManager = {
      getTargetFolder: jest.fn().mockResolvedValue(testTargetFolder),
    } as any;
    
    storageService = new StorageService(configManager);
  });

  afterEach(async () => {
    // Clean up test folder
    try {
      await fs.rm(testTargetFolder, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  /**
   * Property 5: Filename Conflict Resolution
   * **Validates: Requirements 3.3**
   * 
   * For any file uploaded with a name that already exists in the target folder,
   * the storage manager shall append a numeric suffix (e.g., "_1", "_2") to
   * create a unique filename.
   */
  describe('Property 5: Filename Conflict Resolution', () => {
    it('should append numeric suffix when filename conflicts occur', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random filename
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 15 }).map(s => 
              s.replace(/[^a-zA-Z0-9-_]/g, 'a') || 'file'
            ),
            extension: fc.constantFrom('.jpg', '.png', '.mp4', '.pdf', '.txt', '.mp3', '.zip'),
          }),
          // Generate number of duplicate uploads (2-5 duplicates)
          fc.integer({ min: 2, max: 5 }),
          // Generate random category
          fc.constantFrom(
            FileCategory.Photo,
            FileCategory.Video,
            FileCategory.Document,
            FileCategory.Audio,
            FileCategory.Archive,
            FileCategory.Other
          ),
          async (fileRecord, duplicateCount, category) => {
            const originalFilename = `${fileRecord.name}${fileRecord.extension}`;
            const results: string[] = [];

            // Upload the same filename multiple times
            for (let i = 0; i < duplicateCount; i++) {
              const fileBuffer = Buffer.from(`test content ${i}`);
              const file = {
                buffer: fileBuffer,
                originalname: originalFilename,
              };

              const result = await storageService.saveFile(file, category);

              // Verify the file was saved successfully
              expect(result.success).toBe(true);
              
              // Store the final filename
              results.push(result.finalFileName);
            }

            // Verify the first file has the original name
            expect(results[0]).toBe(originalFilename);

            // Verify subsequent files have numeric suffixes
            const ext = fileRecord.extension;
            const nameWithoutExt = fileRecord.name;
            
            for (let i = 1; i < duplicateCount; i++) {
              const expectedSuffix = `${nameWithoutExt}_${i}${ext}`;
              expect(results[i]).toBe(expectedSuffix);
            }

            // Verify all files exist on disk with correct names
            const categoryFolder = await storageService.ensureCategoryFolder(category);
            for (const fileName of results) {
              const filePath = path.join(categoryFolder, fileName);
              const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
              expect(fileExists).toBe(true);
            }

            // Verify all filenames are unique
            const uniqueNames = new Set(results);
            expect(uniqueNames.size).toBe(duplicateCount);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle conflicts with various file extensions', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate base filename
          fc.string({ minLength: 3, maxLength: 10 }).map(s => 
            s.replace(/[^a-z0-9]/g, 'a') || 'file'
          ),
          // Test with various extensions
          fc.constantFrom(
            '.jpg', '.jpeg', '.png', '.gif',
            '.mp4', '.avi', '.mov',
            '.pdf', '.doc', '.txt',
            '.mp3', '.wav',
            '.zip', '.rar'
          ),
          async (baseName, extension) => {
            const originalFilename = `${baseName}${extension}`;
            const category = FileCategory.Other;
            const uploadCount = 3;
            const results: string[] = [];

            // Upload same file 3 times
            for (let i = 0; i < uploadCount; i++) {
              const fileBuffer = Buffer.from(`content ${i}`);
              const file = {
                buffer: fileBuffer,
                originalname: originalFilename,
              };

              const result = await storageService.saveFile(file, category);
              expect(result.success).toBe(true);
              results.push(result.finalFileName);
            }

            // Verify naming pattern: file.ext, file_1.ext, file_2.ext
            expect(results[0]).toBe(originalFilename);
            expect(results[1]).toBe(`${baseName}_1${extension}`);
            expect(results[2]).toBe(`${baseName}_2${extension}`);

            // Verify all files exist
            const categoryFolder = await storageService.ensureCategoryFolder(category);
            for (const fileName of results) {
              const filePath = path.join(categoryFolder, fileName);
              const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
              expect(fileExists).toBe(true);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should resolve conflicts across different categories independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate filename
          fc.record({
            name: fc.string({ minLength: 3, maxLength: 10 }).map(s => 
              s.replace(/[^a-z0-9]/g, 'a') || 'file'
            ),
            extension: fc.constantFrom('.jpg', '.mp4', '.pdf', '.mp3', '.zip', '.txt'),
          }),
          async (fileRecord) => {
            const originalFilename = `${fileRecord.name}${fileRecord.extension}`;
            
            // Upload same filename to different categories
            const categories = [
              FileCategory.Photo,
              FileCategory.Video,
              FileCategory.Document,
            ];

            for (const category of categories) {
              // Upload twice to each category
              const fileBuffer1 = Buffer.from(`content 1 for ${category}`);
              const file1 = {
                buffer: fileBuffer1,
                originalname: originalFilename,
              };

              const result1 = await storageService.saveFile(file1, category);
              expect(result1.success).toBe(true);
              expect(result1.finalFileName).toBe(originalFilename);

              const fileBuffer2 = Buffer.from(`content 2 for ${category}`);
              const file2 = {
                buffer: fileBuffer2,
                originalname: originalFilename,
              };

              const result2 = await storageService.saveFile(file2, category);
              expect(result2.success).toBe(true);
              expect(result2.finalFileName).toBe(`${fileRecord.name}_1${fileRecord.extension}`);

              // Verify both files exist in the category folder
              const categoryFolder = await storageService.ensureCategoryFolder(category);
              const filePath1 = path.join(categoryFolder, originalFilename);
              const filePath2 = path.join(categoryFolder, `${fileRecord.name}_1${fileRecord.extension}`);
              
              const file1Exists = await fs.access(filePath1).then(() => true).catch(() => false);
              const file2Exists = await fs.access(filePath2).then(() => true).catch(() => false);
              
              expect(file1Exists).toBe(true);
              expect(file2Exists).toBe(true);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle high number of conflicts correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate filename
          fc.record({
            name: fc.string({ minLength: 3, maxLength: 8 }).map(s => 
              s.replace(/[^a-z0-9]/g, 'a') || 'file'
            ),
            extension: fc.constantFrom('.jpg', '.txt', '.pdf'),
          }),
          // Generate high number of duplicates (5-10)
          fc.integer({ min: 5, max: 10 }),
          async (fileRecord, duplicateCount) => {
            const originalFilename = `${fileRecord.name}${fileRecord.extension}`;
            const category = FileCategory.Other;
            
            // Clean up the category folder before this test to ensure clean state
            const categoryFolder = await storageService.ensureCategoryFolder(category);
            try {
              const files = await fs.readdir(categoryFolder);
              for (const file of files) {
                await fs.unlink(path.join(categoryFolder, file));
              }
            } catch (error) {
              // Ignore cleanup errors
            }

            const results: string[] = [];

            // Upload many duplicates
            for (let i = 0; i < duplicateCount; i++) {
              const fileBuffer = Buffer.from(`content ${i}`);
              const file = {
                buffer: fileBuffer,
                originalname: originalFilename,
              };

              const result = await storageService.saveFile(file, category);
              expect(result.success).toBe(true);
              results.push(result.finalFileName);
            }

            // Verify sequential numbering
            expect(results[0]).toBe(originalFilename);
            for (let i = 1; i < duplicateCount; i++) {
              const expectedName = `${fileRecord.name}_${i}${fileRecord.extension}`;
              expect(results[i]).toBe(expectedName);
            }

            // Verify all files exist and are unique
            const uniqueNames = new Set(results);
            expect(uniqueNames.size).toBe(duplicateCount);

            for (const fileName of results) {
              const filePath = path.join(categoryFolder, fileName);
              const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
              expect(fileExists).toBe(true);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should preserve extension when appending suffix', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate filename with various extensions
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 10 }).map(s => 
              s.replace(/[^a-zA-Z0-9]/g, 'a') || 'file'
            ),
            extension: fc.constantFrom(
              '.jpg', '.jpeg', '.png', '.gif', '.bmp',
              '.mp4', '.avi', '.mov', '.mkv',
              '.pdf', '.doc', '.docx', '.txt',
              '.mp3', '.wav', '.aac',
              '.zip', '.rar', '.7z'
            ),
          }),
          async (fileRecord) => {
            const originalFilename = `${fileRecord.name}${fileRecord.extension}`;
            const category = FileCategory.Other;

            // Upload 3 times
            const results: string[] = [];
            for (let i = 0; i < 3; i++) {
              const fileBuffer = Buffer.from(`content ${i}`);
              const file = {
                buffer: fileBuffer,
                originalname: originalFilename,
              };

              const result = await storageService.saveFile(file, category);
              expect(result.success).toBe(true);
              results.push(result.finalFileName);
            }

            // Verify all results end with the correct extension
            for (const fileName of results) {
              expect(fileName.endsWith(fileRecord.extension)).toBe(true);
            }

            // Verify the suffix is inserted before the extension
            expect(results[0]).toBe(originalFilename);
            expect(results[1]).toBe(`${fileRecord.name}_1${fileRecord.extension}`);
            expect(results[2]).toBe(`${fileRecord.name}_2${fileRecord.extension}`);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
