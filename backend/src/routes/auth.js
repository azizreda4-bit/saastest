const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const config = require('../config');
const { User, Tenant } = require('../models');
const { sendEmail } = require('../services/emailService');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { createAuditLog } = require('../services/auditService');

// ===============================================
// RATE LIMITING FOR AUTH ENDPOINTS
// ===============================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    error: 'Too many registration attempts, please try again later.',
    retryAfter: '1 hour'
  },
});

// ===============================================
// VALIDATION RULES
// ===============================================

const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('tenantName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// ===============================================
// REGISTRATION ENDPOINT
// ===============================================

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new tenant and user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - tenantName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               tenantName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/register', registerLimiter, registerValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName, tenantName, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Generate tenant slug
    const tenantSlug = tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if tenant slug is available
    const existingTenant = await Tenant.findBySlug(tenantSlug);
    if (existingTenant) {
      return res.status(409).json({
        success: false,
        message: 'A company with this name already exists. Please choose a different name.'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create tenant and user in a transaction
    const db = require('../database/connection');
    const result = await db.transaction(async (trx) => {
      // Create tenant
      const [tenant] = await trx('tenants')
        .insert({
          name: tenantName,
          slug: tenantSlug,
          subscription_plan: 'starter',
          subscription_status: 'active',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        })
        .returning('*');

      // Create user
      const [user] = await trx('users')
        .insert({
          tenant_id: tenant.id,
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          phone,
          role: 'owner',
          is_active: true,
        })
        .returning(['id', 'email', 'first_name', 'last_name', 'role', 'tenant_id']);

      return { tenant, user };
    });

    // Generate tokens
    const tokens = generateTokens(result.user);

    // Create audit log
    await createAuditLog({
      tenantId: result.tenant.id,
      userId: result.user.id,
      action: 'user.registered',
      resource: 'user',
      resourceId: result.user.id,
      metadata: { email, tenantName }
    });

    // Send welcome email (async)
    sendEmail({
      to: email,
      subject: 'Welcome to DeliveryHub!',
      template: 'welcome',
      data: {
        firstName,
        tenantName,
        loginUrl: `${config.frontend.appUrl}/login`
      }
    }).catch(err => console.error('Failed to send welcome email:', err));

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          role: result.user.role,
        },
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          subscriptionPlan: result.tenant.subscription_plan,
        },
        tokens
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// ===============================================
// LOGIN ENDPOINT
// ===============================================

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate user and return tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 */
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user with tenant information
    const user = await User.findByEmailWithTenant(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check if tenant is active
    if (user.tenant.subscription_status !== 'active') {
      return res.status(423).json({
        success: false,
        message: 'Account subscription is not active. Please contact billing.'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // Log failed login attempt
      await createAuditLog({
        tenantId: user.tenant_id,
        userId: user.id,
        action: 'user.login_failed',
        resource: 'user',
        resourceId: user.id,
        metadata: { email, reason: 'invalid_password' }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Update last login
    await User.updateLastLogin(user.id);

    // Create audit log
    await createAuditLog({
      tenantId: user.tenant_id,
      userId: user.id,
      action: 'user.logged_in',
      resource: 'user',
      resourceId: user.id,
      metadata: { 
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          permissions: user.permissions || [],
        },
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          subscriptionPlan: user.tenant.subscription_plan,
          subscriptionStatus: user.tenant.subscription_status,
        },
        tokens
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// ===============================================
// TOKEN REFRESH ENDPOINT
// ===============================================

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Find user
    const user = await User.findByIdWithTenant(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

// ===============================================
// LOGOUT ENDPOINT
// ===============================================

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user and invalidate tokens
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    // In a production environment, you would add the token to a blacklist
    // For now, we'll just log the logout event
    
    await createAuditLog({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      action: 'user.logged_out',
      resource: 'user',
      resourceId: req.user.id,
      metadata: { 
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// ===============================================
// PASSWORD RESET REQUEST
// ===============================================

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post('/forgot-password', authLimiter, [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const { email } = req.body;
    const user = await User.findByEmail(email);

    // Always return success to prevent email enumeration
    const response = {
      success: true,
      message: 'If an account with this email exists, you will receive a password reset link.'
    };

    if (user && user.is_active) {
      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      // Store reset token in database
      const db = require('../database/connection');
      await db('password_reset_tokens').insert({
        user_id: user.id,
        token: resetToken,
        expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      // Send reset email
      await sendEmail({
        to: email,
        subject: 'Reset Your Password - DeliveryHub',
        template: 'password-reset',
        data: {
          firstName: user.first_name,
          resetUrl: `${config.frontend.appUrl}/reset-password?token=${resetToken}`
        }
      });

      // Log password reset request
      await createAuditLog({
        tenantId: user.tenant_id,
        userId: user.id,
        action: 'user.password_reset_requested',
        resource: 'user',
        resourceId: user.id,
        metadata: { email }
      });
    }

    res.json(response);

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

// ===============================================
// PASSWORD RESET CONFIRMATION
// ===============================================

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password format',
        errors: errors.array()
      });
    }

    const { token, password } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Check if token exists and is not used
    const db = require('../database/connection');
    const resetToken = await db('password_reset_tokens')
      .where({ token, user_id: decoded.userId })
      .whereNull('used_at')
      .where('expires_at', '>', new Date())
      .first();

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    // Update password and mark token as used
    await db.transaction(async (trx) => {
      await trx('users')
        .where({ id: decoded.userId })
        .update({ password_hash: passwordHash });

      await trx('password_reset_tokens')
        .where({ id: resetToken.id })
        .update({ used_at: new Date() });
    });

    // Log password reset
    await createAuditLog({
      userId: decoded.userId,
      action: 'user.password_reset_completed',
      resource: 'user',
      resourceId: decoded.userId,
      metadata: { tokenId: resetToken.id }
    });

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;