/**
 * Property-Based Test: Rate Limiting
 * 
 * Property 17: Rate Limiting Protection
 * **Validates: Requirements 11.3**
 * 
 * For any client making requests to the API, if the request rate exceeds the configured
 * threshold within a time window, the system shall reject subsequent requests with a
 * rate limit error until the window resets.
 */

import * as fc from 'fast-check';
import request from 'supertest';
import { createApp } from './server';
import { FileService } from './file-service';
import { HistoryService } from './history-service';
import { ConfigManager } from './config-manager';
import { ClassifierService, FileCategory } from './classifier-service';

describe('Property 17: Rate Limiting Protection', () => {
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
      getMaxFileSize: jest.fn().mockResolvedValue(524288000),
    };
    
    mockClassifierService = {
      getSupportedExtensions: jest.fn().mockReturnValue(new Map([
        [FileCategory.Photo, ['.jpg', '.png']],
      ])),
    };
  });

  /**
   * Test that rate limiting triggers after exceeding the configured limit
   * 
   * Note: The default rate limit is 100 requests per 15 minutes (900000ms)
   * For testing purposes, we'll make rapid requests to trigger the limit
   */
  it('should enforce rate limiting after exceeding request threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 15 }), // Number of rapid requests
        async (numRequests) => {
          // Mock successful responses
          mockFileService.handleMultipleUploads = jest.fn().mockResolvedValue([{
            success: true,
            fileName: 'test.jpg',
            originalName: 'test.jpg',
            category: FileCategory.Photo,
            storedPath: '/uploads/Photos/test.jpg',
            fileSize: 1024,
          }]);

          // Set a very low rate limit for testing
          process.env.RATE_LIMIT_MAX_REQUESTS = '5';
          process.env.RATE_LIMIT_WINDOW_MS = '10000'; // 10 seconds

          const app = createApp(
            mockFileService as FileService,
            mockHistoryService as HistoryService,
            mockConfigManager as ConfigManager,
            mockClassifierService as ClassifierService
          );

          const responses = [];
          
          // Make rapid requests
          for (let i = 0; i < numRequests; i++) {
            const response = await request(app)
              .post('/api/upload')
              .attach('files', Buffer.from('test'), 'test.jpg')
              .field('sessionId', 'test-session');
            
            responses.push(response.status);
          }

          // Reset environment variables
          delete process.env.RATE_LIMIT_MAX_REQUESTS;
          delete process.env.RATE_LIMIT_WINDOW_MS;

          // If we made more than 5 requests, at least one should be rate limited (429)
          if (numRequests > 5) {
            return responses.some(status => status === 429);
          }
          
          // If we made 5 or fewer requests, all should succeed (200)
          return responses.every(status => status === 200);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should allow requests within rate limit threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // Number of requests within limit
        async (numRequests) => {
          mockHistoryService.getRecentUploads = jest.fn().mockResolvedValue([]);

          // Set a reasonable rate limit
          process.env.RATE_LIMIT_MAX_REQUESTS = '10';
          process.env.RATE_LIMIT_WINDOW_MS = '10000';

          const app = createApp(
            mockFileService as FileService,
            mockHistoryService as HistoryService,
            mockConfigManager as ConfigManager,
            mockClassifierService as ClassifierService
          );

          const responses = [];
          
          // Make requests within limit
          for (let i = 0; i < numRequests; i++) {
            const response = await request(app).get('/api/history');
            responses.push(response.status);
          }

          // Reset environment variables
          delete process.env.RATE_LIMIT_MAX_REQUESTS;
          delete process.env.RATE_LIMIT_WINDOW_MS;

          // All requests should succeed
          return responses.every(status => status === 200);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should return 429 status code when rate limit is exceeded', async () => {
    mockFileService.handleMultipleUploads = jest.fn().mockResolvedValue([{
      success: true,
      fileName: 'test.jpg',
      originalName: 'test.jpg',
      category: FileCategory.Photo,
      storedPath: '/uploads/Photos/test.jpg',
      fileSize: 1024,
    }]);

    // Set very restrictive rate limit
    process.env.RATE_LIMIT_MAX_REQUESTS = '2';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';

    const app = createApp(
      mockFileService as FileService,
      mockHistoryService as HistoryService,
      mockConfigManager as ConfigManager,
      mockClassifierService as ClassifierService
    );

    // Make requests to exceed limit
    await request(app)
      .post('/api/upload')
      .attach('files', Buffer.from('test1'), 'test1.jpg');
    
    await request(app)
      .post('/api/upload')
      .attach('files', Buffer.from('test2'), 'test2.jpg');
    
    // Third request should be rate limited
    const response = await request(app)
      .post('/api/upload')
      .attach('files', Buffer.from('test3'), 'test3.jpg');

    // Reset environment variables
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_WINDOW_MS;

    expect(response.status).toBe(429);
  });

  it('should apply rate limiting to all /api/ endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/api/upload', '/api/history', '/api/config'),
        async (endpoint) => {
          mockFileService.handleMultipleUploads = jest.fn().mockResolvedValue([{
            success: true,
            fileName: 'test.jpg',
            originalName: 'test.jpg',
            category: FileCategory.Photo,
            storedPath: '/uploads/Photos/test.jpg',
            fileSize: 1024,
          }]);
          
          mockHistoryService.getRecentUploads = jest.fn().mockResolvedValue([]);

          // Set very restrictive rate limit
          process.env.RATE_LIMIT_MAX_REQUESTS = '2';
          process.env.RATE_LIMIT_WINDOW_MS = '60000';

          const app = createApp(
            mockFileService as FileService,
            mockHistoryService as HistoryService,
            mockConfigManager as ConfigManager,
            mockClassifierService as ClassifierService
          );

          const responses = [];
          
          // Make multiple requests to the same endpoint
          for (let i = 0; i < 4; i++) {
            let response;
            if (endpoint === '/api/upload') {
              response = await request(app)
                .post(endpoint)
                .attach('files', Buffer.from(`test${i}`), `test${i}.jpg`);
            } else {
              response = await request(app).get(endpoint);
            }
            responses.push(response.status);
          }

          // Reset environment variables
          delete process.env.RATE_LIMIT_MAX_REQUESTS;
          delete process.env.RATE_LIMIT_WINDOW_MS;

          // Should have at least one 429 response after exceeding limit
          return responses.some(status => status === 429);
        }
      ),
      { numRuns: 10 }
    );
  });
});
