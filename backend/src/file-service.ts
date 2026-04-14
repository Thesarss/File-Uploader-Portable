/**
 * FileService
 * 
 * Orchestrates the complete file upload flow:
 * 1. Receive file
 * 2. Classify file type
 * 3. Store file to disk
 * 4. Verify integrity
 * 5. Record metadata
 * 
 * Requirements: 2.1, 3.1, 6.1, 6.2, 6.3, 7.1, 7.3, 7.4
 */

import { ClassifierService, FileCategory } from './classifier-service';
import { StorageService, StorageResult } from './storage-service';
import { HistoryService } from './history-service';
import { ConfigManager } from './config-manager';

export interface UploadMetadata {
  sessionId: string;
  deviceInfo?: string;
  timestamp?: Date;
}

export interface UploadResult {
  success: boolean;
  fileName: string;
  originalName: string;
  category: FileCategory;
  storedPath: string;
  fileSize: number;
  checksum?: string;
  error?: string;
}

export interface FileInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export class FileService {
  private classifierService: ClassifierService;
  private storageService: StorageService;
  private historyService: HistoryService;
  private configManager: ConfigManager;

  constructor(
    classifierService?: ClassifierService,
    storageService?: StorageService,
    historyService?: HistoryService,
    configManager?: ConfigManager
  ) {
    this.configManager = configManager || new ConfigManager();
    this.classifierService = classifierService || new ClassifierService();
    this.storageService = storageService || new StorageService(this.configManager);
    this.historyService = historyService || new HistoryService();
  }

  /**
   * Handle single file upload with complete orchestration
   * 
   * @param file File data with buffer and metadata
   * @param metadata Upload session metadata
   * @returns Upload result with success status and details
   * 
   * Requirements: 2.1, 3.1, 7.1, 7.3, 7.4
   */
  async handleUpload(
    file: FileInput,
    metadata: UploadMetadata
  ): Promise<UploadResult> {
    try {
      // Step 1: Validate file size
      const maxFileSize = await this.configManager.getMaxFileSize();
      if (file.size > maxFileSize) {
        return {
          success: false,
          fileName: '',
          originalName: file.originalname,
          category: FileCategory.Other,
          storedPath: '',
          fileSize: file.size,
          error: `File size ${file.size} bytes exceeds maximum allowed size of ${maxFileSize} bytes`,
        };
      }

      // Step 2: Classify file
      const category = this.classifierService.classifyFile(file.originalname);
      
      // Step 3: Validate MIME type
      const mimeTypeValid = this.classifierService.validateMimeType(
        file.originalname,
        file.mimetype
      );
      
      if (!mimeTypeValid) {
        console.warn(
          `MIME type mismatch for file ${file.originalname}: ` +
          `expected type for category ${category}, got ${file.mimetype}`
        );
        // Continue with upload but log the warning
      }

      // Step 4: Store file to disk
      const storageResult: StorageResult = await this.storageService.saveFile(
        {
          buffer: file.buffer,
          originalname: file.originalname,
        },
        category
      );

      if (!storageResult.success) {
        return {
          success: false,
          fileName: '',
          originalName: file.originalname,
          category,
          storedPath: '',
          fileSize: file.size,
          error: storageResult.error || 'Storage failed',
        };
      }

      // Step 5: Record metadata to database
      try {
        await this.historyService.recordUpload({
          fileName: storageResult.finalFileName,
          originalName: file.originalname,
          fileSize: file.size,
          category,
          storedPath: storageResult.storedPath,
          mimeType: file.mimetype,
          sessionId: metadata.sessionId,
          deviceInfo: metadata.deviceInfo,
          checksum: storageResult.checksum,
        });
      } catch (error) {
        // Log error but don't fail the upload since file is already stored
        console.error(
          `Failed to record upload metadata for ${file.originalname}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
        // File is still successfully uploaded, just metadata recording failed
      }

      // Return success result
      return {
        success: true,
        fileName: storageResult.finalFileName,
        originalName: file.originalname,
        category,
        storedPath: storageResult.storedPath,
        fileSize: file.size,
        checksum: storageResult.checksum,
      };
    } catch (error) {
      // Catch any unexpected errors
      console.error(
        `Unexpected error during upload of ${file.originalname}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      return {
        success: false,
        fileName: '',
        originalName: file.originalname,
        category: FileCategory.Other,
        storedPath: '',
        fileSize: file.size,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Handle multiple file uploads with batch processing
   * Processes files sequentially, continuing on individual failures
   * 
   * @param files Array of file data
   * @param metadata Upload session metadata
   * @returns Array of upload results for each file
   * 
   * Requirements: 6.1, 6.2, 6.3
   */
  async handleMultipleUploads(
    files: FileInput[],
    metadata: UploadMetadata
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    // Process each file sequentially
    for (const file of files) {
      try {
        const result = await this.handleUpload(file, metadata);
        results.push(result);
        
        // Log individual file result
        if (result.success) {
          console.log(
            `Successfully uploaded ${result.originalName} as ${result.fileName} ` +
            `to ${result.category}/${result.fileName}`
          );
        } else {
          console.error(
            `Failed to upload ${result.originalName}: ${result.error}`
          );
        }
      } catch (error) {
        // If handleUpload throws an unexpected error, catch it and continue
        console.error(
          `Unexpected error processing ${file.originalname}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
        
        results.push({
          success: false,
          fileName: '',
          originalName: file.originalname,
          category: FileCategory.Other,
          storedPath: '',
          fileSize: file.size,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }

    // Log summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    console.log(
      `Batch upload complete: ${successCount} succeeded, ${failureCount} failed out of ${results.length} files`
    );

    return results;
  }
}

export default FileService;
