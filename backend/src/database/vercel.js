// Vercel Postgres connection
const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 1, // Vercel serverless limitation
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

// Simple query function for Vercel
async function query(text, params) {
  const client = getPool();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Initialize database with basic tables for demo
async function initializeVercelDB() {
  try {
    // Create basic tables if they don't exist
    await query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE,
        subscription_plan VARCHAR(50) DEFAULT 'starter',
        subscription_status VARCHAR(50) DEFAULT 'active',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'operator',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, email)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        order_number VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        total_amount DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        delivery_provider VARCHAR(100),
        tracking_number VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, order_number)
      )
    `);

    // Insert demo data if tables are empty
    const tenantCount = await query('SELECT COUNT(*) FROM tenants');
    if (parseInt(tenantCount.rows[0].count) === 0) {
      // Insert demo tenant
      const tenantResult = await query(`
        INSERT INTO tenants (name, domain, subscription_plan)
        VALUES ('Demo Company', 'demo.deliveryhub.ma', 'professional')
        RETURNING id
      `);
      
      const tenantId = tenantResult.rows[0].id;

      // Insert demo user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      
      await query(`
        INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
        VALUES ($1, 'admin@test.com', $2, 'Admin', 'User', 'admin')
      `, [tenantId, hashedPassword]);

      // Insert demo orders
      await query(`
        INSERT INTO orders (tenant_id, order_number, customer_name, customer_phone, customer_address, city, total_amount, status)
        VALUES 
        ($1, 'ORD-001', 'Ahmed Benali', '+212600123456', '123 Rue Mohammed V', 'Casablanca', 299.99, 'pending'),
        ($1, 'ORD-002', 'Fatima Zahra', '+212600789012', '456 Avenue Hassan II', 'Rabat', 150.00, 'delivered'),
        ($1, 'ORD-003', 'Youssef Alami', '+212600345678', '789 Boulevard Zerktouni', 'Marrakech', 75.50, 'shipped')
      `, [tenantId]);
    }

    console.log('✅ Vercel database initialized');
  } catch (error) {
    console.error('❌ Vercel database initialization failed:', error);
  }
}

module.exports = {
  query,
  initializeVercelDB,
  getPool
};