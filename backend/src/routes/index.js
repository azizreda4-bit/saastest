const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const tenantRoutes = require('./tenants');
const userRoutes = require('./users');
const orderRoutes = require('./orders');
const customerRoutes = require('./customers');
const productRoutes = require('./products');
const deliveryProviderRoutes = require('./deliveryProviders');
const communicationRoutes = require('./communications');
const automationRoutes = require('./automation');
const analyticsRoutes = require('./analytics');
const webhookRoutes = require('./webhooks');
const systemRoutes = require('./system');

// Middleware
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateTenant } = require('../middleware/tenant');
const { rateLimitByTenant } = require('../middleware/rateLimit');

// ===============================================
// PUBLIC ROUTES (No Authentication Required)
// ===============================================

// Authentication routes
router.use('/auth', authRoutes);

// Webhook endpoints (external services)
router.use('/webhooks', webhookRoutes);

// System status and health checks
router.use('/system', systemRoutes);

// ===============================================
// PROTECTED ROUTES (Authentication Required)
// ===============================================

// Apply authentication middleware to all protected routes
router.use(authenticateToken);

// Apply tenant validation middleware
router.use(validateTenant);

// Apply tenant-specific rate limiting
router.use(rateLimitByTenant);

// ===============================================
// TENANT MANAGEMENT ROUTES
// ===============================================

// Tenant management (admin only)
router.use('/tenants', requireRole(['owner', 'admin']), tenantRoutes);

// User management
router.use('/users', userRoutes);

// ===============================================
// CORE BUSINESS ROUTES
// ===============================================

// Order management
router.use('/orders', orderRoutes);

// Customer management
router.use('/customers', customerRoutes);

// Product management
router.use('/products', productRoutes);

// Delivery provider management
router.use('/delivery-providers', deliveryProviderRoutes);

// ===============================================
// COMMUNICATION & AUTOMATION
// ===============================================

// Communication (WhatsApp, SMS, Email)
router.use('/communications', communicationRoutes);

// Automation rules and workflows
router.use('/automation', automationRoutes);

// ===============================================
// ANALYTICS & REPORTING
// ===============================================

// Analytics and reporting
router.use('/analytics', analyticsRoutes);

// ===============================================
// API INFORMATION
// ===============================================

router.get('/', (req, res) => {
  res.json({
    name: 'DeliveryHub API',
    version: '1.0.0',
    description: 'Multi-Delivery Provider E-commerce Management Platform',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/v1/auth',
      orders: '/api/v1/orders',
      customers: '/api/v1/customers',
      products: '/api/v1/products',
      deliveryProviders: '/api/v1/delivery-providers',
      communications: '/api/v1/communications',
      automation: '/api/v1/automation',
      analytics: '/api/v1/analytics',
      users: '/api/v1/users',
      tenants: '/api/v1/tenants',
      webhooks: '/api/v1/webhooks',
      system: '/api/v1/system'
    },
    features: [
      'Multi-tenant SaaS architecture',
      '25+ delivery provider integrations',
      'WhatsApp Business API integration',
      'Automated order processing',
      'Real-time tracking and notifications',
      'Advanced analytics and reporting',
      'Workflow automation',
      'RESTful API with comprehensive documentation'
    ],
    supportedCountries: ['MA'],
    supportedLanguages: ['en', 'fr', 'ar'],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;