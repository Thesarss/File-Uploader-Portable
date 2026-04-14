/**
 * Integration tests for StorageService
 * Tests actual file system operations
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageService } from './storage-service';
import { FileCategory } from './classifier-service';
import { ConfigManager } from './config-manager';

describe('StorageService Integration Tests', () => {
  let storageService: StorageService;
  let configManager: ConfigManager;
  const testTargetFolder = path.join(__dirname, '..', 'test-uploads');

  beforeAll(async () => {
    // Create a test ConfigManager that returns our test folder
    configManager = new ConfigManager();
    // Override getTargetFolder to use test folder
    configManager.getTargetFolder = jest.fn().mockResolvedValue(testTargetFolder);

    storageService = new StorageService(configManager);

    // Clean up test folder if it exists
    try {
      await fs.rm(testTargetFolder, { recursive: true, force: true });
    } catch (error) {
      // Ignore if folder doesn't exist
    }
  });

  afterAll(async () => {
    // Clean up test folder
    try {
      await fs.rm(testTargetFolder, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('ensureCategoryFolder', () => {
    it('should create Photos folder on disk', async () => {
      const folderPath = await storageService.ensureCategoryFolder(FileCategory.Photo);

      expect(folderPath).toBe(path.join(testTargetFolder, 'Photos'));

      // Verify folder exists
      const stats = await fs.stat(folderPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create all category folders', async () => {
      const categories = [
        { category: FileCategory.Photo, folder: 'Photos' },
        { category: FileCategory.Video, folder: 'Videos' },
        { category: FileCategory.Document, folder: 'Documents' },
        { category: FileCategory.Audio, folder: 'Audio' },
        { category: FileCategory.Archive, folder: 'Archives' },
        { category: FileCategory.Other, folder: 'Others' },
      ];

      for (const { category, folder } of categories) {
        const folderPath = await storageService.ensureCategoryFolder(category);
        expect(folderPath).toBe(path.join(testTargetFolder, folder));

        const stats = await fs.stat(folderPath);
        expect(stats.isDirectory()).toBe(true);
      }
    });

    it('should not fail if folder already exists', async () => {
      // Create folder first time
      await storageService.ensureCategoryFolder(FileCategory.Photo);

      // Create again - should not throw error
      const folderPath = await storageService.ensureCategoryFolder(FileCategory.Photo);

      expect(folderPath).toBe(path.join(testTargetFolder, 'Photos'));
      const stats = await fs.stat(folderPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('saveFile', () => {
    it('should save file to disk in correct category folder', async () => {
      const mockFile = {
        buffer: Buffer.from('Test file content for integration test'),
        originalname: 'test-photo.jpg',
      };

      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(result.success).toBe(true);
      expect(result.finalFileName).toBe('test-photo.jpg');
      expect(result.storedPath).toBe(path.join('Photos', 'test-photo.jpg'));

      // Verify file exists on disk
      const fullPath = path.join(testTargetFolder, result.storedPath);
      const fileContent = await fs.readFile(fullPath, 'utf-8');
      expect(fileContent).toBe('Test file content for integration test');
    });

    it('should save files to different category folders', async () => {
      const files = [
        { buffer: Buffer.from('Photo content'), originalname: 'photo.jpg', category: FileCategory.Photo },
        { buffer: Buffer.from('Video content'), originalname: 'video.mp4', category: FileCategory.Video },
        { buffer: Buffer.from('Doc content'), originalname: 'doc.pdf', category: FileCategory.Document },
      ];

      for (const file of files) {
        const result = await storageService.saveFile(file, file.category);
        expect(result.success).toBe(true);

        // Verify file exists
        const fullPath = path.join(testTargetFolder, result.storedPath);
        const exists = await fs.access(fullPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should create category folder if it does not exist', async () => {
      // Clean up Audio folder if it exists
      const audioFolder = path.join(testTargetFolder, 'Audio');
      try {
        await fs.rm(audioFolder, { recursive: true, force: true });
      } catch (error) {
        // Ignore
      }

      const mockFile = {
        buffer: Buffer.from('Audio content'),
        originalname: 'song.mp3',
      };

      const result = await storageService.saveFile(mockFile, FileCategory.Audio);

      expect(result.success).toBe(true);

      // Verify folder was created
      const stats = await fs.stat(audioFolder);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('verifyStorageSpace', () => {
    it('should return true for small file sizes', async () => {
      const fileSize = 1024 * 1024; // 1MB
      const result = await storageService.verifyStorageSpace(fileSize);

      // Should have space for 1MB file (unless disk is really full)
      expect(result).toBe(true);
    });

    it('should check space for large files', async () => {
      const fileSize = 500 * 1024 * 1024; // 500MB
      const result = await storageService.verifyStorageSpace(fileSize);

      // Result depends on actual disk space, just verify it returns boolean
      expect(typeof result).toBe('boolean');
    });
  });

  describe('resolveFileNameConflict', () => {
    it('should return original filename when no conflict exists', async () => {
      const categoryFolder = await storageService.ensureCategoryFolder(FileCategory.Photo);
      
      const result = await storageService.resolveFileNameConflict(
        categoryFolder,
        'unique-file.jpg'
      );

      expect(result).toBe('unique-file.jpg');
    });

    it('should append _1 suffix when file exists', async () => {
      const categoryFolder = await storageService.ensureCategoryFolder(FileCategory.Photo);
      
      // Create a file first
      const fileName = 'conflict-test.jpg';
      const filePath = path.join(categoryFolder, fileName);
      await fs.writeFile(filePath, 'existing file');

      // Now resolve conflict
      const result = await storageService.resolveFileNameConflict(
        categoryFolder,
        fileName
      );

      expect(result).toBe('conflict-test_1.jpg');
    });

    it('should find next available suffix when multiple conflicts exist', async () => {
      const categoryFolder = await storageService.ensureCategoryFolder(FileCategory.Photo);
      
      // Create multiple files with same base name
      const baseName = 'multi-conflict.jpg';
      await fs.writeFile(path.join(categoryFolder, 'multi-conflict.jpg'), 'file 0');
      await fs.writeFile(path.join(categoryFolder, 'multi-conflict_1.jpg'), 'file 1');
      await fs.writeFile(path.join(categoryFolder, 'multi-conflict_2.jpg'), 'file 2');

      // Now resolve conflict
      const result = await storageService.resolveFileNameConflict(
        categoryFolder,
        baseName
      );

      expect(result).toBe('multi-conflict_3.jpg');
    });

    it('should preserve file extension when adding suffix', async () => {
      const categoryFolder = await storageService.ensureCategoryFolder(FileCategory.Document);
      
      // Create a file first
      const fileName = 'document.pdf';
      const filePath = path.join(categoryFolder, fileName);
      await fs.writeFile(filePath, 'existing document');

      // Now resolve conflict
      const result = await storageService.resolveFileNameConflict(
        categoryFolder,
        fileName
      );

      expect(result).toBe('document_1.pdf');
    });
  });

  describe('saveFile with conflict resolution', () => {
    it('should save file with original name when no conflict', async () => {
      const mockFile = {
        buffer: Buffer.from('First file content'),
        originalname: 'no-conflict.jpg',
      };

      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(result.success).toBe(true);
      expect(result.finalFileName).toBe('no-conflict.jpg');
      expect(result.storedPath).toBe(path.join('Photos', 'no-conflict.jpg'));

      // Verify file exists
      const fullPath = path.join(testTargetFolder, result.storedPath);
      const fileContent = await fs.readFile(fullPath, 'utf-8');
      expect(fileContent).toBe('First file content');
    });

    it('should save file with _1 suffix when conflict exists', async () => {
      const mockFile = {
        buffer: Buffer.from('Duplicate file content'),
        originalname: 'duplicate.jpg',
      };

      // Save first file
      const result1 = await storageService.saveFile(mockFile, FileCategory.Photo);
      expect(result1.success).toBe(true);
      expect(result1.finalFileName).toBe('duplicate.jpg');

      // Save second file with same name
      const mockFile2 = {
        buffer: Buffer.from('Second duplicate file content'),
        originalname: 'duplicate.jpg',
      };
      const result2 = await storageService.saveFile(mockFile2, FileCategory.Photo);

      expect(result2.success).toBe(true);
      expect(result2.finalFileName).toBe('duplicate_1.jpg');
      expect(result2.storedPath).toBe(path.join('Photos', 'duplicate_1.jpg'));

      // Verify both files exist with correct content
      const fullPath1 = path.join(testTargetFolder, result1.storedPath);
      const fullPath2 = path.join(testTargetFolder, result2.storedPath);
      
      const content1 = await fs.readFile(fullPath1, 'utf-8');
      const content2 = await fs.readFile(fullPath2, 'utf-8');
      
      expect(content1).toBe('Duplicate file content');
      expect(content2).toBe('Second duplicate file content');
    });

    it('should handle multiple conflicts correctly', async () => {
      const baseName = 'multi-save.jpg';
      
      // Save three files with same name
      for (let i = 0; i < 3; i++) {
        const mockFile = {
          buffer: Buffer.from(`File content ${i}`),
          originalname: baseName,
        };
        
        const result = await storageService.saveFile(mockFile, FileCategory.Photo);
        expect(result.success).toBe(true);
        
        if (i === 0) {
          expect(result.finalFileName).toBe('multi-save.jpg');
        } else {
          expect(result.finalFileName).toBe(`multi-save_${i}.jpg`);
        }
      }

      // Verify all three files exist
      const categoryFolder = path.join(testTargetFolder, 'Photos');
      const file0 = await fs.readFile(path.join(categoryFolder, 'multi-save.jpg'), 'utf-8');
      const file1 = await fs.readFile(path.join(categoryFolder, 'multi-save_1.jpg'), 'utf-8');
      const file2 = await fs.readFile(path.join(categoryFolder, 'multi-save_2.jpg'), 'utf-8');
      
      expect(file0).toBe('File content 0');
      expect(file1).toBe('File content 1');
      expect(file2).toBe('File content 2');
    });
  });

  describe('file permissions', () => {
    it('should set file permissions to 0o644 after saving', async () => {
      const mockFile = {
        buffer: Buffer.from('Test file for permissions'),
        originalname: 'permissions-test.jpg',
      };

      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(result.success).toBe(true);

      // Verify file permissions on disk
      const fullPath = path.join(testTargetFolder, result.storedPath);
      const stats = await fs.stat(fullPath);
      
      // Get file mode (permissions)
      const mode = stats.mode & 0o777; // Mask to get only permission bits
      
      // On Windows, file permissions work differently
      // Windows typically sets 0o666 (rw-rw-rw-) for files
      // On Unix-like systems, we expect 0o644 (rw-r--r--)
      if (process.platform === 'win32') {
        // On Windows, verify chmod was called (permissions may be 0o666)
        expect(mode).toBeGreaterThanOrEqual(0o644);
      } else {
        // On Unix-like systems, verify exact permissions
        expect(mode).toBe(0o644);
      }
    });

    it('should set correct permissions for files in different categories', async () => {
      const files = [
        { buffer: Buffer.from('Photo'), originalname: 'photo-perm.jpg', category: FileCategory.Photo },
        { buffer: Buffer.from('Video'), originalname: 'video-perm.mp4', category: FileCategory.Video },
        { buffer: Buffer.from('Doc'), originalname: 'doc-perm.pdf', category: FileCategory.Document },
      ];

      for (const file of files) {
        const result = await storageService.saveFile(file, file.category);
        expect(result.success).toBe(true);

        // Verify permissions
        const fullPath = path.join(testTargetFolder, result.storedPath);
        const stats = await fs.stat(fullPath);
        const mode = stats.mode & 0o777;
        
        // Platform-specific permission check
        if (process.platform === 'win32') {
          expect(mode).toBeGreaterThanOrEqual(0o644);
        } else {
          expect(mode).toBe(0o644);
        }
      }
    });

    it('should set permissions even after conflict resolution', async () => {
      const mockFile = {
        buffer: Buffer.from('First file'),
        originalname: 'conflict-perm.jpg',
      };

      // Save first file
      const result1 = await storageService.saveFile(mockFile, FileCategory.Photo);
      expect(result1.success).toBe(true);

      // Save second file with same name
      const mockFile2 = {
        buffer: Buffer.from('Second file'),
        originalname: 'conflict-perm.jpg',
      };
      const result2 = await storageService.saveFile(mockFile2, FileCategory.Photo);
      expect(result2.success).toBe(true);
      expect(result2.finalFileName).toBe('conflict-perm_1.jpg');

      // Verify both files have correct permissions
      const fullPath1 = path.join(testTargetFolder, result1.storedPath);
      const fullPath2 = path.join(testTargetFolder, result2.storedPath);
      
      const stats1 = await fs.stat(fullPath1);
      const stats2 = await fs.stat(fullPath2);
      
      // Platform-specific permission check
      if (process.platform === 'win32') {
        expect(stats1.mode & 0o777).toBeGreaterThanOrEqual(0o644);
        expect(stats2.mode & 0o777).toBeGreaterThanOrEqual(0o644);
      } else {
        expect(stats1.mode & 0o777).toBe(0o644);
        expect(stats2.mode & 0o777).toBe(0o644);
      }
    });
  });
});
