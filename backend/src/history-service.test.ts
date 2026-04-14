import { HistoryService } from './history-service';
import FileRepository, { UploadRecordInput, UploadRecord, FileCategory } from './file-repository';

// Mock FileRepository
jest.mock('./file-repository');

describe('HistoryService', () => {
  let historyService: HistoryService;
  let mockRepository: jest.Mocked<FileRepository>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create mock repository
    mockRepository = new FileRepository() as jest.Mocked<FileRepository>;
    historyService = new HistoryService(mockRepository);
  });

  describe('recordUpload', () => {
    const validRecord: UploadRecordInput = {
      fileName: 'test.jpg',
      originalName: 'test.jpg',
      fileSize: 1024,
      category: FileCategory.Photo,
      storedPath: '/uploads/Photos/test.jpg',
      mimeType: 'image/jpeg',
      sessionId: 'session-123',
      deviceInfo: 'Chrome/Mobile',
      checksum: 'abc123'
    };

    it('should record upload successfully on first attempt', async () => {
      const mockResult: UploadRecord = {
        id: 'uuid-123',
        ...validRecord,
        uploadedAt: new Date()
      };

      mockRepository.insertUploadRecord.mockResolvedValue(mockResult);

      await historyService.recordUpload(validRecord);

      expect(mockRepository.insertUploadRecord).toHaveBeenCalledTimes(1);
      expect(mockRepository.insertUploadRecord).toHaveBeenCalledWith(validRecord);
    });

    it('should retry on database failure and succeed on second attempt', async () => {
      const mockResult: UploadRecord = {
        id: 'uuid-123',
        ...validRecord,
        uploadedAt: new Date()
      };

      // Fail first, succeed second
      mockRepository.insertUploadRecord
        .mockRejectedValueOnce(new Error('Database connection failed'))
        .mockResolvedValueOnce(mockResult);

      await historyService.recordUpload(validRecord);

      expect(mockRepository.insertUploadRecord).toHaveBeenCalledTimes(2);
    });

    it('should retry with exponential backoff and succeed on third attempt', async () => {
      const mockResult: UploadRecord = {
        id: 'uuid-123',
        ...validRecord,
        uploadedAt: new Date()
      };

      // Fail twice, succeed third
      mockRepository.insertUploadRecord
        .mockRejectedValueOnce(new Error('Database timeout'))
        .mockRejectedValueOnce(new Error('Database timeout'))
        .mockResolvedValueOnce(mockResult);

      const startTime = Date.now();
      await historyService.recordUpload(validRecord);
      const duration = Date.now() - startTime;

      expect(mockRepository.insertUploadRecord).toHaveBeenCalledTimes(3);
      // Should have waited at least 1s + 2s = 3s
      expect(duration).toBeGreaterThanOrEqual(3000);
    });

    it('should throw error after 3 failed attempts', async () => {
      // Fail all three attempts
      mockRepository.insertUploadRecord.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(historyService.recordUpload(validRecord)).rejects.toThrow(
        'Failed to record upload after 3 attempts'
      );

      expect(mockRepository.insertUploadRecord).toHaveBeenCalledTimes(3);
    });

    it('should handle non-Error exceptions', async () => {
      mockRepository.insertUploadRecord.mockRejectedValue('String error');

      await expect(historyService.recordUpload(validRecord)).rejects.toThrow(
        'Failed to record upload after 3 attempts: Unknown error'
      );
    });
  });

  describe('getSessionHistory', () => {
    it('should return uploads for a specific session', async () => {
      const sessionId = 'session-123';
      const mockUploads: UploadRecord[] = [
        {
          id: 'uuid-1',
          fileName: 'photo1.jpg',
          originalName: 'photo1.jpg',
          fileSize: 2048,
          category: FileCategory.Photo,
          storedPath: '/uploads/Photos/photo1.jpg',
          mimeType: 'image/jpeg',
          uploadedAt: new Date('2024-01-15T10:00:00Z'),
          sessionId: sessionId,
          deviceInfo: 'Chrome/Desktop'
        },
        {
          id: 'uuid-2',
          fileName: 'video1.mp4',
          originalName: 'video1.mp4',
          fileSize: 5120,
          category: FileCategory.Video,
          storedPath: '/uploads/Videos/video1.mp4',
          mimeType: 'video/mp4',
          uploadedAt: new Date('2024-01-15T10:05:00Z'),
          sessionId: sessionId,
          deviceInfo: 'Chrome/Desktop'
        }
      ];

      mockRepository.getUploadsBySession.mockResolvedValue(mockUploads);

      const result = await historyService.getSessionHistory(sessionId);

      expect(result).toEqual(mockUploads);
      expect(mockRepository.getUploadsBySession).toHaveBeenCalledWith(sessionId);
    });

    it('should return empty array for session with no uploads', async () => {
      mockRepository.getUploadsBySession.mockResolvedValue([]);

      const result = await historyService.getSessionHistory('empty-session');

      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      mockRepository.getUploadsBySession.mockRejectedValue(
        new Error('Database query failed')
      );

      await expect(
        historyService.getSessionHistory('session-123')
      ).rejects.toThrow('Failed to fetch session history');
    });
  });

  describe('getRecentUploads', () => {
    it('should return recent uploads with default limit', async () => {
      const mockUploads: UploadRecord[] = [
        {
          id: 'uuid-1',
          fileName: 'recent1.pdf',
          originalName: 'recent1.pdf',
          fileSize: 1024,
          category: FileCategory.Document,
          storedPath: '/uploads/Documents/recent1.pdf',
          mimeType: 'application/pdf',
          uploadedAt: new Date('2024-01-15T12:00:00Z'),
          sessionId: 'session-1',
          deviceInfo: 'Safari/Mobile'
        }
      ];

      mockRepository.getRecentUploads.mockResolvedValue(mockUploads);

      const result = await historyService.getRecentUploads();

      expect(result).toEqual(mockUploads);
      expect(mockRepository.getRecentUploads).toHaveBeenCalledWith(50);
    });

    it('should return recent uploads with custom limit', async () => {
      const mockUploads: UploadRecord[] = [];
      mockRepository.getRecentUploads.mockResolvedValue(mockUploads);

      await historyService.getRecentUploads(10);

      expect(mockRepository.getRecentUploads).toHaveBeenCalledWith(10);
    });

    it('should throw error when database query fails', async () => {
      mockRepository.getRecentUploads.mockRejectedValue(
        new Error('Database connection lost')
      );

      await expect(historyService.getRecentUploads(20)).rejects.toThrow(
        'Failed to fetch recent uploads'
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockRepository.getRecentUploads.mockRejectedValue('Unknown error');

      await expect(historyService.getRecentUploads()).rejects.toThrow(
        'Failed to fetch recent uploads: Unknown error'
      );
    });
  });
});
