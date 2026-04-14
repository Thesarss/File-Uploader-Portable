/**
 * ClassifierService
 * 
 * Responsible for identifying and classifying file types based on file extensions.
 * Maps file extensions to predefined categories for organized storage.
 */

export enum FileCategory {
  Photo = 'Photo',
  Video = 'Video',
  Document = 'Document',
  Audio = 'Audio',
  Archive = 'Archive',
  Other = 'Other'
}

export class ClassifierService {
  private readonly extensionMap: Map<string, FileCategory>;

  constructor() {
    this.extensionMap = new Map();
    this.initializeExtensionMappings();
  }

  /**
   * Initialize extension-to-category mappings
   * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.1.1-3.1.7
   */
  private initializeExtensionMappings(): void {
    // Photo extensions
    const photoExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif', '.bmp', '.tiff'];
    photoExtensions.forEach(ext => this.extensionMap.set(ext, FileCategory.Photo));

    // Video extensions
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'];
    videoExtensions.forEach(ext => this.extensionMap.set(ext, FileCategory.Video));

    // Document extensions
    const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
    documentExtensions.forEach(ext => this.extensionMap.set(ext, FileCategory.Document));

    // Audio extensions
    const audioExtensions = ['.mp3', '.wav', '.aac', '.flac', '.ogg'];
    audioExtensions.forEach(ext => this.extensionMap.set(ext, FileCategory.Audio));

    // Archive extensions
    const archiveExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz'];
    archiveExtensions.forEach(ext => this.extensionMap.set(ext, FileCategory.Archive));
  }

  /**
   * Classify a file based on its filename
   * Unknown extensions default to "Other" category
   * 
   * @param fileName - The name of the file to classify
   * @returns The file category
   * 
   * Requirements: 3.1.1-3.1.7
   */
  classifyFile(fileName: string): FileCategory {
    const extension = this.extractExtension(fileName);
    return this.extensionMap.get(extension) || FileCategory.Other;
  }

  /**
   * Extract file extension from filename (lowercase, with dot)
   * 
   * @param fileName - The filename to extract extension from
   * @returns The file extension in lowercase with leading dot
   */
  private extractExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
      return '';
    }
    return fileName.substring(lastDotIndex).toLowerCase();
  }

  /**
   * Get all supported extensions organized by category
   * 
   * @returns Map of categories to their supported extensions
   * 
   * Requirements: 3.1.1-3.1.6
   */
  getSupportedExtensions(): Map<FileCategory, string[]> {
    const categoryMap = new Map<FileCategory, string[]>();

    // Initialize all categories with empty arrays
    Object.values(FileCategory).forEach(category => {
      categoryMap.set(category, []);
    });

    // Group extensions by category
    this.extensionMap.forEach((category, extension) => {
      const extensions = categoryMap.get(category) || [];
      extensions.push(extension);
      categoryMap.set(category, extensions);
    });

    return categoryMap;
  }

  /**
   * Validate that MIME type is consistent with file extension
   * Flags mismatches for additional validation
   * 
   * @param fileName - The name of the file
   * @param mimeType - The MIME type reported by the client
   * @returns true if MIME type matches expected type for extension, false otherwise
   * 
   * Requirements: 3.1.8
   */
  validateMimeType(fileName: string, mimeType: string): boolean {
    const extension = this.extractExtension(fileName);
    const category = this.extensionMap.get(extension);

    // If extension is unknown, we can't validate MIME type
    if (!category) {
      return true; // Allow unknown extensions through
    }

    // Normalize MIME type to lowercase for comparison
    const normalizedMimeType = mimeType.toLowerCase();

    // Check if MIME type matches the expected category
    switch (category) {
      case FileCategory.Photo:
        return normalizedMimeType.startsWith('image/');
      
      case FileCategory.Video:
        return normalizedMimeType.startsWith('video/');
      
      case FileCategory.Audio:
        return normalizedMimeType.startsWith('audio/');
      
      case FileCategory.Document:
        // Documents have various MIME types
        return (
          normalizedMimeType.startsWith('application/pdf') ||
          normalizedMimeType.startsWith('application/msword') ||
          normalizedMimeType.startsWith('application/vnd.openxmlformats-officedocument') ||
          normalizedMimeType.startsWith('application/vnd.ms-') ||
          normalizedMimeType.startsWith('text/')
        );
      
      case FileCategory.Archive:
        // Archives have various MIME types
        return (
          normalizedMimeType.startsWith('application/zip') ||
          normalizedMimeType.startsWith('application/x-zip') ||
          normalizedMimeType.startsWith('application/x-rar') ||
          normalizedMimeType.startsWith('application/x-7z') ||
          normalizedMimeType.startsWith('application/x-tar') ||
          normalizedMimeType.startsWith('application/gzip') ||
          normalizedMimeType.startsWith('application/x-gzip')
        );
      
      default:
        return true; // For "Other" category, accept any MIME type
    }
  }
}
