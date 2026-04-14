import { ClassifierService, FileCategory } from './classifier-service';
import * as fc from 'fast-check';

describe('ClassifierService', () => {
  let service: ClassifierService;

  beforeEach(() => {
    service = new ClassifierService();
  });

  it('should classify .jpg as Photo', () => {
    expect(service.classifyFile('image.jpg')).toBe(FileCategory.Photo);
  });

  it('should classify .png as Photo', () => {
    expect(service.classifyFile('screenshot.png')).toBe(FileCategory.Photo);
  });

  it('should classify .mp4 as Video', () => {
    expect(service.classifyFile('movie.mp4')).toBe(FileCategory.Video);
  });

  it('should classify .pdf as Document', () => {
    expect(service.classifyFile('report.pdf')).toBe(FileCategory.Document);
  });

  it('should classify .mp3 as Audio', () => {
    expect(service.classifyFile('song.mp3')).toBe(FileCategory.Audio);
  });

  it('should classify .zip as Archive', () => {
    expect(service.classifyFile('backup.zip')).toBe(FileCategory.Archive);
  });

  it('should classify unknown extension as Other', () => {
    expect(service.classifyFile('file.xyz')).toBe(FileCategory.Other);
  });

  it('should handle uppercase extensions', () => {
    expect(service.classifyFile('IMAGE.JPG')).toBe(FileCategory.Photo);
  });

  it('should return all supported extensions', () => {
    const extensionsMap = service.getSupportedExtensions();
    expect(extensionsMap).toBeInstanceOf(Map);
    expect(extensionsMap.size).toBe(6);
    const photoExtensions = extensionsMap.get(FileCategory.Photo) || [];
    expect(photoExtensions.length).toBe(8);
  });

  describe('validateMimeType', () => {
    it('should validate matching MIME type for photo', () => {
      expect(service.validateMimeType('image.jpg', 'image/jpeg')).toBe(true);
      expect(service.validateMimeType('photo.png', 'image/png')).toBe(true);
    });

    it('should validate matching MIME type for video', () => {
      expect(service.validateMimeType('movie.mp4', 'video/mp4')).toBe(true);
      expect(service.validateMimeType('clip.avi', 'video/x-msvideo')).toBe(true);
    });

    it('should validate matching MIME type for audio', () => {
      expect(service.validateMimeType('song.mp3', 'audio/mpeg')).toBe(true);
      expect(service.validateMimeType('track.wav', 'audio/wav')).toBe(true);
    });

    it('should validate matching MIME type for document', () => {
      expect(service.validateMimeType('report.pdf', 'application/pdf')).toBe(true);
      expect(service.validateMimeType('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
      expect(service.validateMimeType('notes.txt', 'text/plain')).toBe(true);
    });

    it('should validate matching MIME type for archive', () => {
      expect(service.validateMimeType('backup.zip', 'application/zip')).toBe(true);
      expect(service.validateMimeType('archive.tar', 'application/x-tar')).toBe(true);
      expect(service.validateMimeType('compressed.gz', 'application/gzip')).toBe(true);
    });

    it('should flag mismatch when photo extension has non-image MIME type', () => {
      expect(service.validateMimeType('image.jpg', 'video/mp4')).toBe(false);
      expect(service.validateMimeType('photo.png', 'application/pdf')).toBe(false);
    });

    it('should flag mismatch when video extension has non-video MIME type', () => {
      expect(service.validateMimeType('movie.mp4', 'image/jpeg')).toBe(false);
      expect(service.validateMimeType('clip.avi', 'audio/mpeg')).toBe(false);
    });

    it('should flag mismatch when audio extension has non-audio MIME type', () => {
      expect(service.validateMimeType('song.mp3', 'video/mp4')).toBe(false);
      expect(service.validateMimeType('track.wav', 'image/png')).toBe(false);
    });

    it('should flag mismatch when document extension has non-document MIME type', () => {
      expect(service.validateMimeType('report.pdf', 'image/jpeg')).toBe(false);
      expect(service.validateMimeType('doc.docx', 'video/mp4')).toBe(false);
    });

    it('should flag mismatch when archive extension has non-archive MIME type', () => {
      expect(service.validateMimeType('backup.zip', 'image/jpeg')).toBe(false);
      expect(service.validateMimeType('archive.tar', 'video/mp4')).toBe(false);
    });

    it('should handle case-insensitive MIME types', () => {
      expect(service.validateMimeType('image.jpg', 'IMAGE/JPEG')).toBe(true);
      expect(service.validateMimeType('movie.mp4', 'VIDEO/MP4')).toBe(true);
    });

    it('should allow any MIME type for unknown extensions', () => {
      expect(service.validateMimeType('file.xyz', 'application/octet-stream')).toBe(true);
      expect(service.validateMimeType('unknown.abc', 'text/plain')).toBe(true);
    });

    it('should allow any MIME type for Other category', () => {
      expect(service.validateMimeType('file.xyz', 'anything/goes')).toBe(true);
    });
  });
});

// Property-Based Tests
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
      fc.assert(
        fc.property(
          fc.constantFrom('.jpg', '.png', '.mp4', '.pdf', '.mp3', '.zip'),
          fc.constantFrom('IMAGE/JPEG', 'Image/Png', 'VIDEO/MP4', 'Application/PDF', 'AUDIO/MPEG', 'Application/Zip'),
          (extension, mimeType) => {
            const fileName = `test${extension}`;
            const result = service.validateMimeType(fileName, mimeType);
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
