/**
 * Property-Based Test: Category-Based Storage Organization
 * 
 * **Validates: Requirements 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7**
 * 
 * This test verifies that files are stored in the correct category-based subfolders
 * based on their file type classification.
 */

import * as fc from 'fast-check';
import { StorageService } from './storage-service';
import { ConfigManager } from './config-manager';
import { FileCategory } from './classifier-service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Property 10: Category-Based Storage Organization', () => {
  let storageService: StorageService;
  let configManager: ConfigManager;
  let testTargetFolder: string;

  beforeEach(async () => {
    testTargetFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-category-test-'));
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

  it('should store files in correct category subfolders', async () => {
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

          // Save the file
          const result = await storageService.saveFile(file, category);

          // Verify save was successful
          expect(result.success).toBe(true);
          expect(result.storedPath).toBeTruthy();
          expect(result.finalFileName).toBeTruthy();

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
          
          // Verify the file is stored in the correct subfolder
          expect(result.storedPath).toContain(expectedSubfolder);
          
          // Verify the file actually exists in the correct location
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

  it('should create category subfolders for all categories', async () => {
    // Test that each category gets its own subfolder
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
      const file = { buffer: fileBuffer, originalname: `test.txt` };

      await storageService.saveFile(file, category);

      // Verify the subfolder was created
      const expectedFolder = path.join(testTargetFolder, expectedFolders[category]);
      const folderExists = await fs.access(expectedFolder).then(() => true).catch(() => false);
      expect(folderExists).toBe(true);
    }
  });
});
