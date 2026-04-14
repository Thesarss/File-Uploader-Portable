import * as fc from 'fast-check';
import { HistoryService } from './history-service';
import FileRepository, { UploadRecordInput, UploadRecord, FileCategory } from './file-repository';

/**
 * Property-Based Test for Upload Metadata Recording
 * Feature: web-file-uploader
 * Property 14: Upload Metadata Recording (implementation verification)
 * **Validates: Requirements 8.1, 8.4**
 * 
 * This test verifies that the HistoryService correctly records complete metadata
 * for uploaded files through the FileRepository.
 */

describe('HistoryService Property Tests', () => {
  let historyService: HistoryService;
  let mockRepository: jest.Mocked<FileRepository>;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      insertUploadRecord: jest.fn(),
      getUploadsBySession: jest.fn(),
      getRecentUploads: jest.fn(),
    } as any;

    historyService = new HistoryService(mockRepository);
  });

  describe('Property 14: Upload Metadata Recording', () => {
    /**
     * Property: For any file successfully stored, the system shall create a database record
     * containing complete metadata: filename, original name, file size, category, stored path,
     * MIME type, upload timestamp, session ID, and device information.
     */
    it('should record complete metadata for random uploads', async () => {
      // Generators for upload record fields
      const fileNameArb = fc.string({ minLength: 1, maxLength: 255 })
        .filter(s => s.trim().length > 0)
        .map(s => s.replace(/[<>:"|?*]/g, '_')); // Remove invalid filename chars
      
      const fileSizeArb = fc.integer({ min: 1, max: 524288000 }); // 1 byte to 500MB
      
      const categoryArb = fc.constantFrom(
        FileCategory.Photo,
        FileCategory.Video,
        FileCategory.Document,
        FileCategory.Audio,
        FileCategory.Archive,
        FileCategory.Other
      );
      
      const pathArb = fc.string({ minLength: 1, maxLength: 500 })
        .filter(s => s.trim().length > 0);
      
      const mimeTypeArb = fc.constantFrom(
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/avi', 'video/quicktime',
        'application/pdf', 'application/msword',
        'audio/mpeg', 'audio/wav',
        'application/zip', 'application/x-rar-compressed'
      );
      
      const sessionIdArb = fc.uuid();
      
      const deviceInfoArb = fc.option(
        fc.string({ minLength: 1, maxLength: 500 }),
        { nil: undefined }
      );
      
      const checksumArb = fc.option(
        fc.string({ minLength: 64, maxLength: 64 }).map(s => 
          s.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').slice(0, 64)
        ),
        { nil: undefined }
      );

      // Combined arbitrary for upload record
      const uploadRecordArb = fc.record({
        fileName: fileNameArb,
        originalName: fileNameArb,
        fileSize: fileSizeArb,
        category: categoryArb,
        storedPath: pathArb,
        mimeType: mimeTypeArb,
        sessionId: sessionIdArb,
        deviceInfo: deviceInfoArb,
        checksum: checksumArb,
      });

      await fc.assert(
        fc.asyncProperty(uploadRecordArb, async (record: UploadRecordInput) => {
          // Reset mock before each iteration
          mockRepository.insertUploadRecord.mockClear();
          
          // Mock successful insert with generated ID
          const mockId = fc.sample(fc.uuid(), 1)[0];
          const mockTimestamp = new Date();
          
          mockRepository.insertUploadRecord.mockResolvedValueOnce({
            id: mockId,
            ...record,
            uploadedAt: mockTimestamp,
          });

          // Record the upload
          await historyService.recordUpload(record);

          // Verify the repository was called with complete metadata
          expect(mockRepository.insertUploadRecord).toHaveBeenCalledWith(
            expect.objectContaining({
              fileName: record.fileName,
              originalName: record.originalName,
              fileSize: record.fileSize,
              category: record.category,
              storedPath: record.storedPath,
              mimeType: record.mimeType,
              sessionId: record.sessionId,
              deviceInfo: record.deviceInfo,
              checksum: record.checksum,
            })
          );

          // Verify all required fields are present (Requirements 8.1, 8.4)
          const callArgs = mockRepository.insertUploadRecord.mock.calls[0][0];
          expect(callArgs).toHaveProperty('fileName');
          expect(callArgs).toHaveProperty('originalName');
          expect(callArgs).toHaveProperty('fileSize');
          expect(callArgs).toHaveProperty('category');
          expect(callArgs).toHaveProperty('storedPath');
          expect(callArgs).toHaveProperty('mimeType');
          expect(callArgs).toHaveProperty('sessionId');
          
          // Verify values match
          expect(callArgs.fileName).toBe(record.fileName);
          expect(callArgs.originalName).toBe(record.originalName);
          expect(callArgs.fileSize).toBe(record.fileSize);
          expect(callArgs.category).toBe(record.category);
          expect(callArgs.storedPath).toBe(record.storedPath);
          expect(callArgs.mimeType).toBe(record.mimeType);
          expect(callArgs.sessionId).toBe(record.sessionId);
          expect(callArgs.deviceInfo).toBe(record.deviceInfo);
          expect(callArgs.checksum).toBe(record.checksum);
        }),
        { numRuns: 10 } // As specified in task details
      );
    });

    it('should record metadata for all file categories', async () => {
      const categories = [
        FileCategory.Photo,
        FileCategory.Video,
        FileCategory.Document,
        FileCategory.Audio,
        FileCategory.Archive,
        FileCategory.Other
      ];
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...categories),
          fc.string({ minLength: 1, maxLength: 255 }).map(s => s.replace(/[<>:"|?*]/g, '_') || 'file'),
          fc.integer({ min: 1, max: 524288000 }),
          fc.uuid(),
          async (category, fileName, fileSize, sessionId) => {
            // Reset mock before each iteration
            mockRepository.insertUploadRecord.mockClear();
            
            const mockId = fc.sample(fc.uuid(), 1)[0];
            
            mockRepository.insertUploadRecord.mockResolvedValueOnce({
              id: mockId,
              fileName: fileName,
              originalName: fileName,
              fileSize: fileSize,
              category: category,
              storedPath: `/uploads/${category}/${fileName}`,
              mimeType: 'application/octet-stream',
              uploadedAt: new Date(),
              sessionId: sessionId,
            });

            await historyService.recordUpload({
              fileName: fileName,
              originalName: fileName,
              fileSize: fileSize,
              category: category,
              storedPath: `/uploads/${category}/${fileName}`,
              mimeType: 'application/octet-stream',
              sessionId: sessionId,
            });

            // Verify category is recorded correctly
            const callArgs = mockRepository.insertUploadRecord.mock.calls[0][0];
            expect(callArgs.category).toBe(category);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should record session_id and device_info for tracking (Requirement 8.4)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 500 }),
          async (sessionId, deviceInfo) => {
            // Reset mock before each iteration
            mockRepository.insertUploadRecord.mockClear();
            
            const mockId = fc.sample(fc.uuid(), 1)[0];
            
            mockRepository.insertUploadRecord.mockResolvedValueOnce({
              id: mockId,
              fileName: 'test.jpg',
              originalName: 'test.jpg',
              fileSize: 1024,
              category: FileCategory.Photo,
              storedPath: '/uploads/Photos/test.jpg',
              mimeType: 'image/jpeg',
              uploadedAt: new Date(),
              sessionId: sessionId,
              deviceInfo: deviceInfo,
            });

            await historyService.recordUpload({
              fileName: 'test.jpg',
              originalName: 'test.jpg',
              fileSize: 1024,
              category: FileCategory.Photo,
              storedPath: '/uploads/Photos/test.jpg',
              mimeType: 'image/jpeg',
              sessionId: sessionId,
              deviceInfo: deviceInfo,
            });

            // Verify session_id and device_info are recorded correctly (Requirement 8.4)
            const callArgs = mockRepository.insertUploadRecord.mock.calls[0][0];
            expect(callArgs.sessionId).toBe(sessionId);
            expect(callArgs.deviceInfo).toBe(deviceInfo);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle various file sizes correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 524288000 }), // 0 to 500MB
          async (fileSize) => {
            // Reset mock before each iteration
            mockRepository.insertUploadRecord.mockClear();
            
            const mockId = fc.sample(fc.uuid(), 1)[0];
            
            mockRepository.insertUploadRecord.mockResolvedValueOnce({
              id: mockId,
              fileName: 'test.jpg',
              originalName: 'test.jpg',
              fileSize: fileSize,
              category: FileCategory.Photo,
              storedPath: '/uploads/Photos/test.jpg',
              mimeType: 'image/jpeg',
              uploadedAt: new Date(),
              sessionId: 'test-session',
            });

            await historyService.recordUpload({
              fileName: 'test.jpg',
              originalName: 'test.jpg',
              fileSize: fileSize,
              category: FileCategory.Photo,
              storedPath: '/uploads/Photos/test.jpg',
              mimeType: 'image/jpeg',
              sessionId: 'test-session',
            });

            // Verify file size is recorded correctly
            const callArgs = mockRepository.insertUploadRecord.mock.calls[0][0];
            expect(callArgs.fileSize).toBe(fileSize);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should record checksum when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 64, maxLength: 64 }).map(s => 
            s.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').slice(0, 64)
          ),
          async (checksum: string) => {
            // Reset mock before each iteration
            mockRepository.insertUploadRecord.mockClear();
            
            const mockId = fc.sample(fc.uuid(), 1)[0];
            
            mockRepository.insertUploadRecord.mockResolvedValueOnce({
              id: mockId,
              fileName: 'test.jpg',
              originalName: 'test.jpg',
              fileSize: 1024,
              category: FileCategory.Photo,
              storedPath: '/uploads/Photos/test.jpg',
              mimeType: 'image/jpeg',
              uploadedAt: new Date(),
              sessionId: 'test-session',
              checksum: checksum,
            });

            await historyService.recordUpload({
              fileName: 'test.jpg',
              originalName: 'test.jpg',
              fileSize: 1024,
              category: FileCategory.Photo,
              storedPath: '/uploads/Photos/test.jpg',
              mimeType: 'image/jpeg',
              sessionId: 'test-session',
              checksum: checksum,
            });

            // Verify checksum is recorded correctly
            const callArgs = mockRepository.insertUploadRecord.mock.calls[0][0];
            expect(callArgs.checksum).toBe(checksum);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 15: History Query Response Structure', () => {
    /**
     * Property: For any history query request, the API response shall include all required
     * fields for each upload record: id, filename, original name, file size, category,
     * stored path, MIME type, upload timestamp, session ID, device information, and checksum.
     * **Validates: Requirements 8.3**
     */
    it('should return all required fields in history query response', async () => {
      // Generators for upload record fields
      const fileNameArb = fc.string({ minLength: 1, maxLength: 255 })
        .filter(s => s.trim().length > 0)
        .map(s => s.replace(/[<>:"|?*]/g, '_'));
      
      const fileSizeArb = fc.integer({ min: 1, max: 524288000 });
      
      const categoryArb = fc.constantFrom(
        FileCategory.Photo,
        FileCategory.Video,
        FileCategory.Document,
        FileCategory.Audio,
        FileCategory.Archive,
        FileCategory.Other
      );
      
      const pathArb = fc.string({ minLength: 1, maxLength: 500 })
        .filter(s => s.trim().length > 0);
      
      const mimeTypeArb = fc.constantFrom(
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/avi', 'video/quicktime',
        'application/pdf', 'application/msword',
        'audio/mpeg', 'audio/wav',
        'application/zip', 'application/x-rar-compressed'
      );
      
      const sessionIdArb = fc.uuid();
      
      const deviceInfoArb = fc.option(
        fc.string({ minLength: 1, maxLength: 500 }),
        { nil: undefined }
      );
      
      const checksumArb = fc.option(
        fc.string({ minLength: 64, maxLength: 64 }).map(s => 
          s.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').slice(0, 64)
        ),
        { nil: undefined }
      );

      // Combined arbitrary for upload record
      const uploadRecordArb = fc.record({
        fileName: fileNameArb,
        originalName: fileNameArb,
        fileSize: fileSizeArb,
        category: categoryArb,
        storedPath: pathArb,
        mimeType: mimeTypeArb,
        sessionId: sessionIdArb,
        deviceInfo: deviceInfoArb,
        checksum: checksumArb,
      });

      await fc.assert(
        fc.asyncProperty(uploadRecordArb, async (record: UploadRecordInput) => {
          // Reset mock before each iteration
          mockRepository.getUploadsBySession.mockClear();
          
          // Mock history query response with all required fields
          const mockId = fc.sample(fc.uuid(), 1)[0];
          const mockTimestamp = new Date();
          
          const mockHistoryRecord: UploadRecord = {
            id: mockId,
            fileName: record.fileName,
            originalName: record.originalName,
            fileSize: record.fileSize,
            category: record.category,
            storedPath: record.storedPath,
            mimeType: record.mimeType,
            uploadedAt: mockTimestamp,
            sessionId: record.sessionId,
            deviceInfo: record.deviceInfo,
            checksum: record.checksum,
          };
          
          mockRepository.getUploadsBySession.mockResolvedValueOnce([mockHistoryRecord]);

          // Query history
          const history = await historyService.getSessionHistory(record.sessionId);

          // Verify response contains at least one record
          expect(history).toHaveLength(1);
          
          const historyItem = history[0];

          // Verify all required fields are present (Requirement 8.3)
          expect(historyItem).toHaveProperty('id');
          expect(historyItem).toHaveProperty('fileName');
          expect(historyItem).toHaveProperty('originalName');
          expect(historyItem).toHaveProperty('fileSize');
          expect(historyItem).toHaveProperty('category');
          expect(historyItem).toHaveProperty('storedPath');
          expect(historyItem).toHaveProperty('mimeType');
          expect(historyItem).toHaveProperty('uploadedAt');
          expect(historyItem).toHaveProperty('sessionId');
          
          // Verify field values match
          expect(historyItem.id).toBe(mockId);
          expect(historyItem.fileName).toBe(record.fileName);
          expect(historyItem.originalName).toBe(record.originalName);
          expect(historyItem.fileSize).toBe(record.fileSize);
          expect(historyItem.category).toBe(record.category);
          expect(historyItem.storedPath).toBe(record.storedPath);
          expect(historyItem.mimeType).toBe(record.mimeType);
          expect(historyItem.uploadedAt).toEqual(mockTimestamp);
          expect(historyItem.sessionId).toBe(record.sessionId);
          expect(historyItem.deviceInfo).toBe(record.deviceInfo);
          expect(historyItem.checksum).toBe(record.checksum);
        }),
        { numRuns: 10 }
      );
    });

    it('should return all required fields for recent uploads query', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (limit) => {
            // Reset mock before each iteration
            mockRepository.getRecentUploads.mockClear();
            
            // Generate random number of records (1 to limit)
            const numRecords = fc.sample(fc.integer({ min: 1, max: Math.min(limit, 10) }), 1)[0];
            
            const mockRecords: UploadRecord[] = [];
            for (let i = 0; i < numRecords; i++) {
              mockRecords.push({
                id: fc.sample(fc.uuid(), 1)[0],
                fileName: `file${i}.jpg`,
                originalName: `original${i}.jpg`,
                fileSize: fc.sample(fc.integer({ min: 1, max: 524288000 }), 1)[0],
                category: FileCategory.Photo,
                storedPath: `/uploads/Photos/file${i}.jpg`,
                mimeType: 'image/jpeg',
                uploadedAt: new Date(),
                sessionId: fc.sample(fc.uuid(), 1)[0],
                deviceInfo: 'Test Device',
                checksum: undefined,
              });
            }
            
            mockRepository.getRecentUploads.mockResolvedValueOnce(mockRecords);

            // Query recent uploads
            const history = await historyService.getRecentUploads(limit);

            // Verify all records have required fields
            expect(history.length).toBeGreaterThan(0);
            
            history.forEach(item => {
              // Verify all required fields are present (Requirement 8.3)
              expect(item).toHaveProperty('id');
              expect(item).toHaveProperty('fileName');
              expect(item).toHaveProperty('originalName');
              expect(item).toHaveProperty('fileSize');
              expect(item).toHaveProperty('category');
              expect(item).toHaveProperty('storedPath');
              expect(item).toHaveProperty('mimeType');
              expect(item).toHaveProperty('uploadedAt');
              expect(item).toHaveProperty('sessionId');
              
              // Verify field types
              expect(typeof item.id).toBe('string');
              expect(typeof item.fileName).toBe('string');
              expect(typeof item.originalName).toBe('string');
              expect(typeof item.fileSize).toBe('number');
              expect(typeof item.category).toBe('string');
              expect(typeof item.storedPath).toBe('string');
              expect(typeof item.mimeType).toBe('string');
              expect(item.uploadedAt).toBeInstanceOf(Date);
              expect(typeof item.sessionId).toBe('string');
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle empty history query results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (sessionId) => {
            // Reset mock before each iteration
            mockRepository.getUploadsBySession.mockClear();
            
            // Mock empty history response
            mockRepository.getUploadsBySession.mockResolvedValueOnce([]);

            // Query history for session with no uploads
            const history = await historyService.getSessionHistory(sessionId);

            // Verify empty array is returned
            expect(Array.isArray(history)).toBe(true);
            expect(history).toHaveLength(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return multiple records with all required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 2, max: 10 }),
          async (sessionId, numRecords) => {
            // Reset mock before each iteration
            mockRepository.getUploadsBySession.mockClear();
            
            // Generate multiple records
            const mockRecords: UploadRecord[] = [];
            for (let i = 0; i < numRecords; i++) {
              mockRecords.push({
                id: fc.sample(fc.uuid(), 1)[0],
                fileName: `file${i}.jpg`,
                originalName: `original${i}.jpg`,
                fileSize: fc.sample(fc.integer({ min: 1, max: 524288000 }), 1)[0],
                category: fc.sample(fc.constantFrom(
                  FileCategory.Photo,
                  FileCategory.Video,
                  FileCategory.Document,
                  FileCategory.Audio,
                  FileCategory.Archive,
                  FileCategory.Other
                ), 1)[0],
                storedPath: `/uploads/Photos/file${i}.jpg`,
                mimeType: 'image/jpeg',
                uploadedAt: new Date(Date.now() - i * 1000),
                sessionId: sessionId,
                deviceInfo: `Device ${i}`,
                checksum: i % 2 === 0 ? fc.sample(fc.string({ minLength: 64, maxLength: 64 }), 1)[0] : undefined,
              });
            }
            
            mockRepository.getUploadsBySession.mockResolvedValueOnce(mockRecords);

            // Query history
            const history = await historyService.getSessionHistory(sessionId);

            // Verify correct number of records returned
            expect(history).toHaveLength(numRecords);
            
            // Verify all records have required fields
            history.forEach((item, index) => {
              expect(item).toHaveProperty('id');
              expect(item).toHaveProperty('fileName');
              expect(item).toHaveProperty('originalName');
              expect(item).toHaveProperty('fileSize');
              expect(item).toHaveProperty('category');
              expect(item).toHaveProperty('storedPath');
              expect(item).toHaveProperty('mimeType');
              expect(item).toHaveProperty('uploadedAt');
              expect(item).toHaveProperty('sessionId');
              
              // Verify session ID matches for all records
              expect(item.sessionId).toBe(sessionId);
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
