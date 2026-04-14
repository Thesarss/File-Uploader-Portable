/**
 * StorageService
 * 
 * Manages file storage to disk with category-based organization.
 * Handles folder creation, storage space verification, and file saving.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { FileCategory } from './classifier-service';
import { ConfigManager } from './config-manager';

export interface StorageResult {
  success: boolean;
  storedPath: string;
  finalFileName: string;
  checksum?: string;
  error?: string;
}

export class StorageService {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * Save file to disk in the appropriate category folder
   * 
   * @param file - The file buffer and metadata
   * @param category - The file category for organization
   * @returns StorageResult with success status and stored path
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.2.1-3.2.7, 3.4
   */
  async saveFile(
    file: { buffer: Buffer; originalname: string },
    category: FileCategory
  ): Promise<StorageResult> {
    try {
      // Verify storage space before saving
      const hasSpace = await this.verifyStorageSpace(file.buffer.length);
      if (!hasSpace) {
        return {
          success: false,
          storedPath: '',
          finalFileName: '',
          error: 'Insufficient disk space',
        };
      }

      // Calculate checksum of original file
      const originalChecksum = this.calculateChecksum(file.buffer);

      // Ensure category folder exists
      const categoryFolder = await this.ensureCategoryFolder(category);

      // Resolve filename conflicts
      const finalFileName = await this.resolveFileNameConflict(
        categoryFolder,
        file.originalname
      );
      const filePath = path.join(categoryFolder, finalFileName);

      // Write file to disk
      await fs.writeFile(filePath, file.buffer);

      // Verify file integrity after writing
      const integrityValid = await this.verifyFileIntegrity(filePath, originalChecksum);
      if (!integrityValid) {
        // Delete the corrupted file
        await fs.unlink(filePath);
        return {
          success: false,
          storedPath: '',
          finalFileName: '',
          error: 'File integrity verification failed',
        };
      }

      // Set file permissions after successful write and verification
      await this.setFilePermissions(filePath);

      // Return relative path from target folder
      const targetFolder = await this.configManager.getTargetFolder();
      const relativePath = path.relative(targetFolder, filePath);

      return {
        success: true,
        storedPath: relativePath,
        finalFileName,
        checksum: originalChecksum,
      };
    } catch (error) {
      return {
        success: false,
        storedPath: '',
        finalFileName: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Ensure category subfolder exists, create if it doesn't
   * 
   * @param category - The file category
   * @returns Full path to the category folder
   * 
   * Requirements: 3.2.8
   */
  async ensureCategoryFolder(category: FileCategory): Promise<string> {
    const targetFolder = await this.configManager.getTargetFolder();
    
    // Map category to folder name
    const folderName = this.getCategoryFolderName(category);
    const categoryPath = path.join(targetFolder, folderName);

    // Create folder if it doesn't exist (recursive: true creates parent folders too)
    await fs.mkdir(categoryPath, { recursive: true });

    return categoryPath;
  }

  /**
   * Resolve filename conflicts by appending numeric suffix
   * 
   * @param targetPath - The directory where the file will be saved
   * @param fileName - The original filename
   * @returns Final filename with suffix if needed
   * 
   * Requirements: 3.2, 3.3
   */
  async resolveFileNameConflict(
    targetPath: string,
    fileName: string
  ): Promise<string> {
    const filePath = path.join(targetPath, fileName);
    
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // File exists, need to find next available suffix
      const ext = path.extname(fileName);
      const nameWithoutExt = path.basename(fileName, ext);
      
      let suffix = 1;
      let newFileName = `${nameWithoutExt}_${suffix}${ext}`;
      let newFilePath = path.join(targetPath, newFileName);
      
      // Keep incrementing suffix until we find an available name
      while (true) {
        try {
          await fs.access(newFilePath);
          // File exists, try next suffix
          suffix++;
          newFileName = `${nameWithoutExt}_${suffix}${ext}`;
          newFilePath = path.join(targetPath, newFileName);
        } catch {
          // File doesn't exist, this name is available
          return newFileName;
        }
      }
    } catch {
      // File doesn't exist, use original name
      return fileName;
    }
  }

  /**
   * Map FileCategory enum to folder name
   * 
   * @param category - The file category
   * @returns Folder name for the category
   * 
   * Requirements: 3.2.1-3.2.7
   */
  private getCategoryFolderName(category: FileCategory): string {
    switch (category) {
      case FileCategory.Photo:
        return 'Photos';
      case FileCategory.Video:
        return 'Videos';
      case FileCategory.Document:
        return 'Documents';
      case FileCategory.Audio:
        return 'Audio';
      case FileCategory.Archive:
        return 'Archives';
      case FileCategory.Other:
        return 'Others';
      default:
        return 'Others';
    }
  }

  /**
   * Verify sufficient storage space is available
   * 
   * @param fileSize - Size of file to be saved in bytes
   * @returns true if sufficient space available, false otherwise
   * 
   * Requirements: 4.2, 4.3
   */
  async verifyStorageSpace(fileSize: number): Promise<boolean> {
    try {
      const targetFolder = await this.configManager.getTargetFolder();
      
      // Get file system stats
      const stats = await fs.statfs(targetFolder);
      
      // Calculate available space (block size * available blocks)
      const availableSpace = stats.bavail * stats.bsize;
      
      // Require at least 100MB buffer beyond the file size
      const requiredSpace = fileSize + (100 * 1024 * 1024);
      
      return availableSpace >= requiredSpace;
    } catch (error) {
      // If we can't check space, log warning but allow the operation
      console.warn('Failed to verify storage space:', error);
      return true;
    }
  }

  /**
   * Calculate SHA-256 checksum of a file buffer
   * 
   * @param buffer - The file buffer
   * @returns Hexadecimal checksum string
   * 
   * Requirements: 3.4
   */
  calculateChecksum(buffer: Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex');
  }

  /**
   * Verify file integrity by comparing checksums
   * 
   * @param filePath - Path to the stored file
   * @param expectedChecksum - Expected SHA-256 checksum
   * @returns true if checksums match, false otherwise
   * 
   * Requirements: 3.4
   */
  async verifyFileIntegrity(filePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      // Read the stored file
      const storedBuffer = await fs.readFile(filePath);
      
      // Calculate checksum of stored file
      const storedChecksum = this.calculateChecksum(storedBuffer);
      
      // Compare checksums
      return storedChecksum === expectedChecksum;
    } catch (error) {
      console.error('Failed to verify file integrity:', error);
      return false;
    }
  }

  /**
   * Set file permissions on saved file
   * 
   * @param filePath - Path to the file
   * @returns Promise that resolves when permissions are set
   * 
   * Requirements: 3.5
   */
  private async setFilePermissions(filePath: string): Promise<void> {
    try {
      // Set file permissions to 0o644 (owner: read/write, group/others: read-only)
      await fs.chmod(filePath, 0o644);
    } catch (error) {
      // Log error but don't fail the entire operation
      console.error('Failed to set file permissions:', error);
      // Permission setting is not critical - file is already saved successfully
    }
  }
}
