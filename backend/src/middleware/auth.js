const { verifyToken } = require('../utils/jwt');
const { User } = require('../models/User');

/**
 * Authenticate user with JWT token
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Get user with tenant info
    const user = await User.findByIdWithTenant(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Check tenant status
    if (user.tenant.subscription_status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account subscription is not active'
      });
    }

    // Add user to request
    req.user = user;
    req.tenant = user.tenant;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
}

/**
 * Require specific role(s)
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Require specific permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Owner and admin have all permissions
    if (['owner', 'admin'].includes(req.user.role)) {
      return next();
    }

    // Check specific permission
    const permissions = req.user.permissions ? JSON.parse(req.user.permissions) : [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    next();
  };
}

/**
 * Optional authentication (for public endpoints that can benefit from user context)
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await User.findByIdWithTenant(decoded.userId);
        if (user && user.is_active) {
          req.user = user;
          req.tenant = user.tenant;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

/**
 * Check if user can access resource
 */
function canAccess(resource, action = 'read') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = req.user;

    // Owner can access everything
    if (user.role === 'owner') {
      return next();
    }

    // Admin can access most things
    if (user.role === 'admin') {
      // Restrict some sensitive actions
      if (resource === 'billing' && action === 'write') {
        return res.status(403).json({
          success: false,
          message: 'Only owners can modify billing settings'
        });
      }
      if (resource === 'users' && action === 'delete') {
        return res.status(403).json({
          success: false,
          message: 'Only owners can delete users'
        });
      }
      return next();
    }

    // Manager permissions
    if (user.role === 'manager') {
      const managerResources = ['orders', 'customers', 'products', 'communications', 'analytics'];
      if (!managerResources.includes(resource)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }
      return next();
    }

    // Agent permissions
    if (user.role === 'agent') {
      const agentResources = ['orders', 'customers'];
      if (!agentResources.includes(resource)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      // Agents can only read analytics, not modify
      if (resource === 'analytics' && action !== 'read') {
        return res.status(403).json({
          success: false,
          message: 'Read-only access to analytics'
        });
      }

      return next();
    }

    // Viewer permissions
    if (user.role === 'viewer') {
      if (action !== 'read') {
        return res.status(403).json({
          success: false,
          message: 'Read-only access'
        });
      }
      return next();
    }

    // Default deny
    res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  optionalAuth,
  canAccess,
};