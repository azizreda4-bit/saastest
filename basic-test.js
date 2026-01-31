// Basic test server using only Node.js built-in modules
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// Helper function to send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

// Helper function to check if file exists
function checkFile(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Routes
  if (pathname === '/health' && method === 'GET') {
    sendJSON(res, 200, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'DeliveryHub Test Server is running!',
      version: '1.0.0'
    });
  }
  
  else if (pathname === '/api/v1/info' && method === 'GET') {
    sendJSON(res, 200, {
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
      status: 'Test Mode - Basic Server',
      database: 'Not connected (Test mode)',
      cache: 'Disabled',
      background_jobs: 'Disabled'
    });
  }
  
  else if (pathname === '/api/v1/auth/login' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        
        if (email === 'admin@test.com' && password === 'Admin123!') {
          sendJSON(res, 200, {
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
          sendJSON(res, 401, {
            success: false,
            message: 'Invalid credentials'
          });
        }
      } catch (error) {
        sendJSON(res, 400, {
          success: false,
          message: 'Invalid JSON'
        });
      }
    });
  }
  
  else if (pathname === '/api/v1/orders' && method === 'GET') {
    sendJSON(res, 200, {
      success: true,
      data: [
        {
          id: '1',
          orderNumber: 'ORD-001',
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
          orderNumber: 'ORD-002',
          customerName: 'Fatima Zahra',
          customerPhone: '+212600789012',
          customerAddress: '456 Avenue Hassan II, Rabat',
          city: 'Rabat',
          totalAmount: 150.00,
          status: 'shipped',
          deliveryProvider: 'Coliix',
          trackingNumber: 'COL123456789',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '3',
          orderNumber: 'ORD-003',
          customerName: 'Youssef Alami',
          customerPhone: '+212600345678',
          customerAddress: '789 Boulevard Zerktouni, Marrakech',
          city: 'Marrakech',
          totalAmount: 75.50,
          status: 'delivered',
          deliveryProvider: 'Sendit',
          trackingNumber: 'SND987654321',
          createdAt: new Date(Date.now() - 172800000).toISOString()
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 3,
        pages: 1
      }
    });
  }
  
  else if (pathname === '/api/v1/system/info' && method === 'GET') {
    const systemInfo = {
      platform: 'DeliveryHub SaaS Platform',
      mode: 'Test/Development',
      timestamp: new Date().toISOString(),
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
            orders: checkFile('./backend/src/routes/orders.js'),
            index: checkFile('./backend/src/routes/index.js')
          },
          services: {
            deliveryProvider: checkFile('./backend/src/services/deliveryProviderService.js')
          },
          middleware: {
            auth: checkFile('./backend/src/middleware/auth.js'),
            errorHandler: checkFile('./backend/src/middleware/errorHandler.js')
          },
          utils: {
            jwt: checkFile('./backend/src/utils/jwt.js'),
            redis: checkFile('./backend/src/utils/redis.js'),
            swagger: checkFile('./backend/src/utils/swagger.js')
          }
        },
        frontend: {
          app: checkFile('./frontend/src/App.jsx'),
          dashboard: checkFile('./frontend/src/pages/dashboard/DashboardPage.jsx'),
          auth: checkFile('./frontend/src/contexts/AuthContext.jsx'),
          package: checkFile('./frontend/package.json'),
          viteConfig: checkFile('./frontend/vite.config.js')
        },
        database: {
          schema: checkFile('./database-schema.sql'),
          sqlite: checkFile('./backend/src/database/sqlite.js'),
          connection: checkFile('./backend/src/database/connection.js')
        },
        deployment: {
          docker: checkFile('./docker-compose.yml'),
          env: checkFile('./.env'),
          envExample: checkFile('./.env.example'),
          readme: checkFile('./README.md'),
          deployment: checkFile('./DEPLOYMENT.md'),
          nextSteps: checkFile('./NEXT-STEPS.md')
        },
        scripts: {
          quickStart: checkFile('./scripts/quick-start.sh'),
          createAdmin: checkFile('./scripts/create-admin.js'),
          migrate: checkFile('./scripts/migrate-from-sheets.js'),
          export: checkFile('./scripts/export-sheets-data.js')
        }
      },
      setup_options: [
        {
          name: 'Docker Setup (Recommended)',
          description: 'Full production-like environment',
          requirements: ['Docker', 'Docker Compose'],
          steps: [
            'Install Docker Desktop',
            'Run: docker-compose up -d',
            'Access: http://localhost:3001'
          ]
        },
        {
          name: 'Local Setup',
          description: 'Direct installation on Windows',
          requirements: ['Node.js', 'PostgreSQL', 'Redis (optional)'],
          steps: [
            'Install PostgreSQL',
            'Run: npm install in backend/',
            'Run: npm install in frontend/',
            'Run database migrations',
            'Start services manually'
          ]
        },
        {
          name: 'SQLite Test Setup',
          description: 'Simplified testing with SQLite',
          requirements: ['Node.js only'],
          steps: [
            'Run: node backend/scripts/migrate-sqlite.js',
            'Run: npm run dev in backend/',
            'Run: npm run dev in frontend/'
          ]
        }
      ],
      next_steps: [
        '1. Choose setup option above',
        '2. Install required dependencies',
        '3. Run database migrations',
        '4. Create admin user',
        '5. Start backend and frontend services',
        '6. Access application at http://localhost:3001'
      ]
    };

    sendJSON(res, 200, systemInfo);
  }
  
  else if (pathname === '/' && method === 'GET') {
    // Serve a simple HTML page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>DeliveryHub Test Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2563eb; margin-bottom: 20px; }
        .status { background: #10b981; color: white; padding: 10px; border-radius: 4px; margin: 20px 0; }
        .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #2563eb; }
        .method { background: #2563eb; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
        .credentials { background: #fef3c7; padding: 15px; border-radius: 4px; margin: 20px 0; }
        ul { margin: 10px 0; padding-left: 20px; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 DeliveryHub Test Server</h1>
        
        <div class="status">
            ✅ Server is running successfully!
        </div>
        
        <h2>📋 Available Endpoints</h2>
        
        <div class="endpoint">
            <span class="method">GET</span> <a href="/health">/health</a>
            <p>Health check endpoint</p>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <a href="/api/v1/info">/api/v1/info</a>
            <p>API information and features</p>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <a href="/api/v1/system/info">/api/v1/system/info</a>
            <p>System status and file structure</p>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> /api/v1/auth/login
            <p>Mock authentication endpoint</p>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <a href="/api/v1/orders">/api/v1/orders</a>
            <p>Mock orders data</p>
        </div>
        
        <div class="credentials">
            <h3>🧪 Test Credentials</h3>
            <ul>
                <li><strong>Email:</strong> admin@test.com</li>
                <li><strong>Password:</strong> Admin123!</li>
            </ul>
        </div>
        
        <h2>🎯 Next Steps</h2>
        <ol>
            <li>Test the endpoints above</li>
            <li>Check <a href="/api/v1/system/info">system info</a> for file structure</li>
            <li>Install Docker for full setup</li>
            <li>Or set up PostgreSQL for local development</li>
            <li>Install frontend dependencies and start React app</li>
        </ol>
        
        <h2>📚 Documentation</h2>
        <ul>
            <li><a href="./README.md">README.md</a> - Project overview</li>
            <li><a href="./DEPLOYMENT.md">DEPLOYMENT.md</a> - Deployment guide</li>
            <li><a href="./NEXT-STEPS.md">NEXT-STEPS.md</a> - Next steps</li>
            <li><a href="./DOCKER-SETUP.md">DOCKER-SETUP.md</a> - Docker installation</li>
            <li><a href="./LOCAL-SETUP.md">LOCAL-SETUP.md</a> - Local development</li>
        </ul>
    </div>
</body>
</html>
    `);
  }
  
  else {
    sendJSON(res, 404, {
      success: false,
      message: 'Endpoint not found',
      available_endpoints: [
        'GET /',
        'GET /health',
        'GET /api/v1/info',
        'GET /api/v1/system/info',
        'POST /api/v1/auth/login',
        'GET /api/v1/orders'
      ]
    });
  }
});

// Start server
server.listen(PORT, () => {
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
  console.log('🎯 Open http://localhost:3000 in your browser to get started!');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});