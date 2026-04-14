-- Migration: Create uploads table
-- Description: Creates the uploads table to store metadata for all uploaded files
-- Requirements: 8.1, 8.4, 11.6

-- Create uploads table
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  category VARCHAR(50) NOT NULL,
  stored_path TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  session_id VARCHAR(100) NOT NULL,
  device_info TEXT,
  checksum VARCHAR(64)
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_uploads_session_id ON uploads(session_id);
CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_at ON uploads(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_uploads_category ON uploads(category);

-- Add comments for documentation
COMMENT ON TABLE uploads IS 'Stores metadata for all uploaded files';
COMMENT ON COLUMN uploads.id IS 'Unique identifier for the upload record';
COMMENT ON COLUMN uploads.file_name IS 'Final filename stored on disk (may include conflict resolution suffix)';
COMMENT ON COLUMN uploads.original_name IS 'Original filename from the client';
COMMENT ON COLUMN uploads.file_size IS 'File size in bytes';
COMMENT ON COLUMN uploads.category IS 'File category: Photo, Video, Document, Audio, Archive, or Other';
COMMENT ON COLUMN uploads.stored_path IS 'Full path where the file is stored on disk';
COMMENT ON COLUMN uploads.mime_type IS 'MIME type of the uploaded file';
COMMENT ON COLUMN uploads.uploaded_at IS 'Timestamp when the file was uploaded';
COMMENT ON COLUMN uploads.session_id IS 'Session identifier for grouping uploads';
COMMENT ON COLUMN uploads.device_info IS 'Information about the client device (browser, OS, etc.)';
COMMENT ON COLUMN uploads.checksum IS 'SHA-256 checksum for file integrity verification';
