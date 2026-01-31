const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class Tenant {
  /**
   * Find tenant by slug
   */
  static async findBySlug(slug) {
    return await db('tenants')
      .where('slug', slug)
      .whereNull('deleted_at')
      .first();
  }

  /**
   * Find tenant by ID
   */
  static async findById(id) {
    return await db('tenants')
      .where('id', id)
      .whereNull('deleted_at')
      .first();
  }

  /**
   * Create new tenant
   */
  static async create(tenantData, trx = db) {
    const {
      name,
      slug,
      domain,
      subscriptionPlan = 'starter',
      billingEmail,
      billingAddress,
      settings = {}
    } = tenantData;

    const [tenant] = await trx('tenants')
      .insert({
        id: uuidv4(),
        name,
        slug,
        domain,
        subscription_plan: subscriptionPlan,
        subscription_status: 'active',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        billing_email: billingEmail,
        billing_address: billingAddress ? JSON.stringify(billingAddress) : null,
        settings: JSON.stringify(settings)
      })
      .returning('*');

    return tenant;
  }

  /**
   * Update tenant
   */
  static async update(id, updateData, trx = db) {
    const allowedFields = [
      'name',
      'domain',
      'logo_url',
      'subscription_plan',
      'subscription_status',
      'trial_ends_at',
      'subscription_ends_at',
      'max_orders_per_month',
      'max_users',
      'max_delivery_providers',
      'max_api_calls_per_day',
      'settings',
      'timezone',
      'currency',
      'language',
      'billing_email',
      'billing_address'
    ];

    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    // Handle JSON fields
    if (filteredData.settings && typeof filteredData.settings === 'object') {
      filteredData.settings = JSON.stringify(filteredData.settings);
    }
    if (filteredData.billing_address && typeof filteredData.billing_address === 'object') {
      filteredData.billing_address = JSON.stringify(filteredData.billing_address);
    }

    filteredData.updated_at = new Date();

    const [tenant] = await trx('tenants')
      .where('id', id)
      .whereNull('deleted_at')
      .update(filteredData)
      .returning('*');

    return tenant;
  }

  /**
   * Get tenant with usage statistics
   */
  static async findWithUsage(id) {
    const tenant = await this.findById(id);
    if (!tenant) return null;

    // Get current month usage
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const usage = await db('orders')
      .select([
        db.raw('COUNT(*) as orders_this_month'),
        db.raw('COUNT(DISTINCT agent_id) as active_users')
      ])
      .where('tenant_id', id)
      .where('created_at', '>=', currentMonth)
      .first();

    // Get API usage
    const apiUsage = await db('api_usage')
      .select([
        db.raw('SUM(total_requests) as api_calls_today')
      ])
      .where('tenant_id', id)
      .where('date', new Date().toISOString().split('T')[0])
      .first();

    // Get delivery provider count
    const providerCount = await db('tenant_delivery_configs')
      .where('tenant_id', id)
      .where('is_enabled', true)
      .count('* as count')
      .first();

    return {
      ...tenant,
      usage: {
        ordersThisMonth: parseInt(usage.orders_this_month) || 0,
        activeUsers: parseInt(usage.active_users) || 0,
        apiCallsToday: parseInt(apiUsage.api_calls_today) || 0,
        enabledProviders: parseInt(providerCount.count) || 0
      },
      limits: {
        maxOrdersPerMonth: tenant.max_orders_per_month,
        maxUsers: tenant.max_users,
        maxDeliveryProviders: tenant.max_delivery_providers,
        maxApiCallsPerDay: tenant.max_api_calls_per_day
      }
    };
  }

  /**
   * Check if tenant has reached limits
   */
  static async checkLimits(id) {
    const tenant = await this.findWithUsage(id);
    if (!tenant) return null;

    const { usage, limits } = tenant;

    return {
      orders: {
        current: usage.ordersThisMonth,
        limit: limits.maxOrdersPerMonth,
        exceeded: usage.ordersThisMonth >= limits.maxOrdersPerMonth
      },
      users: {
        current: usage.activeUsers,
        limit: limits.maxUsers,
        exceeded: usage.activeUsers >= limits.maxUsers
      },
      apiCalls: {
        current: usage.apiCallsToday,
        limit: limits.maxApiCallsPerDay,
        exceeded: usage.apiCallsToday >= limits.maxApiCallsPerDay
      },
      deliveryProviders: {
        current: usage.enabledProviders,
        limit: limits.maxDeliveryProviders,
        exceeded: usage.enabledProviders >= limits.maxDeliveryProviders
      }
    };
  }

  /**
   * Get tenant dashboard statistics
   */
  static async getDashboardStats(id) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Orders statistics
    const orderStats = await db('orders')
      .select([
        db.raw('COUNT(*) as total_orders'),
        db.raw('COUNT(*) FILTER (WHERE created_at >= ?) as orders_this_month', [startOfMonth]),
        db.raw('COUNT(*) FILTER (WHERE created_at >= ?) as orders_this_week', [startOfWeek]),
        db.raw('COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as orders_today'),
        db.raw('COUNT(*) FILTER (WHERE status = \'confirmed\') as confirmed_orders'),
        db.raw('COUNT(*) FILTER (WHERE status = \'delivered\') as delivered_orders'),
        db.raw('SUM(total_amount) as total_revenue'),
        db.raw('SUM(total_amount) FILTER (WHERE created_at >= ?) as revenue_this_month', [startOfMonth]),
        db.raw('AVG(total_amount) as avg_order_value')
      ])
      .where('tenant_id', id)
      .first();

    // Customer statistics
    const customerStats = await db('customers')
      .select([
        db.raw('COUNT(*) as total_customers'),
        db.raw('COUNT(*) FILTER (WHERE created_at >= ?) as new_customers_this_month', [startOfMonth])
      ])
      .where('tenant_id', id)
      .first();

    // Communication statistics
    const communicationStats = await db('communications')
      .select([
        db.raw('COUNT(*) as total_messages'),
        db.raw('COUNT(*) FILTER (WHERE created_at >= ?) as messages_this_month', [startOfMonth]),
        db.raw('COUNT(*) FILTER (WHERE status = \'delivered\') as delivered_messages'),
        db.raw('COUNT(*) FILTER (WHERE channel = \'whatsapp\') as whatsapp_messages')
      ])
      .where('tenant_id', id)
      .first();

    // Recent orders
    const recentOrders = await db('orders')
      .select([
        'id',
        'order_number',
        'customer_name',
        'customer_phone',
        'status',
        'confirmation_status',
        'total_amount',
        'created_at'
      ])
      .where('tenant_id', id)
      .orderBy('created_at', 'desc')
      .limit(10);

    // Top products (by order count)
    const topProducts = await db('order_items as oi')
      .select([
        'oi.product_name',
        db.raw('COUNT(*) as order_count'),
        db.raw('SUM(oi.quantity) as total_quantity'),
        db.raw('SUM(oi.total_price) as total_revenue')
      ])
      .join('orders as o', 'oi.order_id', 'o.id')
      .where('o.tenant_id', id)
      .where('o.created_at', '>=', startOfMonth)
      .groupBy('oi.product_name')
      .orderBy('order_count', 'desc')
      .limit(5);

    return {
      orders: {
        total: parseInt(orderStats.total_orders) || 0,
        thisMonth: parseInt(orderStats.orders_this_month) || 0,
        thisWeek: parseInt(orderStats.orders_this_week) || 0,
        today: parseInt(orderStats.orders_today) || 0,
        confirmed: parseInt(orderStats.confirmed_orders) || 0,
        delivered: parseInt(orderStats.delivered_orders) || 0,
        confirmationRate: orderStats.total_orders > 0 
          ? Math.round((orderStats.confirmed_orders / orderStats.total_orders) * 100) 
          : 0
      },
      revenue: {
        total: parseFloat(orderStats.total_revenue) || 0,
        thisMonth: parseFloat(orderStats.revenue_this_month) || 0,
        averageOrderValue: parseFloat(orderStats.avg_order_value) || 0
      },
      customers: {
        total: parseInt(customerStats.total_customers) || 0,
        newThisMonth: parseInt(customerStats.new_customers_this_month) || 0
      },
      communications: {
        total: parseInt(communicationStats.total_messages) || 0,
        thisMonth: parseInt(communicationStats.messages_this_month) || 0,
        delivered: parseInt(communicationStats.delivered_messages) || 0,
        whatsapp: parseInt(communicationStats.whatsapp_messages) || 0,
        deliveryRate: communicationStats.total_messages > 0 
          ? Math.round((communicationStats.delivered_messages / communicationStats.total_messages) * 100) 
          : 0
      },
      recentOrders,
      topProducts: topProducts.map(product => ({
        name: product.product_name,
        orderCount: parseInt(product.order_count),
        totalQuantity: parseInt(product.total_quantity),
        totalRevenue: parseFloat(product.total_revenue)
      }))
    };
  }

  /**
   * Soft delete tenant
   */
  static async softDelete(id, trx = db) {
    await trx('tenants')
      .where('id', id)
      .update({
        deleted_at: new Date(),
        updated_at: new Date()
      });
  }

  /**
   * Get all tenants (admin only)
   */
  static async findAll(options = {}) {
    const { page = 1, limit = 20, status, plan } = options;

    let query = db('tenants')
      .select([
        'id',
        'name',
        'slug',
        'domain',
        'subscription_plan',
        'subscription_status',
        'trial_ends_at',
        'subscription_ends_at',
        'created_at'
      ])
      .whereNull('deleted_at');

    if (status) {
      query = query.where('subscription_status', status);
    }

    if (plan) {
      query = query.where('subscription_plan', plan);
    }

    // Get total count
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('* as count');
    const total = parseInt(count);

    // Apply pagination
    const offset = (page - 1) * limit;
    const tenants = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      tenants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = Tenant;