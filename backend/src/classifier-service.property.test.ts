import { ClassifierService } from './classifier-service';
import * as fc from 'fast-check';

describe('Property-Based Tests', () => {
  let service: ClassifierService;

  beforeEach(() => {
    service = new ClassifierService();
  });

  /**
   * Property 9: MIME Type Validation
   * **Validates: Requirements 3.1.8**
   * 
   * For any file uploaded, the file classifier shall verify that the MIME type
   * is consistent with the file extension, and flag mismatches for additional validation.
   */
  describe('Property 9: MIME Type Validation', () => {
    it('should validate matching MIME types for all photo extensions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif', '.bmp', '.tiff'),
          fc.constantFrom('image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'),
          (extension, mimeType) => {
            const fileName = `test${extension}`;
            const result = service.validateMimeType(fileName, mimeType);
            return result === true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should validate matching MIME types for all video extensions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'),
          fc.constantFrom('video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska', 'video/x-ms-wmv', 'video/x-flv', 'video/webm'),
          (extension, mimeType) => {
            const fileName = `test${extension}`;
            const result = service.validateMimeType(fileName, mimeType);
            return result === true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should validate matching MIME types for all audio extensions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('.mp3', '.wav', '.aac', '.flac', '.ogg'),
          fc.constantFrom('audio/mpeg', 'audio/wav', 'audio/aac', 'audio/flac', 'audio/ogg'),
          (extension, mimeType) => {
            const fileName = `test${extension}`;
            const result = service.validateMimeType(fileName, mimeType);
            return result === true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should validate matching MIME types for all document extensions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'),
          fc.constantFrom(
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain'
          ),
          (extension, mimeType) => {
            const fileName = `test${extension}`;
            const result = service.validateMimeType(fileName, mimeType);
            return result === true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should validate matching MIME types for all archive extensions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('.zip', '.rar', '.7z', '.tar', '.gz'),
          fc.constantFrom('application/zip', 'application/x-rar', 'application/x-7z-compressed', 'application/x-tar', 'application/gzip'),
          (extension, mimeType) => {
            const fileName = `test${extension}`;
            const result = service.validateMimeType(fileName, mimeType);
            return result === true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should reject mismatched MIME types across all categories', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            // Photo extensions
            '.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif', '.bmp', '.tiff',
            // Video extensions
            '.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'
          ),
          fc.constantFrom(
            // Non-matching MIME types (audio, document, archive)
            'audio/mpeg', 'audio/wav',
            'application/pdf', 'text/plain',
            'application/zip', 'application/x-tar'
          ),
          (extension, mimeType) => {
            const fileName = `test${extension}`;
            const result = service.validateMimeType(fileName, mimeType);
            // Should return false for mismatched types
            return result === false;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle case variations in MIME types', () => {
      // Test specific extension-MIME type pairs with case variations
      const testCases = [
        { ext: '.jpg', mime: 'IMAGE/JPEG' },
        { ext: '.png', mime: 'Image/Png' },
        { ext: '.mp4', mime: 'VIDEO/MP4' },
        { ext: '.pdf', mime: 'Application/PDF' },
        { ext: '.mp3', mime: 'AUDIO/MPEG' },
        { ext: '.zip', mime: 'Application/Zip' },
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...testCases),
          (testCase) => {
            const fileName = `test${testCase.ext}`;
            const result = service.validateMimeType(fileName, testCase.mime);
            // Should handle case-insensitive MIME types
            return result === true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should accept any MIME type for unknown extensions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('.xyz', '.unknown', '.abc', '.test'),
          fc.constantFrom('application/octet-stream', 'text/plain', 'image/jpeg', 'video/mp4', 'anything/random'),
          (extension, mimeType) => {
            const fileName = `test${extension}`;
            const result = service.validateMimeType(fileName, mimeType);
            // Unknown extensions should accept any MIME type
            return result === true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
