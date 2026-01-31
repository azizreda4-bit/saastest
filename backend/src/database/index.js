const db = require('./connection');
const fs = require('fs');
const path = require('path');

/**
 * Initialize database with schema
 */
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');

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
        console.warn('⚠️ Schema file not found, skipping schema creation');
      }
    } else {
      console.log(`✅ Database already initialized with ${tablesResult.rows.length} tables`);
    }

    // Test connection
    await db.raw('SELECT NOW()');
    console.log('✅ Database connection verified');

    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  try {
    await db.destroy();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth() {
  try {
    await db.raw('SELECT 1');
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    };
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  try {
    const stats = await db.raw(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples
      FROM pg_stat_user_tables
      ORDER BY tablename
    `);

    return stats.rows;
  } catch (error) {
    console.error('Error getting database stats:', error);
    return [];
  }
}

module.exports = {
  db,
  initializeDatabase,
  closeDatabase,
  checkDatabaseHealth,
  getDatabaseStats,
};