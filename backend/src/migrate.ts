import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import db from './db';

/**
 * Run database migrations
 * Executes all SQL migration files in the migrations directory
 */
async function runMigrations(): Promise<void> {
  const migrationsDir = join(__dirname, '..', 'migrations');
  
  try {
    console.log('Starting database migrations...');
    
    // Get all SQL files in migrations directory
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Execute in alphabetical order
    
    if (files.length === 0) {
      console.log('No migration files found');
      return;
    }
    
    // Execute each migration file
    for (const file of files) {
      const filePath = join(migrationsDir, file);
      console.log(`Running migration: ${file}`);
      
      const sql = readFileSync(filePath, 'utf-8');
      await db.query(sql);
      
      console.log(`✓ Completed migration: ${file}`);
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await db.closePool();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

export default runMigrations;
