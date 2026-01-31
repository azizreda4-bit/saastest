const { Order } = require('../../models/Order');
const deliveryProviderService = require('../../services/deliveryProviderService');

/**
 * Create order job processor
 */
async function createOrder(job) {
  const { orderData, tenantId } = job.data;
  
  try {
    console.log(`Processing create order job for tenant ${tenantId}`);
    
    // Create order in database
    const order = await Order.create({
      ...orderData,
      tenantId,
      status: 'pending',
    });

    // If delivery provider is specified, sync with provider
    if (orderData.deliveryProvider) {
      await deliveryProviderService.createParcel(
        orderData.deliveryProvider,
        order,
        tenantId
      );
    }

    console.log(`Order ${order.id} created successfully`);
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error('Create order job failed:', error);
    throw error;
  }
}

/**
 * Update order job processor
 */
async function updateOrder(job) {
  const { orderId, updateData, tenantId } = job.data;
  
  try {
    console.log(`Processing update order job for order ${orderId}`);
    
    // Update order in database
    const order = await Order.update(orderId, updateData, tenantId);
    
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // If delivery provider changed, sync with new provider
    if (updateData.deliveryProvider && updateData.deliveryProvider !== order.deliveryProvider) {
      await deliveryProviderService.createParcel(
        updateData.deliveryProvider,
        order,
        tenantId
      );
    }

    console.log(`Order ${orderId} updated successfully`);
    return { success: true, orderId };
  } catch (error) {
    console.error('Update order job failed:', error);
    throw error;
  }
}

/**
 * Sync with delivery provider job processor
 */
async function syncWithProvider(job) {
  const { orderId, deliveryProvider, tenantId } = job.data;
  
  try {
    console.log(`Processing sync with provider job for order ${orderId}`);
    
    // Get order from database
    const order = await Order.findById(orderId, tenantId);
    
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Sync with delivery provider
    const result = await deliveryProviderService.createParcel(
      deliveryProvider,
      order,
      tenantId
    );

    // Update order with tracking information
    if (result.trackingNumber) {
      await Order.update(orderId, {
        trackingNumber: result.trackingNumber,
        deliveryProvider,
        status: 'confirmed',
      }, tenantId);
    }

    console.log(`Order ${orderId} synced with ${deliveryProvider} successfully`);
    return { success: true, orderId, trackingNumber: result.trackingNumber };
  } catch (error) {
    console.error('Sync with provider job failed:', error);
    throw error;
  }
}

module.exports = {
  createOrder,
  updateOrder,
  syncWithProvider,
};