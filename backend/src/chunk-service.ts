/**
 * ChunkService
 * 
 * Handles chunked file uploads for large files
 * - Receives file chunks
 * - Stores chunks temporarily
 * - Assembles chunks into complete file
 * - Cleans up temporary files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface ChunkMetadata {
  uploadId: string;
  fileName: string;
  chunkIndex: number;
  totalChunks: number;
  fileSize: number;
  mimeType: string;
}

export interface ChunkUploadResult {
  success: boolean;
  uploadId: string;
  chunkIndex: number;
  receivedChunks: number;
  totalChunks: number;
  isComplete: boolean;
  finalFilePath?: string;
  error?: string;
}

export class ChunkService {
  private tempDir: string;
  private uploadTracking: Map<string, Set<number>>;

  constructor(tempDir: string = './temp-chunks') {
    this.tempDir = tempDir;
    this.uploadTracking = new Map();
  }

  /**
   * Initialize chunk service - create temp directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Generate unique upload ID
   */
  generateUploadId(fileName: string, fileSize: number): string {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5')
      .update(`${fileName}-${fileSize}-${timestamp}`)
      .digest('hex');
    return hash;
  }

  /**
   * Save chunk to temporary storage
   */
  async saveChunk(
    chunk: Buffer,
    metadata: ChunkMetadata
  ): Promise<ChunkUploadResult> {
    try {
      const { uploadId, chunkIndex, totalChunks, fileName } = metadata;

      // Create upload directory
      const uploadDir = path.join(this.tempDir, uploadId);
      await fs.mkdir(uploadDir, { recursive: true });

      // Save chunk
      const chunkPath = path.join(uploadDir, `chunk-${chunkIndex}`);
      await fs.writeFile(chunkPath, chunk);

      // Track received chunks
      if (!this.uploadTracking.has(uploadId)) {
        this.uploadTracking.set(uploadId, new Set());
      }
      this.uploadTracking.get(uploadId)!.add(chunkIndex);

      const receivedChunks = this.uploadTracking.get(uploadId)!.size;
      const isComplete = receivedChunks === totalChunks;

      // If all chunks received, assemble file
      if (isComplete) {
        const finalFilePath = await this.assembleChunks(uploadId, fileName, totalChunks);
        
        // Cleanup
        await this.cleanup(uploadId);
        this.uploadTracking.delete(uploadId);

        return {
          success: true,
          uploadId,
          chunkIndex,
          receivedChunks,
          totalChunks,
          isComplete: true,
          finalFilePath,
        };
      }

      return {
        success: true,
        uploadId,
        chunkIndex,
        receivedChunks,
        totalChunks,
        isComplete: false,
      };
    } catch (error) {
      return {
        success: false,
        uploadId: metadata.uploadId,
        chunkIndex: metadata.chunkIndex,
        receivedChunks: 0,
        totalChunks: metadata.totalChunks,
        isComplete: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Assemble all chunks into final file
   */
  private async assembleChunks(
    uploadId: string,
    fileName: string,
    totalChunks: number
  ): Promise<string> {
    const uploadDir = path.join(this.tempDir, uploadId);
    const finalPath = path.join(this.tempDir, `${uploadId}-${fileName}`);

    // Create write stream for final file
    const writeStream = await fs.open(finalPath, 'w');

    try {
      // Read and write chunks in order
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(uploadDir, `chunk-${i}`);
        const chunkData = await fs.readFile(chunkPath);
        await writeStream.write(chunkData);
      }

      return finalPath;
    } finally {
      await writeStream.close();
    }
  }

  /**
   * Cleanup temporary chunk files
   */
  private async cleanup(uploadId: string): Promise<void> {
    try {
      const uploadDir = path.join(this.tempDir, uploadId);
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to cleanup chunks for ${uploadId}:`, error);
    }
  }

  /**
   * Get upload progress
   */
  getProgress(uploadId: string): { received: number; total: number } | null {
    const chunks = this.uploadTracking.get(uploadId);
    if (!chunks) {
      return null;
    }
    return { received: chunks.size, total: 0 }; // Total will be known from metadata
  }

  /**
   * Cancel upload and cleanup
   */
  async cancelUpload(uploadId: string): Promise<void> {
    await this.cleanup(uploadId);
    this.uploadTracking.delete(uploadId);
  }
}

export const chunkService = new ChunkService();
