const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis connection refused');
          return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Redis retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });
  }

  async init() {
    try {
      await this.client.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  async set(key, value, expiration = null) {
    try {
      const serializedValue = JSON.stringify(value);
      if (expiration) {
        return await this.client.setEx(key, expiration, serializedValue);
      }
      return await this.client.set(key, serializedValue);
    } catch (error) {
      logger.error('Redis SET error:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      throw error;
    }
  }

  async del(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', error);
      throw error;
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      throw error;
    }
  }

  async cacheUserContext(userId, context, expiration = 300) {
    const key = `user:${userId}:context`;
    return await this.set(key, context, expiration);
  }

  async getUserContext(userId) {
    const key = `user:${userId}:context`;
    return await this.get(key);
  }

  async cacheSuggestions(userId, suggestions, expiration = 600) {
    const key = `user:${userId}:suggestions`;
    return await this.set(key, suggestions, expiration);
  }

  async getSuggestions(userId) {
    const key = `user:${userId}:suggestions`;
    return await this.get(key);
  }
}

module.exports = new RedisClient();