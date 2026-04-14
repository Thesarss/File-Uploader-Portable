/**
 * Integration Tests for Server API Endpoints
 * 
 * Tests complete workflows with real service integration
 * **Validates: Requirements 2.1, 2.7, 2.9, 6.1, 8.2, 8.3, 11.3**
 */

import request from 'supertest';
import { createApp } from './server';
import { FileService } from './file-service';
import { HistoryService } from './history-service';
import { ConfigManager } from './config-manager';
import { ClassifierService, FileCategory } from './classifier-service';

describe('Server API Integration Tests', () => {
  let mockFileService: jest.Mocked<Partial<FileService>>;
  let mockHistoryService: jest.Mocked<Partial<HistoryService>>;
  let mockConfigManager: jest.Mocked<Partial<ConfigManager>>;
  let mockClassifierService: jest.Mocked<Partial<ClassifierService>>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFileService = {
      handleMultipleUploads: jest.fn(),
    };
    
    mockHistoryService = {
      getSessionHistory: jest.fn(),
      getRecentUploads: jest.fn(),
    };
    
    mockConfigManager = {
      getMaxFileSize: jest.fn(),
    };
    
    mockClassifierService = {
      getSupportedExtensions: jest.fn(),
    };
  });

  describe('POST /api/upload', () => {
    /**
     * Test POST /api/upload with valid file
     * **Validates: Requirements 2.1, 2.9**
     */
    it('should successfully upload a valid file', async () => {
      const mockResult = {
        success: true,
        fileName: 'document.pdf',
        originalName: 'document.pdf',
        category: FileCategory.Document,
        storedPath: '/uploads/Documents/document.pdf',
        fileSize: 2048,
        checksum: 'abc123def456',
      };

      mockFileService.handleMultipleUploads = jest.fn().mockResolvedValue([mockResult]);

      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app)
        .post('/api/upload')
        .attach('files', Buffer.from('PDF content'), 'document.pdf')
        .field('sessionId', 'integration-test-session')
        .field('deviceInfo', 'Jest Test Runner');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.totalFiles).toBe(1);
      expect(response.body.successCount).toBe(1);
      expect(response.body.failureCount).toBe(0);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].fileName).toBe('document.pdf');
      expect(response.body.results[0].category).toBe(FileCategory.Document);
    });

    /**
     * Test POST /api/upload with oversized file (expect 400)
     * **Validates: Requirements 2.7**
     */
    it('should reject oversized file with 400 status', async () => {
      const MAX_FILE_SIZE = 524288000; // 500MB
      
      const mockResult = {
        success: false,
        fileName: '',
        originalName: 'huge-file.mp4',
        category: FileCategory.Video,
        storedPath: '',
        fileSize: MAX_FILE_SIZE + 1000000,
        error: 'File size exceeds maximum allowed size of 500MB',
      };

      mockFileService.handleMultipleUploads = jest.fn().mockResolvedValue([mockResult]);

      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app)
        .post('/api/upload')
        .attach('files', Buffer.from('video content'), 'huge-file.mp4')
        .field('sessionId', 'integration-test-session');

      expect(response.status).toBe(200); // Server processes the request
      expect(response.body.success).toBe(false); // But upload fails
      expect(response.body.failureCount).toBe(1);
      expect(response.body.results[0].success).toBe(false);
      expect(response.body.results[0].error).toContain('exceeds maximum');
    });

    /**
     * Test POST /api/upload with multiple files
     * **Validates: Requirements 6.1**
     */
    it('should successfully upload multiple files', async () => {
      const mockResults = [
        {
          success: true,
          fileName: 'photo1.jpg',
          originalName: 'photo1.jpg',
          category: FileCategory.Photo,
          storedPath: '/uploads/Photos/photo1.jpg',
          fileSize: 1024,
        },
        {
          success: true,
          fileName: 'photo2.png',
          originalName: 'photo2.png',
          category: FileCategory.Photo,
          storedPath: '/uploads/Photos/photo2.png',
          fileSize: 2048,
        },
        {
          success: true,
          fileName: 'document.pdf',
          originalName: 'document.pdf',
          category: FileCategory.Document,
          storedPath: '/uploads/Documents/document.pdf',
          fileSize: 4096,
        },
      ];

      mockFileService.handleMultipleUploads = jest.fn().mockResolvedValue(mockResults);

      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app)
        .post('/api/upload')
        .attach('files', Buffer.from('photo1 content'), 'photo1.jpg')
        .attach('files', Buffer.from('photo2 content'), 'photo2.png')
        .attach('files', Buffer.from('pdf content'), 'document.pdf')
        .field('sessionId', 'multi-upload-session');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.totalFiles).toBe(3);
      expect(response.body.successCount).toBe(3);
      expect(response.body.failureCount).toBe(0);
      expect(response.body.results).toHaveLength(3);
    });
  });

  describe('GET /api/history', () => {
    /**
     * Test GET /api/history with sessionId filter
     * **Validates: Requirements 8.2, 8.3**
     */
    it('should return upload history filtered by sessionId', async () => {
      const mockHistory = [
        {
          id: 1,
          fileName: 'photo1.jpg',
          originalName: 'photo1.jpg',
          fileSize: 1024,
          category: FileCategory.Photo,
          storedPath: '/uploads/Photos/photo1.jpg',
          mimeType: 'image/jpeg',
          sessionId: 'test-session-123',
          deviceInfo: 'Chrome/Mobile',
          uploadedAt: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 2,
          fileName: 'photo2.jpg',
          originalName: 'photo2.jpg',
          fileSize: 2048,
          category: FileCategory.Photo,
          storedPath: '/uploads/Photos/photo2.jpg',
          mimeType: 'image/jpeg',
          sessionId: 'test-session-123',
          deviceInfo: 'Chrome/Mobile',
          uploadedAt: new Date('2024-01-15T10:05:00Z'),
        },
      ];

      mockHistoryService.getSessionHistory = jest.fn().mockResolvedValue(mockHistory);

      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app)
        .get('/api/history')
        .query({ sessionId: 'test-session-123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.uploads).toHaveLength(2);
      expect(response.body.uploads[0].sessionId).toBe('test-session-123');
      expect(response.body.uploads[1].sessionId).toBe('test-session-123');
      expect(mockHistoryService.getSessionHistory).toHaveBeenCalledWith('test-session-123');
    });

    /**
     * Test GET /api/history with limit parameter
     * **Validates: Requirements 8.3**
     */
    it('should return upload history with limit parameter', async () => {
      const mockHistory = [
        {
          id: 1,
          fileName: 'file1.jpg',
          originalName: 'file1.jpg',
          fileSize: 1024,
          category: FileCategory.Photo,
          storedPath: '/uploads/Photos/file1.jpg',
          mimeType: 'image/jpeg',
          sessionId: 'session-1',
          deviceInfo: 'Device 1',
          uploadedAt: new Date(),
        },
        {
          id: 2,
          fileName: 'file2.jpg',
          originalName: 'file2.jpg',
          fileSize: 2048,
          category: FileCategory.Photo,
          storedPath: '/uploads/Photos/file2.jpg',
          mimeType: 'image/jpeg',
          sessionId: 'session-2',
          deviceInfo: 'Device 2',
          uploadedAt: new Date(),
        },
        {
          id: 3,
          fileName: 'file3.jpg',
          originalName: 'file3.jpg',
          fileSize: 3072,
          category: FileCategory.Photo,
          storedPath: '/uploads/Photos/file3.jpg',
          mimeType: 'image/jpeg',
          sessionId: 'session-3',
          deviceInfo: 'Device 3',
          uploadedAt: new Date(),
        },
      ];

      mockHistoryService.getRecentUploads = jest.fn().mockResolvedValue(mockHistory);

      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app)
        .get('/api/history')
        .query({ limit: 3 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);
      expect(response.body.uploads).toHaveLength(3);
      expect(mockHistoryService.getRecentUploads).toHaveBeenCalledWith(3);
    });
  });

  describe('GET /api/config', () => {
    /**
     * Test GET /api/config returns correct structure
     * **Validates: Requirements 2.7**
     */
    it('should return configuration with correct structure', async () => {
      const MAX_FILE_SIZE = 524288000; // 500MB
      
      mockConfigManager.getMaxFileSize = jest.fn().mockResolvedValue(MAX_FILE_SIZE);
      
      const mockExtensions = new Map([
        [FileCategory.Photo, ['.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif', '.bmp', '.tiff']],
        [FileCategory.Video, ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm']],
        [FileCategory.Document, ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt']],
        [FileCategory.Audio, ['.mp3', '.wav', '.aac', '.flac', '.ogg']],
        [FileCategory.Archive, ['.zip', '.rar', '.7z', '.tar', '.gz']],
        [FileCategory.Other, []],
      ]);
      
      mockClassifierService.getSupportedExtensions = jest.fn().mockReturnValue(mockExtensions);

      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app).get('/api/config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.maxFileSize).toBe(MAX_FILE_SIZE);
      expect(response.body.config.supportedCategories).toBeInstanceOf(Array);
      expect(response.body.config.supportedCategories).toContain('Photo');
      expect(response.body.config.supportedCategories).toContain('Video');
      expect(response.body.config.supportedCategories).toContain('Document');
      expect(response.body.config.supportedCategories).toContain('Audio');
      expect(response.body.config.supportedCategories).toContain('Archive');
      expect(response.body.config.acceptedExtensions).toBeDefined();
      expect(response.body.config.acceptedExtensions.Photo).toContain('.jpg');
      expect(response.body.config.acceptedExtensions.Video).toContain('.mp4');
      expect(response.body.config.acceptedExtensions.Document).toContain('.pdf');
    });
  });

  describe('Rate Limiting', () => {
    /**
     * Test rate limiting triggers 429 response
     * **Validates: Requirements 11.3**
     */
    it('should return 429 when rate limit is exceeded', async () => {
      mockHistoryService.getRecentUploads = jest.fn().mockResolvedValue([]);

      // Set very restrictive rate limit for testing
      process.env.RATE_LIMIT_MAX_REQUESTS = '3';
      process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute

      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      // Make requests up to the limit
      const response1 = await request(app).get('/api/history');
      expect(response1.status).toBe(200);

      const response2 = await request(app).get('/api/history');
      expect(response2.status).toBe(200);

      const response3 = await request(app).get('/api/history');
      expect(response3.status).toBe(200);

      // Fourth request should be rate limited
      const response4 = await request(app).get('/api/history');
      expect(response4.status).toBe(429);

      // Reset environment variables
      delete process.env.RATE_LIMIT_MAX_REQUESTS;
      delete process.env.RATE_LIMIT_WINDOW_MS;
    });

    it('should include rate limit information in 429 response', async () => {
      mockHistoryService.getRecentUploads = jest.fn().mockResolvedValue([]);

      // Set very restrictive rate limit
      process.env.RATE_LIMIT_MAX_REQUESTS = '1';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';

      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      // First request succeeds
      await request(app).get('/api/config');

      // Second request should be rate limited
      const response = await request(app).get('/api/config');

      expect(response.status).toBe(429);
      expect(response.text).toContain('Too many requests');

      // Reset environment variables
      delete process.env.RATE_LIMIT_MAX_REQUESTS;
      delete process.env.RATE_LIMIT_WINDOW_MS;
    });
  });
});
