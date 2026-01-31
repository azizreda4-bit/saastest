const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const router = express.Router();

const { Order, Customer, Product } = require('../models');
const { requireRole } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const { createAuditLog } = require('../services/auditService');
const { triggerAutomation } = require('../services/automationService');
const { DeliveryProviderService } = require('../services/deliveryProviderService');
const { DuplicateDetectionService } = require('../services/duplicateDetectionService');

// ===============================================
// VALIDATION RULES
// ===============================================

const createOrderValidation = [
  body('customerName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Customer name must be between 2 and 200 characters'),
  body('customerPhone')
    .matches(/^(\+212|0)[5-7][0-9]{8}$/)
    .withMessage('Please provide a valid Moroccan phone number'),
  body('customerEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('cityId')
    .isUUID()
    .withMessage('Please provide a valid city ID'),
  body('address')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.productId')
    .isUUID()
    .withMessage('Product ID must be a valid UUID'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),
  body('deliveryProviderId')
    .optional()
    .isUUID()
    .withMessage('Delivery provider ID must be a valid UUID'),
  body('source')
    .optional()
    .isIn(['facebook', 'tiktok', 'instagram', 'google', 'direct', 'referral', 'other'])
    .withMessage('Invalid source'),
  body('campaign')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Campaign name must not exceed 100 characters'),
];

const updateOrderValidation = [
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'])
    .withMessage('Invalid order status'),
  body('confirmationStatus')
    .optional()
    .isIn(['pending', 'confirmed', 'rejected', 'no_response', 'callback_requested'])
    .withMessage('Invalid confirmation status'),
  body('deliveryStatus')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Delivery status must not exceed 50 characters'),
  body('trackingNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tracking number must not exceed 100 characters'),
  body('deliveryNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Delivery notes must not exceed 1000 characters'),
  body('internalNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Internal notes must not exceed 1000 characters'),
];

// ===============================================
// GET ALL ORDERS
// ===============================================

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Get all orders for the tenant
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by order status
 *       - in: query
 *         name: confirmationStatus
 *         schema:
 *           type: string
 *         description: Filter by confirmation status
 *       - in: query
 *         name: deliveryProvider
 *         schema:
 *           type: string
 *         description: Filter by delivery provider
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in order number, customer name, or phone
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders to this date
 *     responses:
 *       200:
 *         description: List of orders
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      confirmationStatus,
      deliveryProvider,
      search,
      dateFrom,
      dateTo,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      tenantId: req.user.tenant_id,
      status,
      confirmationStatus,
      deliveryProvider,
      search,
      dateFrom,
      dateTo
    };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };

    const result = await Order.findAll(filters, options);

    res.json({
      success: true,
      data: result.orders,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// ===============================================
// GET ORDER BY ID
// ===============================================

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid order ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const order = await Order.findById(req.params.id, req.user.tenant_id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

// ===============================================
// CREATE NEW ORDER
// ===============================================

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerName
 *               - customerPhone
 *               - cityId
 *               - address
 *               - items
 *             properties:
 *               customerName:
 *                 type: string
 *               customerPhone:
 *                 type: string
 *               customerEmail:
 *                 type: string
 *                 format: email
 *               cityId:
 *                 type: string
 *                 format: uuid
 *               address:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                     unitPrice:
 *                       type: number
 *               deliveryProviderId:
 *                 type: string
 *                 format: uuid
 *               source:
 *                 type: string
 *               campaign:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', createOrderValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const orderData = {
      ...req.body,
      tenantId: req.user.tenant_id,
      agentId: req.user.id
    };

    // Check for duplicates
    const duplicateCheck = await DuplicateDetectionService.checkForDuplicates(
      req.user.tenant_id,
      orderData.customerPhone,
      orderData.items
    );

    if (duplicateCheck.isDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'Potential duplicate order detected',
        duplicateInfo: duplicateCheck
      });
    }

    // Create order in transaction
    const db = require('../database/connection');
    const order = await db.transaction(async (trx) => {
      // Generate order number
      const orderNumber = await Order.generateOrderNumber(req.user.tenant_id, trx);

      // Calculate totals
      let subtotal = 0;
      const validatedItems = [];

      for (const item of orderData.items) {
        const product = await Product.findById(item.productId, req.user.tenant_id, trx);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        const itemTotal = item.quantity * item.unitPrice;
        subtotal += itemTotal;

        validatedItems.push({
          ...item,
          productName: product.name,
          productSku: product.sku,
          totalPrice: itemTotal
        });
      }

      // Find or create customer
      let customer = await Customer.findByPhone(orderData.customerPhone, req.user.tenant_id, trx);
      if (!customer) {
        customer = await Customer.create({
          tenantId: req.user.tenant_id,
          firstName: orderData.customerName.split(' ')[0],
          lastName: orderData.customerName.split(' ').slice(1).join(' '),
          phone: orderData.customerPhone,
          email: orderData.customerEmail,
          cityId: orderData.cityId,
          address: orderData.address
        }, trx);
      }

      // Create order
      const newOrder = await Order.create({
        tenantId: req.user.tenant_id,
        orderNumber,
        customerId: customer.id,
        agentId: req.user.id,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerEmail: orderData.customerEmail,
        cityId: orderData.cityId,
        address: orderData.address,
        subtotal,
        totalAmount: subtotal, // Add shipping/tax calculation later
        deliveryProviderId: orderData.deliveryProviderId,
        source: orderData.source,
        campaign: orderData.campaign,
        adSet: orderData.adSet,
        internalNotes: orderData.internalNotes,
        items: validatedItems
      }, trx);

      return newOrder;
    });

    // Create audit log
    await createAuditLog({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      action: 'order.created',
      resource: 'order',
      resourceId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        customerPhone: order.customerPhone,
        totalAmount: order.totalAmount
      }
    });

    // Trigger automation
    await triggerAutomation('order.created', {
      tenantId: req.user.tenant_id,
      orderId: order.id,
      order
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
});

// ===============================================
// UPDATE ORDER
// ===============================================

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   put:
 *     summary: Update order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               confirmationStatus:
 *                 type: string
 *               deliveryStatus:
 *                 type: string
 *               trackingNumber:
 *                 type: string
 *               deliveryNotes:
 *                 type: string
 *               internalNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       404:
 *         description: Order not found
 */
router.put('/:id', [
  param('id').isUUID().withMessage('Invalid order ID'),
  ...updateOrderValidation
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const orderId = req.params.id;
    const updateData = req.body;

    // Get current order
    const currentOrder = await Order.findById(orderId, req.user.tenant_id);
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order
    const updatedOrder = await Order.update(orderId, updateData, req.user.tenant_id);

    // Create audit log for status changes
    const statusFields = ['status', 'confirmationStatus', 'deliveryStatus'];
    for (const field of statusFields) {
      if (updateData[field] && updateData[field] !== currentOrder[field]) {
        await createAuditLog({
          tenantId: req.user.tenant_id,
          userId: req.user.id,
          action: `order.${field}_changed`,
          resource: 'order',
          resourceId: orderId,
          metadata: {
            orderNumber: currentOrder.orderNumber,
            from: currentOrder[field],
            to: updateData[field]
          }
        });

        // Trigger automation for status changes
        await triggerAutomation(`order.${field}_changed`, {
          tenantId: req.user.tenant_id,
          orderId,
          order: updatedOrder,
          previousValue: currentOrder[field],
          newValue: updateData[field]
        });
      }
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order'
    });
  }
});

// ===============================================
// SYNC ORDER WITH DELIVERY PROVIDER
// ===============================================

/**
 * @swagger
 * /api/v1/orders/{id}/sync:
 *   post:
 *     summary: Sync order with delivery provider
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order synced successfully
 *       404:
 *         description: Order not found
 */
router.post('/:id/sync', [
  param('id').isUUID().withMessage('Invalid order ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const orderId = req.params.id;
    const order = await Order.findById(orderId, req.user.tenant_id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.deliveryProviderId) {
      return res.status(400).json({
        success: false,
        message: 'No delivery provider assigned to this order'
      });
    }

    if (order.syncStatus === 'synced') {
      return res.status(400).json({
        success: false,
        message: 'Order is already synced'
      });
    }

    // Sync with delivery provider
    const deliveryService = new DeliveryProviderService(req.user.tenant_id);
    const syncResult = await deliveryService.syncOrder(order);

    // Update order with sync result
    await Order.update(orderId, {
      syncStatus: syncResult.success ? 'synced' : 'failed',
      syncError: syncResult.error || null,
      trackingNumber: syncResult.trackingNumber || order.trackingNumber,
      lastSyncAt: new Date()
    }, req.user.tenant_id);

    // Create audit log
    await createAuditLog({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      action: syncResult.success ? 'order.sync_success' : 'order.sync_failed',
      resource: 'order',
      resourceId: orderId,
      metadata: {
        orderNumber: order.orderNumber,
        deliveryProvider: order.deliveryProviderName,
        trackingNumber: syncResult.trackingNumber,
        error: syncResult.error
      }
    });

    res.json({
      success: true,
      message: syncResult.success ? 'Order synced successfully' : 'Order sync failed',
      data: {
        syncStatus: syncResult.success ? 'synced' : 'failed',
        trackingNumber: syncResult.trackingNumber,
        error: syncResult.error
      }
    });

  } catch (error) {
    console.error('Sync order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync order'
    });
  }
});

// ===============================================
// BULK OPERATIONS
// ===============================================

/**
 * @swagger
 * /api/v1/orders/bulk/sync:
 *   post:
 *     summary: Bulk sync orders with delivery providers
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               filters:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                   deliveryProvider:
 *                     type: string
 *     responses:
 *       200:
 *         description: Bulk sync initiated
 */
router.post('/bulk/sync', requireRole(['owner', 'admin', 'manager']), async (req, res) => {
  try {
    const { orderIds, filters } = req.body;

    let orders;
    if (orderIds && orderIds.length > 0) {
      orders = await Order.findByIds(orderIds, req.user.tenant_id);
    } else if (filters) {
      orders = await Order.findAll({
        tenantId: req.user.tenant_id,
        ...filters,
        syncStatus: 'pending'
      }, { limit: 100 });
      orders = orders.orders;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either orderIds or filters must be provided'
      });
    }

    if (orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders found to sync'
      });
    }

    // Queue bulk sync job
    const { addJob } = require('../jobs/queue');
    const job = await addJob('bulk-sync-orders', {
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      orderIds: orders.map(o => o.id)
    });

    // Create audit log
    await createAuditLog({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      action: 'orders.bulk_sync_initiated',
      resource: 'order',
      metadata: {
        orderCount: orders.length,
        jobId: job.id
      }
    });

    res.json({
      success: true,
      message: `Bulk sync initiated for ${orders.length} orders`,
      data: {
        jobId: job.id,
        orderCount: orders.length
      }
    });

  } catch (error) {
    console.error('Bulk sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate bulk sync'
    });
  }
});

// ===============================================
// ORDER STATISTICS
// ===============================================

/**
 * @swagger
 * /api/v1/orders/stats:
 *   get:
 *     summary: Get order statistics
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: Order statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const stats = await Order.getStatistics(req.user.tenant_id, period);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics'
    });
  }
});

module.exports = router;