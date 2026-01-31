// Simple test server to verify the platform structure
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Basic middleware
app.use(express.json());
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'DeliveryHub Test Server is running!'
  });
});

// API info
app.get('/api/v1/info', (req, res) => {
  res.json({
    name: 'DeliveryHub API',
    version: '1.0.0',
    description: 'Multi-tenant SaaS platform for e-commerce order management',
    features: [
      'Order Management',
      'Multi-tenant Architecture', 
      'Delivery Provider Integration',
      'WhatsApp Business API',
      'Analytics & Reporting',
      'User Management'
    ],
    status: 'Test Mode - SQLite',
    database: 'SQLite (File-based)',
    cache: 'Disabled (File-based sessions)',
    background_jobs: 'Disabled'
  });
});

// Mock login endpoint
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@test.com' && password === 'Admin123!') {
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: 'test-user-id',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      },
      token: 'test-jwt-token-' + Date.now(),
      tenant: {
        id: 'test-tenant-id',
        name: 'Test Company',
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

// Mock orders endpoint
app.get('/api/v1/orders', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        orderNumber: 'ORD-001',
        customerName: 'Ahmed Benali',
        customerPhone: '+212600123456',
        city: 'Casablanca',
        totalAmount: 299.99,
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      {
        id: '2', 
        orderNumber: 'ORD-002',
        customerName: 'Fatima Zahra',
        customerPhone: '+212600789012',
        city: 'Rabat',
        totalAmount: 150.00,
        status: 'shipped',
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

// File structure info
app.get('/api/v1/system/info', (req, res) => {
  const checkFile = (filePath) => {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  };

  const systemInfo = {
    platform: 'DeliveryHub SaaS',
    mode: 'Test/Development',
    files: {
      backend: {
        server: checkFile('./backend/src/server.js'),
        config: checkFile('./backend/src/config/index.js'),
        database: checkFile('./backend/src/database/connection.js'),
        models: {
          user: checkFile('./backend/src/models/User.js'),
          order: checkFile('./backend/src/models/Order.js'),
          tenant: checkFile('./backend/src/models/Tenant.js')
        },
        routes: {
          auth: checkFile('./backend/src/routes/auth.js'),
          orders: checkFile('./backend/src/routes/orders.js')
        },
        services: {
          deliveryProvider: checkFile('./backend/src/services/deliveryProviderService.js')
        }
      },
      frontend: {
        app: checkFile('./frontend/src/App.jsx'),
        dashboard: checkFile('./frontend/src/pages/dashboard/DashboardPage.jsx'),
        auth: checkFile('./frontend/src/contexts/AuthContext.jsx')
      },
      database: {
        schema: checkFile('./database-schema.sql'),
        sqlite: checkFile('./backend/src/database/sqlite.js')
      },
      deployment: {
        docker: checkFile('./docker-compose.yml'),
        env: checkFile('./.env'),
        readme: checkFile('./README.md')
      }
    },
    next_steps: [
      '1. Install Docker or use local setup',
      '2. Run database migrations',
      '3. Create admin user',
      '4. Start backend and frontend services',
      '5. Access application at http://localhost:3001'
    ]
  };

  res.json(systemInfo);
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 DeliveryHub Test Server Started!');
  console.log('=====================================');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Info: http://localhost:${PORT}/api/v1/info`);
  console.log(`🔧 System: http://localhost:${PORT}/api/v1/system/info`);
  console.log('=====================================');
  console.log('');
  console.log('🧪 Test Credentials:');
  console.log('Email: admin@test.com');
  console.log('Password: Admin123!');
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('• GET  /health - Health check');
  console.log('• GET  /api/v1/info - API information');
  console.log('• POST /api/v1/auth/login - Mock login');
  console.log('• GET  /api/v1/orders - Mock orders');
  console.log('• GET  /api/v1/system/info - System status');
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('1. Test this server in your browser');
  console.log('2. Install Docker for full setup');
  console.log('3. Or use local PostgreSQL setup');
  console.log('4. Run frontend with: cd frontend && npm install && npm run dev');
});