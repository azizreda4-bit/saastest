const db = require('../../database/connection');

/**
 * Update metrics job processor
 */
async function updateMetrics(job) {
  try {
    console.log('Updating analytics metrics');
    
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Get metrics for the last hour
    const metrics = await calculateHourlyMetrics(hourAgo, now);
    
    // Store metrics in analytics table
    await db('analytics_metrics').insert({
      timestamp: hourAgo,
      period: 'hourly',
      metrics: JSON.stringify(metrics),
      createdAt: now,
    });

    console.log('Analytics metrics updated successfully');
    
    return { success: true, metrics };
  } catch (error) {
    console.error('Update metrics job failed:', error);
    throw error;
  }
}

/**
 * Generate report job processor
 */
async function generateReport(job) {
  const { type = 'daily', tenantId, startDate, endDate } = job.data;
  
  try {
    console.log(`Generating ${type} report`);
    
    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to yesterday for daily reports
      end = new Date();
      end.setHours(0, 0, 0, 0);
      start = new Date(end);
      start.setDate(start.getDate() - 1);
    }

    const report = await generateAnalyticsReport(type, start, end, tenantId);
    
    // Store report
    await db('analytics_reports').insert({
      type,
      tenantId,
      startDate: start,
      endDate: end,
      report: JSON.stringify(report),
      createdAt: new Date(),
    });

    console.log(`${type} report generated successfully`);
    
    return { success: true, report };
  } catch (error) {
    console.error('Generate report job failed:', error);
    throw error;
  }
}

/**
 * Calculate hourly metrics
 */
async function calculateHourlyMetrics(startTime, endTime) {
  const metrics = {};

  try {
    // Total orders
    const ordersResult = await db('orders')
      .whereBetween('createdAt', [startTime, endTime])
      .count('* as count')
      .first();
    metrics.totalOrders = parseInt(ordersResult.count);

    // Orders by status
    const statusResult = await db('orders')
      .whereBetween('createdAt', [startTime, endTime])
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    metrics.ordersByStatus = {};
    statusResult.forEach(row => {
      metrics.ordersByStatus[row.status] = parseInt(row.count);
    });

    // Revenue
    const revenueResult = await db('orders')
      .whereBetween('createdAt', [startTime, endTime])
      .sum('totalAmount as total')
      .first();
    metrics.totalRevenue = parseFloat(revenueResult.total || 0);

    // Orders by delivery provider
    const providerResult = await db('orders')
      .whereBetween('createdAt', [startTime, endTime])
      .whereNotNull('deliveryProvider')
      .select('deliveryProvider')
      .count('* as count')
      .groupBy('deliveryProvider');
    
    metrics.ordersByProvider = {};
    providerResult.forEach(row => {
      metrics.ordersByProvider[row.deliveryProvider] = parseInt(row.count);
    });

    // Active tenants
    const tenantsResult = await db('orders')
      .whereBetween('createdAt', [startTime, endTime])
      .distinct('tenantId')
      .count('* as count')
      .first();
    metrics.activeTenants = parseInt(tenantsResult.count);

  } catch (error) {
    console.error('Error calculating metrics:', error);
  }

  return metrics;
}

/**
 * Generate analytics report
 */
async function generateAnalyticsReport(type, startDate, endDate, tenantId = null) {
  const report = {
    type,
    period: {
      start: startDate,
      end: endDate,
    },
    generated: new Date(),
  };

  try {
    let query = db('orders').whereBetween('createdAt', [startDate, endDate]);
    
    if (tenantId) {
      query = query.where('tenantId', tenantId);
    }

    // Summary metrics
    const summary = await query.clone()
      .select(
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(total_amount) as total_revenue'),
        db.raw('AVG(total_amount) as avg_order_value'),
        db.raw('COUNT(DISTINCT tenant_id) as active_tenants')
      )
      .first();

    report.summary = {
      totalOrders: parseInt(summary.total_orders),
      totalRevenue: parseFloat(summary.total_revenue || 0),
      avgOrderValue: parseFloat(summary.avg_order_value || 0),
      activeTenants: parseInt(summary.active_tenants),
    };

    // Orders by status
    const statusBreakdown = await query.clone()
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    report.statusBreakdown = {};
    statusBreakdown.forEach(row => {
      report.statusBreakdown[row.status] = parseInt(row.count);
    });

    // Orders by delivery provider
    const providerBreakdown = await query.clone()
      .whereNotNull('deliveryProvider')
      .select('deliveryProvider')
      .count('* as count')
      .sum('totalAmount as revenue')
      .groupBy('deliveryProvider');
    
    report.providerBreakdown = {};
    providerBreakdown.forEach(row => {
      report.providerBreakdown[row.deliveryProvider] = {
        orders: parseInt(row.count),
        revenue: parseFloat(row.revenue || 0),
      };
    });

    // Daily trends (for multi-day reports)
    if (type !== 'hourly') {
      const dailyTrends = await query.clone()
        .select(db.raw('DATE(created_at) as date'))
        .count('* as orders')
        .sum('totalAmount as revenue')
        .groupBy(db.raw('DATE(created_at)'))
        .orderBy('date');
      
      report.dailyTrends = dailyTrends.map(row => ({
        date: row.date,
        orders: parseInt(row.orders),
        revenue: parseFloat(row.revenue || 0),
      }));
    }

    // Top cities
    const topCities = await query.clone()
      .select('city')
      .count('* as count')
      .groupBy('city')
      .orderBy('count', 'desc')
      .limit(10);
    
    report.topCities = topCities.map(row => ({
      city: row.city,
      orders: parseInt(row.count),
    }));

  } catch (error) {
    console.error('Error generating report:', error);
    report.error = error.message;
  }

  return report;
}

module.exports = {
  updateMetrics,
  generateReport,
};