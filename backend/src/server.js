const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const winston = require('winston');
const expressWinston = require('express-winston');
require('dotenv').config();

const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const { setupSwagger } = require('./utils/swagger');
const { initializeDatabase } = require('./database');
const { initializeRedis } = require('./utils/redis');
const { startBackgroundJobs } = require('./jobs');

const app = express();

// ===============================================
// SECURITY & MIDDLEWARE SETUP
// ===============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, process.env.ADMIN_URL]
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
  
  app.use(expressWinston.logger({
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'logs/access.log' })
    ],
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.json()
    ),
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
    colorize: false,
  }));
}

// ===============================================
// HEALTH CHECK & STATUS
// ===============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/status', authenticateToken, async (req, res) => {
  try {
    const db = require('./database/connection');
    
    // Check database connection
    await db.raw('SELECT 1');
    
    // Check Redis connection
    const redis = require('./utils/redis');
    await redis.ping();
    
    res.json({
      status: 'operational',
      services: {
        database: 'healthy',
        redis: 'healthy',
        api: 'healthy'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===============================================
// API DOCUMENTATION
// ===============================================

setupSwagger(app);

// ===============================================
// API ROUTES
// ===============================================

app.use('/api/v1', routes);

// ===============================================
// ERROR HANDLING
// ===============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ===============================================
// SERVER INITIALIZATION
// ===============================================

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized');

    // Initialize Redis
    await initializeRedis();
    console.log('✅ Redis connected');

    // Start background jobs
    if (process.env.NODE_ENV !== 'test') {
      await startBackgroundJobs();
      console.log('✅ Background jobs started');
    }

    // Start server
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 DeliveryHub API Server running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;