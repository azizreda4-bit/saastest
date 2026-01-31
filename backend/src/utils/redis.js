const Redis = require('ioredis');
const config = require('../config');

let redisClient = null;

/**
 * Initialize Redis connection
 */
async function initializeRedis() {
  try {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis ready');
    });

    // Test connection
    await redisClient.ping();
    
    return redisClient;
  } catch (error) {
    console.error('❌ Redis initialization failed:', error);
    throw error;
  }
}

/**
 * Get Redis client instance
 */
function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

/**
 * Cache operations
 */
const cache = {
  /**
   * Set cache value
   */
  async set(key, value, ttl = 3600) {
    const client = getRedisClient();
    const serializedValue = JSON.stringify(value);
    
    if (ttl) {
      return await client.setex(key, ttl, serializedValue);
    } else {
      return await client.set(key, serializedValue);
    }
  },

  /**
   * Get cache value
   */
  async get(key) {
    const client = getRedisClient();
    const value = await client.get(key);
    
    if (value) {
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    }
    
    return null;
  },

  /**
   * Delete cache value
   */
  async del(key) {
    const client = getRedisClient();
    return await client.del(key);
  },

  /**
   * Check if key exists
   */
  async exists(key) {
    const client = getRedisClient();
    return await client.exists(key);
  },

  /**
   * Set expiration
   */
  async expire(key, ttl) {
    const client = getRedisClient();
    return await client.expire(key, ttl);
  },

  /**
   * Get keys by pattern
   */
  async keys(pattern) {
    const client = getRedisClient();
    return await client.keys(pattern);
  },

  /**
   * Increment value
   */
  async incr(key) {
    const client = getRedisClient();
    return await client.incr(key);
  },

  /**
   * Decrement value
   */
  async decr(key) {
    const client = getRedisClient();
    return await client.decr(key);
  },
};

/**
 * Session operations
 */
const session = {
  /**
   * Set session
   */
  async set(sessionId, data, ttl = 3600) {
    return await cache.set(`session:${sessionId}`, data, ttl);
  },

  /**
   * Get session
   */
  async get(sessionId) {
    return await cache.get(`session:${sessionId}`);
  },

  /**
   * Delete session
   */
  async del(sessionId) {
    return await cache.del(`session:${sessionId}`);
  },

  /**
   * Extend session
   */
  async extend(sessionId, ttl = 3600) {
    return await cache.expire(`session:${sessionId}`, ttl);
  },
};

/**
 * Rate limiting operations
 */
const rateLimit = {
  /**
   * Check rate limit
   */
  async check(key, limit, window) {
    const client = getRedisClient();
    const current = await client.incr(key);
    
    if (current === 1) {
      await client.expire(key, window);
    }
    
    return {
      current,
      remaining: Math.max(0, limit - current),
      resetTime: await client.ttl(key),
      exceeded: current > limit,
    };
  },

  /**
   * Reset rate limit
   */
  async reset(key) {
    return await cache.del(key);
  },
};

/**
 * Pub/Sub operations
 */
const pubsub = {
  /**
   * Publish message
   */
  async publish(channel, message) {
    const client = getRedisClient();
    return await client.publish(channel, JSON.stringify(message));
  },

  /**
   * Subscribe to channel
   */
  subscribe(channel, callback) {
    const subscriber = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
    });

    subscriber.subscribe(channel);
    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          callback(message);
        }
      }
    });

    return subscriber;
  },
};

module.exports = {
  initializeRedis,
  getRedisClient,
  cache,
  session,
  rateLimit,
  pubsub,
  ping: () => redisClient?.ping(),
};