#!/usr/bin/env node

/**
 * Migration script to import data from Google Sheets to DeliveryHub
 * This script helps migrate your existing Google Apps Script data
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');

// Database connection
const db = require('../backend/src/database/connection');

// Migration configuration
const MIGRATION_CONFIG = {
  batchSize: 100,
  skipDuplicates: true,
  createMissingCustomers: true,
  createMissingProducts: true,
  defaultTenantId: null, // Will be set during migration
};

class SheetsMigrator {
  constructor() {
    this.stats = {
      orders: { processed: 0, created: 0, skipped: 0, errors: 0 },
      customers: { processed: 0, created: 0, skipped: 0, errors: 0 },
      products: { processed: 0, created: 0, skipped: 0, errors: 0 },
    };
  }

  async migrate(csvFilePath, tenantId) {
    console.log('🚀 Starting migration from Google Sheets...');
    console.log(`📁 CSV File: ${csvFilePath}`);
    console.log(`🏢 Tenant ID: ${tenantId}`);
    
    MIGRATION_CONFIG.defaultTenantId = tenantId;

    try {
      // Verify tenant exists
      const tenant = await db('tenants').where('id', tenantId).first();
      if (!tenant) {
        throw new Error(`Tenant with ID ${tenantId} not found`);
      }

      console.log(`✅ Tenant found: ${tenant.name}`);

      // Read and process CSV
      const orders = await this.readCSV(csvFilePath);
      console.log(`📊 Found ${orders.length} orders to migrate`);

      // Process in batches
      for (let i = 0; i < orders.length; i += MIGRATION_CONFIG.batchSize) {
        const batch = orders.slice(i, i + MIGRATION_CONFIG.batchSize);
        await this.processBatch(batch, tenantId);
        
        console.log(`📈 Progress: ${Math.min(i + MIGRATION_CONFIG.batchSize, orders.length)}/${orders.length} orders processed`);
      }

      this.printStats();
      console.log('🎉 Migration completed successfully!');

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  async readCSV(filePath) {
    return new Promise((resolve, reject) => {
      const orders = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Map CSV columns to our schema
          const order = this.mapCSVToOrder(row);
          if (order) {
            orders.push(order);
          }
        })
        .on('end', () => {
          resolve(orders);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  mapCSVToOrder(row) {
    try {
      // Map your Google Sheets columns to the new schema
      // Adjust these column names based on your actual CSV headers
      return {
        orderNumber: row['Order ID'] || row['order_id'],
        orderDate: this.parseDate(row['Order date'] || row['order_date']),
        customerName: row['AgentName'] || row['customer_name'],
        customerPhone: this.formatPhone(row['Phone'] || row['phone']),
        customerEmail: row['Email'] || row['email'] || null,
        cityName: row['City'] || row['city'],
        address: row['Street Address'] || row['address'],
        productName: row['Product Name'] || row['product_name'],
        sku: row['SKU'] || row['sku'],
        color: row['Color'] || row['color'],
        size: row['Size'] || row['size'],
        price: this.parseFloat(row['Price'] || row['price']),
        quantity: this.parseInt(row['Total quantity'] || row['quantity']) || 1,
        status: this.mapStatus(row['Status de confirmation'] || row['status']),
        deliveryProvider: row['Société de livraison'] || row['delivery_provider'],
        trackingNumber: row['Tracking number'] || row['tracking_number'],
        deliveryStatus: row['Statut de livraison'] || row['delivery_status'],
        source: this.mapSource(row['Source'] || row['source']),
        campaign: row['Compaign'] || row['campaign'],
        adSet: row['Ad Set'] || row['ad_set'],
        notes: row['Remarque'] || row['notes'],
        syncStatus: row['Statut "Synced"'] === 'synced' ? 'synced' : 'pending',
      };
    } catch (error) {
      console.warn('⚠️ Failed to parse row:', error.message);
      return null;
    }
  }

  async processBatch(orders, tenantId) {
    const transaction = await db.transaction();
    
    try {
      for (const orderData of orders) {
        await this.processOrder(orderData, tenantId, transaction);
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async processOrder(orderData, tenantId, trx) {
    try {
      this.stats.orders.processed++;

      // Check for duplicate
      const existingOrder = await trx('orders')
        .where('tenant_id', tenantId)
        .where('order_number', orderData.orderNumber)
        .first();

      if (existingOrder && MIGRATION_CONFIG.skipDuplicates) {
        this.stats.orders.skipped++;
        return;
      }

      // Find or create city
      const city = await this.findOrCreateCity(orderData.cityName, trx);

      // Find or create customer
      const customer = await this.findOrCreateCustomer({
        tenantId,
        name: orderData.customerName,
        phone: orderData.customerPhone,
        email: orderData.customerEmail,
        cityId: city.id,
        address: orderData.address,
      }, trx);

      // Find or create product
      const product = await this.findOrCreateProduct({
        tenantId,
        name: orderData.productName,
        sku: orderData.sku,
        price: orderData.price,
      }, trx);

      // Find delivery provider
      const deliveryProvider = await this.findDeliveryProvider(orderData.deliveryProvider, trx);

      // Create order
      const orderId = uuidv4();
      const totalAmount = orderData.price * orderData.quantity;

      await trx('orders').insert({
        id: orderId,
        tenant_id: tenantId,
        order_number: orderData.orderNumber,
        customer_id: customer.id,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        customer_email: orderData.customerEmail,
        city_id: city.id,
        city_name: city.name,
        address: orderData.address,
        subtotal: totalAmount,
        total_amount: totalAmount,
        status: this.mapOrderStatus(orderData.status),
        confirmation_status: this.mapConfirmationStatus(orderData.status),
        delivery_provider_id: deliveryProvider?.id,
        tracking_number: orderData.trackingNumber,
        delivery_status: orderData.deliveryStatus,
        source: orderData.source,
        campaign: orderData.campaign,
        ad_set: orderData.adSet,
        internal_notes: orderData.notes,
        sync_status: orderData.syncStatus,
        order_date: orderData.orderDate,
        created_at: orderData.orderDate,
      });

      // Create order item
      await trx('order_items').insert({
        id: uuidv4(),
        order_id: orderId,
        product_id: product.id,
        product_name: orderData.productName,
        product_sku: orderData.sku,
        variant_attributes: JSON.stringify({
          color: orderData.color,
          size: orderData.size,
        }),
        quantity: orderData.quantity,
        unit_price: orderData.price,
        total_price: totalAmount,
      });

      this.stats.orders.created++;

    } catch (error) {
      console.error(`❌ Error processing order ${orderData.orderNumber}:`, error.message);
      this.stats.orders.errors++;
    }
  }

  async findOrCreateCity(cityName, trx) {
    if (!cityName) {
      cityName = 'Casablanca'; // Default city
    }

    let city = await trx('cities')
      .where('name', 'ilike', cityName)
      .first();

    if (!city) {
      const cityId = uuidv4();
      await trx('cities').insert({
        id: cityId,
        name: cityName,
        country_code: 'MA',
      });
      
      city = { id: cityId, name: cityName };
      console.log(`🏙️ Created city: ${cityName}`);
    }

    return city;
  }

  async findOrCreateCustomer(customerData, trx) {
    let customer = await trx('customers')
      .where('tenant_id', customerData.tenantId)
      .where('phone', customerData.phone)
      .first();

    if (!customer) {
      const customerId = uuidv4();
      const nameParts = customerData.name.split(' ');
      
      await trx('customers').insert({
        id: customerId,
        tenant_id: customerData.tenantId,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        phone: customerData.phone,
        email: customerData.email,
        city_id: customerData.cityId,
        address: customerData.address,
      });

      customer = { id: customerId };
      this.stats.customers.created++;
    }

    return customer;
  }

  async findOrCreateProduct(productData, trx) {
    let product = await trx('products')
      .where('tenant_id', productData.tenantId)
      .where('name', productData.name)
      .first();

    if (!product) {
      const productId = uuidv4();
      
      await trx('products').insert({
        id: productId,
        tenant_id: productData.tenantId,
        name: productData.name,
        sku: productData.sku,
        price: productData.price,
      });

      product = { id: productId };
      this.stats.products.created++;
    }

    return product;
  }

  async findDeliveryProvider(providerName, trx) {
    if (!providerName) return null;

    return await trx('delivery_providers_master')
      .where('name', 'ilike', `%${providerName}%`)
      .first();
  }

  // Utility functions
  parseDate(dateStr) {
    if (!dateStr) return new Date();
    
    // Handle various date formats from your sheets
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  formatPhone(phone) {
    if (!phone) return null;
    
    phone = phone.toString().replace(/\D/g, '');
    
    if (phone.startsWith('212')) {
      return '+' + phone;
    } else if (phone.startsWith('0')) {
      return '+212' + phone.substring(1);
    } else if (phone.length === 9) {
      return '+212' + phone;
    }
    
    return phone;
  }

  parseFloat(value) {
    if (!value) return 0;
    return parseFloat(value.toString().replace(/[^\d.-]/g, '')) || 0;
  }

  parseInt(value) {
    if (!value) return 0;
    return parseInt(value.toString().replace(/\D/g, '')) || 0;
  }

  mapStatus(status) {
    const statusMap = {
      'Confirmé': 'confirmed',
      'Confirmed': 'confirmed',
      'Annulé': 'cancelled',
      'Cancelled': 'cancelled',
      'Reporté': 'pending',
      'Pas de réponse': 'pending',
      'Appel 1': 'pending',
      'Appel 2': 'pending',
      'Appel 3': 'pending',
    };
    
    return statusMap[status] || 'pending';
  }

  mapOrderStatus(status) {
    if (['Confirmé', 'Confirmed'].includes(status)) return 'confirmed';
    if (['Annulé', 'Cancelled'].includes(status)) return 'cancelled';
    return 'pending';
  }

  mapConfirmationStatus(status) {
    if (['Confirmé', 'Confirmed'].includes(status)) return 'confirmed';
    if (['Annulé', 'Cancelled'].includes(status)) return 'rejected';
    if (['Pas de réponse'].includes(status)) return 'no_response';
    return 'pending';
  }

  mapSource(source) {
    const sourceMap = {
      'Facebook': 'facebook',
      'TikTok': 'tiktok',
      'Tiktok': 'tiktok',
      'Instagram': 'instagram',
      'Google': 'google',
    };
    
    return sourceMap[source] || 'other';
  }

  printStats() {
    console.log('\n📊 Migration Statistics:');
    console.log('========================');
    console.log(`Orders: ${this.stats.orders.created} created, ${this.stats.orders.skipped} skipped, ${this.stats.orders.errors} errors`);
    console.log(`Customers: ${this.stats.customers.created} created`);
    console.log(`Products: ${this.stats.products.created} created`);
    console.log('========================\n');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node migrate-from-sheets.js <csv-file> <tenant-id>');
    console.log('');
    console.log('Example:');
    console.log('  node migrate-from-sheets.js orders.csv 123e4567-e89b-12d3-a456-426614174000');
    process.exit(1);
  }

  const [csvFile, tenantId] = args;
  
  if (!fs.existsSync(csvFile)) {
    console.error(`❌ CSV file not found: ${csvFile}`);
    process.exit(1);
  }

  const migrator = new SheetsMigrator();
  
  try {
    await migrator.migrate(csvFile, tenantId);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = SheetsMigrator;