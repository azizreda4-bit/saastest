#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const db = require('../src/database/sqlite');

// SQLite-compatible schema (converted from PostgreSQL)
const sqliteSchema = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    subscription_plan TEXT DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'professional', 'enterprise')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'suspended', 'cancelled')),
    subscription_expires_at DATETIME,
    settings TEXT DEFAULT '{}',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'operator' CHECK (role IN ('owner', 'admin', 'manager', 'operator', 'viewer')),
    permissions TEXT DEFAULT '[]',
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    email_verified BOOLEAN DEFAULT 0,
    email_verified_at DATETIME,
    last_login_at DATETIME,
    login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, email)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'MAD',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
    delivery_provider TEXT,
    tracking_number TEXT,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    internal_notes TEXT,
    status_history TEXT DEFAULT '[]',
    metadata TEXT DEFAULT '{}',
    source TEXT DEFAULT 'manual',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    scheduled_delivery_date DATETIME,
    delivered_at DATETIME,
    cancelled_at DATETIME,
    return_reason TEXT,
    last_status_check DATETIME,
    created_by TEXT,
    updated_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    UNIQUE(tenant_id, order_number)
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    order_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    weight DECIMAL(8,3),
    dimensions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Delivery providers table
CREATE TABLE IF NOT EXISTS delivery_providers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    api_config TEXT DEFAULT '{}',
    is_active BOOLEAN DEFAULT 1,
    supported_cities TEXT DEFAULT '[]',
    pricing_config TEXT DEFAULT '{}',
    features TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, code)
);

-- Communications table
CREATE TABLE IF NOT EXISTS communications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL,
    order_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('whatsapp', 'sms', 'email', 'call')),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    recipient TEXT NOT NULL,
    sender TEXT,
    subject TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
    external_id TEXT,
    metadata TEXT DEFAULT '{}',
    sent_at DATETIME,
    delivered_at DATETIME,
    read_at DATETIME,
    failed_reason TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Analytics metrics table
CREATE TABLE IF NOT EXISTS analytics_metrics (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT,
    timestamp DATETIME NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('hourly', 'daily', 'weekly', 'monthly')),
    metrics TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Analytics reports table
CREATE TABLE IF NOT EXISTS analytics_reports (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT,
    type TEXT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    report TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT DEFAULT '[]',
    secret TEXT,
    is_active BOOLEAN DEFAULT 1,
    last_triggered_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    webhook_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempts INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    permissions TEXT DEFAULT '[]',
    is_active BOOLEAN DEFAULT 1,
    expires_at DATETIME,
    last_used_at DATETIME,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Sessions table (for file-based sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    tenant_id TEXT,
    data TEXT NOT NULL DEFAULT '{}',
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_communications_tenant_order ON communications(tenant_id, order_id);
CREATE INDEX IF NOT EXISTS idx_analytics_tenant_timestamp ON analytics_metrics(tenant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`;

async function runSQLiteMigrations() {
  try {
    console.log('🔄 Running SQLite database migrations...');

    // Split schema into individual statements
    const statements = sqliteSchema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...`);

    for (const statement of statements) {
      try {
        await db.raw(statement);
      } catch (error) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
          console.warn('⚠️ Schema statement warning:', error.message);
        }
      }
    }

    // Insert default tenant if none exists
    const existingTenants = await db('tenants').count('* as count').first();
    if (existingTenants.count === 0) {
      console.log('Creating default tenant...');
      await db('tenants').insert({
        id: 'default-tenant-id',
        name: 'Default Company',
        domain: 'localhost',
        subscription_plan: 'professional',
        subscription_status: 'active',
        settings: JSON.stringify({
          company_name: 'Default Company',
          timezone: 'Africa/Casablanca',
          currency: 'MAD',
          language: 'fr'
        }),
        is_active: 1,
      });
      console.log('✅ Default tenant created');
    }

    console.log('✅ SQLite database schema created successfully');

    // Test connection
    await db.raw('SELECT COUNT(*) as count FROM tenants');
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
  runSQLiteMigrations();
}

module.exports = { runSQLiteMigrations };