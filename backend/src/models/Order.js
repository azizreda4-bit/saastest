const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class Order {
  /**
   * Find all orders with filters and pagination
   */
  static async findAll(filters = {}, options = {}) {
    const {
      tenantId,
      status,
      confirmationStatus,
      deliveryProvider,
      search,
      dateFrom,
      dateTo,
      agentId
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    let query = db('orders as o')
      .select([
        'o.*',
        'c.name as city_name',
        'dp.name as delivery_provider_name',
        'dp.slug as delivery_provider_slug',
        'u.first_name as agent_first_name',
        'u.last_name as agent_last_name',
        'cust.total_orders as customer_total_orders'
      ])
      .leftJoin('cities as c', 'o.city_id', 'c.id')
      .leftJoin('delivery_providers_master as dp', 'o.delivery_provider_id', 'dp.id')
      .leftJoin('users as u', 'o.agent_id', 'u.id')
      .leftJoin('customers as cust', 'o.customer_id', 'cust.id')
      .where('o.tenant_id', tenantId);

    // Apply filters
    if (status) {
      query = query.where('o.status', status);
    }

    if (confirmationStatus) {
      query = query.where('o.confirmation_status', confirmationStatus);
    }

    if (deliveryProvider) {
      query = query.where('dp.slug', deliveryProvider);
    }

    if (agentId) {
      query = query.where('o.agent_id', agentId);
    }

    if (search) {
      query = query.where(function() {
        this.where('o.order_number', 'ilike', `%${search}%`)
          .orWhere('o.customer_name', 'ilike', `%${search}%`)
          .orWhere('o.customer_phone', 'ilike', `%${search}%`)
          .orWhere('o.tracking_number', 'ilike', `%${search}%`);
      });
    }

    if (dateFrom) {
      query = query.where('o.order_date', '>=', dateFrom);
    }

    if (dateTo) {
      query = query.where('o.order_date', '<=', dateTo);
    }

    // Get total count
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('* as count');
    const total = parseInt(count);

    // Apply pagination and sorting
    const offset = (page - 1) * limit;
    query = query
      .orderBy(`o.${sortBy}`, sortOrder)
      .limit(limit)
      .offset(offset);

    const orders = await query;

    // Get order items for each order
    const orderIds = orders.map(o => o.id);
    if (orderIds.length > 0) {
      const items = await db('order_items')
        .whereIn('order_id', orderIds);

      // Group items by order_id
      const itemsByOrder = items.reduce((acc, item) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push(item);
        return acc;
      }, {});

      // Add items to orders
      orders.forEach(order => {
        order.items = itemsByOrder[order.id] || [];
      });
    }

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find order by ID
   */
  static async findById(id, tenantId) {
    const order = await db('orders as o')
      .select([
        'o.*',
        'c.name as city_name',
        'c.region as city_region',
        'dp.name as delivery_provider_name',
        'dp.slug as delivery_provider_slug',
        'u.first_name as agent_first_name',
        'u.last_name as agent_last_name',
        'cust.id as customer_id',
        'cust.first_name as customer_first_name',
        'cust.last_name as customer_last_name',
        'cust.email as customer_email_verified',
        'cust.total_orders as customer_total_orders',
        'cust.total_spent as customer_total_spent'
      ])
      .leftJoin('cities as c', 'o.city_id', 'c.id')
      .leftJoin('delivery_providers_master as dp', 'o.delivery_provider_id', 'dp.id')
      .leftJoin('users as u', 'o.agent_id', 'u.id')
      .leftJoin('customers as cust', 'o.customer_id', 'cust.id')
      .where('o.id', id)
      .where('o.tenant_id', tenantId)
      .first();

    if (!order) {
      return null;
    }

    // Get order items
    order.items = await db('order_items')
      .where('order_id', id);

    // Get status history
    order.statusHistory = await db('order_status_history as osh')
      .select([
        'osh.*',
        'u.first_name as user_first_name',
        'u.last_name as user_last_name'
      ])
      .leftJoin('users as u', 'osh.user_id', 'u.id')
      .where('osh.order_id', id)
      .orderBy('osh.created_at', 'desc');

    return order;
  }

  /**
   * Find orders by IDs
   */
  static async findByIds(ids, tenantId) {
    return await db('orders')
      .whereIn('id', ids)
      .where('tenant_id', tenantId);
  }

  /**
   * Create new order
   */
  static async create(orderData, trx = db) {
    const {
      tenantId,
      orderNumber,
      customerId,
      agentId,
      customerName,
      customerPhone,
      customerEmail,
      cityId,
      address,
      postalCode,
      subtotal,
      shippingCost = 0,
      taxAmount = 0,
      discountAmount = 0,
      totalAmount,
      deliveryProviderId,
      source,
      medium,
      campaign,
      adSet,
      utmSource,
      utmMedium,
      utmCampaign,
      priority = 'normal',
      internalNotes,
      customerNotes,
      items = []
    } = orderData;

    const orderId = uuidv4();

    // Insert order
    const [order] = await trx('orders')
      .insert({
        id: orderId,
        tenant_id: tenantId,
        order_number: orderNumber,
        customer_id: customerId,
        agent_id: agentId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        city_id: cityId,
        address,
        postal_code: postalCode,
        subtotal,
        shipping_cost: shippingCost,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        delivery_provider_id: deliveryProviderId,
        source,
        medium,
        campaign,
        ad_set: adSet,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        priority,
        internal_notes: internalNotes,
        customer_notes: customerNotes,
        status: 'pending',
        confirmation_status: 'pending',
        sync_status: 'pending'
      })
      .returning('*');

    // Insert order items
    if (items.length > 0) {
      const orderItems = items.map(item => ({
        id: uuidv4(),
        order_id: orderId,
        product_id: item.productId,
        product_variant_id: item.productVariantId,
        product_name: item.productName,
        product_sku: item.productSku,
        variant_attributes: item.variantAttributes ? JSON.stringify(item.variantAttributes) : null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice || (item.quantity * item.unitPrice)
      }));

      await trx('order_items').insert(orderItems);
      order.items = orderItems;
    }

    return order;
  }

  /**
   * Update order
   */
  static async update(id, updateData, tenantId, trx = db) {
    const allowedFields = [
      'status',
      'confirmation_status',
      'payment_status',
      'fulfillment_status',
      'delivery_status',
      'tracking_number',
      'delivery_notes',
      'delivery_attempts',
      'estimated_delivery_date',
      'promised_delivery_date',
      'actual_delivery_date',
      'priority',
      'internal_notes',
      'customer_notes',
      'risk_level',
      'fraud_score',
      'sync_status',
      'sync_error',
      'sync_attempts',
      'last_sync_at',
      'confirmed_at',
      'shipped_at',
      'delivered_at',
      'cancelled_at'
    ];

    // Filter update data to only allowed fields
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        filteredData[snakeKey] = updateData[key];
      }
    });

    // Add updated_at timestamp
    filteredData.updated_at = new Date();

    // Set status timestamps
    if (filteredData.status === 'confirmed' && !filteredData.confirmed_at) {
      filteredData.confirmed_at = new Date();
    }
    if (filteredData.status === 'shipped' && !filteredData.shipped_at) {
      filteredData.shipped_at = new Date();
    }
    if (filteredData.status === 'delivered' && !filteredData.delivered_at) {
      filteredData.delivered_at = new Date();
    }
    if (filteredData.status === 'cancelled' && !filteredData.cancelled_at) {
      filteredData.cancelled_at = new Date();
    }

    const [updatedOrder] = await trx('orders')
      .where('id', id)
      .where('tenant_id', tenantId)
      .update(filteredData)
      .returning('*');

    return updatedOrder;
  }

  /**
   * Generate unique order number
   */
  static async generateOrderNumber(tenantId, trx = db) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const prefix = `${year}${month}${day}`;
    
    // Get the last order number for today
    const lastOrder = await trx('orders')
      .where('tenant_id', tenantId)
      .where('order_number', 'like', `${prefix}%`)
      .orderBy('order_number', 'desc')
      .first();

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.order_number.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Get order statistics
   */
  static async getStatistics(tenantId, period = 'month') {
    let dateFilter;
    const now = new Date();

    switch (period) {
      case 'today':
        dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        dateFilter = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const stats = await db('orders')
      .select([
        db.raw('COUNT(*) as total_orders'),
        db.raw('COUNT(*) FILTER (WHERE status = \'confirmed\') as confirmed_orders'),
        db.raw('COUNT(*) FILTER (WHERE status = \'delivered\') as delivered_orders'),
        db.raw('COUNT(*) FILTER (WHERE status = \'cancelled\') as cancelled_orders'),
        db.raw('COUNT(*) FILTER (WHERE status = \'returned\') as returned_orders'),
        db.raw('SUM(total_amount) as total_revenue'),
        db.raw('SUM(total_amount) FILTER (WHERE status = \'confirmed\') as confirmed_revenue'),
        db.raw('SUM(total_amount) FILTER (WHERE status = \'delivered\') as delivered_revenue'),
        db.raw('AVG(total_amount) as average_order_value'),
        db.raw('COUNT(DISTINCT customer_phone) as unique_customers')
      ])
      .where('tenant_id', tenantId)
      .where('created_at', '>=', dateFilter)
      .first();

    // Get status breakdown
    const statusBreakdown = await db('orders')
      .select('status')
      .count('* as count')
      .where('tenant_id', tenantId)
      .where('created_at', '>=', dateFilter)
      .groupBy('status');

    // Get confirmation status breakdown
    const confirmationBreakdown = await db('orders')
      .select('confirmation_status')
      .count('* as count')
      .where('tenant_id', tenantId)
      .where('created_at', '>=', dateFilter)
      .groupBy('confirmation_status');

    // Get delivery provider performance
    const providerStats = await db('orders as o')
      .select([
        'dp.name as provider_name',
        'dp.slug as provider_slug',
        db.raw('COUNT(*) as total_orders'),
        db.raw('COUNT(*) FILTER (WHERE o.status = \'delivered\') as delivered_orders'),
        db.raw('AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.shipped_at))/86400) as avg_delivery_days')
      ])
      .leftJoin('delivery_providers_master as dp', 'o.delivery_provider_id', 'dp.id')
      .where('o.tenant_id', tenantId)
      .where('o.created_at', '>=', dateFilter)
      .whereNotNull('o.delivery_provider_id')
      .groupBy('dp.id', 'dp.name', 'dp.slug');

    // Get source performance
    const sourceStats = await db('orders')
      .select([
        'source',
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(total_amount) as total_revenue'),
        db.raw('COUNT(*) FILTER (WHERE status = \'confirmed\') as confirmed_orders')
      ])
      .where('tenant_id', tenantId)
      .where('created_at', '>=', dateFilter)
      .whereNotNull('source')
      .groupBy('source');

    return {
      summary: {
        totalOrders: parseInt(stats.total_orders) || 0,
        confirmedOrders: parseInt(stats.confirmed_orders) || 0,
        deliveredOrders: parseInt(stats.delivered_orders) || 0,
        cancelledOrders: parseInt(stats.cancelled_orders) || 0,
        returnedOrders: parseInt(stats.returned_orders) || 0,
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        confirmedRevenue: parseFloat(stats.confirmed_revenue) || 0,
        deliveredRevenue: parseFloat(stats.delivered_revenue) || 0,
        averageOrderValue: parseFloat(stats.average_order_value) || 0,
        uniqueCustomers: parseInt(stats.unique_customers) || 0,
        confirmationRate: stats.total_orders > 0 
          ? Math.round((stats.confirmed_orders / stats.total_orders) * 100) 
          : 0,
        deliveryRate: stats.confirmed_orders > 0 
          ? Math.round((stats.delivered_orders / stats.confirmed_orders) * 100) 
          : 0
      },
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      confirmationBreakdown: confirmationBreakdown.reduce((acc, item) => {
        acc[item.confirmation_status] = parseInt(item.count);
        return acc;
      }, {}),
      providerStats: providerStats.map(stat => ({
        providerName: stat.provider_name,
        providerSlug: stat.provider_slug,
        totalOrders: parseInt(stat.total_orders),
        deliveredOrders: parseInt(stat.delivered_orders),
        deliveryRate: stat.total_orders > 0 
          ? Math.round((stat.delivered_orders / stat.total_orders) * 100) 
          : 0,
        avgDeliveryDays: parseFloat(stat.avg_delivery_days) || 0
      })),
      sourceStats: sourceStats.map(stat => ({
        source: stat.source,
        totalOrders: parseInt(stat.total_orders),
        totalRevenue: parseFloat(stat.total_revenue),
        confirmedOrders: parseInt(stat.confirmed_orders),
        conversionRate: stat.total_orders > 0 
          ? Math.round((stat.confirmed_orders / stat.total_orders) * 100) 
          : 0
      })),
      period,
      dateRange: {
        from: dateFilter,
        to: now
      }
    };
  }

  /**
   * Check for duplicate orders
   */
  static async checkDuplicates(tenantId, customerPhone, timeWindow = 24) {
    const timeThreshold = new Date(Date.now() - timeWindow * 60 * 60 * 1000);
    
    return await db('orders')
      .where('tenant_id', tenantId)
      .where('customer_phone', customerPhone)
      .where('created_at', '>=', timeThreshold)
      .whereNotIn('status', ['cancelled', 'refunded']);
  }

  /**
   * Get orders pending sync
   */
  static async getPendingSync(tenantId, limit = 100) {
    return await db('orders')
      .where('tenant_id', tenantId)
      .where('sync_status', 'pending')
      .where('status', 'confirmed')
      .whereNotNull('delivery_provider_id')
      .limit(limit);
  }
}

module.exports = Order;