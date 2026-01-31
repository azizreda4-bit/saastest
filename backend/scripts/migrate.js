#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const db = require('../src/database/connection');

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');

    // Check if database exists and has tables
    const tablesResult = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    if (tablesResult.rows.length === 0) {
      console.log('📋 No tables found, creating database schema...');
      
      // Read and execute schema file
      const schemaPath = path.join(__dirname, '../../database-schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = schema
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        console.log(`Executing ${statements.length} SQL statements...`);

        for (const statement of statements) {
          try {
            await db.raw(statement);
          } catch (error) {
            // Ignore "already exists" errors
            if (!error.message.includes('already exists')) {
              console.warn('⚠️ Schema statement warning:', error.message);
            }
          }
        }
        
        console.log('✅ Database schema created successfully');
      } else {
        console.error('❌ Schema file not found at:', schemaPath);
        process.exit(1);
      }
    } else {
      console.log(`✅ Database already initialized with ${tablesResult.rows.length} tables`);
    }

    // Test connection
    await db.raw('SELECT NOW()');
    console.log('✅ Database migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };