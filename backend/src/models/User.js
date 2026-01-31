const db = require('../database/connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  /**
   * Find user by email
   */
  static async findByEmail(email) {
    return await db('users')
      .where('email', email)
      .first();
  }

  /**
   * Find user by email with tenant information
   */
  static async findByEmailWithTenant(email) {
    return await db('users as u')
      .select([
        'u.*',
        't.id as tenant_id',
        't.name as tenant_name',
        't.slug as tenant_slug',
        't.subscription_plan',
        't.subscription_status',
        't.settings as tenant_settings'
      ])
      .join('tenants as t', 'u.tenant_id', 't.id')
      .where('u.email', email)
      .where('t.deleted_at', null)
      .first();
  }

  /**
   * Find user by ID with tenant information
   */
  static async findByIdWithTenant(id) {
    return await db('users as u')
      .select([
        'u.*',
        't.id as tenant_id',
        't.name as tenant_name',
        't.slug as tenant_slug',
        't.subscription_plan',
        't.subscription_status'
      ])
      .join('tenants as t', 'u.tenant_id', 't.id')
      .where('u.id', id)
      .where('t.deleted_at', null)
      .first();
  }

  /**
   * Find all users for a tenant
   */
  static async findByTenant(tenantId, options = {}) {
    const { page = 1, limit = 20, role, isActive } = options;
    
    let query = db('users')
      .select([
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'phone',
        'is_active',
        'last_login_at',
        'created_at'
      ])
      .where('tenant_id', tenantId);

    if (role) {
      query = query.where('role', role);
    }

    if (typeof isActive === 'boolean') {
      query = query.where('is_active', isActive);
    }

    // Get total count
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('* as count');
    const total = parseInt(count);

    // Apply pagination
    const offset = (page - 1) * limit;
    const users = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Create new user
   */
  static async create(userData, trx = db) {
    const {
      tenantId,
      email,
      password,
      firstName,
      lastName,
      role = 'agent',
      phone,
      permissions = []
    } = userData;

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await trx('users')
      .insert({
        id: uuidv4(),
        tenant_id: tenantId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role,
        phone,
        permissions: JSON.stringify(permissions),
        is_active: true
      })
      .returning([
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'phone',
        'is_active',
        'created_at'
      ]);

    return user;
  }

  /**
   * Update user
   */
  static async update(id, updateData, tenantId, trx = db) {
    const allowedFields = [
      'first_name',
      'last_name',
      'phone',
      'role',
      'permissions',
      'is_active',
      'avatar_url',
      'two_factor_enabled'
    ];

    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    // Handle permissions array
    if (filteredData.permissions && Array.isArray(filteredData.permissions)) {
      filteredData.permissions = JSON.stringify(filteredData.permissions);
    }

    filteredData.updated_at = new Date();

    const [user] = await trx('users')
      .where('id', id)
      .where('tenant_id', tenantId)
      .update(filteredData)
      .returning([
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'phone',
        'permissions',
        'is_active',
        'updated_at'
      ]);

    return user;
  }

  /**
   * Update password
   */
  static async updatePassword(id, newPassword, tenantId, trx = db) {
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await trx('users')
      .where('id', id)
      .where('tenant_id', tenantId)
      .update({
        password_hash: passwordHash,
        updated_at: new Date()
      });

    return true;
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id, trx = db) {
    await trx('users')
      .where('id', id)
      .update({
        last_login_at: new Date()
      });
  }

  /**
   * Deactivate user
   */
  static async deactivate(id, tenantId, trx = db) {
    await trx('users')
      .where('id', id)
      .where('tenant_id', tenantId)
      .update({
        is_active: false,
        updated_at: new Date()
      });
  }

  /**
   * Check if user has permission
   */
  static hasPermission(user, permission) {
    // Owner and admin have all permissions
    if (['owner', 'admin'].includes(user.role)) {
      return true;
    }

    // Check specific permissions
    const permissions = user.permissions ? JSON.parse(user.permissions) : [];
    return permissions.includes(permission);
  }

  /**
   * Check if user has role
   */
  static hasRole(user, roles) {
    if (typeof roles === 'string') {
      return user.role === roles;
    }
    return roles.includes(user.role);
  }

  /**
   * Get user statistics for tenant
   */
  static async getStatistics(tenantId) {
    const stats = await db('users')
      .select([
        db.raw('COUNT(*) as total_users'),
        db.raw('COUNT(*) FILTER (WHERE is_active = true) as active_users'),
        db.raw('COUNT(*) FILTER (WHERE role = \'owner\') as owners'),
        db.raw('COUNT(*) FILTER (WHERE role = \'admin\') as admins'),
        db.raw('COUNT(*) FILTER (WHERE role = \'manager\') as managers'),
        db.raw('COUNT(*) FILTER (WHERE role = \'agent\') as agents'),
        db.raw('COUNT(*) FILTER (WHERE role = \'viewer\') as viewers'),
        db.raw('COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL \'30 days\') as active_last_30_days')
      ])
      .where('tenant_id', tenantId)
      .first();

    return {
      totalUsers: parseInt(stats.total_users) || 0,
      activeUsers: parseInt(stats.active_users) || 0,
      roleBreakdown: {
        owners: parseInt(stats.owners) || 0,
        admins: parseInt(stats.admins) || 0,
        managers: parseInt(stats.managers) || 0,
        agents: parseInt(stats.agents) || 0,
        viewers: parseInt(stats.viewers) || 0
      },
      activeLast30Days: parseInt(stats.active_last_30_days) || 0
    };
  }

  /**
   * Get user activity summary
   */
  static async getActivitySummary(userId, days = 30) {
    const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get session activity
    const sessionStats = await db('user_activity_sessions')
      .select([
        db.raw('COUNT(*) as total_sessions'),
        db.raw('SUM(duration_minutes) as total_minutes'),
        db.raw('SUM(actions_count) as total_actions'),
        db.raw('SUM(orders_created) as orders_created'),
        db.raw('SUM(orders_updated) as orders_updated')
      ])
      .where('user_id', userId)
      .where('session_start', '>=', dateThreshold)
      .first();

    // Get recent orders
    const recentOrders = await db('orders')
      .select(['id', 'order_number', 'status', 'total_amount', 'created_at'])
      .where('agent_id', userId)
      .where('created_at', '>=', dateThreshold)
      .orderBy('created_at', 'desc')
      .limit(10);

    return {
      period: `${days} days`,
      sessions: {
        totalSessions: parseInt(sessionStats.total_sessions) || 0,
        totalMinutes: parseInt(sessionStats.total_minutes) || 0,
        totalActions: parseInt(sessionStats.total_actions) || 0,
        averageSessionMinutes: sessionStats.total_sessions > 0 
          ? Math.round(sessionStats.total_minutes / sessionStats.total_sessions) 
          : 0
      },
      orders: {
        ordersCreated: parseInt(sessionStats.orders_created) || 0,
        ordersUpdated: parseInt(sessionStats.orders_updated) || 0,
        recentOrders
      }
    };
  }
}

module.exports = User;