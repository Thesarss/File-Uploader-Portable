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
    testTargetFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
    
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
   * Property 4: Original Filename Preservation
   * **Validates: Requirements 3.2**
   * 
   * For any file uploaded with a unique name, the storage manager shall preserve
   * the original filename when saving to disk.
   */
  describe('Property 4: Original Filename Preservation', () => {
    it('should preserve original filename for files with unique names', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random unique filenames with various extensions
          fc.uniqueArray(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }).map(s => 
                s.replace(/[^a-zA-Z0-9-_]/g, 'a') || 'file'
              ),
              extension: fc.constantFrom('.jpg', '.png', '.mp4', '.pdf', '.mp3', '.zip', '.txt'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          // Generate random category
          fc.constantFrom(
            FileCategory.Photo,
            FileCategory.Video,
            FileCategory.Document,
            FileCategory.Audio,
            FileCategory.Archive,
            FileCategory.Other
          ),
          async (fileRecords, category) => {
            // Clean up the test folder before each property run to ensure fresh state
            try {
              await fs.rm(testTargetFolder, { recursive: true, force: true });
              testTargetFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
              configManager.getTargetFolder = jest.fn().mockResolvedValue(testTargetFolder);
              storageService = new StorageService(configManager);
            } catch (error) {
              // Ignore cleanup errors
            }

            // For each unique filename, save it and verify the original name is preserved
            for (const record of fileRecords) {
              const originalFilename = `${record.name}${record.extension}`;
              const fileBuffer = Buffer.from(`test content for ${originalFilename}`);
              
              const file = {
                buffer: fileBuffer,
                originalname: originalFilename,
              };

              const result = await storageService.saveFile(file, category);

              // Verify the file was saved successfully
              expect(result.success).toBe(true);
              
              // Verify the original filename is preserved (no suffix added for unique names)
              expect(result.finalFileName).toBe(originalFilename);
              
              // Verify the file exists on disk with the correct name
              const categoryFolder = await storageService.ensureCategoryFolder(category);
              const filePath = path.join(categoryFolder, originalFilename);
              const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
              expect(fileExists).toBe(true);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should preserve filenames with special characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate filenames with special characters
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 15 }).map(s => 
              s.replace(/[^a-zA-Z0-9-_ ()[\]]/g, 'a') || 'file'
            ),
            extension: fc.constantFrom('.jpg', '.pdf', '.txt'),
          }),
          fc.constantFrom(
            FileCategory.Photo,
            FileCategory.Document,
            FileCategory.Other
          ),
          async (fileRecord, category) => {
            const originalFilename = `${fileRecord.name}${fileRecord.extension}`;
            const fileBuffer = Buffer.from(`test content`);
            
            const file = {
              buffer: fileBuffer,
              originalname: originalFilename,
            };

            const result = await storageService.saveFile(file, category);

            // Verify the file was saved successfully
            expect(result.success).toBe(true);
            
            // Verify the original filename is preserved
            expect(result.finalFileName).toBe(originalFilename);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should preserve filenames across different categories', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a filename
          fc.record({
            name: fc.string({ minLength: 3, maxLength: 10 }).map(s => 
              s.replace(/[^a-z0-9]/g, 'a') || 'file'
            ),
            extension: fc.constantFrom('.jpg', '.mp4', '.pdf', '.mp3', '.zip', '.txt'),
          }),
          // Test across all categories
          fc.constantFrom(
            FileCategory.Photo,
            FileCategory.Video,
            FileCategory.Document,
            FileCategory.Audio,
            FileCategory.Archive,
            FileCategory.Other
          ),
          async (fileRecord, category) => {
            const originalFilename = `${fileRecord.name}${fileRecord.extension}`;
            const fileBuffer = Buffer.from(`test content for ${category}`);
            
            const file = {
              buffer: fileBuffer,
              originalname: originalFilename,
            };

            const result = await storageService.saveFile(file, category);

            // Verify success
            expect(result.success).toBe(true);
            
            // Verify filename preservation
            expect(result.finalFileName).toBe(originalFilename);
            
            // Verify the file is in the correct category folder
            const categoryFolder = await storageService.ensureCategoryFolder(category);
            const filePath = path.join(categoryFolder, originalFilename);
            const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
            expect(fileExists).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should preserve filenames with various extensions', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a base filename
          fc.string({ minLength: 3, maxLength: 10 }).map(s => 
            s.replace(/[^a-z0-9]/g, 'a') || 'file'
          ),
          // Test with various extensions
          fc.constantFrom(
            '.jpg', '.jpeg', '.png', '.gif', '.bmp',
            '.mp4', '.avi', '.mov',
            '.pdf', '.doc', '.docx', '.txt',
            '.mp3', '.wav', '.aac',
            '.zip', '.rar', '.7z'
          ),
          async (baseName, extension) => {
            const originalFilename = `${baseName}${extension}`;
            const fileBuffer = Buffer.from(`test content`);
            
            const file = {
              buffer: fileBuffer,
              originalname: originalFilename,
            };

            // Use appropriate category based on extension
            const category = FileCategory.Other;

            const result = await storageService.saveFile(file, category);

            // Verify success
            expect(result.success).toBe(true);
            
            // Verify filename preservation including extension
            expect(result.finalFileName).toBe(originalFilename);
            expect(result.finalFileName).toContain(extension);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
