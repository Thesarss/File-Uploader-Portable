import { FileRepository, FileCategory, UploadRecordInput } from './file-repository';
import * as db from './db';

// Mock the db module
jest.mock('./db');

describe('FileRepository', () => {
  let repository: FileRepository;
  let mockQuery: jest.MockedFunction<typeof db.query>;

  beforeEach(() => {
    repository = new FileRepository();
    mockQuery = db.query as jest.MockedFunction<typeof db.query>;
    jest.clearAllMocks();
  });

  describe('insertUploadRecord', () => {
    it('should insert a new upload record with all fields', async () => {
      const input: UploadRecordInput = {
        fileName: 'photo.jpg',
        originalName: 'vacation.jpg',
        fileSize: 2048576,
        category: FileCategory.Photo,
        storedPath: '/uploads/Photos/photo.jpg',
        mimeType: 'image/jpeg',
        sessionId: 'session-123',
        deviceInfo: 'Chrome/Mobile',
        checksum: 'abc123def456'
      };

      const mockResult = {
        rows: [{
          id: 'uuid-123',
          fileName: 'photo.jpg',
          originalName: 'vacation.jpg',
          fileSize: 2048576,
          category: 'Photo',
          storedPath: '/uploads/Photos/photo.jpg',
          mimeType: 'image/jpeg',
          uploadedAt: new Date('2024-01-15T10:30:00Z'),
          sessionId: 'session-123',
          deviceInfo: 'Chrome/Mobile',
          checksum: 'abc123def456'
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await repository.insertUploadRecord(input);

      expect(result).toEqual(mockResult.rows[0]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO uploads'),
        [
          'photo.jpg',
          'vacation.jpg',
          2048576,
          'Photo',
          '/uploads/Photos/photo.jpg',
          'image/jpeg',
          'session-123',
          'Chrome/Mobile',
          'abc123def456'
        ]
      );
    });

    it('should insert record with null optional fields', async () => {
      const input: UploadRecordInput = {
        fileName: 'document.pdf',
        originalName: 'report.pdf',
        fileSize: 1024000,
        category: FileCategory.Document,
        storedPath: '/uploads/Documents/document.pdf',
        mimeType: 'application/pdf',
        sessionId: 'session-456'
      };

      const mockResult = {
        rows: [{
          id: 'uuid-456',
          fileName: 'document.pdf',
          originalName: 'report.pdf',
          fileSize: 1024000,
          category: 'Document',
          storedPath: '/uploads/Documents/document.pdf',
          mimeType: 'application/pdf',
          uploadedAt: new Date('2024-01-15T11:00:00Z'),
          sessionId: 'session-456',
          deviceInfo: null,
          checksum: null
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await repository.insertUploadRecord(input);

      expect(result).toEqual(mockResult.rows[0]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO uploads'),
        expect.arrayContaining([null, null]) // deviceInfo and checksum should be null
      );
    });

    it('should throw error when database insert fails', async () => {
      const input: UploadRecordInput = {
        fileName: 'video.mp4',
        originalName: 'movie.mp4',
        fileSize: 50000000,
        category: FileCategory.Video,
        storedPath: '/uploads/Videos/video.mp4',
        mimeType: 'video/mp4',
        sessionId: 'session-789'
      };

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(repository.insertUploadRecord(input)).rejects.toThrow(
        'Failed to insert upload record: Database connection failed'
      );
    });
  });

  describe('getUploadsBySession', () => {
    it('should retrieve all uploads for a specific session', async () => {
      const sessionId = 'session-123';
      const mockResult = {
        rows: [
          {
            id: 'uuid-1',
            fileName: 'photo1.jpg',
            originalName: 'vacation1.jpg',
            fileSize: 2048576,
            category: 'Photo',
            storedPath: '/uploads/Photos/photo1.jpg',
            mimeType: 'image/jpeg',
            uploadedAt: new Date('2024-01-15T10:30:00Z'),
            sessionId: 'session-123',
            deviceInfo: 'Chrome/Mobile',
            checksum: 'abc123'
          },
          {
            id: 'uuid-2',
            fileName: 'photo2.jpg',
            originalName: 'vacation2.jpg',
            fileSize: 3048576,
            category: 'Photo',
            storedPath: '/uploads/Photos/photo2.jpg',
            mimeType: 'image/jpeg',
            uploadedAt: new Date('2024-01-15T10:25:00Z'),
            sessionId: 'session-123',
            deviceInfo: 'Chrome/Mobile',
            checksum: 'def456'
          }
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await repository.getUploadsBySession(sessionId);

      expect(result).toEqual(mockResult.rows);
      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE session_id = $1'),
        [sessionId]
      );
    });

    it('should return empty array when no uploads found for session', async () => {
      const sessionId = 'nonexistent-session';
      const mockResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await repository.getUploadsBySession(sessionId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw error when database query fails', async () => {
      mockQuery.mockRejectedValue(new Error('Connection timeout'));

      await expect(repository.getUploadsBySession('session-123')).rejects.toThrow(
        'Failed to fetch uploads by session: Connection timeout'
      );
    });
  });

  describe('getRecentUploads', () => {
    it('should retrieve recent uploads with default limit', async () => {
      const mockResult = {
        rows: [
          {
            id: 'uuid-1',
            fileName: 'recent1.jpg',
            originalName: 'photo1.jpg',
            fileSize: 1024000,
            category: 'Photo',
            storedPath: '/uploads/Photos/recent1.jpg',
            mimeType: 'image/jpeg',
            uploadedAt: new Date('2024-01-15T12:00:00Z'),
            sessionId: 'session-1',
            deviceInfo: 'Chrome/Desktop',
            checksum: 'hash1'
          },
          {
            id: 'uuid-2',
            fileName: 'recent2.pdf',
            originalName: 'document.pdf',
            fileSize: 2048000,
            category: 'Document',
            storedPath: '/uploads/Documents/recent2.pdf',
            mimeType: 'application/pdf',
            uploadedAt: new Date('2024-01-15T11:30:00Z'),
            sessionId: 'session-2',
            deviceInfo: 'Firefox/Desktop',
            checksum: 'hash2'
          }
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await repository.getRecentUploads();

      expect(result).toEqual(mockResult.rows);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY uploaded_at DESC'),
        [50] // default limit
      );
    });

    it('should retrieve recent uploads with custom limit', async () => {
      const customLimit = 10;
      const mockResult = {
        rows: [
          {
            id: 'uuid-1',
            fileName: 'file1.jpg',
            originalName: 'original1.jpg',
            fileSize: 1024000,
            category: 'Photo',
            storedPath: '/uploads/Photos/file1.jpg',
            mimeType: 'image/jpeg',
            uploadedAt: new Date('2024-01-15T12:00:00Z'),
            sessionId: 'session-1',
            deviceInfo: 'Chrome/Desktop',
            checksum: 'hash1'
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await repository.getRecentUploads(customLimit);

      expect(result).toEqual(mockResult.rows);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [customLimit]
      );
    });

    it('should return empty array when no uploads exist', async () => {
      const mockResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await repository.getRecentUploads(20);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw error when database query fails', async () => {
      mockQuery.mockRejectedValue(new Error('Query execution failed'));

      await expect(repository.getRecentUploads(10)).rejects.toThrow(
        'Failed to fetch recent uploads: Query execution failed'
      );
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should use parameterized queries for insertUploadRecord', async () => {
      const maliciousInput: UploadRecordInput = {
        fileName: "'; DROP TABLE uploads; --",
        originalName: 'malicious.jpg',
        fileSize: 1024,
        category: FileCategory.Photo,
        storedPath: '/uploads/Photos/malicious.jpg',
        mimeType: 'image/jpeg',
        sessionId: 'session-123'
      };

      const mockResult = {
        rows: [{
          id: 'uuid-safe',
          fileName: "'; DROP TABLE uploads; --",
          originalName: 'malicious.jpg',
          fileSize: 1024,
          category: 'Photo',
          storedPath: '/uploads/Photos/malicious.jpg',
          mimeType: 'image/jpeg',
          uploadedAt: new Date(),
          sessionId: 'session-123',
          deviceInfo: null,
          checksum: null
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      await repository.insertUploadRecord(maliciousInput);

      // Verify that the malicious string is passed as a parameter, not concatenated
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)'),
        expect.arrayContaining(["'; DROP TABLE uploads; --"])
      );
    });

    it('should use parameterized queries for getUploadsBySession', async () => {
      const maliciousSessionId = "' OR '1'='1";
      
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      await repository.getUploadsBySession(maliciousSessionId);

      // Verify parameterized query is used
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE session_id = $1'),
        [maliciousSessionId]
      );
    });
  });
});
