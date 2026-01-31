require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration (SQLite)
  database: {
    client: 'sqlite3',
    connection: {
      filename: './data/deliveryhub.db'
    },
    useNullAsDefault: true,
    pool: {
      min: 1,
      max: 1,
    },
  },

  // Redis Configuration (Disabled)
  redis: {
    enabled: false,
    host: 'localhost',
    port: 6379,
    password: null,
    db: 0,
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-testing-only',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key!!',
    algorithm: 'aes-256-gcm',
  },

  // Email Configuration (Disabled for testing)
  email: {
    enabled: false,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: '',
      pass: '',
    },
    from: 'noreply@deliveryhub.ma',
  },

  // WhatsApp Business API (Disabled for testing)
  whatsapp: {
    enabled: false,
    apiVersion: 'v20.0',
    baseUrl: 'https://graph.facebook.com',
    webhookVerifyToken: '',
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    cdnUrl: process.env.CDN_URL || null,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 1000, // Higher limit for testing
  },

  // Pagination
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT) || 20,
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT) || 100,
  },

  // Background Jobs (Disabled)
  jobs: {
    enabled: false,
    concurrency: 1,
    attempts: 1,
    backoffDelay: 5000,
  },

  // Delivery Providers (Mock for testing)
  deliveryProviders: {
    // Mock providers for testing
    test: {
      baseUrl: 'http://localhost:3000/mock',
      timeout: 5000,
    },
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 8, // Lower for testing
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 60 * 60 * 1000, // 1 hour
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 10, // Higher for testing
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 5 * 60 * 1000, // 5 minutes
  },

  // Frontend URLs
  frontend: {
    appUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    adminUrl: process.env.ADMIN_URL || 'http://localhost:3002',
  },

  // Feature Flags (Most disabled for testing)
  features: {
    enableWhatsApp: false,
    enableSMS: false,
    enableEmail: false,
    enableAutomation: false,
    enableAnalytics: true,
    enableWebhooks: false,
    enableBackgroundJobs: false,
  },

  // Testing mode
  testing: {
    enabled: true,
    mockDeliveryProviders: true,
    skipEmailVerification: true,
    allowTestData: true,
  },
};

module.exports = config;