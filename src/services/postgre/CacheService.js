import redis from "redis";
import logger from "../../utils/logger.js"; // pastikan path logger benar
import logger from '../../utils/logger.js';

export class CacheService {
  constructor() {
    this._client = redis.createClient({
      socket: {
        host: process.env.REDIS_SERVER,
      },
    });

    this._client.on("error", (error) => {
      logger.error(`[CacheService] Redis client error: ${error.message}`);
    });

    this._client.connect()
      .then(() => logger.info("[CacheService] Redis client connected"))
      .catch((error) => logger.error(`[CacheService] Redis connect failed: ${error.message}`));
  }

  async set(key, value, expirationInSecond = 1800) {
    try {
      await this._client.set(key, value, { EX: expirationInSecond });
      logger.info(`[CacheService] Cache set: ${key}`);
    } catch (error) {
      logger.error(`[CacheService] Failed to set cache for key ${key}: ${error.message}`);
      throw error;
    }
  }

  async get(key) {
    try {
      const result = await this._client.get(key);
      if (result === null) {
        logger.warn(`[CacheService] Cache miss for key: ${key}`);
        throw new Error("Cache tidak ditemukan");
      }
      logger.info(`[CacheService] Cache hit for key: ${key}`);
      return result;
    } catch (error) {
      logger.error(`[CacheService] Failed to get cache for key ${key}: ${error.message}`);
      throw error;
    }
  }

  async delete(key) {
    try {
      const deletedCount = await this._client.del(key);
      logger.info(`[CacheService] Cache deleted: ${key}, deletedCount=${deletedCount}`);
      return deletedCount;
    } catch (error) {
      logger.error(`[CacheService] Failed to delete cache for key ${key}: ${error.message}`);
      throw error;
    }
  }

  async deletePrefix(prefix) {
    try {
      const keys = await this._client.keys(`${prefix}*`);
      if (keys.length) {
        await this._client.del(keys);
        logger.info(`[CacheService] Cache keys deleted with prefix: ${prefix}, count=${keys.length}`);
      } else {
        logger.info(`[CacheService] No cache keys found with prefix: ${prefix}`);
      }
    } catch (error) {
      logger.error(`[CacheService] Failed to delete cache keys with prefix ${prefix}: ${error.message}`);
      throw error;
    }
  }
}
