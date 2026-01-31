require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'deliveryhub',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
    },
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0,
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key!!',
    algorithm: 'aes-256-gcm',
  },

  // Email Configuration (Nodemailer)
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.EMAIL_FROM || 'noreply@deliveryhub.ma',
  },

  // WhatsApp Business API
  whatsapp: {
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
    baseUrl: process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  },

  // SMS Configuration (Twilio)
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
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
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // requests per window
  },

  // Pagination
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT) || 20,
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT) || 100,
  },

  // Background Jobs
  jobs: {
    concurrency: parseInt(process.env.JOB_CONCURRENCY) || 5,
    attempts: parseInt(process.env.JOB_ATTEMPTS) || 3,
    backoffDelay: parseInt(process.env.JOB_BACKOFF_DELAY) || 5000,
  },

  // Delivery Providers
  deliveryProviders: {
    // Coliix
    coliix: {
      baseUrl: 'https://my.coliix.com/casa/seller/api-parcels',
      timeout: 30000,
    },
    
    // Cathedis
    cathedis: {
      baseUrl: 'https://api.cathedis.delivery',
      loginUrl: 'https://api.cathedis.delivery/login.jsp',
      timeout: 30000,
    },
    
    // Forcelog
    forcelog: {
      baseUrl: 'https://api.forcelog.ma',
      timeout: 30000,
    },
    
    // Sendit
    sendit: {
      baseUrl: 'https://app.sendit.ma/api/v1',
      timeout: 30000,
    },
    
    // Add other providers...
  },

  // Webhook Configuration
  webhooks: {
    maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY) || 5000,
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT) || 10000,
  },

  // Analytics & Reporting
  analytics: {
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 365,
    aggregationInterval: process.env.ANALYTICS_AGGREGATION_INTERVAL || '1 hour',
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 60 * 60 * 1000, // 1 hour
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutes
  },

  // Frontend URLs
  frontend: {
    appUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    adminUrl: process.env.ADMIN_URL || 'http://localhost:3002',
  },

  // Subscription & Billing
  billing: {
    currency: process.env.DEFAULT_CURRENCY || 'MAD',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  // Monitoring & Logging
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    sentryDsn: process.env.SENTRY_DSN,
    enableMetrics: process.env.ENABLE_METRICS === 'true',
  },

  // Feature Flags
  features: {
    enableWhatsApp: process.env.ENABLE_WHATSAPP !== 'false',
    enableSMS: process.env.ENABLE_SMS !== 'false',
    enableEmail: process.env.ENABLE_EMAIL !== 'false',
    enableAutomation: process.env.ENABLE_AUTOMATION !== 'false',
    enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
    enableWebhooks: process.env.ENABLE_WEBHOOKS !== 'false',
  },
};

// Validation
const requiredEnvVars = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
];

if (config.nodeEnv === 'production') {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
  }
}

module.exports = config;