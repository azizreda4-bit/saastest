const { Order } = require('../../models/Order');
const deliveryProviderService = require('../../services/deliveryProviderService');

/**
 * Check single order status job processor
 */
async function checkStatus(job) {
  const { orderId, tenantId } = job.data;
  
  try {
    console.log(`Checking status for order ${orderId}`);
    
    // Get order from database
    const order = await Order.findById(orderId, tenantId);
    
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (!order.trackingNumber || !order.deliveryProvider) {
      console.log(`Order ${orderId} has no tracking number or delivery provider`);
      return { success: true, orderId, status: order.status };
    }

    // Check status with delivery provider
    const statusResult = await deliveryProviderService.checkStatus(
      order.deliveryProvider,
      order.trackingNumber,
      tenantId
    );

    // Update order status if changed
    if (statusResult.status && statusResult.status !== order.status) {
      await Order.update(orderId, {
        status: statusResult.status,
        statusHistory: [
          ...(order.statusHistory || []),
          {
            status: statusResult.status,
            timestamp: new Date(),
            provider: order.deliveryProvider,
            details: statusResult.details,
          }
        ],
      }, tenantId);

      console.log(`Order ${orderId} status updated to ${statusResult.status}`);
    }

    return { 
      success: true, 
      orderId, 
      status: statusResult.status,
      updated: statusResult.status !== order.status 
    };
  } catch (error) {
    console.error('Check status job failed:', error);
    throw error;
  }
}

/**
 * Bulk status check job processor
 */
async function bulkStatusCheck(job) {
  try {
    console.log('Starting bulk status check');
    
    // Get all orders that need status updates
    const orders = await Order.findPendingStatusUpdates();
    
    console.log(`Found ${orders.length} orders for status update`);
    
    const results = {
      processed: 0,
      updated: 0,
      errors: 0,
    };

    // Process orders in batches
    const batchSize = 10;
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (order) => {
        try {
          if (!order.trackingNumber || !order.deliveryProvider) {
            results.processed++;
            return;
          }

          // Check status with delivery provider
          const statusResult = await deliveryProviderService.checkStatus(
            order.deliveryProvider,
            order.trackingNumber,
            order.tenantId
          );

          results.processed++;

          // Update order status if changed
          if (statusResult.status && statusResult.status !== order.status) {
            await Order.update(order.id, {
              status: statusResult.status,
              statusHistory: [
                ...(order.statusHistory || []),
                {
                  status: statusResult.status,
                  timestamp: new Date(),
                  provider: order.deliveryProvider,
                  details: statusResult.details,
                }
              ],
              lastStatusCheck: new Date(),
            }, order.tenantId);

            results.updated++;
          } else {
            // Update last check time even if status didn't change
            await Order.update(order.id, {
              lastStatusCheck: new Date(),
            }, order.tenantId);
          }
        } catch (error) {
          console.error(`Error checking status for order ${order.id}:`, error);
          results.errors++;
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches to avoid overwhelming providers
      if (i + batchSize < orders.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Bulk status check completed: ${results.processed} processed, ${results.updated} updated, ${results.errors} errors`);
    
    return { success: true, results };
  } catch (error) {
    console.error('Bulk status check job failed:', error);
    throw error;
  }
}

module.exports = {
  checkStatus,
  bulkStatusCheck,
};