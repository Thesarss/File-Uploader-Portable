/**
 * Database Setup Script
 * 
 * This script creates the database and runs migrations.
 * Run with: node setup-database.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');

  // Connect to postgres database to create our database
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Connect to default postgres database
    user: process.env.DB_USER || 'uploader',
    password: process.env.DB_PASSWORD || 'uploader123',
  });

  try {
    // Check if database exists
    const dbName = process.env.DB_NAME || 'file_uploader';
    const checkDb = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkDb.rows.length === 0) {
      console.log(`📦 Creating database: ${dbName}`);
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log('✅ Database created successfully\n');
    } else {
      console.log(`✅ Database ${dbName} already exists\n`);
    }

    await adminPool.end();

    // Connect to our database to run migrations
    const appPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: dbName,
      user: process.env.DB_USER || 'uploader',
      password: process.env.DB_PASSWORD || 'uploader123',
    });

    // Run migrations
    console.log('📝 Running migrations...\n');

    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      console.log(`   Running: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await appPool.query(sql);
      console.log(`   ✅ ${file} completed`);
    }

    console.log('\n✅ All migrations completed successfully');

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const tables = await appPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('   Tables created:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    await appPool.end();

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📌 Connection details:');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.DB_PORT || 5432}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   User: ${process.env.DB_USER || 'uploader'}`);

  } catch (error) {
    console.error('\n❌ Error setting up database:', error.message);
    process.exit(1);
  }
}

setupDatabase();
