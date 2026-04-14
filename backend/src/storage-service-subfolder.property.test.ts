/**
 * Property-Based Test: Automatic Subfolder Creation
 * 
 * **Validates: Requirements 3.2.8**
 * 
 * This test verifies that category subfolders are created automatically
 * when they don't exist, ensuring files can be saved even when the
 * target category folder is missing.
 */

import * as fc from 'fast-check';
import { StorageService } from './storage-service';
import { ConfigManager } from './config-manager';
import { FileCategory } from './classifier-service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Property 11: Automatic Subfolder Creation', () => {
  let storageService: StorageService;
  let configManager: ConfigManager;
  let testTargetFolder: string;

  beforeEach(async () => {
    testTargetFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-subfolder-test-'));
    configManager = {
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

  it('should automatically create missing category subfolders', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          filename: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9-_]/g, 'a') || 'file'),
          category: fc.constantFrom(
            FileCategory.Photo,
            FileCategory.Video,
            FileCategory.Document,
            FileCategory.Audio,
            FileCategory.Archive,
            FileCategory.Other
          ),
          content: fc.uint8Array({ minLength: 10, maxLength: 1000 }),
        }),
        async (fileData) => {
          const { filename, category, content } = fileData;
          
          // Determine appropriate extension for the category
          const extensionMap: Record<FileCategory, string> = {
            [FileCategory.Photo]: '.jpg',
            [FileCategory.Video]: '.mp4',
            [FileCategory.Document]: '.pdf',
            [FileCategory.Audio]: '.mp3',
            [FileCategory.Archive]: '.zip',
            [FileCategory.Other]: '.xyz',
          };
          
          const extension = extensionMap[category];
          const originalFilename = `${filename}${extension}`;
          const fileBuffer = Buffer.from(content);
          const file = { buffer: fileBuffer, originalname: originalFilename };

          // Determine expected subfolder name based on category
          const expectedSubfolderMap: Record<FileCategory, string> = {
            [FileCategory.Photo]: 'Photos',
            [FileCategory.Video]: 'Videos',
            [FileCategory.Document]: 'Documents',
            [FileCategory.Audio]: 'Audio',
            [FileCategory.Archive]: 'Archives',
            [FileCategory.Other]: 'Others',
          };

          const expectedSubfolder = expectedSubfolderMap[category];
          const categoryFolderPath = path.join(testTargetFolder, expectedSubfolder);

          // Ensure the category folder does NOT exist before saving
          try {
            await fs.rm(categoryFolderPath, { recursive: true, force: true });
          } catch {
            // Folder might not exist, which is fine
          }

          // Verify the folder doesn't exist
          const folderExistsBefore = await fs.access(categoryFolderPath).then(() => true).catch(() => false);
          expect(folderExistsBefore).toBe(false);

          // Save the file (should create the folder automatically)
          const result = await storageService.saveFile(file, category);

          // Verify save was successful
          expect(result.success).toBe(true);
          expect(result.storedPath).toBeTruthy();
          expect(result.finalFileName).toBeTruthy();

          // Verify the category folder was created
          const folderExistsAfter = await fs.access(categoryFolderPath).then(() => true).catch(() => false);
          expect(folderExistsAfter).toBe(true);

          // Verify the file exists in the correct location
          const expectedPath = path.join(testTargetFolder, expectedSubfolder, result.finalFileName);
          const fileExists = await fs.access(expectedPath).then(() => true).catch(() => false);
          expect(fileExists).toBe(true);

          // Verify the content is correct
          const retrievedContent = await fs.readFile(expectedPath);
          expect(Buffer.compare(retrievedContent, fileBuffer)).toBe(0);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should create nested subfolders when target folder is empty', async () => {
    // Test that subfolders are created even when starting from an empty target folder
    const categories = [
      FileCategory.Photo,
      FileCategory.Video,
      FileCategory.Document,
      FileCategory.Audio,
      FileCategory.Archive,
      FileCategory.Other,
    ];

    const expectedFolders: Record<FileCategory, string> = {
      [FileCategory.Photo]: 'Photos',
      [FileCategory.Video]: 'Videos',
      [FileCategory.Document]: 'Documents',
      [FileCategory.Audio]: 'Audio',
      [FileCategory.Archive]: 'Archives',
      [FileCategory.Other]: 'Others',
    };

    for (const category of categories) {
      const fileBuffer = Buffer.from('test content');
      const file = { buffer: fileBuffer, originalname: `test-${category}.txt` };

      // Delete the category folder if it exists
      const categoryFolderPath = path.join(testTargetFolder, expectedFolders[category]);
      try {
        await fs.rm(categoryFolderPath, { recursive: true, force: true });
      } catch {
        // Folder might not exist
      }

      // Verify folder doesn't exist before save
      const existsBefore = await fs.access(categoryFolderPath).then(() => true).catch(() => false);
      expect(existsBefore).toBe(false);

      // Save file
      const result = await storageService.saveFile(file, category);
      expect(result.success).toBe(true);

      // Verify the subfolder was created
      const existsAfter = await fs.access(categoryFolderPath).then(() => true).catch(() => false);
      expect(existsAfter).toBe(true);

      // Verify the file exists in the folder
      const filePath = path.join(categoryFolderPath, result.finalFileName);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    }
  });
});
