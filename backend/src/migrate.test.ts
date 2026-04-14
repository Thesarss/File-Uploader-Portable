import db from './db';

describe('Database Migration - uploads table', () => {
  beforeAll(async () => {
    // Ensure database connection is ready
    const isHealthy = await db.checkHealth();
    if (!isHealthy) {
      throw new Error('Database connection is not healthy');
    }
  });

  afterAll(async () => {
    await db.closePool();
  });

  it('should have uploads table created', async () => {
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'uploads'
    `);
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].table_name).toBe('uploads');
  });

  it('should have all required columns in uploads table', async () => {
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'uploads'
      ORDER BY ordinal_position
    `);
    
    const columns = result.rows.map(row => row.column_name);
    
    expect(columns).toContain('id');
    expect(columns).toContain('file_name');
    expect(columns).toContain('original_name');
    expect(columns).toContain('file_size');
    expect(columns).toContain('category');
    expect(columns).toContain('stored_path');
    expect(columns).toContain('mime_type');
    expect(columns).toContain('uploaded_at');
    expect(columns).toContain('session_id');
    expect(columns).toContain('device_info');
    expect(columns).toContain('checksum');
  });

  it('should have correct data types for key columns', async () => {
    const result = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'uploads'
    `);
    
    const columnTypes = result.rows.reduce((acc, row) => {
      acc[row.column_name] = row.data_type;
      return acc;
    }, {} as Record<string, string>);
    
    expect(columnTypes.id).toBe('uuid');
    expect(columnTypes.file_size).toBe('bigint');
    expect(columnTypes.uploaded_at).toBe('timestamp without time zone');
  });

  it('should have index on session_id column', async () => {
    const result = await db.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'uploads'
      AND indexname = 'idx_uploads_session_id'
    `);
    
    expect(result.rows.length).toBe(1);
  });

  it('should have index on uploaded_at column', async () => {
    const result = await db.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'uploads'
      AND indexname = 'idx_uploads_uploaded_at'
    `);
    
    expect(result.rows.length).toBe(1);
  });

  it('should have index on category column', async () => {
    const result = await db.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'uploads'
      AND indexname = 'idx_uploads_category'
    `);
    
    expect(result.rows.length).toBe(1);
  });

  it('should be able to insert a record into uploads table', async () => {
    const testRecord = {
      file_name: 'test.jpg',
      original_name: 'test.jpg',
      file_size: 1024,
      category: 'Photo',
      stored_path: '/uploads/Photos/test.jpg',
      mime_type: 'image/jpeg',
      session_id: 'test-session-123',
      device_info: 'Jest Test',
      checksum: 'abc123'
    };

    const insertResult = await db.query(`
      INSERT INTO uploads (
        file_name, original_name, file_size, category, 
        stored_path, mime_type, session_id, device_info, checksum
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      testRecord.file_name,
      testRecord.original_name,
      testRecord.file_size,
      testRecord.category,
      testRecord.stored_path,
      testRecord.mime_type,
      testRecord.session_id,
      testRecord.device_info,
      testRecord.checksum
    ]);

    expect(insertResult.rows.length).toBe(1);
    expect(insertResult.rows[0].id).toBeDefined();

    // Clean up
    await db.query('DELETE FROM uploads WHERE session_id = $1', [testRecord.session_id]);
  });

  it('should auto-generate UUID for id column', async () => {
    const insertResult = await db.query(`
      INSERT INTO uploads (
        file_name, original_name, file_size, category, 
        stored_path, mime_type, session_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, ['test2.jpg', 'test2.jpg', 2048, 'Photo', '/uploads/Photos/test2.jpg', 'image/jpeg', 'test-session-456']);

    const id = insertResult.rows[0].id;
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Clean up
    await db.query('DELETE FROM uploads WHERE id = $1', [id]);
  });

  it('should auto-set uploaded_at timestamp', async () => {
    
    const insertResult = await db.query(`
      INSERT INTO uploads (
        file_name, original_name, file_size, category, 
        stored_path, mime_type, session_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, uploaded_at
    `, ['test3.jpg', 'test3.jpg', 3072, 'Photo', '/uploads/Photos/test3.jpg', 'image/jpeg', 'test-session-789']);

    const uploadedAt = new Date(insertResult.rows[0].uploaded_at);
    const now = new Date();

    // Check that timestamp is within reasonable range (allow for timezone differences)
    const timeDiff = Math.abs(now.getTime() - uploadedAt.getTime());
    expect(timeDiff).toBeLessThan(24 * 60 * 60 * 1000); // Within 24 hours

    // Clean up
    await db.query('DELETE FROM uploads WHERE id = $1', [insertResult.rows[0].id]);
  });
});
