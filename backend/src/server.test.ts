/**
 * Server Tests
 * 
 * Tests for Express server endpoints and middleware
 */

import request from 'supertest';
import { createApp } from './server';
import { FileService } from './file-service';
import { HistoryService } from './history-service';
import { ConfigManager } from './config-manager';
import { ClassifierService, FileCategory } from './classifier-service';

describe('Server API Endpoints', () => {
  let mockFileService: jest.Mocked<Partial<FileService>>;
  let mockHistoryService: jest.Mocked<Partial<HistoryService>>;
  let mockConfigManager: jest.Mocked<Partial<ConfigManager>>;
  let mockClassifierService: jest.Mocked<Partial<ClassifierService>>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
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
    it('should upload a single file successfully', async () => {
      const mockResult = {
        success: true,
        fileName: 'test_1.jpg',
        originalName: 'test.jpg',
        category: FileCategory.Photo,
        storedPath: '/uploads/Photos/test_1.jpg',
        fileSize: 1024,
        checksum: 'abc123',
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
        .attach('files', Buffer.from('fake image data'), 'test.jpg')
        .field('sessionId', 'test-session')
        .field('deviceInfo', 'test-device');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.successCount).toBe(1);
      expect(response.body.failureCount).toBe(0);
      expect(response.body.results).toHaveLength(1);
    });

    it('should upload multiple files successfully', async () => {
      const mockResults = [
        {
          success: true,
          fileName: 'test1_1.jpg',
          originalName: 'test1.jpg',
          category: FileCategory.Photo,
          storedPath: '/uploads/Photos/test1_1.jpg',
          fileSize: 1024,
        },
        {
          success: true,
          fileName: 'test2_1.pdf',
          originalName: 'test2.pdf',
          category: FileCategory.Document,
          storedPath: '/uploads/Documents/test2_1.pdf',
          fileSize: 2048,
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
        .attach('files', Buffer.from('fake image data'), 'test1.jpg')
        .attach('files', Buffer.from('fake pdf data'), 'test2.pdf')
        .field('sessionId', 'test-session');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.totalFiles).toBe(2);
      expect(response.body.successCount).toBe(2);
      expect(response.body.failureCount).toBe(0);
    });

    it('should handle partial upload failures', async () => {
      const mockResults = [
        {
          success: true,
          fileName: 'test1_1.jpg',
          originalName: 'test1.jpg',
          category: FileCategory.Photo,
          storedPath: '/uploads/Photos/test1_1.jpg',
          fileSize: 1024,
        },
        {
          success: false,
          fileName: '',
          originalName: 'test2.pdf',
          category: FileCategory.Document,
          storedPath: '',
          fileSize: 2048,
          error: 'File too large',
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
        .attach('files', Buffer.from('fake image data'), 'test1.jpg')
        .attach('files', Buffer.from('fake pdf data'), 'test2.pdf');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true); // At least one succeeded
      expect(response.body.successCount).toBe(1);
      expect(response.body.failureCount).toBe(1);
    });

    it('should return 400 when no files provided', async () => {
      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app)
        .post('/api/upload')
        .field('sessionId', 'test-session');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No files provided');
    });

    it('should generate sessionId if not provided', async () => {
      const mockResult = {
        success: true,
        fileName: 'test_1.jpg',
        originalName: 'test.jpg',
        category: FileCategory.Photo,
        storedPath: '/uploads/Photos/test_1.jpg',
        fileSize: 1024,
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
        .attach('files', Buffer.from('fake image data'), 'test.jpg');

      expect(response.status).toBe(200);
      expect(mockFileService.handleMultipleUploads).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          sessionId: expect.stringMatching(/^session-\d+$/),
        })
      );
    });
  });

  describe('GET /api/history', () => {
    it('should return recent uploads when no sessionId provided', async () => {
      const mockHistory = [
        {
          id: 1,
          fileName: 'test1.jpg',
          originalName: 'test1.jpg',
          fileSize: 1024,
          category: FileCategory.Photo,
          storedPath: '/uploads/Photos/test1.jpg',
          mimeType: 'image/jpeg',
          sessionId: 'session-1',
          uploadedAt: new Date(),
        },
        {
          id: 2,
          fileName: 'test2.pdf',
          originalName: 'test2.pdf',
          fileSize: 2048,
          category: FileCategory.Document,
          storedPath: '/uploads/Documents/test2.pdf',
          mimeType: 'application/pdf',
          sessionId: 'session-2',
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

      const response = await request(app).get('/api/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.uploads).toHaveLength(2);
      expect(mockHistoryService.getRecentUploads).toHaveBeenCalledWith(50);
    });

    it('should return session history when sessionId provided', async () => {
      const mockHistory = [
        {
          id: 1,
          fileName: 'test1.jpg',
          originalName: 'test1.jpg',
          fileSize: 1024,
          category: FileCategory.Photo,
          storedPath: '/uploads/Photos/test1.jpg',
          mimeType: 'image/jpeg',
          sessionId: 'test-session',
          uploadedAt: new Date(),
        },
      ];

      mockHistoryService.getSessionHistory = jest.fn().mockResolvedValue(mockHistory);

      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app).get('/api/history?sessionId=test-session');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(mockHistoryService.getSessionHistory).toHaveBeenCalledWith('test-session');
    });

    it('should respect limit parameter', async () => {
      mockHistoryService.getRecentUploads = jest.fn().mockResolvedValue([]);

      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app).get('/api/history?limit=10');

      expect(response.status).toBe(200);
      expect(mockHistoryService.getRecentUploads).toHaveBeenCalledWith(10);
    });

    it('should handle errors gracefully', async () => {
      mockHistoryService.getRecentUploads = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app).get('/api/history');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/config', () => {
    it('should return client configuration', async () => {
      mockConfigManager.getMaxFileSize = jest.fn().mockResolvedValue(524288000);
      
      const mockExtensions = new Map([
        [FileCategory.Photo, ['.jpg', '.png']],
        [FileCategory.Video, ['.mp4', '.avi']],
        [FileCategory.Document, ['.pdf', '.docx']],
        [FileCategory.Audio, ['.mp3', '.wav']],
        [FileCategory.Archive, ['.zip', '.rar']],
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
      expect(response.body.config.maxFileSize).toBe(524288000);
      expect(response.body.config.supportedCategories).toContain('Photo');
      expect(response.body.config.acceptedExtensions).toHaveProperty('Photo');
    });

    it('should handle errors gracefully', async () => {
      mockConfigManager.getMaxFileSize = jest.fn().mockRejectedValue(
        new Error('Config error')
      );

      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app).get('/api/config');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Error handling middleware', () => {
    it('should handle 404 for unknown routes', async () => {
      const app = createApp(
        mockFileService as FileService,
        mockHistoryService as HistoryService,
        mockConfigManager as ConfigManager,
        mockClassifierService as ClassifierService
      );

      const response = await request(app).get('/api/unknown');

      expect(response.status).toBe(404);
    });
  });
});
