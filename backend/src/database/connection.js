const knex = require('knex');
const config = require('../config');

// Database configuration
const dbConfig = {
  client: 'postgresql',
  connection: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.username,
    password: config.database.password,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: config.database.pool.min,
    max: config.database.pool.max,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
  acquireConnectionTimeout: 60000,
  asyncStackTraces: process.env.NODE_ENV === 'development',
};

// Create database connection
const db = knex(dbConfig);

// Test connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Closing database connection...');
  await db.destroy();
  console.log('✅ Database connection closed');
  process.exit(0);
});

module.exports = db;