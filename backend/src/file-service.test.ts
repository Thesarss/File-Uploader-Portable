/**
 * Unit tests for FileService
 * Tests the orchestration of file upload flow
 */

import { FileService, FileInput, UploadMetadata, UploadResult } from './file-service';
import { ClassifierService, FileCategory } from './classifier-service';
import { StorageService, StorageResult } from './storage-service';
import { HistoryService } from './history-service';
import { ConfigManager } from './config-manager';

// Mock dependencies
jest.mock('./classifier-service');
jest.mock('./storage-service');
jest.mock('./history-service');
jest.mock('./config-manager');

describe('FileService', () => {
  let fileService: FileService;
  let mockClassifierService: jest.Mocked<ClassifierService>;
  let mockStorageService: jest.Mocked<StorageService>;
  let mockHistoryService: jest.Mocked<HistoryService>;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    // Create mock instances
    mockClassifierService = new ClassifierService() as jest.Mocked<ClassifierService>;
    mockStorageService = new StorageService(mockConfigManager) as jest.Mocked<StorageService>;
    mockHistoryService = new HistoryService() as jest.Mocked<HistoryService>;
    mockConfigManager = new ConfigManager() as jest.Mocked<ConfigManager>;

    // Setup default mock implementations
    mockConfigManager.getMaxFileSize = jest.fn().mockResolvedValue(524288000); // 500MB
    mockClassifierService.classifyFile = jest.fn().mockReturnValue(FileCategory.Photo);
    mockClassifierService.validateMimeType = jest.fn().mockReturnValue(true);
    mockStorageService.saveFile = jest.fn().mockResolvedValue({
      success: true,
      storedPath: 'Photos/test.jpg',
      finalFileName: 'test.jpg',
      checksum: 'abc123',
    } as StorageResult);
    mockHistoryService.recordUpload = jest.fn().mockResolvedValue(undefined);

    // Create FileService with mocked dependencies
    fileService = new FileService(
      mockClassifierService,
      mockStorageService,
      mockHistoryService,
      mockConfigManager
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleUpload', () => {
    const createMockFile = (overrides?: Partial<FileInput>): FileInput => ({
      buffer: Buffer.from('test file content'),
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      ...overrides,
    });

    const createMockMetadata = (overrides?: Partial<UploadMetadata>): UploadMetadata => ({
      sessionId: 'session-123',
      deviceInfo: 'Chrome/Desktop',
      ...overrides,
    });

    it('should successfully upload a valid file', async () => {
      const file = createMockFile();
      const metadata = createMockMetadata();

      const result = await fileService.handleUpload(file, metadata);

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('test.jpg');
      expect(result.originalName).toBe('test.jpg');
      expect(result.category).toBe(FileCategory.Photo);
      expect(result.storedPath).toBe('Photos/test.jpg');
      expect(result.fileSize).toBe(1024);
      expect(result.checksum).toBe('abc123');
      expect(result.error).toBeUndefined();
    });

    it('should call all services in correct order', async () => {
      const file = createMockFile();
      const metadata = createMockMetadata();

      await fileService.handleUpload(file, metadata);

      // Verify call order and arguments
      expect(mockConfigManager.getMaxFileSize).toHaveBeenCalled();
      expect(mockClassifierService.classifyFile).toHaveBeenCalledWith('test.jpg');
      expect(mockClassifierService.validateMimeType).toHaveBeenCalledWith('test.jpg', 'image/jpeg');
      expect(mockStorageService.saveFile).toHaveBeenCalledWith(
        { buffer: file.buffer, originalname: file.originalname },
        FileCategory.Photo
      );
      expect(mockHistoryService.recordUpload).toHaveBeenCalledWith({
        fileName: 'test.jpg',
        originalName: 'test.jpg',
        fileSize: 1024,
        category: FileCategory.Photo,
        storedPath: 'Photos/test.jpg',
        mimeType: 'image/jpeg',
        sessionId: 'session-123',
        deviceInfo: 'Chrome/Desktop',
        checksum: 'abc123',
      });
    });

    it('should reject file exceeding size limit', async () => {
      mockConfigManager.getMaxFileSize = jest.fn().mockResolvedValue(1000);
      const file = createMockFile({ size: 2000 });
      const metadata = createMockMetadata();

      const result = await fileService.handleUpload(file, metadata);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
      expect(mockStorageService.saveFile).not.toHaveBeenCalled();
      expect(mockHistoryService.recordUpload).not.toHaveBeenCalled();
    });

    it('should handle storage failure gracefully', async () => {
      mockStorageService.saveFile = jest.fn().mockResolvedValue({
        success: false,
        storedPath: '',
        finalFileName: '',
        error: 'Disk full',
      } as StorageResult);

      const file = createMockFile();
      const metadata = createMockMetadata();

      const result = await fileService.handleUpload(file, metadata);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Disk full');
      expect(mockHistoryService.recordUpload).not.toHaveBeenCalled();
    });

    it('should continue upload even if metadata recording fails', async () => {
      mockHistoryService.recordUpload = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const file = createMockFile();
      const metadata = createMockMetadata();

      const result = await fileService.handleUpload(file, metadata);

      // Upload should still succeed even though metadata recording failed
      expect(result.success).toBe(true);
      expect(result.fileName).toBe('test.jpg');
      expect(result.storedPath).toBe('Photos/test.jpg');
    });

    it('should log warning for MIME type mismatch but continue upload', async () => {
      mockClassifierService.validateMimeType = jest.fn().mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const file = createMockFile({ mimetype: 'application/pdf' });
      const metadata = createMockMetadata();

      const result = await fileService.handleUpload(file, metadata);

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MIME type mismatch')
      );

      consoleSpy.mockRestore();
    });

    it('should classify different file types correctly', async () => {
      mockClassifierService.classifyFile = jest.fn().mockReturnValue(FileCategory.Video);
      mockStorageService.saveFile = jest.fn().mockResolvedValue({
        success: true,
        storedPath: 'Videos/movie.mp4',
        finalFileName: 'movie.mp4',
        checksum: 'def456',
      } as StorageResult);

      const file = createMockFile({
        originalname: 'movie.mp4',
        mimetype: 'video/mp4',
      });
      const metadata = createMockMetadata();

      const result = await fileService.handleUpload(file, metadata);

      expect(result.success).toBe(true);
      expect(result.category).toBe(FileCategory.Video);
      expect(result.storedPath).toBe('Videos/movie.mp4');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockStorageService.saveFile = jest.fn().mockRejectedValue(
        new Error('Unexpected file system error')
      );

      const file = createMockFile();
      const metadata = createMockMetadata();

      const result = await fileService.handleUpload(file, metadata);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected file system error');
    });

    it('should handle files with no device info', async () => {
      const file = createMockFile();
      const metadata: UploadMetadata = {
        sessionId: 'session-123',
      };

      const result = await fileService.handleUpload(file, metadata);

      expect(result.success).toBe(true);
      expect(mockHistoryService.recordUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceInfo: undefined,
        })
      );
    });
  });

  describe('handleMultipleUploads', () => {
    const createMockFile = (name: string, size: number = 1024): FileInput => ({
      buffer: Buffer.from(`content of ${name}`),
      originalname: name,
      mimetype: 'image/jpeg',
      size,
    });

    const createMockMetadata = (): UploadMetadata => ({
      sessionId: 'batch-session-456',
      deviceInfo: 'Firefox/Mobile',
    });

    it('should process multiple files successfully', async () => {
      const files = [
        createMockFile('photo1.jpg'),
        createMockFile('photo2.jpg'),
        createMockFile('photo3.jpg'),
      ];
      const metadata = createMockMetadata();

      mockStorageService.saveFile = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          storedPath: 'Photos/photo1.jpg',
          finalFileName: 'photo1.jpg',
          checksum: 'hash1',
        })
        .mockResolvedValueOnce({
          success: true,
          storedPath: 'Photos/photo2.jpg',
          finalFileName: 'photo2.jpg',
          checksum: 'hash2',
        })
        .mockResolvedValueOnce({
          success: true,
          storedPath: 'Photos/photo3.jpg',
          finalFileName: 'photo3.jpg',
          checksum: 'hash3',
        });

      const results = await fileService.handleMultipleUploads(files, metadata);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(results[0].fileName).toBe('photo1.jpg');
      expect(results[1].fileName).toBe('photo2.jpg');
      expect(results[2].fileName).toBe('photo3.jpg');
    });

    it('should continue processing after individual file failure', async () => {
      const files = [
        createMockFile('photo1.jpg'),
        createMockFile('photo2.jpg', 999999999), // Will exceed size limit
        createMockFile('photo3.jpg'),
      ];
      const metadata = createMockMetadata();

      mockConfigManager.getMaxFileSize = jest.fn().mockResolvedValue(1000000);

      const results = await fileService.handleMultipleUploads(files, metadata);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('exceeds maximum allowed size');
      expect(results[2].success).toBe(true);
    });

    it('should handle storage failure for one file and continue', async () => {
      const files = [
        createMockFile('photo1.jpg'),
        createMockFile('photo2.jpg'),
        createMockFile('photo3.jpg'),
      ];
      const metadata = createMockMetadata();

      mockStorageService.saveFile = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          storedPath: 'Photos/photo1.jpg',
          finalFileName: 'photo1.jpg',
          checksum: 'hash1',
        })
        .mockResolvedValueOnce({
          success: false,
          storedPath: '',
          finalFileName: '',
          error: 'Disk write error',
        })
        .mockResolvedValueOnce({
          success: true,
          storedPath: 'Photos/photo3.jpg',
          finalFileName: 'photo3.jpg',
          checksum: 'hash3',
        });

      const results = await fileService.handleMultipleUploads(files, metadata);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Disk write error');
      expect(results[2].success).toBe(true);
    });

    it('should handle unexpected errors during batch processing', async () => {
      const files = [
        createMockFile('photo1.jpg'),
        createMockFile('photo2.jpg'),
      ];
      const metadata = createMockMetadata();

      mockStorageService.saveFile = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          storedPath: 'Photos/photo1.jpg',
          finalFileName: 'photo1.jpg',
          checksum: 'hash1',
        })
        .mockRejectedValueOnce(new Error('Catastrophic failure'));

      const results = await fileService.handleMultipleUploads(files, metadata);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Catastrophic failure');
    });

    it('should process empty file array', async () => {
      const files: FileInput[] = [];
      const metadata = createMockMetadata();

      const results = await fileService.handleMultipleUploads(files, metadata);

      expect(results).toHaveLength(0);
      expect(mockStorageService.saveFile).not.toHaveBeenCalled();
    });

    it('should log summary of batch upload', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const files = [
        createMockFile('photo1.jpg'),
        createMockFile('photo2.jpg'),
      ];
      const metadata = createMockMetadata();

      await fileService.handleMultipleUploads(files, metadata);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch upload complete')
      );

      consoleSpy.mockRestore();
    });

    it('should process files with mixed categories', async () => {
      const files = [
        createMockFile('photo.jpg'),
        createMockFile('video.mp4'),
        createMockFile('document.pdf'),
      ];
      const metadata = createMockMetadata();

      mockClassifierService.classifyFile = jest.fn()
        .mockReturnValueOnce(FileCategory.Photo)
        .mockReturnValueOnce(FileCategory.Video)
        .mockReturnValueOnce(FileCategory.Document);

      mockStorageService.saveFile = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          storedPath: 'Photos/photo.jpg',
          finalFileName: 'photo.jpg',
          checksum: 'hash1',
        })
        .mockResolvedValueOnce({
          success: true,
          storedPath: 'Videos/video.mp4',
          finalFileName: 'video.mp4',
          checksum: 'hash2',
        })
        .mockResolvedValueOnce({
          success: true,
          storedPath: 'Documents/document.pdf',
          finalFileName: 'document.pdf',
          checksum: 'hash3',
        });

      const results = await fileService.handleMultipleUploads(files, metadata);

      expect(results).toHaveLength(3);
      expect(results[0].category).toBe(FileCategory.Photo);
      expect(results[1].category).toBe(FileCategory.Video);
      expect(results[2].category).toBe(FileCategory.Document);
    });
  });
});
