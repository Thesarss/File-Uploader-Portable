import db from './db';

describe('Database Migration - configuration table', () => {
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

  it('should have configuration table created', async () => {
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'configuration'
    `);
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].table_name).toBe('configuration');
  });

  it('should have all required columns in configuration table', async () => {
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'configuration'
      ORDER BY ordinal_position
    `);
    
    const columns = result.rows.map(row => row.column_name);
    
    expect(columns).toContain('key');
    expect(columns).toContain('value');
    expect(columns).toContain('description');
    expect(columns).toContain('updated_at');
  });

  it('should have correct data types for columns', async () => {
    const result = await db.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'configuration'
    `);
    
    const columnInfo = result.rows.reduce((acc, row) => {
      acc[row.column_name] = {
        type: row.data_type,
        maxLength: row.character_maximum_length
      };
      return acc;
    }, {} as Record<string, { type: string; maxLength: number | null }>);
    
    expect(columnInfo.key.type).toBe('character varying');
    expect(columnInfo.key.maxLength).toBe(100);
    expect(columnInfo.value.type).toBe('text');
    expect(columnInfo.description.type).toBe('text');
    expect(columnInfo.updated_at.type).toBe('timestamp without time zone');
  });

  it('should have key as primary key', async () => {
    const result = await db.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'configuration'
      AND constraint_type = 'PRIMARY KEY'
    `);
    
    expect(result.rows.length).toBe(1);
  });

  it('should have initial configuration values inserted', async () => {
    const result = await db.query(`
      SELECT key, value, description
      FROM configuration
      ORDER BY key
    `);
    
    expect(result.rows.length).toBeGreaterThanOrEqual(3);
    
    const configKeys = result.rows.map(row => row.key);
    expect(configKeys).toContain('target_folder');
    expect(configKeys).toContain('max_file_size');
    expect(configKeys).toContain('concurrent_upload_limit');
  });

  it('should have correct initial values for target_folder', async () => {
    const result = await db.query(`
      SELECT value, description
      FROM configuration
      WHERE key = 'target_folder'
    `);
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].value).toBe('/uploads');
    expect(result.rows[0].description).toBe('Base path for file storage');
  });

  it('should have correct initial values for max_file_size', async () => {
    const result = await db.query(`
      SELECT value, description
      FROM configuration
      WHERE key = 'max_file_size'
    `);
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].value).toBe('524288000');
    expect(result.rows[0].description).toBe('Maximum file size in bytes (default: 500MB)');
  });

  it('should have correct initial values for concurrent_upload_limit', async () => {
    const result = await db.query(`
      SELECT value, description
      FROM configuration
      WHERE key = 'concurrent_upload_limit'
    `);
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].value).toBe('3');
    expect(result.rows[0].description).toBe('Maximum number of concurrent uploads allowed');
  });

  it('should be able to update configuration values', async () => {
    const testKey = 'test_config_key_' + Date.now();
    const testValue = 'test_value';
    const testDescription = 'Test configuration';

    // Insert test config
    await db.query(`
      INSERT INTO configuration (key, value, description)
      VALUES ($1, $2, $3)
    `, [testKey, testValue, testDescription]);

    // Update the value
    const newValue = 'updated_value';
    await db.query(`
      UPDATE configuration
      SET value = $1, updated_at = NOW()
      WHERE key = $2
    `, [newValue, testKey]);

    // Verify update
    const result = await db.query(`
      SELECT value
      FROM configuration
      WHERE key = $1
    `, [testKey]);

    expect(result.rows[0].value).toBe(newValue);

    // Clean up
    await db.query('DELETE FROM configuration WHERE key = $1', [testKey]);
  });

  it('should auto-set updated_at timestamp on insert', async () => {
    const testKey = 'test_timestamp_key_' + Date.now();
    
    const insertResult = await db.query(`
      INSERT INTO configuration (key, value, description)
      VALUES ($1, $2, $3)
      RETURNING updated_at
    `, [testKey, 'test', 'Test timestamp']);

    const updatedAt = new Date(insertResult.rows[0].updated_at);
    const now = new Date();

    // Check that timestamp is within reasonable range (allow for timezone differences)
    const timeDiff = Math.abs(now.getTime() - updatedAt.getTime());
    expect(timeDiff).toBeLessThan(24 * 60 * 60 * 1000); // Within 24 hours

    // Clean up
    await db.query('DELETE FROM configuration WHERE key = $1', [testKey]);
  });

  it('should prevent duplicate keys', async () => {
    const testKey = 'duplicate_test_key_' + Date.now();
    
    // Insert first record
    await db.query(`
      INSERT INTO configuration (key, value, description)
      VALUES ($1, $2, $3)
    `, [testKey, 'value1', 'First insert']);

    // Try to insert duplicate key
    await expect(
      db.query(`
        INSERT INTO configuration (key, value, description)
        VALUES ($1, $2, $3)
      `, [testKey, 'value2', 'Duplicate insert'])
    ).rejects.toThrow();

    // Clean up
    await db.query('DELETE FROM configuration WHERE key = $1', [testKey]);
  });
});
