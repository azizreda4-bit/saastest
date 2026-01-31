#!/usr/bin/env node

/**
 * Script to create initial admin user and tenant
 * Usage: node create-admin.js --email=admin@company.com --password=SecurePass123! --company="My Company"
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../backend/src/database/connection');

async function createAdmin() {
  const args = process.argv.slice(2);
  const params = {};
  
  // Parse command line arguments
  args.forEach(arg => {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) {
      params[key.substring(2)] = value?.replace(/"/g, '');
    }
  });

  const { email, password, company, firstName = 'Admin', lastName = 'User' } = params;

  if (!email || !password || !company) {
    console.log('❌ Missing required parameters');
    console.log('Usage: node create-admin.js --email=admin@company.com --password=SecurePass123! --company="My Company"');
    console.log('');
    console.log('Optional parameters:');
    console.log('  --firstName="John"');
    console.log('  --lastName="Doe"');
    process.exit(1);
  }

  try {
    console.log('🚀 Creating admin user and tenant...');

    // Check if user already exists
    const existingUser = await db('users').where('email', email).first();
    if (existingUser) {
      console.log('❌ User with this email already exists');
      process.exit(1);
    }

    // Generate tenant slug
    const tenantSlug = company
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if tenant slug is available
    const existingTenant = await db('tenants').where('slug', tenantSlug).first();
    if (existingTenant) {
      console.log('❌ A company with this name already exists');
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create tenant and user in transaction
    const result = await db.transaction(async (trx) => {
      // Create tenant
      const tenantId = uuidv4();
      await trx('tenants').insert({
        id: tenantId,
        name: company,
        slug: tenantSlug,
        subscription_plan: 'professional', // Give admin a good plan
        subscription_status: 'active',
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        max_orders_per_month: 10000,
        max_users: 20,
        max_delivery_providers: 25,
        max_api_calls_per_day: 50000,
      });

      // Create admin user
      const userId = uuidv4();
      await trx('users').insert({
        id: userId,
        tenant_id: tenantId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role: 'owner',
        is_active: true,
        email_verified_at: new Date(),
      });

      return { tenantId, userId };
    });

    console.log('✅ Admin user and tenant created successfully!');
    console.log('');
    console.log('📋 Details:');
    console.log(`   Tenant ID: ${result.tenantId}`);
    console.log(`   User ID: ${result.userId}`);
    console.log(`   Email: ${email}`);
    console.log(`   Company: ${company}`);
    console.log(`   Slug: ${tenantSlug}`);
    console.log('');
    console.log('🔗 Login URL: http://localhost:3001/auth/login');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Login to the platform');
    console.log('   2. Configure delivery providers');
    console.log('   3. Import your existing data');
    console.log('   4. Invite team members');

    process.exit(0);

  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    process.exit(1);
  }
}

// Run the script
createAdmin();