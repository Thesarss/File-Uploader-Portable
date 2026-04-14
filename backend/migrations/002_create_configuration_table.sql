-- Migration: Create configuration table
-- Description: Creates the configuration table to store application settings
-- Requirements: 4.1

-- Create configuration table
CREATE TABLE IF NOT EXISTS configuration (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE configuration IS 'Stores application configuration settings';
COMMENT ON COLUMN configuration.key IS 'Configuration key (unique identifier)';
COMMENT ON COLUMN configuration.value IS 'Configuration value';
COMMENT ON COLUMN configuration.description IS 'Human-readable description of the configuration setting';
COMMENT ON COLUMN configuration.updated_at IS 'Timestamp when the configuration was last updated';

-- Insert initial configuration values
INSERT INTO configuration (key, value, description) VALUES
  ('target_folder', '/uploads', 'Base path for file storage'),
  ('max_file_size', '524288000', 'Maximum file size in bytes (default: 500MB)'),
  ('concurrent_upload_limit', '3', 'Maximum number of concurrent uploads allowed')
ON CONFLICT (key) DO NOTHING;
