import { createClient, RedisClientType } from 'redis';
import config from '../config';
import logger from '../utils/logger';

let client: RedisClientType;
let isHealthy = true;

export async function initializeRedis(): Promise<void> {
  try {
    client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        connectTimeout: config.redis.connectTimeoutMs,
        keepAlive: 1000, // keepAlive expects a number (milliseconds)
        reconnectStrategy: (retries) => {
          if (retries > config.redis.reconnectMaxRetries) {
            logger.error('Redis reconnection failed after max retries');
            isHealthy = false;
            return new Error('Redis reconnection failed');
          }
          const delay = Math.min(retries * 100, 3000);
          logger.info(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        },
      },
      password: config.redis.password || undefined,
      database: config.redis.db,
    });

    client.on('error', (error: Error) => {
      logger.error('Redis Client Error:', error);
      isHealthy = false;
    });

    client.on('connect', () => {
      logger.info('Redis client connected');
      isHealthy = true;
    });

    client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    await client.connect();
    logger.info('Redis initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    isHealthy = false;
    throw error;
  }
}

export function getRedisClient(): RedisClientType {
  if (!client) {
    throw new Error('Redis not initialized');
  }
  return client;
}

export function isRedisHealthy(): boolean {
  return isHealthy && client?.isOpen === true;
}

export async function setCache(key: string, value: any, ttl?: number): Promise<void> {
  try {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await client.setEx(key, ttl, stringValue);
    } else {
      await client.set(key, stringValue);
    }
  } catch (error) {
    logger.error('Failed to set cache:', error);
    throw error;
  }
}

export async function getCache<T>(key: string): Promise<{ data: T | null; fromCache: boolean; error?: string }> {
  try {
    if (!isRedisHealthy()) {
      logger.warn('Redis unhealthy, returning cache miss');
      return { data: null, fromCache: false, error: 'Redis unhealthy' };
    }
    const value = await client.get(key);
    if (!value) return { data: null, fromCache: true };
    return { data: JSON.parse(value) as T, fromCache: true };
  } catch (error) {
    logger.error('Failed to get cache:', error);
    isHealthy = false;
    return { data: null, fromCache: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Simplified cache getter that returns just the data value
 * For backward compatibility with existing code
 */
export async function getCacheValue<T>(key: string): Promise<T | null> {
  const result = await getCache<T>(key);
  return result.data;
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await client.del(key);
  } catch (error) {
    logger.error('Failed to delete cache:', error);
    throw error;
  }
}

export async function deleteCachePattern(pattern: string): Promise<number> {
  try {
    let deletedCount = 0;
    let cursor = 0;
    
    do {
      const result = await client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      
      cursor = result.cursor;
      const keys = result.keys;
      
      if (keys.length > 0) {
        await client.del(keys);
        deletedCount += keys.length;
      }
    } while (cursor !== 0);
    
    logger.info(`Deleted ${deletedCount} keys matching pattern ${pattern}`);
    return deletedCount;
  } catch (error) {
    logger.error('Failed to delete cache pattern:', error);
    throw error;
  }
}

export async function incrementCache(key: string): Promise<number> {
  try {
    return await client.incr(key);
  } catch (error) {
    logger.error('Failed to increment cache:', error);
    throw error;
  }
}

export async function decrementCache(key: string): Promise<number> {
  try {
    return await client.decr(key);
  } catch (error) {
    logger.error('Failed to decrement cache:', error);
    throw error;
  }
}
