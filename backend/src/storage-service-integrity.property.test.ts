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
    testTargetFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-integrity-test-'));
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

  describe('Property 6: File Integrity Verification', () => {
    it('should verify checksums match after storage for random files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            filename: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9-_]/g, 'a') || 'file'),
            extension: fc.constantFrom('.jpg', '.png', '.mp4', '.pdf', '.mp3', '.zip', '.txt'),
            content: fc.uint8Array({ minLength: 100, maxLength: 5000 }),
          }),
          fc.constantFrom(FileCategory.Photo, FileCategory.Video, FileCategory.Document, FileCategory.Audio, FileCategory.Archive, FileCategory.Other),
          async (fileData, category) => {
            const originalFilename = `${fileData.filename}${fileData.extension}`;
            const fileBuffer = Buffer.from(fileData.content);
            const originalChecksum = storageService.calculateChecksum(fileBuffer);
            const file = { buffer: fileBuffer, originalname: originalFilename };
            const result = await storageService.saveFile(file, category);

            expect(result.success).toBe(true);
            expect(result.checksum).toBe(originalChecksum);
            const categoryFolder = await storageService.ensureCategoryFolder(category);
            const filePath = path.join(categoryFolder, result.finalFileName);
            const storedBuffer = await fs.readFile(filePath);
            const storedChecksum = storageService.calculateChecksum(storedBuffer);
            expect(storedChecksum).toBe(originalChecksum);
            expect(Buffer.compare(storedBuffer, fileBuffer)).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
