/**
 * Unit tests for StorageService
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageService } from './storage-service';
import { FileCategory } from './classifier-service';
import { ConfigManager } from './config-manager';

// Mock fs module
jest.mock('fs/promises');

describe('StorageService', () => {
  let storageService: StorageService;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  const mockTargetFolder = '/test/uploads';

  beforeEach(() => {
    // Create mock ConfigManager
    mockConfigManager = {
      getTargetFolder: jest.fn().mockResolvedValue(mockTargetFolder),
      getMaxFileSize: jest.fn().mockResolvedValue(524288000),
      getConcurrentUploadLimit: jest.fn().mockResolvedValue(3),
    } as any;

    storageService = new StorageService(mockConfigManager);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('ensureCategoryFolder', () => {
    it('should create Photos folder for Photo category', async () => {
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      mockMkdir.mockResolvedValue(undefined);

      const result = await storageService.ensureCategoryFolder(FileCategory.Photo);

      expect(result).toBe(path.join(mockTargetFolder, 'Photos'));
      expect(mockMkdir).toHaveBeenCalledWith(
        path.join(mockTargetFolder, 'Photos'),
        { recursive: true }
      );
    });

    it('should create Videos folder for Video category', async () => {
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      mockMkdir.mockResolvedValue(undefined);

      const result = await storageService.ensureCategoryFolder(FileCategory.Video);

      expect(result).toBe(path.join(mockTargetFolder, 'Videos'));
      expect(mockMkdir).toHaveBeenCalledWith(
        path.join(mockTargetFolder, 'Videos'),
        { recursive: true }
      );
    });

    it('should create Documents folder for Document category', async () => {
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      mockMkdir.mockResolvedValue(undefined);

      const result = await storageService.ensureCategoryFolder(FileCategory.Document);

      expect(result).toBe(path.join(mockTargetFolder, 'Documents'));
      expect(mockMkdir).toHaveBeenCalledWith(
        path.join(mockTargetFolder, 'Documents'),
        { recursive: true }
      );
    });

    it('should create Audio folder for Audio category', async () => {
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      mockMkdir.mockResolvedValue(undefined);

      const result = await storageService.ensureCategoryFolder(FileCategory.Audio);

      expect(result).toBe(path.join(mockTargetFolder, 'Audio'));
      expect(mockMkdir).toHaveBeenCalledWith(
        path.join(mockTargetFolder, 'Audio'),
        { recursive: true }
      );
    });

    it('should create Archives folder for Archive category', async () => {
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      mockMkdir.mockResolvedValue(undefined);

      const result = await storageService.ensureCategoryFolder(FileCategory.Archive);

      expect(result).toBe(path.join(mockTargetFolder, 'Archives'));
      expect(mockMkdir).toHaveBeenCalledWith(
        path.join(mockTargetFolder, 'Archives'),
        { recursive: true }
      );
    });

    it('should create Others folder for Other category', async () => {
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      mockMkdir.mockResolvedValue(undefined);

      const result = await storageService.ensureCategoryFolder(FileCategory.Other);

      expect(result).toBe(path.join(mockTargetFolder, 'Others'));
      expect(mockMkdir).toHaveBeenCalledWith(
        path.join(mockTargetFolder, 'Others'),
        { recursive: true }
      );
    });

    it('should use recursive option to create parent folders', async () => {
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      mockMkdir.mockResolvedValue(undefined);

      await storageService.ensureCategoryFolder(FileCategory.Photo);

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });
  });

  describe('saveFile', () => {
    const mockFile = {
      buffer: Buffer.from('test file content'),
      originalname: 'test.jpg',
    };

    beforeEach(() => {
      // Mock mkdir to succeed
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      mockMkdir.mockResolvedValue(undefined);

      // Mock writeFile to succeed
      const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
      mockWriteFile.mockResolvedValue(undefined);

      // Mock readFile to return the same buffer (for integrity check)
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(mockFile.buffer);

      // Mock statfs to return sufficient space
      const mockStatfs = fs.statfs as jest.MockedFunction<typeof fs.statfs>;
      mockStatfs.mockResolvedValue({
        bavail: 1000000, // 1M blocks available
        bsize: 4096, // 4KB block size
      } as any);

      // Mock access to indicate no file conflicts by default
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      mockAccess.mockRejectedValue(new Error('File not found'));
    });

    it('should save file successfully with Photo category', async () => {
      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(result.success).toBe(true);
      expect(result.finalFileName).toBe('test.jpg');
      expect(result.storedPath).toBe(path.join('Photos', 'test.jpg'));
      expect(result.checksum).toBeDefined();
      expect(result.checksum).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(result.error).toBeUndefined();
    });

    it('should save file to correct category folder', async () => {
      const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;

      await storageService.saveFile(mockFile, FileCategory.Video);

      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(mockTargetFolder, 'Videos', 'test.jpg'),
        mockFile.buffer
      );
    });

    it('should verify storage space before saving', async () => {
      const mockStatfs = fs.statfs as jest.MockedFunction<typeof fs.statfs>;

      await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(mockStatfs).toHaveBeenCalledWith(mockTargetFolder);
    });

    it('should return error when insufficient disk space', async () => {
      // Mock statfs to return insufficient space
      const mockStatfs = fs.statfs as jest.MockedFunction<typeof fs.statfs>;
      mockStatfs.mockResolvedValue({
        bavail: 10, // Only 10 blocks available
        bsize: 4096, // 4KB block size = ~40KB total
      } as any);

      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient disk space');
    });

    it('should return error when file write fails', async () => {
      const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
      mockWriteFile.mockRejectedValue(new Error('Write failed'));

      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Write failed');
    });

    it('should create category folder if it does not exist', async () => {
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;

      await storageService.saveFile(mockFile, FileCategory.Document);

      expect(mockMkdir).toHaveBeenCalledWith(
        path.join(mockTargetFolder, 'Documents'),
        { recursive: true }
      );
    });
  });

  describe('verifyStorageSpace', () => {
    it('should return true when sufficient space available', async () => {
      const mockStatfs = fs.statfs as jest.MockedFunction<typeof fs.statfs>;
      mockStatfs.mockResolvedValue({
        bavail: 1000000, // 1M blocks
        bsize: 4096, // 4KB blocks = ~4GB available
      } as any);

      const fileSize = 100 * 1024 * 1024; // 100MB
      const result = await storageService.verifyStorageSpace(fileSize);

      expect(result).toBe(true);
    });

    it('should return false when insufficient space available', async () => {
      const mockStatfs = fs.statfs as jest.MockedFunction<typeof fs.statfs>;
      mockStatfs.mockResolvedValue({
        bavail: 1000, // 1000 blocks
        bsize: 4096, // 4KB blocks = ~4MB available
      } as any);

      const fileSize = 100 * 1024 * 1024; // 100MB (needs 200MB with buffer)
      const result = await storageService.verifyStorageSpace(fileSize);

      expect(result).toBe(false);
    });

    it('should include 100MB buffer in space calculation', async () => {
      const mockStatfs = fs.statfs as jest.MockedFunction<typeof fs.statfs>;
      mockStatfs.mockResolvedValue({
        bavail: 30000, // 30K blocks
        bsize: 4096, // 4KB blocks = ~120MB available
      } as any);

      const fileSize = 50 * 1024 * 1024; // 50MB file (needs 150MB with buffer)
      const result = await storageService.verifyStorageSpace(fileSize);

      expect(result).toBe(false);
    });

    it('should return true if statfs fails (graceful degradation)', async () => {
      const mockStatfs = fs.statfs as jest.MockedFunction<typeof fs.statfs>;
      mockStatfs.mockRejectedValue(new Error('statfs failed'));

      const fileSize = 100 * 1024 * 1024;
      const result = await storageService.verifyStorageSpace(fileSize);

      expect(result).toBe(true);
    });
  });

  describe('resolveFileNameConflict', () => {
    const mockTargetPath = '/test/uploads/Photos';

    it('should return original filename when no conflict exists', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      mockAccess.mockRejectedValue(new Error('File not found'));

      const result = await storageService.resolveFileNameConflict(
        mockTargetPath,
        'photo.jpg'
      );

      expect(result).toBe('photo.jpg');
      expect(mockAccess).toHaveBeenCalledWith(
        path.join(mockTargetPath, 'photo.jpg')
      );
    });

    it('should append _1 suffix when file exists', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      mockAccess
        .mockResolvedValueOnce(undefined) // Original file exists
        .mockRejectedValueOnce(new Error('File not found')); // _1 doesn't exist

      const result = await storageService.resolveFileNameConflict(
        mockTargetPath,
        'photo.jpg'
      );

      expect(result).toBe('photo_1.jpg');
    });

    it('should find next available suffix when multiple conflicts exist', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      mockAccess
        .mockResolvedValueOnce(undefined) // Original file exists
        .mockResolvedValueOnce(undefined) // _1 exists
        .mockResolvedValueOnce(undefined) // _2 exists
        .mockRejectedValueOnce(new Error('File not found')); // _3 doesn't exist

      const result = await storageService.resolveFileNameConflict(
        mockTargetPath,
        'photo.jpg'
      );

      expect(result).toBe('photo_3.jpg');
    });

    it('should preserve file extension when adding suffix', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      mockAccess
        .mockResolvedValueOnce(undefined) // Original file exists
        .mockRejectedValueOnce(new Error('File not found')); // _1 doesn't exist

      const result = await storageService.resolveFileNameConflict(
        mockTargetPath,
        'document.pdf'
      );

      expect(result).toBe('document_1.pdf');
    });

    it('should handle files with no extension', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      mockAccess
        .mockResolvedValueOnce(undefined) // Original file exists
        .mockRejectedValueOnce(new Error('File not found')); // _1 doesn't exist

      const result = await storageService.resolveFileNameConflict(
        mockTargetPath,
        'README'
      );

      expect(result).toBe('README_1');
    });

    it('should handle files with multiple dots in name', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      mockAccess
        .mockResolvedValueOnce(undefined) // Original file exists
        .mockRejectedValueOnce(new Error('File not found')); // _1 doesn't exist

      const result = await storageService.resolveFileNameConflict(
        mockTargetPath,
        'my.file.name.tar.gz'
      );

      expect(result).toBe('my.file.name.tar_1.gz');
    });
  });

  describe('saveFile with conflict resolution', () => {
    const mockFile = {
      buffer: Buffer.from('test file content'),
      originalname: 'test.jpg',
    };

    beforeEach(() => {
      // Mock mkdir to succeed
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      mockMkdir.mockResolvedValue(undefined);

      // Mock writeFile to succeed
      const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
      mockWriteFile.mockResolvedValue(undefined);

      // Mock readFile to return the same buffer (for integrity check)
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(mockFile.buffer);

      // Mock statfs to return sufficient space
      const mockStatfs = fs.statfs as jest.MockedFunction<typeof fs.statfs>;
      mockStatfs.mockResolvedValue({
        bavail: 1000000, // 1M blocks available
        bsize: 4096, // 4KB block size
      } as any);
    });

    it('should save file with original name when no conflict', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      mockAccess.mockRejectedValue(new Error('File not found'));

      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(result.success).toBe(true);
      expect(result.finalFileName).toBe('test.jpg');
      expect(result.storedPath).toBe(path.join('Photos', 'test.jpg'));
    });

    it('should save file with _1 suffix when conflict exists', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      mockAccess
        .mockResolvedValueOnce(undefined) // Original file exists
        .mockRejectedValueOnce(new Error('File not found')); // _1 doesn't exist

      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(result.success).toBe(true);
      expect(result.finalFileName).toBe('test_1.jpg');
      expect(result.storedPath).toBe(path.join('Photos', 'test_1.jpg'));
    });

    it('should write file with resolved filename', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      mockAccess
        .mockResolvedValueOnce(undefined) // Original file exists
        .mockRejectedValueOnce(new Error('File not found')); // _1 doesn't exist

      const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;

      await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(mockTargetFolder, 'Photos', 'test_1.jpg'),
        mockFile.buffer
      );
    });
  });

  describe('calculateChecksum', () => {
    it('should calculate SHA-256 checksum for buffer', () => {
      const buffer = Buffer.from('test content');
      const checksum = storageService.calculateChecksum(buffer);

      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(typeof checksum).toBe('string');
    });

    it('should produce consistent checksums for same content', () => {
      const buffer1 = Buffer.from('test content');
      const buffer2 = Buffer.from('test content');

      const checksum1 = storageService.calculateChecksum(buffer1);
      const checksum2 = storageService.calculateChecksum(buffer2);

      expect(checksum1).toBe(checksum2);
    });

    it('should produce different checksums for different content', () => {
      const buffer1 = Buffer.from('test content 1');
      const buffer2 = Buffer.from('test content 2');

      const checksum1 = storageService.calculateChecksum(buffer1);
      const checksum2 = storageService.calculateChecksum(buffer2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from('');
      const checksum = storageService.calculateChecksum(buffer);

      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64);
    });

    it('should handle large buffer', () => {
      const buffer = Buffer.alloc(1024 * 1024, 'a'); // 1MB of 'a'
      const checksum = storageService.calculateChecksum(buffer);

      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64);
    });
  });

  describe('verifyFileIntegrity', () => {
    const testFilePath = '/test/path/file.jpg';
    const testBuffer = Buffer.from('test file content');

    it('should return true when checksums match', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(testBuffer);

      const expectedChecksum = storageService.calculateChecksum(testBuffer);
      const result = await storageService.verifyFileIntegrity(testFilePath, expectedChecksum);

      expect(result).toBe(true);
      expect(mockReadFile).toHaveBeenCalledWith(testFilePath);
    });

    it('should return false when checksums do not match', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(Buffer.from('different content'));

      const expectedChecksum = storageService.calculateChecksum(testBuffer);
      const result = await storageService.verifyFileIntegrity(testFilePath, expectedChecksum);

      expect(result).toBe(false);
    });

    it('should return false when file read fails', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const expectedChecksum = storageService.calculateChecksum(testBuffer);
      const result = await storageService.verifyFileIntegrity(testFilePath, expectedChecksum);

      expect(result).toBe(false);
    });

    it('should handle corrupted file scenario', async () => {
      const originalBuffer = Buffer.from('original content');
      const corruptedBuffer = Buffer.from('corrupted content');

      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(corruptedBuffer);

      const expectedChecksum = storageService.calculateChecksum(originalBuffer);
      const result = await storageService.verifyFileIntegrity(testFilePath, expectedChecksum);

      expect(result).toBe(false);
    });
  });

  describe('saveFile with integrity verification', () => {
    const mockFile = {
      buffer: Buffer.from('test file content'),
      originalname: 'test.jpg',
    };

    beforeEach(() => {
      // Mock mkdir to succeed
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      mockMkdir.mockResolvedValue(undefined);

      // Mock writeFile to succeed
      const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
      mockWriteFile.mockResolvedValue(undefined);

      // Mock statfs to return sufficient space
      const mockStatfs = fs.statfs as jest.MockedFunction<typeof fs.statfs>;
      mockStatfs.mockResolvedValue({
        bavail: 1000000,
        bsize: 4096,
      } as any);

      // Mock access to indicate no file conflicts
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      mockAccess.mockRejectedValue(new Error('File not found'));

      // Mock chmod to succeed
      const mockChmod = fs.chmod as jest.MockedFunction<typeof fs.chmod>;
      mockChmod.mockResolvedValue(undefined);
    });

    it('should verify file integrity after saving', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(mockFile.buffer);

      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(result.success).toBe(true);
      expect(mockReadFile).toHaveBeenCalled();
    });

    it('should set file permissions after successful save', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(mockFile.buffer);

      const mockChmod = fs.chmod as jest.MockedFunction<typeof fs.chmod>;

      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(result.success).toBe(true);
      expect(mockChmod).toHaveBeenCalledWith(
        path.join(mockTargetFolder, 'Photos', 'test.jpg'),
        0o644
      );
    });

    it('should set permissions with mode 0o644 (owner rw, group/others r)', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(mockFile.buffer);

      const mockChmod = fs.chmod as jest.MockedFunction<typeof fs.chmod>;

      await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(mockChmod).toHaveBeenCalledWith(
        expect.any(String),
        0o644
      );
    });

    it('should still succeed if permission setting fails', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(mockFile.buffer);

      const mockChmod = fs.chmod as jest.MockedFunction<typeof fs.chmod>;
      mockChmod.mockRejectedValue(new Error('Permission denied'));

      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      // File save should still succeed even if chmod fails
      expect(result.success).toBe(true);
      expect(result.finalFileName).toBe('test.jpg');
    });

    it('should delete file and return error when integrity check fails', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(Buffer.from('corrupted content'));

      const mockUnlink = fs.unlink as jest.MockedFunction<typeof fs.unlink>;
      mockUnlink.mockResolvedValue(undefined);

      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File integrity verification failed');
      expect(mockUnlink).toHaveBeenCalledWith(
        path.join(mockTargetFolder, 'Photos', 'test.jpg')
      );
    });

    it('should return checksum in result when save succeeds', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(mockFile.buffer);

      const result = await storageService.saveFile(mockFile, FileCategory.Photo);

      expect(result.success).toBe(true);
      expect(result.checksum).toBeDefined();
      expect(result.checksum).toHaveLength(64);
    });
  });
});
