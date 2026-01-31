const knex = require('knex');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// SQLite database configuration
const dbConfig = {
  client: 'sqlite3',
  connection: {
    filename: path.join(dataDir, 'deliveryhub.db')
  },
  useNullAsDefault: true,
  pool: {
    min: 1,
    max: 1,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
};

// Create database connection
const db = knex(dbConfig);

// Test connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ SQLite database connected successfully');
  })
  .catch((err) => {
    console.error('❌ SQLite database connection failed:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Closing SQLite database connection...');
  await db.destroy();
  console.log('✅ SQLite database connection closed');
  process.exit(0);
});

module.exports = db;