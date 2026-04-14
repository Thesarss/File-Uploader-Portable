import { query } from './db';
import { QueryResult } from 'pg';

/**
 * File category enum matching the classification system
 */
export enum FileCategory {
  Photo = 'Photo',
  Video = 'Video',
  Document = 'Document',
  Audio = 'Audio',
  Archive = 'Archive',
  Other = 'Other'
}

/**
 * Upload record structure matching the database schema
 */
export interface UploadRecord {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  category: FileCategory;
  storedPath: string;
  mimeType: string;
  uploadedAt: Date;
  sessionId: string;
  deviceInfo?: string;
  checksum?: string;
}

/**
 * Input data for creating a new upload record
 */
export interface UploadRecordInput {
  fileName: string;
  originalName: string;
  fileSize: number;
  category: FileCategory;
  storedPath: string;
  mimeType: string;
  sessionId: string;
  deviceInfo?: string;
  checksum?: string;
}

/**
 * FileRepository handles database operations for upload records
 * Uses parameterized queries to prevent SQL injection
 */
export class FileRepository {
  /**
   * Insert a new upload record into the database
   * @param record Upload record data
   * @returns The created upload record with generated ID
   */
  async insertUploadRecord(record: UploadRecordInput): Promise<UploadRecord> {
    const sql = `
      INSERT INTO uploads (
        file_name, 
        original_name, 
        file_size, 
        category, 
        stored_path, 
        mime_type, 
        session_id, 
        device_info, 
        checksum
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, 
        file_name as "fileName", 
        original_name as "originalName", 
        file_size as "fileSize", 
        category, 
        stored_path as "storedPath", 
        mime_type as "mimeType", 
        uploaded_at as "uploadedAt", 
        session_id as "sessionId", 
        device_info as "deviceInfo", 
        checksum
    `;

    const params = [
      record.fileName,
      record.originalName,
      record.fileSize,
      record.category,
      record.storedPath,
      record.mimeType,
      record.sessionId,
      record.deviceInfo || null,
      record.checksum || null
    ];

    try {
      const result: QueryResult = await query(sql, params);
      const row = result.rows[0];
      // Convert fileSize from string to number (PostgreSQL bigint returns as string)
      return {
        ...row,
        fileSize: parseInt(row.fileSize, 10)
      } as UploadRecord;
    } catch (error) {
      console.error('Error inserting upload record:', error);
      throw new Error(`Failed to insert upload record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all uploads for a specific session
   * @param sessionId Session identifier
   * @returns Array of upload records for the session
   */
  async getUploadsBySession(sessionId: string): Promise<UploadRecord[]> {
    const sql = `
      SELECT 
        id, 
        file_name as "fileName", 
        original_name as "originalName", 
        file_size as "fileSize", 
        category, 
        stored_path as "storedPath", 
        mime_type as "mimeType", 
        uploaded_at as "uploadedAt", 
        session_id as "sessionId", 
        device_info as "deviceInfo", 
        checksum
      FROM uploads
      WHERE session_id = $1
      ORDER BY uploaded_at DESC
    `;

    try {
      const result: QueryResult = await query(sql, [sessionId]);
      // Convert fileSize from string to number (PostgreSQL bigint returns as string)
      return result.rows.map(row => ({
        ...row,
        fileSize: parseInt(row.fileSize, 10)
      })) as UploadRecord[];
    } catch (error) {
      console.error('Error fetching uploads by session:', error);
      throw new Error(`Failed to fetch uploads by session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get recent uploads with optional limit
   * @param limit Maximum number of records to return (default: 50)
   * @returns Array of recent upload records
   */
  async getRecentUploads(limit: number = 50): Promise<UploadRecord[]> {
    const sql = `
      SELECT 
        id, 
        file_name as "fileName", 
        original_name as "originalName", 
        file_size as "fileSize", 
        category, 
        stored_path as "storedPath", 
        mime_type as "mimeType", 
        uploaded_at as "uploadedAt", 
        session_id as "sessionId", 
        device_info as "deviceInfo", 
        checksum
      FROM uploads
      ORDER BY uploaded_at DESC
      LIMIT $1
    `;

    try {
      const result: QueryResult = await query(sql, [limit]);
      // Convert fileSize from string to number (PostgreSQL bigint returns as string)
      return result.rows.map(row => ({
        ...row,
        fileSize: parseInt(row.fileSize, 10)
      })) as UploadRecord[];
    } catch (error) {
      console.error('Error fetching recent uploads:', error);
      throw new Error(`Failed to fetch recent uploads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default FileRepository;
