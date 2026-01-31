// Configuration spéciale pour Vercel
require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: 'production',
  
  // Database Configuration (Vercel Postgres)
  database: {
    connectionString: process.env.POSTGRES_URL,
    ssl: true,
    pool: {
      min: 0,
      max: 1, // Vercel serverless limitation
    },
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

  // Email Configuration (Optional)
  email: {
    enabled: false, // Disable for demo
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.EMAIL_FROM || 'noreply@deliveryhub.ma',
  },

  // WhatsApp Business API (Optional)
  whatsapp: {
    enabled: false, // Disable for demo
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
    baseUrl: process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    uploadPath: '/tmp', // Vercel tmp directory
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

  // Background Jobs (Disabled for serverless)
  jobs: {
    enabled: false,
    concurrency: 1,
    attempts: 1,
    backoffDelay: 5000,
  },

  // Delivery Providers
  deliveryProviders: {
    // Mock providers for demo
    test: {
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    },
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10, // Lower for serverless
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 60 * 60 * 1000, // 1 hour
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutes
  },

  // Frontend URLs
  frontend: {
    appUrl: process.env.FRONTEND_URL || 'https://your-app.vercel.app',
    adminUrl: process.env.ADMIN_URL || 'https://your-app.vercel.app',
  },

  // Feature Flags (Simplified for demo)
  features: {
    enableWhatsApp: false,
    enableSMS: false,
    enableEmail: false,
    enableAutomation: false,
    enableAnalytics: true,
    enableWebhooks: false,
    enableBackgroundJobs: false,
  },

  // Vercel specific
  vercel: {
    enabled: true,
    region: process.env.VERCEL_REGION || 'fra1',
    maxDuration: 30,
  },
};

module.exports = config;