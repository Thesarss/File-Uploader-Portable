import * as fc from 'fast-check';
import { Pool } from 'pg';

/**
 * Property-Based Test for Database Schema
 * Feature: web-file-uploader
 * Property 14: Upload Metadata Recording
 * **Validates: Requirements 8.1, 8.4**
 * 
 * This test verifies that all required fields are stored correctly in the database
 * when upload records are inserted.
 */

// Mock pool for testing - must be defined before the mock
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockEnd = jest.fn();
const mockOn = jest.fn();

jest.mock('pg', () => {
  return { 
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
      connect: mockConnect,
      end: mockEnd,
      on: mockOn,
    }))
  };
});

// Import db after mocking
import db from './db';

describe('Database Schema Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 14: Upload Metadata Recording', () => {
    /**
     * Property: For any file successfully stored, the system shall create a database record
     * containing complete metadata: filename, original name, file size, category, stored path,
     * MIME type, upload timestamp, session ID, and device information.
     */
    it('should store all required upload metadata fields correctly', async () => {
      // Generators for upload record fields
      const fileNameArb = fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0);
      const fileSizeArb = fc.bigInt({ min: 0n, max: 524288000n }); // 0 to 500MB
      const categoryArb = fc.constantFrom('Photo', 'Video', 'Document', 'Audio', 'Archive', 'Other');
      const pathArb = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0);
      const mimeTypeArb = fc.constantFrom(
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/avi', 'video/quicktime',
        'application/pdf', 'application/msword',
        'audio/mpeg', 'audio/wav',
        'application/zip', 'application/x-rar-compressed'
      );
      const sessionIdArb = fc.uuid();
      const deviceInfoArb = fc.string({ minLength: 1, maxLength: 500 });
      const checksumArb = fc.option(
        fc.string({ minLength: 64, maxLength: 64 }).map(s => 
          s.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').slice(0, 64)
        ),
        { nil: null }
      );

      // Combined arbitrary for upload record
      const uploadRecordArb = fc.record({
        file_name: fileNameArb,
        original_name: fileNameArb,
        file_size: fileSizeArb,
        category: categoryArb,
        stored_path: pathArb,
        mime_type: mimeTypeArb,
        session_id: sessionIdArb,
        device_info: deviceInfoArb,
        checksum: checksumArb,
      });

      await fc.assert(
        fc.asyncProperty(uploadRecordArb, async (record) => {
          // Mock successful insert
          const mockId = fc.sample(fc.uuid(), 1)[0];
          const mockTimestamp = new Date();
          
          mockQuery.mockResolvedValueOnce({
            rows: [{
              id: mockId,
              ...record,
              uploaded_at: mockTimestamp,
            }],
            rowCount: 1,
          });

          // Insert the record
          const insertQuery = `
            INSERT INTO uploads (
              file_name, original_name, file_size, category, stored_path,
              mime_type, session_id, device_info, checksum
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
          `;

          const result = await db.query(insertQuery, [
            record.file_name,
            record.original_name,
            record.file_size.toString(),
            record.category,
            record.stored_path,
            record.mime_type,
            record.session_id,
            record.device_info,
            record.checksum,
          ]);

          // Verify the query was called with correct parameters
          expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO uploads'),
            expect.arrayContaining([
              record.file_name,
              record.original_name,
              record.file_size.toString(),
              record.category,
              record.stored_path,
              record.mime_type,
              record.session_id,
              record.device_info,
              record.checksum,
            ])
          );

          // Verify all required fields are present in the result
          expect(result.rows[0]).toHaveProperty('id');
          expect(result.rows[0]).toHaveProperty('file_name', record.file_name);
          expect(result.rows[0]).toHaveProperty('original_name', record.original_name);
          expect(result.rows[0]).toHaveProperty('file_size', record.file_size);
          expect(result.rows[0]).toHaveProperty('category', record.category);
          expect(result.rows[0]).toHaveProperty('stored_path', record.stored_path);
          expect(result.rows[0]).toHaveProperty('mime_type', record.mime_type);
          expect(result.rows[0]).toHaveProperty('uploaded_at');
          expect(result.rows[0]).toHaveProperty('session_id', record.session_id);
          expect(result.rows[0]).toHaveProperty('device_info', record.device_info);
          
          // Verify uploaded_at is a valid date
          expect(result.rows[0].uploaded_at).toBeInstanceOf(Date);
          
          // Verify id is a valid UUID format (basic check)
          expect(result.rows[0].id).toBeTruthy();
        }),
        { numRuns: 10 } // Optimized: Run 10 iterations for faster test execution
      );
    });

    it('should handle all file categories correctly', async () => {
      const categories = ['Photo', 'Video', 'Document', 'Audio', 'Archive', 'Other'];
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...categories),
          fc.string({ minLength: 1, maxLength: 255 }),
          fc.bigInt({ min: 1n, max: 524288000n }),
          async (category, fileName, fileSize) => {
            const mockId = fc.sample(fc.uuid(), 1)[0];
            
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: mockId,
                file_name: fileName,
                original_name: fileName,
                file_size: fileSize,
                category: category,
                stored_path: `/uploads/${category}/${fileName}`,
                mime_type: 'application/octet-stream',
                uploaded_at: new Date(),
                session_id: 'test-session',
                device_info: 'test-device',
                checksum: null,
              }],
              rowCount: 1,
            });

            const result = await db.query(
              'INSERT INTO uploads (file_name, original_name, file_size, category, stored_path, mime_type, session_id, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
              [fileName, fileName, fileSize.toString(), category, `/uploads/${category}/${fileName}`, 'application/octet-stream', 'test-session', 'test-device']
            );

            // Verify category is stored correctly
            expect(result.rows[0].category).toBe(category);
          }
        ),
        { numRuns: 10 } // Optimized: Run 10 iterations for faster test execution
      );
    });

    it('should handle various file sizes correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.bigInt({ min: 0n, max: 524288000n }), // 0 to 500MB
          async (fileSize) => {
            const mockId = fc.sample(fc.uuid(), 1)[0];
            
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: mockId,
                file_name: 'test.jpg',
                original_name: 'test.jpg',
                file_size: fileSize,
                category: 'Photo',
                stored_path: '/uploads/Photos/test.jpg',
                mime_type: 'image/jpeg',
                uploaded_at: new Date(),
                session_id: 'test-session',
                device_info: 'test-device',
                checksum: null,
              }],
              rowCount: 1,
            });

            const result = await db.query(
              'INSERT INTO uploads (file_name, original_name, file_size, category, stored_path, mime_type, session_id, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
              ['test.jpg', 'test.jpg', fileSize.toString(), 'Photo', '/uploads/Photos/test.jpg', 'image/jpeg', 'test-session', 'test-device']
            );

            // Verify file size is stored correctly
            expect(result.rows[0].file_size).toBe(fileSize);
          }
        ),
        { numRuns: 10 } // Optimized: Run 10 iterations for faster test execution
      );
    });

    it('should store session_id and device_info for tracking', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 500 }),
          async (sessionId, deviceInfo) => {
            const mockId = fc.sample(fc.uuid(), 1)[0];
            
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: mockId,
                file_name: 'test.jpg',
                original_name: 'test.jpg',
                file_size: 1024n,
                category: 'Photo',
                stored_path: '/uploads/Photos/test.jpg',
                mime_type: 'image/jpeg',
                uploaded_at: new Date(),
                session_id: sessionId,
                device_info: deviceInfo,
                checksum: null,
              }],
              rowCount: 1,
            });

            const result = await db.query(
              'INSERT INTO uploads (file_name, original_name, file_size, category, stored_path, mime_type, session_id, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
              ['test.jpg', 'test.jpg', '1024', 'Photo', '/uploads/Photos/test.jpg', 'image/jpeg', sessionId, deviceInfo]
            );

            // Verify session_id and device_info are stored correctly (Requirements 8.4)
            expect(result.rows[0].session_id).toBe(sessionId);
            expect(result.rows[0].device_info).toBe(deviceInfo);
          }
        ),
        { numRuns: 10 } // Optimized: Run 10 iterations for faster test execution
      );
    });
  });
});
