// Netlify Function for API endpoints
const express = require('express');
const serverless = require('serverless-http');

// Import your existing server configuration
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for Netlify
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-ID');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'DeliveryHub API running on Netlify Functions',
    version: '1.0.0',
    environment: 'netlify'
  });
});

// System info
app.get('/api/v1/system/info', (req, res) => {
  res.json({
    platform: 'DeliveryHub SaaS',
    mode: 'Production/Netlify',
    timestamp: new Date().toISOString(),
    environment: 'netlify-functions',
    features: [
      'Frontend deployed on Netlify',
      'API running on Netlify Functions',
      'Serverless architecture',
      'Global CDN',
      'Auto-scaling'
    ],
    status: 'operational'
  });
});

// Mock authentication
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@test.com' && password === 'Admin123!') {
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: 'netlify-user-id',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      },
      token: 'netlify-jwt-token-' + Date.now(),
      tenant: {
        id: 'netlify-tenant-id',
        name: 'Netlify Demo Company',
        plan: 'professional'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Mock orders
app.get('/api/v1/orders', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        orderNumber: 'NET-001',
        customerName: 'Ahmed Benali',
        customerPhone: '+212600123456',
        customerAddress: '123 Rue Mohammed V, Casablanca',
        city: 'Casablanca',
        totalAmount: 299.99,
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        orderNumber: 'NET-002',
        customerName: 'Fatima Zahra',
        customerPhone: '+212600789012',
        customerAddress: '456 Avenue Hassan II, Rabat',
        city: 'Rabat',
        totalAmount: 150.00,
        status: 'delivered',
        deliveryProvider: 'Coliix',
        trackingNumber: 'COL123456789',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      pages: 1
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    available_endpoints: [
      'GET /api/health',
      'GET /api/v1/system/info',
      'POST /api/v1/auth/login',
      'GET /api/v1/orders'
    ]
  });
});

// Export as Netlify Function
module.exports.handler = serverless(app);