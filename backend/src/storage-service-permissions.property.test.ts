import * as fc from 'fast-check';
import { StorageService } from './storage-service';
import { ConfigManager } from './config-manager';
import { FileCategory } from './classifier-service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Property 7: File Permission Assignment
 * **Validates: Requirements 3.5**
 * 
 * Verifies that saved files have correct permissions set.
 * On Unix-like systems: 0o644 (owner: read/write, group/others: read-only)
 * On Windows: >= 0o644 (Windows has different permission model)
 */
describe('Property-Based Tests', () => {
  let storageService: StorageService;
  let configManager: ConfigManager;
  let testTargetFolder: string;

  beforeEach(async () => {
    testTargetFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-permissions-test-'));
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

  describe('Property 7: File Permission Assignment', () => {
    it('should set correct permissions on saved files', async () => {
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
            const originalFilename = `${fileData.filename}${fileData.extension}`;
            const fileBuffer = Buffer.from(fileData.content);
            const file = { buffer: fileBuffer, originalname: originalFilename };

            // Save the file
            const result = await storageService.saveFile(file, category);
            expect(result.success).toBe(true);

            // Get the full path to the saved file
            const categoryFolder = await storageService.ensureCategoryFolder(category);
            const filePath = path.join(categoryFolder, result.finalFileName);

            // Check file permissions
            const stats = await fs.stat(filePath);
            const fileMode = stats.mode & 0o777; // Extract permission bits

            // On Unix-like systems, expect 0o644
            // On Windows, permissions work differently, so we check >= 0o644
            const isWindows = os.platform() === 'win32';
            
            if (isWindows) {
              // Windows has different permission model, just verify file is readable
              expect(fileMode).toBeGreaterThanOrEqual(0o400);
            } else {
              // Unix-like systems should have exactly 0o644
              expect(fileMode).toBe(0o644);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
