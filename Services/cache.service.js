const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.memoryCache = new Map(); // Fallback cache
    this.memoryTTL = new Map(); // Store TTL for memory cache
    
    // Only try to connect to Redis if it's available
    this.initializeRedis();

    // Clean expired memory cache entries every 5 minutes
    setInterval(() => {
      this.cleanMemoryCache();
    }, 5 * 60 * 1000);

    // Default TTL (Time To Live) values in seconds
    this.TTL = {
      SHORT: 5 * 60,        // 5 minutes - for dynamic data
      MEDIUM: 30 * 60,      // 30 minutes - for semi-static data
      LONG: 2 * 60 * 60,    // 2 hours - for static data
      VERY_LONG: 24 * 60 * 60, // 24 hours - for rarely changing data
    };
  }

  async initializeRedis() {
    try {
      // Check if REDIS_URL is provided (for cloud Redis like Redis Cloud)
      if (process.env.REDIS_URL) {
        console.log('🔗 Connecting to Redis using REDIS_URL...');
        
        const options = {
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          connectTimeout: 10000,
          retryStrategy(times) {
            if (times > 5) return null; // Stop retrying after 5 attempts
            return Math.min(times * 200, 2000);
          }
        };
        
        // Only add TLS if using rediss:// (SSL)
        if (process.env.REDIS_URL.startsWith('rediss://')) {
          options.tls = {};
        }
        
        this.redis = new Redis(process.env.REDIS_URL, options);
      } else {
        // Fallback to individual Redis config (for local development)
        this.redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || null,
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          connectTimeout: 5000,
        });
      }

      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        if (!this._hasLoggedError) {
          console.log('⚠️ Redis unavailable - using memory cache');
          this._hasLoggedError = true;
        }
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        this._hasLoggedError = false; // Reset error flag when connection closes
      });

      // Test connection
      await this.redis.ping();
      this.isConnected = true;
    } catch (error) {
      console.log('📦 Cache Service: Using memory cache (Redis not available)');
      this.isConnected = false;
      this.redis = null;
    }
  }

  cleanMemoryCache() {
    const now = Date.now();
    for (const [key, expiry] of this.memoryTTL.entries()) {
      if (now > expiry) {
        this.memoryCache.delete(key);
        this.memoryTTL.delete(key);
      }
    }
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached data or null
   */
  async get(key) {
    if (this.isConnected && this.redis) {
      try {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error(`Redis get error for key ${key}:`, error.message);
        // Fall back to memory cache
      }
    }
    
    // Memory cache fallback
    const now = Date.now();
    const expiry = this.memoryTTL.get(key);
    
    if (expiry && now > expiry) {
      this.memoryCache.delete(key);
      this.memoryTTL.delete(key);
      return null;
    }
    
    return this.memoryCache.get(key) || null;
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, data, ttl = this.TTL.MEDIUM) {
    if (this.isConnected && this.redis) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(data));
        return true;
      } catch (error) {
        console.error(`Redis set error for key ${key}:`, error.message);
        // Fall back to memory cache
      }
    }
    
    // Memory cache fallback
    this.memoryCache.set(key, data);
    this.memoryTTL.set(key, Date.now() + (ttl * 1000));
    return true;
  }

  /**
   * Delete data from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    if (this.isConnected && this.redis) {
      try {
        await this.redis.del(key);
        return true;
      } catch (error) {
        console.error(`Redis del error for key ${key}:`, error.message);
      }
    }
    
    // Memory cache fallback
    this.memoryCache.delete(key);
    this.memoryTTL.delete(key);
    return true;
  }

  /**
   * Delete multiple keys matching pattern
   * @param {string} pattern - Pattern to match (e.g., 'user:*')
   * @returns {Promise<boolean>} - Success status
   */
  async delPattern(pattern) {
    if (!this.isConnected || !this.redis) {
      return true; // Fallback: pretend success
    }
    
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Exists status
   */
  async exists(key) {
    if (!this.isConnected || !this.redis) {
      return false; // Fallback: doesn't exist
    }
    
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment a value in cache
   * @param {string} key - Cache key
   * @param {number} increment - Increment value (default: 1)
   * @returns {Promise<number|null>} - New value or null
   */
  async incr(key, increment = 1) {
    try {
      return await this.redis.incrby(key, increment);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set expiry for existing key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async expire(key, ttl) {
    try {
      await this.redis.expire(key, ttl);
      return true;
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache stats
   * @returns {Promise<object>} - Cache statistics
   */
  async getStats() {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: this.redis.status === 'ready'
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { connected: false };
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>} - Success status
   */
  async flushAll() {
    try {
      await this.redis.flushall();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Cache wrapper for functions
   * @param {string} key - Cache key
   * @param {Function} fn - Function to execute if cache miss
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} - Cached or fresh data
   */
  async wrap(key, fn, ttl = this.TTL.MEDIUM) {
    try {
      // If Redis is not available, just execute the function
      if (!this.isConnected || !this.redis) {
        console.log(`🔄 Cache unavailable for key: ${key} - executing function`);
        return await fn();
      }

      // Try to get from cache first
      let data = await this.get(key);
      
      if (data !== null) {
        console.log(`📦 Cache hit for key: ${key}`);
        return data;
      }

      // Cache miss - execute function
      console.log(`🔄 Cache miss for key: ${key}`);
      data = await fn();
      
      // Store in cache
      await this.set(key, data, ttl);
      
      return data;
    } catch (error) {
      console.error(`Cache wrap error for key ${key}:`, error);
      // If cache fails, still return function result
      return await fn();
    }
  }

  /**
   * Generate cache keys
   */
  generateKey = {
    tenant: (tenantId) => `tenant:${tenantId}`,
    tenants: (filters = '') => `tenants:${JSON.stringify(filters)}`,
    user: (userId) => `user:${userId}`,
    users: (tenantId, filters = '') => `users:${tenantId}:${JSON.stringify(filters)}`,
    class: (classId) => `class:${classId}`,
    classes: (tenantId) => `classes:${tenantId}`,
    systemAnalytics: () => 'system:analytics',
    tenantAnalytics: (tenantId) => `analytics:${tenantId}`,
    subjects: (tenantId) => `subjects:${tenantId}`,
    assignments: (classId) => `assignments:${classId}`,
    notifications: (userId) => `notifications:${userId}`,
  };

  /**
   * Invalidate related cache entries
   */
  invalidate = {
    tenant: async (tenantId) => {
      await this.delPattern(`tenant:${tenantId}*`);
      await this.delPattern(`users:${tenantId}*`);
      await this.delPattern(`classes:${tenantId}*`);
      await this.delPattern(`analytics:${tenantId}*`);
    },
    
    user: async (userId, tenantId) => {
      await this.del(this.generateKey.user(userId));
      await this.delPattern(`users:${tenantId}*`);
    },
    
    systemData: async () => {
      await this.del(this.generateKey.systemAnalytics());
      await this.delPattern('tenants:*');
    },
    
    class: async (classId, tenantId) => {
      await this.del(this.generateKey.class(classId));
      await this.del(this.generateKey.classes(tenantId));
      await this.delPattern(`assignments:${classId}*`);
    }
  };
}

// Export singleton instance
module.exports = new CacheService();
